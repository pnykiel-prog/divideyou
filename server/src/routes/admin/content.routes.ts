import { Router } from 'express';
import { prisma } from '../../lib/prisma.js';
import { wrap, notFound, badRequest, pagination } from '../../lib/http.js';
import { requireAdmin } from '../../middleware/auth.js';
import { newsDto, faqDto, settingsDto, programDto } from '../../services/serialize.js';
import { currentSettings } from '../../services/settings.service.js';
import { toMinor } from '../../lib/money.js';

const router = Router();

const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Math.random().toString(36).slice(2, 6);

// ---------------- News ----------------
router.get('/news', requireAdmin('NEWS'), wrap(async (req, res) => {
  const { skip, take, page, perPage } = pagination(req.query);
  const [items, total] = await Promise.all([
    prisma.news.findMany({ orderBy: { createdAt: 'desc' }, skip, take }),
    prisma.news.count(),
  ]);
  res.json({ items: items.map(newsDto), total, page, perPage });
}));
router.get('/news/:id', requireAdmin('NEWS'), wrap(async (req, res) => {
  const n = await prisma.news.findUnique({ where: { id: req.params.id } });
  if (!n) throw notFound('News not found');
  res.json(newsDto(n));
}));
router.post('/news', requireAdmin('NEWS', 2), wrap(async (req, res) => {
  if (!req.body.title) throw badRequest('Title required');
  const n = await prisma.news.create({
    data: { title: req.body.title, content: req.body.content ?? '', photo: req.body.photo ?? null, slug: slugify(req.body.title) },
  });
  res.json(newsDto(n));
}));
router.put('/news/:id', requireAdmin('NEWS', 2), wrap(async (req, res) => {
  const n = await prisma.news.update({
    where: { id: req.params.id },
    data: { title: req.body.title, content: req.body.content, photo: req.body.photo ?? null },
  });
  res.json(newsDto(n));
}));
router.delete('/news/:id', requireAdmin('NEWS', 2), wrap(async (req, res) => {
  await prisma.news.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
}));

// ---------------- FAQ ----------------
router.get('/faq', requireAdmin('FAQ'), wrap(async (req, res) => {
  const q = (req.query.query as string) || '';
  const items = await prisma.faq.findMany({
    where: q ? { question: { contains: q } } : {},
    orderBy: { sortOrder: 'asc' },
  });
  res.json(items.map(faqDto));
}));
router.get('/faq/:id', requireAdmin('FAQ'), wrap(async (req, res) => {
  const f = await prisma.faq.findUnique({ where: { id: req.params.id } });
  if (!f) throw notFound('FAQ not found');
  res.json(faqDto(f));
}));
router.post('/faq', requireAdmin('FAQ', 2), wrap(async (req, res) => {
  const f = await prisma.faq.create({
    data: { question: req.body.question, answer: req.body.answer ?? '', sortOrder: Number(req.body.sortOrder) || 0, onDashboard: !!req.body.onDashboard },
  });
  res.json(faqDto(f));
}));
router.put('/faq/:id', requireAdmin('FAQ', 2), wrap(async (req, res) => {
  const f = await prisma.faq.update({
    where: { id: req.params.id },
    data: { question: req.body.question, answer: req.body.answer, sortOrder: Number(req.body.sortOrder) || 0, onDashboard: !!req.body.onDashboard },
  });
  res.json(faqDto(f));
}));
router.delete('/faq/:id', requireAdmin('FAQ', 2), wrap(async (req, res) => {
  await prisma.faq.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
}));

// ---------------- Registration rules ----------------
router.get('/registration-rules', requireAdmin('TERMS'), wrap(async (_req, res) => {
  const rules = await prisma.registrationRule.findMany({ orderBy: { sortOrder: 'asc' } });
  res.json(rules);
}));
router.post('/registration-rules/:id', requireAdmin('TERMS', 2), wrap(async (req, res) => {
  const data = { name: req.body.name, content: req.body.content ?? '', required: req.body.required !== false };
  let rule;
  if (req.params.id === 'new') rule = await prisma.registrationRule.create({ data });
  else rule = await prisma.registrationRule.update({ where: { id: req.params.id }, data });
  res.json(rule);
}));

// ---------------- Settings / control parameters ----------------
router.get('/settings/last', requireAdmin('SETTINGS'), wrap(async (_req, res) => {
  res.json(settingsDto(await currentSettings()));
}));
router.get('/settings', requireAdmin('SETTINGS'), wrap(async (_req, res) => {
  const items = await prisma.settings.findMany({ orderBy: { createdAt: 'desc' } });
  res.json(items.map(settingsDto));
}));
router.post('/settings', requireAdmin('SETTINGS', 2), wrap(async (req, res) => {
  const s = await createSettings(req.body);
  res.json(settingsDto(s));
}));

// Control parameters bundle: settings + recommended programs + commission thresholds
router.get('/control-parameters', requireAdmin('STATISTICS'), wrap(async (_req, res) => {
  const settings = await currentSettings();
  const recommended = await prisma.program.findMany({ where: { recommended: true }, take: 3 });
  const thresholds = await prisma.partnershipCommissionThreshold.findMany({ where: { global: true }, orderBy: { lowLimit: 'asc' } });
  res.json({
    settings: settingsDto(settings),
    recommended: recommended.map(programDto),
    commissionThresholds: thresholds,
  });
}));
router.post('/control-parameters', requireAdmin('STATISTICS', 2), wrap(async (req, res) => {
  if (req.body.settings) await createSettings(req.body.settings);
  if (Array.isArray(req.body.commissionThresholds)) {
    await prisma.partnershipCommissionThreshold.deleteMany({ where: { global: true } });
    for (const t of req.body.commissionThresholds) {
      await prisma.partnershipCommissionThreshold.create({
        data: { global: true, lowLimit: Number(t.lowLimit) || 0, highLimit: Number(t.highLimit) || 0, value: Number(t.value) || 0 },
      });
    }
  }
  res.json({ ok: true });
}));

async function createSettings(b: any) {
  const prev = await currentSettings();
  return prisma.settings.create({
    data: {
      demoAccessDays: b.demoAccessDays != null ? Number(b.demoAccessDays) : prev.demoAccessDays,
      accessPrice: b.accessPrice != null ? toMinor(Number(b.accessPrice)) : prev.accessPrice,
      jrExchangeRate: b.jrExchangeRate != null ? toMinor(Number(b.jrExchangeRate)) : prev.jrExchangeRate,
      jrWithdrawalPeriodDays: b.jrWithdrawalPeriodDays != null ? Number(b.jrWithdrawalPeriodDays) : prev.jrWithdrawalPeriodDays,
      jrProtectionPeriodDays: b.jrProtectionPeriodDays != null ? Number(b.jrProtectionPeriodDays) : prev.jrProtectionPeriodDays,
      minJrForVip: b.minJrForVip != null ? toMinor(Number(b.minJrForVip)) : prev.minJrForVip,
      minJrForBonus: b.minJrForBonus != null ? toMinor(Number(b.minJrForBonus)) : prev.minJrForBonus,
      partnerTerm: b.partnerTerm != null ? String(b.partnerTerm) : prev.partnerTerm,
    },
  });
}

export default router;
