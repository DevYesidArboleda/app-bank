import { NextResponse } from "next/server";
import { paychexGet } from "@/lib/paychex";

// GET /api/paychex/auth
// Verifica que las credenciales configuradas puedan autenticar correctamente
// (útil para confirmar que Paychex ya aprobó tu app y las llaves funcionan)
export async function GET() {
  try {
    const companies = await paychexGet("/companies");
    return NextResponse.json({ connected: true, companies: companies?.content ?? companies });
  } catch (error) {
    console.error("Error verificando conexión con Paychex:", error);
    return NextResponse.json(
      { connected: false, error: error.message },
      { status: 502 }
    );
  }
}
