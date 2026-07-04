import { useEffect, useState } from 'react';
import { Plus, Pencil, Download, Save } from 'lucide-react';
import { api, date } from '../api';
import { Spinner, Empty, Field, ErrorAlert } from '../components/ui';
import Modal from '../components/Modal';

const EMPTY = { id: null, name: '', content: '', required: false };

export default function Regulations() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [edit, setEdit] = useState<any | null>(null);

  const load = () => {
    setLoading(true);
    api
      .get('/admin/registration-rules')
      .then((r) => setItems(Array.isArray(r) ? r : r.items || []))
      .catch(setError)
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const save = async (rule: any) => {
    setError(null);
    setMsg(null);
    const id = rule.id ?? 'new';
    await api.post(`/admin/registration-rules/${id}`, {
      name: rule.name,
      content: rule.content,
      required: rule.required,
    });
    setMsg('Zapisano');
    load();
  };

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Regulaminy</h1>
          <p className="sub">Zgody rejestracyjne · generowanie PDF.</p>
        </div>
        <button className="btn primary" onClick={() => setEdit({ ...EMPTY })}>
          <Plus size={16} /> Dodaj regulamin
        </button>
      </div>

      {msg && <div className="alert info">✓ {msg}</div>}
      <ErrorAlert error={error} />

      <div className="table-card">
        {loading ? (
          <Spinner />
        ) : items.length === 0 ? (
          <Empty>Brak regulaminów.</Empty>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Dokument</th>
                  <th>Wymagalność</th>
                  <th>Wersja</th>
                  <th>Aktualizacja</th>
                  <th style={{ textAlign: 'right' }}>Akcje</th>
                </tr>
              </thead>
              <tbody>
                {items.map((rule, i) => {
                  const pdf = rule.pdfUrl || rule.fileUrl || rule.file || rule.url;
                  return (
                    <tr key={rule.id ?? `r-${i}`}>
                      <td><b>{rule.name || '—'}</b></td>
                      <td>
                        {rule.required ? (
                          <span className="badge green"><span className="pdot" /> Wymagany</span>
                        ) : (
                          <span className="badge gray">Opcjonalny</span>
                        )}
                      </td>
                      <td className="mono">{rule.version ?? '—'}</td>
                      <td className="dy-num">{rule.updatedAt ? date(rule.updatedAt) : '—'}</td>
                      <td className="actions">
                        <div style={{ display: 'inline-flex', gap: 6 }}>
                          {pdf && (
                            <a className="act no" title="Pobierz PDF" href={pdf} target="_blank" rel="noreferrer">
                              <Download size={15} />
                            </a>
                          )}
                          <button className="act" title="Edytuj" onClick={() => setEdit(rule)}>
                            <Pencil size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {edit && (
        <RuleModal
          rule={edit}
          onClose={() => setEdit(null)}
          onSave={async (r) => {
            try {
              await save(r);
              setEdit(null);
            } catch (err: any) {
              setError(err);
            }
          }}
        />
      )}
    </div>
  );
}

function RuleModal({
  rule,
  onClose,
  onSave,
}: {
  rule: any;
  onClose: () => void;
  onSave: (r: any) => Promise<void>;
}) {
  const [form, setForm] = useState<any>({ ...EMPTY, ...rule });
  const [busy, setBusy] = useState(false);
  const editing = !!rule.id;
  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    await onSave(form);
    setBusy(false);
  };

  return (
    <Modal title={editing ? 'Edytuj regulamin' : 'Dodaj regulamin'} onClose={onClose} wide>
      <form onSubmit={submit}>
        <div className="grid cols-2">
          <Field label="Nazwa">
            <input value={form.name || ''} onChange={(e) => set('name', e.target.value)} required />
          </Field>
          <label className="field">
            <span>Wymagalność</span>
            <select value={form.required ? '1' : '0'} onChange={(e) => set('required', e.target.value === '1')}>
              <option value="0">Opcjonalny</option>
              <option value="1">Wymagany</option>
            </select>
          </label>
        </div>
        <Field label="Treść">
          <textarea rows={6} value={form.content || ''} onChange={(e) => set('content', e.target.value)} />
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
