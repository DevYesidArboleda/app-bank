import { NextResponse } from "next/server";
import { plaidRequest } from "@/lib/plaid";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/crypto";

// GET /api/plaid/transactions?days=30
// Devuelve las transacciones recientes de todas las cuentas conectadas
export async function GET(request) {
  const userId = "demo-user"; // TODO: usuario real autenticado
  const { searchParams } = new URL(request.url);
  const days = parseInt(searchParams.get("days") || "30", 10);

  const integrations = await prisma.integration.findMany({
    where: { userId, provider: "plaid" },
  });

  if (integrations.length === 0) {
    return NextResponse.json({ error: "No bank accounts connected" }, { status: 404 });
  }

  const endDate = new Date().toISOString().split("T")[0];
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  try {
    const results = await Promise.all(
      integrations.map(async (integration) => {
        const accessToken = decrypt(integration.accessToken);
        const data = await plaidRequest("/transactions/get", {
          access_token: accessToken,
          start_date: startDate,
          end_date: endDate,
        });
        return data.transactions;
      })
    );

    return NextResponse.json({ transactions: results.flat() });
  } catch (error) {
    console.error("Error trayendo transacciones de Plaid:", error);
    return NextResponse.json({ error: "Couldn't fetch transactions" }, { status: 500 });
  }
}
