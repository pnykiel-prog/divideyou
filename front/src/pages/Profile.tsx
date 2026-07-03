import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, jr, pln } from '../api';

export default function Profile() {
  const [data, setData] = useState<any>(null);
  const [warnings, setWarnings] = useState<any[]>([]);

  useEffect(() => {
    api.get('/dashboard').then(setData).catch(() => {});
    api.get('/profile/warnings').then(setWarnings).catch(() => {});
  }, []);

  if (!data) return <div className="spinner">Loading…</div>;
  const w = data.wallet;

  return (
    <div>
      <div className="page-head">
        <h1>Profile</h1>
        <Link className="btn" to="/settings">Edit settings</Link>
      </div>

      {warnings.map((warn, i) => (
        <WarningBanner key={i} warn={warn} />
      ))}

      <div className="grid cols-4" style={{ marginBottom: 16 }}>
        <div className="stat accent">
          <div className="label">Active balance</div>
          <div className="value">{jr(w.active)}</div>
          <div className="sub">{pln(w.activePln)}</div>
        </div>
        <div className="stat">
          <div className="label">Pending</div>
          <div className="value">{jr(w.pending)}</div>
        </div>
        <div className="stat">
          <div className="label">Available to payout</div>
          <div className="value">{jr(w.toPayout)}</div>
          <div className="sub">{pln(w.toPayoutPln)}</div>
        </div>
        <div className="stat">
          <div className="label">Blocked (collateral)</div>
          <div className="value">{jr(w.blocked)}</div>
        </div>
      </div>

      <div className="grid cols-2">
        <div className="card pad">
          <h3>My programs</h3>
          {data.purchases.length === 0 && <div className="muted">You have no active programs yet. <Link to="/programs">Browse programs</Link></div>}
          {data.purchases.map((p: any) => (
            <div className="list-row" key={p.id}>
              <div style={{ flex: 1 }}>
                <strong>{p.location?.name || p.program?.name}</strong>
                <div className="muted" style={{ fontSize: 12 }}>
                  {p.isBonus ? 'Bonus' : p.location?.programName} · subscription {jr(p.subscriptionFee)}/mo
                </div>
              </div>
              <Link className="btn sm" to={p.isBonus ? `/bonus/${p.program?.id}` : `/location/${p.location?.id}`}>Open</Link>
            </div>
          ))}
        </div>

        <div>
          <div className="card pad" style={{ marginBottom: 16 }}>
            <h3>Partnership</h3>
            <div className="muted">You have <b>{data.partnersCount}</b> referred partner(s).</div>
            <div style={{ marginTop: 10 }}><Link className="btn sm" to="/partnership">Go to partnership</Link></div>
          </div>
          <div className="card pad">
            <h3>Recent activity</h3>
            {data.recentTransactions.length === 0 && <div className="muted">No transactions yet.</div>}
            {data.recentTransactions.map((t: any) => (
              <div className="list-row" key={t.id}>
                <div style={{ flex: 1 }}>{txLabel(t.type)}</div>
                <strong>{jr(t.value)}</strong>
              </div>
            ))}
            <div style={{ marginTop: 10 }}><Link className="btn sm" to="/wallet/payments">View all</Link></div>
          </div>
        </div>
      </div>
    </div>
  );
}

function WarningBanner({ warn }: { warn: any }) {
  if (warn.type === 'demo')
    return <div className="alert warn">⏳ Your demo access ends in {Math.max(0, warn.daysLeft)} day(s). <Link to="/wallet/state">Buy full access</Link>.</div>;
  if (warn.type === 'agreements')
    return <div className="alert warn">📝 Please review and accept the updated agreements in <Link to="/settings/agreements">settings</Link>.</div>;
  if (warn.type === 'missing_payments')
    return <div className="alert warn">💳 You have {warn.count} overdue subscription payment(s).</div>;
  if (warn.type === 'missing_funds')
    return <div className="alert warn">⚠️ Insufficient funds for subscriptions — top up {jr(warn.missing)}. <Link to="/wallet/state">Buy JR</Link>.</div>;
  if (warn.type === 'pending_payments')
    return <div className="alert info">ℹ️ You have {warn.count} payment(s) awaiting processing.</div>;
  return null;
}

export function txLabel(type: number) {
  const map: Record<number, string> = {
    1: 'Access fee', 10: 'JR top-up', 11: 'JR top-up (online)', 20: 'Program purchase',
    21: 'Bonus purchase', 30: 'Admin JR credit', 31: 'Request credit', 40: 'Subscription fee',
    50: 'Partnership commission', 60: 'JR payout', 61: 'Commission payout', 62: 'Return payout',
    70: 'Frozen collateral', 100: 'Cancellation',
  };
  return map[type] || `Transaction #${type}`;
}
