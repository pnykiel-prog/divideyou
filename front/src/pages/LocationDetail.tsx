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
      alert('Purchase completed!');
      nav('/programs/my');
    } catch (e: any) { alert(e.message); } finally { setBusy(false); }
  };

  const cancel = async () => {
    if (!existing || !confirm('Give up this program? This cannot be undone.')) return;
    try {
      await api.post(`/purchase/${existing.id}/cancel-program`, {});
      alert('Program cancelled.');
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
      alert('Subscription paid.');
      load();
    } catch (e: any) { alert(e.message); }
  };

  if (!loc) return <div className="spinner">Loading…</div>;
  const selectedCount = (attributeId: string) =>
    draft?.attributes?.find((a: any) => a.programAttributeId === attributeId)?.count || 0;

  return (
    <div>
      <div style={{ marginBottom: 12 }}><Link to={`/program/${loc.programId}`}>← Back</Link></div>
      <div className="grid cols-2">
        <div>
          <div className="card pad" style={{ marginBottom: 16 }}>
            <div className="btn-row" style={{ float: 'right' }}>
              <button className="btn sm" onClick={toggleObserve}>{loc.observed ? '★ Observed' : '☆ Observe'}</button>
            </div>
            <h1>{loc.name}</h1>
            <div className="muted">{loc.address}, {loc.postalCode} {loc.city}</div>
            <p style={{ marginTop: 12 }}>{loc.description}</p>
            <div className="grid cols-3" style={{ marginTop: 10 }}>
              <Info label="Entry fee" value={jr(loc.entryFee)} />
              <Info label="Subscription" value={`${jr(loc.subscriptionPrice)}/mo`} />
              <Info label="Duration" value={`${loc.purchaseDuration} mo`} />
            </div>
          </div>

          {existing ? (
            <div className="card pad">
              <h3>You own this program</h3>
              <div className="muted">Active since {new Date(existing.boughtDate).toLocaleDateString()} · next payment {existing.nextPaymentDate ? new Date(existing.nextPaymentDate).toLocaleDateString() : '—'}</div>
              <div className="btn-row" style={{ marginTop: 12 }}>
                <button className="btn" onClick={paySub}>Pay subscription ({jr(existing.subscriptionFee)})</button>
                <button className="btn danger" onClick={cancel}>Give up program</button>
              </div>
            </div>
          ) : (
            <div className="card pad">
              <h3>Configure your purchase</h3>
              {!draft && <button className="btn primary" onClick={initDraft}>Start configuration</button>}
              {draft && (
                <div>
                  {attrs.length === 0 && <p className="muted">No options to configure — you're ready to purchase.</p>}
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
              <h3>Summary</h3>
              <Row label="Entry fee" value={jr(draft.price)} />
              <Row label="Monthly subscription" value={`${jr(draft.subscriptionFee)}/mo`} />
              <Row label="Blocked collateral" value={jr(draft.amountBlocked)} />
              <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '12px 0' }} />
              <Row label="Required now" value={jr(summary.required)} bold />
              <Row label="Your available funds" value={jr(summary.available)} />
              {!summary.canAfford && (
                <div className="alert warn" style={{ marginTop: 10 }}>
                  You need {jr(summary.missing)} more. <Link to="/wallet/state">Buy JR</Link>
                </div>
              )}
              {draft.attributes?.length > 0 && (
                <div style={{ margin: '12px 0' }}>
                  <div className="muted" style={{ fontSize: 12, marginBottom: 4 }}>Selected options</div>
                  {draft.attributes.map((a: any) => (
                    <div key={a.id} style={{ fontSize: 13 }}>• {a.name} ×{a.count}</div>
                  ))}
                </div>
              )}
              <button className="btn primary" style={{ width: '100%', marginTop: 10 }} disabled={!summary.canAfford || busy} onClick={finish}>
                {busy ? 'Processing…' : 'Confirm purchase'}
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
      <div style={{ fontWeight: 700, marginBottom: 8 }}>{group.name}{group.isRequired && <span className="badge red" style={{ marginLeft: 6 }}>required</span>}</div>
      <div className="grid" style={{ gap: 8 }}>
        {children.map((c: any) => {
          const count = selectedCount(c.id);
          const isNumeric = c.type === 3;
          return (
            <div key={c.id} className="card pad" style={{ padding: 12, display: 'flex', alignItems: 'center', gap: 10, borderColor: count ? 'var(--primary)' : undefined }}>
              <div style={{ flex: 1 }}>
                <strong>{c.name}</strong>
                <div className="muted" style={{ fontSize: 12 }}>
                  {c.startFee > 0 && `+${jr(c.startFee)} entry `}
                  {c.subscriptionPrice > 0 && `+${jr(c.subscriptionPrice)}/mo `}
                  {c.unit && `per ${c.unit}`}
                </div>
              </div>
              {isNumeric ? (
                <input type="number" min={0} max={c.maxCount} value={count} style={{ width: 80 }}
                  onChange={(e) => setAttr(c.id, Number(e.target.value))} />
              ) : (
                <button className={`btn sm${count ? ' primary' : ''}`} onClick={() => setAttr(c.id, count ? 0 : 1)}>
                  {count ? 'Selected' : 'Select'}
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
