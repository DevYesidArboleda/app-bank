import { NextResponse } from "next/server";
import { getClassifiedTransactions } from "@/lib/expenses";

// GET /api/simplefin/transactions?days=30
// Trae transacciones de todas las cuentas conectadas en el rango de días indicado,
// con su categoría y si cuentan como gasto (útil para revisar la clasificación).
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const days = parseInt(searchParams.get("days") || "30", 10);

  const endDate = Math.floor(Date.now() / 1000);
  const startDate = endDate - days * 24 * 60 * 60;

  try {
    const { transactions: classified } = await getClassifiedTransactions({ startDate, endDate });

    const transactions = classified.map((tx) => ({
      account: tx.account,
      id: tx.id,
      description: tx.description,
      amount: tx.amount,
      posted: tx.date.toISOString(),
      category: tx.category,
      isTransfer: tx.isTransfer,
      countsAsExpense: tx.countsAsExpense,
    }));

    return NextResponse.json({ transactions });
  } catch (error) {
    console.error("Error obteniendo transacciones de SimpleFIN:", error);
    return NextResponse.json(
      { error: "Couldn't fetch transactions" },
      { status: 502 }
    );
  }
}
