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
      alert('Bonus purchased!');
      nav('/bonuses/my');
    } catch (e: any) { alert(e.message); } finally { setBusy(false); }
  };
  const cancel = async () => {
    if (!confirm('Give up this bonus?')) return;
    try { await api.post(`/purchase/${existing.id}/cancel-bonus`, {}); load(); } catch (e: any) { alert(e.message); }
  };

  if (!bonus) return <div className="spinner">Loading…</div>;

  return (
    <div>
      <div style={{ marginBottom: 12 }}><Link to="/bonuses">← Back to bonuses</Link></div>
      <div className="grid cols-2">
        <div className="card pad">
          <h1>{bonus.name}</h1>
          <p className="muted">{bonus.description}</p>
          <div className="grid cols-2" style={{ marginTop: 10 }}>
            <div><div className="muted" style={{ fontSize: 12 }}>Price</div><div style={{ fontWeight: 700 }}>{jr(bonus.entryFee)}</div></div>
            <div><div className="muted" style={{ fontSize: 12 }}>Duration</div><div style={{ fontWeight: 700 }}>{bonus.gracePeriod} mo</div></div>
          </div>
        </div>
        <div className="card pad">
          {existing ? (
            <>
              <h3>You own this bonus</h3>
              <div className="muted">Purchased {new Date(existing.boughtDate).toLocaleDateString()}</div>
              <button className="btn danger" style={{ marginTop: 12 }} onClick={cancel}>Give up bonus</button>
            </>
          ) : !draft ? (
            <>
              <h3>Purchase this bonus</h3>
              <button className="btn primary" onClick={start}>Start purchase</button>
            </>
          ) : (
            <>
              <h3>Summary</h3>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}><span className="muted">Required now</span><b>{jr(summary?.required)}</b></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}><span className="muted">Available</span><span>{jr(summary?.available)}</span></div>
              {summary && !summary.canAfford && <div className="alert warn" style={{ marginTop: 10 }}>Need {jr(summary.missing)} more. <Link to="/wallet/state">Buy JR</Link></div>}
              <button className="btn primary" style={{ width: '100%', marginTop: 10 }} disabled={!summary?.canAfford || busy} onClick={finish}>Confirm purchase</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
