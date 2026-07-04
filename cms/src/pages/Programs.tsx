import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Pencil, Eye, Trash2 } from 'lucide-react';
import { api, jr } from '../api';
import { Spinner, Empty, ErrorAlert } from '../components/ui';

function StatusPill({ p }: { p: any }) {
  if (p.draft || p.isDraft || p.status === 'draft')
    return <span className="badge amber"><span className="pdot" />Wersja robocza</span>;
  if (p.visible) return <span className="badge green"><span className="pdot" />Widoczny</span>;
  return <span className="badge gray"><span className="pdot" />Ukryty</span>;
}

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
        <div>
          <h1>Programy</h1>
          <p className="sub">Katalog programów i historia zakupów.</p>
        </div>
        <button className="btn primary" onClick={() => nav('/programs/edit')}>
          <Plus size={16} /> Dodaj program
        </button>
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
            placeholder="Szukaj programu…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{ paddingLeft: 36 }}
          />
        </div>
        <select value={vip} onChange={(e) => setVip(e.target.value)} style={{ width: 160 }}>
          <option value="">Wszystkie</option>
          <option value="1">Tylko VIP</option>
          <option value="0">Bez VIP</option>
        </select>
        <button className="btn" type="submit">
          Szukaj
        </button>
      </form>

      {loading ? (
        <div className="table-card">
          <Spinner />
        </div>
      ) : items.length === 0 ? (
        <div className="table-card">
          <Empty>Brak programów.</Empty>
        </div>
      ) : (
        <div className="table-card">
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Nazwa</th>
                  <th>Kategoria</th>
                  <th className="num">Lok.</th>
                  <th className="num">Wstępna</th>
                  <th className="num">Abon.</th>
                  <th>VIP</th>
                  <th className="num">Zakupy</th>
                  <th>Status</th>
                  <th className="num">Akcje</th>
                </tr>
              </thead>
              <tbody>
                {items.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <b>{p.name}</b>
                    </td>
                    <td className="muted">{p.category ?? p.categoryName ?? '—'}</td>
                    <td className="num dy-num">{p.locationsCount ?? p.locations?.length ?? '—'}</td>
                    <td className="num dy-num">{jr(p.entryFee)}</td>
                    <td className="num dy-num" style={{ fontWeight: 700, color: 'var(--brand)' }}>
                      {jr(p.subscriptionPrice)}
                    </td>
                    <td>
                      {p.vip ? (
                        <span className="badge amber">Tak</span>
                      ) : (
                        <span className="badge gray">Nie</span>
                      )}
                    </td>
                    <td className="num dy-num">{p.purchaseCount ?? 0}</td>
                    <td>
                      <StatusPill p={p} />
                    </td>
                    <td className="actions">
                      <button className="act" title="Edytuj" onClick={() => nav(`/programs/edit/${p.id}`)}>
                        <Pencil size={15} />
                      </button>
                      <button className="act" title="Podgląd" onClick={() => nav(`/programs/edit/${p.id}`)}>
                        <Eye size={15} />
                      </button>
                      <button className="act del" title="Usuń" onClick={() => del(p.id)}>
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
