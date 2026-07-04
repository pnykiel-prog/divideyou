import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, jr } from '../api';
import { Spinner, ErrorAlert, Bg, keywordFor } from '../ui';
import { ArrowLeft, Gift, ShieldCheck } from 'lucide-react';

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

  if (!bonus) return <Spinner />;
  const gallery: string[] = Array.isArray(bonus.gallery) ? bonus.gallery : [];

  return (
    <div>
      <div className="breadcrumbs">
        <Link to="/bonuses">Bonusy</Link>
        <span className="sep">/</span>
        <span className="last">{bonus.name}</span>
      </div>

      <Link to="/bonuses" className="btn btn-ghost btn-sm" style={{ marginBottom: 16 }}>
        <ArrowLeft size={16} /> Wróć do bonusów
      </Link>

      <div className="grid-detail">
        <div>
          <Bg q={keywordFor(bonus.name, 'gift,voucher')} seed={bonus.id} w={1200} h={420} overlay className="hero-media" style={{ marginBottom: 16 }}>
            <span className="badge" style={{ background: 'rgba(255,255,255,.9)', color: 'var(--brand-600)', alignSelf: 'flex-start' }}>
              <Gift size={13} /> BONUS
            </span>
            <div className="grow" />
            <h1>{bonus.name}</h1>
          </Bg>

          {gallery.length > 0 && (
            <div className="gallery-thumbs" style={{ marginBottom: 16 }}>
              {gallery.slice(0, 4).map((_, i) => (
                <Bg key={i} q={keywordFor(bonus.name, 'gift,voucher')} seed={`${bonus.id}-${i}`} w={240} h={160} className="gallery-thumb" />
              ))}
            </div>
          )}

          <div className="card card-pad" style={{ marginBottom: 16 }}>
            <div className="card-title" style={{ marginBottom: 8 }}>O bonusie</div>
            <p className="muted" style={{ lineHeight: 1.65, margin: 0 }}>
              {bonus.description || 'Brak opisu bonusu.'}
            </p>
          </div>

          <div className="card card-pad">
            <div className="card-title" style={{ marginBottom: 6 }}>Opłaty i warunki</div>
            <div className="fee-row"><span className="muted">Cena bonusu</span><span className="v dy-num">{jr(bonus.entryFee)}</span></div>
            <div className="fee-row"><span className="muted">Czas trwania</span><span className="v dy-num">{bonus.gracePeriod} mies.</span></div>
            <div className="fee-row"><span className="muted">Min. saldo do wglądu</span><span className="v dy-num">{jr(bonus.minimalJrForView)}</span></div>
          </div>
        </div>

        <div className="sticky-col">
          <div className="card card-pad">
            {existing ? (
              <>
                <div className="badge badge-ok" style={{ marginBottom: 10 }}>Posiadasz ten bonus</div>
                <div className="dy-h" style={{ fontSize: 20, marginBottom: 4 }}>{jr(bonus.entryFee)}</div>
                <div className="muted" style={{ fontSize: 13, marginBottom: 14 }}>
                  Zakupiono {new Date(existing.boughtDate).toLocaleDateString('pl-PL')}
                </div>
                <button className="btn btn-danger btn-block" onClick={cancel}>Zrezygnuj z bonusu</button>
              </>
            ) : !draft ? (
              <>
                <div className="label">Cena bonusu</div>
                <div className="dy-h dy-num" style={{ fontSize: 30, margin: '4px 0 14px' }}>{jr(bonus.entryFee)}</div>
                <button className="btn btn-primary btn-block" onClick={start}>
                  <Gift size={16} /> Rozpocznij zakup
                </button>
                <div className="row muted" style={{ gap: 7, marginTop: 12, fontSize: 12.5 }}>
                  <ShieldCheck size={15} /> Rozliczenie w pełni przejrzyste.
                </div>
              </>
            ) : (
              <>
                <div className="card-title" style={{ marginBottom: 12 }}>Podsumowanie</div>
                <div className="fee-row"><span className="muted">Wymagane teraz</span><span className="v dy-num">{jr(summary?.required)}</span></div>
                <div className="fee-row"><span className="muted">Dostępne środki</span><span className="v dy-num">{jr(summary?.available)}</span></div>
                {summary && !summary.canAfford && (
                  <ErrorAlert>Brakuje {jr(summary.missing)}. <Link to="/wallet/state" style={{ fontWeight: 700 }}>Kup JR</Link></ErrorAlert>
                )}
                <button className="btn btn-primary btn-block" style={{ marginTop: 10 }} disabled={!summary?.canAfford || busy} onClick={finish}>
                  {busy ? 'Przetwarzanie…' : 'Potwierdź zakup'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
