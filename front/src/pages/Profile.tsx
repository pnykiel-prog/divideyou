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

  if (!data) return <div className="spinner">Ładowanie…</div>;
  const w = data.wallet;

  return (
    <div>
      <div className="page-head">
        <h1>Profil</h1>
        <Link className="btn" to="/settings">Edytuj ustawienia</Link>
      </div>

      {warnings.map((warn, i) => (
        <WarningBanner key={i} warn={warn} />
      ))}

      <div className="grid cols-4" style={{ marginBottom: 16 }}>
        <div className="stat accent">
          <div className="label">Aktywne saldo</div>
          <div className="value">{jr(w.active)}</div>
          <div className="sub">{pln(w.activePln)}</div>
        </div>
        <div className="stat">
          <div className="label">Oczekujące</div>
          <div className="value">{jr(w.pending)}</div>
        </div>
        <div className="stat">
          <div className="label">Do wypłaty</div>
          <div className="value">{jr(w.toPayout)}</div>
          <div className="sub">{pln(w.toPayoutPln)}</div>
        </div>
        <div className="stat">
          <div className="label">Zablokowane (zabezpieczenie)</div>
          <div className="value">{jr(w.blocked)}</div>
        </div>
      </div>

      <div className="grid cols-2">
        <div className="card pad">
          <h3>Moje programy</h3>
          {data.purchases.length === 0 && <div className="muted">Nie masz jeszcze aktywnych programów. <Link to="/programs">Przeglądaj programy</Link></div>}
          {data.purchases.map((p: any) => (
            <div className="list-row" key={p.id}>
              <div style={{ flex: 1 }}>
                <strong>{p.location?.name || p.program?.name}</strong>
                <div className="muted" style={{ fontSize: 12 }}>
                  {p.isBonus ? 'Bonus' : p.location?.programName} · abonament {jr(p.subscriptionFee)}/mies.
                </div>
              </div>
              <Link className="btn sm" to={p.isBonus ? `/bonus/${p.program?.id}` : `/location/${p.location?.id}`}>Otwórz</Link>
            </div>
          ))}
        </div>

        <div>
          <div className="card pad" style={{ marginBottom: 16 }}>
            <h3>Program partnerski</h3>
            <div className="muted">Masz <b>{data.partnersCount}</b> poleconych partnerów.</div>
            <div style={{ marginTop: 10 }}><Link className="btn sm" to="/partnership">Przejdź do programu partnerskiego</Link></div>
          </div>
          <div className="card pad">
            <h3>Ostatnia aktywność</h3>
            {data.recentTransactions.length === 0 && <div className="muted">Brak transakcji.</div>}
            {data.recentTransactions.map((t: any) => (
              <div className="list-row" key={t.id}>
                <div style={{ flex: 1 }}>{txLabel(t.type)}</div>
                <strong>{jr(t.value)}</strong>
              </div>
            ))}
            <div style={{ marginTop: 10 }}><Link className="btn sm" to="/wallet/payments">Zobacz wszystkie</Link></div>
          </div>
        </div>
      </div>
    </div>
  );
}

function WarningBanner({ warn }: { warn: any }) {
  if (warn.type === 'demo')
    return <div className="alert warn">⏳ Twój dostęp demo kończy się za {Math.max(0, warn.daysLeft)} dni. <Link to="/wallet/state">Kup pełny dostęp</Link>.</div>;
  if (warn.type === 'agreements')
    return <div className="alert warn">📝 Przejrzyj i zaakceptuj zaktualizowane zgody w <Link to="/settings/agreements">ustawieniach</Link>.</div>;
  if (warn.type === 'missing_payments')
    return <div className="alert warn">💳 Masz {warn.count} zaległych płatności abonamentowych.</div>;
  if (warn.type === 'missing_funds')
    return <div className="alert warn">⚠️ Niewystarczające środki na abonamenty — doładuj {jr(warn.missing)}. <Link to="/wallet/state">Kup JR</Link>.</div>;
  if (warn.type === 'pending_payments')
    return <div className="alert info">ℹ️ Masz {warn.count} płatności oczekujących na przetworzenie.</div>;
  return null;
}

export function txLabel(type: number) {
  const map: Record<number, string> = {
    1: 'Opłata za dostęp', 10: 'Doładowanie JR', 11: 'Doładowanie JR (online)', 20: 'Zakup programu',
    21: 'Zakup bonusu', 30: 'Uznanie JR przez administratora', 31: 'Uznanie na wniosek', 40: 'Opłata abonamentowa',
    50: 'Prowizja partnerska', 60: 'Wypłata JR', 61: 'Wypłata prowizji', 62: 'Wypłata zwrotu',
    70: 'Zamrożone zabezpieczenie', 100: 'Anulowanie',
  };
  return map[type] || `Transakcja #${type}`;
}
