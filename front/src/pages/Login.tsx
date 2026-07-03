import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState('jan@divideyou.test');
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
      setError(err.message || 'Login failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="brand">Divide<span>You</span></div>
        <div className="tag">Sign in to your account</div>
        <div className="card pad">
          <form onSubmit={submit}>
            {error && <div className="alert error">{error}</div>}
            <label className="field">
              <span>Email</span>
              <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
            </label>
            <label className="field">
              <span>Password</span>
              <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required />
            </label>
            <button className="btn primary" style={{ width: '100%' }} disabled={busy}>
              {busy ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
          <div style={{ marginTop: 16, textAlign: 'center' }} className="muted">
            No account? <Link to="/register">Register</Link>
          </div>
          <div style={{ marginTop: 18, fontSize: 12 }} className="muted">
            Demo: jan@divideyou.test / Password1 · anna@divideyou.test (partner)
          </div>
        </div>
      </div>
    </div>
  );
}
