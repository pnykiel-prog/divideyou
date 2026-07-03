import { useEffect, useState } from 'react';
import { NavLink, useParams } from 'react-router-dom';
import { api, jr, pln } from '../api';
import { txLabel } from './Profile';

export default function Wallet() {
  const { tab = 'state' } = useParams();
  return (
    <div>
      <div className="page-head"><h1>Wallet</h1></div>
      <div className="tabs">
        <NavLink to="/wallet/state" className={tab === 'state' ? 'active' : ''}>Balance</NavLink>
        <NavLink to="/wallet/payments" className={tab === 'payments' ? 'active' : ''}>Transactions</NavLink>
        <NavLink to="/wallet/returns" className={tab === 'returns' ? 'active' : ''}>Returns</NavLink>
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
  if (!w) return <div className="spinner">Loading…</div>;

  return (
    <div>
      <div className="grid cols-3" style={{ marginBottom: 16 }}>
        <Tile label="Active money" value={jr(w.active)} sub={pln(w.activePln)} accent />
        <Tile label="Pending money" value={jr(w.pending)} sub="awaiting acceptance" />
        <Tile label="Spent (inactive)" value={jr(w.inactive)} sub="already used" />
        <Tile label="Available to payout" value={jr(w.toPayout)} sub={pln(w.toPayoutPln)} />
        <Tile label="Commission money" value={jr(w.toCommissionPayout)} sub={pln(w.toCommissionPayoutPln)} />
        <Tile label="Blocked (collateral)" value={jr(w.blocked)} sub="frozen by purchases" />
      </div>

      {!profile?.accessFeePaid && (
        <div className="alert warn">Your account is on demo access. Pay the one-time access fee to unlock all features.
          <button className="btn sm" style={{ marginLeft: 10 }} onClick={() => payAccess(load)}>Pay access fee</button>
        </div>
      )}

      <div className="card pad">
        <div className="btn-row">
          <button className="btn primary" onClick={() => setBuyOpen(true)}>Buy JR</button>
          <button className="btn" onClick={() => setPayoutOpen(true)}>Payout JR</button>
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
    alert('Access fee paid. Full access unlocked.');
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
      alert('JR purchased and added to your wallet.');
      onClose();
    } catch (e: any) { alert(e.message); } finally { setBusy(false); }
  };
  return (
    <Modal title="Buy JR" onClose={onClose}>
      <p className="muted">Exchange rate: 1 JR = {pln(rate)}</p>
      <label className="field"><span>Amount (JR)</span>
        <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} min={1} />
      </label>
      <p className="muted">You will pay approximately <b>{pln(Number(amount) * rate)}</b>.</p>
      <div className="btn-row">
        <button className="btn primary" onClick={submit} disabled={busy}>Confirm purchase</button>
        <button className="btn ghost" onClick={onClose}>Cancel</button>
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
      alert('Payout requested.');
      onClose();
    } catch (e: any) { alert(e.message); } finally { setBusy(false); }
  };
  return (
    <Modal title="Payout JR" onClose={onClose}>
      <p className="muted">Available for payout: <b>{jr(max)}</b></p>
      <label className="field"><span>Amount (JR)</span>
        <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} min={1} max={max} />
      </label>
      <div className="btn-row">
        <button className="btn primary" onClick={submit} disabled={busy || max <= 0}>Request payout</button>
        <button className="btn ghost" onClick={onClose}>Cancel</button>
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
        <thead><tr><th>Type</th><th>Description</th><th>Date</th><th style={{ textAlign: 'right' }}>Amount</th></tr></thead>
        <tbody>
          {items.map((t) => (
            <tr key={t.id}>
              <td>{txLabel(t.type)}{t.cancelled && <span className="badge gray" style={{ marginLeft: 6 }}>cancelled</span>}</td>
              <td className="muted">{t.description || t.programName || '—'}</td>
              <td className="muted">{new Date(t.timestamp).toLocaleDateString()}</td>
              <td style={{ textAlign: 'right', fontWeight: 700 }}>{jr(t.value)}</td>
            </tr>
          ))}
          {items.length === 0 && <tr><td colSpan={4} className="empty">No transactions.</td></tr>}
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
        <button className="btn primary" onClick={() => setOpen(true)}>Report a return</button>
      </div>
      <div className="card">
        <table>
          <thead><tr><th>Type</th><th>Amount</th><th>Status</th><th>Description</th><th>Date</th></tr></thead>
          <tbody>
            {items.map((r) => (
              <tr key={r.id}>
                <td>{r.type === 1 ? 'Cash' : r.type === 2 ? 'JR' : 'Access fee'}</td>
                <td>{jr(r.value)}</td>
                <td><StatusBadge status={r.status} /></td>
                <td className="muted">{r.description}</td>
                <td className="muted">{new Date(r.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
            {items.length === 0 && <tr><td colSpan={5} className="empty">No return requests.</td></tr>}
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
      alert('Return request submitted.');
      onClose();
    } catch (e: any) { alert(e.message); }
  };
  return (
    <Modal title="Report a return" onClose={onClose}>
      <label className="field"><span>Return type</span>
        <select value={type} onChange={(e) => setType(e.target.value)}>
          <option value="1">Cash (to bank account)</option>
          <option value="2">JR credit</option>
        </select>
      </label>
      <label className="field"><span>Amount (JR)</span>
        <input type="number" value={value} onChange={(e) => setValue(e.target.value)} min={1} />
      </label>
      <label className="field"><span>Description</span>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
      </label>
      <div className="btn-row">
        <button className="btn primary" onClick={submit}>Submit</button>
        <button className="btn ghost" onClick={onClose}>Cancel</button>
      </div>
    </Modal>
  );
}

function StatusBadge({ status }: { status: number }) {
  if (status === 2) return <span className="badge green">accepted</span>;
  if (status === 3) return <span className="badge red">rejected</span>;
  return <span className="badge amber">pending</span>;
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
