// Resultado de una semana: ventas netas de Jobber menos el cargo del 10% sobre
// esas ventas, el payroll y los gastos. Lo usan el servidor y el panel.
export const FEE_RATE = 0.1;

const round = (n) => Math.round(n * 100) / 100;

export function feeFor(ventasNeto) {
  return round((ventasNeto || 0) * FEE_RATE);
}

export function weekTotal(w) {
  return round((w.ventasNeto || 0) - feeFor(w.ventasNeto) - (w.payroll || 0) - (w.gastos || 0));
}

// Completa `comision` y `total` de una semana.
export function withResult(w) {
  return { ...w, comision: feeFor(w.ventasNeto), total: weekTotal(w) };
}
