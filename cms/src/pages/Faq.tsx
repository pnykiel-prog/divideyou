import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Pencil, Trash2, Search, Save } from 'lucide-react';
import { api } from '../api';
import { Spinner, Empty, Field, ErrorAlert } from '../components/ui';
import Modal from '../components/Modal';

const EMPTY = { question: '', answer: '', sortOrder: 0, onDashboard: false };

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
    if (!confirm('Usunąć ten wpis FAQ?')) return;
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
        <div>
          <h1>Treści</h1>
          <p className="sub">Zarządzanie aktualnościami i pytaniami FAQ.</p>
        </div>
        <button className="btn primary" onClick={() => setEdit({ ...EMPTY })}>
          <Plus size={16} /> Dodaj pytanie
        </button>
      </div>

      <div className="tabs">
        <Link to="/news">Aktualności</Link>
        <Link to="/faq" className="active">FAQ</Link>
      </div>

      <ErrorAlert error={error} />

      <form
        className="filterbar"
        onSubmit={(e) => {
          e.preventDefault();
          setSearch(query);
        }}
      >
        <div className="grow" style={{ position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: 11, color: 'var(--ink-3)' }} />
          <input
            placeholder="Szukaj pytania…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{ paddingLeft: 36 }}
          />
        </div>
        <button className="btn" type="submit">
          <Search size={16} /> Szukaj
        </button>
      </form>

      <div className="table-card">
        {loading ? (
          <Spinner />
        ) : items.length === 0 ? (
          <Empty>Brak wpisów FAQ.</Empty>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Pytanie</th>
                  <th>Na pulpicie</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Akcje</th>
                </tr>
              </thead>
              <tbody>
                {items.map((f) => (
                  <tr key={f.id}>
                    <td>
                      <b>{f.question}</b>
                      <div className="muted" style={{ maxWidth: 420 }}>{(f.answer || '').slice(0, 90)}</div>
                    </td>
                    <td>
                      {f.onDashboard ? (
                        <span className="badge green"><span className="pdot" /> Tak</span>
                      ) : (
                        <span className="badge gray">Nie</span>
                      )}
                    </td>
                    <td><StatusPill item={f} /></td>
                    <td className="actions">
                      <div style={{ display: 'inline-flex', gap: 6 }}>
                        <button className="act" title="Edytuj" onClick={() => setEdit(f)}>
                          <Pencil size={15} />
                        </button>
                        <button className="act del" title="Usuń" onClick={() => del(f.id)}>
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
    <Modal title={editing ? 'Edytuj FAQ' : 'Dodaj FAQ'} onClose={onClose} wide>
      <form onSubmit={save}>
        <ErrorAlert error={error} />
        <Field label="Pytanie">
          <input value={form.question || ''} onChange={(e) => set('question', e.target.value)} required />
        </Field>
        <Field label="Odpowiedź">
          <textarea rows={4} value={form.answer || ''} onChange={(e) => set('answer', e.target.value)} />
        </Field>
        <div className="grid cols-2">
          <Field label="Kolejność sortowania">
            <input type="number" value={form.sortOrder ?? 0} onChange={(e) => set('sortOrder', e.target.value)} />
          </Field>
          <label className="field">
            <span>Na panelu głównym</span>
            <select value={form.onDashboard ? '1' : '0'} onChange={(e) => set('onDashboard', e.target.value === '1')}>
              <option value="0">Nie</option>
              <option value="1">Tak</option>
            </select>
          </label>
        </div>
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
