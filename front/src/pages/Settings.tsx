import { useEffect, useState } from 'react';
import { NavLink, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth';

export default function Settings() {
  const { tab = 'data' } = useParams();
  return (
    <div>
      <div className="page-head"><h1>Ustawienia</h1></div>
      <div className="tabs">
        <NavLink to="/settings/data" className={tab === 'data' ? 'active' : ''}>Moje dane</NavLink>
        <NavLink to="/settings/agreements" className={tab === 'agreements' ? 'active' : ''}>Zgody</NavLink>
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
  if (!form) return <div className="spinner">Ładowanie…</div>;

  const set = (k: string, v: any) => setForm({ ...form, [k]: v });
  const save = async () => {
    try {
      await api.post('/profile/data', form);
      await api.post('/profile/payment-data', { bankAccountNumber: form.bankAccountNumber });
      setMsg('Zapisano.');
      refresh();
    } catch (e: any) { setMsg(e.message); }
  };
  const changePw = async () => {
    try { await api.post('/profile/password', pw); setMsg('Hasło zostało zmienione.'); setPw({ oldPassword: '', password: '' }); }
    catch (e: any) { setMsg(e.message); }
  };

  const isCompany = form.type === 2;

  return (
    <div className="grid cols-2">
      <div className="card pad">
        <h3>Dane osobowe / firmowe</h3>
        {msg && <div className="alert info">{msg}</div>}
        <label className="field"><span>Typ konta</span>
          <select value={form.type} onChange={(e) => set('type', Number(e.target.value))}>
            <option value={1}>Osoba prywatna</option>
            <option value={2}>Firma</option>
          </select>
        </label>
        {isCompany ? (
          <>
            <Field label="Nazwa firmy" v={form.companyName} on={(v) => set('companyName', v)} />
            <Field label="Numer podatkowy (NIP)" v={form.taxNumber} on={(v) => set('taxNumber', v)} />
          </>
        ) : (
          <>
            <Field label="Imię" v={form.firstName} on={(v) => set('firstName', v)} />
            <Field label="Nazwisko" v={form.lastName} on={(v) => set('lastName', v)} />
            <Field label="Numer PESEL" v={form.personalNumber} on={(v) => set('personalNumber', v)} />
          </>
        )}
        <Field label="Adres" v={form.address} on={(v) => set('address', v)} />
        <div style={{ display: 'flex', gap: 10 }}>
          <Field label="Kod pocztowy" v={form.postalCode} on={(v) => set('postalCode', v)} />
          <Field label="Miasto" v={form.city} on={(v) => set('city', v)} />
        </div>
        <Field label="Telefon" v={form.phone} on={(v) => set('phone', v)} />
        <Field label="Numer konta bankowego" v={form.bankAccountNumber} on={(v) => set('bankAccountNumber', v)} />
        <button className="btn primary" onClick={save}>Zapisz zmiany</button>
      </div>

      <div>
        <div className="card pad" style={{ marginBottom: 16 }}>
          <h3>Zmiana hasła</h3>
          <label className="field"><span>Obecne hasło</span>
            <input type="password" value={pw.oldPassword} onChange={(e) => setPw({ ...pw, oldPassword: e.target.value })} />
          </label>
          <label className="field"><span>Nowe hasło</span>
            <input type="password" value={pw.password} onChange={(e) => setPw({ ...pw, password: e.target.value })} />
          </label>
          <button className="btn" onClick={changePw}>Zaktualizuj hasło</button>
        </div>
        <div className="card pad">
          <h3>Strefa niebezpieczna</h3>
          <p className="muted">Usunięcie konta jest nieodwracalne i możliwe tylko przy braku aktywnych środków.</p>
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
    const password = prompt('Wprowadź hasło, aby potwierdzić usunięcie konta:');
    if (!password) return;
    try {
      await api.post('/profile/delete', { password });
      logout();
      nav('/login');
    } catch (e: any) { alert(e.message); }
  };
  return <button className="btn danger" onClick={del}>Usuń konto</button>;
}

function Agreements() {
  const [data, setData] = useState<any>(null);
  useEffect(() => { api.get('/profile/rules').then(setData); }, []);
  if (!data) return <div className="spinner">Ładowanie…</div>;
  const accept = async () => { await api.post('/profile/rules', {}); setData({ ...data, accepted: [...data.accepted, 2] }); alert('Zgody zaakceptowane.'); };
  return (
    <div className="card pad">
      <h3>Zgody prawne (RODO / GDPR)</h3>
      <table>
        <thead><tr><th>Zgoda</th><th>Wymagana</th><th>Status</th></tr></thead>
        <tbody>
          {data.rules.map((r: any) => (
            <tr key={r.id}>
              <td>{r.name}<div className="muted" style={{ fontSize: 12 }}>{r.content}</div></td>
              <td>{r.required ? <span className="badge red">wymagana</span> : <span className="badge gray">opcjonalna</span>}</td>
              <td><span className="badge green">zaakceptowana</span></td>
            </tr>
          ))}
        </tbody>
      </table>
      <button className="btn" style={{ marginTop: 12 }} onClick={accept}>Zaakceptuj ponownie wszystkie zgody</button>
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
