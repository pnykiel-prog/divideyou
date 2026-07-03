import { Router } from 'express';
import { prisma } from '../../lib/prisma.js';
import { wrap, notFound, badRequest } from '../../lib/http.js';
import { requireAdmin } from '../../middleware/auth.js';
import { locationDto, attributeDto } from '../../services/serialize.js';
import { toMinor } from '../../lib/money.js';
import { attrData } from './programs.routes.js';

const router = Router();

const locationData = (b: any) => ({
  name: b.name,
  description: b.description ?? '',
  address: b.address ?? null,
  city: b.city ?? null,
  postalCode: b.postalCode ?? null,
  latitude: b.latitude != null ? Number(b.latitude) : null,
  longitude: b.longitude != null ? Number(b.longitude) : null,
  visible: b.visible !== false,
  purchaseDuration: Number(b.purchaseDuration) || 12,
  entryFee: toMinor(Number(b.entryFee) || 0),
  subscriptionPrice: toMinor(Number(b.subscriptionPrice) || 0),
  amountBlocked: toMinor(Number(b.amountBlocked) || 0),
  maxPurchases: Number(b.maxPurchases) || 0,
  gallery: JSON.stringify(b.gallery ?? []),
});

// POST /admin/locations — create under a program
router.post('/', requireAdmin('PROGRAM', 2), wrap(async (req, res) => {
  const programId = req.body.programId;
  if (!programId) throw badRequest('Wymagane programId');
  const program = await prisma.program.findUnique({ where: { id: programId } });
  if (!program) throw notFound('Nie znaleziono programu');
  const l = await prisma.location.create({ data: { programId, ...locationData(req.body) }, include: { program: true } });
  res.json(locationDto(l));
}));

// GET /admin/locations/:id
router.get('/:id', requireAdmin('PROGRAM'), wrap(async (req, res) => {
  const l = await prisma.location.findUnique({ where: { id: req.params.id }, include: { program: true } });
  if (!l) throw notFound('Nie znaleziono lokalizacji');
  res.json(locationDto(l));
}));

// POST /admin/locations/:id — update
router.post('/:id', requireAdmin('PROGRAM', 2), wrap(async (req, res) => {
  const l = await prisma.location.update({ where: { id: req.params.id }, data: locationData(req.body), include: { program: true } });
  res.json(locationDto(l));
}));

// DELETE /admin/locations/:id
router.delete('/:id', requireAdmin('PROGRAM', 2), wrap(async (req, res) => {
  await prisma.location.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
}));

// attributes
router.get('/:id/attributes', requireAdmin('PROGRAM'), wrap(async (req, res) => {
  const attrs = await prisma.programAttribute.findMany({ where: { locationId: req.params.id }, orderBy: { sortOrder: 'asc' } });
  res.json(attrs.map(attributeDto));
}));
router.post('/:id/add-attribute', requireAdmin('PROGRAM', 2), wrap(async (req, res) => {
  const a = await prisma.programAttribute.create({ data: attrData(req.body, { locationId: req.params.id }) });
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

export default router;
