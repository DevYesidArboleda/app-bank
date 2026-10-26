import { NextResponse } from "next/server";
import { simplefinGetAccounts } from "@/lib/simplefin";

// GET /api/simplefin/accounts
// Trae todas las cuentas conectadas (Chase incluido) con sus balances actuales
export async function GET() {
  try {
    const data = await simplefinGetAccounts();

    const accounts = (data.accounts || []).map((acc) => ({
      id: acc.id,
      name: acc.name,
      institution: acc.org?.name,
      balance: acc.balance,
      currency: acc.currency,
      balanceDate: acc["balance-date"]
        ? new Date(acc["balance-date"] * 1000).toISOString()
        : null,
    }));

    const errors = data.errors || [];

    return NextResponse.json({ accounts, errors });
  } catch (error) {
    console.error("Error obteniendo cuentas de SimpleFIN:", error);
    return NextResponse.json(
      { error: "Couldn't fetch accounts" },
      { status: 502 }
    );
  }
}