import { getWeeklyExpenses } from "@/lib/expenses";
import { getWeeklyPayroll } from "@/lib/payroll";
import { withResult } from "@/lib/result";
import { getWeeklySales } from "@/lib/sales";

// Resumen semanal: ventas (Jobber), gastos (SimpleFIN) y payroll (hoja) por
// semana. Se llaman las funciones directamente, no por HTTP: así no dependen
// de la URL pública ni de la cookie de sesión.
export async function getWeeklySummary(weeks) {
  // Cada fuente reporta su propio estado (ok) para que el panel muestre cuál
  // respondió y cuál no, en vez de ceros silenciosos.
  const fromSource = (load, empty, label) =>
    load()
      .then((data) => ({ ...data, ok: true }))
      .catch((error) => {
        console.error(`Error en la fuente ${label}:`, error);
        return { ...empty, ok: false };
      });

  const [ventasRes, gastosRes, payrollRes] = await Promise.all([
    fromSource(async () => ({ weeklyVentas: await getWeeklySales(weeks) }), { weeklyVentas: [] }, "Jobber"),
    fromSource(async () => ({ weeklyGastos: await getWeeklyExpenses(weeks) }), { weeklyGastos: [] }, "SimpleFIN"),
    fromSource(getWeeklyPayroll, { weeklyPayroll: [] }, "payroll"),
  ]);

  const ventas = ventasRes.weeklyVentas || [];
  const gastos = gastosRes.weeklyGastos || [];
  const payroll = payrollRes.weeklyPayroll || [];

  const map = new Map();

  // Ventas ahora trae {bruto, impuestos, neto} en vez de {total}
  ventas.forEach((w) => {
    map.set(w.weekStart, {
      weekStart: w.weekStart,
      weekEnd: w.weekEnd,
      ventasBruto: w.bruto || 0,
      impuestos: w.impuestos || 0,
      ventasNeto: w.neto || 0,
      payroll: 0,
      gastos: 0,
    });
  });

  gastos.forEach((w) => {
    const existing = map.get(w.weekStart) || {
      weekStart: w.weekStart,
      weekEnd: w.weekEnd,
      ventasBruto: 0,
      impuestos: 0,
      ventasNeto: 0,
      payroll: 0,
    };
    existing.gastos = w.total || 0;
    existing.gastosCategorias = w.categorias || {};
    existing.transferencias = w.transferencias || 0;
    existing.gastosMovimientos = w.movimientos || [];
    existing.gastosExcluidos = w.excluidos || [];
    map.set(w.weekStart, existing);
  });

  payroll.forEach((w) => {
    const existing = map.get(w.weekStart) || {
      weekStart: w.weekStart,
      ventasBruto: 0,
      impuestos: 0,
      ventasNeto: 0,
      gastos: 0,
    };
    existing.payroll = w.total || 0;
    // "sheet" (pestaña de la hoja de Google) o "manual" (ingresado en el panel)
    existing.payrollSource = w.source || "manual";
    map.set(w.weekStart, existing);
  });

  const summary = Array.from(map.values())
    .sort((a, b) => a.weekStart.localeCompare(b.weekStart))
    // Total usa Ventas NETO (después de impuestos) menos el cargo del 10%
    .map(withResult);

  return {
    summary,
    sources: {
      jobber: ventasRes.ok ? "ok" : "error",
      simplefin: gastosRes.ok ? "ok" : "error",
      // La hoja de Google es la fuente del payroll; si falla, la ruta igual
      // responde con lo manual, así que se mira su propio estado
      payroll: payrollRes.ok && payrollRes.sheet !== "error" ? "ok" : "error",
    },
  };
}
