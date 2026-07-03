import { Router } from 'express';
import { prisma } from '../../lib/prisma.js';
import { wrap, notFound, badRequest } from '../../lib/http.js';
import { requireClient } from '../../middleware/auth.js';
import { calculateWallet } from '../../services/wallet.service.js';
import { currentSettings } from '../../services/settings.service.js';
import { programDto, locationDto, attributeDto, walletDto } from '../../services/serialize.js';

const router = Router();
router.use(requireClient());

const cid = (req: any) => req.auth.client.id as string;

function buildTree(attrs: any[]) {
  const byId = new Map(attrs.map((a) => [a.id, { ...a, children: [] as any[] }]));
  const roots: any[] = [];
  for (const a of byId.values()) {
    if (a.parentId && byId.has(a.parentId)) byId.get(a.parentId)!.children.push(a);
    else roots.push(a);
  }
  return roots;
}

// GET /programs, /programs/vip, /programs/observed
router.get('/programs', wrap((req, res) => listPrograms(req, res, { vip: false })));
router.get('/programs/vip', wrap((req, res) => listPrograms(req, res, { vip: true })));

async function listPrograms(req: any, res: any, opts: { vip: boolean }) {
  const query = (req.query.query as string) || '';
  const programs = await prisma.program.findMany({
    where: {
      isBonus: false,
      visible: true,
      vip: opts.vip,
      name: query ? { contains: query } : undefined,
    },
    include: { _count: { select: { locations: true, purchases: true } } },
    orderBy: [{ recommended: 'desc' }, { createdAt: 'desc' }],
  });
  res.json(programs.map(programDto));
}

router.get('/programs/observed', wrap(async (req, res) => {
  const observed = await prisma.observedItem.findMany({
    where: { clientId: cid(req), programId: { not: null } },
    include: { program: { include: { _count: { select: { locations: true } } } } },
  });
  res.json(observed.map((o) => programDto(o.program)));
}));

// GET /programs/:id
router.get('/programs/:id', wrap(async (req, res) => {
  const p = await prisma.program.findUnique({
    where: { id: req.params.id },
    include: {
      locations: { where: { visible: true }, include: { program: true } },
      _count: { select: { purchases: true } },
    },
  });
  if (!p) throw notFound('Program not found');
  res.json(programDto(p));
}));

// GET /programs/:id/locations
router.get('/programs/:id/locations', wrap(async (req, res) => {
  const query = (req.query.query as string) || '';
  const locations = await prisma.location.findMany({
    where: { programId: req.params.id, visible: true, name: query ? { contains: query } : undefined },
    include: { program: true },
  });
  res.json(locations.map(locationDto));
}));

// GET /programs/:id/attributes (bonus attributes) and /locations/:id/attributes
router.get('/programs/:id/attributes', wrap((req, res) => attributesFor(req, res, 'program')));

// Observe / unobserve program
router.post('/programs/:id/observe', wrap((req, res) => observe(req, res, 'program', true)));
router.post('/programs/:id/unobserve', wrap((req, res) => observe(req, res, 'program', false)));

// ---- Locations ----
router.get('/locations/available', wrap(async (req, res) => {
  const query = (req.query.query as string) || '';
  const locations = await prisma.location.findMany({
    where: {
      visible: true,
      program: { isBonus: false, visible: true },
      name: query ? { contains: query } : undefined,
    },
    include: { program: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json(locations.map(locationDto));
}));

router.get('/locations/observed', wrap(async (req, res) => {
  const observed = await prisma.observedItem.findMany({
    where: { clientId: cid(req), locationId: { not: null } },
    include: { location: { include: { program: true } } },
  });
  res.json(observed.map((o) => locationDto(o.location)));
}));

router.get('/locations/:id', wrap(async (req, res) => {
  const l = await prisma.location.findUnique({
    where: { id: req.params.id },
    include: { program: true, electronicRules: true },
  });
  if (!l) throw notFound('Location not found');
  const observed = await prisma.observedItem.findFirst({ where: { clientId: cid(req), locationId: l.id } });
  res.json({ ...locationDto(l), observed: !!observed, electronicRules: l.electronicRules });
}));

router.get('/locations/:id/attributes', wrap((req, res) => attributesFor(req, res, 'location')));

router.post('/locations/:id/observe', wrap((req, res) => observe(req, res, 'location', true)));
router.post('/locations/:id/unobserve', wrap((req, res) => observe(req, res, 'location', false)));

// ---- Bonuses ----
router.get('/bonuses', wrap(async (req, res) => {
  const query = (req.query.query as string) || '';
  const bonuses = await prisma.program.findMany({
    where: { isBonus: true, visible: true, name: query ? { contains: query } : undefined },
    include: { _count: { select: { purchases: true } } },
    orderBy: { createdAt: 'desc' },
  });
  res.json(bonuses.map((b) => ({ ...programDto(b), availablePurchases: b.maxPurchases ? b.maxPurchases - (b as any)._count.purchases : null })));
}));

router.get('/bonuses/:id', wrap(async (req, res) => {
  const b = await prisma.program.findFirst({
    where: { id: req.params.id, isBonus: true },
    include: { electronicRules: true, _count: { select: { purchases: true } } },
  });
  if (!b) throw notFound('Bonus not found');
  const observed = await prisma.observedItem.findFirst({ where: { clientId: cid(req), programId: b.id } });
  res.json({ ...programDto(b), observed: !!observed, electronicRules: b.electronicRules });
}));

router.get('/bonuses/:id/attributes', wrap((req, res) => attributesFor(req, res, 'program')));
router.post('/bonuses/:id/observe', wrap((req, res) => observe(req, res, 'program', true)));
router.post('/bonuses/:id/unobserve', wrap((req, res) => observe(req, res, 'program', false)));

// ---- shared helpers ----
async function attributesFor(req: any, res: any, kind: 'program' | 'location') {
  const where = kind === 'program' ? { programId: req.params.id } : { locationId: req.params.id };
  const attrs = await prisma.programAttribute.findMany({ where, orderBy: { sortOrder: 'asc' } });
  res.json(buildTree(attrs).map(attributeDto));
}

async function observe(req: any, res: any, kind: 'program' | 'location', on: boolean) {
  // Requires access fee paid (legacy rule).
  if (!req.auth.client.accessFeePaid) throw badRequest('Full access required to observe');
  const key = kind === 'program' ? { programId: req.params.id } : { locationId: req.params.id };
  const existing = await prisma.observedItem.findFirst({ where: { clientId: cid(req), ...key } });
  if (on && !existing) {
    await prisma.observedItem.create({
      data: { clientId: cid(req), ...key, notifyOnAvailable: !!req.body.notify_on_available },
    });
  } else if (!on && existing) {
    await prisma.observedItem.delete({ where: { id: existing.id } });
  }
  res.json({ ok: true });
}

export default router;
