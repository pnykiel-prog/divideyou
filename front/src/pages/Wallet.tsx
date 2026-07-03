import { useEffect, useState } from 'react';
import { NavLink, useParams } from 'react-router-dom';
import {
  Plus, ArrowUp, ArrowDown, CreditCard, Users, ShieldCheck, RotateCcw,
  Info, Filter, Wallet as WalletIcon, Clock, Send, X,
} from 'lucide-react';
import { api, jr, pln } from '../api';
import { useToast, Spinner, Empty, ErrorAlert, statusBadge } from '../ui';
import { txLabel } from './Profile';

const num = (n: number | undefined | null) =>
  (n ?? 0).toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const TABS = [
  { key: 'state', to: '/wallet/state', label: 'Stan' },
  { key: 'payments', to: '/wallet/payments', label: 'Płatności' },
  { key: 'frozen', to: '/wallet/frozen', label: 'Zamrożone' },
  { key: 'returns', to: '/wallet/returns', label: 'Zwroty' },
];

export default function Wallet() {
  const { tab = 'state' } = useParams();
  const [w, setW] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [err, setErr] = useState('');
  const [buyOpen, setBuyOpen] = useState(false);
  const [payoutOpen, setPayoutOpen] = useState(false);

  const load = () => {
    api.get('/profile/data')
      .then((d) => { setW(d.wallet); setProfile(d.profile); })
      .catch((e) => setErr(e.message));
  };
  useEffect(load, []);

  return (
    <div>
      <div className="screen-head between wrap" style={{ gap: 16 }}>
        <div>
          <h1 className="screen-title dy-h">Portfel</h1>
          <p className="screen-sub">Sześć kubełków środków. Kurs stały: 1 JR = 1,00 zł</p>
        </div>
        <div className="row" style={{ gap: 10 }}>
          <button className="btn btn-primary" onClick={() => setBuyOpen(true)}>
            <Plus size={17} /> Kup JR
          </button>
          <button className="btn btn-outline" onClick={() => setPayoutOpen(true)}>
            <ArrowUp size={17} /> Wypłata
          </button>
        </div>
      </div>

      <div className="tabs" style={{ marginBottom: 20 }}>
        {TABS.map((t) => (
          <NavLink key={t.key} to={t.to} className={`tab${tab === t.key ? ' active' : ''}`}>
            {t.label}
          </NavLink>
        ))}
      </div>

      {err && <ErrorAlert>{err}</ErrorAlert>}

      {tab === 'state' && <WalletState w={w} profile={profile} reload={load} />}
      {tab === 'payments' && <Transactions />}
      {tab === 'frozen' && <Frozen />}
      {tab === 'returns' && <Returns />}

      {buyOpen && <BuyJrModal onClose={() => { setBuyOpen(false); load(); }} />}
      {payoutOpen && <PayoutModal max={w?.toPayout ?? 0} onClose={() => { setPayoutOpen(false); load(); }} />}
    </div>
  );
}

/* ---------------------------------------------------------------- Stan */

const BUCKETS = [
  { field: 'active', label: 'Aktywne', color: '#2E9E54', Icon: WalletIcon, tip: 'Środki dostępne do wydania na programy i bonusy.' },
  { field: 'pending', label: 'Oczekujące', color: '#C9821A', Icon: Clock, tip: 'Z płatności, które nie zostały jeszcze zaksięgowane.' },
  { field: 'inactive', label: 'Nieaktywne', color: '#7E877F', Icon: RotateCcw, tip: 'Środki już wydane — widoczne w historii.' },
  { field: 'toPayout', label: 'Do wypłaty', color: '#2B6FB0', Icon: ArrowUp, tip: 'JR gotowe do wypłaty po okresie karencji.' },
  { field: 'toCommissionPayout', label: 'Środki prowizyjne', color: '#9C2F63', Icon: Users, tip: 'Prowizje z Twoich poleceń partnerskich.' },
  { field: 'blocked', label: 'Zablokowane', color: '#B23A48', Icon: ShieldCheck, tip: 'Zabezpieczenie aktywnych zakupów i umów.' },
];

function WalletState({ w, profile, reload }: { w: any; profile: any; reload: () => void }) {
  const toast = useToast();
  if (!w) return <Spinner />;

  const payAccess = async () => {
    try {
      await api.post('/payments/access-fee', {});
      toast('Opłata za dostęp uiszczona. Pełny dostęp odblokowany.');
      reload();
    } catch (e: any) { toast(e.message); }
  };

  const total = (w.active ?? 0) + (w.pending ?? 0) + (w.inactive ?? 0) + (w.toPayout ?? 0) + (w.blocked ?? 0);

  return (
    <div>
      {profile && !profile.accessFeePaid && (
        <div className="banner warn">
          <span className="banner-ic"><Clock size={20} /></span>
          <div className="grow">
            <div className="banner-title">Dostęp demo</div>
            <div className="banner-text">Uiść jednorazową opłatę za dostęp, aby odblokować wszystkie funkcje.</div>
          </div>
          <button className="btn btn-sm" style={{ background: '#9A6A0C', color: '#fff' }} onClick={payAccess}>
            Opłać dostęp
          </button>
        </div>
      )}

      <div className="tiles">
        {BUCKETS.map(({ field, label, color, Icon, tip }) => {
          const value = w[field] ?? 0;
          return (
            <div className="tile" key={field} style={{ borderTopColor: color }}>
              <span className="tile-info" title={tip}><Info size={16} /></span>
              <div className="tile-ic" style={{ background: color }}><Icon size={20} /></div>
              <div className="tile-amount dy-num">{num(value)} <span className="u">JR</span></div>
              <div className="tile-sub">≈ {pln(value)}</div>
              <div className="tile-label">{label}</div>
            </div>
          );
        })}
      </div>

      <div className="saldo-total">
        <span className="tile-ic" style={{ background: 'rgba(255,255,255,.16)' }}><WalletIcon size={20} /></span>
        <div className="grow"><div className="lab">SALDO CAŁKOWITE</div></div>
        <div className="val dy-num">{num(total)} JR <span className="u">≈ {pln(total)}</span></div>
      </div>
    </div>
  );
}

/* ------------------------------------------------- Transactions & Frozen */

function txIcon(type: number) {
  if (type === 10 || type === 11 || type === 30 || type === 31) return <ArrowDown size={18} />;
  if (type === 60 || type === 61 || type === 62) return <ArrowUp size={18} />;
  if (type === 70) return <ShieldCheck size={18} />;
  if (type === 50) return <Users size={18} />;
  return <CreditCard size={18} />;
}

function TxRow({ t }: { t: any }) {
  const sb = statusBadge(t.status, t.cancelled);
  const positive = (t.value ?? 0) >= 0;
  return (
    <div className="tx-row">
      <div className="tx-ic">{txIcon(t.type)}</div>
      <div className="tx-main">
        <div className="tx-title">{txLabel(t.type)}</div>
        <div className="tx-meta">
          {t.description || t.programName ? `${t.description || t.programName} · ` : ''}
          {new Date(t.timestamp).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short', year: 'numeric' })}
        </div>
      </div>
      <span className={'badge ' + sb.cls}>{sb.label}</span>
      <div className={'tx-amt dy-num ' + (positive ? 'pos' : 'neg')}>
        {positive ? '+' : '−'}{num(Math.abs(t.value ?? 0))} JR
      </div>
    </div>
  );
}

function Transactions() {
  const [items, setItems] = useState<any[] | null>(null);
  const [err, setErr] = useState('');
  useEffect(() => {
    api.get('/profile/transactions?per_page=50').then((d) => setItems(d.items)).catch((e) => setErr(e.message));
  }, []);

  if (err) return <ErrorAlert>{err}</ErrorAlert>;
  if (!items) return <Spinner />;

  return (
    <div className="card">
      <div className="card-head">
        <div className="card-title">Historia płatności</div>
        <button className="btn btn-ghost btn-sm"><Filter size={15} /> Filtruj</button>
      </div>
      {items.length === 0 ? (
        <Empty>Brak transakcji.</Empty>
      ) : (
        <div className="tx-list">{items.map((t) => <TxRow key={t.id} t={t} />)}</div>
      )}
    </div>
  );
}

function Frozen() {
  const [items, setItems] = useState<any[] | null>(null);
  const [err, setErr] = useState('');
  useEffect(() => {
    api.get('/profile/transactions?per_page=50').then((d) => setItems(d.items)).catch((e) => setErr(e.message));
  }, []);

  if (err) return <ErrorAlert>{err}</ErrorAlert>;
  if (!items) return <Spinner />;

  const frozen = items.filter((t) => t.type === 70);

  return (
    <div className="card">
      <div className="card-head">
        <div className="card-title">Środki zablokowane (zabezpieczenie)</div>
        <button className="btn btn-ghost btn-sm"><Filter size={15} /> Filtruj</button>
      </div>
      {frozen.length === 0 ? (
        <Empty>Brak zamrożonych środków.</Empty>
      ) : (
        <div className="tx-list">{frozen.map((t) => <TxRow key={t.id} t={t} />)}</div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------- Returns */

const returnForm = (type: number) => (type === 1 ? 'Gotówka' : type === 2 ? 'JR' : 'Opłata za dostęp');

function Returns() {
  const [items, setItems] = useState<any[] | null>(null);
  const [err, setErr] = useState('');
  const toast = useToast();

  const [type, setType] = useState('1');
  const [value, setValue] = useState('10');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);

  const load = () => api.get('/profile/cashbacks').then(setItems).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, []);

  const submit = async () => {
    setBusy(true);
    try {
      await api.post('/payments/cashback', { type: Number(type), value: Number(value), description });
      toast('Wniosek o zwrot został złożony.');
      setDescription('');
      load();
    } catch (e: any) { toast(e.message); } finally { setBusy(false); }
  };

  return (
    <div className="grid-side">
      <div className="card">
        <div className="card-head">
          <div className="card-title">Wnioski o zwrot</div>
        </div>
        {err && <div style={{ padding: '14px 20px' }}><ErrorAlert>{err}</ErrorAlert></div>}
        {!items ? (
          <Spinner />
        ) : items.length === 0 ? (
          <Empty>Brak wniosków o zwrot.</Empty>
        ) : (
          <div className="tx-list">
            {items.map((r) => {
              const sb = statusBadge(r.status);
              return (
                <div className="tx-row" key={r.id}>
                  <div className="tx-ic"><RotateCcw size={18} /></div>
                  <div className="tx-main">
                    <div className="tx-title">{r.description || 'Zwrot środków'}</div>
                    <div className="tx-meta">
                      Zgłoszono: {new Date(r.createdAt).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short', year: 'numeric' })} · {returnForm(r.type)}
                    </div>
                  </div>
                  <span className={'badge ' + sb.cls}>{sb.label}</span>
                  <div className="tx-amt dy-num">{num(r.value)} JR</div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="card card-pad">
        <div className="card-title" style={{ marginBottom: 16 }}>Zgłoś nowy zwrot</div>
        <div className="field">
          <label className="label">Forma zwrotu</label>
          <select className="select" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="1">Gotówka na konto bankowe</option>
            <option value="2">Środki JR na portfel</option>
          </select>
        </div>
        <div className="field">
          <label className="label">Kwota (JR)</label>
          <input className="input" type="number" value={value} onChange={(e) => setValue(e.target.value)} min={1} />
        </div>
        <div className="field">
          <label className="label">Powód</label>
          <textarea className="textarea" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Opisz powód zwrotu…" />
        </div>
        <button className="btn btn-primary btn-block" onClick={submit} disabled={busy}>
          <Send size={16} /> Wyślij wniosek
        </button>
      </div>
    </div>
  );
}

/* --------------------------------------------------------------- Modals */

function BuyJrModal({ onClose }: { onClose: () => void }) {
  const [amount, setAmount] = useState('100');
  const [rate, setRate] = useState(1);
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  useEffect(() => { api.get('/config').then((c) => setRate(c.jrExchangeRate)); }, []);
  const submit = async () => {
    setBusy(true);
    try {
      await api.post('/payments/purchase-jr', { jr: Number(amount) });
      toast('JR zakupione i dodane do Twojego portfela.');
      onClose();
    } catch (e: any) { toast(e.message); } finally { setBusy(false); }
  };
  return (
    <Modal title="Kup JR" onClose={onClose}>
      <p className="muted" style={{ margin: '0 0 16px' }}>Kurs wymiany: 1 JR = {pln(rate)}</p>
      <div className="field">
        <label className="label">Kwota (JR)</label>
        <input className="input" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} min={1} />
      </div>
      <p className="muted" style={{ margin: '0 0 18px' }}>Zapłacisz około <b style={{ color: 'var(--ink)' }}>{pln(Number(amount) * rate)}</b>.</p>
      <div className="row" style={{ gap: 10 }}>
        <button className="btn btn-primary grow" onClick={submit} disabled={busy}><Plus size={17} /> Potwierdź zakup</button>
        <button className="btn btn-ghost" onClick={onClose}>Anuluj</button>
      </div>
    </Modal>
  );
}

function PayoutModal({ max, onClose }: { max: number; onClose: () => void }) {
  const [amount, setAmount] = useState(String(max || 0));
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const submit = async () => {
    setBusy(true);
    try {
      await api.post('/payments/payout-jr', { jr: Number(amount) });
      toast('Wypłata zgłoszona.');
      onClose();
    } catch (e: any) { toast(e.message); } finally { setBusy(false); }
  };
  return (
    <Modal title="Wypłać JR" onClose={onClose}>
      <p className="muted" style={{ margin: '0 0 16px' }}>Dostępne do wypłaty: <b style={{ color: 'var(--ink)' }}>{jr(max)}</b></p>
      <div className="field">
        <label className="label">Kwota (JR)</label>
        <input className="input" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} min={1} max={max} />
      </div>
      <div className="row" style={{ gap: 10 }}>
        <button className="btn btn-primary grow" onClick={submit} disabled={busy || max <= 0}><ArrowUp size={17} /> Zgłoś wypłatę</button>
        <button className="btn btn-ghost" onClick={onClose}>Anuluj</button>
      </div>
    </Modal>
  );
}

export function Modal({ title, children, onClose }: { title: string; children: any; onClose: () => void }) {
  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(16,24,48,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 20 }}
      onClick={onClose}
    >
      <div className="card card-pad" style={{ width: 440, maxWidth: '100%' }} onClick={(e) => e.stopPropagation()}>
        <div className="between" style={{ marginBottom: 18 }}>
          <h2 className="card-title" style={{ fontSize: 22 }}>{title}</h2>
          <button className="icon-btn" onClick={onClose}><X size={17} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}
