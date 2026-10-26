import { NextResponse } from "next/server";
import { paychexGet } from "@/lib/paychex";

// GET /api/paychex/compensation?companyId=XXXX&workerId=YYYY
// Trae la información de compensación (salario base, tipo de pago, tasa) de un
// trabajador específico.
// NOTA: confirma esta ruta exacta en el API Explorer de developer.paychex.com,
// ya que puede variar ligeramente según tu versión de contrato/API.
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const companyId = searchParams.get("companyId");
  const workerId = searchParams.get("workerId");

  if (!companyId || !workerId) {
    return NextResponse.json(
      { error: "Missing companyId and workerId parameters" },
      { status: 400 }
    );
  }

  try {
    const data = await paychexGet(
      `/companies/${companyId}/workers/${workerId}/compensation`
    );
    return NextResponse.json({ compensation: data?.content ?? data });
  } catch (error) {
    console.error("Error obteniendo compensación de Paychex:", error);
    return NextResponse.json(
      { error: "Couldn't fetch compensation information" },
      { status: 502 }
    );
  }
}