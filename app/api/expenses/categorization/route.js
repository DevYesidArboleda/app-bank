import { NextResponse } from "next/server";
import {
  applyOverride,
  applyRule,
  createCategory,
  deleteCategory,
  includeAccount,
  removeIncludedAccount,
  removeOverride,
  removeRule,
  renameCategory,
  setKeywords,
} from "@/lib/categories";
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
// { category, txId, description? } cambia solo esa transacción;
// { account } hace que una cuenta excluida cuente como gasto.
export async function POST(request) {
  const body = (await request.json().catch(() => null)) || {};
  return update((config) => {
    if (body.account) return includeAccount(config, body);
    return body.pattern ? applyRule(config, body) : applyOverride(config, body);
  });
}

// { pattern }, { txId } o { account }
export async function DELETE(request) {
  const body = (await request.json().catch(() => null)) || {};
  return update((config) => {
    if (body.pattern) return removeRule(config, body.pattern);
    if (body.txId) return removeOverride(config, body.txId);
    if (body.account) return removeIncludedAccount(config, body.account);
    throw new Error("Missing pattern, txId or account");
  });
}

// Editar las categorías mismas (todas, también las que trae el app):
// { action: "create", name } | { action: "rename", from, to }
// | { action: "delete", name, moveTo? } | { action: "keywords", name, keywords: [] }
const CATEGORY_ACTIONS = {
  create: createCategory,
  rename: renameCategory,
  delete: deleteCategory,
  keywords: setKeywords,
};

export async function PATCH(request) {
  const body = (await request.json().catch(() => null)) || {};
  return update((config) => {
    const action = CATEGORY_ACTIONS[body.action];
    if (!action) throw new Error("Unknown action");
    return action(config, body);
  });
}
