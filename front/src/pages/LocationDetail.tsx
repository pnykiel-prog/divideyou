import { useEffect, useState, Fragment } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  MapPin, Download, Heart, FileText, X, ArrowRight, Check, Info as InfoIcon,
} from 'lucide-react';
import { api, jr } from '../api';
import { useToast, Spinner, Empty, ErrorAlert, gradient } from '../ui';

const DOCS = [
  'Umowa uczestnictwa (PDF)',
  'Regulamin lokalizacji (PDF)',
  'Cennik usług (PDF)',
];

const STEPS = ['Wariant', 'Umowa', 'Dodatki', 'Podsumowanie'];
const DURATIONS = [
  { m: 6, mult: 1, rec: false },
  { m: 12, mult: 0.83, rec: true },
  { m: 24, mult: 0.75, rec: false },
];

export default function LocationDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const toast = useToast();
  const [loc, setLoc] = useState<any>(null);
  const [attrs, setAttrs] = useState<any[]>([]);
  const [draft, setDraft] = useState<any>(null);
  const [existing, setExisting] = useState<any>(null);
  const [summary, setSummary] = useState<any>(null);
  const [available, setAvailable] = useState(0);
  const [busy, setBusy] = useState(false);

  // creator overlay state (local wiring only)
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [months, setMonths] = useState(12);
  const [sign1, setSign1] = useState(false);
  const [sign2, setSign2] = useState(false);

  const load = () => {
    api.get(`/locations/${id}`).then(setLoc).catch(() => {});
    api.get(`/locations/${id}/attributes`).then(setAttrs).catch(() => setAttrs([]));
    api.get('/wallet').then((w) => setAvailable(w.active)).catch(() => {});
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
      setOpen(false);
      toast('Zakup zakończony — środki zablokowane');
      nav('/programs/my');
    } catch (e: any) { toast(e.message); } finally { setBusy(false); }
  };

  const cancel = async () => {
    if (!existing || !confirm('Zrezygnować z tego programu? Tej operacji nie można cofnąć.')) return;
    try {
      await api.post(`/purchase/${existing.id}/cancel-program`, {});
      toast('Program anulowany.');
      load();
    } catch (e: any) { toast(e.message); }
  };

  const toggleObserve = async () => {
    try {
      await api.post(`/locations/${id}/${loc.observed ? 'unobserve' : 'observe'}`, {});
      load();
    } catch (e: any) { toast(e.message); }
  };

  const paySub = async () => {
    try {
      await api.post(`/purchase/${existing.id}/pay-subscription`, { months: 1 });
      toast('Abonament opłacony.');
      load();
    } catch (e: any) { toast(e.message); }
  };

  if (!loc) return <Spinner />;

  const selectedCount = (attributeId: string) =>
    draft?.attributes?.find((a: any) => a.programAttributeId === attributeId)?.count || 0;

  // Map real attributes: first group → wariant (radio), remaining → dodatki.
  const flatten = (g: any) => (g?.children && g.children.length ? g.children : [g]);
  const variantChildren = attrs.length ? flatten(attrs[0]) : [];
  const addonChildren = attrs.slice(1).flatMap(flatten);
  const isVariantId = (aid: string) => variantChildren.some((c: any) => c.id === aid);
  const selectedVariant = variantChildren.find((c: any) => selectedCount(c.id) > 0);
  const selectedAddons = (draft?.attributes || []).filter((a: any) => a.count > 0 && !isVariantId(a.programAttributeId));
  const availJr = available || summary?.available || 0;

  const openKreator = () => {
    setStep(1);
    setOpen(true);
    if (!draft) initDraft();
  };

  const selectVariant = async (child: any) => {
    const prev = variantChildren.find((c: any) => c.id !== child.id && selectedCount(c.id) > 0);
    if (prev) await setAttr(prev.id, 0);
    await setAttr(child.id, 1);
  };

  const toggleAddon = (c: any) => setAttr(c.id, selectedCount(c.id) ? 0 : 1);

  const canNext =
    step === 1 ? !!selectedVariant :
    step === 4 ? sign1 && sign2 && summary?.canAfford && !busy :
    true;

  const next = () => { if (step < 4) setStep(step + 1); else finish(); };
  const back = () => { if (step > 1) setStep(step - 1); else setOpen(false); };

  return (
    <div>
      <div className="grid-detail">
        {/* ---- Left: gallery + info + attachments ---- */}
        <div>
          <div className="gallery-main" style={{ background: gradient(id!) }} />
          <div className="gallery-thumbs">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="gallery-thumb" style={{ background: gradient(`${id}-${i}`) }} />
            ))}
          </div>

          <h1 className="screen-title" style={{ marginTop: 22 }}>{loc.name}</h1>
          <div className="row muted" style={{ gap: 6, marginTop: 6 }}>
            <MapPin size={16} />
            <span>{[loc.address, loc.postalCode, loc.city].filter(Boolean).join(', ')}</span>
          </div>
          {loc.description && (
            <p style={{ color: 'var(--ink-2)', lineHeight: 1.65, marginTop: 16 }}>{loc.description}</p>
          )}

          <div className="card" style={{ marginTop: 22 }}>
            <div className="card-head"><div className="card-title">Załączniki i umowy</div></div>
            {DOCS.map((name) => (
              <div key={name} className="tx-row">
                <div className="tx-ic"><FileText size={18} /></div>
                <div className="tx-main"><div className="tx-title">{name}</div></div>
                <button className="btn btn-ghost btn-sm" onClick={() => toast('Pobieranie rozpocznie się wkrótce')}>
                  <Download size={15} /> Pobierz
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* ---- Right: fees / owned ---- */}
        <div className="sticky-col">
          {existing ? (
            <div className="card card-pad">
              <span className="badge badge-ok"><Check size={13} /> Program aktywny</span>
              <div className="card-title" style={{ marginTop: 12 }}>Posiadasz ten program</div>
              <p className="muted" style={{ margin: '4px 0 14px', fontSize: 13 }}>
                Aktywny od {new Date(existing.boughtDate).toLocaleDateString('pl-PL')} · następna płatność {existing.nextPaymentDate ? new Date(existing.nextPaymentDate).toLocaleDateString('pl-PL') : '—'}
              </p>
              {existing.attributes?.length > 0 && (
                <div style={{ marginBottom: 8 }}>
                  {existing.attributes.map((a: any) => (
                    <div key={a.id} className="fee-row"><span>{a.name}{a.count > 1 ? ` ×${a.count}` : ''}</span></div>
                  ))}
                </div>
              )}
              <div className="fee-row"><span>Abonament / mies.</span><span className="v dy-num">{jr(existing.subscriptionFee)}</span></div>
              <button className="btn btn-primary btn-block" style={{ marginTop: 16 }} onClick={paySub}>
                Opłać abonament ({jr(existing.subscriptionFee)})
              </button>
              <button className="btn btn-danger btn-block" style={{ marginTop: 10 }} onClick={cancel}>
                Zrezygnuj z programu
              </button>
            </div>
          ) : (
            <div className="card card-pad">
              <div className="card-title" style={{ marginBottom: 14 }}>Opłaty</div>
              <div className="fee-row">
                <span>Opłata wstępna</span>
                <span className="v dy-num">{jr(loc.entryFee)}</span>
              </div>
              <div className="fee-row">
                <span>Abonament / mies.</span>
                <span className="v dy-num" style={{ color: 'var(--brand-600)' }}>{jr(loc.subscriptionPrice)}</span>
              </div>
              <button className="btn btn-primary btn-block" style={{ marginTop: 18 }} onClick={openKreator}>
                Uruchom Kreator <ArrowRight size={16} />
              </button>
              <button className="btn btn-outline btn-block" style={{ marginTop: 10 }} onClick={toggleObserve}>
                <Heart size={16} fill={loc.observed ? 'currentColor' : 'none'} /> {loc.observed ? 'Obserwowane' : 'Obserwuj'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ---- Kreator (fullscreen overlay) ---- */}
      {open && (
        <div className="kreator">
          <div className="k-header">
            <button className="icon-btn" onClick={() => setOpen(false)}><X size={18} /></button>
            <div>
              <div className="eyebrow">KREATOR ZAKUPU</div>
              <div className="dy-h" style={{ fontSize: 16 }}>{loc.name}</div>
            </div>
            <div className="grow" />
            <span className="dy-num" style={{ padding: '9px 16px', borderRadius: 22, background: 'var(--bg-2)', border: '1px solid var(--line)', color: 'var(--ink-2)', fontWeight: 700, fontSize: 13 }}>
              {jr(availJr)} dostępne
            </span>
          </div>

          <div className="k-body">
            <div className="k-left dy-scroll">
              <div className="k-left-inner">
                <div className="stepper">
                  {STEPS.map((label, i) => {
                    const n = i + 1;
                    const cls = step === n ? 'active' : step > n ? 'done' : '';
                    return (
                      <Fragment key={label}>
                        <div className={`step ${cls}`}>
                          <div className="dot">{step > n ? <Check size={14} /> : n}</div>
                          <div className="lbl">{label}</div>
                          {i < STEPS.length - 1 && <div className="conn" />}
                        </div>
                      </Fragment>
                    );
                  })}
                </div>

                {!draft ? (
                  <Spinner />
                ) : step === 1 ? (
                  <>
                    <h2 className="dy-h" style={{ fontSize: 24, margin: '0 0 4px' }}>Wybierz wariant uczestnictwa</h2>
                    <p className="muted" style={{ margin: '0 0 20px' }}>Zakres dostępu do programu w tej lokalizacji.</p>
                    {variantChildren.length === 0 && <Empty>Brak wariantów do wyboru — możesz przejść dalej.</Empty>}
                    {variantChildren.map((c: any) => {
                      const sel = selectedCount(c.id) > 0;
                      return (
                        <div key={c.id} className={`k-choice${sel ? ' sel' : ''}`} onClick={() => selectVariant(c)}>
                          <div className="radio" />
                          <div className="grow">
                            <div style={{ fontWeight: 700 }}>{c.name}</div>
                            {c.description && <div className="muted" style={{ fontSize: 12.5, marginTop: 2 }}>{c.description}</div>}
                          </div>
                          <div className="dy-h" style={{ fontSize: 18, color: 'var(--brand-600)' }}>{jr(c.subscriptionPrice || c.startFee)}</div>
                        </div>
                      );
                    })}
                  </>
                ) : step === 2 ? (
                  <>
                    <h2 className="dy-h" style={{ fontSize: 24, margin: '0 0 4px' }}>Czas trwania umowy</h2>
                    <p className="muted" style={{ margin: '0 0 20px' }}>Dłuższa umowa obniża miesięczny abonament.</p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                      {DURATIONS.map((d) => {
                        const sel = months === d.m;
                        return (
                          <div
                            key={d.m}
                            onClick={() => setMonths(d.m)}
                            style={{
                              position: 'relative', textAlign: 'center', cursor: 'pointer',
                              padding: '22px 12px 18px', borderRadius: 14, background: 'var(--surface)',
                              border: sel ? '2px solid var(--brand)' : '1.5px solid var(--line)',
                            }}
                          >
                            {d.rec && (
                              <span className="badge badge-rec" style={{ position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)' }}>POLECANE</span>
                            )}
                            <div className="dy-h" style={{ fontSize: 22 }}>{d.m} mies.</div>
                            <div className="muted" style={{ fontSize: 12.5, marginTop: 4 }}>{jr(loc.subscriptionPrice * d.mult)}/mies.</div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                ) : step === 3 ? (
                  <>
                    <h2 className="dy-h" style={{ fontSize: 24, margin: '0 0 4px' }}>Dodatki opcjonalne</h2>
                    <p className="muted" style={{ margin: '0 0 20px' }}>Rozszerz swój pakiet o wybrane usługi.</p>
                    {addonChildren.length === 0 && <Empty>Brak dodatków dla tej lokalizacji.</Empty>}
                    {addonChildren.map((c: any) => {
                      const isNumeric = c.type === 3;
                      const count = selectedCount(c.id);
                      const on = count > 0;
                      return (
                        <div
                          key={c.id}
                          onClick={isNumeric ? undefined : () => toggleAddon(c)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12,
                            padding: '16px 18px', borderRadius: 12, background: 'var(--surface)',
                            border: on ? '2px solid var(--brand)' : '1.5px solid var(--line)',
                            cursor: isNumeric ? 'default' : 'pointer',
                          }}
                        >
                          {!isNumeric && (
                            <div style={{
                              width: 22, height: 22, borderRadius: 6, flex: 'none',
                              border: on ? '2px solid var(--brand)' : '2px solid var(--line)',
                              background: on ? 'var(--brand)' : 'transparent', color: '#fff',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                              {on && <Check size={14} />}
                            </div>
                          )}
                          <div className="grow">
                            <div style={{ fontWeight: 700 }}>{c.name}</div>
                            {c.description && <div className="muted" style={{ fontSize: 12.5, marginTop: 2 }}>{c.description}</div>}
                          </div>
                          {isNumeric ? (
                            <input
                              type="number" min={0} max={c.maxCount} value={count}
                              onChange={(e) => setAttr(c.id, Number(e.target.value))}
                              style={{ width: 72, height: 40, borderRadius: 10, border: '1.5px solid var(--line)', padding: '0 10px', background: 'var(--bg)', fontFamily: 'inherit' }}
                            />
                          ) : (
                            <div style={{ color: 'var(--accent)', fontWeight: 800, whiteSpace: 'nowrap' }}>+{jr(c.startFee || c.subscriptionPrice)}</div>
                          )}
                        </div>
                      );
                    })}
                  </>
                ) : (
                  <>
                    <h2 className="dy-h" style={{ fontSize: 24, margin: '0 0 4px' }}>Podsumowanie i podpis umów</h2>
                    <p className="muted" style={{ margin: '0 0 20px' }}>Sprawdź szczegóły i podpisz umowy elektronicznie.</p>
                    {[
                      { label: 'Umowa uczestnictwa — akceptuję i podpisuję elektronicznie', val: sign1, set: setSign1 },
                      { label: 'Regulamin lokalizacji — akceptuję', val: sign2, set: setSign2 },
                    ].map((s) => (
                      <div
                        key={s.label}
                        onClick={() => s.set(!s.val)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12,
                          padding: '16px 18px', borderRadius: 12, background: 'var(--surface)',
                          border: s.val ? '2px solid var(--brand)' : '1.5px solid var(--line)', cursor: 'pointer',
                        }}
                      >
                        <div style={{
                          width: 22, height: 22, borderRadius: 6, flex: 'none',
                          border: s.val ? '2px solid var(--brand)' : '2px solid var(--line)',
                          background: s.val ? 'var(--brand)' : 'transparent', color: '#fff',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          {s.val && <Check size={14} />}
                        </div>
                        <FileText size={18} style={{ color: 'var(--ink-3)', flex: 'none' }} />
                        <div className="grow" style={{ fontWeight: 600, fontSize: 13.5 }}>{s.label}</div>
                      </div>
                    ))}
                    <div className="banner info" style={{ marginTop: 4 }}>
                      <span className="banner-ic"><InfoIcon size={18} /></span>
                      <div className="banner-text">
                        Po potwierdzeniu z salda aktywnego zostanie zablokowana kwota zabezpieczenia ({jr(draft.amountBlocked)}). Środki zwolnią się po zakończeniu umowy.
                      </div>
                    </div>
                    {summary && !summary.canAfford && (
                      <div style={{ marginTop: 12 }}>
                        <ErrorAlert>Brakuje {jr(summary.missing)} na saldzie aktywnym. Doładuj portfel, aby kontynuować.</ErrorAlert>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* ---- Right summary panel ---- */}
            <div className="k-right dy-scroll">
              <div className="card-title" style={{ marginBottom: 8 }}>Podsumowanie</div>
              <div className="k-sum-row">
                <span>Wariant</span>
                <span className="v">{selectedVariant?.name || '—'}</span>
              </div>
              <div className="k-sum-row">
                <span>Czas umowy</span>
                <span className="v">{months} miesięcy</span>
              </div>
              {selectedAddons.map((a: any) => (
                <div key={a.id} className="k-sum-row">
                  <span>{a.name}{a.count > 1 ? ` ×${a.count}` : ''}</span>
                  <span className="v">+{jr((a.startFee || a.subscriptionPrice || 0) * a.count)}</span>
                </div>
              ))}
              <div className="k-sum-row">
                <span>Opłata wstępna</span>
                <span className="v">{jr(draft?.price)}</span>
              </div>
              <div className="k-sum-row">
                <span>Abonament / mies.</span>
                <span className="v">{jr(draft?.subscriptionFee)}</span>
              </div>
              <div className="k-sum-blocked">
                <div>
                  <div style={{ fontWeight: 700 }}>Kwota blokowana</div>
                  <div className="muted" style={{ fontSize: 12 }}>zabezpieczenie umowy</div>
                </div>
                <div className="v dy-num">{jr(draft?.amountBlocked)}</div>
              </div>

              <div className="grow" />
              <div className="between" style={{ marginTop: 22 }}>
                <button className="btn btn-ghost" onClick={back}>{step === 1 ? 'Anuluj' : 'Wstecz'}</button>
                <button className="btn btn-primary" style={{ flex: 1 }} disabled={!canNext} onClick={next}>
                  {step === 4 ? (busy ? 'Przetwarzanie…' : 'Potwierdź i zablokuj środki') : 'Dalej'} <ArrowRight size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
