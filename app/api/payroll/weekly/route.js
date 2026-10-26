// app/api/payroll/weekly/route.js
import { NextResponse } from "next/server";
import { kvGet, kvSet } from "@/lib/kv";
import { getWeeklyPayroll } from "@/lib/payroll";

export async function GET() {
  return NextResponse.json(await getWeeklyPayroll());
}

export async function POST(request) {
  const { weekStart, amount } = await request.json();
  if (!weekStart || amount == null) {
    return NextResponse.json({ error: "Missing weekStart or amount" }, { status: 400 });
  }

  const data = (await kvGet("payroll:manual")) || {};
  data[weekStart] = amount;
  await kvSet("payroll:manual", data);

  return NextResponse.json({ success: true });
}
