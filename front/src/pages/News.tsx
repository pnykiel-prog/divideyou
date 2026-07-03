import { useEffect, useState } from 'react';

import { api } from '../api';

export default function News() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/news?per_page=20').then((d) => setItems(d.items)).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="spinner">Loading news…</div>;

  return (
    <div>
      <div className="page-head">
        <h1>News</h1>
      </div>
      {items.length === 0 && <div className="empty">No news yet.</div>}
      <div className="grid cols-2">
        {items.map((n) => (
          <article key={n.id} className="card pad">
            <div className="muted" style={{ fontSize: 12, marginBottom: 6 }}>
              {new Date(n.createdAt).toLocaleDateString()}
            </div>
            <h3>{n.title}</h3>
            <p className="muted" style={{ marginBottom: 0 }}>{n.content}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
