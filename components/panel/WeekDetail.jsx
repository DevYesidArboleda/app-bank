import { FEE_RATE } from "@/lib/result";
import { fmt, fmtSigned, weekRange } from "./format";

// Barras de longitud exacta: todas comparten una sola escala (las ventas brutas),
// así cada monto se lee como medida, no como adorno.
function Row({ label, value, scale, color, signed, total }) {
  const pct = scale > 0 ? Math.min(Math.abs(value) / scale, 1) * 100 : 0;
  return (
    <div className={`measure-row${total ? " is-total" : ""}`}>
      <dt>{label}</dt>
      <div className="measure-bar" aria-hidden="true">
        <span style={{ transform: `scaleX(${pct / 100})`, background: color }} />
      </div>
      <dd className={signed ? (value >= 0 ? "amount-pos" : "amount-neg") : undefined}>
        {signed ? fmtSigned(value) : fmt(value)}
      </dd>
    </div>
  );
}

// En qué se fue el gasto del período, de mayor a menor, en su propia escala.
function Categories({ categories, total, transfers, onOpen }) {
  const rows = Object.entries(categories || {})
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1]);
  const max = rows[0]?.[1] || 0;

  return (
    <div className="categories">
      <div className="pane-head" style={{ marginBottom: 10 }}>
        <h3 className="categories-title">Expenses by category</h3>
        {total > 0 && <span className="pane-note">{fmt(total)}</span>}
      </div>
      {rows.length === 0 ? (
        <p className="muted" style={{ margin: 0 }}>No expenses in this period.</p>
      ) : (
        <dl className="measure measure-cats" style={{ margin: 0 }}>
          {rows.map(([name, value]) => (
            <div key={name} className="measure-row" title={`${Math.round((value / total) * 100)}% of expenses`}>
              <dt>{name}</dt>
              <div className="measure-bar" aria-hidden="true">
                <span style={{ transform: `scaleX(${max > 0 ? value / max : 0})`, background: "rgba(61,143,179,0.5)" }} />
              </div>
              <dd>{fmt(value)}</dd>
            </div>
          ))}
        </dl>
      )}
      {total > 0 && onOpen && (
        <button type="button" className="btn btn-sm" style={{ marginTop: 12 }} onClick={onOpen}>
          View every transaction
        </button>
      )}
      {transfers > 0 && (
        <p className="categories-note">
          {fmt(transfers)} in transfers between your accounts and card payments is not counted.
        </p>
      )}
    </div>
  );
}

export default function WeekDetail({ week, isCurrent, onOpen }) {
  if (!week) {
    return <p className="muted">Select a period in the chart or the table.</p>;
  }

  const scale = Math.max(week.ventasBruto || 0, (week.comision || 0) + (week.payroll || 0) + (week.gastos || 0), Math.abs(week.total || 0), 1);

  return (
    <>
      <div className="pane-head">
        <h2>
          {weekRange(week)}
          {isCurrent && <span className="week-tag">current</span>}
        </h2>
        <span className="pane-note">Breakdown</span>
      </div>
      <dl className="measure" style={{ margin: 0 }}>
        <Row label="Gross sales" value={week.ventasBruto || 0} scale={scale} color="#14202b" />
        <Row label="Taxes" value={week.impuestos || 0} scale={scale} color="#9aa3ab" />
        <Row label="Net sales" value={week.ventasNeto || 0} scale={scale} color="#14202b" />
        <Row label={`Fee (${FEE_RATE * 100}% of net sales)`} value={week.comision || 0} scale={scale} color="#9aa3ab" />
        <Row
          label="Net sales after fee"
          value={Math.round(((week.ventasNeto || 0) - (week.comision || 0)) * 100) / 100}
          scale={scale}
          color="#14202b"
        />
        <div className="measure-divider" />
        <Row label="Payroll" value={week.payroll || 0} scale={scale} color="var(--salidas)" />
        <Row label="Expenses" value={week.gastos || 0} scale={scale} color="rgba(61,143,179,0.5)" />
        <div className="measure-divider" />
        <Row
          label="Result"
          value={week.total || 0}
          scale={scale}
          color={(week.total || 0) >= 0 ? "var(--surplus)" : "var(--deficit)"}
          signed
          total
        />
      </dl>
      <div className="measure-divider" style={{ margin: "18px 0 14px" }} />
      <Categories categories={week.gastosCategorias} total={week.gastos || 0} transfers={week.transferencias || 0} onOpen={onOpen} />
    </>
  );
}
