import { useEffect, useState } from 'react';
import { api } from '../api';
import { Spinner, Empty, Field, YesNo, ErrorAlert } from '../components/ui';
import Modal from '../components/Modal';

const EMPTY = { question: '', answer: '', sortOrder: 0, onDashboard: false };

export default function Faq() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [edit, setEdit] = useState<any | null>(null);

  const load = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('query', search);
    api
      .get(`/admin/faq?${params.toString()}`)
      .then((r) => setItems(Array.isArray(r) ? r : r.items || []))
      .catch(setError)
      .finally(() => setLoading(false));
  };
  useEffect(load, [search]);

  const del = async (id: any) => {
    if (!confirm('Delete this FAQ entry?')) return;
    try {
      await api.del(`/admin/faq/${id}`);
      load();
    } catch (err: any) {
      setError(err);
    }
  };

  return (
    <div>
      <div className="page-head">
        <h1>FAQ</h1>
        <div className="btn-row">
          <form
            className="btn-row"
            onSubmit={(e) => {
              e.preventDefault();
              setSearch(query);
            }}
          >
            <input placeholder="Search…" value={query} onChange={(e) => setQuery(e.target.value)} style={{ width: 200 }} />
            <button className="btn" type="submit">
              Search
            </button>
          </form>
          <button className="btn primary" onClick={() => setEdit({ ...EMPTY })}>
            + Add FAQ
          </button>
        </div>
      </div>

      <ErrorAlert error={error} />

      <div className="card">
        {loading ? (
          <Spinner />
        ) : items.length === 0 ? (
          <Empty>No FAQ entries.</Empty>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Question</th>
                <th>Order</th>
                <th>Dashboard</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {items.map((f) => (
                <tr key={f.id}>
                  <td>
                    <b>{f.question}</b>
                    <div className="muted">{(f.answer || '').slice(0, 80)}</div>
                  </td>
                  <td>{f.sortOrder ?? 0}</td>
                  <td>
                    <YesNo value={f.onDashboard} />
                  </td>
                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <button className="btn sm" style={{ marginRight: 6 }} onClick={() => setEdit(f)}>
                      Edit
                    </button>
                    <button className="btn sm danger" onClick={() => del(f.id)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {edit && (
        <FaqModal
          entry={edit}
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

function FaqModal({ entry, onClose, onSaved }: { entry: any; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<any>({ ...EMPTY, ...entry });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<any>(null);
  const editing = !!entry.id;
  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const body = {
        question: form.question,
        answer: form.answer,
        sortOrder: Number(form.sortOrder) || 0,
        onDashboard: form.onDashboard,
      };
      if (editing) await api.put(`/admin/faq/${entry.id}`, body);
      else await api.post('/admin/faq', body);
      onSaved();
    } catch (err: any) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title={editing ? 'Edit FAQ' : 'Add FAQ'} onClose={onClose} wide>
      <form onSubmit={save}>
        <ErrorAlert error={error} />
        <Field label="Question">
          <input value={form.question || ''} onChange={(e) => set('question', e.target.value)} required />
        </Field>
        <Field label="Answer">
          <textarea rows={4} value={form.answer || ''} onChange={(e) => set('answer', e.target.value)} />
        </Field>
        <div className="grid cols-2">
          <Field label="Sort order">
            <input type="number" value={form.sortOrder ?? 0} onChange={(e) => set('sortOrder', e.target.value)} />
          </Field>
          <label className="field">
            <span>On dashboard</span>
            <select value={form.onDashboard ? '1' : '0'} onChange={(e) => set('onDashboard', e.target.value === '1')}>
              <option value="0">No</option>
              <option value="1">Yes</option>
            </select>
          </label>
        </div>
        <div className="btn-row" style={{ justifyContent: 'flex-end' }}>
          <button type="button" className="btn ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn primary" disabled={busy}>
            {busy ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
