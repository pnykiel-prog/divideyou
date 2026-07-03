import { useEffect, useState } from 'react';
import { Link, NavLink, useParams } from 'react-router-dom';
import { api, jr } from '../api';

export default function Bonuses() {
  const { tab = 'available' } = useParams();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const url = tab === 'my' ? '/profile/bonuses' : '/bonuses';
    api.get(url).then((d) => setItems(tab === 'my' ? d.map((p: any) => p.program || p) : d)).finally(() => setLoading(false));
  }, [tab]);

  return (
    <div>
      <div className="page-head"><h1>Bonuses</h1></div>
      <div className="tabs">
        <NavLink to="/bonuses/available" className={tab === 'available' ? 'active' : ''}>Available</NavLink>
        <NavLink to="/bonuses/my" className={tab === 'my' ? 'active' : ''}>My bonuses</NavLink>
      </div>
      {loading ? <div className="spinner">Loading…</div> : items.length === 0 ? (
        <div className="empty">No bonuses found.</div>
      ) : (
        <div className="grid cols-3">
          {items.map((b) => (
            <Link key={b.id} to={`/bonus/${b.id}`} className="card tile">
              <div className="tile-img">🎁</div>
              <div style={{ padding: 16 }}>
                <h3 style={{ marginBottom: 4 }}>{b.name}</h3>
                <p className="muted" style={{ fontSize: 13, minHeight: 38 }}>{(b.description || '').slice(0, 90)}</p>
                <span className="badge gray">{jr(b.entryFee)}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
