import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, jr } from '../api';

export default function BonusDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const [bonus, setBonus] = useState<any>(null);
  const [draft, setDraft] = useState<any>(null);
  const [summary, setSummary] = useState<any>(null);
  const [existing, setExisting] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  const load = () => {
    api.get(`/bonuses/${id}`).then(setBonus).catch(() => {});
    api.get('/profile/bonuses').then((ps) => setExisting(ps.find((p: any) => p.program?.id === id && p.active) || null));
  };
  useEffect(load, [id]);

  const start = async () => {
    const res = await api.post('/purchase/', { programId: id });
    setDraft(res);
    setSummary(await api.get(`/purchase/${res.id}/bonus-summary`));
  };
  const finish = async () => {
    setBusy(true);
    try {
      await api.post('/purchase/finish', { purchase_id: draft.id });
      alert('Bonus zakupiony!');
      nav('/bonuses/my');
    } catch (e: any) { alert(e.message); } finally { setBusy(false); }
  };
  const cancel = async () => {
    if (!confirm('Zrezygnować z tego bonusu?')) return;
    try { await api.post(`/purchase/${existing.id}/cancel-bonus`, {}); load(); } catch (e: any) { alert(e.message); }
  };

  if (!bonus) return <div className="spinner">Ładowanie…</div>;

  return (
    <div>
      <div style={{ marginBottom: 12 }}><Link to="/bonuses">← Powrót do bonusów</Link></div>
      <div className="grid cols-2">
        <div className="card pad">
          <h1>{bonus.name}</h1>
          <p className="muted">{bonus.description}</p>
          <div className="grid cols-2" style={{ marginTop: 10 }}>
            <div><div className="muted" style={{ fontSize: 12 }}>Cena</div><div style={{ fontWeight: 700 }}>{jr(bonus.entryFee)}</div></div>
            <div><div className="muted" style={{ fontSize: 12 }}>Czas trwania</div><div style={{ fontWeight: 700 }}>{bonus.gracePeriod} mies.</div></div>
          </div>
        </div>
        <div className="card pad">
          {existing ? (
            <>
              <h3>Posiadasz ten bonus</h3>
              <div className="muted">Zakupiono {new Date(existing.boughtDate).toLocaleDateString('pl-PL')}</div>
              <button className="btn danger" style={{ marginTop: 12 }} onClick={cancel}>Zrezygnuj z bonusu</button>
            </>
          ) : !draft ? (
            <>
              <h3>Kup ten bonus</h3>
              <button className="btn primary" onClick={start}>Rozpocznij zakup</button>
            </>
          ) : (
            <>
              <h3>Podsumowanie</h3>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}><span className="muted">Wymagane teraz</span><b>{jr(summary?.required)}</b></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}><span className="muted">Dostępne</span><span>{jr(summary?.available)}</span></div>
              {summary && !summary.canAfford && <div className="alert warn" style={{ marginTop: 10 }}>Brakuje {jr(summary.missing)}. <Link to="/wallet/state">Kup JR</Link></div>}
              <button className="btn primary" style={{ width: '100%', marginTop: 10 }} disabled={!summary?.canAfford || busy} onClick={finish}>Potwierdź zakup</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
