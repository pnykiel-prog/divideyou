import { Router } from 'express';
import { prisma } from '../../lib/prisma.js';
import { wrap, notFound, badRequest, pagination } from '../../lib/http.js';
import { requireAdmin } from '../../middleware/auth.js';
import { paymentDto, requestDto } from '../../services/serialize.js';
import { refreshClientDenormalized } from '../../services/wallet.service.js';
import { logTransaction } from '../../services/ledger.service.js';
import { PaymentType, PaymentStatus, RequestStatus, TransactionType } from '../../lib/constants.js';

const router = Router();

const incomeTypes = [PaymentType.JR_PURCHASE, PaymentType.ACCESS_FEE];
const outTypes = [PaymentType.JR_PAYOUT, PaymentType.COMMISSION_PAYOUT, PaymentType.ACCESS_PAYOUT];

// GET /admin/payments/in
router.get('/in', requireAdmin('PAYMENT'), wrap((req, res) => list(req, res, incomeTypes)));
// GET /admin/payments/out
router.get('/out', requireAdmin('PAYMENT'), wrap((req, res) => list(req, res, outTypes)));

async function list(req: any, res: any, types: number[]) {
  const { skip, take, page, perPage } = pagination(req.query);
  const where = { type: { in: types } };
  const [items, total] = await Promise.all([
    prisma.payment.findMany({
      where, orderBy: { createdAt: 'desc' }, skip, take,
      include: { client: { include: { user: true } }, transaction: true },
    }),
    prisma.payment.count({ where }),
  ]);
  res.json({ items: items.map(paymentDto), total, page, perPage });
}

// GET /admin/payments/requests
router.get('/requests', requireAdmin('PAYMENT'), wrap(async (req, res) => {
  const { skip, take, page, perPage } = pagination(req.query);
  const [items, total] = await Promise.all([
    prisma.clientRequest.findMany({
      where: {}, orderBy: { createdAt: 'desc' }, skip, take,
      include: { client: { include: { user: true } } },
    }),
    prisma.clientRequest.count(),
  ]);
  res.json({ items: items.map(requestDto), total, page, perPage });
}));

// PATCH /admin/payments/:id/set-status
router.patch('/:id/set-status', requireAdmin('PAYMENT', 2), wrap(async (req, res) => {
  const status = Number(req.body.status);
  const payment = await prisma.payment.findUnique({ where: { id: req.params.id } });
  if (!payment) throw notFound('Payment not found');
  if (payment.status === PaymentStatus.ACCEPTED) throw badRequest('Payment already accepted');
  await prisma.payment.update({ where: { id: payment.id }, data: { status } });
  await refreshClientDenormalized(payment.clientId);
  res.json({ ok: true });
}));

// POST /admin/payments/set-request-status
router.post('/set-request-status', requireAdmin('PAYMENT', 2), wrap(async (req, res) => {
  const status = Number(req.body.status);
  const request = await prisma.clientRequest.findUnique({ where: { id: req.body.request }, include: { transaction: true } });
  if (!request) throw notFound('Request not found');
  await prisma.clientRequest.update({ where: { id: request.id }, data: { status } });
  if (status === RequestStatus.REJECTED && request.transaction) {
    await prisma.transaction.update({ where: { id: request.transaction.id }, data: { cancelled: true } });
  }
  await refreshClientDenormalized(request.clientId);
  res.json({ ok: true });
}));

export default router;
