"use client";

import { useState } from "react";
import { isValidPattern, listCategories, matchesPattern, suggestPattern } from "@/lib/categories";

const NEW_CATEGORY = "__new__";

// Cambia la categoría de una transacción: de todas las parecidas (regla que se
// guarda y se aplica a las pasadas y a las futuras) o solo de esa.
export default function CategoryEditor({ tx, config, periodTransactions, onSave, onCancel }) {
  const suggested = suggestPattern(tx.description);
  const [choice, setChoice] = useState(tx.category);
  const [newName, setNewName] = useState("");
  const [scope, setScope] = useState(suggested ? "all" : "one");
  const [pattern, setPattern] = useState(suggested);
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);

  const category = choice === NEW_CATEGORY ? newName.trim() : choice;
  const patternOk = isValidPattern(pattern);
  const matches = patternOk ? periodTransactions.filter((t) => matchesPattern(t.text, pattern)).length : 0;
  // Una regla que no incluye su propia transacción parecería no hacer nada.
  const matchesThisOne = patternOk && matchesPattern(tx.text, pattern);
  const canSave = Boolean(category) && (scope === "one" || matchesThisOne) && !saving;

  async function submit(e) {
    e.preventDefault();
    if (!canSave) return;
    setSaving(true);
    setFailed(false);
    const payload =
      scope === "all"
        ? { category, pattern, txId: tx.id }
        : { category, txId: tx.id, description: tx.description };
    // Si se guarda, la fila se mueve de categoría y este editor se cierra.
    if ((await onSave(payload)) !== true) {
      setSaving(false);
      setFailed(true);
    }
  }

  return (
    <form className="cat-editor" onSubmit={submit}>
      <div className="cat-editor-row">
        <label className="cat-field">
          <span>Category</span>
          <select value={choice} onChange={(e) => setChoice(e.target.value)} autoFocus>
            {listCategories(config).map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
            <option value={NEW_CATEGORY}>New category…</option>
          </select>
        </label>
        {choice === NEW_CATEGORY && (
          <label className="cat-field">
            <span>New category name</span>
            <input value={newName} maxLength={40} onChange={(e) => setNewName(e.target.value)} autoFocus />
          </label>
        )}
      </div>

      <fieldset className="cat-scope">
        <legend className="sr-only">Apply to</legend>
        <label>
          <input type="radio" name="scope" checked={scope === "all"} onChange={() => setScope("all")} />
          All transactions containing
        </label>
        <input
          className="cat-pattern"
          aria-label="Text to look for in the transaction description"
          value={pattern}
          disabled={scope !== "all"}
          onChange={(e) => setPattern(e.target.value)}
        />
        <label>
          <input type="radio" name="scope" checked={scope === "one"} onChange={() => setScope("one")} />
          Only this transaction
        </label>
      </fieldset>

      {scope === "all" && (
        <p className="cat-editor-note">
          {!patternOk
            ? "Enter at least 3 letters or numbers."
            : !matchesThisOne
              ? "This text isn't in this transaction's description. Use whole words from it."
              : `Matches ${matches} ${matches === 1 ? "transaction" : "transactions"} in this period. Also applies to past and future ones.`}
        </p>
      )}
      {failed && (
        <p className="cat-editor-error" role="alert">
          Couldn&apos;t save the category. Please try again.
        </p>
      )}

      <div className="cat-editor-actions">
        <button type="submit" className="btn btn-sm btn-primary" disabled={!canSave}>
          {saving ? "Saving…" : "Save"}
        </button>
        <button type="button" className="btn btn-sm" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}
