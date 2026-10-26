import { simplefinGetAccounts } from "@/lib/simplefin";
import { dateKey, lastWeeks } from "@/lib/weeks";

// Cuentas cuyos movimientos NO se cuentan como gasto aunque tengan salidas:
// la cuenta de impuestos/taxes, la de payroll (el payroll ya se cuenta aparte,
// desde la hoja) y la cuenta "L Soto". Igual se usan para detectar
// transferencias. Se comparan sin espacios ni signos ("L. Soto" = "lsoto").
const EXCLUDED_ACCOUNT_KEYWORDS = ["tax", "payroll", "lsoto"];

// Descripciones que indican movimiento entre tus propias cuentas
// (incluye pagos a la tarjeta de crédito: el gasto real ya está en la tarjeta).
const TRANSFER_PATTERNS = [
  /transfer/,
  /\bxfer\b/,
  /trnsfr/,
  /payment to chase card/,
  /chase credit crd/,
  /credit card payment/,
  /card payment/,
  /payment thank you/,
  /automatic payment/,
  /autopay.*(card|crd|chase)/,
];

// Días de tolerancia para emparejar la salida de una cuenta con la entrada
// del mismo monto en otra cuenta (transferencia interna sin descripción clara).
const PAIR_WINDOW_DAYS = 4;

// Reglas de categoría: la primera que coincide gana, por eso las más
// específicas van primero (ej. "uber eats" antes que "uber").
export const CATEGORY_RULES = [
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

export const OTHER_CATEGORY = "Other";

export function categorize(text = "") {
  const t = text.toLowerCase();
  for (const [name, patterns] of CATEGORY_RULES) {
    if (patterns.some((p) => p.test(t))) return name;
  }
  return OTHER_CATEGORY;
}

function isExcludedAccount(name = "") {
  const n = name.toLowerCase().replace(/[^a-z0-9]/g, "");
  return EXCLUDED_ACCOUNT_KEYWORDS.some((keyword) => n.includes(keyword));
}

function looksLikeTransfer(text = "") {
  const t = text.toLowerCase();
  return TRANSFER_PATTERNS.some((p) => p.test(t));
}

// Marca como transferencia cada salida que tiene una entrada del mismo monto
// en OTRA cuenta en pocos días (y viceversa). Cada entrada se usa una sola vez.
function markTransferPairs(transactions) {
  const windowMs = PAIR_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  const inflows = transactions.filter((tx) => tx.amount > 0);
  const used = new Set();

  for (const out of transactions) {
    if (out.amount >= 0) continue;
    const match = inflows.find(
      (inc) =>
        !used.has(inc) &&
        inc.accountId !== out.accountId &&
        Math.abs(inc.amount + out.amount) < 0.01 &&
        Math.abs(inc.date - out.date) <= windowMs
    );
    if (match) {
      used.add(match);
      out.isTransfer = true;
      match.isTransfer = true;
    }
  }
}

// Trae las transacciones de todas las cuentas y las clasifica:
// isTransfer (movimiento entre tus cuentas), countsAsExpense y category.
export async function getClassifiedTransactions({ startDate, endDate }) {
  const data = await simplefinGetAccounts({ startDate, endDate });

  const transactions = (data.accounts || []).flatMap((acc) =>
    (acc.transactions || []).map((tx) => {
      const text = [tx.description, tx.payee, tx.memo].filter(Boolean).join(" ");
      return {
        id: tx.id,
        accountId: acc.id,
        account: acc.name,
        excludedAccount: isExcludedAccount(acc.name),
        date: new Date((tx.posted || tx.transacted_at) * 1000),
        amount: Number(tx.amount),
        description: tx.description || "",
        isTransfer: looksLikeTransfer(text),
        category: categorize(text),
      };
    })
  );

  // Se emparejan TODAS las cuentas (incluida la de impuestos): así la salida
  // desde checking hacia la cuenta de taxes también se reconoce como transferencia.
  markTransferPairs(transactions);

  for (const tx of transactions) {
    tx.countsAsExpense = tx.amount < 0 && !tx.isTransfer && !tx.excludedAccount;
  }

  return { transactions, errors: data.errors || [] };
}

// Gastos por semana, separados por categoría y con sus movimientos. Solo cuentan
// salidas reales hacia terceros: las transferencias entre tus cuentas y las cuentas
// excluidas (impuestos, payroll, L Soto) quedan fuera, pero se listan aparte para revisarlas.
export async function getWeeklyExpenses(weeksBack) {
  const endDate = Math.floor(Date.now() / 1000);
  const startDate = endDate - weeksBack * 7 * 24 * 60 * 60;
  const { transactions } = await getClassifiedTransactions({ startDate, endDate });
  return groupByWeek(transactions, weeksBack);
}

const round = (n) => Math.round(n * 100) / 100;

// Semanas fijas de sábado a viernes (lib/weeks.js), las mismas del payroll
function groupByWeek(transactions, weeksBack) {
  const weeks = [];
  for (const { weekStart, weekEnd } of lastWeeks(weeksBack)) {
    const inWeek = transactions.filter((tx) => {
      const d = dateKey(tx.date);
      return d >= weekStart && d <= weekEnd;
    });
    const categorias = {};
    const movimientos = [];
    const excluidos = [];
    let total = 0;
    let transferencias = 0;

    for (const tx of inWeek) {
      if (tx.amount >= 0) continue;
      const amount = Math.abs(tx.amount);
      const item = {
        id: tx.id,
        date: tx.date.toISOString(),
        description: tx.description,
        account: tx.account,
        amount: round(amount),
        category: tx.category,
      };
      if (tx.countsAsExpense) {
        total += amount;
        categorias[tx.category] = (categorias[tx.category] || 0) + amount;
        movimientos.push(item);
      } else {
        if (tx.isTransfer) transferencias += amount;
        excluidos.push({ ...item, reason: tx.isTransfer ? "transfer" : "account" });
      }
    }

    const byDateDesc = (a, b) => b.date.localeCompare(a.date);
    movimientos.sort(byDateDesc);
    excluidos.sort(byDateDesc);

    for (const key of Object.keys(categorias)) categorias[key] = round(categorias[key]);

    weeks.push({
      weekStart,
      weekEnd,
      total: round(total),
      categorias,
      transferencias: round(transferencias),
      movimientos,
      excluidos,
    });
  }
  return weeks;
}
