import { Router } from 'express';
import { prisma } from '../../lib/prisma.js';
import { wrap, notFound, badRequest } from '../../lib/http.js';
import { requireClient } from '../../middleware/auth.js';
import { purchaseDto } from '../../services/serialize.js';
import { recomputePurchaseTotals, addMonths, monthsBetween } from '../../services/purchase.service.js';
import { calculateWallet, refreshClientDenormalized } from '../../services/wallet.service.js';
import { logTransaction } from '../../services/ledger.service.js';
import { TransactionType } from '../../lib/constants.js';

const router = Router();
router.use(requireClient('ROLE_CLIENT', 'ROLE_ONLY_PAY'));

const cid = (req: any) => req.auth.client.id as string;

// Find or create the client's active draft purchase for a location/bonus.
async function findOrCreateDraft(clientId: string, opts: { locationId?: string; programId?: string }) {
  const where: any = { userClientId: clientId, active: false, canceled: false, finished: false };
  if (opts.locationId) where.locationId = opts.locationId;
  if (opts.programId) where.programId = opts.programId;
  let draft = await prisma.purchase.findFirst({ where });
  if (!draft) {
    draft = await prisma.purchase.create({
      data: {
        userClientId: clientId,
        locationId: opts.locationId,
        programId: opts.programId,
        isBonus: !!opts.programId,
      },
    });
  }
  return draft;
}

// POST /purchase/ — set or remove an attribute on the draft
router.post('/', wrap(async (req, res) => {
  const { locationId, programId, programAttributeId, count } = req.body;
  if (!locationId && !programId) throw badRequest('Wymagane locationId lub programId');
  const draft = await findOrCreateDraft(cid(req), { locationId, programId });

  if (programAttributeId) {
    const attr = await prisma.programAttribute.findUnique({ where: { id: programAttributeId } });
    if (!attr) throw notFound('Nie znaleziono atrybutu');
    const n = Number(count) || 0;
    const existing = await prisma.purchaseAttribute.findFirst({
      where: { purchaseId: draft.id, programAttributeId },
    });
    if (n <= 0) {
      if (existing) await prisma.purchaseAttribute.delete({ where: { id: existing.id } });
    } else {
      const cnt = Math.min(n, attr.maxCount || n);
      // enforce mutual exclusion among non-multiselect siblings
      if (!attr.isMultiselect && attr.parentId) {
        const siblings = await prisma.programAttribute.findMany({
          where: { parentId: attr.parentId, isMultiselect: false, NOT: { id: attr.id } },
        });
        await prisma.purchaseAttribute.deleteMany({
          where: { purchaseId: draft.id, programAttributeId: { in: siblings.map((s) => s.id) } },
        });
      }
      const data = {
        name: attr.name,
        count: cnt,
        startFee: attr.startFee,
        subscriptionPrice: attr.subscriptionPrice,
        amountBlocked: attr.amountBlocked,
      };
      if (existing) await prisma.purchaseAttribute.update({ where: { id: existing.id }, data });
      else await prisma.purchaseAttribute.create({ data: { purchaseId: draft.id, programAttributeId, ...data } });
    }
  }

  const updated = await recomputePurchaseTotals(draft.id);
  res.json(purchaseDto(updated));
}));

// GET /purchase/:id — draft/purchase detail + summary
router.get('/:id', wrap(async (req, res) => {
  const p = await getPurchase(req);
  res.json(purchaseDto(p));
}));

router.get('/:id/program-summary', wrap((req, res) => summary(req, res)));
router.get('/:id/bonus-summary', wrap((req, res) => summary(req, res)));

async function summary(req: any, res: any) {
  const p = await getPurchase(req);
  const w = await calculateWallet(cid(req));
  const required = p.price + p.amountBlocked;
  const available = w.active + w.pending;
  res.json({
    purchase: purchaseDto(p),
    required: required / 100,
    available: available / 100,
    missing: Math.max(0, required - available) / 100,
    canAfford: available >= required,
  });
}

// POST /purchase/finish — finalize the draft
router.post('/finish', wrap(async (req, res) => {
  const id = req.body.purchase_id || req.body.purchaseId;
  const p = await prisma.purchase.findFirst({
    where: { id, userClientId: cid(req) },
    include: { program: true, location: true, attributes: true },
  });
  if (!p) throw notFound('Nie znaleziono zakupu');
  if (p.active) throw badRequest('Zakup już dokonany');

  await recomputePurchaseTotals(p.id);
  const fresh = (await prisma.purchase.findUnique({ where: { id: p.id }, include: { location: true, program: true } }))!;

  const w = await calculateWallet(cid(req));
  const required = fresh.price + fresh.amountBlocked;
  if (w.active + w.pending < required) {
    throw badRequest('Niewystarczające środki. Potrzebujesz jeszcze ' + (required - (w.active + w.pending)) / 100 + ' JR');
  }

  const now = new Date();
  const duration = fresh.isBonus ? fresh.program!.gracePeriod : fresh.location!.purchaseDuration;
  await prisma.purchase.update({
    where: { id: p.id },
    data: {
      active: true,
      boughtDate: now,
      activationDate: now,
      endDate: addMonths(now, duration),
      nextPaymentDate: addMonths(now, 1),
    },
  });

  await logTransaction({
    clientId: cid(req),
    type: fresh.isBonus ? TransactionType.BONUS_PURCHASE : TransactionType.PROGRAM_PURCHASE,
    value: fresh.price,
    purchaseId: p.id,
    description: fresh.isBonus ? 'Zakup bonusu' : 'Zakup programu',
  });
  if (fresh.amountBlocked > 0) {
    await logTransaction({
      clientId: cid(req),
      type: TransactionType.FROZEN_RESOURCES,
      value: fresh.amountBlocked,
      purchaseId: p.id,
      description: 'Zabezpieczenie (zamrożone)',
    });
  }

  await prisma.userClient.update({ where: { id: cid(req) }, data: { anyProgramBought: true } });
  await refreshClientDenormalized(cid(req));
  res.json({ ok: true, purchaseId: p.id });
}));

// POST /purchase/:id/pay-subscription — pay N months of subscription
router.post('/:id/pay-subscription', wrap(async (req, res) => {
  const months = Math.max(1, Number(req.body.months) || 1);
  const p = await getPurchase(req);
  if (!p.active) throw badRequest('Zakup nieaktywny');
  const total = p.subscriptionFee * months;
  const w = await calculateWallet(cid(req));
  if (w.active < total) throw badRequest('Niewystarczające środki na abonament');
  await logTransaction({
    clientId: cid(req),
    type: TransactionType.SUBSCRIPTION_FEE,
    value: total,
    purchaseId: p.id,
    subscriptionMonths: months,
    description: `Abonament (${months} mies.)`,
  });
  await prisma.purchase.update({
    where: { id: p.id },
    data: { nextPaymentDate: addMonths(p.nextPaymentDate ?? new Date(), months) },
  });
  await refreshClientDenormalized(cid(req));
  res.json({ ok: true });
}));

// Cancel program / bonus (allowed after grace period, before endDate)
router.all('/:id/cancel-program', wrap((req, res) => cancel(req, res)));
router.all('/:id/cancel-bonus', wrap((req, res) => cancel(req, res)));

async function cancel(req: any, res: any) {
  const p = await getPurchase(req);
  if (!p.active) throw badRequest('Zakup nieaktywny');
  // Grace period (months) after which cancellation is allowed.
  const graceMonths = p.isBonus ? p.program!.gracePeriod : p.location!.program.gracePeriod;
  if (p.activationDate && monthsBetween(p.activationDate, new Date()) < graceMonths) {
    throw badRequest('Nie można anulować przed zakończeniem okresu karencji');
  }
  await logTransaction({
    clientId: cid(req),
    type: TransactionType.CANCELLATION,
    value: 0,
    purchaseId: p.id,
    description: 'Anulowanie zakupu',
  });
  await prisma.purchase.update({
    where: { id: p.id },
    data: { active: false, canceled: true, nextPaymentDate: null },
  });
  await refreshClientDenormalized(cid(req));
  res.json({ ok: true });
}

async function getPurchase(req: any) {
  const p = await prisma.purchase.findFirst({
    where: { id: req.params.id, userClientId: cid(req) },
    include: {
      program: true,
      location: { include: { program: true } },
      attributes: true,
    },
  });
  if (!p) throw notFound('Nie znaleziono zakupu');
  return p;
}

export default router;
