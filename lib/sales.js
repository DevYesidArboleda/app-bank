import JobberClient from "@/lib/jobber";
import { groupSalesByWeek } from "@/lib/visitSales";
import { lastWeeks } from "@/lib/weeks";

// Ventas de Jobber por semana: { weekStart, weekEnd, bruto, impuestos, neto, visitas }
export async function getWeeklySales(weeksBack) {
  const weeks = lastWeeks(weeksBack);
  const visits = await new JobberClient().getVisits({
    from: weeks[0].weekStart,
    to: weeks[weeks.length - 1].weekEnd,
  });
  return groupSalesByWeek(visits, weeks);
}
