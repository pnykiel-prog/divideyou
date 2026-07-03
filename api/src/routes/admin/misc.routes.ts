import { Router } from 'express';
import { prisma } from '../../lib/prisma.js';
import { wrap, notFound, badRequest, pagination } from '../../lib/http.js';
import { requireAdmin } from '../../middleware/auth.js';
import { purchaseDto, transactionDto } from '../../services/serialize.js';
import { refreshClientDenormalized, calculateWallet } from '../../services/wallet.service.js';
import { logTransaction, commissionPercent } from '../../services/ledger.service.js';
import { TransactionType } from '../../lib/constants.js';

const router = Router();

// ---------------- Purchases (admin) ----------------
router.get('/purchases/:id', requireAdmin('PROGRAM'), wrap(async (req, res) => {
  const p = await prisma.purchase.findUnique({
    where: { id: req.params.id },
    include: { program: true, location: { include: { program: true } }, attributes: true, userClient: { include: { user: true } } },
  });
  if (!p) throw notFound('Purchase not found');
  res.json({ ...purchaseDto(p), client: { id: p.userClient.id, email: p.userClient.user.email } });
}));

// POST /admin/purchases/:id/cancellation — cancel a purchase, optionally returning JR
router.post('/purchases/:id/cancellation', requireAdmin('USER_PROGRAM', 2), wrap(async (req, res) => {
  const p = await prisma.purchase.findUnique({ where: { id: req.params.id } });
  if (!p) throw notFound('Purchase not found');
  const returnJr = req.body.return_jr === true || req.body.return_jr === 'true' || req.body.returnJr === true;
  await logTransaction({
    clientId: p.userClientId,
    type: TransactionType.CANCELLATION,
    value: 0,
    purchaseId: p.id,
    description: 'Cancelled by admin' + (returnJr ? ' (JR returned)' : ''),
  });
  if (returnJr && p.price > 0) {
    await logTransaction({
      clientId: p.userClientId,
      type: TransactionType.ACCOUNT_DONATION,
      value: p.price,
      purchaseId: p.id,
      description: 'Refund on admin cancellation',
    });
  }
  await prisma.purchase.update({
    where: { id: p.id },
    data: { active: false, canceled: true, canceledByAdmin: true, nextPaymentDate: null },
  });
  await refreshClientDenormalized(p.userClientId);
  res.json({ ok: true });
}));

// ---------------- Transactions (admin) ----------------
router.post('/transactions/:id/cancel', requireAdmin('PAYMENT', 2), wrap(async (req, res) => {
  const t = await prisma.transaction.findUnique({ where: { id: req.params.id } });
  if (!t) throw notFound('Transaction not found');
  await prisma.transaction.update({ where: { id: t.id }, data: { cancelled: true } });
  await refreshClientDenormalized(t.clientId);
  res.json({ ok: true });
}));

// ---------------- System partners ----------------
router.get('/system-partners', requireAdmin('USER_PARTNERSHIP'), wrap(async (_req, res) => {
  const partners = await prisma.userClient.findMany({
    where: { partnershipTermAccepted: true },
    include: { user: true, _count: { select: { partners: true } } },
  });
  const rows = [];
  for (const p of partners) {
    const w = await calculateWallet(p.id);
    rows.push({
      id: p.id,
      userId: p.userId,
      email: p.user.email,
      partnerNumber: p.partnerNumber,
      referredCount: (p as any)._count.partners,
      commissionPercent: await commissionPercent(p),
      toCommissionPayout: w.toCommissionPayout / 100,
      custom: p.customPartnershipCommission,
    });
  }
  res.json(rows);
}));

// ---------------- Statistics ----------------
router.get('/statistics/counts', requireAdmin('STATISTICS'), wrap(statCounts));
router.post('/statistics/counts', requireAdmin('STATISTICS'), wrap(statCounts));
async function statCounts(_req: any, res: any) {
  const [users, admins, programs, bonuses, locations, purchases, activePurchases] = await Promise.all([
    prisma.user.count({ where: { type: 1 } }),
    prisma.user.count({ where: { type: 2 } }),
    prisma.program.count({ where: { isBonus: false } }),
    prisma.program.count({ where: { isBonus: true } }),
    prisma.location.count(),
    prisma.purchase.count(),
    prisma.purchase.count({ where: { active: true } }),
  ]);
  res.json({ users, admins, programs, bonuses, locations, purchases, activePurchases });
}

router.post('/statistics/registrations', requireAdmin('STATISTICS'), wrap((req, res) => timeSeries(req, res, 'user')));
router.post('/statistics/purchases-program', requireAdmin('STATISTICS'), wrap((req, res) => timeSeries(req, res, 'program')));
router.post('/statistics/purchases-bonus', requireAdmin('STATISTICS'), wrap((req, res) => timeSeries(req, res, 'bonus')));
router.post('/statistics/purchases-jr', requireAdmin('STATISTICS'), wrap((req, res) => timeSeries(req, res, 'jr')));

async function timeSeries(req: any, res: any, kind: string) {
  const from = req.body.from ? new Date(req.body.from) : new Date(Date.now() - 180 * 86400000);
  const to = req.body.to ? new Date(req.body.to) : new Date();
  let rows: { createdAt: Date }[] = [];
  if (kind === 'user') rows = await prisma.user.findMany({ where: { type: 1, createdAt: { gte: from, lte: to } }, select: { createdAt: true } });
  else if (kind === 'program') rows = (await prisma.purchase.findMany({ where: { isBonus: false, active: true, boughtDate: { gte: from, lte: to } }, select: { boughtDate: true } })).map((r) => ({ createdAt: r.boughtDate! }));
  else if (kind === 'bonus') rows = (await prisma.purchase.findMany({ where: { isBonus: true, active: true, boughtDate: { gte: from, lte: to } }, select: { boughtDate: true } })).map((r) => ({ createdAt: r.boughtDate! }));
  else if (kind === 'jr') rows = (await prisma.transaction.findMany({ where: { type: { in: [10, 11] }, timestamp: { gte: from, lte: to } }, select: { timestamp: true } })).map((r) => ({ createdAt: r.timestamp }));

  const byDay: Record<string, number> = {};
  for (const r of rows) {
    if (!r.createdAt) continue;
    const key = r.createdAt.toISOString().slice(0, 10);
    byDay[key] = (byDay[key] || 0) + 1;
  }
  res.json(Object.entries(byDay).sort().map(([date, count]) => ({ date, count })));
}

router.get('/statistics/popular-locations', requireAdmin('STATISTICS'), wrap(async (_req, res) => {
  const grouped = await prisma.purchase.groupBy({
    by: ['locationId'],
    where: { locationId: { not: null }, active: true },
    _count: { locationId: true },
  });
  const withNames = [];
  for (const g of grouped) {
    const loc = await prisma.location.findUnique({ where: { id: g.locationId! } });
    withNames.push({ name: loc?.name ?? 'Unknown', count: g._count.locationId });
  }
  res.json(withNames.sort((a, b) => b.count - a.count).slice(0, 10));
}));

router.get('/statistics/all-users', requireAdmin('STATISTICS'), wrap(async (req, res) => {
  const { skip, take, page, perPage } = pagination(req.query);
  const [items, total] = await Promise.all([
    prisma.user.findMany({ where: { type: 1 }, include: { client: true }, skip, take, orderBy: { createdAt: 'desc' } }),
    prisma.user.count({ where: { type: 1 } }),
  ]);
  res.json({
    items: items.map((u) => ({ id: u.id, email: u.email, firstName: u.client?.firstName, lastName: u.client?.lastName, phone: u.client?.phone, jrActive: (u.client?.jrActive ?? 0) / 100, createdAt: u.createdAt })),
    total, page, perPage,
  });
}));

// ---------------- Files (simplified in-DB tree) ----------------
router.get('/file/directory/:id?', requireAdmin('FILES'), wrap(async (req, res) => {
  const parentId = req.params.id ?? null;
  const items = await prisma.fileItem.findMany({ where: { parentId }, orderBy: [{ isDirectory: 'desc' }, { name: 'asc' }] });
  res.json(items);
}));
router.post('/file/directory', requireAdmin('FILES', 2), wrap(async (req, res) => {
  const item = await prisma.fileItem.create({ data: { name: req.body.name || 'New folder', isDirectory: true, parentId: req.body.directoryId ?? null } });
  res.json(item);
}));
router.post('/file', requireAdmin('FILES', 2), wrap(async (req, res) => {
  const item = await prisma.fileItem.create({
    data: {
      name: req.body.name || 'file',
      isDirectory: false,
      parentId: req.body.directoryId ?? null,
      path: req.body.path ?? null,
      mimeType: req.body.mimeType ?? null,
      marketingMaterial: !!req.body.marketingMaterial,
    },
  });
  res.json(item);
}));
router.delete('/file/:id', requireAdmin('FILES', 2), wrap(async (req, res) => {
  await prisma.fileItem.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
}));

export default router;
