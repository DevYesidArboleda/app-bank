import { NextResponse } from "next/server";
import { plaidRequest } from "@/lib/plaid";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/crypto";

// GET /api/plaid/accounts
// Devuelve las cuentas bancarias conectadas (balances, tipo de cuenta, etc.)
export async function GET() {
  const userId = "demo-user"; // TODO: usuario real autenticado

  const integrations = await prisma.integration.findMany({
    where: { userId, provider: "plaid" },
  });

  if (integrations.length === 0) {
    return NextResponse.json({ error: "No bank accounts connected" }, { status: 404 });
  }

  try {
    const results = await Promise.all(
      integrations.map(async (integration) => {
        const accessToken = decrypt(integration.accessToken);
        const data = await plaidRequest("/accounts/get", { access_token: accessToken });
        return {
          institution: integration.metadata?.institution?.name ?? "Desconocido",
          accounts: data.accounts,
        };
      })
    );

    return NextResponse.json({ connections: results });
  } catch (error) {
    console.error("Error trayendo cuentas de Plaid:", error);
    return NextResponse.json({ error: "Couldn't fetch accounts" }, { status: 500 });
  }
}
