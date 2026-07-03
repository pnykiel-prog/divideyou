import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api, jr, pln, date } from '../api';
import { Spinner, Empty, Field, StatusBadge, ErrorAlert } from '../components/ui';
import { PERMISSION_KEYS, PERMISSION_LEVELS } from '../constants';

type Tab = 'data' | 'payments' | 'programs' | 'partnership';
const TABS: { key: Tab; label: string }[] = [
  { key: 'data', label: 'Data' },
  { key: 'payments', label: 'Payments' },
  { key: 'programs', label: 'Programs' },
  { key: 'partnership', label: 'Partnership' },
];

export default function UserDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);
  const [tab, setTab] = useState<Tab>('data');
  const [msg, setMsg] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    api
      .get(`/admin/users/${id}`)
      .then(setUser)
      .catch(setError)
      .finally(() => setLoading(false));
  };
  useEffect(load, [id]);

  const act = async (fn: () => Promise<any>, okMsg: string) => {
    setError(null);
    setMsg(null);
    try {
      await fn();
      setMsg(okMsg);
      load();
    } catch (err: any) {
      setError(err);
    }
  };

  if (loading) return <Spinner />;
  if (error && !user) return <ErrorAlert error={error} />;
  if (!user) return <Empty>User not found.</Empty>;

  const blocked = user.blockedStatus === 3;
  const displayName =
    user.type === 2
      ? user.client?.companyName || user.client?.name
      : [user.client?.firstName, user.client?.lastName].filter(Boolean).join(' ') ||
        user.admin?.name;

  const donate = () => {
    const value = prompt('JR donation amount:');
    if (value) act(() => api.post(`/admin/users/${id}/account-donation`, { value: Number(value) }), 'Donation added');
  };
  const assignPartner = () => {
    const partner = prompt('Partner number:');
    if (partner) act(() => api.patch(`/admin/users/${id}/assign-partner`, { partner }), 'Partner assigned');
  };
  const doDelete = () => {
    if (confirm('Delete this user permanently?'))
      act(() => api.del(`/admin/users/${id}/delete`).then(() => nav('/users')), 'Deleted');
  };

  return (
    <div>
      <div className="page-head">
        <div>
          <Link to="/users" className="muted">
            ← Users
          </Link>
          <h1 style={{ marginTop: 6 }}>
            {displayName || user.email}{' '}
            {blocked && <span className="badge red">Blocked</span>}{' '}
            {user.emailConfirmed ? (
              <span className="badge green">Confirmed</span>
            ) : (
              <span className="badge amber">Unconfirmed</span>
            )}
          </h1>
          <div className="muted">
            {user.email} · {user.type === 2 ? 'Company' : 'Private'} · #{user.id}
          </div>
        </div>
      </div>

      {msg && <div className="alert info">✓ {msg}</div>}
      <ErrorAlert error={error} />

      <div className="card pad" style={{ marginBottom: 20 }}>
        <div className="btn-row">
          <button
            className={`btn sm ${blocked ? '' : 'danger'}`}
            onClick={() =>
              act(
                () => api.patch(`/admin/users/${id}/block`, { status: blocked ? 0 : 1 }),
                blocked ? 'Unblocked' : 'Blocked'
              )
            }
          >
            {blocked ? 'Unblock' : 'Block'}
          </button>
          <button
            className="btn sm"
            onClick={() => act(() => api.patch(`/admin/users/${id}/confirm-email`), 'Email confirmed')}
          >
            Confirm email
          </button>
          <button
            className="btn sm"
            onClick={() =>
              act(() => api.patch(`/admin/users/${id}/confirm-full-access`), 'Full access confirmed')
            }
          >
            Confirm full access
          </button>
          <button
            className="btn sm"
            onClick={() =>
              act(() => api.patch(`/admin/users/${id}/allow-only-pay`), 'Only-pay toggled')
            }
          >
            Toggle only-pay {user.onlyPay ? '(on)' : '(off)'}
          </button>
          <button className="btn sm" onClick={donate}>
            + JR donation
          </button>
          <button className="btn sm" onClick={assignPartner}>
            Assign partner
          </button>
          <button className="btn sm danger" onClick={doDelete}>
            Delete
          </button>
        </div>
      </div>

      <div className="tabs">
        {TABS.map((t) => (
          <a
            key={t.key}
            className={tab === t.key ? 'active' : ''}
            style={{ cursor: 'pointer' }}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </a>
        ))}
      </div>

      {tab === 'data' && <DataTab user={user} onSaved={load} />}
      {tab === 'payments' && <PaymentsTab id={id!} />}
      {tab === 'programs' && <ProgramsTab id={id!} />}
      {tab === 'partnership' && <PartnershipTab id={id!} />}
    </div>
  );
}

/* ---------- Data tab ---------- */
function WalletCard({ wallet }: { wallet: any }) {
  if (!wallet) return null;
  const buckets: [string, string][] = [
    ['active', 'Active'],
    ['pending', 'Pending'],
    ['inactive', 'Inactive'],
    ['toPayout', 'To payout'],
    ['toCommissionPayout', 'Commission payout'],
    ['blocked', 'Blocked'],
  ];
  return (
    <div className="card pad" style={{ marginBottom: 20 }}>
      <h3>Wallet</h3>
      <div className="grid cols-3">
        {buckets.map(([key, label]) => (
          <div className="stat" key={key}>
            <div className="label">{label}</div>
            <div className="value" style={{ fontSize: 20 }}>
              {jr(wallet[key])}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DataTab({ user, onSaved }: { user: any; onSaved: () => void }) {
  const isAdmin = user.type === 2 && user.admin && !user.client;
  const [form, setForm] = useState<any>(() => ({ ...(user.client || user.admin || {}) }));
  const [permissions, setPermissions] = useState<Record<string, number>>(
    () => user.admin?.permissions || {}
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<any>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const save = async () => {
    setBusy(true);
    setError(null);
    setMsg(null);
    try {
      const body: any = { ...form };
      if (user.admin) body.permissions = permissions;
      await api.patch(`/admin/users/${user.id}/user-data`, body);
      setMsg('Saved');
      onSaved();
    } catch (err: any) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  const clientFields =
    user.type === 2
      ? [
          ['companyName', 'Company name'],
          ['nip', 'NIP'],
          ['phone', 'Phone'],
          ['address', 'Address'],
          ['city', 'City'],
          ['postalCode', 'Postal code'],
        ]
      : [
          ['firstName', 'First name'],
          ['lastName', 'Last name'],
          ['phone', 'Phone'],
          ['address', 'Address'],
          ['city', 'City'],
          ['postalCode', 'Postal code'],
        ];

  return (
    <div>
      <WalletCard wallet={user.wallet} />
      <div className="card pad">
        <h3>{isAdmin ? 'Admin data' : 'Personal / company data'}</h3>
        {msg && <div className="alert info">✓ {msg}</div>}
        <ErrorAlert error={error} />

        {user.admin ? (
          <>
            <div className="grid cols-2">
              <Field label="Name">
                <input value={form.name || ''} onChange={(e) => set('name', e.target.value)} />
              </Field>
              <Field label="Phone">
                <input value={form.phone || ''} onChange={(e) => set('phone', e.target.value)} />
              </Field>
            </div>
            <span style={{ fontWeight: 600, fontSize: 13, display: 'block', margin: '8px 0' }}>
              Permissions
            </span>
            <div className="card" style={{ marginBottom: 14 }}>
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
          </>
        ) : (
          <div className="grid cols-2">
            {clientFields.map(([k, label]) => (
              <Field key={k} label={label}>
                <input value={form[k] || ''} onChange={(e) => set(k, e.target.value)} />
              </Field>
            ))}
          </div>
        )}

        <div className="btn-row" style={{ justifyContent: 'flex-end' }}>
          <button className="btn primary" onClick={save} disabled={busy}>
            {busy ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- Payments tab ---------- */
function PaymentsTab({ id }: { id: string }) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);

  useEffect(() => {
    setLoading(true);
    api
      .get(`/admin/users/${id}/transactions`)
      .then((r) => setItems(Array.isArray(r) ? r : r.items || []))
      .catch(setError)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <Spinner />;
  return (
    <div className="card">
      <ErrorAlert error={error} />
      {items.length === 0 ? (
        <Empty>No transactions.</Empty>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Type</th>
              <th>Value</th>
              <th>PLN eq.</th>
              <th>Status</th>
              <th>Description</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {items.map((t, i) => (
              <tr key={t.id ?? i}>
                <td>{t.type}</td>
                <td>{jr(t.value)}</td>
                <td>{pln(t.plnEquivalent)}</td>
                <td>
                  <StatusBadge status={t.status} />
                </td>
                <td>{t.description || '—'}</td>
                <td>{date(t.timestamp || t.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

/* ---------- Programs tab ---------- */
function ProgramsTab({ id }: { id: string }) {
  const [locations, setLocations] = useState<any[]>([]);
  const [bonuses, setBonuses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    Promise.all([
      api.get(`/admin/users/${id}/locations`).catch(() => []),
      api.get(`/admin/users/${id}/bonuses`).catch(() => []),
    ])
      .then(([loc, bon]) => {
        setLocations((Array.isArray(loc) ? loc : loc.items) || []);
        setBonuses((Array.isArray(bon) ? bon : bon.items) || []);
      })
      .catch(setError)
      .finally(() => setLoading(false));
  };
  useEffect(load, [id]);

  const cancel = async (purchaseId: any) => {
    if (!confirm('Cancel this purchase and return JR?')) return;
    setError(null);
    try {
      await api.post(`/admin/purchases/${purchaseId}/cancellation`, { return_jr: true });
      setMsg('Purchase cancelled');
      load();
    } catch (err: any) {
      setError(err);
    }
  };

  if (loading) return <Spinner />;

  const renderTable = (title: string, rows: any[]) => (
    <div className="card" style={{ marginBottom: 20 }}>
      <div className="pad" style={{ paddingBottom: 0 }}>
        <h3>{title}</h3>
      </div>
      {rows.length === 0 ? (
        <Empty>None.</Empty>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Status</th>
              <th>Purchased</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((p, i) => (
              <tr key={p.id ?? p.purchaseId ?? i}>
                <td>
                  <b>{p.name || p.programName || p.locationName || '—'}</b>
                </td>
                <td>
                  {p.status != null ? <StatusBadge status={p.status} /> : '—'}
                </td>
                <td>{date(p.createdAt || p.purchasedAt)}</td>
                <td style={{ textAlign: 'right' }}>
                  <button
                    className="btn sm danger"
                    onClick={() => cancel(p.purchaseId ?? p.id)}
                  >
                    Cancel
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );

  return (
    <div>
      {msg && <div className="alert info">✓ {msg}</div>}
      <ErrorAlert error={error} />
      {renderTable('Program locations', locations)}
      {renderTable('Bonuses', bonuses)}
    </div>
  );
}

/* ---------- Partnership tab ---------- */
function PartnershipTab({ id }: { id: string }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [custom, setCustom] = useState(false);
  const [commission, setCommission] = useState('');
  const [min, setMin] = useState('');
  const [value, setValue] = useState('');

  const load = () => {
    setLoading(true);
    api
      .get(`/admin/users/${id}/list-commission-threshold`)
      .then((r) => {
        setData(r);
        setCustom(!!r.custom);
        setCommission(r.commission != null ? String(r.commission) : '');
      })
      .catch(setError)
      .finally(() => setLoading(false));
  };
  useEffect(load, [id]);

  const run = async (fn: () => Promise<any>, okMsg: string) => {
    setError(null);
    setMsg(null);
    try {
      await fn();
      setMsg(okMsg);
      load();
    } catch (err: any) {
      setError(err);
    }
  };

  if (loading) return <Spinner />;

  return (
    <div>
      {msg && <div className="alert info">✓ {msg}</div>}
      <ErrorAlert error={error} />

      <div className="card pad" style={{ marginBottom: 20 }}>
        <h3>Custom commission</h3>
        <div className="muted" style={{ marginBottom: 12 }}>
          Base commission: {data?.base != null ? `${data.base}%` : '—'}
        </div>
        <div className="btn-row" style={{ alignItems: 'flex-end' }}>
          <label className="field" style={{ marginBottom: 0 }}>
            <span>Use custom</span>
            <select value={custom ? '1' : '0'} onChange={(e) => setCustom(e.target.value === '1')}>
              <option value="0">No</option>
              <option value="1">Yes</option>
            </select>
          </label>
          <label className="field" style={{ marginBottom: 0 }}>
            <span>Commission %</span>
            <input
              type="number"
              value={commission}
              onChange={(e) => setCommission(e.target.value)}
              disabled={!custom}
            />
          </label>
          <button
            className="btn primary"
            onClick={() =>
              run(
                () =>
                  api.post(`/admin/users/${id}/set-custom-commission`, {
                    custom,
                    commission: Number(commission),
                  }),
                'Custom commission saved'
              )
            }
          >
            Save
          </button>
        </div>
      </div>

      <div className="card">
        <div className="pad" style={{ paddingBottom: 0 }}>
          <h3>Commission thresholds</h3>
        </div>
        {(data?.thresholds || []).length === 0 ? (
          <Empty>No thresholds.</Empty>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Min JR</th>
                <th>Commission %</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {data.thresholds.map((t: any) => (
                <tr key={t.id}>
                  <td>{jr(t.min)}</td>
                  <td>{t.value}%</td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      className="btn sm danger"
                      onClick={() =>
                        run(
                          () => api.post(`/admin/users/${id}/remove-commission-threshold`, { id: t.id }),
                          'Threshold removed'
                        )
                      }
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div className="pad btn-row" style={{ alignItems: 'flex-end' }}>
          <label className="field" style={{ marginBottom: 0 }}>
            <span>Min JR</span>
            <input type="number" value={min} onChange={(e) => setMin(e.target.value)} />
          </label>
          <label className="field" style={{ marginBottom: 0 }}>
            <span>Commission %</span>
            <input type="number" value={value} onChange={(e) => setValue(e.target.value)} />
          </label>
          <button
            className="btn"
            onClick={() =>
              run(
                () =>
                  api
                    .post(`/admin/users/${id}/add-commission-threshold`, {
                      min: Number(min),
                      value: Number(value),
                    })
                    .then(() => {
                      setMin('');
                      setValue('');
                    }),
                'Threshold added'
              )
            }
          >
            + Add threshold
          </button>
        </div>
      </div>
    </div>
  );
}
