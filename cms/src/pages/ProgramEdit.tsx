import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, Save, Plus, Pencil, Trash2, MapPin, Sliders, Image as ImageIcon, Upload,
} from 'lucide-react';
import { api } from '../api';
import { Spinner, Empty, Field, YesNo, ErrorAlert } from '../components/ui';
import Modal from '../components/Modal';

const num = (v: any) => (v === '' || v == null ? undefined : Number(v));

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        padding: '13px 0',
        borderTop: '1px solid var(--line)',
      }}
    >
      <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink)' }}>{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        style={{
          flex: 'none',
          width: 44,
          height: 26,
          borderRadius: 20,
          border: 'none',
          cursor: 'pointer',
          position: 'relative',
          background: checked ? 'var(--brand)' : 'var(--bg-2)',
          transition: 'background .15s',
        }}
      >
        <span
          style={{
            position: 'absolute',
            top: 3,
            left: checked ? 21 : 3,
            width: 20,
            height: 20,
            borderRadius: '50%',
            background: '#fff',
            boxShadow: '0 1px 2px rgba(0,0,0,.25)',
            transition: 'left .15s',
          }}
        />
      </button>
    </div>
  );
}

export default function ProgramEdit() {
  const { id } = useParams();
  const nav = useNavigate();
  const editing = !!id;
  const [form, setForm] = useState<any>({
    name: '',
    description: '',
    marketingText: '',
    gracePeriod: '',
    entryFee: '',
    subscriptionPrice: '',
    amountBlocked: '',
    minimalJrForView: '',
    vip: false,
    recommended: false,
    visible: true,
  });
  const [loading, setLoading] = useState(editing);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<any>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  useEffect(() => {
    if (!editing) return;
    api
      .get(`/admin/programs/${id}`)
      .then((p) => setForm({ ...form, ...p }))
      .catch(setError)
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const save = async () => {
    setBusy(true);
    setError(null);
    setMsg(null);
    try {
      const body = {
        name: form.name,
        description: form.description,
        marketingText: form.marketingText,
        gracePeriod: num(form.gracePeriod),
        entryFee: num(form.entryFee),
        subscriptionPrice: num(form.subscriptionPrice),
        amountBlocked: num(form.amountBlocked),
        minimalJrForView: num(form.minimalJrForView),
        vip: form.vip,
        recommended: form.recommended,
        visible: form.visible,
      };
      if (editing) {
        await api.post(`/admin/programs/${id}`, body);
        setMsg('Zapisano');
      } else {
        const r = await api.post('/admin/programs', body);
        nav(`/programs/edit/${r.id ?? r.programId ?? ''}`);
      }
    } catch (err: any) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <Spinner />;

  return (
    <div>
      <Link
        to="/programs"
        className="muted"
        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 600, marginBottom: 10 }}
      >
        <ArrowLeft size={16} /> Wróć do listy programów
      </Link>

      <div className="page-head">
        <div>
          <h1>{editing ? `Edytuj program — ${form.name || ''}` : 'Nowy program'}</h1>
        </div>
        <div className="btn-row">
          <button className="btn ghost" onClick={() => nav('/programs')} disabled={busy}>
            Anuluj
          </button>
          <button className="btn primary" onClick={save} disabled={busy}>
            <Save size={16} /> {busy ? 'Zapisywanie…' : editing ? 'Zapisz program' : 'Utwórz program'}
          </button>
        </div>
      </div>

      {msg && <div className="alert info">✓ {msg}</div>}
      <ErrorAlert error={error} />

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 320px', gap: 20, alignItems: 'start' }}>
        {/* LEFT */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, minWidth: 0 }}>
          <div className="card pad">
            <h3 style={{ margin: '0 0 16px' }}>Podstawowe informacje</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <Field label="Nazwa programu">
                <input value={form.name || ''} onChange={(e) => set('name', e.target.value)} />
              </Field>
              <Field label="Okres umowy (mies.)">
                <input
                  type="number"
                  placeholder="6, 12, 24"
                  value={form.gracePeriod ?? ''}
                  onChange={(e) => set('gracePeriod', e.target.value)}
                />
              </Field>
            </div>
            <div style={{ marginTop: 16 }}>
              <Field label="Opis">
                <textarea
                  rows={3}
                  value={form.description || ''}
                  onChange={(e) => set('description', e.target.value)}
                />
              </Field>
            </div>
            <div style={{ marginTop: 16 }}>
              <Field label="Tekst marketingowy">
                <textarea
                  rows={2}
                  value={form.marketingText || ''}
                  onChange={(e) => set('marketingText', e.target.value)}
                />
              </Field>
            </div>
          </div>

          <div className="card pad">
            <h3 style={{ margin: '0 0 16px' }}>Opłaty</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <Field label="Opłata wstępna (JR)">
                <input
                  type="number"
                  value={form.entryFee ?? ''}
                  onChange={(e) => set('entryFee', e.target.value)}
                />
              </Field>
              <Field label="Cena abonamentu (JR)">
                <input
                  type="number"
                  value={form.subscriptionPrice ?? ''}
                  onChange={(e) => set('subscriptionPrice', e.target.value)}
                />
              </Field>
              <Field label="Kwota zablokowana (JR)">
                <input
                  type="number"
                  value={form.amountBlocked ?? ''}
                  onChange={(e) => set('amountBlocked', e.target.value)}
                />
              </Field>
              <Field label="Minimalne JR do podglądu">
                <input
                  type="number"
                  value={form.minimalJrForView ?? ''}
                  onChange={(e) => set('minimalJrForView', e.target.value)}
                />
              </Field>
            </div>
          </div>

          <div className="card pad">
            <h3 style={{ margin: '0 0 16px' }}>Zdjęcie i galeria</h3>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  style={{
                    width: 96,
                    height: 96,
                    borderRadius: 11,
                    background: 'var(--bg-2)',
                    border: '1px solid var(--line)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--ink-3)',
                  }}
                >
                  <ImageIcon size={22} />
                </div>
              ))}
              <button
                type="button"
                style={{
                  width: 96,
                  height: 96,
                  borderRadius: 11,
                  background: 'transparent',
                  border: '1.5px dashed var(--line)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  color: 'var(--ink-2)',
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                <Upload size={18} /> Dodaj
              </button>
            </div>
          </div>

          {editing && (
            <>
              <Locations programId={id!} />
              <AttributeManager basePath={`/admin/programs/${id}`} title="Atrybuty programu" />
            </>
          )}
        </div>

        {/* RIGHT */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, position: 'sticky', top: 82 }}>
          <div className="card pad">
            <h3 style={{ margin: '0 0 4px' }}>Widoczność i flagi</h3>
            <Toggle label="Widoczny w katalogu" checked={!!form.visible} onChange={(v) => set('visible', v)} />
            <Toggle label="Program VIP" checked={!!form.vip} onChange={(v) => set('vip', v)} />
            <Toggle label="Polecany" checked={!!form.recommended} onChange={(v) => set('recommended', v)} />
          </div>

          <div className="card pad">
            <h3 style={{ margin: '0 0 14px' }}>Marker na mapie</h3>
            <div
              style={{
                height: 150,
                borderRadius: 11,
                border: '1px solid var(--line)',
                background:
                  'repeating-linear-gradient(0deg, var(--bg-2) 0 23px, var(--line) 23px 24px), repeating-linear-gradient(90deg, var(--bg-2) 0 23px, var(--line) 23px 24px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--brand)',
              }}
            >
              <MapPin size={26} />
            </div>
            <p className="muted" style={{ fontSize: 12, margin: '10px 0 0' }}>
              Współrzędne markera ustawiasz w poszczególnych lokalizacjach programu.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Locations ---------- */
const EMPTY_LOC = {
  name: '',
  address: '',
  city: '',
  postalCode: '',
  latitude: '',
  longitude: '',
  purchaseDuration: '',
  entryFee: '',
  subscriptionPrice: '',
  amountBlocked: '',
  maxPurchases: '',
  visible: true,
};

function Locations({ programId }: { programId: string }) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);
  const [edit, setEdit] = useState<any | null>(null);
  const [attrFor, setAttrFor] = useState<any | null>(null);

  const load = () => {
    setLoading(true);
    api
      .get(`/admin/programs/${programId}/locations`)
      .then((r) => setItems(Array.isArray(r) ? r : r.items || []))
      .catch(setError)
      .finally(() => setLoading(false));
  };
  useEffect(load, [programId]);

  const del = async (locId: any) => {
    if (!confirm('Usunąć tę lokalizację?')) return;
    try {
      await api.del(`/admin/locations/${locId}`);
      load();
    } catch (err: any) {
      setError(err);
    }
  };

  return (
    <div className="table-card">
      <div
        className="pad"
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}
      >
        <h3 style={{ margin: 0, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <MapPin size={18} /> Lokalizacje
        </h3>
        <button className="btn sm primary" onClick={() => setEdit({ ...EMPTY_LOC })}>
          <Plus size={15} /> Dodaj lokalizację
        </button>
      </div>
      <ErrorAlert error={error} />
      {loading ? (
        <Spinner />
      ) : items.length === 0 ? (
        <Empty>Brak lokalizacji.</Empty>
      ) : (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Nazwa</th>
                <th>Miasto</th>
                <th className="num">Limit</th>
                <th>Status</th>
                <th className="num">Akcje</th>
              </tr>
            </thead>
            <tbody>
              {items.map((l) => (
                <tr key={l.id}>
                  <td>
                    <b>{l.name}</b>
                    <div className="muted">{l.address}</div>
                  </td>
                  <td>{l.city}</td>
                  <td className="num dy-num">{l.maxPurchases ?? '—'}</td>
                  <td>
                    {l.visible ? (
                      <span className="badge green"><span className="pdot" />Widoczny</span>
                    ) : (
                      <span className="badge gray"><span className="pdot" />Ukryty</span>
                    )}
                  </td>
                  <td className="actions">
                    <button className="act" title="Atrybuty" onClick={() => setAttrFor(l)}>
                      <Sliders size={15} />
                    </button>
                    <button className="act" title="Edytuj" onClick={() => setEdit(l)}>
                      <Pencil size={15} />
                    </button>
                    <button className="act del" title="Usuń" onClick={() => del(l.id)}>
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {edit && (
        <LocationModal
          programId={programId}
          location={edit}
          onClose={() => setEdit(null)}
          onSaved={() => {
            setEdit(null);
            load();
          }}
        />
      )}
      {attrFor && (
        <Modal title={`Atrybuty · ${attrFor.name}`} onClose={() => setAttrFor(null)} wide>
          <AttributeManager basePath={`/admin/locations/${attrFor.id}`} title="" embedded />
        </Modal>
      )}
    </div>
  );
}

function LocationModal({
  programId,
  location,
  onClose,
  onSaved,
}: {
  programId: string;
  location: any;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<any>({ ...EMPTY_LOC, ...location });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<any>(null);
  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));
  const editing = !!location.id;

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const body: any = {
        programId,
        name: form.name,
        address: form.address,
        city: form.city,
        postalCode: form.postalCode,
        latitude: num(form.latitude),
        longitude: num(form.longitude),
        purchaseDuration: num(form.purchaseDuration),
        entryFee: num(form.entryFee),
        subscriptionPrice: num(form.subscriptionPrice),
        amountBlocked: num(form.amountBlocked),
        maxPurchases: num(form.maxPurchases),
        visible: form.visible,
      };
      if (editing) await api.post(`/admin/locations/${location.id}`, body);
      else await api.post('/admin/locations', body);
      onSaved();
    } catch (err: any) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  const fields: [string, string, string?][] = [
    ['name', 'Nazwa'],
    ['address', 'Adres'],
    ['city', 'Miasto'],
    ['postalCode', 'Kod pocztowy'],
    ['latitude', 'Szerokość geograficzna', 'number'],
    ['longitude', 'Długość geograficzna', 'number'],
    ['purchaseDuration', 'Czas trwania zakupu (dni)', 'number'],
    ['maxPurchases', 'Maks. zakupów', 'number'],
    ['entryFee', 'Opłata wstępna (JR)', 'number'],
    ['subscriptionPrice', 'Abonament (JR)', 'number'],
    ['amountBlocked', 'Kwota zablokowana (JR)', 'number'],
  ];

  return (
    <Modal title={editing ? 'Edytuj lokalizację' : 'Dodaj lokalizację'} onClose={onClose} wide>
      <form onSubmit={save}>
        <ErrorAlert error={error} />
        <div className="grid cols-2">
          {fields.map(([k, label, type]) => (
            <Field key={k} label={label}>
              <input
                type={type || 'text'}
                value={form[k] ?? ''}
                onChange={(e) => set(k, e.target.value)}
              />
            </Field>
          ))}
        </div>
        <label className="field">
          <span>Widoczny</span>
          <select value={form.visible ? '1' : '0'} onChange={(e) => set('visible', e.target.value === '1')}>
            <option value="1">Tak</option>
            <option value="0">Nie</option>
          </select>
        </label>
        <div className="btn-row" style={{ justifyContent: 'flex-end', marginTop: 16 }}>
          <button type="button" className="btn ghost" onClick={onClose}>
            Anuluj
          </button>
          <button type="submit" className="btn primary" disabled={busy}>
            <Save size={16} /> {busy ? 'Zapisywanie…' : 'Zapisz lokalizację'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

/* ---------- Attribute manager (programs & locations) ---------- */
const ATTR_TYPE_PILL: Record<string, string> = {
  prosty: 'gray',
  wybieralny: 'blue',
  liczbowy: 'violet',
  końcowy: 'amber',
};

function AttributeManager({
  basePath,
  title,
  embedded,
}: {
  basePath: string;
  title: string;
  embedded?: boolean;
}) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);
  const [form, setForm] = useState<any>({
    name: '',
    type: '',
    startFee: '',
    subscriptionPrice: '',
    amountBlocked: '',
    maxCount: '',
    isRequired: false,
    isMultiselect: false,
    parentId: '',
  });
  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const load = () => {
    setLoading(true);
    api
      .get(`${basePath}/add-attribute`)
      .then((r) => setItems(Array.isArray(r) ? r : r.items || r.attributes || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  };
  useEffect(load, [basePath]);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await api.post(`${basePath}/add-attribute`, {
        name: form.name,
        type: form.type,
        startFee: num(form.startFee),
        subscriptionPrice: num(form.subscriptionPrice),
        amountBlocked: num(form.amountBlocked),
        maxCount: num(form.maxCount),
        isRequired: form.isRequired,
        isMultiselect: form.isMultiselect,
        parentId: form.parentId || undefined,
      });
      setForm({
        name: '',
        type: '',
        startFee: '',
        subscriptionPrice: '',
        amountBlocked: '',
        maxCount: '',
        isRequired: false,
        isMultiselect: false,
        parentId: '',
      });
      load();
    } catch (err: any) {
      setError(err);
    }
  };

  const remove = async (attributeId: any) => {
    if (!confirm('Usunąć atrybut?')) return;
    try {
      await api.del(`${basePath}/remove-attribute/${attributeId}`);
      load();
    } catch (err: any) {
      setError(err);
    }
  };

  const body = (
    <>
      <ErrorAlert error={error} />
      {loading ? (
        <Spinner />
      ) : items.length === 0 ? (
        <Empty>Brak atrybutów.</Empty>
      ) : (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Atrybut</th>
                <th>Typ</th>
                <th className="num">Opłata pocz.</th>
                <th className="num">Abon.</th>
                <th>Wielokr.</th>
                <th>Wymag.</th>
                <th className="num">Akcje</th>
              </tr>
            </thead>
            <tbody>
              {items.map((a) => (
                <tr key={a.id}>
                  <td>
                    <b>{a.name}</b>
                  </td>
                  <td>
                    {a.type ? (
                      <span className={`badge ${ATTR_TYPE_PILL[a.type] || 'gray'}`}>{a.type}</span>
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>
                  <td className="num dy-num">{a.startFee ?? '—'}</td>
                  <td className="num dy-num">{a.subscriptionPrice ?? '—'}</td>
                  <td>
                    <YesNo value={a.isMultiselect} />
                  </td>
                  <td>
                    <YesNo value={a.isRequired} />
                  </td>
                  <td className="actions">
                    <button className="act del" title="Usuń" onClick={() => remove(a.id)}>
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <form className="pad" onSubmit={add}>
        <div className="grid cols-3">
          <Field label="Nazwa">
            <input value={form.name} onChange={(e) => set('name', e.target.value)} required />
          </Field>
          <Field label="Typ">
            <input value={form.type} onChange={(e) => set('type', e.target.value)} />
          </Field>
          <Field label="Maks. liczba">
            <input type="number" value={form.maxCount} onChange={(e) => set('maxCount', e.target.value)} />
          </Field>
        </div>
        <div className="grid cols-3" style={{ marginTop: 12 }}>
          <Field label="Opłata początkowa (JR)">
            <input type="number" value={form.startFee} onChange={(e) => set('startFee', e.target.value)} />
          </Field>
          <Field label="Abonament (JR)">
            <input
              type="number"
              value={form.subscriptionPrice}
              onChange={(e) => set('subscriptionPrice', e.target.value)}
            />
          </Field>
          <Field label="Kwota zablokowana (JR)">
            <input
              type="number"
              value={form.amountBlocked}
              onChange={(e) => set('amountBlocked', e.target.value)}
            />
          </Field>
        </div>
        <div className="btn-row" style={{ alignItems: 'center', marginTop: 14 }}>
          <label style={{ display: 'flex', gap: 6, alignItems: 'center', width: 'auto' }}>
            <input
              type="checkbox"
              checked={form.isRequired}
              onChange={(e) => set('isRequired', e.target.checked)}
              style={{ width: 'auto' }}
            />
            Wymagany
          </label>
          <label style={{ display: 'flex', gap: 6, alignItems: 'center', width: 'auto' }}>
            <input
              type="checkbox"
              checked={form.isMultiselect}
              onChange={(e) => set('isMultiselect', e.target.checked)}
              style={{ width: 'auto' }}
            />
            Wielokrotny wybór
          </label>
          <button className="btn primary" type="submit" style={{ marginLeft: 'auto' }}>
            <Plus size={16} /> Dodaj atrybut
          </button>
        </div>
      </form>
    </>
  );

  if (embedded) return body;

  return (
    <div className="table-card">
      <div className="pad" style={{ paddingBottom: 0 }}>
        <h3 style={{ margin: 0, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <Sliders size={18} /> {title}
        </h3>
      </div>
      {body}
    </div>
  );
}
