import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock } from 'lucide-react';
import { useAuth } from '../auth';

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState('admin@divideyou.test');
  const [password, setPassword] = useState('Password1');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(email, password);
      nav('/statistics');
    } catch (err: any) {
      setError(err.message || 'Logowanie nie powiodło się');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-wrap">
      <form className="auth-card" onSubmit={submit}>
        <div className="brand-row">
          <img src="/logo-divideyou.png" alt="" />
          <span className="word">DivideYou</span>
          <span className="tag">CMS</span>
        </div>
        <h1>Panel administracyjny</h1>
        <p className="sub">Zaloguj się, aby zarządzać platformą.</p>
        {error && <div className="alert error">⚠ {error}</div>}
        <label className="field" style={{ marginBottom: 14 }}>
          <span>Adres e-mail</span>
          <div style={{ position: 'relative' }}>
            <Mail size={16} style={{ position: 'absolute', left: 12, top: 11, color: 'var(--ink-3)' }} />
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} style={{ paddingLeft: 36 }} autoFocus />
          </div>
        </label>
        <label className="field" style={{ marginBottom: 18 }}>
          <span>Hasło</span>
          <div style={{ position: 'relative' }}>
            <Lock size={16} style={{ position: 'absolute', left: 12, top: 11, color: 'var(--ink-3)' }} />
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} style={{ paddingLeft: 36 }} />
          </div>
        </label>
        <button className="btn primary" type="submit" disabled={busy} style={{ width: '100%', height: 44 }}>
          {busy ? 'Logowanie…' : 'Zaloguj się do CMS'}
        </button>
        <p className="muted" style={{ fontSize: 12, textAlign: 'center', margin: '18px 0 0' }}>
          Dostęp tylko dla autoryzowanych administratorów.
        </p>
      </form>
    </div>
  );
}
