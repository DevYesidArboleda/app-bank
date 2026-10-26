import JobberClient from "@/lib/jobber";
import { addDays, dateKey, lastWeeks } from "@/lib/weeks";

// Solo se usa si una factura no trae su impuesto desde Jobber.
const TAX_RATE = 0.06625;

// Factura mensual: los clientes comerciales reciben a fin de mes una sola
// factura con todas las visitas del mes (una línea por visita). Si se contara
// el día que se emite, la semana de fin de mes saldría con ~$20k de más y el
// resto del mes con menos. Se reconoce por emitirse en los últimos días del
// mes (o los primeros del siguiente, si se atrasó) con varias visitas.
const MONTHLY_MIN_VISITS = 3;
const MONTH_END_FROM_DAY = 25;
const LATE_UNTIL_DAY = 3;

const round = (n) => Math.round(n * 100) / 100;

// Ventas de Jobber por semana: { weekStart, weekEnd, bruto, impuestos, neto, ... }
export async function getWeeklySales(weeksBack) {
  const weeks = lastWeeks(weeksBack);
  const client = new JobberClient();
  // Margen a cada lado para alcanzar facturas mensuales emitidas un poco
  // antes de la primera semana o atrasadas después de la última.
  const invoices = await client.getInvoices({
    from: addDays(weeks[0].weekStart, -7),
    to: addDays(weeks[weeks.length - 1].weekEnd, LATE_UNTIL_DAY),
  });

  const items = invoices
    .filter((inv) => inv.issuedDate)
    .map((inv) => {
      const total = Number(inv.total) || 0;
      // Impuesto real de cada factura: hay clientes exentos (iglesias,
      // biblioteca, algunas cuentas comerciales) y un 6.625% parejo inflaba
      // el impuesto.
      const tax = inv.amounts?.taxAmount;
      // issuedDate viene con hora en UTC: se pasa al día en la zona del
      // negocio (una factura del viernes en la noche no debe caer en el sábado)
      const day = dateKey(inv.issuedDate);
      return {
        day,
        total,
        tax: tax == null ? total * TAX_RATE : Number(tax),
        month: monthCovered(day, inv.lineItems?.nodes || []),
      };
    });

  return groupByWeek(items, weeks).map((w) => ({
    weekStart: w.weekStart,
    weekEnd: w.weekEnd,
    bruto: round(w.total),
    impuestos: round(w.tax),
    neto: round(w.total - w.tax),
    facturas: w.count,
    // Parte del bruto que viene de facturas mensuales repartidas
    mensuales: round(w.monthly),
  }));
}

// Si la factura es mensual, el mes que cubre como { start, end } ("YYYY-MM-DD");
// si no, null.
function monthCovered(day, lineItems) {
  const visits = lineItems.filter((li) => !/suppl/i.test(li.name || "")).length;
  if (visits < MONTHLY_MIN_VISITS) return null;

  const [y, m, d] = day.split("-").map(Number);
  let year = y;
  let month = m;
  if (d <= LATE_UNTIL_DAY) {
    month -= 1;
    if (month === 0) {
      month = 12;
      year -= 1;
    }
  } else if (d < MONTH_END_FROM_DAY) {
    return null;
  }
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const end = addDays(new Date(Date.UTC(year, month, 1)).toISOString().slice(0, 10), -1);
  return { start, end };
}

// Días en común entre dos rangos "YYYY-MM-DD" (ambos incluidos)
function overlapDays(aStart, aEnd, bStart, bEnd) {
  const start = aStart > bStart ? aStart : bStart;
  const end = aEnd < bEnd ? aEnd : bEnd;
  if (start > end) return 0;
  return (Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / 86400000 + 1;
}

// Semanas fijas de sábado a viernes (lib/weeks.js), las mismas del payroll.
// Una factura normal cuenta entera en la semana en que se emitió; una mensual
// se reparte entre las semanas según cuántos días del mes caen en cada una.
function groupByWeek(items, weeks) {
  return weeks.map(({ weekStart, weekEnd }) => {
    const week = { weekStart, weekEnd, count: 0, total: 0, tax: 0, monthly: 0 };
    for (const item of items) {
      let share = 0;
      if (item.month) {
        const monthDays = overlapDays(item.month.start, item.month.end, item.month.start, item.month.end);
        share = overlapDays(weekStart, weekEnd, item.month.start, item.month.end) / monthDays;
        week.monthly += item.total * share;
      } else if (item.day >= weekStart && item.day <= weekEnd) {
        share = 1;
      }
      if (!share) continue;
      if (item.day >= weekStart && item.day <= weekEnd) week.count += 1;
      week.total += item.total * share;
      week.tax += item.tax * share;
    }
    return week;
  });
}
