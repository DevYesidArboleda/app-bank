import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET  /api/sales/weekly?weeks=8  → trae valores manuales guardados
// POST /api/sales/weekly           → guarda/actualiza el valor de una semana
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const weeksBack = parseInt(searchParams.get("weeks") || "8", 10);
  const userId = "demo-user";

  const entries = await prisma.weeklySalesEntry.findMany({
    where: { userId },
    orderBy: { weekStart: "desc" },
    take: weeksBack,
  });

  return NextResponse.json({
    weeklyManualSales: entries.map((e) => ({ weekStart: e.weekStart, amount: e.amount })),
  });
}

export async function POST(request) {
  const userId = "demo-user";
  const { weekStart, amount } = await request.json();

  if (!weekStart || amount == null) {
    return NextResponse.json({ error: "Missing weekStart or amount" }, { status: 400 });
  }

  const entry = await prisma.weeklySalesEntry.upsert({
    where: { userId_weekStart: { userId, weekStart } },
    update: { amount },
    create: { userId, weekStart, amount },
  });

  return NextResponse.json({ entry });
}