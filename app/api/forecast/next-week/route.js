import { NextResponse } from "next/server";
import { getWeeklySummary } from "@/lib/summary";

export const maxDuration = 120;

// GET /api/forecast/next-week
// Estima cuánto dinero se necesita la próxima semana para Payroll + Gastos
// recurrentes, basado en el promedio de las últimas semanas.
// NOTA: esto es un cálculo propio (promedio histórico), ninguna de las 3
// plataformas (Jobber, Chase, Paychex) provee una proyección así.
export async function GET() {
  const LOOKBACK_WEEKS = 4; // promedio de las últimas 4 semanas completas

  try {
    const data = await getWeeklySummary(LOOKBACK_WEEKS + 1);
    const weeks = data.summary || [];

    // Excluimos la semana actual (en curso, probablemente incompleta) del promedio
    const now = new Date();
    const completedWeeks = weeks.filter((w) => new Date(w.weekEnd || w.weekStart) < now);
    const sample = completedWeeks.slice(-LOOKBACK_WEEKS);

    if (sample.length === 0) {
      return NextResponse.json({
        error: "Not enough history to forecast",
      });
    }

    const avg = (arr, key) => arr.reduce((sum, w) => sum + (w[key] || 0), 0) / arr.length;

    const avgPayroll = avg(sample, "payroll");
    const avgGastos = avg(sample, "gastos");
    const estimatedNeeded = Math.round((avgPayroll + avgGastos) * 100) / 100;

    return NextResponse.json({
      basedOnWeeks: sample.length,
      avgPayroll: Math.round(avgPayroll * 100) / 100,
      avgGastos: Math.round(avgGastos * 100) / 100,
      estimatedNeeded,
      note: "Estimate based on the average of recent weeks. Not from Jobber, Chase or Paychex.",
    });
  } catch (error) {
    console.error("Error calculando pronóstico:", error);
    return NextResponse.json({ error: "Couldn't calculate the forecast" }, { status: 502 });
  }
}