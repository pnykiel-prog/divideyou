import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, jr } from '../api';

export default function ProgramDetail() {
  const { id } = useParams();
  const [program, setProgram] = useState<any>(null);
  const [locations, setLocations] = useState<any[]>([]);
  const [maxPrice, setMaxPrice] = useState('');

  useEffect(() => {
    api.get(`/programs/${id}`).then(setProgram).catch(() => {});
    api.get(`/programs/${id}/locations`).then(setLocations).catch(() => {});
  }, [id]);

  if (!program) return <div className="spinner">Ładowanie…</div>;
  const filtered = locations.filter((l) => !maxPrice || l.entryFee <= Number(maxPrice));

  return (
    <div>
      <div style={{ marginBottom: 12 }}><Link to="/programs">← Powrót do programów</Link></div>
      <div className="card pad" style={{ marginBottom: 20 }}>
        <div className="btn-row" style={{ marginBottom: 8 }}>
          {program.vip && <span className="badge amber">VIP</span>}
          {program.recommended && <span className="badge blue">Polecane</span>}
        </div>
        <h1>{program.name}</h1>
        <p className="muted">{program.description}</p>
        <div className="grid cols-4" style={{ marginTop: 10 }}>
          <Info label="Opłata wstępna" value={jr(program.entryFee)} />
          <Info label="Abonament" value={`${jr(program.subscriptionPrice)}/mies.`} />
          <Info label="Zabezpieczenie" value={jr(program.amountBlocked)} />
          <Info label="Okres umowy" value={`${program.gracePeriod} mies.`} />
        </div>
      </div>

      <div className="page-head">
        <h2>Lokalizacje ({filtered.length})</h2>
        <input placeholder="Maks. opłata wstępna (JR)" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} style={{ maxWidth: 200 }} />
      </div>
      {filtered.length === 0 && <div className="empty">Brak dostępnych lokalizacji.</div>}
      <div className="grid cols-2">
        {filtered.map((l) => (
          <Link key={l.id} to={`/location/${l.id}`} className="card pad">
            <h3>{l.name}</h3>
            <div className="muted" style={{ fontSize: 13 }}>{l.address}, {l.city}</div>
            <div className="btn-row" style={{ marginTop: 10 }}>
              <span className="badge gray">Wstępna {jr(l.entryFee)}</span>
              <span className="badge gray">{jr(l.subscriptionPrice)}/mies.</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function Info({ label, value }: any) {
  return (
    <div>
      <div className="muted" style={{ fontSize: 12 }}>{label}</div>
      <div style={{ fontWeight: 700 }}>{value}</div>
    </div>
  );
}
