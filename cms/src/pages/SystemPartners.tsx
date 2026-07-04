import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye } from 'lucide-react';
import { api, jr } from '../api';
import { Spinner, Empty, ErrorAlert } from '../components/ui';

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
        <div>
          <h1>Partnerzy systemowi</h1>
          <p className="sub">Afiliacja · prowizje domyślne / niestandardowe.</p>
        </div>
      </div>

      <ErrorAlert error={error} />

      <div className="table-card">
        {loading ? (
          <Spinner />
        ) : items.length === 0 ? (
          <Empty>Brak partnerów systemowych.</Empty>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Partner</th>
                  <th>ID</th>
                  <th className="num">Poleceni</th>
                  <th className="num">Prowizje JR</th>
                  <th>Stawka</th>
                  <th style={{ textAlign: 'right' }}>Akcje</th>
                </tr>
              </thead>
              <tbody>
                {items.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <b>{p.name || p.email}</b>
                      {p.name && p.email && <div className="muted">{p.email}</div>}
                    </td>
                    <td className="mono">{p.partnerNumber}</td>
                    <td className="num dy-num">{p.referredCount ?? 0}</td>
                    <td className="num dy-num" style={{ color: 'var(--c-violet)', fontWeight: 700 }}>
                      {jr(p.toCommissionPayout)}
                    </td>
                    <td>
                      {p.custom ? (
                        <span className="badge violet"><span className="pdot" /> niestandardowa</span>
                      ) : (
                        <span className="badge gray">domyślna</span>
                      )}
                      {p.commissionPercent != null && (
                        <span className="muted" style={{ marginLeft: 8 }}>{p.commissionPercent}%</span>
                      )}
                    </td>
                    <td className="actions">
                      <div style={{ display: 'inline-flex', gap: 6 }}>
                        {p.userId && (
                          <Link className="act" to={`/user/${p.userId}`} title="Zobacz partnera">
                            <Eye size={15} />
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
