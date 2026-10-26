const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const usdWhole = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});
const usdCompact = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 1,
});
const monthDay = new Intl.DateTimeFormat("en-US", { day: "numeric", month: "short" });
const monthShort = new Intl.DateTimeFormat("en-US", { month: "short" });
const time = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" });

export const fmt = (n) => usd.format(n || 0);
export const fmtWhole = (n) => usdWhole.format(n || 0);
export const fmtCompact = (n) => usdCompact.format(n || 0);

// Montos con signo explícito: positivo/negativo nunca depende solo del color.
export const fmtSigned = (n) => {
  const v = n || 0;
  if (v === 0) return fmt(0);
  return `${v > 0 ? "+" : "−"}${usd.format(Math.abs(v))}`;
};

export const fmtSignedCompact = (n) => {
  const v = n || 0;
  if (v === 0) return "$0";
  return `${v > 0 ? "+" : "−"}${usdCompact.format(Math.abs(v))}`;
};

export const fmtTime = (d) => time.format(d);

// ISO de una transacción → "Sep 23"
export const fmtDay = (iso) => monthDay.format(new Date(iso)).replace(".", "");

// "2026-09-22" → Date local (sin desfase de zona horaria)
export function parseDay(s) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function todayKey() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function weekEndOf(week) {
  if (week.weekEnd) return week.weekEnd;
  const d = parseDay(week.weekStart);
  d.setDate(d.getDate() + 6);
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

const clean = (s) => s.replace(".", "");

export const shortDay = (s) => clean(monthDay.format(parseDay(s)));

// "Sep 22–28" o "Sep 29 – Oct 5"
export function weekRange(week) {
  const a = parseDay(week.weekStart);
  const b = parseDay(weekEndOf(week));
  if (a.getMonth() === b.getMonth()) {
    return `${clean(monthShort.format(a))} ${a.getDate()}–${b.getDate()}`;
  }
  return `${clean(monthDay.format(a))} – ${clean(monthDay.format(b))}`;
}

// Agrupaciones del panel. Las semanas son fijas de sábado a viernes (lib/weeks.js):
// la quincena son 2 semanas y el mes son 4 semanas (28 días), para que cuadren
// con el payroll semanal.
// Los rangos se quedan en ≤ 12 semanas porque SimpleFIN entrega ~90 días de historial.
export const GROUPINGS = {
  semana: { label: "Week", plural: "weeks", size: 1, ranges: [4, 8, 12], defaultRange: 8 },
  quincena: { label: "Fortnight", plural: "fortnights", size: 2, ranges: [2, 4, 6], defaultRange: 4 },
  mes: { label: "Month", plural: "months", size: 4, ranges: [1, 2, 3], defaultRange: 3 },
};

const SUM_KEYS = ["ventasBruto", "impuestos", "ventasNeto", "payroll", "gastos", "transferencias", "total"];
const round2 = (n) => Math.round(n * 100) / 100;
const byDateDesc = (a, b) => b.date.localeCompare(a.date);

// Junta semanas consecutivas (en orden cronológico) en bloques de `size`,
// contando desde la semana más reciente hacia atrás.
export function groupWeeks(weeks, size) {
  if (size <= 1) return weeks;
  const groups = [];
  for (let end = weeks.length; end > 0; end -= size) {
    const chunk = weeks.slice(Math.max(0, end - size), end);
    const period = {
      weekStart: chunk[0].weekStart,
      weekEnd: weekEndOf(chunk[chunk.length - 1]),
      weekCount: chunk.length,
      gastosCategorias: {},
      gastosMovimientos: chunk.flatMap((w) => w.gastosMovimientos || []).sort(byDateDesc),
      gastosExcluidos: chunk.flatMap((w) => w.gastosExcluidos || []).sort(byDateDesc),
    };
    for (const key of SUM_KEYS) {
      period[key] = round2(chunk.reduce((s, w) => s + (w[key] || 0), 0));
    }
    for (const w of chunk) {
      for (const [cat, amount] of Object.entries(w.gastosCategorias || {})) {
        period.gastosCategorias[cat] = round2((period.gastosCategorias[cat] || 0) + amount);
      }
    }
    groups.unshift(period);
  }
  return groups;
}

// "over the last 8 weeks", "over the last month"
export function lastPeriodsText(group, n) {
  return n === 1 ? `over the last ${group.label.toLowerCase()}` : `over the last ${n} ${group.plural}`;
}
