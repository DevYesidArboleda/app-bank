// Lectura de la hoja de payroll a través de un Google Apps Script publicado
// como web app (ver scripts/sheets-payroll.gs). No necesita Google Cloud ni
// cuenta de servicio: el script corre dentro de la hoja y devuelve JSON.
// Como la URL del web app es pública, se protege con un token compartido.
//
// La hoja tiene una pestaña por período de pago (viernes a jueves), con el
// nombre "PAY_SEP 26 - OCT 02". El total no está siempre en la misma fila,
// así que se busca por su etiqueta.

// Fila "Totales" (fila 34 o 36 según cuántos contratistas haya). Su último
// número es la columna "Total paid": lo pagado después de deducciones, que
// coincide con "TOTAL PAYROLL" más abajo en la pestaña.
const TOTAL_LABEL = /^\s*totales\s*$/i;

async function callScript(params) {
  const scriptUrl = process.env.SHEETS_PAYROLL_URL;
  const token = process.env.SHEETS_PAYROLL_TOKEN;
  if (!scriptUrl || !token) {
    throw new Error("Missing SHEETS_PAYROLL_URL or SHEETS_PAYROLL_TOKEN environment variable");
  }

  const url = new URL(scriptUrl);
  url.searchParams.set("token", token);
  for (const [key, value] of Object.entries(params)) {
    if (value != null) url.searchParams.set(key, value);
  }

  // Apps Script responde con un redirect a googleusercontent.com; fetch lo sigue solo
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Apps Script error: HTTP ${response.status}`);
  }

  // Si el web app no está publicado para "Cualquier usuario", Google devuelve
  // una página HTML de login en vez de JSON
  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("Apps Script did not return JSON (check the deployment access is set to 'Anyone')");
  }
  if (data.error) throw new Error(`Apps Script error: ${data.error}`);
  return data;
}

// Una pestaña como { title, gid, tabs, values } con la grilla cruda.
// Sin gid usa la pestaña configurada en el script (SHEET_GID).
export async function getPayrollSheet({ gid } = {}) {
  const data = await callScript({ gid });
  return {
    scriptVersion: data.version ?? 1,
    title: data.title,
    gid: data.gid,
    tabs: data.tabs || [],
    values: data.values || [],
  };
}

// Todas las pestañas con su grilla: [{ title, gid, values }]
export async function getAllPayrollTabs() {
  const data = await callScript({ all: "1" });
  // La versión 1 del script ignora ?all=1 y devuelve una sola pestaña sin
  // `tabs`; sin este aviso el payroll quedaría vacío sin ningún error
  if (!Array.isArray(data.tabs)) {
    throw new Error(
      `Apps Script is running an old version (v${data.version ?? 1}); publish a new version of scripts/sheets-payroll.gs`
    );
  }
  return data.tabs;
}

const MONTHS = {
  JAN: 1, ENE: 1, FEB: 2, MAR: 3, APR: 4, ABR: 4, MAY: 5, JUN: 6,
  JUL: 7, AUG: 8, AGO: 8, SEP: 9, SET: 9, OCT: 10, NOV: 11, DEC: 12, DIC: 12,
};

function isoDate(year, month, day) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

// "PAY_SEP 26 - OCT 02" -> { start: "2026-09-26", end: "2026-10-02" }.
// El nombre no trae año: se toma el año en que la fecha final no queda más
// de 60 días en el futuro, y si el período cruza diciembre-enero el inicio
// queda en el año anterior. Devuelve null si el nombre no tiene ese formato.
export function parsePeriodTitle(title, today = new Date()) {
  const match = String(title).match(/([A-Za-z]{3})[a-z]*\.?\s*(\d{1,2})\s*-\s*(?:([A-Za-z]{3})[a-z]*\.?\s*)?(\d{1,2})/);
  if (!match) return null;

  const startMonth = MONTHS[match[1].toUpperCase()];
  const endMonth = match[3] ? MONTHS[match[3].toUpperCase()] : startMonth;
  if (!startMonth || !endMonth) return null;
  const startDay = Number(match[2]);
  const endDay = Number(match[4]);

  let endYear = today.getFullYear();
  const limit = new Date(today.getTime() + 60 * 86_400_000);
  if (new Date(endYear, endMonth - 1, endDay) > limit) endYear -= 1;
  const startYear = startMonth > endMonth ? endYear - 1 : endYear;

  return { start: isoDate(startYear, startMonth, startDay), end: isoDate(endYear, endMonth, endDay) };
}

// Busca la fila cuya primera celda con texto coincide con TOTAL_LABEL y
// devuelve el último número de esa fila (la columna del monto).
export function findPayrollTotal(values) {
  for (let i = 0; i < values.length; i++) {
    const row = values[i];
    const label = row.find((cell) => typeof cell === "string" && cell.trim() !== "");
    if (!label || !TOTAL_LABEL.test(label)) continue;
    const numbers = row.filter((cell) => typeof cell === "number");
    if (numbers.length === 0) continue;
    return { total: Math.round(numbers[numbers.length - 1] * 100) / 100, row: i + 1, label: label.trim() };
  }
  return null;
}

// Texto de la celda a la derecha de "PERIOD" (fila 4 en la plantilla)
function findPeriodCell(values) {
  for (const row of values) {
    const i = row.findIndex((cell) => typeof cell === "string" && /^\s*period\s*$/i.test(cell));
    if (i === -1) continue;
    const value = row.slice(i + 1).find((cell) => cell !== "" && cell != null);
    return value != null ? String(value) : null;
  }
  return null;
}

// Apps Script tarda unos segundos en leer todas las pestañas; el resultado se
// reutiliza unos minutos para no llamarlo en cada carga del panel.
const CACHE_MS = 5 * 60 * 1000;
let cachedPeriods = null; // { data, expiresAt }

// Cada pestaña de payroll como { title, start, end, total, totalRow }.
// Las pestañas sin período reconocible o sin fila de total se devuelven
// en `skipped` con el motivo, para no perderlas en silencio.
export async function getPayrollPeriods({ fresh = false } = {}) {
  if (!fresh && cachedPeriods && cachedPeriods.expiresAt > Date.now()) {
    return cachedPeriods.data;
  }
  const data = await readPayrollPeriods();
  cachedPeriods = { data, expiresAt: Date.now() + CACHE_MS };
  return data;
}

async function readPayrollPeriods() {
  const tabs = await getAllPayrollTabs();
  const periods = [];
  const skipped = [];

  for (const tab of tabs) {
    const period = parsePeriodTitle(tab.title);
    if (!period) {
      skipped.push({ title: tab.title, reason: "Tab name has no recognizable date range" });
      continue;
    }
    const found = findPayrollTotal(tab.values || []);
    if (!found) {
      skipped.push({ title: tab.title, reason: "No total row found" });
      continue;
    }
    const entry = { title: tab.title, ...period, total: found.total, totalRow: found.row, totalLabel: found.label };

    // El período que vale es el del nombre de la pestaña. La celda PERIOD a
    // veces queda sin actualizar al copiar la pestaña; se avisa para revisarla.
    const periodCell = findPeriodCell(tab.values || []);
    const cellPeriod = periodCell && parsePeriodTitle(periodCell);
    if (cellPeriod && (cellPeriod.start !== period.start || cellPeriod.end !== period.end)) {
      entry.warning = `PERIOD cell says "${periodCell}", tab name says "${tab.title}"; using the tab name`;
    }
    periods.push(entry);
  }

  periods.sort((a, b) => a.start.localeCompare(b.start));
  return { periods, skipped };
}
