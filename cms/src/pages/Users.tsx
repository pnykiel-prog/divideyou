import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, jr } from '../api';
import { Spinner, Empty, PaymentStatusBadge, Pager, ErrorAlert } from '../components/ui';

const PER_PAGE = 20;

export default function Users() {
  const nav = useNavigate();
  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [accountType, setAccountType] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);

  const load = () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), per_page: String(PER_PAGE) });
    if (search) params.set('query', search);
    if (accountType) params.set('accountType', accountType);
    api
      .get(`/admin/users?${params.toString()}`)
      .then((r) => {
        setItems(r.items || []);
        setTotal(r.total || 0);
      })
      .catch(setError)
      .finally(() => setLoading(false));
  };

  useEffect(load, [page, search, accountType]);

  const doSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSearch(query);
  };

  return (
    <div>
      <div className="page-head">
        <h1>Users</h1>
        <form className="btn-row" onSubmit={doSearch}>
          <input
            placeholder="Search name / email…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{ width: 240 }}
          />
          <select
            value={accountType}
            onChange={(e) => {
              setPage(1);
              setAccountType(e.target.value);
            }}
            style={{ width: 150 }}
          >
            <option value="">All types</option>
            <option value="1">Private</option>
            <option value="2">Company</option>
          </select>
          <button className="btn primary" type="submit">
            Search
          </button>
        </form>
      </div>

      <ErrorAlert error={error} />

      <div className="card">
        {loading ? (
          <Spinner />
        ) : items.length === 0 ? (
          <Empty>No users found.</Empty>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Name / Company</th>
                <th>Email</th>
                <th>Type</th>
                <th>JR active</th>
                <th>Payment</th>
                <th>Programs</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {items.map((u) => (
                <tr
                  key={u.id}
                  style={{ cursor: 'pointer' }}
                  onClick={() => nav(`/user/${u.id}`)}
                >
                  <td>
                    <b>
                      {u.type === 2
                        ? u.companyName || u.name || '—'
                        : [u.firstName, u.lastName].filter(Boolean).join(' ') || u.name || '—'}
                    </b>
                  </td>
                  <td>{u.email}</td>
                  <td>
                    <span className={`badge ${u.type === 2 ? 'blue' : 'gray'}`}>
                      {u.type === 2 ? 'Company' : 'Private'}
                    </span>
                  </td>
                  <td>{jr(u.jrActive ?? u.activeJr ?? u.wallet?.active)}</td>
                  <td>
                    <PaymentStatusBadge status={u.paymentStatus} />
                  </td>
                  <td>{u.programsCount ?? u.programs ?? 0}</td>
                  <td>
                    {u.blockedStatus === 3 ? (
                      <span className="badge red">Blocked</span>
                    ) : (
                      <span className="badge green">Active</span>
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
