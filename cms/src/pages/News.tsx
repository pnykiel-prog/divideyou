import { useEffect, useState } from 'react';
import { api, date } from '../api';
import { Spinner, Empty, Field, ErrorAlert } from '../components/ui';
import Modal from '../components/Modal';

const EMPTY = { title: '', content: '', photo: '' };

export default function News() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);
  const [edit, setEdit] = useState<any | null>(null);

  const load = () => {
    setLoading(true);
    api
      .get('/admin/news')
      .then((r) => setItems(r.items || (Array.isArray(r) ? r : [])))
      .catch(setError)
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const del = async (id: any) => {
    if (!confirm('Delete this news item?')) return;
    try {
      await api.del(`/admin/news/${id}`);
      load();
    } catch (err: any) {
      setError(err);
    }
  };

  return (
    <div>
      <div className="page-head">
        <h1>News</h1>
        <button className="btn primary" onClick={() => setEdit({ ...EMPTY })}>
          + Add news
        </button>
      </div>

      <ErrorAlert error={error} />

      <div className="card">
        {loading ? (
          <Spinner />
        ) : items.length === 0 ? (
          <Empty>No news.</Empty>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Title</th>
                <th>Content</th>
                <th>Date</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {items.map((n) => (
                <tr key={n.id}>
                  <td>
                    <b>{n.title}</b>
                  </td>
                  <td className="muted" style={{ maxWidth: 340 }}>
                    {(n.content || '').slice(0, 100)}
                  </td>
                  <td>{date(n.createdAt)}</td>
                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <button className="btn sm" style={{ marginRight: 6 }} onClick={() => setEdit(n)}>
                      Edit
                    </button>
                    <button className="btn sm danger" onClick={() => del(n.id)}>
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
        <NewsModal
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

function NewsModal({ entry, onClose, onSaved }: { entry: any; onClose: () => void; onSaved: () => void }) {
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
      const body = { title: form.title, content: form.content, photo: form.photo };
      if (editing) await api.put(`/admin/news/${entry.id}`, body);
      else await api.post('/admin/news', body);
      onSaved();
    } catch (err: any) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title={editing ? 'Edit news' : 'Add news'} onClose={onClose} wide>
      <form onSubmit={save}>
        <ErrorAlert error={error} />
        <Field label="Title">
          <input value={form.title || ''} onChange={(e) => set('title', e.target.value)} required />
        </Field>
        <Field label="Content">
          <textarea rows={6} value={form.content || ''} onChange={(e) => set('content', e.target.value)} />
        </Field>
        <Field label="Photo URL">
          <input value={form.photo || ''} onChange={(e) => set('photo', e.target.value)} />
        </Field>
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
