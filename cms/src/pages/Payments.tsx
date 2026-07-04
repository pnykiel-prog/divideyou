import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Download, Check, Ban, Search, ChevronDown } from 'lucide-react';
import { api, jr, pln, date } from '../api';
import { Spinner, Empty, StatusBadge, Pager, ErrorAlert } from '../components/ui';

const TABS = [
  { key: 'pay-in', label: 'Wpłaty', endpoint: 'in' },
  { key: 'pay-out', label: 'Wypłaty', endpoint: 'out' },
  { key: 'requests', label: 'Zwroty', endpoint: 'requests' },
];
const PER_PAGE = 20;

const STATUS_OPTIONS = [
  { value: 'all', label: 'Status: wszystkie' },
  { value: '1', label: 'Oczekujące' },
  { value: '2', label: 'Zaakceptowane' },
  { value: '3', label: 'Odrzucone' },
  { value: '0', label: 'Inicjacja' },
];

export default function Payments() {
  const { tab = 'pay-in' } = useParams();
  const nav = useNavigate();
  const current = TABS.find((t) => t.key === tab) || TABS[0];
  const isRequests = current.key === 'requests';

  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});

  // Presentation-only filters (client-side over the loaded page — no API change).
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('all');

  const load = () => {
    setLoading(true);
    api
      .get(`/admin/payments/${current.endpoint}?page=${page}&per_page=${PER_PAGE}`)
      .then((r) => {
        setItems(r.items || []);
        setTotal(r.total || 0);
        setCounts((c) => ({ ...c, [current.key]: r.total || 0 }));
      })
      .catch(setError)
      .finally(() => setLoading(false));
  };
  useEffect(() => {
    setPage(1);
    setQ('');
    setStatus('all');
  }, [tab]);
  useEffect(load, [tab, page]);

  const setStatusFor = async (fn: () => Promise<any>) => {
    setError(null);
    setMsg(null);
    try {
      await fn();
      setMsg('Zaktualizowano status');
      load();
    } catch (err: any) {
      setError(err);
    }
  };

  const clientName = (c: any) =>
    !c
      ? '—'
      : c.companyName || [c.firstName, c.lastName].filter(Boolean).join(' ') || c.email || '—';

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return items.filter((p) => {
      if (status !== 'all' && String(p.status) !== status) return false;
      if (!needle) return true;
      const hay = [
        p.id,
        clientName(p.client),
        p.client?.email,
        p.type,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(needle);
    });
  }, [items, q, status]);

  const amount = (p: any) => {
    const v = p.value ?? 0;
    const color = v > 0 ? 'var(--c-green)' : v < 0 ? 'var(--c-red)' : 'var(--ink)';
    const sign = v > 0 ? '+' : '';
    return (
      <span style={{ color, fontWeight: 700 }}>
        {sign}
        {jr(v)}
      </span>
    );
  };

  const acceptCall = (p: any) =>
    isRequests
      ? api.post('/admin/payments/set-request-status', { request: p.id, status: 2 })
      : api.patch(`/admin/payments/${p.id}/set-status`, { status: 2 });
  const rejectCall = (p: any) =>
    isRequests
      ? api.post('/admin/payments/set-request-status', { request: p.id, status: 3 })
      : api.patch(`/admin/payments/${p.id}/set-status`, { status: 3 });

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Płatności</h1>
          <p className="sub">Przepływy środków: wpłaty, wypłaty i zwroty.</p>
        </div>
        <button className="btn">
          <Download size={17} /> Eksport XLS
        </button>
      </div>

      <div className="tabs">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={t.key === tab ? 'active' : ''}
            onClick={() => nav(`/payments/${t.key}`)}
          >
            {t.label}
            {counts[t.key] != null && <span className="tab-count dy-num">{counts[t.key]}</span>}
          </button>
        ))}
      </div>

      {msg && <div className="alert info">✓ {msg}</div>}
      <ErrorAlert error={error} />

      <div className="filterbar">
        <div className="grow" style={{ position: 'relative' }}>
          <Search
            size={16}
            style={{ position: 'absolute', left: 12, top: 11, color: 'var(--ink-3)' }}
          />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Szukaj: ID, użytkownik…"
            style={{ paddingLeft: 36 }}
          />
        </div>
        <div style={{ position: 'relative' }}>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            style={{ width: 200, appearance: 'none', paddingRight: 34 }}
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <ChevronDown
            size={16}
            style={{
              position: 'absolute',
              right: 12,
              top: 11,
              color: 'var(--ink-3)',
              pointerEvents: 'none',
            }}
          />
        </div>
      </div>

      <div className="table-card">
        {loading ? (
          <Spinner />
        ) : filtered.length === 0 ? (
          <Empty>Brak płatności.</Empty>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Użytkownik</th>
                  <th>Data</th>
                  <th>Metoda</th>
                  <th className="num">Kwota JR</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Zmień status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <span className="mono">{p.id}</span>
                    </td>
                    <td>
                      <b>{clientName(p.client)}</b>
                      <div className="muted">{p.client?.email}</div>
                    </td>
                    <td>{date(p.createdAt)}</td>
                    <td>
                      {p.type}
                      {isRequests && p.description && (
                        <div className="muted" style={{ fontSize: 12 }}>
                          {p.description}
                        </div>
                      )}
                    </td>
                    <td className="num">
                      {amount(p)}
                      {isRequests && (
                        <div className="muted" style={{ fontSize: 12 }}>
                          {pln(p.plnEquivalent)}
                        </div>
                      )}
                    </td>
                    <td>
                      <StatusBadge status={p.status} />
                    </td>
                    <td className="actions">
                      <button
                        className="act ok"
                        title="Zaakceptuj"
                        style={{ marginRight: 6 }}
                        onClick={() => setStatusFor(() => acceptCall(p))}
                      >
                        <Check size={16} />
                      </button>
                      <button
                        className="act no"
                        title="Odrzuć"
                        onClick={() => setStatusFor(() => rejectCall(p))}
                      >
                        <Ban size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Pager page={page} perPage={PER_PAGE} total={total} onPage={setPage} />
    </div>
  );
}
