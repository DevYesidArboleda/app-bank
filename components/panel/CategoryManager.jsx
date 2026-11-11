"use client";

import { useState } from "react";
import { getCategories, getFallback, listCategories } from "@/lib/categories";

// Las palabras clave se escriben separadas por coma o una por línea.
const parseKeywords = (text) => text.split(/[,\n]/).map((k) => k.trim()).filter(Boolean);

function CategoryForm({ name, keywords, isFallback, others, fallback, onChange, onDone }) {
  const [newName, setNewName] = useState(name);
  const [keywordText, setKeywordText] = useState(keywords.join(", "));
  const [moveTo, setMoveTo] = useState(fallback);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function run(steps) {
    setSaving(true);
    setError("");
    for (const body of steps) {
      const result = await onChange(body);
      if (result !== true) {
        setSaving(false);
        setError(result || "Couldn't save the change. Please try again.");
        return;
      }
    }
    onDone();
  }

  function save(e) {
    e.preventDefault();
    const steps = [];
    const next = newName.trim();
    // Las palabras primero: el cambio de nombre se las lleva consigo.
    if (!isFallback && keywordText !== keywords.join(", ")) {
      steps.push({ action: "keywords", name, keywords: parseKeywords(keywordText) });
    }
    if (next && next !== name) steps.push({ action: "rename", from: name, to: next });
    if (steps.length === 0) return onDone();
    run(steps);
  }

  return (
    <form className="cat-editor" onSubmit={save}>
      <label className="cat-field">
        <span>Name</span>
        <input value={newName} maxLength={40} onChange={(e) => setNewName(e.target.value)} autoFocus />
      </label>
      {isFallback ? (
        <p className="cat-editor-note">
          Transactions that match no other category land here, so it has no keywords and can&apos;t be deleted.
        </p>
      ) : (
        <label className="cat-field">
          <span>Keywords: a transaction goes here when its description contains one of these words. Separate them with commas.</span>
          <textarea value={keywordText} rows={3} onChange={(e) => setKeywordText(e.target.value)} />
        </label>
      )}
      {error && (
        <p className="cat-editor-error" role="alert">
          {error}
        </p>
      )}
      <div className="cat-editor-actions">
        <button type="submit" className="btn btn-sm btn-primary" disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </button>
        <button type="button" className="btn btn-sm" onClick={onDone} disabled={saving}>
          Cancel
        </button>
      </div>

      {!isFallback && (
        <div className="cat-delete">
          {confirmDelete ? (
            <>
              <label className="cat-field">
                <span>Move its transactions, rules and keywords to</span>
                <select value={moveTo} onChange={(e) => setMoveTo(e.target.value)}>
                  {others.map((other) => (
                    <option key={other} value={other}>
                      {other}
                    </option>
                  ))}
                </select>
              </label>
              <div className="cat-editor-actions">
                <button
                  type="button"
                  className="btn btn-sm btn-danger"
                  disabled={saving}
                  onClick={() => run([{ action: "delete", name, moveTo }])}
                >
                  Delete {name}
                </button>
                <button type="button" className="btn btn-sm" onClick={() => setConfirmDelete(false)} disabled={saving}>
                  Keep it
                </button>
              </div>
            </>
          ) : (
            <button type="button" className="link-btn link-danger" onClick={() => setConfirmDelete(true)}>
              Delete this category
            </button>
          )}
        </div>
      )}
    </form>
  );
}

function NewCategory({ onChange }) {
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError("");
    const result = await onChange({ action: "create", name });
    setSaving(false);
    if (result === true) setName("");
    else setError(result || "Couldn't create it. Please try again.");
  }

  return (
    <form className="cat-new" onSubmit={submit}>
      <label className="cat-field">
        <span>New category</span>
        <input value={name} maxLength={40} onChange={(e) => setName(e.target.value)} placeholder="e.g. Office" />
      </label>
      <button type="submit" className="btn btn-sm" disabled={saving || !name.trim()}>
        {saving ? "Adding…" : "Add"}
      </button>
      {error && (
        <p className="cat-editor-error" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}

// Todas las categorías, también las que trae el app: renombrar, borrar,
// cambiar sus palabras clave y crear nuevas.
export default function CategoryManager({ config, onChange }) {
  const [editing, setEditing] = useState(null);
  const fallback = getFallback(config);
  const keywordsOf = Object.fromEntries(getCategories(config).map((c) => [c.name, c.keywords]));
  const names = listCategories(config);

  return (
    <details className="cat cat-excluded">
      <summary>
        <span className="cat-name">Manage categories</span>
        <span className="cat-count">Rename, delete or create categories and choose the words that send transactions to each one</span>
        <span className="cat-amount">{names.length}</span>
      </summary>
      <NewCategory onChange={onChange} />
      <ul className="rule-list">
        {names.map((name) => {
          const keywords = keywordsOf[name] || [];
          const isFallback = name === fallback;
          return (
            <li key={name} className={editing === name ? "is-editing" : undefined}>
              {editing === name ? (
                <CategoryForm
                  name={name}
                  keywords={keywords}
                  isFallback={isFallback}
                  fallback={fallback}
                  others={names.filter((other) => other !== name)}
                  onChange={onChange}
                  onDone={() => setEditing(null)}
                />
              ) : (
                <>
                  <span className="rule-text">
                    <strong>{name}</strong>
                    <span className="cat-keywords">
                      {isFallback
                        ? "Everything that matches no other category"
                        : keywords.length
                          ? keywords.join(", ")
                          : "No keywords yet"}
                    </span>
                  </span>
                  <button type="button" className="link-btn" onClick={() => setEditing(name)}>
                    Edit
                  </button>
                </>
              )}
            </li>
          );
        })}
      </ul>
    </details>
  );
}
