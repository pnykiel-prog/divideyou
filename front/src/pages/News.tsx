import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowRight, ArrowLeft, Calendar } from 'lucide-react';
import { api } from '../api';
import { Spinner, Empty, gradient } from '../ui';

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' });

export default function News() {
  const { slug } = useParams();
  if (slug) return <NewsDetail slug={slug} />;
  return <NewsFeed />;
}

function NewsFeed() {
  const nav = useNavigate();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/news?per_page=20').then((d) => setItems(d.items)).finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;

  return (
    <div>
      <div className="screen-head">
        <h1 className="screen-title dy-h">Aktualności</h1>
        <p className="screen-sub">Najnowsze ogłoszenia i informacje z platformy.</p>
      </div>

      {items.length === 0 ? (
        <Empty>Brak aktualności.</Empty>
      ) : (
        <div className="news-masonry">
          {items.map((n, i) => (
            <article key={n.id} className="news-card" onClick={() => n.slug && nav(`/news/${n.slug}`)} style={{ cursor: n.slug ? 'pointer' : 'default' }}>
              <div className="news-media" style={{ background: gradient(n.id || n.slug), height: 120 + (i % 3) * 40 }}>
                <span className="badge badge-rec">Aktualność</span>
              </div>
              <div className="news-body">
                <div className="row muted" style={{ gap: 6, fontSize: 12.5 }}>
                  <Calendar size={13} /> {fmtDate(n.createdAt)}
                </div>
                <h3 className="news-title">{n.title}</h3>
                <p className="muted" style={{ margin: 0, lineHeight: 1.55, display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {n.content}
                </p>
                {n.slug && (
                  <a className="row" style={{ gap: 6, marginTop: 12, color: 'var(--brand-600)', fontWeight: 700 }}>
                    Czytaj więcej <ArrowRight size={16} />
                  </a>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function NewsDetail({ slug }: { slug: string }) {
  const nav = useNavigate();
  const [item, setItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/news/${slug}`).then(setItem).finally(() => setLoading(false));
  }, [slug]);

  if (loading) return <Spinner />;
  if (!item) return <Empty>Nie znaleziono aktualności.</Empty>;

  return (
    <div style={{ maxWidth: 760, margin: '0 auto' }}>
      <a className="row muted" style={{ gap: 6, cursor: 'pointer', marginBottom: 16, fontWeight: 700 }} onClick={() => nav('/news')}>
        <ArrowLeft size={16} /> Wróć do aktualności
      </a>
      <div className="card" style={{ overflow: 'hidden' }}>
        <div style={{ background: gradient(item.id || item.slug), height: 200, display: 'flex', alignItems: 'flex-start', padding: 16 }}>
          <span className="badge badge-rec">Aktualność</span>
        </div>
        <div className="card-pad">
          <div className="row muted" style={{ gap: 6, fontSize: 12.5 }}>
            <Calendar size={13} /> {fmtDate(item.createdAt)}
          </div>
          <h1 className="dy-h" style={{ fontSize: 28, margin: '8px 0 14px' }}>{item.title}</h1>
          <p style={{ color: 'var(--ink-2)', fontSize: 15, lineHeight: 1.7, whiteSpace: 'pre-wrap', margin: 0 }}>
            {item.content}
          </p>
        </div>
      </div>
    </div>
  );
}
