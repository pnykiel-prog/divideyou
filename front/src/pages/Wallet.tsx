import { useEffect, useState } from 'react';
import { NavLink, useParams } from 'react-router-dom';
import { api, jr, pln } from '../api';
import { txLabel } from './Profile';

export default function Wallet() {
  const { tab = 'state' } = useParams();
  return (
    <div>
      <div className="page-head"><h1>Portfel</h1></div>
      <div className="tabs">
        <NavLink to="/wallet/state" className={tab === 'state' ? 'active' : ''}>Saldo</NavLink>
        <NavLink to="/wallet/payments" className={tab === 'payments' ? 'active' : ''}>Transakcje</NavLink>
        <NavLink to="/wallet/returns" className={tab === 'returns' ? 'active' : ''}>Zwroty</NavLink>
      </div>
      {tab === 'state' && <WalletState />}
      {tab === 'payments' && <Transactions />}
      {tab === 'returns' && <Returns />}
    </div>
  );
}

function WalletState() {
  const [w, setW] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [buyOpen, setBuyOpen] = useState(false);
  const [payoutOpen, setPayoutOpen] = useState(false);

  const load = () => {
    api.get('/profile/data').then((d) => { setW(d.wallet); setProfile(d.profile); });
  };
  useEffect(load, []);
  if (!w) return <div className="spinner">Ładowanie…</div>;

  return (
    <div>
      <div className="grid cols-3" style={{ marginBottom: 16 }}>
        <Tile label="Środki aktywne" value={jr(w.active)} sub={pln(w.activePln)} accent />
        <Tile label="Środki oczekujące" value={jr(w.pending)} sub="oczekują na akceptację" />
        <Tile label="Wydane (nieaktywne)" value={jr(w.inactive)} sub="już wykorzystane" />
        <Tile label="Do wypłaty" value={jr(w.toPayout)} sub={pln(w.toPayoutPln)} />
        <Tile label="Środki prowizyjne" value={jr(w.toCommissionPayout)} sub={pln(w.toCommissionPayoutPln)} />
        <Tile label="Zablokowane (zabezpieczenie)" value={jr(w.blocked)} sub="zamrożone przez zakupy" />
      </div>

      {!profile?.accessFeePaid && (
        <div className="alert warn">Twoje konto korzysta z dostępu demo. Uiść jednorazową opłatę za dostęp, aby odblokować wszystkie funkcje.
          <button className="btn sm" style={{ marginLeft: 10 }} onClick={() => payAccess(load)}>Opłać dostęp</button>
        </div>
      )}

      <div className="card pad">
        <div className="btn-row">
          <button className="btn primary" onClick={() => setBuyOpen(true)}>Kup JR</button>
          <button className="btn" onClick={() => setPayoutOpen(true)}>Wypłać JR</button>
        </div>
      </div>

      {buyOpen && <BuyJrModal onClose={() => { setBuyOpen(false); load(); }} />}
      {payoutOpen && <PayoutModal max={w.toPayout} onClose={() => { setPayoutOpen(false); load(); }} />}
    </div>
  );
}

async function payAccess(reload: () => void) {
  try {
    await api.post('/payments/access-fee', {});
    alert('Opłata za dostęp uiszczona. Pełny dostęp odblokowany.');
    reload();
  } catch (e: any) {
    alert(e.message);
  }
}

function Tile({ label, value, sub, accent }: any) {
  return (
    <div className={`stat${accent ? ' accent' : ''}`}>
      <div className="label">{label}</div>
      <div className="value">{value}</div>
      <div className="sub">{sub}</div>
    </div>
  );
}

function BuyJrModal({ onClose }: { onClose: () => void }) {
  const [amount, setAmount] = useState('100');
  const [rate, setRate] = useState(1);
  const [busy, setBusy] = useState(false);
  useEffect(() => { api.get('/config').then((c) => setRate(c.jrExchangeRate)); }, []);
  const submit = async () => {
    setBusy(true);
    try {
      await api.post('/payments/purchase-jr', { jr: Number(amount) });
      alert('JR zakupione i dodane do Twojego portfela.');
      onClose();
    } catch (e: any) { alert(e.message); } finally { setBusy(false); }
  };
  return (
    <Modal title="Kup JR" onClose={onClose}>
      <p className="muted">Kurs wymiany: 1 JR = {pln(rate)}</p>
      <label className="field"><span>Kwota (JR)</span>
        <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} min={1} />
      </label>
      <p className="muted">Zapłacisz około <b>{pln(Number(amount) * rate)}</b>.</p>
      <div className="btn-row">
        <button className="btn primary" onClick={submit} disabled={busy}>Potwierdź zakup</button>
        <button className="btn ghost" onClick={onClose}>Anuluj</button>
      </div>
    </Modal>
  );
}

function PayoutModal({ max, onClose }: { max: number; onClose: () => void }) {
  const [amount, setAmount] = useState(String(max || 0));
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setBusy(true);
    try {
      await api.post('/payments/payout-jr', { jr: Number(amount) });
      alert('Wypłata zgłoszona.');
      onClose();
    } catch (e: any) { alert(e.message); } finally { setBusy(false); }
  };
  return (
    <Modal title="Wypłać JR" onClose={onClose}>
      <p className="muted">Dostępne do wypłaty: <b>{jr(max)}</b></p>
      <label className="field"><span>Kwota (JR)</span>
        <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} min={1} max={max} />
      </label>
      <div className="btn-row">
        <button className="btn primary" onClick={submit} disabled={busy || max <= 0}>Zgłoś wypłatę</button>
        <button className="btn ghost" onClick={onClose}>Anuluj</button>
      </div>
    </Modal>
  );
}

function Transactions() {
  const [items, setItems] = useState<any[]>([]);
  useEffect(() => { api.get('/profile/transactions?per_page=50').then((d) => setItems(d.items)); }, []);
  return (
    <div className="card">
      <table>
        <thead><tr><th>Typ</th><th>Opis</th><th>Data</th><th style={{ textAlign: 'right' }}>Kwota</th></tr></thead>
        <tbody>
          {items.map((t) => (
            <tr key={t.id}>
              <td>{txLabel(t.type)}{t.cancelled && <span className="badge gray" style={{ marginLeft: 6 }}>anulowana</span>}</td>
              <td className="muted">{t.description || t.programName || '—'}</td>
              <td className="muted">{new Date(t.timestamp).toLocaleDateString('pl-PL')}</td>
              <td style={{ textAlign: 'right', fontWeight: 700 }}>{jr(t.value)}</td>
            </tr>
          ))}
          {items.length === 0 && <tr><td colSpan={4} className="empty">Brak transakcji.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

function Returns() {
  const [items, setItems] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const load = () => api.get('/profile/cashbacks').then(setItems);
  useEffect(() => { load(); }, []);
  return (
    <div>
      <div className="btn-row" style={{ marginBottom: 16 }}>
        <button className="btn primary" onClick={() => setOpen(true)}>Zgłoś zwrot</button>
      </div>
      <div className="card">
        <table>
          <thead><tr><th>Typ</th><th>Kwota</th><th>Status</th><th>Opis</th><th>Data</th></tr></thead>
          <tbody>
            {items.map((r) => (
              <tr key={r.id}>
                <td>{r.type === 1 ? 'Gotówka' : r.type === 2 ? 'JR' : 'Opłata za dostęp'}</td>
                <td>{jr(r.value)}</td>
                <td><StatusBadge status={r.status} /></td>
                <td className="muted">{r.description}</td>
                <td className="muted">{new Date(r.createdAt).toLocaleDateString('pl-PL')}</td>
              </tr>
            ))}
            {items.length === 0 && <tr><td colSpan={5} className="empty">Brak wniosków o zwrot.</td></tr>}
          </tbody>
        </table>
      </div>
      {open && <ReturnModal onClose={() => { setOpen(false); load(); }} />}
    </div>
  );
}

function ReturnModal({ onClose }: { onClose: () => void }) {
  const [type, setType] = useState('1');
  const [value, setValue] = useState('10');
  const [description, setDescription] = useState('');
  const submit = async () => {
    try {
      await api.post('/payments/cashback', { type: Number(type), value: Number(value), description });
      alert('Wniosek o zwrot został złożony.');
      onClose();
    } catch (e: any) { alert(e.message); }
  };
  return (
    <Modal title="Zgłoś zwrot" onClose={onClose}>
      <label className="field"><span>Typ zwrotu</span>
        <select value={type} onChange={(e) => setType(e.target.value)}>
          <option value="1">Gotówka (na konto bankowe)</option>
          <option value="2">Uznanie w JR</option>
        </select>
      </label>
      <label className="field"><span>Kwota (JR)</span>
        <input type="number" value={value} onChange={(e) => setValue(e.target.value)} min={1} />
      </label>
      <label className="field"><span>Opis</span>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
      </label>
      <div className="btn-row">
        <button className="btn primary" onClick={submit}>Wyślij</button>
        <button className="btn ghost" onClick={onClose}>Anuluj</button>
      </div>
    </Modal>
  );
}

function StatusBadge({ status }: { status: number }) {
  if (status === 2) return <span className="badge green">zaakceptowana</span>;
  if (status === 3) return <span className="badge red">odrzucona</span>;
  return <span className="badge amber">oczekująca</span>;
}

export function Modal({ title, children, onClose }: { title: string; children: any; onClose: () => void }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(16,24,48,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 20 }} onClick={onClose}>
      <div className="card pad" style={{ width: 440, maxWidth: '100%' }} onClick={(e) => e.stopPropagation()}>
        <h2>{title}</h2>
        {children}
      </div>
    </div>
  );
}
