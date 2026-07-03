import { useEffect, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { api } from '../api';
import { Spinner, Empty } from '../ui';

export default function Faq() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    api.get('/faq').then((d) => {
      setItems(d);
      if (d.length) setOpen(d[0].id);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;

  return (
    <div>
      <div className="screen-head">
        <h1 className="screen-title dy-h">Pomoc / FAQ</h1>
        <p className="screen-sub">Najczęstsze pytania o działanie platformy.</p>
      </div>

      <div style={{ maxWidth: 760 }}>
        {items.length === 0 && <Empty>Brak pytań.</Empty>}
        {items.map((f) => {
          const isOpen = open === f.id;
          return (
            <div className="faq-item" key={f.id}>
              <div className="faq-q" onClick={() => setOpen(isOpen ? null : f.id)}>
                <span>{f.question}</span>
                <ChevronDown
                  size={20}
                  strokeWidth={2}
                  style={{
                    flex: 'none',
                    color: 'var(--brand-600)',
                    transition: 'transform .2s ease',
                    transform: isOpen ? 'rotate(180deg)' : 'none',
                  }}
                />
              </div>
              {isOpen && <div className="faq-a">{f.answer}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
