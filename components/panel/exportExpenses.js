import { dateKey, weekStartOf, addDays } from "@/lib/weeks";
import { weekEndOf } from "./format";
import { downloadXlsx } from "./xlsx";

const REASON = { transfer: "Transfer", account: "Excluded account" };
const round = (n) => Math.round(n * 100) / 100;

// Exporta a Excel todos los movimientos del período (gastos y lo que no cuenta
// como gasto: transferencias y cuentas excluidas), con la semana de cada uno.
// Hojas: Transactions (detalle), By week y By category.
export function exportPeriodToExcel(period) {
  const gastos = (period.gastosMovimientos || []).map((tx) => ({ ...tx, counted: true }));
  const excluidos = (period.gastosExcluidos || []).map((tx) => ({ ...tx, counted: false }));
  const all = [...gastos, ...excluidos]
    .map((tx) => ({ ...tx, day: dateKey(tx.date), week: weekStartOf(tx.date) }))
    .sort((a, b) => a.day.localeCompare(b.day));

  const transactions = all.map((tx) => [
    tx.week,
    addDays(tx.week, 6),
    tx.day,
    tx.description || "No description",
    tx.account,
    tx.category,
    tx.amount,
    tx.counted ? "Yes" : "No",
    tx.counted ? "" : REASON[tx.reason] || "Not counted",
  ]);

  // Una fila por semana del período, aunque no tenga movimientos.
  const weeks = [];
  for (let w = period.weekStart; w <= weekEndOf(period); w = addDays(w, 7)) weeks.push(w);
  const byWeek = weeks.map((w) => {
    const inWeek = all.filter((tx) => tx.week === w);
    const sum = (list) => round(list.reduce((s, tx) => s + tx.amount, 0));
    const counted = inWeek.filter((tx) => tx.counted);
    const transfers = inWeek.filter((tx) => !tx.counted && tx.reason === "transfer");
    const excludedAcc = inWeek.filter((tx) => !tx.counted && tx.reason !== "transfer");
    return [w, addDays(w, 6), counted.length, sum(counted), transfers.length, sum(transfers), sum(excludedAcc)];
  });
  const total = (i) => round(byWeek.reduce((s, r) => s + r[i], 0));
  byWeek.push(["Total", "", total(2), total(3), total(4), total(5), total(6)]);

  const totalExpenses = round(gastos.reduce((s, tx) => s + tx.amount, 0));
  const byCategory = Object.entries(
    gastos.reduce((acc, tx) => {
      const c = (acc[tx.category] ||= { count: 0, amount: 0 });
      c.count += 1;
      c.amount += tx.amount;
      return acc;
    }, {})
  )
    .sort((a, b) => b[1].amount - a[1].amount)
    .map(([name, c]) => [name, c.count, round(c.amount), totalExpenses > 0 ? c.amount / totalExpenses : 0]);
  byCategory.push(["Total", gastos.length, totalExpenses, totalExpenses > 0 ? 1 : 0]);

  downloadXlsx(`transactions_${period.weekStart}_to_${weekEndOf(period)}.xlsx`, [
    {
      name: "Transactions",
      columns: [
        { header: "Week start", type: "date", width: 12 },
        { header: "Week end", type: "date", width: 12 },
        { header: "Date", type: "date", width: 12 },
        { header: "Description", width: 44 },
        { header: "Account", width: 24 },
        { header: "Category", width: 22 },
        { header: "Amount", type: "money", width: 13 },
        { header: "Counted as expense", width: 18 },
        { header: "Reason not counted", width: 20 },
      ],
      rows: transactions,
    },
    {
      name: "By week",
      totalRow: true,
      columns: [
        { header: "Week start", type: "date", width: 12 },
        { header: "Week end", type: "date", width: 12 },
        { header: "Expense transactions", type: "number", width: 20 },
        { header: "Expenses", type: "money", width: 14 },
        { header: "Transfers", type: "number", width: 11 },
        { header: "Transfers amount", type: "money", width: 17 },
        { header: "Excluded accounts", type: "money", width: 18 },
      ],
      rows: byWeek,
    },
    {
      name: "By category",
      totalRow: true,
      columns: [
        { header: "Category", width: 24 },
        { header: "Transactions", type: "number", width: 13 },
        { header: "Amount", type: "money", width: 14 },
        { header: "Share", type: "percent", width: 9 },
      ],
      rows: byCategory,
    },
  ]);
}
