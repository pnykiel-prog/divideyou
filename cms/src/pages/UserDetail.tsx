import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Plus, Check, Shield, CreditCard, Ban, Trash2 } from 'lucide-react';
import { api, jr, pln, date } from '../api';
import { Spinner, Empty, Field, StatusBadge, ErrorAlert } from '../components/ui';
import { PERMISSION_KEYS, PERMISSION_LEVELS } from '../constants';

type Tab = 'data' | 'payments' | 'programs' | 'partnership';
const TABS: { key: Tab; label: string }[] = [
  { key: 'data', label: 'Dane' },
  { key: 'payments', label: 'Płatności' },
  { key: 'programs', label: 'Programy' },
  { key: 'partnership', label: 'Partnerstwo' },
];

const LIQUIDITY: Record<number, [string, string]> = {
  1: ['Bezpieczny', 'green'],
  2: ['Ostrzeżenie', 'amber'],
  3: ['Zagrożenie', 'red'],
};
function LiquidityPill({ status }: { status: number }) {
  const [label, cls] = LIQUIDITY[status] || ['Nieznany', 'gray'];
  return (
    <span className={`badge ${cls}`}>
      <span className="pdot" />
      {label}
    </span>
  );
}

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
  if (!user) return <Empty>Nie znaleziono użytkownika.</Empty>;

  const blocked = user.blockedStatus === 3;
  const isCompany = user.type === 2;
  const displayName =
    (isCompany
      ? user.client?.companyName || user.client?.name
      : [user.client?.firstName, user.client?.lastName].filter(Boolean).join(' ') ||
        user.admin?.name) || user.email;
  const initials = String(displayName || user.email || '?')
    .split(/\s+/)
    .map((s: string) => s[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  const isPartner = !!(user.partner || user.partnerNumber || user.isPartner);
  const idCode = user.code || user.number || `#${user.id}`;

  const donate = () => {
    const value = prompt('Kwota darowizny JR:');
    if (value) act(() => api.post(`/admin/users/${id}/account-donation`, { value: Number(value) }), 'Dodano darowiznę');
  };
  const assignPartner = () => {
    const partner = prompt('Numer partnera:');
    if (partner) act(() => api.patch(`/admin/users/${id}/assign-partner`, { partner }), 'Przypisano partnera');
  };
  const doDelete = () => {
    if (confirm('Usunąć tego użytkownika bezpowrotnie?'))
      act(() => api.del(`/admin/users/${id}/delete`).then(() => nav('/users')), 'Usunięto');
  };

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Link to="/users" className="muted" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontWeight: 600 }}>
          <ArrowLeft size={16} /> Wróć do listy użytkowników
        </Link>
      </div>

      {msg && <div className="alert info">✓ {msg}</div>}
      <ErrorAlert error={error} />

      <div className="card pad" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 18, flexWrap: 'wrap' }}>
          <div className="av-sq dy-h" style={{ width: 64, height: 64, borderRadius: 14, fontSize: 22, fontWeight: 600 }}>
            {initials}
          </div>
          <div style={{ flex: 1, minWidth: 220 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <h1 className="dy-h" style={{ margin: 0, fontSize: 26 }}>{displayName}</h1>
              <LiquidityPill status={user.paymentStatus} />
              {isPartner && <span className="badge violet">Partner</span>}
              {blocked && <span className="badge red">Zablokowany</span>}
              {!user.emailConfirmed && <span className="badge amber">E-mail niepotwierdzony</span>}
            </div>
            <div className="muted" style={{ marginTop: 6 }}>
              {isCompany ? 'Firma' : 'Osoba prywatna'} · ID {idCode} · {user.email}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="muted" style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '.04em', fontWeight: 700 }}>
              Saldo aktywne
            </div>
            <div className="dy-h dy-num" style={{ fontSize: 30, marginTop: 4 }}>
              {jr(user.wallet?.active)}
            </div>
          </div>
        </div>

        <div style={{ borderTop: '1px solid var(--line)', margin: '18px 0 16px' }} />

        <div className="btn-row" style={{ alignItems: 'center' }}>
          <button className="btn primary" onClick={donate}>
            <Plus size={15} /> Dodaj JR
          </button>
          <button className="btn" onClick={() => act(() => api.patch(`/admin/users/${id}/confirm-email`), 'Potwierdzono e-mail')}>
            <Check size={15} /> Potwierdź e-mail
          </button>
          <button
            className="btn"
            onClick={() => act(() => api.patch(`/admin/users/${id}/confirm-full-access`), 'Potwierdzono pełny dostęp')}
          >
            <Check size={15} /> Potwierdź dostęp
          </button>
          <button className="btn" onClick={assignPartner}>
            <Shield size={15} /> Przypisz partnera
          </button>
          <button
            className="btn"
            onClick={() => act(() => api.patch(`/admin/users/${id}/allow-only-pay`), 'Przełączono tryb tylko płatności')}
          >
            <CreditCard size={15} /> Tryb „tylko płatności” {user.onlyPay ? '(wł.)' : '(wył.)'}
          </button>

          <div style={{ marginLeft: 'auto', display: 'flex', gap: 10 }}>
            <button
              className={`btn ${blocked ? '' : 'danger'}`}
              onClick={() =>
                act(
                  () => api.patch(`/admin/users/${id}/block`, { status: blocked ? 0 : 1 }),
                  blocked ? 'Odblokowano' : 'Zablokowano'
                )
              }
            >
              <Ban size={15} /> {blocked ? 'Odblokuj' : 'Blokuj'}
            </button>
            <button className="btn danger" onClick={doDelete}>
              <Trash2 size={15} /> Usuń
            </button>
          </div>
        </div>
      </div>

      <div className="tabs">
        {TABS.map((t) => (
          <button key={t.key} className={tab === t.key ? 'active' : ''} onClick={() => setTab(t.key)}>
            {t.label}
          </button>
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
    ['active', 'Aktywne'],
    ['pending', 'Oczekujące'],
    ['inactive', 'Nieaktywne'],
    ['toPayout', 'Do wypłaty'],
    ['toCommissionPayout', 'Wypłata prowizji'],
    ['blocked', 'Zablokowane'],
  ];
  return (
    <div className="card pad" style={{ marginBottom: 20 }}>
      <h3 style={{ margin: '0 0 14px' }}>Portfel</h3>
      <div className="grid cols-3">
        {buckets.map(([key, label]) => (
          <div className="stat" key={key}>
            <div className="label">{label}</div>
            <div className="value dy-num" style={{ fontSize: 22 }}>
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
      setMsg('Zapisano');
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
          ['companyName', 'Nazwa firmy'],
          ['nip', 'NIP'],
          ['phone', 'Telefon'],
          ['address', 'Adres'],
          ['city', 'Miasto'],
          ['postalCode', 'Kod pocztowy'],
        ]
      : [
          ['firstName', 'Imię'],
          ['lastName', 'Nazwisko'],
          ['phone', 'Telefon'],
          ['address', 'Adres'],
          ['city', 'Miasto'],
          ['postalCode', 'Kod pocztowy'],
        ];

  return (
    <div>
      <WalletCard wallet={user.wallet} />
      <div className="card pad">
        <h3 style={{ margin: '0 0 14px' }}>{isAdmin ? 'Dane administratora' : 'Dane osobowe / firmowe'}</h3>
        {msg && <div className="alert info">✓ {msg}</div>}
        <ErrorAlert error={error} />

        {user.admin ? (
          <>
            <div className="grid cols-2">
              <Field label="Nazwa">
                <input value={form.name || ''} onChange={(e) => set('name', e.target.value)} />
              </Field>
              <Field label="Telefon">
                <input value={form.phone || ''} onChange={(e) => set('phone', e.target.value)} />
              </Field>
            </div>
            <span style={{ fontWeight: 700, fontSize: 13, display: 'block', margin: '16px 0 8px' }}>
              Uprawnienia
            </span>
            <div className="table-card" style={{ marginBottom: 16 }}>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Moduł</th>
                      <th style={{ width: 180 }}>Poziom dostępu</th>
                    </tr>
                  </thead>
                  <tbody>
                    {PERMISSION_KEYS.map((p) => (
                      <tr key={p.key}>
                        <td>{p.label}</td>
                        <td style={{ width: 180 }}>
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

        <div className="btn-row" style={{ justifyContent: 'flex-end', marginTop: 18 }}>
          <button className="btn primary" onClick={save} disabled={busy}>
            {busy ? 'Zapisywanie…' : 'Zapisz zmiany'}
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
    <div className="table-card">
      <ErrorAlert error={error} />
      {items.length === 0 ? (
        <Empty>Brak transakcji.</Empty>
      ) : (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Typ</th>
                <th className="num">Wartość</th>
                <th className="num">Równ. PLN</th>
                <th>Status</th>
                <th>Opis</th>
                <th>Data</th>
              </tr>
            </thead>
            <tbody>
              {items.map((t, i) => (
                <tr key={t.id ?? i}>
                  <td>{t.type}</td>
                  <td className="num">{jr(t.value)}</td>
                  <td className="num">{pln(t.plnEquivalent)}</td>
                  <td>
                    <StatusBadge status={t.status} />
                  </td>
                  <td>{t.description || '—'}</td>
                  <td className="muted">{date(t.timestamp || t.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
    if (!confirm('Anulować ten zakup i zwrócić JR?')) return;
    setError(null);
    try {
      await api.post(`/admin/purchases/${purchaseId}/cancellation`, { return_jr: true });
      setMsg('Anulowano zakup');
      load();
    } catch (err: any) {
      setError(err);
    }
  };

  if (loading) return <Spinner />;

  const renderTable = (title: string, rows: any[]) => (
    <div className="table-card" style={{ marginBottom: 20 }}>
      <div className="pad" style={{ paddingBottom: 12 }}>
        <h3 style={{ margin: 0 }}>{title}</h3>
      </div>
      {rows.length === 0 ? (
        <Empty>Brak.</Empty>
      ) : (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Nazwa</th>
                <th>Status</th>
                <th>Zakupiono</th>
                <th className="actions">Akcje</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p, i) => (
                <tr key={p.id ?? p.purchaseId ?? i}>
                  <td>
                    <b>{p.name || p.programName || p.locationName || '—'}</b>
                  </td>
                  <td>{p.status != null ? <StatusBadge status={p.status} /> : '—'}</td>
                  <td className="muted">{date(p.createdAt || p.purchasedAt)}</td>
                  <td className="actions">
                    <button className="btn sm danger" onClick={() => cancel(p.purchaseId ?? p.id)}>
                      Anuluj
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  return (
    <div>
      {msg && <div className="alert info">✓ {msg}</div>}
      <ErrorAlert error={error} />
      {renderTable('Lokalizacje programów', locations)}
      {renderTable('Bonusy', bonuses)}
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
        <h3 style={{ margin: '0 0 6px' }}>Prowizja niestandardowa</h3>
        <div className="muted" style={{ marginBottom: 14 }}>
          Prowizja bazowa: {data?.base != null ? `${data.base}%` : '—'}
        </div>
        <div className="btn-row" style={{ alignItems: 'flex-end' }}>
          <label className="field" style={{ marginBottom: 0 }}>
            <span>Użyj niestandardowej</span>
            <select value={custom ? '1' : '0'} onChange={(e) => setCustom(e.target.value === '1')}>
              <option value="0">Nie</option>
              <option value="1">Tak</option>
            </select>
          </label>
          <label className="field" style={{ marginBottom: 0 }}>
            <span>Prowizja %</span>
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
                'Zapisano prowizję niestandardową'
              )
            }
          >
            Zapisz
          </button>
        </div>
      </div>

      <div className="table-card">
        <div className="pad" style={{ paddingBottom: 12 }}>
          <h3 style={{ margin: 0 }}>Progi prowizji</h3>
        </div>
        {(data?.thresholds || []).length === 0 ? (
          <Empty>Brak progów.</Empty>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th className="num">Min JR</th>
                  <th className="num">Prowizja %</th>
                  <th className="actions">Akcje</th>
                </tr>
              </thead>
              <tbody>
                {data.thresholds.map((t: any) => (
                  <tr key={t.id}>
                    <td className="num">{jr(t.min)}</td>
                    <td className="num">{t.value}%</td>
                    <td className="actions">
                      <button
                        className="btn sm danger"
                        onClick={() =>
                          run(
                            () => api.post(`/admin/users/${id}/remove-commission-threshold`, { id: t.id }),
                            'Usunięto próg'
                          )
                        }
                      >
                        Usuń
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="pad btn-row" style={{ alignItems: 'flex-end' }}>
          <label className="field" style={{ marginBottom: 0 }}>
            <span>Min JR</span>
            <input type="number" value={min} onChange={(e) => setMin(e.target.value)} />
          </label>
          <label className="field" style={{ marginBottom: 0 }}>
            <span>Prowizja %</span>
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
                'Dodano próg'
              )
            }
          >
            <Plus size={15} /> Dodaj próg
          </button>
        </div>
      </div>
    </div>
  );
}
