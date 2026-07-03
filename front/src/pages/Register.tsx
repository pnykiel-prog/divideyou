import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth';

export default function Register() {
  const { partnerNumber } = useParams();
  const { login } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [agreement, setAgreement] = useState(false);
  const [rules, setRules] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get('/registration-rules').then(setRules).catch(() => {});
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreement) return setError('You must accept the required terms');
    setBusy(true);
    setError('');
    try {
      await api.post('/register', { ...form, agreement: true, partnerNumber });
      await login(form.email, form.password);
      nav('/news');
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="brand">Divide<span>You</span></div>
        <div className="tag">Create your account{partnerNumber ? ` · invited by #${partnerNumber}` : ''}</div>
        <div className="card pad">
          <form onSubmit={submit}>
            {error && <div className="alert error">{error}</div>}
            <label className="field">
              <span>Name</span>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </label>
            <label className="field">
              <span>Email</span>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            </label>
            <label className="field">
              <span>Password</span>
              <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={6} />
            </label>
            <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 16 }}>
              <input type="checkbox" style={{ width: 'auto', marginTop: 3 }} checked={agreement} onChange={(e) => setAgreement(e.target.checked)} />
              <span style={{ fontSize: 13 }} className="muted">
                I accept the {rules.filter((r) => r.required).map((r) => r.name).join(', ') || 'platform terms and privacy policy'}.
              </span>
            </label>
            <button className="btn primary" style={{ width: '100%' }} disabled={busy}>
              {busy ? 'Creating…' : 'Create account'}
            </button>
          </form>
          <div style={{ marginTop: 16, textAlign: 'center' }} className="muted">
            Already registered? <Link to="/login">Sign in</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
