import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, jr } from '../api';
import { Spinner, Empty, YesNo, ErrorAlert } from '../components/ui';

export default function Programs() {
  const nav = useNavigate();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [vip, setVip] = useState('');

  const load = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('query', search);
    if (vip) params.set('vip', vip);
    api
      .get(`/admin/programs?${params.toString()}`)
      .then((r) => setItems(Array.isArray(r) ? r : r.items || []))
      .catch(setError)
      .finally(() => setLoading(false));
  };
  useEffect(load, [search, vip]);

  const del = async (id: any) => {
    if (!confirm('Usunąć ten program?')) return;
    try {
      await api.del(`/admin/programs/${id}`);
      load();
    } catch (err: any) {
      setError(err);
    }
  };

  return (
    <div>
      <div className="page-head">
        <h1>Programy</h1>
        <div className="btn-row">
          <form
            className="btn-row"
            onSubmit={(e) => {
              e.preventDefault();
              setSearch(query);
            }}
          >
            <input
              placeholder="Szukaj…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{ width: 180 }}
            />
            <select value={vip} onChange={(e) => setVip(e.target.value)} style={{ width: 120 }}>
              <option value="">Wszystkie</option>
              <option value="1">Tylko VIP</option>
              <option value="0">Bez VIP</option>
            </select>
            <button className="btn" type="submit">
              Szukaj
            </button>
          </form>
          <button className="btn primary" onClick={() => nav('/programs/edit')}>
            + Dodaj program
          </button>
        </div>
      </div>

      <ErrorAlert error={error} />

      <div className="card">
        {loading ? (
          <Spinner />
        ) : items.length === 0 ? (
          <Empty>Brak programów.</Empty>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Nazwa</th>
                <th>Opis</th>
                <th>Abonament</th>
                <th>Opłata wstępna</th>
                <th>Zakupy</th>
                <th>VIP</th>
                <th>Widoczny</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {items.map((p) => (
                <tr key={p.id}>
                  <td>
                    <b>{p.name}</b>
                  </td>
                  <td className="muted" style={{ maxWidth: 260 }}>
                    {(p.description || '').slice(0, 80)}
                  </td>
                  <td>{jr(p.subscriptionPrice)}</td>
                  <td>{jr(p.entryFee)}</td>
                  <td>{p.purchaseCount ?? 0}</td>
                  <td>
                    <YesNo value={p.vip} />
                  </td>
                  <td>
                    <YesNo value={p.visible} />
                  </td>
                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <button
                      className="btn sm"
                      style={{ marginRight: 6 }}
                      onClick={() => nav(`/programs/edit/${p.id}`)}
                    >
                      Edytuj
                    </button>
                    <button className="btn sm danger" onClick={() => del(p.id)}>
                      Usuń
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
