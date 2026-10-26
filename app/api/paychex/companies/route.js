import { NextResponse } from "next/server";
import { paychexGet } from "@/lib/paychex";

// GET /api/paychex/companies
// Necesario porque casi todos los demás endpoints de Paychex requieren un companyId
export async function GET() {
  try {
    const data = await paychexGet("/companies");
    return NextResponse.json({ companies: data?.content ?? data });
  } catch (error) {
    console.error("Error obteniendo companies de Paychex:", error);
    return NextResponse.json({ error: "Couldn't fetch companies" }, { status: 502 });
  }
}
