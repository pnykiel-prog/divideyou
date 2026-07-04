import { Router } from 'express';
import { prisma } from '../../lib/prisma.js';
import { wrap } from '../../lib/http.js';
import { requireAdmin } from '../../middleware/auth.js';
import {
  parseFilters, resolveClientIds, toSeries, Filters,
  AGE_GROUPS, REGIONS, ageGroupOf, genderOf, regionOf, M,
} from '../../services/stats.service.js';

const router = Router();
const guard = requireAdmin('STATISTICS');

// Transaction / payment type groups
const T = { JR: [10, 11], GMV: [20, 21], SUB: [40], COMM_IN: [50], PAYOUT: [60, 61] };

function clientScope(ids: Set<string> | null) {
  return ids ? { clientId: { in: [...ids] } } : {};
}

// ---- rows for a single metric within the filter window ----
async function metricRows(metric: string, f: Filters, ids: Set<string> | null): Promise<{ date: Date; value: number }[]> {
  const range = { gte: f.from, lte: f.to };
  if (metric === 'registrations') {
    const rows = await prisma.userClient.findMany({
      where: { user: { type: 1, createdAt: range }, ...(ids ? { id: { in: [...ids] } } : {}) },
      select: { user: { select: { createdAt: true } } },
    });
    return rows.map((r) => ({ date: r.user.createdAt, value: 1 }));
  }
  if (metric === 'access_revenue') {
    const rows = await prisma.payment.findMany({
      where: { type: 2, status: 2, createdAt: range, ...clientScope(ids) },
      select: { createdAt: true, value: true },
    });
    return rows.map((r) => ({ date: r.createdAt, value: r.value / M }));
  }
  const typeMap: Record<string, number[]> = {
    jr_volume: T.JR, gmv: T.GMV, subscriptions: T.SUB, commissions: T.COMM_IN, payouts: T.PAYOUT,
  };
  const types = typeMap[metric];
  if (!types) return [];
  const rows = await prisma.transaction.findMany({
    where: { type: { in: types }, cancelled: false, timestamp: range, ...clientScope(ids) },
    select: { timestamp: true, value: true },
  });
  return rows.map((r) => ({ date: r.timestamp, value: r.value / M }));
}

// POST /series  { metrics: string[], ...filters }  -> [{ date, m1, m2, ... }]
router.post('/series', guard, wrap(async (req, res) => {
  const f = parseFilters(req.body);
  const ids = await resolveClientIds(f);
  const metrics: string[] = Array.isArray(req.body?.metrics) && req.body.metrics.length ? req.body.metrics : ['registrations'];
  const perMetric = await Promise.all(metrics.map(async (m) => [m, toSeries(await metricRows(m, f, ids), f)] as const));
  const dates = perMetric[0][1].map((r) => r.date);
  const out = dates.map((date, i) => {
    const row: any = { date };
    for (const [m, series] of perMetric) row[m] = series[i]?.value ?? 0;
    return row;
  });
  res.json(out);
}));

// POST /overview -> KPI object
router.post('/overview', guard, wrap(async (req, res) => {
  const f = parseFilters(req.body);
  const ids = await resolveClientIds(f);
  const inRange = { gte: f.from, lte: f.to };
  const idWhere = ids ? { id: { in: [...ids] } } : {};
  const cScope = clientScope(ids);
  const sum = (rows: { value: number }[]) => rows.reduce((s, r) => s + r.value, 0);

  const [clientsTotal, newClients, activeClients, fullAccess, purchasesCount, activeRows, canceledPurchases, partners] = await Promise.all([
    prisma.userClient.count({ where: { user: { type: 1 }, ...idWhere } }),
    prisma.userClient.count({ where: { user: { type: 1, createdAt: inRange }, ...idWhere } }),
    prisma.userClient.count({ where: { user: { type: 1, lastLoginAt: { gte: new Date(Date.now() - 30 * 86400000) } }, ...idWhere } }),
    prisma.userClient.count({ where: { user: { type: 1 }, accessFeePaid: true, ...idWhere } }),
    prisma.purchase.count({ where: ids ? { userClientId: { in: [...ids] } } : {} }),
    prisma.purchase.findMany({ where: { active: true, ...(ids ? { userClientId: { in: [...ids] } } : {}) }, select: { subscriptionFee: true } }),
    prisma.purchase.count({ where: { canceled: true, ...(ids ? { userClientId: { in: [...ids] } } : {}) } }),
    prisma.userClient.count({ where: { partnerNumber: { not: null }, ...idWhere } }),
  ]);

  const [jrRows, gmvRows, commIn, commOut, accessPay, pendingPay, refunds, accepted, rejected] = await Promise.all([
    prisma.transaction.findMany({ where: { type: { in: T.JR }, cancelled: false, timestamp: inRange, ...cScope }, select: { value: true } }),
    prisma.transaction.findMany({ where: { type: { in: T.GMV }, cancelled: false, timestamp: inRange, ...cScope }, select: { value: true } }),
    prisma.transaction.findMany({ where: { type: 50, cancelled: false, timestamp: inRange, ...cScope }, select: { value: true } }),
    prisma.transaction.findMany({ where: { type: 61, cancelled: false, timestamp: inRange, ...cScope }, select: { value: true } }),
    prisma.payment.findMany({ where: { type: 2, status: 2, createdAt: inRange, ...cScope }, select: { value: true } }),
    prisma.payment.findMany({ where: { status: 1, ...cScope }, select: { value: true } }),
    prisma.clientRequest.findMany({ where: { createdAt: inRange, ...cScope }, select: { value: true } }),
    prisma.payment.count({ where: { status: 2, createdAt: inRange, ...cScope } }),
    prisma.payment.count({ where: { status: 3, createdAt: inRange, ...cScope } }),
  ]);

  const mrr = activeRows.reduce((s, p) => s + p.subscriptionFee, 0) / M;
  res.json({
    clientsTotal, newClients, activeClients,
    pctFullAccess: clientsTotal ? Math.round((fullAccess / clientsTotal) * 100) : 0,
    jrVolume: +(jrRows.reduce((s, r) => s + r.value, 0) / M).toFixed(2),
    gmv: +(gmvRows.reduce((s, r) => s + r.value, 0) / M).toFixed(2),
    accessRevenue: +(accessPay.reduce((s, r) => s + r.value, 0) / M).toFixed(2),
    mrr: +mrr.toFixed(2),
    activePurchases: activeRows.length,
    cancelRate: purchasesCount ? Math.round((canceledPurchases / purchasesCount) * 100) : 0,
    partners,
    commissionsAccrued: +(commIn.reduce((s, r) => s + r.value, 0) / M).toFixed(2),
    commissionsPaid: +(commOut.reduce((s, r) => s + r.value, 0) / M).toFixed(2),
    pendingPaymentsCount: pendingPay.length,
    pendingPaymentsValue: +(pendingPay.reduce((s, r) => s + r.value, 0) / M).toFixed(2),
    refundsCount: refunds.length,
    refundsValue: +(refunds.reduce((s, r) => s + r.value, 0) / M).toFixed(2),
    paymentSuccess: accepted + rejected ? Math.round((accepted / (accepted + rejected)) * 100) : 100,
  });
}));

// POST /demographics -> age/gender pyramid + distributions (non-demographic filters applied)
router.post('/demographics', guard, wrap(async (req, res) => {
  const f = parseFilters(req.body);
  const ids = await resolveClientIds(f, { ignoreDemographic: true });
  const clients = await prisma.userClient.findMany({
    where: { user: { type: 1, createdAt: { gte: f.from, lte: f.to } }, ...(ids ? { id: { in: [...ids] } } : {}) },
    select: { type: true, personalNumber: true },
  });
  const pyramid = AGE_GROUPS.map((group) => ({ group, K: 0, M: 0 }));
  const genderCount = { K: 0, M: 0 };
  let priv = 0, biz = 0;
  for (const c of clients) {
    if (c.type === 2) { biz++; continue; }
    priv++;
    const grp = ageGroupOf(c.personalNumber);
    const g = genderOf(c.personalNumber);
    if (g) genderCount[g]++;
    if (grp && g) { const row = pyramid.find((p) => p.group === grp)!; row[g]++; }
  }
  res.json({
    pyramid,
    ageGroups: AGE_GROUPS.map((group) => { const r = pyramid.find((p) => p.group === group)!; return { group, count: r.K + r.M }; }),
    gender: [{ name: 'Kobiety', value: genderCount.K }, { name: 'Mężczyźni', value: genderCount.M }],
    accountType: [{ name: 'Prywatni', value: priv }, { name: 'Firmy', value: biz }],
  });
}));

// POST /geo -> clients & GMV by region and by city
router.post('/geo', guard, wrap(async (req, res) => {
  const f = parseFilters(req.body);
  const ids = await resolveClientIds(f, { ignoreDemographic: true });
  const clients = await prisma.userClient.findMany({
    where: { user: { type: 1 }, ...(ids ? { id: { in: [...ids] } } : {}) },
    select: { id: true, city: true },
  });
  const gmvRows = await prisma.transaction.findMany({
    where: { type: { in: T.GMV }, cancelled: false, timestamp: { gte: f.from, lte: f.to } },
    select: { clientId: true, value: true },
  });
  const gmvByClient = new Map<string, number>();
  for (const r of gmvRows) gmvByClient.set(r.clientId, (gmvByClient.get(r.clientId) || 0) + r.value / M);

  const region: Record<string, { count: number; gmv: number }> = {};
  const city: Record<string, { count: number; gmv: number }> = {};
  for (const c of clients) {
    const r = regionOf(c.city); const ct = c.city || 'nieznane';
    const g = gmvByClient.get(c.id) || 0;
    (region[r] ||= { count: 0, gmv: 0 }); region[r].count++; region[r].gmv += g;
    (city[ct] ||= { count: 0, gmv: 0 }); city[ct].count++; city[ct].gmv += g;
  }
  const pack = (o: Record<string, { count: number; gmv: number }>, key: string) =>
    Object.entries(o).map(([name, v]) => ({ [key]: name, count: v.count, gmv: +v.gmv.toFixed(2) })).sort((a, b) => b.count - a.count);
  res.json({ byRegion: pack(region, 'region'), byCity: pack(city, 'city').slice(0, 12) });
}));

// POST /funnel -> conversion funnel
router.post('/funnel', guard, wrap(async (req, res) => {
  const f = parseFilters(req.body);
  const ids = await resolveClientIds(f, { ignoreDemographic: true });
  const idIn = ids ? { in: [...ids] } : undefined;
  const baseUser: any = { type: 1, createdAt: { gte: f.from, lte: f.to } };

  const [registered, emailOk, fullAccess, bought] = await Promise.all([
    prisma.userClient.count({ where: { user: baseUser, ...(idIn ? { id: idIn } : {}) } }),
    prisma.userClient.count({ where: { user: { ...baseUser, emailConfirmed: true }, ...(idIn ? { id: idIn } : {}) } }),
    prisma.userClient.count({ where: { user: baseUser, accessFeePaid: true, ...(idIn ? { id: idIn } : {}) } }),
    prisma.userClient.count({ where: { user: baseUser, anyProgramBought: true, ...(idIn ? { id: idIn } : {}) } }),
  ]);
  // clients who topped up JR
  const toppedIds = await prisma.transaction.findMany({
    where: { type: { in: T.JR }, cancelled: false, ...(ids ? { clientId: { in: [...ids] } } : {}) },
    select: { clientId: true }, distinct: ['clientId'],
  });
  const regClients = new Set((await prisma.userClient.findMany({ where: { user: baseUser, ...(idIn ? { id: idIn } : {}) }, select: { id: true } })).map((c) => c.id));
  const topped = toppedIds.filter((t) => regClients.has(t.clientId)).length;

  const stages = [
    { stage: 'Rejestracja', count: registered },
    { stage: 'Potwierdzony e-mail', count: emailOk },
    { stage: 'Pełny dostęp', count: fullAccess },
    { stage: 'Doładował JR', count: topped },
    { stage: 'Kupił program', count: bought },
  ];
  res.json(stages.map((s) => ({ ...s, pct: registered ? Math.round((s.count / registered) * 100) : 0 })));
}));

// POST /payments -> by status and by type
router.post('/payments', guard, wrap(async (req, res) => {
  const f = parseFilters(req.body);
  const ids = await resolveClientIds(f);
  const rows = await prisma.payment.findMany({
    where: { createdAt: { gte: f.from, lte: f.to }, ...clientScope(ids) },
    select: { status: true, type: true, value: true },
  });
  const STATUS: Record<number, string> = { 0: 'Zainicjowana', 1: 'Oczekująca', 2: 'Zaakceptowana', 3: 'Odrzucona' };
  const TYPE: Record<number, string> = { 1: 'Doładowanie JR', 2: 'Opłata za dostęp', 10: 'Wypłata JR', 11: 'Wypłata prowizji' };
  const agg = (keyName: string, labels: Record<number, string>, pick: (r: any) => number) => {
    const o: Record<string, { count: number; value: number }> = {};
    for (const r of rows) { const k = labels[pick(r)] || 'Inne'; (o[k] ||= { count: 0, value: 0 }); o[k].count++; o[k].value += r.value / M; }
    return Object.entries(o).map(([name, v]) => ({ [keyName]: name, count: v.count, value: +v.value.toFixed(2) }));
  };
  res.json({ byStatus: agg('status', STATUS, (r) => r.status), byType: agg('type', TYPE, (r) => r.type) });
}));

// GET /filters -> options for the filter bar
router.get('/filters', guard, wrap(async (_req, res) => {
  const [cities, programs] = await Promise.all([
    prisma.userClient.findMany({ where: { city: { not: null } }, distinct: ['city'], select: { city: true }, orderBy: { city: 'asc' } }),
    prisma.program.findMany({ where: { isBonus: false }, select: { id: true, name: true, vip: true }, orderBy: { name: 'asc' } }),
  ]);
  res.json({
    cities: cities.map((c) => c.city).filter(Boolean),
    regions: REGIONS,
    ageGroups: AGE_GROUPS,
    genders: [{ value: 'K', label: 'Kobiety' }, { value: 'M', label: 'Mężczyźni' }],
    programs,
  });
}));

export default router;
