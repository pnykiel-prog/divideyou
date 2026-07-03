import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, ShieldCheck } from 'lucide-react';
import { useAuth } from '../auth';

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState('anna@divideyou.test');
  const [password, setPassword] = useState('Password1');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await login(email, password);
      nav('/news');
    } catch (err: any) {
      setError(err.message || 'Logowanie nie powiodło się');
    } finally {
      setBusy(false);
    }
  };

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
          <h2>Zaloguj się</h2>
          <p className="sub">Witaj ponownie. Wprowadź swoje dane.</p>
          {error && <div className="err-alert">{error}</div>}
          <div className="field">
            <label className="label">Adres e-mail</label>
            <div className="input-icon">
              <Mail size={17} />
              <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
            </div>
          </div>
          <div className="field">
            <label className="label">Hasło</label>
            <div className="input-icon">
              <Lock size={17} />
              <input className="input" value={password} onChange={(e) => setPassword(e.target.value)} type="password" required />
            </div>
          </div>
          <div className="between" style={{ marginBottom: 22 }}>
            <label className="check"><input type="checkbox" defaultChecked /> Zapamiętaj mnie</label>
            <Link to="/register" style={{ color: 'var(--brand-600)', fontWeight: 600, fontSize: 13.5 }}>Nie pamiętasz hasła?</Link>
          </div>
          <button type="submit" className="btn btn-primary btn-block" style={{ height: 50 }} disabled={busy}>
            {busy ? 'Logowanie…' : 'Zaloguj się'}
          </button>
          <p style={{ textAlign: 'center', color: 'var(--ink-2)', fontSize: 14, margin: '22px 0 0' }}>
            Nie masz konta? <Link to="/register" style={{ color: 'var(--brand-600)', fontWeight: 700 }}>Załóż konto demo</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
