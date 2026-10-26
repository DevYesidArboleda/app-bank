import { NextResponse } from "next/server";
import { getWeeklyExpenses } from "@/lib/expenses";

export const maxDuration = 60;

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const weeksBack = parseInt(searchParams.get("weeks") || "8", 10);

  try {
    return NextResponse.json({ weeklyGastos: await getWeeklyExpenses(weeksBack) });
  } catch (error) {
    console.error("Error obteniendo gastos de SimpleFIN:", error);
    return NextResponse.json({ error: "Couldn't fetch expenses" }, { status: 502 });
  }
}
