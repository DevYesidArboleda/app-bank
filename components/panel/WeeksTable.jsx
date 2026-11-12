"use client";

import { useEffect, useRef, useState } from "react";
import { fmt, fmtSigned, weekRange } from "./format";
import { IconCheck, IconClose, IconPencil, IconPlus } from "./icons";

function PayrollCell({ week, isCurrent, onSave }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);
  const inputRef = useRef(null);
  const triggerRef = useRef(null);

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  function open(e) {
    e.stopPropagation();
    setValue(week.payroll ? String(week.payroll) : "");
    setEditing(true);
  }

  function close() {
    setEditing(false);
    requestAnimationFrame(() => triggerRef.current?.focus());
  }

  async function save() {
    const amount = parseFloat(value);
    if (Number.isNaN(amount) || amount < 0) {
      inputRef.current?.focus();
      return;
    }
    setSaving(true);
    const ok = await onSave(week, amount);
    setSaving(false);
    if (ok) close();
  }

  if (editing) {
    return (
      <form
        className="payroll-cell"
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <label className="money-input">
          <span>$</span>
          <input
            ref={inputRef}
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") close();
            }}
            aria-label={`Payroll for the week of ${weekRange(week)}`}
            disabled={saving}
          />
        </label>
        <button type="submit" className="icon-btn icon-btn-primary" aria-label="Save payroll" disabled={saving}>
          <IconCheck />
        </button>
        <button type="button" className="icon-btn" aria-label="Cancel" onClick={close} disabled={saving}>
          <IconClose />
        </button>
      </form>
    );
  }

  const empty = !week.payroll && !isCurrent;
  return (
    <button
      ref={triggerRef}
      type="button"
      className="payroll-trigger"
      data-empty={empty}
      onClick={open}
      aria-label={`${empty ? "Add" : "Edit"} payroll for the week of ${weekRange(week)}`}
    >
      {empty ? (
        <>
          <IconPlus size={14} />
          Add
        </>
      ) : (
        <>
          <IconPencil size={14} />
          {fmt(week.payroll)}
        </>
      )}
    </button>
  );
}

export default function WeeksTable({
  weeks,
  selected,
  onOpen,
  currentKey,
  onSavePayroll,
  periodLabel = "Week",
  editable = true,
}) {
  const rows = [...weeks].reverse();

  return (
    <>
      <div className="table-wrap">
        <table className="weeks">
          <caption className="sr-only">
            Result by {periodLabel.toLowerCase()}. Select a row to see its expenses by category
            {editable ? "; payroll is edited in its cell." : "."}
          </caption>
          <thead>
            <tr>
              <th scope="col">{periodLabel}</th>
              <th scope="col" className="col-ventas">Net sales</th>
              <th scope="col">Payroll</th>
              <th scope="col" className="col-gastos">Expenses</th>
              <th scope="col">Result</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((w) => {
              const isCurrent = w.weekStart === currentKey;
              const total = w.total || 0;
              return (
                <tr
                  key={w.weekStart}
                  aria-selected={selected === w.weekStart}
                  onClick={() => onOpen(w.weekStart)}
                >
                  <td>
                    <button
                      type="button"
                      className="week-name"
                      style={{ all: "unset", cursor: "pointer", fontWeight: 600 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpen(w.weekStart);
                      }}
                      aria-pressed={selected === w.weekStart}
                    >
                      {weekRange(w)}
                    </button>
                    {isCurrent && <span className="week-tag">current</span>}
                    <span className="week-sales">
                      {isCurrent ? "In progress · " : ""}
                      {fmt(w.ventasNeto)}
                    </span>
                  </td>
                  <td className="col-ventas">{fmt(w.ventasNeto)}</td>
                  <td>
                    {/* El payroll que viene de la hoja se corrige en la hoja, no aquí */}
                    {editable && w.payrollSource !== "sheet" ? (
                      <PayrollCell week={w} isCurrent={isCurrent} onSave={onSavePayroll} />
                    ) : (
                      fmt(w.payroll)
                    )}
                  </td>
                  <td className="col-gastos">{fmt(w.gastos)}</td>
                  {!w.ventasNeto && !w.payroll && !w.gastos ? (
                    <td className="muted" title="No activity">
                      —<span className="sr-only">No activity</span>
                    </td>
                  ) : (
                    <td className={`result ${total >= 0 ? "amount-pos" : "amount-neg"}`}>{fmtSigned(total)}</td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="table-foot">
        Net sales already exclude sales tax (6.625%). The result also subtracts a 10% fee on net sales. Expenses only count outflows to third parties: they exclude the
        tax account, transfers between your accounts and card payments. Weeks run Saturday to Friday, like the payroll
        sheet. Payroll comes from the Google Sheet (one tab per week); weeks without a tab can be entered manually.
      </p>
    </>
  );
}
