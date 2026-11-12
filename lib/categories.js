import { withResult } from "./result.js";

// Categorías de gasto. Todas se pueden editar desde el panel: renombrar,
// borrar, crear y cambiar sus palabras clave, también las que trae el app.
// Sin dependencias del servidor: la misma lógica clasifica en la API y actualiza
// el panel al guardar un cambio, sin volver a consultar SimpleFIN.
//
// Configuración guardada:
//   categories: [{ name, keywords }]  categorías y las palabras que las detectan
//   rules: [{ pattern, category }]    reglas creadas desde una transacción
//   overrides: { [txId]: { category, description } }  cambios de una sola
//   fallback: "Other"                 adonde va lo que no coincide con nada
//   includedAccounts: [name]          cuentas excluidas que sí cuentan como gasto
// Un cambio de una sola transacción (override) también saca de "Not counted"
// una transferencia o un movimiento de cuenta excluida: pasa a contar como gasto.
// Una configuración sin `categories` (la de antes) usa DEFAULT_CATEGORIES.

// Palabras completas, como las escribiría el banco ya sin mayúsculas ni signos
// ("LOWE'S" → "lowes", "CHICK-FIL-A" → "chick fil a").
export const DEFAULT_CATEGORIES = Object.freeze(
  [
    ["Food", [
      "uber eats", "doordash", "grubhub", "mcdonalds", "burger", "burgers", "wendys", "pizza", "dominos",
      "taco", "tacos", "chipotle", "subway", "starbucks", "dunkin", "chick fil a", "chickfila", "popeyes", "kfc",
      "panera", "restaurant", "restaurants", "cafe", "coffee", "deli", "bakery", "diner", "grill", "bagel",
      "bagels", "sushi",
    ]],
    ["Groceries", [
      "costco", "shoprite", "aldi", "lidl", "kroger", "whole foods", "trader joe", "trader joes", "stop shop",
      "acme", "wegmans", "publix", "safeway", "food bazaar", "supermarket", "grocery", "market", "c town", "ctown",
    ]],
    ["Fuel & transportation", [
      "shell", "exxon", "exxonmobil", "mobil", "bp", "sunoco", "chevron", "wawa", "quick chek", "quickchek",
      "speedway", "citgo", "gulf", "delta sonic", "fuel", "gas", "uber", "lyft", "ez pass", "ezpass", "e zpass",
      "e z pass", "toll", "tolls", "parking", "parkmobile", "nj transit",
    ]],
    ["Materials & tools", [
      "home depot", "homedepot", "lowes", "harbor freight", "sherwin", "sherwin williams", "menards",
      "ace hardware", "grainger", "hardware", "supply", "supplies", "lumber",
    ]],
    ["Vehicle", [
      "autozone", "advance auto", "pep boys", "jiffy", "jiffy lube", "car wash", "carwash", "auto parts", "tire",
      "tires", "mechanic", "dmv", "mvc",
    ]],
    ["Utilities & software", [
      "verizon", "t mobile", "tmobile", "at t", "att", "comcast", "xfinity", "optimum", "spectrum", "pseg",
      "electric", "water", "google", "microsoft", "adobe", "jobber", "quickbooks", "intuit", "godaddy", "openai",
      "zoom", "dropbox",
    ]],
    ["Insurance", ["insurance", "geico", "progressive", "state farm", "allstate", "liberty mutual", "nationwide"]],
    ["Entertainment", [
      "netflix", "spotify", "hulu", "disney", "disneyplus", "hbo", "youtube", "cinema", "amc", "regal", "steam",
      "playstation", "xbox", "nintendo", "ticketmaster", "bar", "brewery", "golf", "bowling", "casino",
    ]],
    ["Shopping", [
      "amazon", "amzn", "target", "walmart", "best buy", "ebay", "temu", "shein", "marshalls", "tj maxx", "tjmaxx",
    ]],
    ["Health", ["cvs", "walgreens", "rite aid", "pharmacy", "medical", "dental", "doctor", "clinic", "hospital"]],
    ["Taxes", ["irs", "usataxpymt", "taxation", "tax"]],
    ["Bank fees", ["fee", "fees", "interest charge", "service charge", "overdraft"]],
  ].map(([name, keywords]) => Object.freeze({ name, keywords: Object.freeze(keywords) }))
);

const DEFAULT_FALLBACK = "Other";
const MIN_PATTERN_LENGTH = 3;
const MIN_KEYWORD_LENGTH = 2;
const MAX_CATEGORY_LENGTH = 40;
const MAX_SUGGESTED_WORDS = 4;

// Prefijos del banco o del procesador de pago: no identifican al comercio.
const NOISE_PREFIXES = new Set(["pos", "debit", "card", "checkcard", "purchase", "recurring", "sq", "tst", "paypal", "pp"]);
// Palabras que por sí solas no identifican un concepto ("CHECK 1234", "Zelle payment to…").
const GENERIC_WORDS = new Set([
  "ach", "atm", "check", "deposit", "from", "online", "payment", "to", "transfer", "venmo", "wire", "withdrawal", "zelle",
]);

export const EMPTY_CONFIG = Object.freeze({ rules: Object.freeze([]), overrides: Object.freeze({}) });

// Minúsculas, sin acentos ni signos: "LOWE'S #12" → "lowes 12".
export function normalizeText(text = "") {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/'/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function wordsWithoutNumbers(normalized) {
  return normalized.split(" ").filter((word) => word && !/\d/.test(word));
}

// Propone el concepto de una descripción quitando lo que cambia en cada cobro
// (códigos, números de tienda). Devuelve "" si no queda nada que lo identifique.
export function suggestPattern(description = "") {
  const words = wordsWithoutNumbers(normalizeText(description));
  while (NOISE_PREFIXES.has(words[0])) words.shift();
  if (words.every((word) => GENERIC_WORDS.has(word))) return "";
  // En pagos a personas ("zelle payment to john smith") el nombre va al final.
  const kept = GENERIC_WORDS.has(words[0]) ? words : words.slice(0, MAX_SUGGESTED_WORDS);
  return kept.join(" ");
}

// Coincide por palabras completas: "target" no coincide con "targeted". También
// sin las palabras con números, que cambian en cada cobro y pueden ir en medio:
// "apple com bill ca" coincide con "APPLE.COM/BILL 866-712-7753 CA".
export function matchesPattern(text, pattern) {
  const normalizedText = normalizeText(text);
  const normalizedPattern = ` ${normalizeText(pattern)} `;
  return (
    ` ${normalizedText} `.includes(normalizedPattern) ||
    ` ${wordsWithoutNumbers(normalizedText).join(" ")} `.includes(normalizedPattern)
  );
}

export function isValidPattern(pattern) {
  return normalizeText(pattern).length >= MIN_PATTERN_LENGTH;
}

export function getCategories(config) {
  return config.categories || DEFAULT_CATEGORIES;
}

export function getFallback(config) {
  return config.fallback || DEFAULT_FALLBACK;
}

// La palabra clave más larga gana ("uber eats" → Food antes que "uber");
// si empatan, la categoría que va primero.
function categorizeByKeywords(text, config) {
  let best = null;
  for (const category of getCategories(config)) {
    for (const keyword of category.keywords) {
      if ((!best || keyword.length > best.keyword.length) && matchesPattern(text, keyword)) {
        best = { keyword, category: category.name };
      }
    }
  }
  return best ? best.category : getFallback(config);
}

// Prioridad: cambio de esa sola transacción, regla del usuario más específica
// (el concepto más largo) y, si no hay ninguna, las palabras clave.
export function resolveCategory({ id, text = "" }, config) {
  const override = config.overrides[id];
  if (override) return override.category;

  let best = null;
  for (const rule of config.rules) {
    if ((!best || rule.pattern.length > best.pattern.length) && matchesPattern(text, rule.pattern)) best = rule;
  }
  return best ? best.category : categorizeByKeywords(text, config);
}

// Todas las categorías, en orden alfabético y con la de respaldo al final.
export function listCategories(config) {
  const fallback = getFallback(config);
  const names = [
    ...getCategories(config).map((category) => category.name),
    ...config.rules.map((rule) => rule.category),
    ...Object.values(config.overrides).map((override) => override.category),
  ];
  return [...new Set([...names, fallback])].sort((a, b) => {
    if (a === fallback) return 1;
    if (b === fallback) return -1;
    return a.localeCompare(b);
  });
}

function findCategory(config, name) {
  const lower = String(name ?? "").trim().toLowerCase();
  return listCategories(config).find((c) => c.toLowerCase() === lower);
}

function validName(category) {
  const name = typeof category === "string" ? category.trim().replace(/\s+/g, " ") : "";
  if (!name || name.length > MAX_CATEGORY_LENGTH) {
    throw new Error(`Category must be between 1 and ${MAX_CATEGORY_LENGTH} characters`);
  }
  return name;
}

// "food" reutiliza "Food" en vez de crear una categoría casi igual.
function canonicalCategory(config, category) {
  const name = validName(category);
  return findCategory(config, name) || name;
}

function requireCategory(config, name) {
  const found = findCategory(config, name);
  if (!found) throw new Error(`Category "${name}" doesn't exist`);
  return found;
}

// Copia editable con todas las categorías en `categories` (también las que
// solo usaban reglas o cambios sueltos) y `name` agregada si es nueva.
function withCategory(config, name) {
  const fallback = getFallback(config);
  const categories = getCategories(config).map((c) => ({ name: c.name, keywords: [...c.keywords] }));
  for (const extra of [...listCategories(config), name]) {
    if (extra && extra !== fallback && !categories.some((c) => c.name === extra)) {
      categories.push({ name: extra, keywords: [] });
    }
  }
  return { ...config, categories, fallback };
}

export function createCategory(config, { name }) {
  const clean = validName(name);
  if (findCategory(config, clean)) throw new Error(`Category "${clean}" already exists`);
  return withCategory(config, clean);
}

// Si el nombre nuevo ya es otra categoría, las dos se juntan en esa.
export function renameCategory(config, { from, to }) {
  const source = requireCategory(config, from);
  const name = validName(to);
  const existing = findCategory(config, name);
  const target = existing && existing !== source ? existing : name;
  const relabel = (category) => (category === source ? target : category);

  const base = withCategory(config);
  const fallback = relabel(base.fallback);
  const categories = [];
  for (const category of base.categories) {
    const renamed = { ...category, name: relabel(category.name) };
    const same = categories.find((c) => c.name === renamed.name);
    if (same) same.keywords = [...new Set([...same.keywords, ...renamed.keywords])];
    else categories.push(renamed);
  }
  return {
    ...base,
    fallback,
    // La de respaldo no lleva palabras clave: recibe lo que no coincide con nada.
    categories: categories.filter((c) => c.name !== fallback),
    rules: base.rules.map((rule) => ({ ...rule, category: relabel(rule.category) })),
    overrides: Object.fromEntries(
      Object.entries(base.overrides).map(([id, o]) => [id, { ...o, category: relabel(o.category) }])
    ),
  };
}

// Sus transacciones, reglas y palabras clave pasan a `moveTo` (la de respaldo
// si no se indica), para que las de antes y las futuras lleguen ahí.
export function deleteCategory(config, { name, moveTo }) {
  const source = requireCategory(config, name);
  const fallback = getFallback(config);
  if (source === fallback) throw new Error(`"${fallback}" can't be deleted: it holds what matches no other category`);
  const target = moveTo ? requireCategory(config, moveTo) : fallback;
  if (target === source) throw new Error("Choose a different category to move its transactions to");
  return renameCategory(config, { from: source, to: target });
}

export function setKeywords(config, { name, keywords }) {
  const category = requireCategory(config, name);
  if (category === getFallback(config)) {
    throw new Error("This category holds what matches no other one, so it has no keywords");
  }
  if (!Array.isArray(keywords)) throw new Error("Keywords must be a list");
  const clean = [...new Set(keywords.map((k) => normalizeText(String(k))).filter(Boolean))];
  if (clean.some((k) => k.length < MIN_KEYWORD_LENGTH)) {
    throw new Error(`Each keyword needs at least ${MIN_KEYWORD_LENGTH} letters or numbers`);
  }

  const base = withCategory(config);
  return {
    ...base,
    // Cada palabra clave lleva a una sola categoría: si estaba en otra, se mueve.
    categories: base.categories.map((c) =>
      c.name === category
        ? { ...c, keywords: clean }
        : { ...c, keywords: c.keywords.filter((k) => !clean.includes(k)) }
    ),
  };
}

function withoutKey(object, key) {
  const copy = { ...object };
  delete copy[key];
  return copy;
}

export function applyRule(config, { pattern, category, txId }) {
  const normalized = normalizeText(pattern);
  if (!isValidPattern(normalized)) throw new Error(`Pattern must have at least ${MIN_PATTERN_LENGTH} characters`);
  const name = canonicalCategory(config, category);
  const others = config.rules.filter((rule) => rule.pattern !== normalized);
  return {
    ...withCategory(config, name),
    rules: [...others, { pattern: normalized, category: name }],
    // Sin esto, un cambio anterior de esa transacción taparía la regla recién creada.
    overrides: txId ? withoutKey(config.overrides, txId) : config.overrides,
  };
}

export function applyOverride(config, { txId, category, description = "" }) {
  if (!txId || typeof txId !== "string") throw new Error("Missing transaction");
  const name = canonicalCategory(config, category);
  return { ...withCategory(config, name), overrides: { ...config.overrides, [txId]: { category: name, description } } };
}

export function removeRule(config, pattern) {
  const normalized = normalizeText(pattern);
  return { ...config, rules: config.rules.filter((rule) => rule.pattern !== normalized) };
}

export function removeOverride(config, txId) {
  return { ...config, overrides: withoutKey(config.overrides, txId) };
}

export function getIncludedAccounts(config) {
  return config.includedAccounts || [];
}

// Una salida cuenta como gasto si no se excluye sola (`reason`: transferencia o
// cuenta excluida) o si el usuario la movió: cambio de esa transacción o, para
// las de una cuenta excluida, la cuenta entera incluida.
export function countsAsExpense({ id, reason, account }, config) {
  if (!reason) return true;
  if (config.overrides[id]) return true;
  return reason === "account" && getIncludedAccounts(config).includes(account);
}

export function includeAccount(config, { account }) {
  if (!account || typeof account !== "string") throw new Error("Missing account");
  const included = getIncludedAccounts(config);
  return included.includes(account) ? config : { ...config, includedAccounts: [...included, account] };
}

export function removeIncludedAccount(config, account) {
  return { ...config, includedAccounts: getIncludedAccounts(config).filter((a) => a !== account) };
}

const round = (n) => Math.round(n * 100) / 100;
const byDateDesc = (a, b) => b.date.localeCompare(a.date);

// Recalcula una semana ya cargada con la configuración nueva: la categoría de
// cada salida, si cuenta como gasto o no, y con eso los totales y el resultado.
export function reclassifyWeek(week, config) {
  const all = [...(week.gastosMovimientos || []), ...(week.gastosExcluidos || [])].map((tx) => ({
    ...tx,
    category: resolveCategory(tx, config),
  }));
  const gastosMovimientos = [];
  const gastosExcluidos = [];
  for (const tx of all) (countsAsExpense(tx, config) ? gastosMovimientos : gastosExcluidos).push(tx);
  gastosMovimientos.sort(byDateDesc);
  gastosExcluidos.sort(byDateDesc);

  const gastosCategorias = {};
  for (const tx of gastosMovimientos) {
    gastosCategorias[tx.category] = round((gastosCategorias[tx.category] || 0) + tx.amount);
  }
  const sum = (items) => round(items.reduce((s, tx) => s + tx.amount, 0));
  return withResult({
    ...week,
    gastos: sum(gastosMovimientos),
    gastosCategorias,
    transferencias: sum(gastosExcluidos.filter((tx) => tx.reason === "transfer")),
    gastosMovimientos,
    gastosExcluidos,
  });
}
