import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, jr, pln, date } from '../api';
import { Spinner, Empty, StatusBadge, Pager, ErrorAlert } from '../components/ui';

const TABS = [
  { key: 'pay-in', label: 'Pay-in', endpoint: 'in' },
  { key: 'pay-out', label: 'Pay-out', endpoint: 'out' },
  { key: 'requests', label: 'Requests', endpoint: 'requests' },
];
const PER_PAGE = 20;

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

  const load = () => {
    setLoading(true);
    api
      .get(`/admin/payments/${current.endpoint}?page=${page}&per_page=${PER_PAGE}`)
      .then((r) => {
        setItems(r.items || []);
        setTotal(r.total || 0);
      })
      .catch(setError)
      .finally(() => setLoading(false));
  };
  useEffect(() => {
    setPage(1);
  }, [tab]);
  useEffect(load, [tab, page]);

  const setStatus = async (fn: () => Promise<any>) => {
    setError(null);
    setMsg(null);
    try {
      await fn();
      setMsg('Status updated');
      load();
    } catch (err: any) {
      setError(err);
    }
  };

  const clientName = (c: any) =>
    !c
      ? '—'
      : c.companyName || [c.firstName, c.lastName].filter(Boolean).join(' ') || c.email || '—';

  return (
    <div>
      <div className="page-head">
        <h1>Payments</h1>
      </div>

      <div className="tabs">
        {TABS.map((t) => (
          <a
            key={t.key}
            className={t.key === tab ? 'active' : ''}
            style={{ cursor: 'pointer' }}
            onClick={() => nav(`/payments/${t.key}`)}
          >
            {t.label}
          </a>
        ))}
      </div>

      {msg && <div className="alert info">✓ {msg}</div>}
      <ErrorAlert error={error} />

      <div className="card">
        {loading ? (
          <Spinner />
        ) : items.length === 0 ? (
          <Empty>No payments.</Empty>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Client</th>
                <th>Type</th>
                <th>Value</th>
                {isRequests && <th>PLN eq.</th>}
                {isRequests && <th>Description</th>}
                <th>Status</th>
                <th>Date</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((p) => (
                <tr key={p.id}>
                  <td>
                    <b>{clientName(p.client)}</b>
                    <div className="muted">{p.client?.email}</div>
                  </td>
                  <td>{p.type}</td>
                  <td>{jr(p.value)}</td>
                  {isRequests && <td>{pln(p.plnEquivalent)}</td>}
                  {isRequests && <td>{p.description || '—'}</td>}
                  <td>
                    <StatusBadge status={p.status} />
                  </td>
                  <td>{date(p.createdAt)}</td>
                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    {isRequests ? (
                      <>
                        <button
                          className="btn sm"
                          style={{ marginRight: 6 }}
                          onClick={() =>
                            setStatus(() =>
                              api.post('/admin/payments/set-request-status', {
                                request: p.id,
                                status: 2,
                              })
                            )
                          }
                        >
                          Accept
                        </button>
                        <button
                          className="btn sm danger"
                          onClick={() =>
                            setStatus(() =>
                              api.post('/admin/payments/set-request-status', {
                                request: p.id,
                                status: 3,
                              })
                            )
                          }
                        >
                          Reject
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          className="btn sm"
                          style={{ marginRight: 6 }}
                          onClick={() =>
                            setStatus(() =>
                              api.patch(`/admin/payments/${p.id}/set-status`, { status: 2 })
                            )
                          }
                        >
                          Accept
                        </button>
                        <button
                          className="btn sm danger"
                          onClick={() =>
                            setStatus(() =>
                              api.patch(`/admin/payments/${p.id}/set-status`, { status: 3 })
                            )
                          }
                        >
                          Reject
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Pager page={page} perPage={PER_PAGE} total={total} onPage={setPage} />
    </div>
  );
}
