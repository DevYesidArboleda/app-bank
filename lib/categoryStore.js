import { EMPTY_CONFIG } from "@/lib/categories";
import { kvGet, kvSet } from "@/lib/kv";

const KEY = "expenses:categorization";

export async function getCategoryConfig() {
  return (await kvGet(KEY)) || EMPTY_CONFIG;
}

export async function saveCategoryConfig(config) {
  await kvSet(KEY, config);
}
