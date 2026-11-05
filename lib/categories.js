// Categorías de gasto: reglas fijas del código más las que crea el usuario.
// Sin dependencias del servidor: la misma lógica clasifica en la API y actualiza
// el panel al guardar un cambio, sin volver a consultar SimpleFIN.

// Reglas fijas: la primera que coincide gana, por eso las más específicas van
// primero (ej. "uber eats" antes que "uber").
const CATEGORY_RULES = [
  ["Food", [
    /uber\s*eats/, /doordash/, /grubhub/, /mcdonald/, /burger/, /wendy/, /pizza/, /domino/, /taco/,
    /chipotle/, /subway/, /starbucks/, /dunkin/, /chick-?fil/, /popeyes/, /\bkfc\b/, /panera/,
    /restaurant/, /\bcafe\b/, /coffee/, /\bdeli\b/, /bakery/, /diner/, /grill/, /bagel/, /sushi/,
  ]],
  ["Groceries", [
    /costco/, /shoprite/, /\baldi\b/, /\blidl\b/, /kroger/, /whole foods/, /trader joe/, /stop & shop/,
    /\bacme\b/, /wegmans/, /publix/, /safeway/, /food bazaar/, /supermarket/, /grocery/, /market/, /c-town/,
  ]],
  ["Fuel & transportation", [
    /\bshell\b/, /exxon/, /mobil/, /\bbp\b/, /sunoco/, /chevron/, /\bwawa\b/, /quick ?chek/, /speedway/,
    /citgo/, /\bgulf\b/, /delta sonic/, /fuel/, /\bgas\b/, /\buber\b/, /\blyft\b/, /e-?z ?pass/, /\btoll/,
    /parking/, /parkmobile/, /nj transit/,
  ]],
  ["Materials & tools", [
    /home depot/, /lowe'?s/, /harbor freight/, /sherwin/, /menards/, /ace hardware/, /grainger/,
    /hardware/, /supply/, /lumber/,
  ]],
  ["Vehicle", [/autozone/, /advance auto/, /pep boys/, /jiffy/, /car ?wash/, /auto parts/, /\btire/, /mechanic/, /dmv/, /mvc/]],
  ["Utilities & software", [
    /verizon/, /t-?mobile/, /at&t/, /comcast/, /xfinity/, /optimum/, /spectrum/, /pseg/, /electric/,
    /\bwater\b/, /google/, /microsoft/, /adobe/, /jobber/, /quickbooks/, /intuit/, /godaddy/, /openai/,
    /\bzoom\b/, /dropbox/,
  ]],
  ["Insurance", [/insurance/, /geico/, /progressive/, /state farm/, /allstate/, /liberty mutual/, /nationwide/]],
  ["Entertainment", [
    /netflix/, /spotify/, /hulu/, /disney/, /\bhbo\b/, /youtube/, /cinema/, /\bamc\b/, /regal/, /steam/,
    /playstation/, /xbox/, /nintendo/, /ticketmaster/, /\bbar\b/, /brewery/, /golf/, /bowling/, /casino/,
  ]],
  ["Shopping", [/amazon/, /amzn/, /target/, /walmart/, /best buy/, /ebay/, /\btemu\b/, /\bshein\b/, /marshalls/, /tj ?maxx/]],
  ["Health", [/\bcvs\b/, /walgreens/, /rite aid/, /pharmacy/, /medical/, /dental/, /doctor/, /clinic/, /hospital/]],
  ["Taxes", [/\birs\b/, /usataxpymt/, /taxation/, /\btax\b/]],
  ["Bank fees", [/\bfee\b/, /interest charge/, /service charge/, /overdraft/]],
];

const OTHER_CATEGORY = "Other";
const BUILT_IN_CATEGORIES = [...CATEGORY_RULES.map(([name]) => name), OTHER_CATEGORY];
const MIN_PATTERN_LENGTH = 3;
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

function categorizeBuiltIn(text = "") {
  const t = text.toLowerCase();
  for (const [name, patterns] of CATEGORY_RULES) {
    if (patterns.some((p) => p.test(t))) return name;
  }
  return OTHER_CATEGORY;
}

// Prioridad: cambio de esa sola transacción, regla del usuario más específica
// (el concepto más largo) y, si no hay ninguna, las reglas fijas.
export function resolveCategory({ id, text = "" }, config) {
  const override = config.overrides[id];
  if (override) return override.category;

  let best = null;
  for (const rule of config.rules) {
    if ((!best || rule.pattern.length > best.pattern.length) && matchesPattern(text, rule.pattern)) best = rule;
  }
  return best ? best.category : categorizeBuiltIn(text);
}

// Las categorías propias existen mientras alguna regla o transacción las use.
export function listCategories(config) {
  const custom = [
    ...config.rules.map((rule) => rule.category),
    ...Object.values(config.overrides).map((override) => override.category),
  ];
  return [...new Set([...BUILT_IN_CATEGORIES, ...custom])].sort((a, b) => {
    if (a === OTHER_CATEGORY) return 1;
    if (b === OTHER_CATEGORY) return -1;
    return a.localeCompare(b);
  });
}

// "food" reutiliza "Food" en vez de crear una categoría casi igual.
function canonicalCategory(config, category) {
  const name = typeof category === "string" ? category.trim() : "";
  if (!name || name.length > MAX_CATEGORY_LENGTH) {
    throw new Error(`Category must be between 1 and ${MAX_CATEGORY_LENGTH} characters`);
  }
  return listCategories(config).find((c) => c.toLowerCase() === name.toLowerCase()) || name;
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
    rules: [...others, { pattern: normalized, category: name }],
    // Sin esto, un cambio anterior de esa transacción taparía la regla recién creada.
    overrides: txId ? withoutKey(config.overrides, txId) : config.overrides,
  };
}

export function applyOverride(config, { txId, category, description = "" }) {
  if (!txId || typeof txId !== "string") throw new Error("Missing transaction");
  const name = canonicalCategory(config, category);
  return { ...config, overrides: { ...config.overrides, [txId]: { category: name, description } } };
}

export function removeRule(config, pattern) {
  const normalized = normalizeText(pattern);
  return { ...config, rules: config.rules.filter((rule) => rule.pattern !== normalized) };
}

export function removeOverride(config, txId) {
  return { ...config, overrides: withoutKey(config.overrides, txId) };
}

// Recalcula las categorías de una semana ya cargada. El total no cambia:
// solo se mueve de una categoría a otra.
export function reclassifyWeek(week, config) {
  const relabel = (tx) => ({ ...tx, category: resolveCategory(tx, config) });
  const gastosMovimientos = (week.gastosMovimientos || []).map(relabel);
  const gastosExcluidos = (week.gastosExcluidos || []).map(relabel);

  const gastosCategorias = {};
  for (const tx of gastosMovimientos) {
    gastosCategorias[tx.category] = Math.round(((gastosCategorias[tx.category] || 0) + tx.amount) * 100) / 100;
  }
  return { ...week, gastosCategorias, gastosMovimientos, gastosExcluidos };
}
