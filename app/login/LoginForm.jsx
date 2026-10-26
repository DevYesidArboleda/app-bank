"use client";

import { useState } from "react";
import { BrandMark } from "@/components/panel/icons";

export default function LoginForm({ next }) {
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setBusy(true);
    setError(null);
    try {
      const r = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: form.get("username"), password: form.get("password") }),
      });
      if (r.ok) {
        // Navegación completa para que el proxy ya vea la cookie nueva
        window.location.assign(next);
        return;
      }
      const body = await r.json().catch(() => ({}));
      setError(body.error || "Couldn't sign in.");
    } catch {
      setError("No connection. Try again.");
    }
    setBusy(false);
  }

  return (
    <main className="login">
      <form className="login-card" onSubmit={onSubmit}>
        <div className="login-brand">
          <BrandMark className="brand-mark" />
          <span className="brand-name">
            Weekly Cash
            <span className="brand-sub">Jobber + Chase + Payroll</span>
          </span>
        </div>

        <h1>Sign in</h1>

        <label className="login-field">
          <span>Username</span>
          <input name="username" autoComplete="username" autoCapitalize="none" spellCheck="false" required autoFocus />
        </label>

        <label className="login-field">
          <span>Password</span>
          <input name="password" type="password" autoComplete="current-password" required />
        </label>

        {error && (
          <p className="login-error" role="alert">
            {error}
          </p>
        )}

        <button type="submit" className="btn btn-primary login-submit" disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </main>
  );
}
