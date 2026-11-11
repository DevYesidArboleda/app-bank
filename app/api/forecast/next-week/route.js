import { NextResponse } from "next/server";
import { getWeeklySummary } from "@/lib/summary";

export const maxDuration = 120;

// GET /api/forecast/next-week
// Estima cuánto dinero hay que tener la próxima semana para pagar el payroll:
// promedio del payroll de las últimas 4 semanas completas que SÍ tienen payroll
// (una semana sin payroll cargado es falta de datos, no un payroll de $0).
// Los gastos se calculan aparte, como referencia: no entran en el monto
// necesario porque varían mucho (retiros, préstamos) y distorsionan el número.
// NOTA: esto es un cálculo propio, ninguna de las plataformas provee esta proyección.
const LOOKBACK_WEEKS = 4;
// Semanas que se piden de más para encontrar 4 con payroll aunque falte alguna
const FETCH_WEEKS = 10;

const round = (n) => Math.round(n * 100) / 100;
const avg = (values) => values.reduce((s, v) => s + v, 0) / values.length;

export async function GET() {
  try {
    const data = await getWeeklySummary(FETCH_WEEKS);
    const weeks = data.summary || [];

    // Excluimos la semana actual (en curso, incompleta)
    const now = new Date();
    const completedWeeks = weeks.filter((w) => new Date(`${w.weekEnd || w.weekStart}T23:59:59`) < now);

    const payrollSample = completedWeeks.filter((w) => w.payroll > 0).slice(-LOOKBACK_WEEKS);
    if (payrollSample.length === 0) {
      return NextResponse.json({ error: "Not enough history to forecast" });
    }
    const avgPayroll = round(avg(payrollSample.map((w) => w.payroll)));

    const expenseSample = completedWeeks.slice(-LOOKBACK_WEEKS);
    const avgGastos = round(avg(expenseSample.map((w) => w.gastos || 0)));

    return NextResponse.json({
      basedOnWeeks: payrollSample.length,
      payrollWeeks: payrollSample.map((w) => ({ weekStart: w.weekStart, weekEnd: w.weekEnd, payroll: w.payroll })),
      avgPayroll,
      avgGastos,
      // Lo que hay que tener en cuentas: el payroll de la próxima semana
      estimatedNeeded: avgPayroll,
      // Salida total esperada (payroll + gastos), solo para la gráfica
      estimatedOutflows: round(avgPayroll + avgGastos),
      note: "Payroll estimate: average of the last weeks with payroll. Not from Jobber, Chase or Paychex.",
    });
  } catch (error) {
    console.error("Error calculando pronóstico:", error);
    return NextResponse.json({ error: "Couldn't calculate the forecast" }, { status: 502 });
  }
}
