import assert from "node:assert/strict";
import { test } from "node:test";
import { groupSalesByWeek, visitSale } from "./visitSales.js";

const week = [{ weekStart: "2026-10-31", weekEnd: "2026-11-06" }];
const visit = (startAt, prices, job = { billingType: "VISIT_BASED", invoiceSchedule: { billingFrequency: "PER_VISIT" } }) => ({
  startAt,
  job,
  lineItems: { nodes: prices.map((totalPrice) => ({ totalPrice, taxable: true })) },
});

test("a visit's sale is the sum of its line items, before tax", () => {
  const sale = visitSale(visit("2026-11-02T14:00:00Z", [100, 50.5]));
  assert.equal(sale.net, 150.5);
  assert.equal(sale.day, "2026-11-02");
});

test("fixed-price jobs billed monthly don't count, like Jobber's visits report", () => {
  const monthly = { billingType: "FIXED_PRICE", invoiceSchedule: { billingFrequency: "PERIODIC" } };
  assert.equal(visitSale(visit("2026-11-02T14:00:00Z", [600], monthly)), null);
  const onCompletion = { billingType: "FIXED_PRICE", invoiceSchedule: { billingFrequency: "ON_COMPLETION" } };
  assert.equal(visitSale(visit("2026-11-02T14:00:00Z", [600], onCompletion)).net, 600);
});

test("unscheduled visits don't count", () => {
  assert.equal(visitSale(visit(null, [100])), null);
});

test("a Friday-night visit stays on Friday in New York time", () => {
  // 1:30 UTC del sábado = 9:30 pm del viernes en Nueva York
  assert.equal(visitSale(visit("2026-11-07T01:30:00Z", [100])).day, "2026-11-06");
});

test("weekly sales add the visits of each Saturday-to-Friday week", () => {
  const visits = [
    visit("2026-10-30T15:00:00Z", [999]), // semana anterior
    visit("2026-10-31T15:00:00Z", [100]),
    visit("2026-11-06T15:00:00Z", [200.25]),
    visit("2026-11-07T15:00:00Z", [999]), // semana siguiente
  ];
  const [w] = groupSalesByWeek(visits, week, "2026-11-20");
  assert.equal(w.neto, 300.25);
  assert.equal(w.visitas, 2);
  assert.equal(w.impuestos, 19.89);
  assert.equal(w.bruto, 320.14);
});

test("the current week only counts visits up to today", () => {
  const visits = [visit("2026-11-02T15:00:00Z", [100]), visit("2026-11-05T15:00:00Z", [200])];
  assert.equal(groupSalesByWeek(visits, week, "2026-11-03")[0].neto, 100);
});
