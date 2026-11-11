"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { EMPTY_CONFIG, reclassifyWeek } from "@/lib/categories";
import Accounts from "./Accounts";
import ExpensesModal from "./ExpensesModal";
import Forecast from "./Forecast";
import TideChart from "./TideChart";
import WeekDetail from "./WeekDetail";
import WeeksTable from "./WeeksTable";
import { GROUPINGS, fmtTime, groupWeeks, lastPeriodsText, todayKey, weekEndOf, weekRange } from "./format";
import { BrandMark, IconAlert, IconBank, IconRefresh, IconRows, IconTide } from "./icons";

async function getJSON(url) {
  try {
    const r = await fetch(url, { cache: "no-store" });
    // La sesión venció: de vuelta al login
    if (r.status === 401) {
      window.location.assign("/login");
      return { error: "Not signed in" };
    }
    const body = await r.json().catch(() => ({}));
    return r.ok ? body : { error: body.error || `Error ${r.status}` };
  } catch {
    return { error: "No connection" };
  }
}

const SOURCE_COPY = {
  ok: "Connected",
  error: "Not responding",
  loading: "Checking…",
};

function Sources({ sources, loading }) {
  const state = (k) => (loading ? "loading" : sources?.[k] || "error");
  const items = [
    { key: "jobber", name: "Jobber", what: "Sales" },
    { key: "simplefin", name: "Chase · SimpleFIN", what: "Expenses and balances" },
    { key: "payroll", name: "Payroll · Google Sheets", what: "Weekly payroll" },
  ];
  return (
    <div className="rail-sources">
      <p className="rail-heading">Sources</p>
      <ul className="sources">
        {items.map((s) => {
          const st = state(s.key);
          return (
            <li key={s.key} className="source" data-state={st}>
              <span className="source-dot" aria-hidden="true" />
              <span className="source-name">{s.name}</span>
              <span className="source-note">
                {s.what} · {SOURCE_COPY[st]}
                {st === "error" && s.key === "jobber" && (
                  <>
                    {" · "}
                    <a href="/api/jobber/auth">Reconnect</a>
                  </>
                )}
              </span>
            </li>
          );
        })}
        <li className="source" data-state="pending">
          <span className="source-dot" aria-hidden="true" />
          <span className="source-name">Paychex</span>
          <span className="source-note">Pending</span>
        </li>
      </ul>
    </div>
  );
}

export default function CashPanel() {
  const [grouping, setGrouping] = useState("semana");
  const [range, setRange] = useState(GROUPINGS.semana.defaultRange);
  const [summary, setSummary] = useState(null);
  const [forecast, setForecast] = useState(null);
  const [accounts, setAccounts] = useState(null);
  const [loading, setLoading] = useState({ summary: true, forecast: true, accounts: true });
  const [selected, setSelected] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [updatedAt, setUpdatedAt] = useState(null);
  const [toast, setToast] = useState(null);
  const [section, setSection] = useState("summary");
  const [categoryConfig, setCategoryConfig] = useState(EMPTY_CONFIG);

  // Los cargadores solo escriben estado al terminar; quien los dispara marca el loading.
  const loadSummary = useCallback(async (weeks) => {
    const data = await getJSON(`/api/summary/weekly?weeks=${weeks}`);
    setSummary(data);
    setLoading((l) => ({ ...l, summary: false }));
    setUpdatedAt(new Date());
  }, []);

  const loadForecast = useCallback(async () => {
    setForecast(await getJSON("/api/forecast/next-week"));
    setLoading((l) => ({ ...l, forecast: false }));
  }, []);

  const loadAccounts = useCallback(async () => {
    setAccounts(await getJSON("/api/simplefin/accounts"));
    setLoading((l) => ({ ...l, accounts: false }));
  }, []);

  const refreshAll = useCallback(() => {
    setLoading({ summary: true, forecast: true, accounts: true });
    loadSummary(range * GROUPINGS[grouping].size);
    loadForecast();
    loadAccounts();
  }, [range, grouping, loadSummary, loadForecast, loadAccounts]);

  // Carga inicial: las tres fuentes en paralelo, cada una con su propio estado.
  useEffect(() => {
    let alive = true;
    getJSON("/api/summary/weekly?weeks=8").then((data) => {
      if (!alive) return;
      setSummary(data);
      setUpdatedAt(new Date());
      setLoading((l) => ({ ...l, summary: false }));
    });
    getJSON("/api/forecast/next-week").then((data) => {
      if (!alive) return;
      setForecast(data);
      setLoading((l) => ({ ...l, forecast: false }));
    });
    getJSON("/api/simplefin/accounts").then((data) => {
      if (!alive) return;
      setAccounts(data);
      setLoading((l) => ({ ...l, accounts: false }));
    });
    getJSON("/api/expenses/categorization").then((data) => {
      if (alive && !data.error) setCategoryConfig(data);
    });
    return () => {
      alive = false;
    };
  }, []);

  // Clic sobre una semana (gráfica o tabla): la selecciona y abre sus gastos.
  function openPeriod(key) {
    setSelected(key);
    setDetailOpen(true);
  }

  function changeRange(n) {
    if (n === range) return;
    setRange(n);
    setLoading((l) => ({ ...l, summary: true }));
    loadSummary(n * GROUPINGS[grouping].size);
  }

  function changeGrouping(g) {
    if (g === grouping) return;
    const n = GROUPINGS[g].defaultRange;
    setGrouping(g);
    setRange(n);
    setSelected(null);
    setLoading((l) => ({ ...l, summary: true }));
    loadSummary(n * GROUPINGS[g].size);
  }

  function retryAccounts() {
    setLoading((l) => ({ ...l, accounts: true }));
    loadAccounts();
  }

  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("jobber") === "connected") {
      Promise.resolve().then(() => setToast({ tone: "ok", text: "Jobber is now connected." }));
      url.searchParams.delete("jobber");
      window.history.replaceState(null, "", url.pathname + url.hash);
    }
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  const group = GROUPINGS[grouping];
  const isWeekly = group.size === 1;

  const weeks = useMemo(() => {
    const list = summary?.summary || [];
    // Solo semanas con fecha de cierre real; los payroll guardados con un inicio
    // que ya no coincide con ninguna ventana quedan fuera de la vista.
    return list.filter((w) => w.weekEnd).slice(-range * group.size);
  }, [summary, range, group.size]);

  // Lo que se ve en gráfica, tabla y desglose: semanas, quincenas o meses.
  const periods = useMemo(() => groupWeeks(weeks, group.size), [weeks, group.size]);

  const today = todayKey();
  const findCurrent = (list) => list.find((w) => weekEndOf(w) >= today)?.weekStart ?? null;
  const currentKey = findCurrent(weeks);
  const currentPeriodKey = findCurrent(periods);

  const completed = weeks.filter((w) => w.weekStart !== currentKey);
  const lastComplete = completed[completed.length - 1];
  const completedPeriods = periods.filter((p) => p.weekStart !== currentPeriodKey);
  const lastCompletePeriod = completedPeriods[completedPeriods.length - 1];

  const effectiveSelected =
    selected && periods.some((p) => p.weekStart === selected)
      ? selected
      : lastCompletePeriod?.weekStart ?? periods[periods.length - 1]?.weekStart;
  const selectedPeriod = periods.find((p) => p.weekStart === effectiveSelected);

  const missingPayroll = completed.slice(-4).filter((w) => !w.payroll).length;

  const balance =
    accounts && !accounts.error && accounts.accounts?.length
      ? accounts.accounts.reduce((s, a) => s + (Number(a.balance) || 0), 0)
      : null;

  const busy = loading.summary || loading.forecast || loading.accounts;

  async function savePayroll(week, amount) {
    try {
      const r = await fetch("/api/payroll/weekly", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weekStart: week.weekStart, amount }),
      });
      if (!r.ok) throw new Error();
    } catch {
      setToast({ tone: "error", text: "Couldn't save payroll. Please try again." });
      return false;
    }
    // Actualización optimista y luego recarga de resumen y predicción.
    setSummary((s) =>
      s?.summary
        ? {
            ...s,
            summary: s.summary.map((w) =>
              w.weekStart === week.weekStart
                ? { ...w, payroll: amount, total: Math.round((w.ventasNeto - amount - w.gastos) * 100) / 100 }
                : w
            ),
          }
        : s
    );
    setSelected(week.weekStart);
    setToast({ tone: "ok", text: `Payroll saved for ${weekRange(week)}.` });
    loadSummary(range * group.size);
    loadForecast();
    return true;
  }

  // Guarda un cambio de categorías y reclasifica lo ya cargado: el total no
  // cambia y así no se vuelve a consultar SimpleFIN ni Jobber por cada cambio.
  // Devuelve true, o el motivo si el servidor lo rechazó (ej. nombre repetido).
  async function changeCategorization(method, body) {
    let next;
    try {
      const r = await fetch("/api/expenses/categorization", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      next = await r.json().catch(() => ({}));
      if (!r.ok) return r.status === 400 && next.error ? next.error : false;
    } catch {
      return false;
    }
    setCategoryConfig(next);
    setSummary((s) => (s?.summary ? { ...s, summary: s.summary.map((w) => reclassifyWeek(w, next)) } : s));
    return true;
  }

  const summaryError = summary?.error;
  const noData = !loading.summary && !summaryError && periods.length === 0;

  const nav = [
    { id: "summary", label: "Summary", Icon: IconTide },
    { id: "weeks", label: "Weeks", Icon: IconRows },
    { id: "accounts", label: "Accounts", Icon: IconBank },
  ];

  return (
    <div className="shell">
      <aside className="rail">
        <a className="brand" href="#summary" onClick={() => setSection("summary")}>
          <BrandMark className="brand-mark" />
          <span className="brand-name">
            Weekly Cash
            <span className="brand-sub">Jobber + Chase + Payroll</span>
          </span>
        </a>

        <nav className="rail-nav" aria-label="Dashboard sections">
          {nav.map(({ id, label, Icon }) => (
            <a
              key={id}
              className="rail-link"
              href={`#${id}`}
              aria-current={section === id}
              onClick={() => setSection(id)}
            >
              <Icon />
              <span>{label}</span>
            </a>
          ))}
        </nav>

        <Sources sources={summary?.sources} loading={loading.summary} />

        <p className="rail-foot">
          7-day weeks ending today; a fortnight groups 2 weeks and a month groups 4. Amounts in USD.
        </p>

        <button
          type="button"
          className="btn btn-sm rail-logout"
          onClick={async () => {
            await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
            window.location.assign("/login");
          }}
        >
          Sign out
        </button>
      </aside>

      <main className="main">
        <header className="topbar" id="summary">
          <div>
            <h1>{currentKey ? `Current week: ${weekRange(weeks.find((w) => w.weekStart === currentKey))}` : "Weekly Cash"}</h1>
            <p className="topbar-sub">How much cash you need next week and how each week closed.</p>
          </div>
          <div className="toolbar">
            <div className="segmented" role="group" aria-label="Group by">
              {Object.entries(GROUPINGS).map(([id, g]) => (
                <button key={id} type="button" aria-pressed={grouping === id} onClick={() => changeGrouping(id)}>
                  {g.label}
                </button>
              ))}
            </div>
            <div className="segmented" role="group" aria-label={`Number of ${group.plural} to show`}>
              {group.ranges.map((n) => (
                <button key={n} type="button" aria-pressed={range === n} onClick={() => changeRange(n)}>
                  {n} {n === 1 ? group.label.toLowerCase() : group.plural}
                </button>
              ))}
            </div>
            <button type="button" className="btn" onClick={refreshAll} disabled={busy} data-busy={busy}>
              <IconRefresh />
              {busy ? "Refreshing…" : "Refresh"}
            </button>
            {updatedAt && (
              <span className="updated" aria-live="polite">
                Updated at {fmtTime(updatedAt)}
              </span>
            )}
          </div>
        </header>

        <section className="grid forecast-row" aria-label="Forecast and trend">
          <div className="pane span-4">
            <Forecast
              forecast={forecast}
              loading={loading.forecast}
              balance={loading.accounts ? undefined : balance}
              missingPayroll={missingPayroll}
              lastClosed={lastComplete}
              currentWeek={weeks.find((w) => w.weekStart === currentKey)}
              onRetryAccounts={retryAccounts}
            />
          </div>
          <div className="pane span-8">
            <div className="pane-head">
              <h2>
                Tide {lastPeriodsText(group, range)}
              </h2>
              <ul className="legend">
                <li style={{ color: "var(--ink)" }}>
                  <span className="legend-line" />
                  <span style={{ color: "var(--ink-2)" }}>Net sales</span>
                </li>
                <li style={{ color: "var(--salidas)" }}>
                  <span className="legend-line" />
                  <span style={{ color: "var(--ink-2)" }}>Payroll + expenses</span>
                </li>
                {isWeekly && forecast?.estimatedNeeded > 0 && (
                <li style={{ color: "var(--magenta)" }}>
                  <span className="legend-line" data-dashed="true" />
                  <span style={{ color: "var(--ink-2)" }}>Forecast</span>
                </li>
                )}
              </ul>
            </div>
            {loading.summary && !summary ? (
              <div className="skeleton" style={{ height: 280 }} aria-busy="true" />
            ) : summaryError ? (
              <div className="state" data-tone="error" role="alert">
                <IconAlert />
                <div>
                  <strong>Couldn’t build the weekly summary</strong>
                  {summaryError}. Check the sources in the sidebar.
                  <div>
                    <button type="button" className="btn btn-sm" onClick={() => {
                        setLoading((l) => ({ ...l, summary: true }));
                        loadSummary(range * group.size);
                      }}>
                      Retry
                    </button>
                  </div>
                </div>
              </div>
            ) : noData ? (
              <div className="state">
                <IconAlert />
                <div>
                  <strong>No weeks to show</strong>
                  Neither Jobber nor the bank returned activity in this range. Connect Jobber or widen the range.
                </div>
              </div>
            ) : (
              <TideChart
                weeks={periods}
                forecast={isWeekly ? forecast : null}
                selected={effectiveSelected}
                onSelect={setSelected}
                onOpen={openPeriod}
                currentKey={currentPeriodKey}
                periodLabel={group.label}
              />
            )}
          </div>
        </section>

        <section className="grid" aria-label="Weekly detail">
          <div className="pane span-7" id="weeks">
            <div className="pane-head">
              <h2>{group.plural[0].toUpperCase() + group.plural.slice(1)}</h2>
              <span className="pane-note">
                {isWeekly ? "Click payroll to edit it" : "Payroll is edited in the weekly view"}
              </span>
            </div>
            {loading.summary && !summary ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }} aria-busy="true">
                {Array.from({ length: 6 }, (_, i) => (
                  <div key={i} className="skeleton" style={{ height: 32 }} />
                ))}
              </div>
            ) : periods.length > 0 ? (
              <WeeksTable
                weeks={periods}
                selected={effectiveSelected}
                onOpen={openPeriod}
                currentKey={currentPeriodKey}
                periodLabel={group.label}
                editable={isWeekly}
                onSavePayroll={savePayroll}
              />
            ) : (
              <p className="muted">No weeks with data yet.</p>
            )}
          </div>
          <div className="stack span-5">
            <div className="pane">
              {loading.summary && !summary ? (
                <div className="skeleton" style={{ height: 210 }} />
              ) : (
                <WeekDetail
                  week={selectedPeriod}
                  isCurrent={selectedPeriod?.weekStart === currentPeriodKey}
                  onOpen={() => setDetailOpen(true)}
                />
              )}
            </div>
            <div className="pane" id="accounts">
              <div className="pane-head">
                <h2>Bank balances</h2>
                <span className="pane-note">SimpleFIN</span>
              </div>
              <Accounts data={accounts} loading={loading.accounts} onRetry={retryAccounts} />
            </div>
          </div>
        </section>
      </main>

      <ExpensesModal
        period={selectedPeriod}
        isCurrent={selectedPeriod?.weekStart === currentPeriodKey}
        open={detailOpen && Boolean(selectedPeriod)}
        onClose={() => setDetailOpen(false)}
        categoryConfig={categoryConfig}
        onSaveCategory={(body) => changeCategorization("POST", body)}
        onRemoveCategory={(body) => changeCategorization("DELETE", body)}
        onEditCategories={(body) => changeCategorization("PATCH", body)}
      />

      {toast && (
        <div className="toast" data-tone={toast.tone} role="status">
          {toast.text}
        </div>
      )}
    </div>
  );
}
