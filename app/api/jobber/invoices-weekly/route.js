import { NextResponse } from "next/server";
import { getWeeklySales } from "@/lib/sales";

// Ventas semanales desde las visitas de Jobber (lib/sales.js). Traer ~1,400
// visitas paginadas (con reintentos si Jobber limita) puede tardar
export const maxDuration = 120;

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const weeksBack = parseInt(searchParams.get("weeks") || "8", 10);

  try {
    return NextResponse.json({ weeklyVentas: await getWeeklySales(weeksBack) });
  } catch (error) {
    console.error("Error trayendo ventas de Jobber:", error);
    return NextResponse.json({ error: error.message }, { status: 502 });
  }
}
