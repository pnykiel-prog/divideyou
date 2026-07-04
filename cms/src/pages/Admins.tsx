import { useEffect, useState } from 'react';
import { Shield, Plus } from 'lucide-react';
import { api, date } from '../api';
import { useAuth } from '../auth';
import { Spinner, Empty, Field, ErrorAlert } from '../components/ui';
import Modal from '../components/Modal';
import { PERMISSION_KEYS, PERMISSION_LEVELS } from '../constants';

const nameOf = (a: any) =>
  a?.name || [a?.firstName, a?.lastName].filter(Boolean).join(' ') || a?.email || '—';

export default function Admins() {
  const { admin } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);
  const [showAdd, setShowAdd] = useState(false);

  const [selectedId, setSelectedId] = useState<any>(null);
  const [permissions, setPermissions] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    api
      .get('/admin/users/admins')
      .then((r) => setItems(Array.isArray(r) ? r : r.items || []))
      .catch(setError)
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  // Auto-select first admin once loaded.
  useEffect(() => {
    if (items.length && (selectedId == null || !items.some((a) => a.id === selectedId))) {
      setSelectedId(items[0].id);
    }
  }, [items]); // eslint-disable-line react-hooks/exhaustive-deps

  const selected = items.find((a) => a.id === selectedId) || null;

  // Sync the local matrix state to the selected admin.
  useEffect(() => {
    setPermissions(selected?.permissions || {});
    setMsg(null);
  }, [selectedId, items]); // eslint-disable-line react-hooks/exhaustive-deps

  const savePerms = async () => {
    if (!selected) return;
    setSaving(true);
    setError(null);
    setMsg(null);
    try {
      await api.patch(`/admin/users/${selected.id}/user-data`, {
        name: selected.name,
        phone: selected.phone,
        permissions,
      });
      setMsg('Zapisano uprawnienia');
      load();
    } catch (err: any) {
      setError(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Administratorzy</h1>
          <p className="sub">Konta CMS i uprawnienia per-moduł.</p>
        </div>
        {admin?.superAdmin && (
          <button className="btn primary" onClick={() => setShowAdd(true)}>
            <Plus size={17} /> Dodaj administratora
          </button>
        )}
      </div>

      <ErrorAlert error={error} />

      {loading ? (
        <div className="card">
          <Spinner />
        </div>
      ) : items.length === 0 ? (
        <div className="card">
          <Empty>Nie znaleziono administratorów.</Empty>
        </div>
      ) : (
        <div className="grid" style={{ gridTemplateColumns: '1fr 1.15fr' }}>
          {/* LEFT — accounts */}
          <div className="card pad">
            <h3 style={{ margin: '0 0 14px' }}>Konta administratorów</h3>
            <div>
              {items.map((a) => {
                const active = a.id === selectedId;
                return (
                  <div
                    key={a.id}
                    onClick={() => setSelectedId(a.id)}
                    style={{
                      display: 'flex',
                      gap: 12,
                      alignItems: 'flex-start',
                      padding: '12px 12px',
                      borderRadius: 11,
                      cursor: 'pointer',
                      border: '1px solid ' + (active ? 'var(--brand)' : 'transparent'),
                      background: active ? 'var(--brand-tint)' : 'transparent',
                      marginBottom: 4,
                    }}
                  >
                    <div className="av-sq">
                      <Shield size={18} />
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <b style={{ display: 'block' }}>{nameOf(a)}</b>
                      <div className="muted" style={{ fontSize: 12.5, marginTop: 2 }}>
                        {a.email}
                      </div>
                      <div className="muted" style={{ fontSize: 12 }}>
                        ost. logowanie {date(a.lastLogin || a.lastLoginAt)}
                      </div>
                    </div>
                    <span className={`badge ${a.superAdmin ? 'green' : 'blue'}`}>
                      {a.superAdmin ? 'Super administrator' : 'Administrator'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* RIGHT — permission matrix */}
          <div className="card pad">
            <div
              style={{
                display: 'flex',
                alignItems: 'baseline',
                justifyContent: 'space-between',
                gap: 12,
                flexWrap: 'wrap',
                marginBottom: 14,
              }}
            >
              <h3 style={{ margin: 0 }}>Macierz uprawnień — {nameOf(selected)}</h3>
              <span className="muted" style={{ fontSize: 12 }}>
                0 = brak · 1 = podgląd · 2 = edycja
              </span>
            </div>

            {msg && <div className="alert info">✓ {msg}</div>}

            <div className="table-card">
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Moduł</th>
                      {PERMISSION_LEVELS.map((l) => (
                        <th key={l.value} style={{ textAlign: 'center', width: 90 }}>
                          {l.value === 0 ? 'Brak' : l.value === 1 ? 'Podgląd' : 'Edycja'}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {PERMISSION_KEYS.map((p) => {
                      const level = permissions[p.key] ?? 0;
                      return (
                        <tr key={p.key}>
                          <td>{p.label}</td>
                          {PERMISSION_LEVELS.map((l) => (
                            <td key={l.value} style={{ textAlign: 'center' }}>
                              <button
                                type="button"
                                className={`perm-sq${level === l.value ? ' on' : ''}`}
                                onClick={() =>
                                  setPermissions((prev) => ({ ...prev, [p.key]: l.value }))
                                }
                              >
                                {l.value}
                              </button>
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="btn-row" style={{ justifyContent: 'flex-end', marginTop: 16 }}>
              <button
                className="btn primary"
                onClick={savePerms}
                disabled={saving || !selected}
              >
                {saving ? 'Zapisywanie…' : 'Zapisz uprawnienia'}
              </button>
            </div>
          </div>
        </div>
      )}

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
    <Modal title="Dodaj administratora" onClose={onClose} wide>
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
            <span style={{ fontWeight: 600, fontSize: 13, display: 'block', margin: '10px 0 8px' }}>
              Uprawnienia
            </span>
            <div className="table-card">
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Moduł</th>
                      {PERMISSION_LEVELS.map((l) => (
                        <th key={l.value} style={{ textAlign: 'center', width: 90 }}>
                          {l.value === 0 ? 'Brak' : l.value === 1 ? 'Podgląd' : 'Edycja'}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {PERMISSION_KEYS.map((p) => {
                      const level = permissions[p.key] ?? 0;
                      return (
                        <tr key={p.key}>
                          <td>{p.label}</td>
                          {PERMISSION_LEVELS.map((l) => (
                            <td key={l.value} style={{ textAlign: 'center' }}>
                              <button
                                type="button"
                                className={`perm-sq${level === l.value ? ' on' : ''}`}
                                onClick={() =>
                                  setPermissions((prev) => ({ ...prev, [p.key]: l.value }))
                                }
                              >
                                {l.value}
                              </button>
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
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
