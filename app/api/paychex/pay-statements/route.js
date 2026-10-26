import { NextResponse } from "next/server";
import { paychexGet } from "@/lib/paychex";

// GET /api/paychex/pay-statements?companyId=XXXX&workerId=YYYY
// Trae el historial de pagos (cheques/depósitos) del trabajador: fecha, monto
// neto, deducciones, impuestos retenidos, etc.
// NOTA: confirma esta ruta exacta en el API Explorer de developer.paychex.com
// — algunas cuentas exponen esto como "checks", otras como "pay-statements"
// según la versión de API habilitada para tu empresa.
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
      `/companies/${companyId}/workers/${workerId}/checks`
    );

    const statements = data?.content ?? data ?? [];

    // Normalizamos para que sea fácil de consumir en el frontend
    const formatted = Array.isArray(statements)
      ? statements.map((s) => ({
          payDate: s.payDate ?? s.checkDate ?? null,
          netPay: s.netPay ?? s.amount ?? null,
          grossPay: s.grossPay ?? null,
          currency: s.currencyCode ?? "USD",
        }))
      : statements;

    return NextResponse.json({ payStatements: formatted });
  } catch (error) {
    console.error("Error obteniendo historial de pagos de Paychex:", error);
    return NextResponse.json(
      { error: "Couldn't fetch pay history" },
      { status: 502 }
    );
  }
}