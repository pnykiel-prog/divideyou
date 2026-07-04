import { useEffect, useMemo, useState } from 'react';
import * as RC from 'recharts';
// recharts' bundled JSX types clash with @types/react here; cast to any (runtime unaffected).
const {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, LabelList,
} = RC as any;
import { api, jr, pln } from '../api';
import { Spinner, ErrorAlert } from '../components/ui';

const PALETTE = ['#2E9E54', '#2B6FB0', '#C9821A', '#9C2F63', '#0E3A33', '#7E877F', '#B23A48', '#185749'];

const iso = (d: Date) => d.toISOString().slice(0, 10);
const daysAgo = (n: number) => iso(new Date(Date.now() - n * 86400000));

const METRICS = [
  { key: 'registrations', label: 'Rejestracje', color: '#2B6FB0' },
  { key: 'jr_volume', label: 'Doładowania JR', color: '#2E9E54' },
  { key: 'gmv', label: 'GMV (zakupy)', color: '#9C2F63' },
  { key: 'access_revenue', label: 'Opłaty za dostęp (zł)', color: '#C9821A' },
  { key: 'commissions', label: 'Prowizje', color: '#B23A48' },
  { key: 'subscriptions', label: 'Abonamenty', color: '#185749' },
];

type Filters = {
  from: string; to: string; granularity: string;
  segment: string; ageGroup: string; gender: string; region: string; city: string; source: string; paymentStatus: string;
};
const EMPTY: Filters = { from: daysAgo(365), to: iso(new Date()), granularity: 'month', segment: '', ageGroup: '', gender: '', region: '', city: '', source: '', paymentStatus: '' };

const clean = (f: Filters) => Object.fromEntries(Object.entries(f).filter(([, v]) => v !== '')) as any;

const ChartCard = ({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) => (
  <div className="card pad">
    <h3 style={{ margin: '0 0 2px', fontSize: 16 }}>{title}</h3>
    {sub && <div style={{ color: 'var(--muted)', fontSize: 12, marginBottom: 8 }}>{sub}</div>}
    <div style={{ height: 300, marginTop: 8 }}>{children}</div>
  </div>
);

function Donut({ data }: { data?: { name: string; value: number }[] }) {
  const rows = (data || []).filter((r) => r.value > 0);
  if (!rows.length) return <div style={{ color: 'var(--muted)', fontSize: 13, display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center' }}>Brak danych</div>;
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie data={rows} dataKey="value" nameKey="name" innerRadius="55%" outerRadius="80%" paddingAngle={2}>
          {rows.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}

export default function Statistics() {
  const [opts, setOpts] = useState<any>({ cities: [], regions: [], programs: [], ageGroups: [], genders: [] });
  const [draft, setDraft] = useState<Filters>(EMPTY);
  const [applied, setApplied] = useState<Filters>(EMPTY);
  const [metricsOn, setMetricsOn] = useState<Record<string, boolean>>({ registrations: true, jr_volume: true, gmv: true });

  const [overview, setOverview] = useState<any>(null);
  const [series, setSeries] = useState<any[]>([]);
  const [demo, setDemo] = useState<any>(null);
  const [geo, setGeo] = useState<any>(null);
  const [funnel, setFunnel] = useState<any[]>([]);
  const [payments, setPayments] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<any>(null);

  useEffect(() => { api.get('/admin/statistics/filters').then(setOpts).catch(() => {}); }, []);

  useEffect(() => {
    let alive = true;
    setLoading(true); setErr(null);
    const body = clean(applied);
    Promise.all([
      api.post('/admin/statistics/overview', body),
      api.post('/admin/statistics/series', { ...body, metrics: METRICS.map((m) => m.key) }),
      api.post('/admin/statistics/demographics', body),
      api.post('/admin/statistics/geo', body),
      api.post('/admin/statistics/funnel', body),
      api.post('/admin/statistics/payments', body),
    ]).then(([o, s, d, g, f, p]) => {
      if (!alive) return;
      setOverview(o); setSeries(s); setDemo(d); setGeo(g); setFunnel(f); setPayments(p);
    }).catch((e) => alive && setErr(e)).finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [applied]);

  const set = (k: keyof Filters, v: string) => setDraft((d) => ({ ...d, [k]: v }));
  const apply = () => setApplied(draft);
  const preset = (from: string, granularity: string) => { const f = { ...draft, from, to: iso(new Date()), granularity }; setDraft(f); setApplied(f); };
  const reset = () => { setDraft(EMPTY); setApplied(EMPTY); };

  const pyramid = useMemo(() => (demo?.pyramid || []).map((r: any) => ({ group: r.group, Kobiety: r.K, Mężczyźni: -r.M })), [demo]);

  const TILES = overview ? [
    { label: 'Klienci', value: overview.clientsTotal, sub: `+${overview.newClients} nowych w okresie`, accent: true },
    { label: 'Aktywni (30 dni)', value: overview.activeClients, sub: `${overview.pctFullAccess}% z pełnym dostępem` },
    { label: 'Wolumen JR', value: jr(overview.jrVolume) },
    { label: 'GMV zakupów', value: jr(overview.gmv) },
    { label: 'Przychód z dostępu', value: pln(overview.accessRevenue) },
    { label: 'MRR abonamentów', value: jr(overview.mrr) },
    { label: 'Aktywne zakupy', value: overview.activePurchases, sub: `anulacje: ${overview.cancelRate}%` },
    { label: 'Partnerzy', value: overview.partners },
    { label: 'Prowizje naliczone', value: jr(overview.commissionsAccrued), sub: `wypłacone: ${jr(overview.commissionsPaid)}` },
    { label: 'Płatności oczekujące', value: overview.pendingPaymentsCount, sub: pln(overview.pendingPaymentsValue) },
    { label: 'Zwroty', value: overview.refundsCount, sub: jr(overview.refundsValue) },
    { label: 'Skuteczność płatności', value: `${overview.paymentSuccess}%` },
  ] : [];

  return (
    <div>
      <div className="page-head">
        <div>
          <h1 style={{ margin: 0 }}>Statystyki</h1>
          <div style={{ color: 'var(--muted)', fontSize: 13 }}>Interaktywny pulpit analityczny z filtrowaniem.</div>
        </div>
      </div>

      {/* ---- Filter bar ---- */}
      <div className="card pad" style={{ marginBottom: 16 }}>
        <div className="btn-row" style={{ marginBottom: 12 }}>
          <button className="btn sm" onClick={() => preset(daysAgo(30), 'day')}>30 dni</button>
          <button className="btn sm" onClick={() => preset(daysAgo(90), 'week')}>90 dni</button>
          <button className="btn sm" onClick={() => preset(daysAgo(365), 'month')}>12 miesięcy</button>
          <button className="btn sm" onClick={() => preset('2022-01-01', 'month')}>Cały okres</button>
        </div>
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
          <label className="field"><span>Od</span><input className="input" type="date" value={draft.from} onChange={(e) => set('from', e.target.value)} /></label>
          <label className="field"><span>Do</span><input className="input" type="date" value={draft.to} onChange={(e) => set('to', e.target.value)} /></label>
          <label className="field"><span>Granulacja</span>
            <select className="select" value={draft.granularity} onChange={(e) => set('granularity', e.target.value)}>
              <option value="day">Dzień</option><option value="week">Tydzień</option><option value="month">Miesiąc</option>
              <option value="quarter">Kwartał</option><option value="year">Rok</option>
            </select></label>
          <label className="field"><span>Segment</span>
            <select className="select" value={draft.segment} onChange={(e) => set('segment', e.target.value)}>
              <option value="">Wszyscy</option><option value="private">Prywatni</option><option value="business">Firmy</option>
            </select></label>
          <label className="field"><span>Grupa wiekowa</span>
            <select className="select" value={draft.ageGroup} onChange={(e) => set('ageGroup', e.target.value)}>
              <option value="">Wszystkie</option>{opts.ageGroups.map((g: string) => <option key={g} value={g}>{g}</option>)}
            </select></label>
          <label className="field"><span>Płeć</span>
            <select className="select" value={draft.gender} onChange={(e) => set('gender', e.target.value)}>
              <option value="">Wszystkie</option><option value="K">Kobiety</option><option value="M">Mężczyźni</option>
            </select></label>
          <label className="field"><span>Region</span>
            <select className="select" value={draft.region} onChange={(e) => set('region', e.target.value)}>
              <option value="">Wszystkie</option>{opts.regions.map((r: string) => <option key={r} value={r}>{r}</option>)}
            </select></label>
          <label className="field"><span>Miasto</span>
            <select className="select" value={draft.city} onChange={(e) => set('city', e.target.value)}>
              <option value="">Wszystkie</option>{opts.cities.map((c: string) => <option key={c} value={c}>{c}</option>)}
            </select></label>
          <label className="field"><span>Źródło</span>
            <select className="select" value={draft.source} onChange={(e) => set('source', e.target.value)}>
              <option value="">Wszystkie</option><option value="organic">Organiczne</option><option value="partner">Partnerskie</option>
            </select></label>
          <label className="field"><span>Status płatności</span>
            <select className="select" value={draft.paymentStatus} onChange={(e) => set('paymentStatus', e.target.value)}>
              <option value="">Wszyscy</option><option value="1">Bezpieczny</option><option value="2">Ostrzeżenie</option><option value="3">Zaległość</option>
            </select></label>
        </div>
        <div className="btn-row" style={{ marginTop: 12 }}>
          <button className="btn primary" onClick={apply}>Zastosuj filtry</button>
          <button className="btn ghost" onClick={reset}>Wyczyść</button>
        </div>
      </div>

      {err && <ErrorAlert error={err} />}
      {loading && !overview ? <Spinner /> : (
        <>
          {/* ---- KPI tiles ---- */}
          <div className="grid cols-4" style={{ marginBottom: 16 }}>
            {TILES.map((t) => (
              <div key={t.label} className={`stat${t.accent ? ' accent' : ''}`}>
                <div className="label">{t.label}</div>
                <div className="value">{t.value}</div>
                {t.sub && <div className="sub">{t.sub}</div>}
              </div>
            ))}
          </div>

          {/* ---- Time series ---- */}
          <ChartCard title="Trendy w czasie" sub="Zaznacz metryki do porównania">
            <div className="btn-row" style={{ marginBottom: 8 }}>
              {METRICS.map((m) => (
                <label key={m.key} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12.5, cursor: 'pointer' }}>
                  <input type="checkbox" checked={!!metricsOn[m.key]} onChange={(e) => setMetricsOn((s) => ({ ...s, [m.key]: e.target.checked }))} />
                  <span style={{ width: 9, height: 9, borderRadius: 2, background: m.color, display: 'inline-block' }} /> {m.label}
                </label>
              ))}
            </div>
            <ResponsiveContainer width="100%" height="85%">
              <LineChart data={series} margin={{ top: 5, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef1f6" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                {METRICS.filter((m) => metricsOn[m.key]).map((m) => (
                  <Line key={m.key} type="monotone" dataKey={m.key} name={m.label} stroke={m.color} strokeWidth={2} dot={false} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* ---- Demographics ---- */}
          <div className="grid cols-3" style={{ marginTop: 16 }}>
            <ChartCard title="Piramida wieku i płci" sub="Klienci prywatni (z PESEL)">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart layout="vertical" data={pyramid} stackOffset="sign" margin={{ left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef1f6" />
                  <XAxis type="number" tickFormatter={(v: any) => String(Math.abs(v))} tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="group" tick={{ fontSize: 11 }} width={44} />
                  <Tooltip formatter={(v: any) => Math.abs(v)} />
                  <Legend />
                  <Bar dataKey="Kobiety" fill="#9C2F63" stackId="s" />
                  <Bar dataKey="Mężczyźni" fill="#2B6FB0" stackId="s" />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
            <ChartCard title="Płeć"><Donut data={demo?.gender} /></ChartCard>
            <ChartCard title="Typ konta"><Donut data={demo?.accountType} /></ChartCard>
          </div>

          {/* ---- Geography ---- */}
          <div className="grid cols-2" style={{ marginTop: 16 }}>
            <ChartCard title="Klienci wg regionów" sub="Województwa">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart layout="vertical" data={geo?.byRegion || []} margin={{ left: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef1f6" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="region" tick={{ fontSize: 11 }} width={110} />
                  <Tooltip />
                  <Bar dataKey="count" name="Klienci" fill="#2E9E54" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
            <ChartCard title="Top miasta" sub="Liczba klientów">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart layout="vertical" data={geo?.byCity || []} margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef1f6" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="city" tick={{ fontSize: 11 }} width={80} />
                  <Tooltip />
                  <Bar dataKey="count" name="Klienci" fill="#2B6FB0" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          {/* ---- Funnel + payments ---- */}
          <div className="grid cols-2" style={{ marginTop: 16 }}>
            <ChartCard title="Lejek konwersji" sub="Od rejestracji do zakupu programu">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart layout="vertical" data={funnel} margin={{ left: 40, right: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef1f6" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="stage" tick={{ fontSize: 11 }} width={130} />
                  <Tooltip formatter={(v: any, _n: any, p: any) => [`${v} (${p.payload.pct}%)`, 'Klienci']} />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                    <LabelList dataKey="pct" position="right" formatter={(v: any) => `${v}%`} style={{ fontSize: 11, fill: 'var(--muted)' }} />
                    {funnel.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
            <ChartCard title="Płatności" sub="Wg statusu i typu">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', height: '100%', gap: 8 }}>
                <Donut data={(payments?.byStatus || []).map((r: any) => ({ name: r.status, value: r.count }))} />
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart layout="vertical" data={payments?.byType || []} margin={{ left: 10 }}>
                    <XAxis type="number" tick={{ fontSize: 10 }} hide />
                    <YAxis type="category" dataKey="type" tick={{ fontSize: 10 }} width={92} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#C9821A" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
          </div>
        </>
      )}
    </div>
  );
}
