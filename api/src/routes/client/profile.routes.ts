import { Router } from 'express';
import { prisma } from '../../lib/prisma.js';
import { wrap, badRequest, pagination } from '../../lib/http.js';
import { requireClient } from '../../middleware/auth.js';
import { calculateWallet } from '../../services/wallet.service.js';
import { currentSettings } from '../../services/settings.service.js';
import {
  clientDto,
  walletDto,
  transactionDto,
  purchaseDto,
  requestDto,
} from '../../services/serialize.js';
import { computeRoles, hashPassword, verifyPassword } from '../../services/auth.service.js';
import { ClientType, GdprType, UserType, BlockedStatus } from '../../lib/constants.js';

const router = Router();
router.use(requireClient());

const cid = (req: any) => req.auth.client.id as string;

// GET /profile/data
router.get('/data', wrap(async (req, res) => {
  const u = req.auth;
  const w = await calculateWallet(cid(req));
  const s = await currentSettings();
  res.json({ profile: clientDto(u), wallet: walletDto(w, s.jrExchangeRate) });
}));

// POST /profile/data — update personal/company data
router.post('/data', wrap(async (req, res) => {
  const b = req.body;
  const type = Number(b.type) || req.auth.client.type;
  await prisma.userClient.update({
    where: { id: cid(req) },
    data: {
      type,
      firstName: b.firstName ?? null,
      lastName: b.lastName ?? null,
      companyName: b.companyName ?? null,
      personalNumber: b.personalNumber ?? null,
      taxNumber: b.taxNumber ?? null,
      address: b.address ?? null,
      postalCode: b.postalCode ?? null,
      city: b.city ?? null,
      phone: b.phone ?? null,
      detailDataConfirmed: true,
    },
  });
  await prisma.gdprAgreement.create({
    data: { clientId: cid(req), type: GdprType.EDIT_DATA, content: 'Data updated' },
  });
  res.json({ ok: true });
}));

// POST /profile/payment-data — bank account
router.post('/payment-data', wrap(async (req, res) => {
  await prisma.userClient.update({
    where: { id: cid(req) },
    data: { bankAccountNumber: req.body.bankAccountNumber ?? null },
  });
  res.json({ ok: true });
}));

// GET /profile/transactions?query=&frozen=
router.get('/transactions', wrap(async (req, res) => {
  const { skip, take, page, perPage } = pagination(req.query);
  const where: any = { clientId: cid(req) };
  const [items, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      orderBy: { id: 'desc' },
      skip,
      take,
      include: { payment: true, purchase: { include: { program: true, location: true } } },
    }),
    prisma.transaction.count({ where }),
  ]);
  res.json({ items: items.map(transactionDto), total, page, perPage });
}));

// GET /profile/cashbacks
router.get('/cashbacks', wrap(async (req, res) => {
  const items = await prisma.clientRequest.findMany({
    where: { clientId: cid(req) },
    orderBy: { createdAt: 'desc' },
  });
  res.json(items.map(requestDto));
}));

// GET /profile/purchases (programs), /profile/bonus-purchases, /profile/vip-purchases
router.get('/purchases', wrap((req, res) => listPurchases(req, res, { bonus: false, vip: false })));
router.get('/vip-purchases', wrap((req, res) => listPurchases(req, res, { bonus: false, vip: true })));
router.get('/bonus-purchases', wrap((req, res) => listPurchases(req, res, { bonus: true })));
router.get('/programs', wrap((req, res) => listPurchases(req, res, { bonus: false, vip: false })));
router.get('/vip-programs', wrap((req, res) => listPurchases(req, res, { bonus: false, vip: true })));
router.get('/bonuses', wrap((req, res) => listPurchases(req, res, { bonus: true })));

async function listPurchases(req: any, res: any, opts: { bonus: boolean; vip?: boolean }) {
  const where: any = { userClientId: cid(req), isBonus: opts.bonus, active: true };
  const purchases = await prisma.purchase.findMany({
    where,
    orderBy: { boughtDate: 'desc' },
    include: {
      program: true,
      location: { include: { program: true } },
      attributes: true,
    },
  });
  const filtered = opts.vip === undefined
    ? purchases
    : purchases.filter((p) => {
        const vip = p.program?.vip || p.location?.program?.vip;
        return opts.vip ? vip : !vip;
      });
  res.json(filtered.map(purchaseDto));
}

// GET /profile/partners — downline
router.get('/partners', wrap(async (req, res) => {
  const partners = await prisma.userClient.findMany({
    where: { partnerOfId: cid(req) },
    include: { user: true },
  });
  res.json(partners.map((p) => ({
    id: p.id,
    email: p.user.email,
    firstName: p.firstName,
    lastName: p.lastName,
    companyName: p.companyName,
    createdAt: p.createdAt,
  })));
}));

// GET /profile/warnings — account alerts
router.get('/warnings', wrap(async (req, res) => {
  const c = req.auth.client;
  const s = await currentSettings();
  const w = await calculateWallet(cid(req));
  const warnings: any[] = [];

  if (!c.accessFeePaid) {
    const ageDays = Math.floor((Date.now() - new Date(c.createdAt).getTime()) / 86400000);
    const daysLeft = s.demoAccessDays - ageDays;
    warnings.push({ type: 'demo', daysLeft });
  }

  const missingAgreements = await prisma.registrationRule.count();
  const accepted = await prisma.gdprAgreement.count({ where: { clientId: cid(req), type: GdprType.REGISTRATION } });
  if (missingAgreements > 0 && accepted === 0) warnings.push({ type: 'agreements' });

  const activePurchases = await prisma.purchase.findMany({ where: { userClientId: cid(req), active: true } });
  const overdue = activePurchases.filter((p) => p.nextPaymentDate && p.nextPaymentDate < new Date());
  if (overdue.length) warnings.push({ type: 'missing_payments', count: overdue.length });

  const monthlySub = activePurchases.reduce((a, p) => a + p.subscriptionFee, 0);
  if (monthlySub > 0 && w.active < monthlySub) {
    warnings.push({ type: 'missing_funds', missing: (monthlySub - w.active) / 100 });
  }

  const pending = await prisma.payment.count({ where: { clientId: cid(req), status: 1 } });
  if (pending) warnings.push({ type: 'pending_payments', count: pending });

  res.json(warnings);
}));

// GET /profile/rules — registration + electronic agreements state
router.get('/rules', wrap(async (req, res) => {
  const rules = await prisma.registrationRule.findMany({ orderBy: { sortOrder: 'asc' } });
  const agreements = await prisma.gdprAgreement.findMany({ where: { clientId: cid(req) } });
  res.json({ rules, accepted: agreements.map((a) => a.type) });
}));

// POST /profile/rules — accept all account terms
router.post('/rules', wrap(async (req, res) => {
  await prisma.gdprAgreement.create({
    data: { clientId: cid(req), type: GdprType.ACCESS, content: 'All terms accepted' },
  });
  res.json({ ok: true });
}));

// GET /profile/commissions?date=
router.get('/commissions', wrap(async (req, res) => {
  const items = await prisma.transaction.findMany({
    where: { clientId: cid(req), type: 50 },
    orderBy: { timestamp: 'desc' },
    include: { partner: true },
  });
  res.json(items.map((t) => ({
    id: t.id,
    value: t.value / 100,
    plnEquivalent: t.plnEquivalent / 100,
    partner: t.partner ? { firstName: t.partner.firstName, lastName: t.partner.lastName } : null,
    timestamp: t.timestamp,
  })));
}));

// POST /profile/password
router.post('/password', wrap(async (req, res) => {
  const { oldPassword, password } = req.body;
  const user = await prisma.user.findUnique({ where: { id: req.auth.id } });
  if (!user || !(await verifyPassword(oldPassword || '', user.password))) {
    throw badRequest('Current password is incorrect');
  }
  await prisma.user.update({
    where: { id: req.auth.id },
    data: { password: await hashPassword(password), authTokenSeq: { increment: 1 } },
  });
  res.json({ ok: true });
}));

// POST /profile/delete — delete own account (blocked if active funds)
router.post('/delete', wrap(async (req, res) => {
  const { password } = req.body;
  const user = await prisma.user.findUnique({ where: { id: req.auth.id } });
  if (!user || !(await verifyPassword(password || '', user.password))) throw badRequest('Password incorrect');
  const w = await calculateWallet(cid(req));
  if (w.active > 0) throw badRequest('You have active funds. Contact support to withdraw first.');
  await prisma.user.update({
    where: { id: req.auth.id },
    data: { type: UserType.DELETED, blockedStatus: BlockedStatus.BY_ADMIN, authTokenSeq: { increment: 1 } },
  });
  res.json({ ok: true });
}));

export default router;
