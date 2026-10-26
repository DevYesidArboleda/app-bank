// El payroll sale de la hoja de Google (una pestaña por semana, sábado a
// viernes). Lo ingresado a mano solo se usa en semanas que no tienen pestaña,
// por ejemplo historial anterior a la hoja.
import { kvGet } from "@/lib/kv";
import { getPayrollPeriods } from "@/lib/googleSheets";
import { addDays, weekStartOf } from "@/lib/weeks";

// Antes las semanas eran ventanas de 7 días que terminaban "hoy", así que los
// valores manuales viejos tienen inicios que no caen en sábado. Se asignan a
// la semana sábado-viernes que comparte más días con esa ventana (la que
// contiene su día del medio).
function toSaturdayWeek(key) {
  const start = weekStartOf(key);
  return start === key ? key : weekStartOf(addDays(key, 3));
}

// Payroll por semana: lo manual primero y encima lo de la hoja de Google.
// sheet: "ok" | "error" (si la hoja no respondió).
export async function getWeeklyPayroll() {
  const manual = (await kvGet("payroll:manual")) || {};
  const byWeek = new Map();
  for (const [key, amount] of Object.entries(manual)) {
    const weekStart = toSaturdayWeek(key);
    byWeek.set(weekStart, { weekStart, total: amount, source: "manual" });
  }

  // Si la hoja no responde se devuelve lo manual, pero marcado para que el
  // panel muestre la fuente como caída en vez de semanas en $0 sin aviso
  let sheet = "ok";
  try {
    const { periods } = await getPayrollPeriods();
    for (const p of periods) {
      // La semana del panel es la que contiene el viernes final del período
      const weekStart = weekStartOf(p.end);
      byWeek.set(weekStart, { weekStart, total: p.total, source: "sheet", tab: p.title });
    }
  } catch (error) {
    console.error("Error leyendo payroll de Google Sheets:", error);
    sheet = "error";
  }

  const weeklyPayroll = [...byWeek.values()].sort((a, b) => a.weekStart.localeCompare(b.weekStart));
  return { weeklyPayroll, sheet };
}
