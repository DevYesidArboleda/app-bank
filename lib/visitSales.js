import { dateKey } from "./weeks.js";

// Las ventas netas cuadran al centavo con el reporte de Visits de Jobber para
// las mismas fechas: el valor de las líneas de cada visita (antes de impuestos),
// en el día en que empieza la visita.
//
// Igual que el reporte, quedan fuera las visitas de trabajos de precio fijo con
// factura periódica (contratos mensuales de oficinas): cada visita trae las
// líneas del contrato entero y contarlas repetiría el precio del mes en cada una.

// Jobber no dice el impuesto de una visita (llega con la factura): se estima
// sobre las líneas gravables para mostrar ventas brutas e impuestos.
const TAX_RATE = 0.06625;

const round = (n) => Math.round(n * 100) / 100;

// Visita → { day, net, tax }, o null si no cuenta como venta.
export function visitSale(visit) {
  if (!visit.startAt) return null;
  const job = visit.job || {};
  if (job.billingType === "FIXED_PRICE" && job.invoiceSchedule?.billingFrequency === "PERIODIC") return null;

  let net = 0;
  let taxable = 0;
  for (const line of visit.lineItems?.nodes || []) {
    const price = Number(line.totalPrice) || 0;
    net += price;
    if (line.taxable) taxable += price;
  }
  return { day: dateKey(visit.startAt), net, tax: taxable * TAX_RATE };
}

// Semanas fijas de sábado a viernes (lib/weeks.js), las mismas del payroll.
export function groupSalesByWeek(visits, weeks, today = dateKey(new Date())) {
  const sales = visits.map(visitSale).filter(Boolean);
  return weeks.map(({ weekStart, weekEnd }) => {
    let net = 0;
    let tax = 0;
    let count = 0;
    for (const sale of sales) {
      // La semana en curso solo cuenta hasta hoy: las visitas agendadas
      // todavía no son ventas.
      if (sale.day < weekStart || sale.day > weekEnd || sale.day > today) continue;
      net += sale.net;
      tax += sale.tax;
      count += 1;
    }
    return {
      weekStart,
      weekEnd,
      bruto: round(net + tax),
      impuestos: round(tax),
      neto: round(net),
      visitas: count,
    };
  });
}

