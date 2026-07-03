import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Wallet, Layers, Users, TrendingUp, ArrowRight, Clock, FileText, CreditCard, AlertTriangle, Info } from 'lucide-react';
import { api, jr, pln } from '../api';
import { useAuth } from '../auth';
import { Spinner } from '../ui';

export default function Profile() {
  const nav = useNavigate();
  const { user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [warnings, setWarnings] = useState<any[]>([]);

  useEffect(() => {
    api.get('/dashboard').then(setData).catch(() => {});
    api.get('/profile/warnings').then(setWarnings).catch(() => {});
  }, []);

  if (!data) return <Spinner />;
  const w = data.wallet;
  const firstName = user?.firstName;

  const stats = [
    { Icon: Wallet, tint: 'var(--brand-tint)', color: 'var(--brand-600)', num: jr(w.active), label: 'Saldo aktywne (JR)' },
    { Icon: Layers, tint: '#E8EFF7', color: '#2B6FB0', num: String(data.purchases.length), label: 'Aktywne programy' },
    { Icon: Users, tint: '#F6E6EF', color: '#9C2F63', num: String(data.partnersCount), label: 'Poleceni partnerzy' },
    { Icon: TrendingUp, tint: '#E7F4EC', color: '#1E7A45', num: jr(w.toCommissionPayout), label: 'Środki prowizyjne (JR)' },
  ];

  return (
    <div>
      <div className="screen-head">
        <h1 className="screen-title dy-h">Dzień dobry{firstName ? `, ${firstName}` : ''}</h1>
        <p className="screen-sub">Oto krótki przegląd Twojego konta.</p>
      </div>

      {warnings.map((warn, i) => (
        <WarningBanner key={i} warn={warn} nav={nav} />
      ))}

      <div className="stat-grid" style={{ marginBottom: 18 }}>
        {stats.map((s, i) => (
          <div className="stat-card" key={i}>
            <div className="stat-ic" style={{ background: s.tint, color: s.color }}>
              <s.Icon size={20} strokeWidth={1.9} />
            </div>
            <div className="stat-num dy-num">{s.num}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid-main">
        <div className="card">
          <div className="card-head">
            <span className="card-title">Ostatnie transakcje</span>
          </div>
          {data.recentTransactions.length === 0 ? (
            <div className="empty">Brak transakcji.</div>
          ) : (
            <div className="tx-list">
              {data.recentTransactions.map((t: any) => (
                <div className="tx-row" key={t.id}>
                  <div className="tx-ic"><Clock size={17} strokeWidth={1.9} /></div>
                  <div className="tx-main">
                    <div className="tx-title">{txLabel(t.type)}</div>
                    <div className="tx-meta">Transakcja #{t.id}</div>
                  </div>
                  <div className={`tx-amt dy-num ${t.value >= 0 ? 'pos' : 'neg'}`}>
                    {t.value >= 0 ? '+' : ''}{jr(t.value)}
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="card-head" style={{ borderBottom: 'none', borderTop: '1px solid var(--line)' }}>
            <span className="grow" />
            <a className="row" style={{ gap: 6, color: 'var(--brand-600)', fontWeight: 700, cursor: 'pointer' }} onClick={() => nav('/wallet')}>
              Zobacz portfel <ArrowRight size={16} />
            </a>
          </div>
        </div>

        <div className="stack" style={{ gap: 18 }}>
          <div className="card card-pad" style={{ background: 'var(--brand)', color: '#fff', border: 'none' }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--brand-300)', letterSpacing: '.04em' }}>DO WYPŁATY</div>
            <div className="dy-h dy-num" style={{ fontSize: 34, margin: '8px 0 4px' }}>{jr(w.toPayout)}</div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,.72)', marginBottom: 16 }}>{pln(w.toPayoutPln)}</div>
            <button className="btn btn-block" style={{ background: 'rgba(255,255,255,.16)', color: '#fff' }} onClick={() => nav('/wallet')}>
              Zleć wypłatę <ArrowRight size={16} />
            </button>
          </div>

          <div className="card card-pad" style={{ background: 'var(--brand-tint)', border: '1px solid var(--brand-300)' }}>
            <div className="eyebrow">Porada</div>
            <div className="dy-h" style={{ fontSize: 17, color: 'var(--brand-600)', margin: '8px 0 6px' }}>
              Zarabiaj na poleceniach
            </div>
            <p style={{ fontSize: 13.5, color: 'var(--ink-2)', lineHeight: 1.55, margin: '0 0 14px' }}>
              Zaproś znajomych do DivideYou i otrzymuj prowizję od ich aktywności. Sprawdź, jak działa program partnerski.
            </p>
            <a className="row" style={{ gap: 6, color: 'var(--brand-600)', fontWeight: 700, cursor: 'pointer' }} onClick={() => nav('/partnership')}>
              Program partnerski <ArrowRight size={16} />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

function WarningBanner({ warn, nav }: { warn: any; nav: (to: string) => void }) {
  if (warn.type === 'demo')
    return (
      <Banner kind="warn" Icon={Clock} title="Dostęp demo" text={`Twój dostęp demo kończy się za ${Math.max(0, warn.daysLeft)} dni.`}
        action="Kup pełny dostęp" onClick={() => nav('/wallet/state')} />
    );
  if (warn.type === 'agreements')
    return (
      <Banner kind="info" Icon={FileText} title="Zgody do akceptacji" text="Przejrzyj i zaakceptuj zaktualizowane zgody w ustawieniach."
        action="Ustawienia" onClick={() => nav('/settings/agreements')} />
    );
  if (warn.type === 'missing_payments')
    return <Banner kind="crit" Icon={CreditCard} title="Zaległe płatności" text={`Masz ${warn.count} zaległych płatności abonamentowych.`} />;
  if (warn.type === 'missing_funds')
    return (
      <Banner kind="warn" Icon={AlertTriangle} title="Niewystarczające środki" text={`Doładuj ${jr(warn.missing)}, aby opłacić abonamenty.`}
        action="Kup JR" onClick={() => nav('/wallet/state')} />
    );
  if (warn.type === 'pending_payments')
    return <Banner kind="info" Icon={Info} title="Płatności w toku" text={`Masz ${warn.count} płatności oczekujących na przetworzenie.`} />;
  return null;
}

function Banner({ kind, Icon, title, text, action, onClick }: any) {
  return (
    <div className={`banner ${kind}`}>
      <span className="banner-ic"><Icon size={20} /></span>
      <div className="grow">
        <div className="banner-title">{title}</div>
        <div className="banner-text">{text}</div>
      </div>
      {action && (
        <button className="btn btn-sm btn-outline" onClick={onClick}>{action} <ArrowRight size={15} /></button>
      )}
    </div>
  );
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
