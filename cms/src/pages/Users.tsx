import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Eye, User, Building2 } from 'lucide-react';
import { api, jr, date } from '../api';
import { Spinner, Empty, Pager, ErrorAlert } from '../components/ui';

const PER_PAGE = 20;

const LIQUIDITY: Record<number, [string, string]> = {
  1: ['Bezpieczny', 'green'],
  2: ['Ostrzeżenie', 'amber'],
  3: ['Zagrożenie', 'red'],
};
function LiquidityPill({ status }: { status: number }) {
  const [label, cls] = LIQUIDITY[status] || ['Nieznany', 'gray'];
  return (
    <span className={`badge ${cls}`}>
      <span className="pdot" />
      {label}
    </span>
  );
}

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
        <div>
          <h1>Użytkownicy</h1>
          <p className="sub">
            {total.toLocaleString('pl-PL')} kont klientów · zarządzanie i podgląd
          </p>
        </div>
      </div>

      <form className="filterbar" onSubmit={doSearch}>
        <div className="grow" style={{ position: 'relative' }}>
          <Search
            size={17}
            style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-3)' }}
          />
          <input
            placeholder="Szukaj: imię, e-mail, ID…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{ paddingLeft: 38 }}
          />
        </div>
        <select
          value={accountType}
          onChange={(e) => {
            setPage(1);
            setAccountType(e.target.value);
          }}
          style={{ width: 190 }}
        >
          <option value="">Typ konta: wszystkie</option>
          <option value="1">Osoba prywatna</option>
          <option value="2">Firma</option>
        </select>
        <button className="btn primary" type="submit">
          <Search size={15} /> Szukaj
        </button>
      </form>

      <ErrorAlert error={error} />

      <div className="table-card">
        {loading ? (
          <Spinner />
        ) : items.length === 0 ? (
          <Empty>Brak użytkowników.</Empty>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Użytkownik</th>
                  <th>Typ</th>
                  <th>ID</th>
                  <th>Rejestracja</th>
                  <th className="num">Saldo JR</th>
                  <th className="num">Programy</th>
                  <th>Płynność</th>
                  <th className="actions">Akcje</th>
                </tr>
              </thead>
              <tbody>
                {items.map((u) => {
                  const isCompany = u.type === 2;
                  const name = isCompany
                    ? u.companyName || u.name || '—'
                    : [u.firstName, u.lastName].filter(Boolean).join(' ') || u.name || '—';
                  return (
                    <tr key={u.id} style={{ cursor: 'pointer' }} onClick={() => nav(`/user/${u.id}`)}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                          <div className="av-sq">
                            {isCompany ? <Building2 size={18} /> : <User size={18} />}
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <b style={{ display: 'block' }}>{name}</b>
                            <span className="muted" style={{ fontSize: 12.5 }}>{u.email}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${isCompany ? 'blue' : 'gray'}`}>
                          {isCompany ? 'Firma' : 'Osoba prywatna'}
                        </span>
                      </td>
                      <td>
                        <code className="mono">{u.code || u.number || `#${u.id}`}</code>
                      </td>
                      <td className="muted">{date(u.createdAt || u.registeredAt || u.createDate)}</td>
                      <td className="num">
                        <b>{jr(u.jrActive ?? u.activeJr ?? u.wallet?.active)}</b>
                      </td>
                      <td className="num">{u.programsCount ?? u.programs ?? 0}</td>
                      <td>
                        <LiquidityPill status={u.paymentStatus} />
                      </td>
                      <td className="actions" onClick={(e) => e.stopPropagation()}>
                        <button className="act" title="Podgląd" onClick={() => nav(`/user/${u.id}`)}>
                          <Eye size={15} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Pager page={page} perPage={PER_PAGE} total={total} onPage={setPage} />
    </div>
  );
}
