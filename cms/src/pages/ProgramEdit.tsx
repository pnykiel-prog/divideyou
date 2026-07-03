import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../api';
import { Spinner, Empty, Field, YesNo, ErrorAlert } from '../components/ui';
import Modal from '../components/Modal';

const num = (v: any) => (v === '' || v == null ? undefined : Number(v));

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
      <div className="page-head">
        <div>
          <Link to="/programs" className="muted">
            ← Programy
          </Link>
          <h1 style={{ marginTop: 6 }}>{editing ? 'Edytuj program' : 'Nowy program'}</h1>
        </div>
      </div>

      {msg && <div className="alert info">✓ {msg}</div>}
      <ErrorAlert error={error} />

      <div className="card pad" style={{ marginBottom: 20 }}>
        <div className="grid cols-2">
          <Field label="Nazwa">
            <input value={form.name || ''} onChange={(e) => set('name', e.target.value)} />
          </Field>
          <Field label="Okres umowy (dni)">
            <input
              type="number"
              value={form.gracePeriod ?? ''}
              onChange={(e) => set('gracePeriod', e.target.value)}
            />
          </Field>
        </div>
        <Field label="Opis">
          <textarea
            rows={3}
            value={form.description || ''}
            onChange={(e) => set('description', e.target.value)}
          />
        </Field>
        <Field label="Tekst marketingowy">
          <textarea
            rows={2}
            value={form.marketingText || ''}
            onChange={(e) => set('marketingText', e.target.value)}
          />
        </Field>
        <div className="grid cols-3">
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
        </div>
        <div className="grid cols-3">
          <Field label="Minimalne JR do podglądu">
            <input
              type="number"
              value={form.minimalJrForView ?? ''}
              onChange={(e) => set('minimalJrForView', e.target.value)}
            />
          </Field>
          <label className="field">
            <span>VIP</span>
            <select value={form.vip ? '1' : '0'} onChange={(e) => set('vip', e.target.value === '1')}>
              <option value="0">Nie</option>
              <option value="1">Tak</option>
            </select>
          </label>
          <label className="field">
            <span>Polecany</span>
            <select
              value={form.recommended ? '1' : '0'}
              onChange={(e) => set('recommended', e.target.value === '1')}
            >
              <option value="0">Nie</option>
              <option value="1">Tak</option>
            </select>
          </label>
        </div>
        <label className="field">
          <span>Widoczny</span>
          <select
            value={form.visible ? '1' : '0'}
            onChange={(e) => set('visible', e.target.value === '1')}
          >
            <option value="1">Tak</option>
            <option value="0">Nie</option>
          </select>
        </label>
        <div className="btn-row" style={{ justifyContent: 'flex-end' }}>
          <button className="btn primary" onClick={save} disabled={busy}>
            {busy ? 'Zapisywanie…' : editing ? 'Zapisz program' : 'Utwórz program'}
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
    <div className="card" style={{ marginBottom: 20 }}>
      <div className="pad" style={{ paddingBottom: 0, display: 'flex', justifyContent: 'space-between' }}>
        <h3>Lokalizacje</h3>
        <button className="btn sm primary" onClick={() => setEdit({ ...EMPTY_LOC })}>
          + Dodaj lokalizację
        </button>
      </div>
      <ErrorAlert error={error} />
      {loading ? (
        <Spinner />
      ) : items.length === 0 ? (
        <Empty>Brak lokalizacji.</Empty>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Nazwa</th>
              <th>Miasto</th>
              <th>Maks.</th>
              <th>Widoczny</th>
              <th />
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
                <td>{l.maxPurchases ?? '—'}</td>
                <td>
                  <YesNo value={l.visible} />
                </td>
                <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                  <button className="btn sm" style={{ marginRight: 6 }} onClick={() => setAttrFor(l)}>
                    Atrybuty
                  </button>
                  <button className="btn sm" style={{ marginRight: 6 }} onClick={() => setEdit(l)}>
                    Edytuj
                  </button>
                  <button className="btn sm danger" onClick={() => del(l.id)}>
                    Usuń
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
        <div className="btn-row" style={{ justifyContent: 'flex-end' }}>
          <button type="button" className="btn ghost" onClick={onClose}>
            Anuluj
          </button>
          <button type="submit" className="btn primary" disabled={busy}>
            {busy ? 'Zapisywanie…' : 'Zapisz lokalizację'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

/* ---------- Attribute manager (programs & locations) ---------- */
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
        <table>
          <thead>
            <tr>
              <th>Nazwa</th>
              <th>Typ</th>
              <th>Opłata początkowa</th>
              <th>Wymagany</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {items.map((a) => (
              <tr key={a.id}>
                <td>
                  <b>{a.name}</b>
                </td>
                <td>{a.type}</td>
                <td>{a.startFee ?? '—'}</td>
                <td>
                  <YesNo value={a.isRequired} />
                </td>
                <td style={{ textAlign: 'right' }}>
                  <button className="btn sm danger" onClick={() => remove(a.id)}>
                    Usuń
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
        <div className="grid cols-3">
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
        <div className="btn-row" style={{ alignItems: 'center' }}>
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
            + Dodaj atrybut
          </button>
        </div>
      </form>
    </>
  );

  if (embedded) return body;

  return (
    <div className="card" style={{ marginBottom: 20 }}>
      <div className="pad" style={{ paddingBottom: 0 }}>
        <h3>{title}</h3>
      </div>
      {body}
    </div>
  );
}
