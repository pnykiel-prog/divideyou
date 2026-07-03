import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth';
import { useToast, Spinner, ErrorAlert } from '../ui';
import { Download, Lock } from 'lucide-react';

export default function Settings() {
  const { tab = 'data' } = useParams();
  return (
    <div>
      <div className="screen-head">
        <h1 className="screen-title dy-h">Ustawienia</h1>
        <p className="screen-sub">Zarządzaj danymi konta i zgodami prawnymi.</p>
      </div>
      <div className="tabs" style={{ marginBottom: 20 }}>
        <Link to="/settings/data" className={`tab${tab === 'data' ? ' active' : ''}`}>Dane</Link>
        <Link to="/settings/agreements" className={`tab${tab === 'agreements' ? ' active' : ''}`}>Zgody</Link>
      </div>
      {tab === 'agreements' ? <Agreements /> : <DataForm />}
    </div>
  );
}

function DataForm() {
  const { refresh } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState<any>(null);
  const [pw, setPw] = useState({ oldPassword: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/profile/data').then((d) => setForm({ ...d.profile }));
  }, []);
  if (!form) return <Spinner />;

  const set = (k: string, v: any) => setForm({ ...form, [k]: v });
  const save = async () => {
    setError('');
    try {
      await api.post('/profile/data', form);
      await api.post('/profile/payment-data', { bankAccountNumber: form.bankAccountNumber });
      toast('Zapisano zmiany');
      refresh();
    } catch (e: any) { setError(e.message); }
  };
  const changePw = async () => {
    setError('');
    try {
      await api.post('/profile/password', pw);
      toast('Hasło zostało zmienione');
      setPw({ oldPassword: '', password: '' });
      setShowPw(false);
    } catch (e: any) { setError(e.message); }
  };

  const isCompany = form.type === 2;

  return (
    <div className="card card-pad" style={{ maxWidth: 820 }}>
      {error && <ErrorAlert>{error}</ErrorAlert>}

      <div className="seg" style={{ maxWidth: 380 }}>
        <button className={!isCompany ? 'active' : ''} onClick={() => set('type', 1)}>Osoba prywatna</button>
        <button className={isCompany ? 'active' : ''} onClick={() => set('type', 2)}>Firma</button>
      </div>

      <div className="grid-2">
        {isCompany ? (
          <>
            <Field label="Nazwa firmy" v={form.companyName} on={(v) => set('companyName', v)} />
            <Field label="NIP" v={form.taxNumber} on={(v) => set('taxNumber', v)} />
          </>
        ) : (
          <>
            <Field label="Imię i nazwisko" v={[form.firstName, form.lastName].filter(Boolean).join(' ')} on={(v) => {
              const [first, ...rest] = v.split(' ');
              setForm({ ...form, firstName: first || '', lastName: rest.join(' ') });
            }} />
            <Field label="PESEL" v={form.personalNumber} on={(v) => set('personalNumber', v)} />
          </>
        )}
        <Field label="E-mail" v={form.email} on={() => {}} disabled />
        <Field label="Telefon" v={form.phone} on={(v) => set('phone', v)} />
        <Field label="Adres" v={form.address} on={(v) => set('address', v)} />
        <div className="row" style={{ gap: 12, alignItems: 'flex-end' }}>
          <Field label="Kod pocztowy" v={form.postalCode} on={(v) => set('postalCode', v)} />
          <Field label="Miasto" v={form.city} on={(v) => set('city', v)} />
        </div>
        <Field label="Numer konta bankowego" v={form.bankAccountNumber} on={(v) => set('bankAccountNumber', v)} />
      </div>

      {showPw && (
        <div className="card card-pad" style={{ background: 'var(--bg)', marginTop: 6, marginBottom: 18 }}>
          <div className="card-title" style={{ marginBottom: 12 }}>Zmiana hasła</div>
          <div className="grid-2">
            <div className="field" style={{ margin: 0 }}>
              <label className="label">Obecne hasło</label>
              <input className="input" type="password" value={pw.oldPassword} onChange={(e) => setPw({ ...pw, oldPassword: e.target.value })} />
            </div>
            <div className="field" style={{ margin: 0 }}>
              <label className="label">Nowe hasło</label>
              <input className="input" type="password" value={pw.password} onChange={(e) => setPw({ ...pw, password: e.target.value })} />
            </div>
          </div>
          <button className="btn btn-primary btn-sm" style={{ marginTop: 14 }} onClick={changePw}>Zaktualizuj hasło</button>
        </div>
      )}

      <div className="row wrap" style={{ gap: 10, marginTop: 8, paddingTop: 18, borderTop: '1px solid var(--line)' }}>
        <button className="btn btn-primary" onClick={save}>Zapisz zmiany</button>
        <button className="btn btn-outline" onClick={() => setShowPw((s) => !s)}>
          <Lock size={16} /> Zmień hasło
        </button>
        <div className="grow" />
        <DeleteAccount />
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
  return <button className="btn btn-danger" onClick={del}>Usuń konto</button>;
}

function Agreements() {
  const toast = useToast();
  const [data, setData] = useState<any>(null);
  useEffect(() => { api.get('/profile/rules').then(setData); }, []);
  if (!data) return <Spinner />;
  const accept = async () => {
    await api.post('/profile/rules', {});
    setData({ ...data, accepted: [...data.accepted, 2] });
    toast('Zgody zaakceptowane');
  };
  return (
    <div className="card">
      <div className="card-head">
        <span className="card-title">Zgody prawne (RODO / GDPR)</span>
        <button className="btn btn-outline btn-sm" onClick={accept}>Zaakceptuj ponownie</button>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table className="dy-table">
          <thead>
            <tr><th>Dokument</th><th>Wymagana</th><th>Status</th><th>Akcja</th></tr>
          </thead>
          <tbody>
            {data.rules.map((r: any) => (
              <tr key={r.id}>
                <td>
                  <div style={{ fontWeight: 700 }}>{r.name}</div>
                  {r.content && <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>{r.content}</div>}
                </td>
                <td>{r.required ? 'Tak' : 'Nie'}</td>
                <td><span className="badge badge-ok">Zaakceptowana</span></td>
                <td>
                  <a className="row" style={{ gap: 5, color: 'var(--brand-600)', fontWeight: 700, cursor: 'pointer' }} onClick={() => toast('Pobieranie dokumentu…')}>
                    <Download size={15} /> PDF
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Field({ label, v, on, disabled }: { label: string; v: any; on: (v: string) => void; disabled?: boolean }) {
  return (
    <div className="field" style={{ margin: 0, flex: 1 }}>
      <label className="label">{label}</label>
      <input className="input" value={v || ''} disabled={disabled} onChange={(e) => on(e.target.value)} />
    </div>
  );
}
