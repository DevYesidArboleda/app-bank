import { fmt } from "./format";
import { IconAlert } from "./icons";

const when = new Intl.DateTimeFormat("en-US", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

export default function Accounts({ data, loading, onRetry }) {
  if (loading) {
    return (
      <div aria-busy="true" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div className="skeleton" style={{ height: 36 }} />
        <div className="skeleton" style={{ height: 36 }} />
      </div>
    );
  }

  if (!data || data.error) {
    return (
      <div className="state" data-tone="error" role="alert">
        <IconAlert />
        <div>
          <strong>Couldn’t load balances</strong>
          SimpleFIN didn’t respond. Check the connection and try again.
          <div>
            <button type="button" className="btn btn-sm" onClick={onRetry}>
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  const accounts = data.accounts || [];
  if (accounts.length === 0) {
    return (
      <div className="state">
        <IconAlert />
        <div>
          <strong>No accounts connected</strong>
          Connect your bank in SimpleFIN to see balances here.
        </div>
      </div>
    );
  }

  const total = accounts.reduce((s, a) => s + (Number(a.balance) || 0), 0);

  return (
    <>
      <ul className="accounts">
        {accounts.map((a) => (
          <li key={a.id} className="account">
            <span className="account-name" title={a.name}>
              {a.name}
            </span>
            <span className="account-meta">
              {a.institution || "Bank"}
              {a.balanceDate ? ` · ${when.format(new Date(a.balanceDate))}` : ""}
            </span>
            <span className={`account-balance${Number(a.balance) < 0 ? " amount-neg" : ""}`}>
              {fmt(Number(a.balance))}
            </span>
          </li>
        ))}
      </ul>
      <div className="accounts-total">
        <span>Total in accounts</span>
        <span>{fmt(total)}</span>
      </div>
      {data.errors?.length > 0 && (
        <p className="pane-note" style={{ marginTop: 8 }}>
          SimpleFIN reported: {data.errors.join(" · ")}
        </p>
      )}
    </>
  );
}
