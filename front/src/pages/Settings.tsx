import { useEffect, useState } from 'react';
import { NavLink, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth';

export default function Settings() {
  const { tab = 'data' } = useParams();
  return (
    <div>
      <div className="page-head"><h1>Settings</h1></div>
      <div className="tabs">
        <NavLink to="/settings/data" className={tab === 'data' ? 'active' : ''}>My data</NavLink>
        <NavLink to="/settings/agreements" className={tab === 'agreements' ? 'active' : ''}>Agreements</NavLink>
      </div>
      {tab === 'agreements' ? <Agreements /> : <DataForm />}
    </div>
  );
}

function DataForm() {
  const { refresh } = useAuth();
  const [form, setForm] = useState<any>(null);
  const [pw, setPw] = useState({ oldPassword: '', password: '' });
  const [msg, setMsg] = useState('');

  useEffect(() => {
    api.get('/profile/data').then((d) => setForm({ ...d.profile }));
  }, []);
  if (!form) return <div className="spinner">Loading…</div>;

  const set = (k: string, v: any) => setForm({ ...form, [k]: v });
  const save = async () => {
    try {
      await api.post('/profile/data', form);
      await api.post('/profile/payment-data', { bankAccountNumber: form.bankAccountNumber });
      setMsg('Saved.');
      refresh();
    } catch (e: any) { setMsg(e.message); }
  };
  const changePw = async () => {
    try { await api.post('/profile/password', pw); setMsg('Password changed.'); setPw({ oldPassword: '', password: '' }); }
    catch (e: any) { setMsg(e.message); }
  };

  const isCompany = form.type === 2;

  return (
    <div className="grid cols-2">
      <div className="card pad">
        <h3>Personal / company data</h3>
        {msg && <div className="alert info">{msg}</div>}
        <label className="field"><span>Account type</span>
          <select value={form.type} onChange={(e) => set('type', Number(e.target.value))}>
            <option value={1}>Private person</option>
            <option value={2}>Company</option>
          </select>
        </label>
        {isCompany ? (
          <>
            <Field label="Company name" v={form.companyName} on={(v) => set('companyName', v)} />
            <Field label="Tax number (NIP)" v={form.taxNumber} on={(v) => set('taxNumber', v)} />
          </>
        ) : (
          <>
            <Field label="First name" v={form.firstName} on={(v) => set('firstName', v)} />
            <Field label="Last name" v={form.lastName} on={(v) => set('lastName', v)} />
            <Field label="Personal number (PESEL)" v={form.personalNumber} on={(v) => set('personalNumber', v)} />
          </>
        )}
        <Field label="Address" v={form.address} on={(v) => set('address', v)} />
        <div style={{ display: 'flex', gap: 10 }}>
          <Field label="Postal code" v={form.postalCode} on={(v) => set('postalCode', v)} />
          <Field label="City" v={form.city} on={(v) => set('city', v)} />
        </div>
        <Field label="Phone" v={form.phone} on={(v) => set('phone', v)} />
        <Field label="Bank account number" v={form.bankAccountNumber} on={(v) => set('bankAccountNumber', v)} />
        <button className="btn primary" onClick={save}>Save changes</button>
      </div>

      <div>
        <div className="card pad" style={{ marginBottom: 16 }}>
          <h3>Change password</h3>
          <label className="field"><span>Current password</span>
            <input type="password" value={pw.oldPassword} onChange={(e) => setPw({ ...pw, oldPassword: e.target.value })} />
          </label>
          <label className="field"><span>New password</span>
            <input type="password" value={pw.password} onChange={(e) => setPw({ ...pw, password: e.target.value })} />
          </label>
          <button className="btn" onClick={changePw}>Update password</button>
        </div>
        <div className="card pad">
          <h3>Danger zone</h3>
          <p className="muted">Deleting your account is permanent and only possible with no active funds.</p>
          <DeleteAccount />
        </div>
      </div>
    </div>
  );
}

function DeleteAccount() {
  const nav = useNavigate();
  const { logout } = useAuth();
  const del = async () => {
    const password = prompt('Enter your password to confirm account deletion:');
    if (!password) return;
    try {
      await api.post('/profile/delete', { password });
      logout();
      nav('/login');
    } catch (e: any) { alert(e.message); }
  };
  return <button className="btn danger" onClick={del}>Delete account</button>;
}

function Agreements() {
  const [data, setData] = useState<any>(null);
  useEffect(() => { api.get('/profile/rules').then(setData); }, []);
  if (!data) return <div className="spinner">Loading…</div>;
  const accept = async () => { await api.post('/profile/rules', {}); setData({ ...data, accepted: [...data.accepted, 2] }); alert('Agreements accepted.'); };
  return (
    <div className="card pad">
      <h3>Legal agreements (RODO / GDPR)</h3>
      <table>
        <thead><tr><th>Agreement</th><th>Required</th><th>Status</th></tr></thead>
        <tbody>
          {data.rules.map((r: any) => (
            <tr key={r.id}>
              <td>{r.name}<div className="muted" style={{ fontSize: 12 }}>{r.content}</div></td>
              <td>{r.required ? <span className="badge red">required</span> : <span className="badge gray">optional</span>}</td>
              <td><span className="badge green">accepted</span></td>
            </tr>
          ))}
        </tbody>
      </table>
      <button className="btn" style={{ marginTop: 12 }} onClick={accept}>Re-accept all agreements</button>
    </div>
  );
}

function Field({ label, v, on }: { label: string; v: any; on: (v: string) => void }) {
  return (
    <label className="field" style={{ flex: 1 }}>
      <span>{label}</span>
      <input value={v || ''} onChange={(e) => on(e.target.value)} />
    </label>
  );
}
