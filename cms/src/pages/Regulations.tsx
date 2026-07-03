import { useEffect, useState } from 'react';
import { api } from '../api';
import { Spinner, Empty, Field, ErrorAlert } from '../components/ui';

export default function Regulations() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);
  const [msg, setMsg] = useState<string | null>(null);

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
    try {
      const id = rule.id ?? 'new';
      await api.post(`/admin/registration-rules/${id}`, {
        name: rule.name,
        content: rule.content,
        required: rule.required,
      });
      setMsg('Zapisano');
      load();
    } catch (err: any) {
      setError(err);
    }
  };

  if (loading) return <Spinner />;

  return (
    <div>
      <div className="page-head">
        <h1>Regulaminy</h1>
        <button
          className="btn primary"
          onClick={() => setItems((it) => [...it, { id: null, name: '', content: '', required: false }])}
        >
          + Dodaj regulamin
        </button>
      </div>

      {msg && <div className="alert info">✓ {msg}</div>}
      <ErrorAlert error={error} />

      {items.length === 0 ? (
        <Empty>Brak regulaminów.</Empty>
      ) : (
        items.map((rule, i) => (
          <RuleCard
            key={rule.id ?? `new-${i}`}
            rule={rule}
            onChange={(r) => setItems((it) => it.map((x, idx) => (idx === i ? r : x)))}
            onSave={save}
          />
        ))
      )}
    </div>
  );
}

function RuleCard({
  rule,
  onChange,
  onSave,
}: {
  rule: any;
  onChange: (r: any) => void;
  onSave: (r: any) => void;
}) {
  return (
    <div className="card pad" style={{ marginBottom: 16 }}>
      <div className="grid cols-2">
        <Field label="Nazwa">
          <input value={rule.name || ''} onChange={(e) => onChange({ ...rule, name: e.target.value })} />
        </Field>
        <label className="field">
          <span>Wymagany</span>
          <select
            value={rule.required ? '1' : '0'}
            onChange={(e) => onChange({ ...rule, required: e.target.value === '1' })}
          >
            <option value="0">Nie</option>
            <option value="1">Tak</option>
          </select>
        </label>
      </div>
      <Field label="Treść">
        <textarea
          rows={4}
          value={rule.content || ''}
          onChange={(e) => onChange({ ...rule, content: e.target.value })}
        />
      </Field>
      <div className="btn-row" style={{ justifyContent: 'flex-end' }}>
        <button className="btn primary" onClick={() => onSave(rule)}>
          Zapisz
        </button>
      </div>
    </div>
  );
}
