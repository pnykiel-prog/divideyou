import { useEffect, useState } from 'react';
import { api, date } from '../api';
import { useAuth } from '../auth';
import { Spinner, Empty, Field, YesNo, ErrorAlert } from '../components/ui';
import Modal from '../components/Modal';
import { PERMISSION_KEYS, PERMISSION_LEVELS } from '../constants';

export default function Admins() {
  const { admin } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);
  const [showAdd, setShowAdd] = useState(false);

  const load = () => {
    setLoading(true);
    api
      .get('/admin/users/admins')
      .then((r) => setItems(Array.isArray(r) ? r : r.items || []))
      .catch(setError)
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  return (
    <div>
      <div className="page-head">
        <h1>Administratorzy CMS</h1>
        {admin?.superAdmin && (
          <button className="btn primary" onClick={() => setShowAdd(true)}>
            + Dodaj użytkownika
          </button>
        )}
      </div>

      <ErrorAlert error={error} />

      <div className="card">
        {loading ? (
          <Spinner />
        ) : items.length === 0 ? (
          <Empty>Nie znaleziono administratorów.</Empty>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Imię</th>
                <th>E-mail</th>
                <th>Telefon</th>
                <th>Super administrator</th>
                <th>Ostatnie logowanie</th>
              </tr>
            </thead>
            <tbody>
              {items.map((a) => (
                <tr key={a.id}>
                  <td>
                    <b>{a.name || [a.firstName, a.lastName].filter(Boolean).join(' ') || '—'}</b>
                  </td>
                  <td>{a.email}</td>
                  <td>{a.phone || '—'}</td>
                  <td>
                    <YesNo value={a.superAdmin} />
                  </td>
                  <td>{date(a.lastLogin || a.lastLoginAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showAdd && (
        <AddUserModal
          onClose={() => setShowAdd(false)}
          onSaved={() => {
            setShowAdd(false);
            load();
          }}
        />
      )}
    </div>
  );
}

function AddUserModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [type, setType] = useState(2); // 1 client / 2 admin
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [phone, setPhone] = useState('');
  const [permissions, setPermissions] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<any>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const body: any = { email, password, type, name, firstName, lastName, companyName, phone };
      if (type === 2) body.permissions = permissions;
      await api.post('/admin/users', body);
      onSaved();
    } catch (err: any) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title="Dodaj użytkownika" onClose={onClose} wide>
      <form onSubmit={submit}>
        <ErrorAlert error={error} />
        <Field label="Typ konta">
          <select value={type} onChange={(e) => setType(Number(e.target.value))}>
            <option value={1}>Klient</option>
            <option value={2}>Administrator CMS</option>
          </select>
        </Field>
        <div className="grid cols-2">
          <Field label="E-mail">
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </Field>
          <Field label="Hasło">
            <input value={password} onChange={(e) => setPassword(e.target.value)} required />
          </Field>
        </div>
        <div className="grid cols-2">
          <Field label="Imię">
            <input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
          </Field>
          <Field label="Nazwisko">
            <input value={lastName} onChange={(e) => setLastName(e.target.value)} />
          </Field>
        </div>
        <div className="grid cols-2">
          <Field label="Nazwa (wyświetlana)">
            <input value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Telefon">
            <input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </Field>
        </div>
        {type === 1 && (
          <Field label="Nazwa firmy">
            <input value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
          </Field>
        )}
        {type === 2 && (
          <div style={{ marginBottom: 14 }}>
            <span style={{ fontWeight: 600, fontSize: 13, display: 'block', marginBottom: 8 }}>
              Uprawnienia
            </span>
            <div className="card">
              <table>
                <tbody>
                  {PERMISSION_KEYS.map((p) => (
                    <tr key={p.key}>
                      <td>{p.label}</td>
                      <td style={{ width: 160 }}>
                        <select
                          value={permissions[p.key] ?? 0}
                          onChange={(e) =>
                            setPermissions((prev) => ({ ...prev, [p.key]: Number(e.target.value) }))
                          }
                        >
                          {PERMISSION_LEVELS.map((l) => (
                            <option key={l.value} value={l.value}>
                              {l.label}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        <div className="btn-row" style={{ justifyContent: 'flex-end', marginTop: 8 }}>
          <button type="button" className="btn ghost" onClick={onClose}>
            Anuluj
          </button>
          <button type="submit" className="btn primary" disabled={busy}>
            {busy ? 'Zapisywanie…' : 'Utwórz użytkownika'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
