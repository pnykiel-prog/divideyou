import { useEffect, useState } from 'react';
import { Link, NavLink, useParams } from 'react-router-dom';
import { api, jr } from '../api';

export default function Programs({ vip }: { vip: boolean }) {
  const { tab = 'available' } = useParams();
  const [items, setItems] = useState<any[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const base = vip ? '/vip-programs' : '/programs';

  useEffect(() => {
    setLoading(true);
    let url: string;
    if (tab === 'my') url = vip ? '/profile/vip-programs' : '/profile/programs';
    else if (tab === 'observed') url = '/programs/observed';
    else url = vip ? '/programs/vip' : `/programs${query ? `?query=${encodeURIComponent(query)}` : ''}`;
    api.get(url).then((d) => setItems(tab === 'my' ? d.map((p: any) => p.location || p.program || p) : d)).finally(() => setLoading(false));
  }, [tab, vip, query]);

  return (
    <div>
      <div className="page-head">
        <h1>{vip ? 'Programy VIP' : 'Programy'}</h1>
        {tab === 'available' && (
          <input placeholder="Szukaj programów…" value={query} onChange={(e) => setQuery(e.target.value)} style={{ maxWidth: 260 }} />
        )}
      </div>
      <div className="tabs">
        <NavLink to={`${base}/available`} className={tab === 'available' ? 'active' : ''}>Dostępne</NavLink>
        <NavLink to={`${base}/my`} className={tab === 'my' ? 'active' : ''}>Moje programy</NavLink>
        {!vip && <NavLink to={`${base}/observed`} className={tab === 'observed' ? 'active' : ''}>Obserwowane</NavLink>}
      </div>

      {loading ? <div className="spinner">Ładowanie…</div> : items.length === 0 ? (
        <div className="empty">Nie znaleziono programów.</div>
      ) : (
        <div className="grid cols-3">
          {items.map((p) => (
            <ProgramCard key={p.id} p={p} myTab={tab === 'my'} />
          ))}
        </div>
      )}
    </div>
  );
}

function ProgramCard({ p, myTab }: { p: any; myTab: boolean }) {
  // In "my" tab the items are locations/purchases; link accordingly.
  const to = myTab ? `/location/${p.id}` : `/program/${p.id}`;
  return (
    <Link to={to} className="card tile" style={{ overflow: 'hidden' }}>
      <div className="tile-img">{p.vip ? '⭐' : '🏢'}</div>
      <div style={{ padding: 16 }}>
        <h3 style={{ marginBottom: 4 }}>{p.name}</h3>
        <p className="muted" style={{ fontSize: 13, minHeight: 38 }}>{(p.description || '').slice(0, 90)}</p>
        <div className="btn-row" style={{ marginTop: 6 }}>
          {p.recommended && <span className="badge blue">Polecane</span>}
          {p.vip && <span className="badge amber">VIP</span>}
          {p.subscriptionPrice != null && <span className="badge gray">{jr(p.subscriptionPrice)}/mies.</span>}
        </div>
      </div>
    </Link>
  );
}
