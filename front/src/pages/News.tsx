import { useEffect, useState } from 'react';

import { api } from '../api';

export default function News() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/news?per_page=20').then((d) => setItems(d.items)).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="spinner">Ładowanie aktualności…</div>;

  return (
    <div>
      <div className="page-head">
        <h1>Aktualności</h1>
      </div>
      {items.length === 0 && <div className="empty">Brak aktualności.</div>}
      <div className="grid cols-2">
        {items.map((n) => (
          <article key={n.id} className="card pad">
            <div className="muted" style={{ fontSize: 12, marginBottom: 6 }}>
              {new Date(n.createdAt).toLocaleDateString('pl-PL')}
            </div>
            <h3>{n.title}</h3>
            <p className="muted" style={{ marginBottom: 0 }}>{n.content}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
