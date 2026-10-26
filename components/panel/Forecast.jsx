import { fmt } from "./format";
import { IconAlert, IconCheck, IconInfo } from "./icons";

function Amount({ value }) {
  const [whole, cents] = fmt(value).split(".");
  return (
    <p className="forecast-amount">
      {whole}
      <span className="cents">.{cents}</span>
    </p>
  );
}

export default function Forecast({
  forecast,
  loading,
  balance,
  missingPayroll,
  lastClosed,
  currentWeek,
  onRetryAccounts,
}) {
  const hasBalanceData = typeof balance === "number";
  if (loading) {
    return (
      <div className="forecast" aria-busy="true">
        <p className="forecast-label">Cash needed next week</p>
        <div className="skeleton" style={{ height: 44, width: "78%" }} />
        <div className="skeleton" style={{ height: 14, width: "62%" }} />
        <div className="skeleton" style={{ height: 86 }} />
      </div>
    );
  }

  if (!forecast || forecast.error) {
    return (
      <div className="forecast">
        <p className="forecast-label">Cash needed next week</p>
        <div className="state">
          <IconInfo />
          <div>
            <strong>No forecast yet</strong>
            {forecast?.error === "Not enough history to forecast"
              ? "At least one full week of data is needed to calculate the average."
              : "Couldn't calculate the recent weekly average. Try Refresh."}
          </div>
        </div>
      </div>
    );
  }

  const need = forecast.estimatedNeeded || 0;

  // Sin payroll ni gastos registrados, $0 no es una predicción: es falta de datos.
  if (need === 0) {
    const openFirstEmptyPayroll = () => {
      const btn = document.querySelector('.payroll-trigger[data-empty="true"]');
      btn?.scrollIntoView({ behavior: "smooth", block: "center" });
      btn?.click();
    };
    return (
      <div className="forecast">
        <p className="forecast-label">Cash needed next week</p>
        <div className="state">
          <IconInfo />
          <div>
            <strong>Not enough outflows to forecast</strong>
            The last {forecast.basedOnWeeks} weeks have no payroll or expenses recorded, so the average
            would be $0.
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              <button type="button" className="btn btn-sm btn-primary" onClick={openFirstEmptyPayroll}>
                Enter payroll
              </button>
              {!hasBalanceData && onRetryAccounts && (
                <button type="button" className="btn btn-sm" onClick={onRetryAccounts}>
                  Retry bank
                </button>
              )}
            </div>
          </div>
        </div>
        <div>
          <p className="forecast-label" style={{ marginBottom: 6 }}>
            What we know so far
          </p>
          <dl className="known">
            {currentWeek && (
              <>
                <dt>Net sales this week so far</dt>
                <dd>{fmt(currentWeek.ventasNeto)}</dd>
              </>
            )}
            {lastClosed && (
              <>
                <dt>Net sales last closed week</dt>
                <dd>{fmt(lastClosed.ventasNeto)}</dd>
                <dt>Outflows recorded that week</dt>
                <dd>{fmt((lastClosed.payroll || 0) + (lastClosed.gastos || 0))}</dd>
              </>
            )}
          </dl>
        </div>
      </div>
    );
  }
  const hasBalance = typeof balance === "number";
  const slack = hasBalance ? balance - need : null;
  const ratio = hasBalance && balance > 0 ? Math.min(need / balance, 1) : 1;

  return (
    <div className="forecast">
      <div>
        <p className="forecast-label">Cash needed next week</p>
        <Amount value={need} />
        <p className="forecast-basis">
          In-house forecast: average of the last {forecast.basedOnWeeks}{" "}
          {forecast.basedOnWeeks === 1 ? "full week" : "full weeks"}. Not from Jobber,
          Chase or Paychex.
        </p>
      </div>

      <dl className="terms">
        <dt>
          <span className="swatch" style={{ background: "var(--salidas)" }} />
          Estimated payroll
        </dt>
        <dd>{fmt(forecast.avgPayroll)}</dd>
        <dt>
          <span className="swatch" style={{ background: "var(--salidas)", opacity: 0.45 }} />
          Estimated expenses
        </dt>
        <dd>{fmt(forecast.avgGastos)}</dd>
        <div className="total" style={{ display: "contents" }}>
          <dt>Total</dt>
          <dd>{fmt(need)}</dd>
        </div>
      </dl>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {hasBalance && (
          <div className="capacity" data-over={slack < 0}>
            <div
              className="capacity-track"
              role="img"
              aria-label={`Need is ${Math.round((need / Math.max(balance, 1)) * 100)}% of the account balance`}
            >
              <div className="capacity-fill" style={{ width: `${ratio * 100}%` }} />
            </div>
            <div className="capacity-legend">
              <span>
                Need <strong>{fmt(need)}</strong>
              </span>
              <span>
                In accounts <strong>{fmt(balance)}</strong>
              </span>
            </div>
          </div>
        )}

        {hasBalance ? (
          slack >= 0 ? (
            <div className="verdict" data-tone="ok">
              <IconCheck />
              <span>
                Your accounts cover next week with <strong>{fmt(slack)}</strong> to spare.
              </span>
            </div>
          ) : (
            <div className="verdict" data-tone="warn">
              <IconAlert />
              <span>
                You’re <strong>{fmt(Math.abs(slack))}</strong> short of covering next week with what’s
                in your accounts.
              </span>
            </div>
          )
        ) : (
          <div className="verdict" data-tone="muted">
            <IconInfo />
            <span>Without bank balances, the need can’t be compared against available cash.</span>
          </div>
        )}

        {missingPayroll > 0 && (
          <div className="verdict" data-tone="muted">
            <IconAlert />
            <span>
              {missingPayroll === 1 ? "One recent week has" : `${missingPayroll} recent weeks have`} no payroll
              entered; the forecast may come up short.
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
