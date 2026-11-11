import assert from "node:assert/strict";
import { test } from "node:test";
import {
  DEFAULT_CATEGORIES,
  EMPTY_CONFIG,
  createCategory,
  deleteCategory,
  renameCategory,
  setKeywords,
  applyOverride,
  applyRule,
  listCategories,
  matchesPattern,
  reclassifyWeek,
  removeOverride,
  removeRule,
  resolveCategory,
  suggestPattern,
} from "./categories.js";

const tx = (text, id = "tx1") => ({ id, text });

test("suggestPattern drops reference codes that change on every charge", () => {
  assert.equal(suggestPattern("AMAZON MKTPL*AB12C"), "amazon mktpl");
  assert.equal(suggestPattern("AMAZON MKTPL*XY99Z"), "amazon mktpl");
});

test("suggestPattern drops store numbers and processor prefixes", () => {
  assert.equal(suggestPattern("HOME DEPOT #1234"), "home depot");
  assert.equal(suggestPattern("SQ *JOES PLUMBING"), "joes plumbing");
  assert.equal(suggestPattern("POS DEBIT LOWE'S 0456"), "lowes");
});

test("suggestPattern keeps the recipient of a person-to-person payment", () => {
  assert.equal(suggestPattern("Zelle payment to John Smith 123456"), "zelle payment to john smith");
});

test("suggestPattern returns nothing when only generic words remain", () => {
  assert.equal(suggestPattern("CHECK 1234"), "");
  assert.equal(suggestPattern("Zelle payment to 5551234"), "");
  assert.equal(suggestPattern(""), "");
});

test("matchesPattern ignores case and punctuation", () => {
  assert.ok(matchesPattern("AMAZON MKTPL*XY99Z", "amazon mktpl"));
});

test("matchesPattern only matches whole words", () => {
  assert.ok(!matchesPattern("TARGETED ADS LLC", "target"));
  assert.ok(matchesPattern("TARGET 00123", "target"));
});

test("matchesPattern ignores numbers in the middle of the description", () => {
  assert.ok(matchesPattern("APPLE.COM/BILL 866-712-7753 CA", "apple com bill ca"));
});

test("matchesPattern still finds a pattern that contains numbers", () => {
  assert.ok(matchesPattern("7-ELEVEN 12345 NEWARK", "7 eleven"));
  assert.ok(!matchesPattern("8-ELEVEN 12345 NEWARK", "7 eleven"));
});

test("a suggested pattern always matches the description it came from", () => {
  const descriptions = [
    "APPLE.COM/BILL 866-712-7753 CA",
    "HOME DEPOT #1234 NEWARK NJ",
    "POS DEBIT 0456 LOWE'S STORE 12 UNION",
    "AMAZON MKTPL*AB12C Amzn.com/bill WA",
    "Zelle payment to John 555 Smith 123456",
    "SQ *JOES 42 PLUMBING",
  ];
  for (const description of descriptions) {
    const pattern = suggestPattern(description);
    assert.ok(pattern, `no suggestion for ${description}`);
    assert.ok(matchesPattern(description, pattern), `"${pattern}" should match "${description}"`);
  }
});

test("a rule built from a real description moves that transaction and its later charges", () => {
  const pattern = suggestPattern("APPLE.COM/BILL 866-712-7753 CA");
  const config = applyRule(EMPTY_CONFIG, { pattern, category: "Software" });
  assert.equal(resolveCategory(tx("APPLE.COM/BILL 866-712-7753 CA", "a"), config), "Software");
  assert.equal(resolveCategory(tx("APPLE.COM/BILL 800-275-2273 CA", "b"), config), "Software");
});

test("resolveCategory falls back to the built-in rules, then Other", () => {
  assert.equal(resolveCategory(tx("HOME DEPOT #1"), EMPTY_CONFIG), "Materials & tools");
  assert.equal(resolveCategory(tx("ACME UNKNOWN VENDOR ZZZ"), EMPTY_CONFIG), "Groceries");
  assert.equal(resolveCategory(tx("NOTHING KNOWN"), EMPTY_CONFIG), "Other");
});

test("a saved rule beats the built-in rules", () => {
  const config = applyRule(EMPTY_CONFIG, { pattern: "home depot", category: "Job supplies" });
  assert.equal(resolveCategory(tx("HOME DEPOT #1"), config), "Job supplies");
});

test("the most specific rule wins regardless of save order", () => {
  let config = applyRule(EMPTY_CONFIG, { pattern: "amazon mktpl", category: "Office" });
  config = applyRule(config, { pattern: "amazon", category: "Shopping" });
  assert.equal(resolveCategory(tx("AMAZON MKTPL*1"), config), "Office");
  assert.equal(resolveCategory(tx("AMAZON WEB SERVICES"), config), "Shopping");
});

test("a single-transaction override beats every rule", () => {
  let config = applyRule(EMPTY_CONFIG, { pattern: "home depot", category: "Job supplies" });
  config = applyOverride(config, { txId: "tx1", category: "Personal", description: "HOME DEPOT" });
  assert.equal(resolveCategory(tx("HOME DEPOT", "tx1"), config), "Personal");
  assert.equal(resolveCategory(tx("HOME DEPOT", "tx2"), config), "Job supplies");
});

test("saving the same pattern again replaces its category", () => {
  let config = applyRule(EMPTY_CONFIG, { pattern: "Home Depot", category: "A" });
  config = applyRule(config, { pattern: "home   depot", category: "B" });
  assert.deepEqual(config.rules, [{ pattern: "home depot", category: "B" }]);
});

test("a rule created from a transaction clears that transaction's override", () => {
  let config = applyOverride(EMPTY_CONFIG, { txId: "tx1", category: "Personal", description: "X" });
  config = applyRule(config, { pattern: "home depot", category: "Job supplies", txId: "tx1" });
  assert.equal(resolveCategory(tx("HOME DEPOT", "tx1"), config), "Job supplies");
});

test("applyRule rejects patterns too short to be safe", () => {
  assert.throws(() => applyRule(EMPTY_CONFIG, { pattern: " a! ", category: "X" }), /pattern/i);
});

test("applyRule and applyOverride reject an empty category", () => {
  assert.throws(() => applyRule(EMPTY_CONFIG, { pattern: "home depot", category: "  " }), /category/i);
  assert.throws(() => applyOverride(EMPTY_CONFIG, { txId: "tx1", category: "" }), /category/i);
});

test("a category typed with different capitals reuses the existing one", () => {
  const builtIn = applyRule(EMPTY_CONFIG, { pattern: "home depot", category: " food " });
  assert.equal(builtIn.rules[0].category, "Food");
  const custom = applyRule(applyRule(EMPTY_CONFIG, { pattern: "abc", category: "Job Supplies" }), {
    pattern: "def",
    category: "job supplies",
  });
  assert.equal(custom.rules[1].category, "Job Supplies");
});

test("listCategories adds custom categories to the built-in ones", () => {
  const config = applyRule(EMPTY_CONFIG, { pattern: "abc", category: "Job supplies" });
  const list = listCategories(config);
  assert.ok(list.includes("Food"));
  assert.ok(list.includes("Other"));
  assert.ok(list.includes("Job supplies"));
});

test("removing a rule or an override returns transactions to the built-in result", () => {
  let config = applyRule(EMPTY_CONFIG, { pattern: "home depot", category: "Job supplies" });
  config = applyOverride(config, { txId: "tx1", category: "Personal", description: "HOME DEPOT" });
  config = removeOverride(config, "tx1");
  assert.equal(resolveCategory(tx("HOME DEPOT", "tx1"), config), "Job supplies");
  config = removeRule(config, "home depot");
  assert.equal(resolveCategory(tx("HOME DEPOT", "tx1"), config), "Materials & tools");
});

test("config mutators leave the original config untouched", () => {
  applyRule(EMPTY_CONFIG, { pattern: "home depot", category: "X" });
  applyOverride(EMPTY_CONFIG, { txId: "tx1", category: "X", description: "" });
  assert.deepEqual(EMPTY_CONFIG, { rules: [], overrides: {} });
});

test("reclassifyWeek moves amounts between categories and keeps the week total", () => {
  const week = {
    gastos: 150.5,
    gastosCategorias: { "Materials & tools": 100.25, Other: 50.25 },
    gastosMovimientos: [
      { id: "a", text: "HOME DEPOT", amount: 100.25, category: "Materials & tools" },
      { id: "b", text: "NOTHING KNOWN", amount: 50.25, category: "Other" },
    ],
    gastosExcluidos: [{ id: "c", text: "HOME DEPOT TRANSFER", amount: 10, category: "Materials & tools" }],
  };
  const config = applyRule(EMPTY_CONFIG, { pattern: "home depot", category: "Job supplies" });
  const next = reclassifyWeek(week, config);

  assert.deepEqual(next.gastosCategorias, { "Job supplies": 100.25, Other: 50.25 });
  assert.equal(next.gastos, 150.5);
  assert.equal(next.gastosMovimientos[0].category, "Job supplies");
  assert.equal(next.gastosExcluidos[0].category, "Job supplies");
});

test("built-in categories can be renamed, and their transactions follow", () => {
  let config = applyRule(EMPTY_CONFIG, { pattern: "joes diner", category: "Food" });
  config = renameCategory(config, { from: "food", to: "Meals" });
  assert.equal(resolveCategory(tx("STARBUCKS 123"), config), "Meals");
  assert.equal(resolveCategory(tx("JOES DINER"), config), "Meals");
  assert.ok(!listCategories(config).includes("Food"));
});

test("renaming to an existing category merges both", () => {
  const config = renameCategory(EMPTY_CONFIG, { from: "Groceries", to: "food" });
  assert.equal(resolveCategory(tx("COSTCO WHSE"), config), "Food");
  assert.ok(!listCategories(config).includes("Groceries"));
});

test("the fallback category can be renamed but not deleted", () => {
  const config = renameCategory(EMPTY_CONFIG, { from: "Other", to: "Uncategorized" });
  assert.equal(resolveCategory(tx("NOTHING KNOWN"), config), "Uncategorized");
  assert.equal(listCategories(config).at(-1), "Uncategorized");
  assert.throws(() => deleteCategory(config, { name: "Uncategorized" }), /can't be deleted/);
});

test("deleting a category moves its transactions to the chosen one", () => {
  let config = applyOverride(EMPTY_CONFIG, { txId: "t9", category: "Shopping" });
  config = deleteCategory(config, { name: "Shopping", moveTo: "Materials & tools" });
  assert.equal(resolveCategory(tx("AMAZON MKTPL*1"), config), "Materials & tools");
  assert.equal(resolveCategory(tx("X", "t9"), config), "Materials & tools");
  assert.ok(!listCategories(config).includes("Shopping"));
});

test("deleting without a destination sends its transactions to Other", () => {
  const config = deleteCategory(EMPTY_CONFIG, { name: "Food" });
  assert.equal(resolveCategory(tx("STARBUCKS 123"), config), "Other");
});

test("keywords of any category can be edited and move between categories", () => {
  let config = setKeywords(EMPTY_CONFIG, { name: "Groceries", keywords: ["Costco", "  market  "] });
  assert.equal(resolveCategory(tx("SHOPRITE 55"), config), "Other");
  assert.equal(resolveCategory(tx("COSTCO WHSE"), config), "Groceries");
  config = setKeywords(config, { name: "Shopping", keywords: ["amazon", "costco"] });
  assert.equal(resolveCategory(tx("COSTCO WHSE"), config), "Shopping");
  assert.throws(() => setKeywords(config, { name: "Other", keywords: ["x"] }), /no keywords/);
  assert.throws(() => setKeywords(config, { name: "Food", keywords: ["a"] }), /at least/);
});

test("the longest keyword wins across categories", () => {
  assert.equal(resolveCategory(tx("UBER EATS 123"), EMPTY_CONFIG), "Food");
  assert.equal(resolveCategory(tx("UBER TRIP 123"), EMPTY_CONFIG), "Fuel & transportation");
});

test("a new empty category shows up and can't be created twice", () => {
  const config = createCategory(EMPTY_CONFIG, { name: "Office" });
  assert.ok(listCategories(config).includes("Office"));
  assert.throws(() => createCategory(config, { name: "office" }), /already exists/);
});

test("editing categories doesn't touch the default list", () => {
  renameCategory(EMPTY_CONFIG, { from: "Food", to: "Meals" });
  setKeywords(EMPTY_CONFIG, { name: "Food", keywords: ["zz"] });
  assert.equal(DEFAULT_CATEGORIES[0].name, "Food");
  assert.ok(DEFAULT_CATEGORIES[0].keywords.includes("starbucks"));
});
