import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, jr } from '../api';
import { Spinner, Empty, YesNo, ErrorAlert } from '../components/ui';

export default function SystemPartners() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);

  useEffect(() => {
    setLoading(true);
    api
      .get('/admin/system-partners')
      .then((r) => setItems(Array.isArray(r) ? r : r.items || []))
      .catch(setError)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="page-head">
        <h1>Partnerzy systemowi</h1>
      </div>

      <ErrorAlert error={error} />

      <div className="card">
        {loading ? (
          <Spinner />
        ) : items.length === 0 ? (
          <Empty>Brak partnerów systemowych.</Empty>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Nr partnera</th>
                <th>E-mail</th>
                <th>Polecenia</th>
                <th>Prowizja %</th>
                <th>Do wypłaty prowizji</th>
                <th>Niestandardowa</th>
              </tr>
            </thead>
            <tbody>
              {items.map((p) => (
                <tr key={p.id}>
                  <td>
                    <b>{p.partnerNumber}</b>
                  </td>
                  <td>{p.userId ? <Link to={`/user/${p.userId}`}>{p.email}</Link> : p.email}</td>
                  <td>{p.referredCount ?? 0}</td>
                  <td>{p.commissionPercent != null ? `${p.commissionPercent}%` : '—'}</td>
                  <td>{jr(p.toCommissionPayout)}</td>
                  <td>
                    <YesNo value={p.custom} />
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
