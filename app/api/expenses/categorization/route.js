import { NextResponse } from "next/server";
import { applyOverride, applyRule, removeOverride, removeRule } from "@/lib/categories";
import { getCategoryConfig, saveCategoryConfig } from "@/lib/categoryStore";

async function update(change) {
  const config = await getCategoryConfig();
  let next;
  try {
    next = change(config);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  await saveCategoryConfig(next);
  return NextResponse.json(next);
}

export async function GET() {
  return NextResponse.json(await getCategoryConfig());
}

// { category, pattern, txId? } guarda una regla;
// { category, txId, description? } cambia solo esa transacción.
export async function POST(request) {
  const body = (await request.json().catch(() => null)) || {};
  return update((config) => (body.pattern ? applyRule(config, body) : applyOverride(config, body)));
}

// { pattern } o { txId }
export async function DELETE(request) {
  const body = (await request.json().catch(() => null)) || {};
  return update((config) => {
    if (body.pattern) return removeRule(config, body.pattern);
    if (body.txId) return removeOverride(config, body.txId);
    throw new Error("Missing pattern or txId");
  });
}
