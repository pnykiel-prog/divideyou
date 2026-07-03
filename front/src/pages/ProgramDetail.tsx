import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, jr } from '../api';
import { Spinner, Empty, gradient } from '../ui';
import { MapPin, ChevronRight, Info, ArrowRight } from 'lucide-react';

export default function ProgramDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const [program, setProgram] = useState<any>(null);
  const [locations, setLocations] = useState<any[]>([]);
  const [maxPrice, setMaxPrice] = useState('');

  useEffect(() => {
    api.get(`/programs/${id}`).then(setProgram).catch(() => {});
    api.get(`/programs/${id}/locations`).then(setLocations).catch(() => {});
  }, [id]);

  if (!program) return <Spinner />;

  const filtered = locations.filter((l) => !maxPrice || l.entryFee <= Number(maxPrice));
  const cat = program.category || (program.vip ? 'Program VIP' : 'Sport i zdrowie');

  return (
    <div className="grid-detail">
      <div>
        <div className="hero-media" style={{ background: gradient(id!) }}>
          <div className="prog-badges" style={{ position: 'absolute', top: 16, left: 16 }}>
            {program.vip && <span className="badge badge-vip">VIP</span>}
            {program.recommended && <span className="badge badge-rec">POLECANY</span>}
          </div>
          <div className="prog-cat" style={{ color: 'rgba(255,255,255,.82)' }}>{cat}</div>
          <h1>{program.name}</h1>
        </div>

        <div className="card card-pad" style={{ marginTop: 18 }}>
          <div className="card-title" style={{ marginBottom: 8 }}>O programie</div>
          <p className="muted" style={{ fontSize: 14, lineHeight: 1.65, margin: 0 }}>{program.description}</p>
        </div>

        <div className="between" style={{ margin: '24px 0 14px' }}>
          <h2 className="card-title dy-h" style={{ fontSize: 20 }}>Lokalizacje ({filtered.length})</h2>
          <div className="input-icon" style={{ maxWidth: 220 }}>
            <MapPin size={16} />
            <input
              className="input"
              style={{ height: 40 }}
              placeholder="Maks. opłata (JR)"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <Empty>Brak dostępnych lokalizacji dla wybranych filtrów.</Empty>
        ) : (
          <div>
            {filtered.map((l) => (
              <div key={l.id} className="loc-row" onClick={() => nav(`/location/${l.id}`)}>
                <span className="tx-ic"><MapPin size={18} /></span>
                <div className="grow">
                  <div style={{ fontWeight: 700, color: 'var(--ink)' }}>{l.name}</div>
                  <div className="muted" style={{ fontSize: 12.5, marginTop: 1 }}>
                    {[l.address, l.city].filter(Boolean).join(', ')}
                    {l.distance != null && ` · ${l.distance} km`}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="muted" style={{ fontSize: 11.5 }}>od</div>
                  <div className="dy-h dy-num" style={{ fontWeight: 600, fontSize: 15 }}>{jr(l.subscriptionPrice)}/mies.</div>
                </div>
                <ChevronRight size={18} style={{ color: 'var(--ink-3)' }} />
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="sticky-col">
        <div className="card card-pad">
          <div className="card-title" style={{ marginBottom: 8 }}>Opłaty</div>
          <div className="fee-row">
            <span className="muted">Opłata wstępna</span>
            <span className="v dy-num">{jr(program.entryFee)}</span>
          </div>
          <div className="fee-row">
            <span className="muted">Abonament / mies.</span>
            <span className="v dy-num">{jr(program.subscriptionPrice)}</span>
          </div>
          <div className="fee-row">
            <span className="muted">Liczba lokalizacji</span>
            <span className="v dy-num">{locations.length}</span>
          </div>
          <button
            className="btn btn-primary btn-block"
            style={{ marginTop: 16 }}
            disabled={filtered.length === 0}
            onClick={() => filtered[0] && nav(`/location/${filtered[0].id}`)}
          >
            Wybierz lokalizację <ArrowRight size={16} />
          </button>
        </div>

        <div className="banner info" style={{ marginTop: 16 }}>
          <span className="banner-ic"><Info size={20} /></span>
          <div className="grow">
            <div className="banner-title">Zakup w Kreatorze</div>
            <div className="banner-text">Zakup finalizujesz w Kreatorze, który w kolejnym kroku dobiera atrybuty oferty i podsumowuje koszty.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
