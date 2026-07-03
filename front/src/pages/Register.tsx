import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Users, ShieldCheck } from 'lucide-react';
import { api } from '../api';
import { useAuth } from '../auth';

export default function Register() {
  const { partnerNumber } = useParams();
  const { login } = useAuth();
  const nav = useNavigate();
  const [company, setCompany] = useState(false);
  const [form, setForm] = useState({ name: '', identifier: '', email: '', password: '' });
  const [regulamin, setRegulamin] = useState(false);
  const [rodo, setRodo] = useState(false);
  const [rules, setRules] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get('/registration-rules').then(setRules).catch(() => {});
  }, []);

  const set = (k: string, v: string) => setForm({ ...form, [k]: v });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regulamin || !rodo) return setError('Musisz zaakceptować wymagane zgody');
    setBusy(true);
    setError('');
    try {
      await api.post('/register', { ...form, agreement: true, partnerNumber });
      await login(form.email, form.password);
      nav('/news');
    } catch (err: any) {
      setError(err.message || 'Rejestracja nie powiodła się');
    } finally {
      setBusy(false);
    }
  };

  const requiredNames = rules.filter((r) => r.required).map((r) => r.name).join(', ');

  return (
    <div className="auth-split">
      <div className="auth-left">
        <div className="auth-brand">
          <img src="/logo-divideyou.png" alt="" />
          <span>DivideYou</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div className="auth-eyebrow">Portfel · Programy · Prowizje</div>
          <h1 className="auth-h1">Oszczędzaj, korzystaj z programów i zarabiaj na poleceniach.</h1>
          <p className="auth-lead">
            Platforma ekonomii współdzielenia. Doładuj portfel w JR, wybierz program w swojej okolicy
            i rozliczaj się w pełni przejrzyście.
          </p>
        </div>
        <div className="auth-stats">
          <div className="auth-stat">
            <div className="n dy-num">1 JR = 1,00 zł</div>
            <div className="l">kurs stały</div>
          </div>
          <div className="auth-divider" />
          <div className="auth-stat">
            <div className="n dy-num">14 dni</div>
            <div className="l">dostęp demo</div>
          </div>
        </div>
        <div className="auth-foot"><ShieldCheck size={16} /> Twoje dane chronione zgodnie z RODO.</div>
      </div>

      <div className="auth-right">
        <form className="auth-form" onSubmit={submit}>
          <h2>Załóż konto</h2>
          <p className="sub">14 dni dostępu demo, bez zobowiązań.</p>

          {partnerNumber && (
            <div className="banner info" style={{ marginBottom: 18 }}>
              <span className="banner-ic"><Users size={18} /></span>
              <div className="grow">
                <div className="banner-title">Zaproszenie od partnera</div>
                <div className="banner-text">Rejestrujesz się z polecenia #{partnerNumber}.</div>
              </div>
            </div>
          )}

          {error && <div className="err-alert">{error}</div>}

          <div className="seg">
            <button type="button" className={!company ? 'active' : ''} onClick={() => setCompany(false)}>Osoba prywatna</button>
            <button type="button" className={company ? 'active' : ''} onClick={() => setCompany(true)}>Firma</button>
          </div>

          <div className="grid-2">
            <div className="field">
              <label className="label">{company ? 'Nazwa firmy' : 'Imię i nazwisko'}</label>
              <input className="input" value={form.name} onChange={(e) => set('name', e.target.value)} required />
            </div>
            <div className="field">
              <label className="label">{company ? 'NIP' : 'PESEL'}</label>
              <input className="input" value={form.identifier} onChange={(e) => set('identifier', e.target.value)} />
            </div>
          </div>

          <div className="field">
            <label className="label">Adres e-mail</label>
            <input className="input" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} required />
          </div>
          <div className="field">
            <label className="label">Hasło</label>
            <input className="input" type="password" value={form.password} onChange={(e) => set('password', e.target.value)} required minLength={6} />
          </div>

          <label className="check" style={{ marginBottom: 10 }}>
            <input type="checkbox" checked={regulamin} onChange={(e) => setRegulamin(e.target.checked)} />
            <span>Akceptuję {requiredNames || 'Regulamin oraz Politykę prywatności'}.</span>
          </label>
          <label className="check" style={{ marginBottom: 20 }}>
            <input type="checkbox" checked={rodo} onChange={(e) => setRodo(e.target.checked)} />
            <span>Zgoda na przetwarzanie danych (RODO) w celu obsługi konta.</span>
          </label>

          <button className="btn btn-primary btn-block" style={{ height: 50 }} disabled={busy}>
            {busy ? 'Tworzenie…' : 'Utwórz konto demo'}
          </button>

          <p style={{ textAlign: 'center', color: 'var(--ink-2)', fontSize: 14, margin: '22px 0 0' }}>
            Masz już konto? <Link to="/login" style={{ color: 'var(--brand-600)', fontWeight: 700 }}>Zaloguj się</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
