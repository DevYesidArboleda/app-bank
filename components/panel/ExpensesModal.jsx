"use client";

import { useEffect, useRef } from "react";
import { fmt, fmtDay, weekRange } from "./format";
import { exportPeriodToExcel } from "./exportExpenses";
import { IconClose, IconDownload } from "./icons";

const REASON_COPY = {
  transfer: "Transfer",
  account: "Excluded account",
};

function TxTable({ items, showReason }) {
  return (
    <table className="tx-table">
      <thead className="sr-only">
        <tr>
          <th scope="col">Date</th>
          <th scope="col">Description</th>
          <th scope="col">Amount</th>
        </tr>
      </thead>
      <tbody>
        {items.map((tx) => (
          <tr key={tx.id ?? `${tx.date}-${tx.description}-${tx.amount}`}>
            <td className="tx-date">{fmtDay(tx.date)}</td>
            <td className="tx-desc">
              <span className="tx-name">{tx.description || "No description"}</span>
              <span className="tx-meta">
                {tx.account}
                {showReason && ` · ${REASON_COPY[tx.reason] || "Not counted"}`}
              </span>
            </td>
            <td className="tx-amount">{fmt(tx.amount)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// Todo el gasto del período, agrupado por categoría y con cada movimiento.
export default function ExpensesModal({ period, isCurrent, open, onClose }) {
  const ref = useRef(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const movimientos = period?.gastosMovimientos || [];
  const excluidos = period?.gastosExcluidos || [];
  const total = period?.gastos || 0;

  const categories = Object.entries(
    movimientos.reduce((acc, tx) => {
      (acc[tx.category] ||= []).push(tx);
      return acc;
    }, {})
  )
    .map(([name, items]) => ({ name, items, amount: items.reduce((s, tx) => s + tx.amount, 0) }))
    .sort((a, b) => b.amount - a.amount);

  const top = categories[0];
  const excludedTotal = excluidos.reduce((s, tx) => s + tx.amount, 0);

  return (
    <dialog
      ref={ref}
      className="modal"
      aria-labelledby="expenses-modal-title"
      onClose={onClose}
      onClick={(e) => {
        // Clic en el fondo (fuera de la caja) cierra.
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {period && (
        <div className="modal-box">
          <header className="modal-head">
            <div>
              <p className="modal-kicker">Expenses by category</p>
              <h2 id="expenses-modal-title">
                {weekRange(period)}
                {isCurrent && <span className="week-tag">current</span>}
              </h2>
            </div>
            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => exportPeriodToExcel(period)}
                disabled={movimientos.length + excluidos.length === 0}
              >
                <IconDownload />
                Export to Excel
              </button>
              <button type="button" className="icon-btn" aria-label="Close" onClick={onClose} autoFocus>
                <IconClose />
              </button>
            </div>
          </header>

          <div className="modal-body">
            <dl className="modal-stats">
              <div>
                <dt>Expenses</dt>
                <dd>{fmt(total)}</dd>
              </div>
              <div>
                <dt>Transactions</dt>
                <dd>{movimientos.length}</dd>
              </div>
              <div>
                <dt>Top category</dt>
                <dd className="modal-stat-text">{top ? top.name : "—"}</dd>
              </div>
            </dl>

            {categories.length === 0 ? (
              <p className="muted">No expenses in this period.</p>
            ) : (
              <ul className="cat-list">
                {categories.map((c, i) => {
                  const share = total > 0 ? c.amount / total : 0;
                  return (
                    <li key={c.name}>
                      <details className="cat" open={i === 0}>
                        <summary>
                          <span className="cat-name">{c.name}</span>
                          <span className="cat-count">
                            {c.items.length} {c.items.length === 1 ? "transaction" : "transactions"}
                          </span>
                          <span className="cat-bar" aria-hidden="true">
                            <span style={{ transform: `scaleX(${share})` }} />
                          </span>
                          <span className="cat-share">{Math.round(share * 100)}%</span>
                          <span className="cat-amount">{fmt(c.amount)}</span>
                        </summary>
                        <TxTable items={c.items} />
                      </details>
                    </li>
                  );
                })}
              </ul>
            )}

            {excluidos.length > 0 && (
              <details className="cat cat-excluded">
                <summary>
                  <span className="cat-name">Not counted as expenses</span>
                  <span className="cat-count">
                    Transfers between your accounts, card payments and excluded accounts (taxes, payroll, L Soto)
                  </span>
                  <span className="cat-amount">{fmt(excludedTotal)}</span>
                </summary>
                <TxTable items={excluidos} showReason />
              </details>
            )}
          </div>
        </div>
      )}
    </dialog>
  );
}
