import { NextResponse } from "next/server";
import { paychexGet } from "@/lib/paychex";

// GET /api/paychex/workers?companyId=XXXX
// Trae la lista de empleados de una compañía específica.
// NOTA: datos de contacto (email/teléfono) suelen venir en sub-endpoints
// separados (ej. /companies/{id}/workers/{workerId}/communications), no en
// esta respuesta base — hay que hacer una llamada adicional por trabajador
// si los necesitas.
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const companyId = searchParams.get("companyId");

  if (!companyId) {
    return NextResponse.json({ error: "Missing companyId parameter" }, { status: 400 });
  }

  try {
    const data = await paychexGet(`/companies/${companyId}/workers`);
    return NextResponse.json({ workers: data?.content ?? data });
  } catch (error) {
    console.error("Error obteniendo workers de Paychex:", error);
    return NextResponse.json({ error: "Couldn't fetch workers" }, { status: 502 });
  }
}
