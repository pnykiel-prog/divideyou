import { useEffect, useState } from 'react';
import { api, jr } from '../api';
import { Spinner, Empty, Field, YesNo, ErrorAlert } from '../components/ui';
import Modal from '../components/Modal';

const num = (v: any) => (v === '' || v == null ? undefined : Number(v));

const EMPTY = {
  name: '',
  description: '',
  marketingText: '',
  gracePeriod: '',
  entryFee: '',
  maxPurchases: '',
  subscriptionPrice: '',
  amountBlocked: '',
  minimalJrForView: '',
  vip: false,
  recommended: false,
  visible: true,
};

export default function Bonuses() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);
  const [edit, setEdit] = useState<any | null>(null);

  const load = () => {
    setLoading(true);
    api
      .get('/admin/programs/bonuses')
      .then((r) => setItems(Array.isArray(r) ? r : r.items || []))
      .catch(setError)
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const del = async (id: any) => {
    if (!confirm('Usunąć ten bonus?')) return;
    try {
      await api.del(`/admin/programs/${id}/bonus`);
      load();
    } catch (err: any) {
      setError(err);
    }
  };

  const openEdit = async (id: any) => {
    try {
      const b = await api.get(`/admin/programs/${id}/bonus`);
      setEdit({ ...EMPTY, ...b, id });
    } catch (err: any) {
      setError(err);
    }
  };

  return (
    <div>
      <div className="page-head">
        <h1>Bonusy</h1>
        <button className="btn primary" onClick={() => setEdit({ ...EMPTY })}>
          + Dodaj bonus
        </button>
      </div>

      <ErrorAlert error={error} />

      <div className="card">
        {loading ? (
          <Spinner />
        ) : items.length === 0 ? (
          <Empty>Brak bonusów.</Empty>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Nazwa</th>
                <th>Opłata wstępna</th>
                <th>Maks. zakupów</th>
                <th>VIP</th>
                <th>Widoczny</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {items.map((b) => (
                <tr key={b.id}>
                  <td>
                    <b>{b.name}</b>
                    <div className="muted">{(b.description || '').slice(0, 60)}</div>
                  </td>
                  <td>{jr(b.entryFee)}</td>
                  <td>{b.maxPurchases ?? '—'}</td>
                  <td>
                    <YesNo value={b.vip} />
                  </td>
                  <td>
                    <YesNo value={b.visible} />
                  </td>
                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <button className="btn sm" style={{ marginRight: 6 }} onClick={() => openEdit(b.id)}>
                      Edytuj
                    </button>
                    <button className="btn sm danger" onClick={() => del(b.id)}>
                      Usuń
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {edit && (
        <BonusModal
          bonus={edit}
          onClose={() => setEdit(null)}
          onSaved={() => {
            setEdit(null);
            load();
          }}
        />
      )}
    </div>
  );
}

function BonusModal({
  bonus,
  onClose,
  onSaved,
}: {
  bonus: any;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<any>({ ...EMPTY, ...bonus });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<any>(null);
  const editing = !!bonus.id;
  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const b = {
        name: form.name,
        description: form.description,
        marketingText: form.marketingText,
        gracePeriod: num(form.gracePeriod),
        entryFee: num(form.entryFee),
        maxPurchases: num(form.maxPurchases),
        subscriptionPrice: num(form.subscriptionPrice),
        amountBlocked: num(form.amountBlocked),
        minimalJrForView: num(form.minimalJrForView),
        vip: form.vip,
        recommended: form.recommended,
        visible: form.visible,
      };
      if (editing) await api.post(`/admin/programs/${bonus.id}/bonus`, b);
      else await api.post('/admin/programs/bonus', b);
      onSaved();
    } catch (err: any) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title={editing ? 'Edytuj bonus' : 'Dodaj bonus'} onClose={onClose} wide>
      <form onSubmit={save}>
        <ErrorAlert error={error} />
        <Field label="Nazwa">
          <input value={form.name || ''} onChange={(e) => set('name', e.target.value)} required />
        </Field>
        <Field label="Opis">
          <textarea rows={2} value={form.description || ''} onChange={(e) => set('description', e.target.value)} />
        </Field>
        <Field label="Tekst marketingowy">
          <textarea rows={2} value={form.marketingText || ''} onChange={(e) => set('marketingText', e.target.value)} />
        </Field>
        <div className="grid cols-3">
          <Field label="Okres umowy (dni)">
            <input type="number" value={form.gracePeriod ?? ''} onChange={(e) => set('gracePeriod', e.target.value)} />
          </Field>
          <Field label="Opłata wstępna (JR)">
            <input type="number" value={form.entryFee ?? ''} onChange={(e) => set('entryFee', e.target.value)} />
          </Field>
          <Field label="Maks. zakupów">
            <input type="number" value={form.maxPurchases ?? ''} onChange={(e) => set('maxPurchases', e.target.value)} />
          </Field>
        </div>
        <div className="grid cols-3">
          <Field label="Abonament (JR)">
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
        <div className="grid cols-3">
          <label className="field">
            <span>VIP</span>
            <select value={form.vip ? '1' : '0'} onChange={(e) => set('vip', e.target.value === '1')}>
              <option value="0">Nie</option>
              <option value="1">Tak</option>
            </select>
          </label>
          <label className="field">
            <span>Polecany</span>
            <select value={form.recommended ? '1' : '0'} onChange={(e) => set('recommended', e.target.value === '1')}>
              <option value="0">Nie</option>
              <option value="1">Tak</option>
            </select>
          </label>
          <label className="field">
            <span>Widoczny</span>
            <select value={form.visible ? '1' : '0'} onChange={(e) => set('visible', e.target.value === '1')}>
              <option value="1">Tak</option>
              <option value="0">Nie</option>
            </select>
          </label>
        </div>
        <div className="btn-row" style={{ justifyContent: 'flex-end' }}>
          <button type="button" className="btn ghost" onClick={onClose}>
            Anuluj
          </button>
          <button type="submit" className="btn primary" disabled={busy}>
            {busy ? 'Zapisywanie…' : 'Zapisz bonus'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
