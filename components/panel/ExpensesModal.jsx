"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import CategoryEditor from "./CategoryEditor";
import CategoryManager from "./CategoryManager";
import { fmt, fmtDay, weekRange } from "./format";
import { exportPeriodToExcel } from "./exportExpenses";
import { IconClose, IconDownload } from "./icons";

const REASON_COPY = {
  transfer: "Transfer",
  account: "Excluded account",
};

function TxTable({ items, showReason, editor }) {
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
          <Fragment key={tx.id ?? `${tx.date}-${tx.description}-${tx.amount}`}>
            <tr>
              <td className="tx-date">{fmtDay(tx.date)}</td>
              <td className="tx-desc">
                <span className="tx-name">{tx.description || "No description"}</span>
                <span className="tx-meta">
                  {tx.account}
                  {showReason && ` · ${REASON_COPY[tx.reason] || "Not counted"}`}
                  {editor && (
                    <>
                      {" · "}
                      <button
                        type="button"
                        className="link-btn"
                        aria-expanded={editor.editingId === tx.id}
                        onClick={() => editor.setEditingId(editor.editingId === tx.id ? null : tx.id)}
                      >
                        Change category
                      </button>
                    </>
                  )}
                </span>
              </td>
              <td className="tx-amount">{fmt(tx.amount)}</td>
            </tr>
            {editor?.editingId === tx.id && (
              <tr>
                <td colSpan={3} className="tx-editor">
                  <CategoryEditor
                    tx={tx}
                    config={editor.config}
                    periodTransactions={editor.periodTransactions}
                    onSave={editor.save}
                    onCancel={() => editor.setEditingId(null)}
                  />
                </td>
              </tr>
            )}
          </Fragment>
        ))}
      </tbody>
    </table>
  );
}

// Reglas y cambios guardados, para poder deshacerlos.
function SavedRules({ config, onRemove }) {
  const [failed, setFailed] = useState(false);
  const overrides = Object.entries(config.overrides);
  const count = config.rules.length + overrides.length;
  if (count === 0) return null;

  async function remove(body) {
    setFailed((await onRemove(body)) !== true);
  }

  return (
    <details className="cat cat-excluded">
      <summary>
        <span className="cat-name">Your category rules</span>
        <span className="cat-count">Removing one returns its transactions to the automatic category</span>
        <span className="cat-amount">{count}</span>
      </summary>
      {failed && (
        <p className="cat-editor-error rule-error" role="alert">
          Couldn&apos;t remove it. Please try again.
        </p>
      )}
      <ul className="rule-list">
        {config.rules.map((rule) => (
          <li key={rule.pattern}>
            <span className="rule-text">
              Contains <strong>{rule.pattern}</strong> → {rule.category}
            </span>
            <button type="button" className="link-btn" onClick={() => remove({ pattern: rule.pattern })}>
              Remove
            </button>
          </li>
        ))}
        {overrides.map(([txId, override]) => (
          <li key={txId}>
            <span className="rule-text">
              Only <strong>{override.description || "this transaction"}</strong> → {override.category}
            </span>
            <button type="button" className="link-btn" onClick={() => remove({ txId })}>
              Remove
            </button>
          </li>
        ))}
      </ul>
    </details>
  );
}

// Todo el gasto del período, agrupado por categoría y con cada movimiento.
export default function ExpensesModal({
  period,
  isCurrent,
  open,
  onClose,
  categoryConfig,
  onSaveCategory,
  onRemoveCategory,
  onEditCategories,
}) {
  const ref = useRef(null);
  const [editingId, setEditingId] = useState(null);

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

  const editor = {
    editingId,
    setEditingId,
    config: categoryConfig,
    periodTransactions: movimientos,
    save: async (payload) => {
      const saved = (await onSaveCategory(payload)) === true;
      if (saved) setEditingId(null);
      return saved;
    },
  };

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
                        <TxTable items={c.items} editor={editor} />
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

            <CategoryManager config={categoryConfig} onChange={onEditCategories} />
            <SavedRules config={categoryConfig} onRemove={onRemoveCategory} />
          </div>
        </div>
      )}
    </dialog>
  );
}
