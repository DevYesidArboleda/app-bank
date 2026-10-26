// Endpoint TEMPORAL de vista previa: período y total que la app lee de cada
// pestaña de payroll, y a qué semana del panel va cada uno. Siempre lee la
// hoja en vivo (sin caché) para poder verificar cambios al momento.
import { NextResponse } from "next/server";
import { getPayrollPeriods } from "@/lib/googleSheets";
import { weekStartOf } from "@/lib/weeks";

export async function GET() {
  try {
    const { periods, skipped } = await getPayrollPeriods({ fresh: true });
    return NextResponse.json({
      periods: periods.map((p) => ({ ...p, panelWeekStart: weekStartOf(p.end) })),
      skipped,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
