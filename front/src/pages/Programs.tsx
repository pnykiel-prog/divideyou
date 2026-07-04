import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, jr } from '../api';
import { Spinner, Empty, Bg, keywordFor } from '../ui';
import { MapPin, Search, Filter, Star } from 'lucide-react';

export default function Programs({ vip }: { vip: boolean }) {
  const { tab = 'available' } = useParams();
  const [items, setItems] = useState<any[]>([]);
  const [query, setQuery] = useState('');
  const [radius, setRadius] = useState(15);
  const [loading, setLoading] = useState(true);
  const base = vip ? '/vip-programs' : '/programs';

  useEffect(() => {
    setLoading(true);
    let url: string;
    if (tab === 'my') url = vip ? '/profile/vip-programs' : '/profile/programs';
    else if (tab === 'observed') url = '/programs/observed';
    else url = vip ? '/programs/vip' : `/programs${query ? `?query=${encodeURIComponent(query)}` : ''}`;
    api
      .get(url)
      .then((d) => setItems(tab === 'my' ? d.map((p: any) => p.location || p.program || p) : d))
      .finally(() => setLoading(false));
  }, [tab, vip, query]);

  const myTab = tab === 'my';

  const emptyText = query
    ? `Brak programów dla „${query}”. Spróbuj innej frazy.`
    : tab === 'my'
      ? 'Nie masz jeszcze aktywnych programów.'
      : tab === 'observed'
        ? 'Nie obserwujesz jeszcze żadnego programu.'
        : 'Brak dostępnych programów w tej okolicy.';

  const tabActive = (t: string, isVip: boolean) => (isVip ? vip : !vip && tab === t);

  return (
    <div>
      <div className="screen-head">
        <h1 className="screen-title dy-h">Programy</h1>
        <p className="screen-sub">Wybierz program w swojej okolicy i rozlicz się w JR.</p>
      </div>

      <div className="tabs" style={{ marginBottom: 20 }}>
        <Link to={`${base}/available`} className={`tab${tabActive('available', false) ? ' active' : ''}`}>Dostępne</Link>
        <Link to={`${base}/my`} className={`tab${tab === 'my' ? ' active' : ''}`}>Moje</Link>
        <Link to="/programs/observed" className={`tab${tabActive('observed', false) ? ' active' : ''}`}>Obserwowane</Link>
        <Link to="/vip-programs/available" className={`tab${vip ? ' active' : ''}`}>VIP</Link>
      </div>

      {vip && (
        <div className="banner info" style={{ marginBottom: 20 }}>
          <span className="banner-ic"><Star size={20} /></span>
          <div className="grow">
            <div className="banner-title">Programy VIP</div>
            <div className="banner-text">Dostępne po przekroczeniu minimalnego salda JR na koncie.</div>
          </div>
        </div>
      )}

      <div className="grid-side">
        <div>
          <div className="row" style={{ marginBottom: 16 }}>
            <div className="input-icon grow">
              <Search size={18} />
              <input
                className="input"
                placeholder="Szukaj programów…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <button className="btn btn-ghost"><Filter size={17} /> Filtry</button>
          </div>

          {loading ? (
            <Spinner />
          ) : items.length === 0 ? (
            <Empty>{emptyText}</Empty>
          ) : (
            <div className="prog-grid">
              {items.map((p) => (
                <ProgramCard key={p.id} p={p} myTab={myTab} vipPage={vip} observedTab={tab === 'observed'} />
              ))}
            </div>
          )}
        </div>

        <div className="sticky-col">
          <div className="map-panel">
            <MapPin className="map-pin" size={26} style={{ top: '22%', left: '28%', color: 'var(--c-active)' }} fill="currentColor" strokeWidth={0} />
            <MapPin className="map-pin" size={22} style={{ top: '46%', left: '62%', color: 'var(--c-pending)' }} fill="currentColor" strokeWidth={0} />
            <MapPin className="map-pin" size={24} style={{ top: '68%', left: '40%', color: 'var(--c-payout)' }} fill="currentColor" strokeWidth={0} />
            <MapPin className="map-pin" size={20} style={{ top: '34%', left: '78%', color: 'var(--c-commission)' }} fill="currentColor" strokeWidth={0} />
            <div style={{ position: 'absolute', bottom: 12, left: 12, right: 12, background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 10, padding: '8px 12px', fontSize: 12.5, color: 'var(--ink-2)' }}>
              Programy w Twojej okolicy — podgląd mapy.
            </div>
          </div>
          <div className="card card-pad" style={{ marginTop: 16 }}>
            <div className="between" style={{ marginBottom: 10 }}>
              <span className="label">Promień</span>
              <span className="dy-num" style={{ fontWeight: 700 }}>{radius} km</span>
            </div>
            <input
              type="range"
              min={1}
              max={30}
              value={radius}
              onChange={(e) => setRadius(Number(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--brand)' }}
            />
            <div className="between muted" style={{ fontSize: 11.5, marginTop: 4 }}>
              <span>1 km</span>
              <span>30 km</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProgramCard({ p, myTab, vipPage, observedTab }: { p: any; myTab: boolean; vipPage: boolean; observedTab: boolean }) {
  const nav = useNavigate();
  // In "my" tab the items are locations/purchases; link accordingly.
  const to = myTab ? `/location/${p.id}` : `/program/${p.id}`;
  const isVip = !!p.vip || vipPage;
  const isRec = !!p.recommended;
  const isObs = !!p.observed || observedTab;
  const cat = p.category || (isVip ? 'Program VIP' : 'Program partnerski');
  const locCount = p.locationsCount ?? p.locationCount ?? p.locationsAmount;

  return (
    <div className="prog-card" onClick={() => nav(to)}>
      <Bg q={keywordFor(p.name)} seed={p.id} w={800} h={360} className="prog-media">
        <div className="prog-badges">
          {isVip && <span className="badge badge-vip">VIP</span>}
          {isRec && <span className="badge badge-rec">POLECANY</span>}
          {isObs && <span className="badge badge-obs">OBSERWOWANY</span>}
        </div>
      </Bg>
      <div className="prog-body">
        <div className="prog-cat">{cat}</div>
        <div className="prog-name">{p.name}</div>
        {p.description && <div className="prog-desc">{String(p.description).slice(0, 96)}</div>}
        {(p.city || locCount != null) && (
          <div className="prog-loc">
            <MapPin size={14} />
            {p.city || 'Wiele miast'}
            {locCount != null && ` · ${locCount} lokalizacji`}
          </div>
        )}
        <div className="prog-foot">
          <div className="stack">
            <span className="k">Opłata wstępna</span>
            <span className="v dy-num">{jr(p.entryFee)}</span>
          </div>
          <div className="stack">
            <span className="k">Abonament / mies.</span>
            <span className="v sub dy-num">{jr(p.subscriptionPrice)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
