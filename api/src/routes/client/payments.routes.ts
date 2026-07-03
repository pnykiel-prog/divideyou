import { Router } from 'express';
import { prisma } from '../../lib/prisma.js';
import { wrap, badRequest, notFound } from '../../lib/http.js';
import { requireClient } from '../../middleware/auth.js';
import { currentSettings } from '../../services/settings.service.js';
import { calculateWallet, refreshClientDenormalized } from '../../services/wallet.service.js';
import { logTransaction, payPartnershipCommission } from '../../services/ledger.service.js';
import { toMinor, plnToJr, jrToPln } from '../../lib/money.js';
import {
  PaymentType,
  PaymentStatus,
  TransactionType,
  RequestType,
  RequestStatus,
} from '../../lib/constants.js';

const router = Router();
router.use(requireClient('ROLE_CLIENT', 'ROLE_ONLY_PAY'));

const cid = (req: any) => req.auth.client.id as string;

// POST /payments/purchase-jr — buy JR with money
router.post('/purchase-jr', wrap(async (req, res) => {
  const jr = toMinor(Number(req.body.jr ?? req.body.value ?? 0));
  if (jr <= 0) throw badRequest('Invalid JR amount');
  const s = await currentSettings();
  const pln = jrToPln(jr, s.jrExchangeRate);

  const payment = await prisma.payment.create({
    data: { clientId: cid(req), type: PaymentType.JR_PURCHASE, status: PaymentStatus.PENDING, value: pln },
  });
  const tx = await logTransaction({
    clientId: cid(req),
    type: TransactionType.JR_PURCHASE,
    value: jr,
    paymentId: payment.id,
    description: 'JR top-up',
  });

  // Pay upline commission immediately (legacy behaviour).
  await payPartnershipCommission(req.auth.client, jr, tx.id);
  await refreshClientDenormalized(cid(req));
  res.json({ paymentId: payment.id, transactionId: tx.id, pln: pln / 100 });
}));

// POST /payments/access-fee — pay one-time platform access fee
router.post('/access-fee', wrap(async (req, res) => {
  if (req.auth.client.accessFeePaid) throw badRequest('Access fee already paid');
  const s = await currentSettings();
  const payment = await prisma.payment.create({
    data: { clientId: cid(req), type: PaymentType.ACCESS_FEE, status: PaymentStatus.ACCEPTED, value: s.accessPrice },
  });
  await logTransaction({
    clientId: cid(req),
    type: TransactionType.ACCESS_FEE_PURCHASE,
    value: 0,
    paymentId: payment.id,
    description: 'Platform access fee',
  });
  await prisma.userClient.update({
    where: { id: cid(req) },
    data: { accessFeePaid: true, accessPaidDate: new Date(), demoExpired: false },
  });
  await prisma.user.update({ where: { id: req.auth.id }, data: { blockedStatus: 0 } });
  res.json({ ok: true });
}));

// POST /payments/payout-jr — withdraw JR to money
router.post('/payout-jr', wrap(async (req, res) => {
  const jr = toMinor(Number(req.body.jr ?? req.body.value ?? 0));
  if (jr <= 0) throw badRequest('Invalid amount');
  const w = await calculateWallet(cid(req));
  if (w.toPayout < jr) throw badRequest('Amount exceeds funds available for payout');
  const s = await currentSettings();
  const pln = jrToPln(jr, s.jrExchangeRate);
  const payment = await prisma.payment.create({
    data: { clientId: cid(req), type: PaymentType.JR_PAYOUT, status: PaymentStatus.PENDING, value: pln },
  });
  await logTransaction({
    clientId: cid(req),
    type: TransactionType.PAYOUT,
    value: jr,
    paymentId: payment.id,
    description: 'JR payout',
  });
  res.json({ ok: true, paymentId: payment.id });
}));

// POST /payments/payout-commissions — commission payout (business clients)
router.post('/payout-commissions', wrap(async (req, res) => {
  if (req.auth.client.type !== 2) throw badRequest('Commission payout is available for company accounts only');
  const jr = toMinor(Number(req.body.jr ?? req.body.value ?? 0));
  if (jr <= 0) throw badRequest('Invalid amount');
  const w = await calculateWallet(cid(req));
  if (w.toCommissionPayout < jr) throw badRequest('Amount exceeds commission funds');
  const s = await currentSettings();
  const pln = jrToPln(jr, s.jrExchangeRate);
  const payment = await prisma.payment.create({
    data: { clientId: cid(req), type: PaymentType.COMMISSION_PAYOUT, status: PaymentStatus.PENDING, value: pln },
  });
  await logTransaction({
    clientId: cid(req),
    type: TransactionType.COMMISSION_PAYOUT,
    value: jr,
    paymentId: payment.id,
    description: 'Commission payout',
  });
  res.json({ ok: true, paymentId: payment.id });
}));

// POST /payments/cashback — request a return (money or JR)
router.post('/cashback', wrap(async (req, res) => {
  const type = Number(req.body.type) || RequestType.CASH;
  const jr = toMinor(Number(req.body.value ?? 0));
  if (jr <= 0) throw badRequest('Invalid amount');
  const w = await calculateWallet(cid(req));
  if (w.active < jr) throw badRequest('Amount exceeds active funds');
  if (type === RequestType.CASH && !req.auth.client.bankAccountNumber) {
    throw badRequest('Add a bank account number before requesting a cash return');
  }
  const s = await currentSettings();
  const request = await prisma.clientRequest.create({
    data: {
      clientId: cid(req),
      type,
      status: RequestStatus.PENDING,
      value: jr,
      plnEquivalent: jrToPln(jr, s.jrExchangeRate),
      description: req.body.description || '',
    },
  });
  await logTransaction({
    clientId: cid(req),
    type: TransactionType.REQUEST_PAYOUT,
    value: jr,
    clientRequestId: request.id,
    description: 'Return request',
  });
  res.json({ ok: true, requestId: request.id });
}));

// POST /payments/cashback-cancel — discard a pending return request
router.post('/cashback-cancel', wrap(async (req, res) => {
  const request = await prisma.clientRequest.findFirst({
    where: { id: req.body.id, clientId: cid(req), status: RequestStatus.PENDING },
    include: { transaction: true },
  });
  if (!request) throw notFound('Request not found');
  await prisma.clientRequest.update({ where: { id: request.id }, data: { status: RequestStatus.REJECTED } });
  if (request.transaction) {
    await prisma.transaction.update({ where: { id: request.transaction.id }, data: { cancelled: true } });
  }
  await refreshClientDenormalized(cid(req));
  res.json({ ok: true });
}));

// GET /payments/check/:id — payment status
router.get('/check/:id', wrap(async (req, res) => {
  const payment = await prisma.payment.findFirst({ where: { id: req.params.id, clientId: cid(req) } });
  if (!payment) throw notFound('Payment not found');
  res.json({ id: payment.id, status: payment.status });
}));

export default router;
