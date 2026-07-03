import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, jr } from '../api';

export default function LocationDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const [loc, setLoc] = useState<any>(null);
  const [attrs, setAttrs] = useState<any[]>([]);
  const [draft, setDraft] = useState<any>(null);
  const [existing, setExisting] = useState<any>(null);
  const [summary, setSummary] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  const load = () => {
    api.get(`/locations/${id}`).then(setLoc).catch(() => {});
    api.get(`/locations/${id}/attributes`).then(setAttrs).catch(() => setAttrs([]));
    // find an existing active purchase for this location
    api.get('/profile/purchases').then((ps) => {
      const found = ps.find((p: any) => p.location?.id === id && p.active);
      setExisting(found || null);
    });
  };
  useEffect(load, [id]);

  const setAttr = async (attributeId: string, count: number) => {
    const res = await api.post('/purchase/', { locationId: id, programAttributeId: attributeId, count });
    setDraft(res);
    const sum = await api.get(`/purchase/${res.id}/program-summary`);
    setSummary(sum);
  };

  const initDraft = async () => {
    const res = await api.post('/purchase/', { locationId: id });
    setDraft(res);
    setSummary(await api.get(`/purchase/${res.id}/program-summary`));
  };

  const finish = async () => {
    if (!draft) return;
    setBusy(true);
    try {
      await api.post('/purchase/finish', { purchase_id: draft.id });
      alert('Zakup zakończony!');
      nav('/programs/my');
    } catch (e: any) { alert(e.message); } finally { setBusy(false); }
  };

  const cancel = async () => {
    if (!existing || !confirm('Zrezygnować z tego programu? Tej operacji nie można cofnąć.')) return;
    try {
      await api.post(`/purchase/${existing.id}/cancel-program`, {});
      alert('Program anulowany.');
      load();
    } catch (e: any) { alert(e.message); }
  };

  const toggleObserve = async () => {
    try {
      await api.post(`/locations/${id}/${loc.observed ? 'unobserve' : 'observe'}`, {});
      load();
    } catch (e: any) { alert(e.message); }
  };

  const paySub = async () => {
    try {
      await api.post(`/purchase/${existing.id}/pay-subscription`, { months: 1 });
      alert('Abonament opłacony.');
      load();
    } catch (e: any) { alert(e.message); }
  };

  if (!loc) return <div className="spinner">Ładowanie…</div>;
  const selectedCount = (attributeId: string) =>
    draft?.attributes?.find((a: any) => a.programAttributeId === attributeId)?.count || 0;

  return (
    <div>
      <div style={{ marginBottom: 12 }}><Link to={`/program/${loc.programId}`}>← Wstecz</Link></div>
      <div className="grid cols-2">
        <div>
          <div className="card pad" style={{ marginBottom: 16 }}>
            <div className="btn-row" style={{ float: 'right' }}>
              <button className="btn sm" onClick={toggleObserve}>{loc.observed ? '★ Obserwowane' : '☆ Obserwuj'}</button>
            </div>
            <h1>{loc.name}</h1>
            <div className="muted">{loc.address}, {loc.postalCode} {loc.city}</div>
            <p style={{ marginTop: 12 }}>{loc.description}</p>
            <div className="grid cols-3" style={{ marginTop: 10 }}>
              <Info label="Opłata wstępna" value={jr(loc.entryFee)} />
              <Info label="Abonament" value={`${jr(loc.subscriptionPrice)}/mies.`} />
              <Info label="Czas trwania" value={`${loc.purchaseDuration} mies.`} />
            </div>
          </div>

          {existing ? (
            <div className="card pad">
              <h3>Posiadasz ten program</h3>
              <div className="muted">Aktywny od {new Date(existing.boughtDate).toLocaleDateString('pl-PL')} · następna płatność {existing.nextPaymentDate ? new Date(existing.nextPaymentDate).toLocaleDateString('pl-PL') : '—'}</div>
              <div className="btn-row" style={{ marginTop: 12 }}>
                <button className="btn" onClick={paySub}>Opłać abonament ({jr(existing.subscriptionFee)})</button>
                <button className="btn danger" onClick={cancel}>Zrezygnuj z programu</button>
              </div>
            </div>
          ) : (
            <div className="card pad">
              <h3>Skonfiguruj swój zakup</h3>
              {!draft && <button className="btn primary" onClick={initDraft}>Rozpocznij konfigurację</button>}
              {draft && (
                <div>
                  {attrs.length === 0 && <p className="muted">Brak opcji do konfiguracji — możesz dokonać zakupu.</p>}
                  {attrs.map((group) => (
                    <AttrGroup key={group.id} group={group} selectedCount={selectedCount} setAttr={setAttr} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {draft && !existing && summary && (
          <div>
            <div className="card pad" style={{ position: 'sticky', top: 80 }}>
              <h3>Podsumowanie</h3>
              <Row label="Opłata wstępna" value={jr(draft.price)} />
              <Row label="Abonament miesięczny" value={`${jr(draft.subscriptionFee)}/mies.`} />
              <Row label="Zamrożone zabezpieczenie" value={jr(draft.amountBlocked)} />
              <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '12px 0' }} />
              <Row label="Wymagane teraz" value={jr(summary.required)} bold />
              <Row label="Twoje dostępne środki" value={jr(summary.available)} />
              {!summary.canAfford && (
                <div className="alert warn" style={{ marginTop: 10 }}>
                  Brakuje {jr(summary.missing)}. <Link to="/wallet/state">Kup JR</Link>
                </div>
              )}
              {draft.attributes?.length > 0 && (
                <div style={{ margin: '12px 0' }}>
                  <div className="muted" style={{ fontSize: 12, marginBottom: 4 }}>Wybrane opcje</div>
                  {draft.attributes.map((a: any) => (
                    <div key={a.id} style={{ fontSize: 13 }}>• {a.name} ×{a.count}</div>
                  ))}
                </div>
              )}
              <button className="btn primary" style={{ width: '100%', marginTop: 10 }} disabled={!summary.canAfford || busy} onClick={finish}>
                {busy ? 'Przetwarzanie…' : 'Potwierdź zakup'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function AttrGroup({ group, selectedCount, setAttr }: any) {
  const children = group.children && group.children.length ? group.children : [group];
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ fontWeight: 700, marginBottom: 8 }}>{group.name}{group.isRequired && <span className="badge red" style={{ marginLeft: 6 }}>wymagane</span>}</div>
      <div className="grid" style={{ gap: 8 }}>
        {children.map((c: any) => {
          const count = selectedCount(c.id);
          const isNumeric = c.type === 3;
          return (
            <div key={c.id} className="card pad" style={{ padding: 12, display: 'flex', alignItems: 'center', gap: 10, borderColor: count ? 'var(--primary)' : undefined }}>
              <div style={{ flex: 1 }}>
                <strong>{c.name}</strong>
                <div className="muted" style={{ fontSize: 12 }}>
                  {c.startFee > 0 && `+${jr(c.startFee)} wpisowe `}
                  {c.subscriptionPrice > 0 && `+${jr(c.subscriptionPrice)}/mies. `}
                  {c.unit && `za ${c.unit}`}
                </div>
              </div>
              {isNumeric ? (
                <input type="number" min={0} max={c.maxCount} value={count} style={{ width: 80 }}
                  onChange={(e) => setAttr(c.id, Number(e.target.value))} />
              ) : (
                <button className={`btn sm${count ? ' primary' : ''}`} onClick={() => setAttr(c.id, count ? 0 : 1)}>
                  {count ? 'Wybrano' : 'Wybierz'}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Info({ label, value }: any) {
  return <div><div className="muted" style={{ fontSize: 12 }}>{label}</div><div style={{ fontWeight: 700 }}>{value}</div></div>;
}
function Row({ label, value, bold }: any) {
  return <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontWeight: bold ? 700 : 400 }}><span className="muted">{label}</span><span>{value}</span></div>;
}
