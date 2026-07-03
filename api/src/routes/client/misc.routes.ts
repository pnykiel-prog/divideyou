import { Router } from 'express';
import { randomBytes } from 'crypto';
import { prisma } from '../../lib/prisma.js';
import { wrap, badRequest, notFound, pagination } from '../../lib/http.js';
import { requireClient } from '../../middleware/auth.js';
import { calculateWallet } from '../../services/wallet.service.js';
import { commissionPercent } from '../../services/ledger.service.js';
import { currentSettings } from '../../services/settings.service.js';
import { walletDto, clientDto, purchaseDto, newsDto, faqDto } from '../../services/serialize.js';
import { GdprType } from '../../lib/constants.js';

const router = Router();

const genPartnerNumber = () => {
  const year = new Date().getFullYear().toString().slice(2);
  return year + Math.floor(100000 + Math.random() * 900000).toString();
};

// ---- wallet + dashboard (require client) ----
const client = requireClient('ROLE_CLIENT', 'ROLE_ONLY_PAY');
const cid = (req: any) => req.auth.client.id as string;

router.get('/wallet', client, wrap(async (req, res) => {
  const w = await calculateWallet(cid(req));
  const s = await currentSettings();
  res.json(walletDto(w, s.jrExchangeRate));
}));

router.get('/dashboard', client, wrap(async (req, res) => {
  const w = await calculateWallet(cid(req));
  const s = await currentSettings();
  const purchases = await prisma.purchase.findMany({
    where: { userClientId: cid(req), active: true },
    include: { program: true, location: { include: { program: true } }, attributes: true },
    orderBy: { boughtDate: 'desc' },
    take: 5,
  });
  const partnersCount = await prisma.userClient.count({ where: { partnerOfId: cid(req) } });
  const recentTx = await prisma.transaction.findMany({
    where: { clientId: cid(req) },
    orderBy: { id: 'desc' },
    take: 5,
    include: { payment: true, purchase: { include: { program: true, location: true } } },
  });
  res.json({
    profile: clientDto(req.auth),
    wallet: walletDto(w, s.jrExchangeRate),
    purchases: purchases.map(purchaseDto),
    partnersCount,
    recentTransactions: recentTx.map((t) => ({
      id: t.id,
      type: t.type,
      value: t.value / 100,
      timestamp: t.timestamp,
    })),
  });
}));

// ---- News (client / only-pay) ----
router.get('/news', client, wrap(async (req, res) => {
  const { skip, take, page, perPage } = pagination(req.query);
  const [items, total] = await Promise.all([
    prisma.news.findMany({ orderBy: { createdAt: 'desc' }, skip, take }),
    prisma.news.count(),
  ]);
  res.json({ items: items.map(newsDto), total, page, perPage });
}));
router.get('/news/:slug', client, wrap(async (req, res) => {
  const n = await prisma.news.findUnique({ where: { slug: req.params.slug } });
  if (!n) throw notFound('News not found');
  res.json(newsDto(n));
}));

// ---- FAQ ----
router.get('/faq', client, wrap(async (_req, res) => {
  const items = await prisma.faq.findMany({ orderBy: { sortOrder: 'asc' } });
  res.json(items.map(faqDto));
}));
router.get('/faq/dashboard', client, wrap(async (_req, res) => {
  const items = await prisma.faq.findMany({ where: { onDashboard: true }, orderBy: { sortOrder: 'asc' }, take: 3 });
  res.json(items.map(faqDto));
}));
router.get('/faq/:id', client, wrap(async (req, res) => {
  const f = await prisma.faq.findUnique({ where: { id: req.params.id } });
  if (!f) throw notFound('FAQ not found');
  res.json(faqDto(f));
}));

// ---- Partnership ----
const partnerClient = requireClient('ROLE_CLIENT', 'ROLE_ONLY_PAY');

router.get('/partnership', partnerClient, wrap(async (req, res) => {
  const c = req.auth.client;
  const s = await currentSettings();
  const w = await calculateWallet(cid(req));
  const partners = await prisma.userClient.findMany({
    where: { partnerOfId: cid(req) },
    include: { user: true },
  });
  const percent = c.partnershipTermAccepted ? await commissionPercent(c) : 0;
  res.json({
    isPartner: c.partnershipTermAccepted,
    partnerNumber: c.partnerNumber,
    inviteUrl: c.partnerNumber ? `${process.env.FRONT_URL}/register/${c.partnerNumber}` : null,
    commissionPercent: percent,
    partnersCount: partners.length,
    partners: partners.map((p) => ({
      id: p.id,
      email: p.user.email,
      firstName: p.firstName,
      lastName: p.lastName,
      companyName: p.companyName,
      createdAt: p.createdAt,
    })),
    toCommissionPayout: w.toCommissionPayout / 100,
    partnerTerm: s.partnerTerm,
  });
}));

router.post('/partnership/become', partnerClient, wrap(async (req, res) => {
  const c = req.auth.client;
  if (c.partnershipTermAccepted) throw badRequest('Already a partner');
  if (!c.detailDataConfirmed) throw badRequest('Complete your profile data before becoming a partner');
  let partnerNumber = c.partnerNumber;
  if (!partnerNumber) {
    for (let i = 0; i < 5; i++) {
      const candidate = genPartnerNumber();
      const exists = await prisma.userClient.findUnique({ where: { partnerNumber: candidate } });
      if (!exists) { partnerNumber = candidate; break; }
    }
  }
  await prisma.userClient.update({
    where: { id: cid(req) },
    data: {
      partnershipTermAccepted: true,
      partnershipTermDate: new Date(),
      partnershipRegisterIp: req.ip,
      partnerNumber,
    },
  });
  await prisma.gdprAgreement.create({
    data: { clientId: cid(req), type: GdprType.PARTNERSHIP, content: 'Partnership terms accepted' },
  });
  res.json({ ok: true, partnerNumber });
}));

router.get('/partnership/resignation', requireClient('ROLE_CLIENT_PARTNER'), wrap(async (req, res) => {
  await prisma.userClient.update({
    where: { id: cid(req) },
    data: { partnershipTermAccepted: false },
  });
  res.json({ ok: true });
}));

router.post('/partnership/invite', requireClient('ROLE_CLIENT_PARTNER'), wrap(async (req, res) => {
  const email = String(req.body.email || '').toLowerCase();
  if (!email) throw badRequest('Email required');
  await prisma.invitation.create({ data: { clientId: cid(req), email } });
  res.json({ ok: true });
}));

router.get('/partnership/invitations', requireClient('ROLE_CLIENT_PARTNER'), wrap(async (req, res) => {
  const items = await prisma.invitation.findMany({ where: { clientId: cid(req) }, orderBy: { createdAt: 'desc' } });
  res.json(items);
}));

router.get('/partnership/:partnerId/history', requireClient('ROLE_CLIENT_PARTNER'), wrap(async (req, res) => {
  const partner = await prisma.userClient.findFirst({
    where: { id: req.params.partnerId, partnerOfId: cid(req) },
  });
  if (!partner) throw notFound('Partner not found');
  const txs = await prisma.transaction.findMany({
    where: { clientId: partner.id, type: { in: [10, 11] } },
    orderBy: { timestamp: 'desc' },
  });
  res.json(txs.map((t) => ({ id: t.id, value: t.value / 100, timestamp: t.timestamp })));
}));

export default router;
