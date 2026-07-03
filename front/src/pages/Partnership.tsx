import { useEffect, useMemo, useState } from 'react';
import { api, jr } from '../api';
import { useToast, Spinner, Empty } from '../ui';
import { Users, Copy, Mail, ArrowRight, ArrowLeft, Download, Trophy, ShieldCheck } from 'lucide-react';

const MATERIALS = [
  { name: 'Ulotka DivideYou (PDF)', note: 'A4 · do druku i wysyłki' },
  { name: 'Grafiki na social media', note: 'Zestaw postów i stories' },
  { name: 'Prezentacja programu', note: 'Slajdy dla znajomych' },
];

const nameOf = (p: any) =>
  p.companyName || [p.firstName, p.lastName].filter(Boolean).join(' ') || p.email || '—';

export default function Partnership() {
  const [data, setData] = useState<any>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [terms, setTerms] = useState(false);
  const [historyPartner, setHistoryPartner] = useState<any>(null);
  const toast = useToast();

  const load = () => api.get('/partnership').then(setData);
  useEffect(() => { load(); }, []);

  if (!data) return <Spinner />;

  const become = async () => {
    try { await api.post('/partnership/become', {}); load(); }
    catch (e: any) { toast(e.message); }
  };
  const invite = async () => {
    if (!inviteEmail) return;
    try {
      await api.post('/partnership/invite', { email: inviteEmail });
      setInviteEmail('');
      toast('Zaproszenie wysłane');
    } catch (e: any) { toast(e.message); }
  };
  const resign = async () => {
    if (!confirm('Zrezygnować z programu partnerskiego?')) return;
    try { await api.get('/partnership/resignation'); load(); } catch (e: any) { toast(e.message); }
  };
  const copy = (t: string) => { navigator.clipboard?.writeText(t); toast('Skopiowano link polecający'); };

  /* ---- Onboarding (not yet a partner) ---- */
  if (!data.isPartner) {
    return (
      <div>
        <div className="screen-head">
          <h1 className="screen-title dy-h">Partnerstwo</h1>
          <p className="screen-sub">Polecaj DivideYou i zarabiaj prowizje z dwóch poziomów struktury.</p>
        </div>
        <div className="grid-main">
          <div className="card card-pad">
            <div className="eyebrow" style={{ marginBottom: 8 }}>Program partnerski</div>
            <h2 className="dy-h" style={{ fontSize: 24, margin: '0 0 8px' }}>Zarabiaj prowizje, zapraszając innych</h2>
            <p className="muted" style={{ lineHeight: 1.6, margin: 0 }}>
              Udostępniaj swój link polecający i zarabiaj prowizję za każdym razem, gdy zaproszone przez Ciebie
              osoby doładują saldo JR. Stawki prowizji rosną wraz z rozwojem Twojej sieci.
            </p>
            <div className="stack" style={{ gap: 12, margin: '18px 0' }}>
              {[
                ['Prowizje z dwóch poziomów struktury', Trophy],
                ['Wypłata na konto lub do portfela JR', ArrowRight],
                ['Pełna przejrzystość rozliczeń', ShieldCheck],
              ].map(([txt, Ic]: any, i) => (
                <div className="row" key={i} style={{ gap: 10 }}>
                  <span className="banner-ic" style={{ background: 'var(--brand-tint)', color: 'var(--brand-600)', width: 32, height: 32 }}>
                    <Ic size={17} />
                  </span>
                  <span style={{ fontWeight: 600 }}>{txt}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="card card-pad" style={{ alignSelf: 'start' }}>
            <div className="card-title" style={{ marginBottom: 10 }}>Regulamin partnerski</div>
            <pre className="muted dy-scroll" style={{ whiteSpace: 'pre-wrap', background: 'var(--bg)', border: '1px solid var(--line)', padding: 12, borderRadius: 10, maxHeight: 180, overflow: 'auto', fontFamily: 'inherit', fontSize: 13, lineHeight: 1.6, margin: '0 0 14px' }}>
              {data.partnerTerm}
            </pre>
            <label className="check" style={{ marginBottom: 16 }}>
              <input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} />
              Akceptuję regulamin programu partnerskiego.
            </label>
            <button className="btn btn-primary btn-block" disabled={!terms} onClick={become}>
              <Users size={17} /> Zostań partnerem
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ---- Partner history sub-view ---- */
  if (historyPartner) {
    return <PartnerHistory partner={historyPartner} onBack={() => setHistoryPartner(null)} />;
  }

  /* ---- Partner dashboard ---- */
  return (
    <div>
      <div className="between screen-head" style={{ alignItems: 'flex-end' }}>
        <div>
          <h1 className="screen-title dy-h">Partnerstwo</h1>
          <p className="screen-sub">Polecaj DivideYou i zarabiaj prowizje z dwóch poziomów struktury.</p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={resign}>Zrezygnuj z programu</button>
      </div>

      <div className="tiles" style={{ marginBottom: 18 }}>
        <div className="card" style={{ background: 'var(--brand)', color: '#fff', padding: '18px 20px', border: 'none' }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--brand-300)' }}>Prowizje łącznie</div>
          <div className="dy-h dy-num" style={{ fontSize: 32, marginTop: 8 }}>{jr(data.toCommissionPayout)}</div>
          <div style={{ fontSize: 12, color: 'var(--brand-300)', marginTop: 4 }}>Partner #{data.partnerNumber}</div>
        </div>
        <div className="card card-pad">
          <div className="label">Struktura (downline)</div>
          <div className="dy-h dy-num" style={{ fontSize: 32, marginTop: 8, color: 'var(--ink)' }}>{data.partnersCount} osób</div>
          <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>bezpośrednio poleconych</div>
        </div>
        <div className="card card-pad">
          <div className="label">Stawka prowizji</div>
          <div className="dy-h dy-num" style={{ fontSize: 32, marginTop: 8, color: 'var(--accent)' }}>{data.commissionPercent}%</div>
          <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>od doładowań struktury</div>
        </div>
      </div>

      <div className="grid-main">
        <div className="card">
          <div className="card-head">
            <span className="card-title">Twoja struktura</span>
            <span className="badge badge-partner">{data.partnersCount} PARTNERÓW</span>
          </div>
          {data.partners.length === 0 ? (
            <Empty>Brak poleconych partnerów. Udostępnij swój link, aby zbudować strukturę.</Empty>
          ) : (
            <div className="tx-list">
              {data.partners.map((p: any) => (
                <div key={p.id} className="tx-row" style={{ cursor: 'pointer' }} onClick={() => setHistoryPartner(p)}>
                  <span className="tx-ic"><Users size={18} /></span>
                  <div className="tx-main">
                    <div className="tx-title">{nameOf(p)}</div>
                    <div className="tx-meta">Dołączył {new Date(p.createdAt).toLocaleDateString('pl-PL')} · {p.email}</div>
                  </div>
                  <span className="badge badge-partner">Poziom 1</span>
                  <span className="badge badge-ok">Aktywny</span>
                  <ArrowRight size={16} style={{ color: 'var(--ink-3)', flex: 'none' }} />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="stack" style={{ gap: 18 }}>
          <div className="card card-pad">
            <div className="card-title" style={{ marginBottom: 12 }}>Twój link polecający</div>
            <div className="row" style={{ gap: 8, marginBottom: 12 }}>
              <input className="input dy-num" readOnly value={data.inviteUrl || ''} />
              <button className="btn btn-outline" style={{ flex: 'none', paddingInline: 14 }} onClick={() => copy(data.inviteUrl)}>
                <Copy size={16} />
              </button>
            </div>
            <label className="label" style={{ display: 'block', marginBottom: 7 }}>Zaproś przez e-mail</label>
            <div className="row" style={{ gap: 8 }}>
              <div className="input-icon grow">
                <Mail size={16} />
                <input className="input" placeholder="e-mail znajomego" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} />
              </div>
              <button className="btn btn-primary" style={{ flex: 'none' }} onClick={invite}>Zaproś</button>
            </div>
          </div>

          <div className="card card-pad">
            <div className="card-title" style={{ marginBottom: 12 }}>Materiały marketingowe</div>
            <div className="stack" style={{ gap: 8 }}>
              {MATERIALS.map((m, i) => (
                <a key={i} className="loc-row" style={{ margin: 0 }} onClick={() => toast('Pobieranie materiału…')}>
                  <span className="tx-ic"><Download size={18} /></span>
                  <div className="grow">
                    <div style={{ fontWeight: 700 }}>{m.name}</div>
                    <div className="muted" style={{ fontSize: 12.5 }}>{m.note}</div>
                  </div>
                  <Download size={16} style={{ color: 'var(--brand-600)' }} />
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PartnerHistory({ partner, onBack }: { partner: any; onBack: () => void }) {
  const [txs, setTxs] = useState<any[] | null>(null);
  const [range, setRange] = useState('90');
  const [min, setMin] = useState('');
  const [max, setMax] = useState('');

  useEffect(() => {
    api.get(`/partnership/${partner.id}/history`).then(setTxs).catch(() => setTxs([]));
  }, [partner.id]);

  const filtered = useMemo(() => {
    if (!txs) return [];
    const now = Date.now();
    const days = Number(range);
    return txs.filter((t) => {
      if (days && now - new Date(t.timestamp).getTime() > days * 864e5) return false;
      if (min && t.value < Number(min)) return false;
      if (max && t.value > Number(max)) return false;
      return true;
    });
  }, [txs, range, min, max]);

  return (
    <div>
      <button className="btn btn-ghost btn-sm" style={{ marginBottom: 14 }} onClick={onBack}>
        <ArrowLeft size={16} /> Wróć do struktury
      </button>
      <div className="screen-head">
        <h1 className="screen-title dy-h">Historia partnera</h1>
        <p className="screen-sub">Filtrowana historia prowizji — {nameOf(partner)}.</p>
      </div>

      <div className="row wrap" style={{ gap: 12, marginBottom: 16 }}>
        <select className="select" style={{ width: 200 }} value={range} onChange={(e) => setRange(e.target.value)}>
          <option value="30">Zakres: ostatnie 30 dni</option>
          <option value="90">Zakres: ostatnie 90 dni</option>
          <option value="365">Zakres: ostatni rok</option>
          <option value="0">Zakres: cały okres</option>
        </select>
        <input className="input" style={{ width: 150 }} type="number" placeholder="Kwota od" value={min} onChange={(e) => setMin(e.target.value)} />
        <input className="input" style={{ width: 150 }} type="number" placeholder="Kwota do" value={max} onChange={(e) => setMax(e.target.value)} />
      </div>

      <div className="card">
        {txs === null ? (
          <Spinner />
        ) : filtered.length === 0 ? (
          <Empty>Brak prowizji w wybranym zakresie.</Empty>
        ) : (
          <div className="tx-list">
            {filtered.map((t) => (
              <div key={t.id} className="tx-row">
                <span className="tx-ic"><Users size={18} /></span>
                <div className="tx-main">
                  <div className="tx-title">Prowizja — {nameOf(partner)}</div>
                  <div className="tx-meta">Poziom 1 · {new Date(t.timestamp).toLocaleDateString('pl-PL')}</div>
                </div>
                <div className="tx-amt pos dy-num">+{jr(t.value)}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
