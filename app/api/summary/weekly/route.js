import { NextResponse } from "next/server";
import { getWeeklySummary } from "@/lib/summary";

// Junta Jobber + SimpleFIN + payroll; Jobber es la más lenta
export const maxDuration = 120;

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const weeks = parseInt(searchParams.get("weeks") || "8", 10);

  try {
    return NextResponse.json(await getWeeklySummary(weeks));
  } catch (error) {
    console.error("Error armando el resumen semanal:", error);
    return NextResponse.json({ error: "Couldn't build the summary" }, { status: 502 });
  }
}
