import { useEffect, useState } from 'react';
import { api } from '../api';
import { Spinner, Empty, ErrorAlert } from '../components/ui';

const COUNT_TILES: [string, string][] = [
  ['users', 'Użytkownicy'],
  ['admins', 'Administratorzy'],
  ['programs', 'Programy'],
  ['bonuses', 'Bonusy'],
  ['locations', 'Lokalizacje'],
  ['purchases', 'Zakupy'],
  ['activePurchases', 'Aktywne zakupy'],
];

const SERIES: { key: string; label: string; endpoint: string }[] = [
  { key: 'registrations', label: 'Rejestracje', endpoint: 'registrations' },
  { key: 'purchases-program', label: 'Zakupy programów', endpoint: 'purchases-program' },
  { key: 'purchases-bonus', label: 'Zakupy bonusów', endpoint: 'purchases-bonus' },
  { key: 'purchases-jr', label: 'Zakupy JR', endpoint: 'purchases-jr' },
];

function iso(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default function Statistics() {
  const [counts, setCounts] = useState<any>(null);
  const [popular, setPopular] = useState<any[]>([]);
  const [series, setSeries] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);

  const today = iso(new Date());
  const monthAgo = iso(new Date(Date.now() - 30 * 86400000));
  const [from, setFrom] = useState(monthAgo);
  const [to, setTo] = useState(today);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get('/admin/statistics/counts').catch(() => null),
      api.get('/admin/statistics/popular-locations').catch(() => []),
    ])
      .then(([c, p]) => {
        setCounts(c);
        setPopular(Array.isArray(p) ? p : p?.items || []);
      })
      .catch(setError)
      .finally(() => setLoading(false));
  }, []);

  const loadSeries = () => {
    SERIES.forEach((s) => {
      api
        .post(`/admin/statistics/${s.endpoint}`, { from, to })
        .then((r) => setSeries((prev) => ({ ...prev, [s.key]: Array.isArray(r) ? r : r.items || [] })))
        .catch(() => setSeries((prev) => ({ ...prev, [s.key]: [] })));
    });
  };
  useEffect(loadSeries, [from, to]);

  if (loading) return <Spinner />;

  return (
    <div>
      <div className="page-head">
        <h1>Statystyki</h1>
      </div>

      <ErrorAlert error={error} />

      <div className="grid cols-4" style={{ marginBottom: 24 }}>
        {COUNT_TILES.map(([k, label]) => (
          <div className="stat" key={k}>
            <div className="label">{label}</div>
            <div className="value">{counts?.[k] ?? 0}</div>
          </div>
        ))}
      </div>

      <div className="card pad" style={{ marginBottom: 24 }}>
        <div className="btn-row" style={{ alignItems: 'flex-end' }}>
          <label className="field" style={{ marginBottom: 0 }}>
            <span>Od</span>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </label>
          <label className="field" style={{ marginBottom: 0 }}>
            <span>Do</span>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </label>
        </div>
      </div>

      <div className="grid cols-2" style={{ marginBottom: 24 }}>
        {SERIES.map((s) => (
          <div className="card pad" key={s.key}>
            <h3>{s.label}</h3>
            <BarChart data={series[s.key] || []} />
          </div>
        ))}
      </div>

      <div className="card">
        <div className="pad" style={{ paddingBottom: 0 }}>
          <h3>Popularne lokalizacje</h3>
        </div>
        {popular.length === 0 ? (
          <Empty>Brak danych.</Empty>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Lokalizacja</th>
                <th>Liczba</th>
              </tr>
            </thead>
            <tbody>
              {popular.map((p, i) => (
                <tr key={i}>
                  <td>
                    <b>{p.name}</b>
                  </td>
                  <td>{p.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function BarChart({ data }: { data: any[] }) {
  if (!data || data.length === 0) return <Empty>Brak danych dla zakresu.</Empty>;
  const max = Math.max(1, ...data.map((d) => d.count || 0));
  const total = data.reduce((s, d) => s + (d.count || 0), 0);
  const w = 100 / data.length;
  return (
    <div>
      <div className="muted" style={{ marginBottom: 8 }}>
        Łącznie: {total}
      </div>
      <svg viewBox="0 0 100 40" preserveAspectRatio="none" style={{ width: '100%', height: 120 }}>
        {data.map((d, i) => {
          const h = ((d.count || 0) / max) * 38;
          return (
            <rect
              key={i}
              x={i * w + w * 0.15}
              y={40 - h}
              width={w * 0.7}
              height={h}
              fill="#3b5bdb"
              rx={0.4}
            >
              <title>
                {d.date}: {d.count}
              </title>
            </rect>
          );
        })}
      </svg>
    </div>
  );
}
