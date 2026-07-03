import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';
import { Field } from '../components/ui';

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
      nav('/users');
    } catch (err: any) {
      setError(err.message || 'Logowanie nie powiodło się');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-wrap">
      <form className="auth-card card pad" onSubmit={submit}>
        <div className="brand">
          Divide<span>You</span>
        </div>
        <div className="tag">Panel administracyjny CMS</div>
        {error && <div className="alert error">⚠ {error}</div>}
        <Field label="E-mail">
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />
        </Field>
        <Field label="Hasło">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>
        <button className="btn primary" type="submit" disabled={busy} style={{ width: '100%' }}>
          {busy ? 'Logowanie…' : 'Zaloguj się'}
        </button>
      </form>
    </div>
  );
}
