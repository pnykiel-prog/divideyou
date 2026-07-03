import { useEffect, useState } from 'react';
import { api } from '../api';

export default function Faq() {
  const [items, setItems] = useState<any[]>([]);
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => { api.get('/faq').then(setItems); }, []);

  return (
    <div>
      <div className="page-head"><h1>Najczęściej zadawane pytania</h1></div>
      <div className="card">
        {items.map((f) => (
          <div key={f.id} style={{ borderBottom: '1px solid var(--border)' }}>
            <div
              onClick={() => setOpen(open === f.id ? null : f.id)}
              style={{ padding: '16px 20px', cursor: 'pointer', fontWeight: 600, display: 'flex', justifyContent: 'space-between' }}
            >
              {f.question}
              <span className="muted">{open === f.id ? '−' : '+'}</span>
            </div>
            {open === f.id && <div className="muted" style={{ padding: '0 20px 18px' }}>{f.answer}</div>}
          </div>
        ))}
        {items.length === 0 && <div className="empty">Brak pytań.</div>}
      </div>
    </div>
  );
}
