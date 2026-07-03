import { Router } from 'express';
import { prisma } from '../../lib/prisma.js';
import { wrap, notFound, badRequest } from '../../lib/http.js';
import { requireAdmin } from '../../middleware/auth.js';
import { programDto, locationDto, attributeDto } from '../../services/serialize.js';
import { toMinor } from '../../lib/money.js';
import { logTransaction } from '../../services/ledger.service.js';
import { calculateWallet, refreshClientDenormalized } from '../../services/wallet.service.js';
import { TransactionType } from '../../lib/constants.js';

const router = Router();

const programData = (b: any, isBonus: boolean) => ({
  name: b.name,
  description: b.description ?? '',
  marketingText: b.marketingText ?? '',
  profilePhoto: b.profilePhoto ?? null,
  gallery: JSON.stringify(b.gallery ?? []),
  vip: !!b.vip,
  recommended: !!b.recommended,
  visible: b.visible !== false,
  isBonus,
  gracePeriod: Number(b.gracePeriod) || 12,
  entryFee: toMinor(Number(b.entryFee) || 0),
  subscriptionPrice: toMinor(Number(b.subscriptionPrice) || 0),
  amountBlocked: toMinor(Number(b.amountBlocked) || 0),
  minimalJrForView: toMinor(Number(b.minimalJrForView) || 0),
  maxPurchases: Number(b.maxPurchases) || 0,
});

// GET /admin/programs?vip=&query=
router.get('/', requireAdmin('PROGRAM'), wrap(async (req, res) => {
  const q = (req.query.query as string) || '';
  const where: any = { isBonus: false };
  if (req.query.vip != null && req.query.vip !== '') where.vip = req.query.vip === '1' || req.query.vip === 'true';
  if (q) where.name = { contains: q };
  const programs = await prisma.program.findMany({
    where, orderBy: { createdAt: 'desc' },
    include: { _count: { select: { locations: true, purchases: true } } },
  });
  res.json(programs.map(programDto));
}));

// GET /admin/programs/bonuses
router.get('/bonuses', requireAdmin('BONUS'), wrap(async (_req, res) => {
  const bonuses = await prisma.program.findMany({
    where: { isBonus: true }, orderBy: { createdAt: 'desc' },
    include: { _count: { select: { purchases: true } } },
  });
  res.json(bonuses.map(programDto));
}));

// POST /admin/programs, /admin/programs/bonus
router.post('/', requireAdmin('PROGRAM', 2), wrap(async (req, res) => {
  if (!req.body.name) throw badRequest('Name required');
  const p = await prisma.program.create({ data: programData(req.body, false) });
  res.json(programDto(p));
}));
router.post('/bonus', requireAdmin('BONUS', 2), wrap(async (req, res) => {
  if (!req.body.name) throw badRequest('Name required');
  const p = await prisma.program.create({ data: programData(req.body, true) });
  res.json(programDto(p));
}));

// GET /admin/programs/:id (+ /bonus)
router.get('/:id', requireAdmin('PROGRAM'), wrap((req, res) => showProgram(req, res)));
router.get('/:id/bonus', requireAdmin('BONUS'), wrap((req, res) => showProgram(req, res)));

async function showProgram(req: any, res: any) {
  const p = await prisma.program.findUnique({
    where: { id: req.params.id },
    include: {
      locations: { include: { program: true } },
      electronicRules: true,
      _count: { select: { purchases: true } },
    },
  });
  if (!p) throw notFound('Program not found');
  res.json({ ...programDto(p), electronicRules: p.electronicRules });
}

// POST /admin/programs/:id (edit), /admin/programs/:id/bonus (edit)
router.post('/:id', requireAdmin('PROGRAM', 2), wrap((req, res) => editProgram(req, res, false)));
router.post('/:id/bonus', requireAdmin('BONUS', 2), wrap((req, res) => editProgram(req, res, true)));

async function editProgram(req: any, res: any, isBonus: boolean) {
  const existing = await prisma.program.findUnique({ where: { id: req.params.id } });
  if (!existing) throw notFound('Program not found');
  const p = await prisma.program.update({ where: { id: req.params.id }, data: programData(req.body, isBonus) });
  res.json(programDto(p));
}

// DELETE /admin/programs/:id (+ /bonus)
router.delete('/:id', requireAdmin('PROGRAM', 2), wrap(deleteProgram));
router.delete('/:id/bonus', requireAdmin('BONUS', 2), wrap(deleteProgram));
async function deleteProgram(req: any, res: any) {
  await prisma.program.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
}

// GET /admin/programs/:id/locations
router.get('/:id/locations', requireAdmin('PROGRAM'), wrap(async (req, res) => {
  const locations = await prisma.location.findMany({
    where: { programId: req.params.id },
    include: { program: true },
  });
  res.json(locations.map(locationDto));
}));

// --- program/bonus attributes (bonus uses program endpoints) ---
router.get('/:id/attributes', requireAdmin('PROGRAM'), wrap(async (req, res) => {
  const attrs = await prisma.programAttribute.findMany({ where: { programId: req.params.id }, orderBy: { sortOrder: 'asc' } });
  res.json(attrs.map(attributeDto));
}));
router.post('/:id/add-attribute', requireAdmin('PROGRAM', 2), wrap(async (req, res) => {
  const a = await prisma.programAttribute.create({ data: attrData(req.body, { programId: req.params.id }) });
  res.json(attributeDto(a));
}));
router.patch('/:id/edit-attribute', requireAdmin('PROGRAM', 2), wrap(async (req, res) => {
  const a = await prisma.programAttribute.update({ where: { id: req.body.attributeId }, data: attrData(req.body, {}) });
  res.json(attributeDto(a));
}));
router.delete('/:id/remove-attribute/:attributeId', requireAdmin('PROGRAM', 2), wrap(async (req, res) => {
  await prisma.programAttribute.delete({ where: { id: req.params.attributeId } });
  res.json({ ok: true });
}));

// electronic rules for a program/bonus
router.post('/:id/create-program-electronic-rule', requireAdmin('PROGRAM', 2), wrap((req, res) => createERule(req, res)));
router.post('/:id/create-bonus-electronic-rule', requireAdmin('BONUS', 2), wrap((req, res) => createERule(req, res)));
async function createERule(req: any, res: any) {
  const r = await prisma.electronicRule.create({
    data: { name: req.body.name, content: req.body.content ?? '', required: req.body.required !== false, programId: req.params.id },
  });
  res.json(r);
}

export function attrData(b: any, base: { programId?: string; locationId?: string }) {
  return {
    ...base,
    name: b.name,
    description: b.description ?? '',
    type: Number(b.type) || 1,
    isFinal: !!b.isFinal,
    isMultiselect: !!b.isMultiselect,
    isRequired: !!b.isRequired,
    startFee: toMinor(Number(b.startFee) || 0),
    subscriptionPrice: toMinor(Number(b.subscriptionPrice) || 0),
    amountBlocked: toMinor(Number(b.amountBlocked) || 0),
    maxCount: Number(b.maxCount) || 1,
    maxPurchases: Number(b.maxPurchases) || 0,
    unit: b.unit ?? null,
    parentId: b.parentId ?? null,
    sortOrder: Number(b.sortOrder) || 0,
  };
}

export default router;
