import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Pencil, Trash2, Save } from 'lucide-react';
import { api, date } from '../api';
import { Spinner, Empty, Field, ErrorAlert } from '../components/ui';
import Modal from '../components/Modal';

const EMPTY = { title: '', content: '', photo: '' };

function StatusPill({ item }: { item: any }) {
  const draft =
    item.draft === true ||
    item.published === false ||
    item.isPublished === false ||
    item.active === false ||
    item.status === 'draft';
  return draft ? (
    <span className="badge amber"><span className="pdot" /> Wersja robocza</span>
  ) : (
    <span className="badge green"><span className="pdot" /> Opublikowany</span>
  );
}

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
    if (!confirm('Usunąć tę aktualność?')) return;
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
        <div>
          <h1>Treści</h1>
          <p className="sub">Zarządzanie aktualnościami i pytaniami FAQ.</p>
        </div>
        <button className="btn primary" onClick={() => setEdit({ ...EMPTY })}>
          <Plus size={16} /> Dodaj wpis
        </button>
      </div>

      <div className="tabs">
        <Link to="/news" className="active">Aktualności</Link>
        <Link to="/faq">FAQ</Link>
      </div>

      <ErrorAlert error={error} />

      <div className="table-card">
        {loading ? (
          <Spinner />
        ) : items.length === 0 ? (
          <Empty>Brak aktualności.</Empty>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Tytuł</th>
                  <th>Data</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Akcje</th>
                </tr>
              </thead>
              <tbody>
                {items.map((n) => (
                  <tr key={n.id}>
                    <td><b>{n.title}</b></td>
                    <td className="dy-num">{date(n.createdAt)}</td>
                    <td><StatusPill item={n} /></td>
                    <td className="actions">
                      <div style={{ display: 'inline-flex', gap: 6 }}>
                        <button className="act" title="Edytuj" onClick={() => setEdit(n)}>
                          <Pencil size={15} />
                        </button>
                        <button className="act del" title="Usuń" onClick={() => del(n.id)}>
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
    <Modal title={editing ? 'Edytuj aktualność' : 'Dodaj aktualność'} onClose={onClose} wide>
      <form onSubmit={save}>
        <ErrorAlert error={error} />
        <Field label="Tytuł">
          <input value={form.title || ''} onChange={(e) => set('title', e.target.value)} required />
        </Field>
        <Field label="Treść">
          <textarea rows={6} value={form.content || ''} onChange={(e) => set('content', e.target.value)} />
        </Field>
        <Field label="Adres URL zdjęcia">
          <input value={form.photo || ''} onChange={(e) => set('photo', e.target.value)} />
        </Field>
        <div className="btn-row" style={{ justifyContent: 'flex-end', marginTop: 4 }}>
          <button type="button" className="btn ghost" onClick={onClose}>
            Anuluj
          </button>
          <button type="submit" className="btn primary" disabled={busy}>
            <Save size={16} /> {busy ? 'Zapisywanie…' : 'Zapisz'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
