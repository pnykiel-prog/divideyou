import { Router } from 'express';
import { prisma } from '../../lib/prisma.js';
import { wrap, badRequest, notFound, pagination } from '../../lib/http.js';
import { requireAdmin, requireSuperAdmin } from '../../middleware/auth.js';
import { hashPassword } from '../../services/auth.service.js';
import { calculateWallet, refreshClientDenormalized } from '../../services/wallet.service.js';
import { logTransaction } from '../../services/ledger.service.js';
import { currentSettings } from '../../services/settings.service.js';
import { walletDto, transactionDto, purchaseDto } from '../../services/serialize.js';
import { toMinor } from '../../lib/money.js';
import {
  UserType,
  BlockedStatus,
  ClientType,
  TransactionType,
  PaymentType,
  PaymentStatus,
} from '../../lib/constants.js';

const router = Router();

// GET /admin/users — list clients with filters
router.get('/', requireAdmin('USER_DATA'), wrap(async (req, res) => {
  const { skip, take, page, perPage } = pagination(req.query);
  const q = (req.query.query as string) || '';
  const where: any = { type: UserType.CLIENT };
  if (q) {
    where.OR = [
      { email: { contains: q } },
      { client: { firstName: { contains: q } } },
      { client: { lastName: { contains: q } } },
      { client: { companyName: { contains: q } } },
    ];
  }
  if (req.query.accountType) where.client = { ...(where.client || {}), type: Number(req.query.accountType) };
  const [users, total] = await Promise.all([
    prisma.user.findMany({ where, include: { client: true }, orderBy: { createdAt: 'desc' }, skip, take }),
    prisma.user.count({ where }),
  ]);
  res.json({
    items: users.map((u) => ({
      id: u.id,
      email: u.email,
      firstName: u.client?.firstName,
      lastName: u.client?.lastName,
      companyName: u.client?.companyName,
      personalNumber: u.client?.personalNumber,
      taxNumber: u.client?.taxNumber,
      type: u.client?.type,
      jrActive: (u.client?.jrActive ?? 0) / 100,
      onlyPay: u.onlyPay,
      paymentStatus: u.client?.paymentStatus,
      programsCount: u.client?.programsCount,
      blockedStatus: u.blockedStatus,
      accessFeePaid: u.client?.accessFeePaid,
      createdAt: u.createdAt,
      lastLoginAt: u.lastLoginAt,
    })),
    total, page, perPage,
  });
}));

// GET /admin/users/admins — list CMS admins
router.get('/admins', requireAdmin('USER_DATA'), wrap(async (_req, res) => {
  const admins = await prisma.user.findMany({ where: { type: UserType.ADMIN }, include: { admin: true } });
  res.json(admins.map((u) => ({
    id: u.id,
    email: u.email,
    name: u.admin?.name,
    phone: u.admin?.phone,
    superAdmin: u.admin?.superAdmin,
    permissions: JSON.parse(u.admin?.permissions || '{}'),
    lastLoginAt: u.lastLoginAt,
  })));
}));

// POST /admin/users — create client or admin (super admin only)
router.post('/', requireSuperAdmin, wrap(async (req, res) => {
  const b = req.body;
  const email = String(b.email || '').toLowerCase();
  if (!email || !b.password) throw badRequest('E-mail i hasło są wymagane');
  if (await prisma.user.findUnique({ where: { email } })) throw badRequest('E-mail już istnieje');
  const isAdmin = Number(b.type) === UserType.ADMIN || b.accountType === 'cms';

  const user = await prisma.user.create({
    data: {
      email,
      password: await hashPassword(b.password),
      type: isAdmin ? UserType.ADMIN : UserType.CLIENT,
      emailConfirmed: true,
      ...(isAdmin
        ? { admin: { create: { name: b.name || email, phone: b.phone, permissions: JSON.stringify(b.permissions || {}) } } }
        : {
            client: {
              create: {
                type: Number(b.clientType) || ClientType.PERSONAL,
                firstName: b.firstName,
                lastName: b.lastName,
                companyName: b.companyName,
                personalNumber: b.personalNumber,
                taxNumber: b.taxNumber,
                address: b.address,
                postalCode: b.postalCode,
                city: b.city,
                phone: b.phone,
              },
            },
          }),
    },
  });
  res.json({ id: user.id });
}));

// GET /admin/users/:id — user detail + wallet
router.get('/:id', requireAdmin('USER_DATA'), wrap(async (req, res) => {
  const u = await prisma.user.findUnique({
    where: { id: req.params.id },
    include: { client: { include: { partnerOf: true } }, admin: true },
  });
  if (!u) throw notFound('Nie znaleziono użytkownika');
  const s = await currentSettings();
  let wallet = null;
  if (u.client) wallet = walletDto(await calculateWallet(u.client.id), s.jrExchangeRate);
  res.json({
    id: u.id,
    email: u.email,
    type: u.type,
    emailConfirmed: u.emailConfirmed,
    blockedStatus: u.blockedStatus,
    onlyPay: u.onlyPay,
    lastLoginAt: u.lastLoginAt,
    createdAt: u.createdAt,
    client: u.client && {
      id: u.client.id,
      type: u.client.type,
      firstName: u.client.firstName,
      lastName: u.client.lastName,
      companyName: u.client.companyName,
      personalNumber: u.client.personalNumber,
      taxNumber: u.client.taxNumber,
      address: u.client.address,
      postalCode: u.client.postalCode,
      city: u.client.city,
      phone: u.client.phone,
      bankAccountNumber: u.client.bankAccountNumber,
      accessFeePaid: u.client.accessFeePaid,
      partnerNumber: u.client.partnerNumber,
      partnershipTermAccepted: u.client.partnershipTermAccepted,
      customPartnershipCommission: u.client.customPartnershipCommission,
      partnershipCommissionValue: u.client.partnershipCommissionValue,
      partnerOf: u.client.partnerOf ? { id: u.client.partnerOf.id, partnerNumber: u.client.partnerOf.partnerNumber } : null,
    },
    admin: u.admin && {
      name: u.admin.name,
      phone: u.admin.phone,
      superAdmin: u.admin.superAdmin,
      permissions: JSON.parse(u.admin.permissions || '{}'),
    },
    wallet,
  });
}));

// PATCH /admin/users/:id/user-data
router.patch('/:id/user-data', requireAdmin('USER_DATA', 2), wrap(async (req, res) => {
  const u = await prisma.user.findUnique({ where: { id: req.params.id }, include: { client: true, admin: true } });
  if (!u) throw notFound('Nie znaleziono użytkownika');
  const b = req.body;
  if (u.client) {
    await prisma.userClient.update({
      where: { id: u.client.id },
      data: {
        type: b.type != null ? Number(b.type) : undefined,
        firstName: b.firstName, lastName: b.lastName, companyName: b.companyName,
        personalNumber: b.personalNumber, taxNumber: b.taxNumber, address: b.address,
        postalCode: b.postalCode, city: b.city, phone: b.phone, bankAccountNumber: b.bankAccountNumber,
      },
    });
  } else if (u.admin) {
    await prisma.userAdmin.update({
      where: { id: u.admin.id },
      data: {
        name: b.name ?? undefined,
        phone: b.phone ?? undefined,
        permissions: b.permissions ? JSON.stringify(b.permissions) : undefined,
      },
    });
  }
  res.json({ ok: true });
}));

// PATCH /admin/users/:id/block — block/unblock
router.patch('/:id/block', requireAdmin('USER_DATA', 2), wrap(async (req, res) => {
  const status = Number(req.body.status);
  await prisma.user.update({
    where: { id: req.params.id },
    data: { blockedStatus: status ? BlockedStatus.BY_ADMIN : BlockedStatus.UNBLOCKED, authTokenSeq: { increment: 1 } },
  });
  res.json({ ok: true });
}));

// DELETE /admin/users/:id/delete
router.delete('/:id/delete', requireAdmin('USER_DATA', 2), wrap(async (req, res) => {
  await prisma.user.update({
    where: { id: req.params.id },
    data: { type: UserType.DELETED, blockedStatus: BlockedStatus.BY_ADMIN, authTokenSeq: { increment: 1 } },
  });
  res.json({ ok: true });
}));

// PATCH /admin/users/:id/confirm-email
router.patch('/:id/confirm-email', requireAdmin('USER_DATA', 2), wrap(async (req, res) => {
  await prisma.user.update({ where: { id: req.params.id }, data: { emailConfirmed: true } });
  res.json({ ok: true });
}));

// PATCH /admin/users/:id/confirm-full-access — grant access + charge fee
router.patch('/:id/confirm-full-access', requireAdmin('USER_DATA', 2), wrap(async (req, res) => {
  const u = await prisma.user.findUnique({ where: { id: req.params.id }, include: { client: true } });
  if (!u?.client) throw notFound('Nie znaleziono klienta');
  const s = await currentSettings();
  const payment = await prisma.payment.create({
    data: { clientId: u.client.id, type: PaymentType.ACCESS_FEE, status: PaymentStatus.ACCEPTED, value: s.accessPrice },
  });
  await logTransaction({ clientId: u.client.id, type: TransactionType.ACCESS_FEE_PURCHASE, value: 0, paymentId: payment.id, description: 'Dostęp przyznany przez administratora' });
  await prisma.userClient.update({ where: { id: u.client.id }, data: { accessFeePaid: true, accessPaidDate: new Date(), demoExpired: false } });
  await prisma.user.update({ where: { id: u.id }, data: { blockedStatus: 0 } });
  res.json({ ok: true });
}));

// PATCH /admin/users/:id/allow-only-pay
router.patch('/:id/allow-only-pay', requireAdmin('USER_DATA', 2), wrap(async (req, res) => {
  const u = await prisma.user.findUnique({ where: { id: req.params.id } });
  await prisma.user.update({ where: { id: req.params.id }, data: { onlyPay: !u?.onlyPay } });
  res.json({ ok: true });
}));

// POST /admin/users/:id/account-donation — credit JR
router.post('/:id/account-donation', requireAdmin('USER_PAYMENT', 2), wrap(async (req, res) => {
  const u = await prisma.user.findUnique({ where: { id: req.params.id }, include: { client: true } });
  if (!u?.client) throw notFound('Nie znaleziono klienta');
  const jr = toMinor(Number(req.body.value || 0));
  if (jr <= 0) throw badRequest('Nieprawidłowa kwota');
  await logTransaction({ clientId: u.client.id, type: TransactionType.ACCOUNT_DONATION, value: jr, description: 'Uznanie JR przez administratora' });
  await refreshClientDenormalized(u.client.id);
  res.json({ ok: true });
}));

// PATCH /admin/users/:id/assign-partner
router.patch('/:id/assign-partner', requireAdmin('USER_PARTNERSHIP', 2), wrap(async (req, res) => {
  const u = await prisma.user.findUnique({ where: { id: req.params.id }, include: { client: true } });
  if (!u?.client) throw notFound('Nie znaleziono klienta');
  const partnerNumber = String(req.body.partner || '');
  const partner = partnerNumber ? await prisma.userClient.findUnique({ where: { partnerNumber } }) : null;
  await prisma.userClient.update({ where: { id: u.client.id }, data: { partnerOfId: partner?.id ?? null } });
  res.json({ ok: true });
}));

// GET /admin/users/:id/transactions
router.get('/:id/transactions', requireAdmin('USER_PAYMENT'), wrap(async (req, res) => {
  const u = await prisma.user.findUnique({ where: { id: req.params.id }, include: { client: true } });
  if (!u?.client) throw notFound('Nie znaleziono klienta');
  const txs = await prisma.transaction.findMany({
    where: { clientId: u.client.id },
    orderBy: { id: 'desc' },
    include: { payment: true, purchase: { include: { program: true, location: true } } },
  });
  res.json(txs.map(transactionDto));
}));

// GET /admin/users/:id/locations (purchased programs), /bonuses
router.get('/:id/locations', requireAdmin('USER_PROGRAM'), wrap((req, res) => userPurchases(req, res, false)));
router.get('/:id/bonuses', requireAdmin('USER_PROGRAM'), wrap((req, res) => userPurchases(req, res, true)));

async function userPurchases(req: any, res: any, bonus: boolean) {
  const u = await prisma.user.findUnique({ where: { id: req.params.id }, include: { client: true } });
  if (!u?.client) throw notFound('Nie znaleziono klienta');
  const purchases = await prisma.purchase.findMany({
    where: { userClientId: u.client.id, isBonus: bonus },
    include: { program: true, location: { include: { program: true } }, attributes: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json(purchases.map(purchaseDto));
}

// Commission thresholds
router.get('/:id/list-commission-threshold', requireAdmin('USER_PARTNERSHIP'), wrap(async (req, res) => {
  const u = await prisma.user.findUnique({ where: { id: req.params.id }, include: { client: true } });
  if (!u?.client) throw notFound('Nie znaleziono klienta');
  const list = await prisma.partnershipCommissionThreshold.findMany({ where: { clientId: u.client.id }, orderBy: { lowLimit: 'asc' } });
  res.json({ custom: u.client.customPartnershipCommission, base: u.client.partnershipCommissionValue, thresholds: list });
}));

router.post('/:id/set-custom-commission', requireAdmin('USER_PARTNERSHIP', 2), wrap(async (req, res) => {
  const u = await prisma.user.findUnique({ where: { id: req.params.id }, include: { client: true } });
  if (!u?.client) throw notFound('Nie znaleziono klienta');
  await prisma.userClient.update({
    where: { id: u.client.id },
    data: { customPartnershipCommission: !!req.body.custom, partnershipCommissionValue: Number(req.body.commission) || 0 },
  });
  res.json({ ok: true });
}));

router.post('/:id/add-commission-threshold', requireAdmin('USER_PARTNERSHIP', 2), wrap(async (req, res) => {
  const u = await prisma.user.findUnique({ where: { id: req.params.id }, include: { client: true } });
  if (!u?.client) throw notFound('Nie znaleziono klienta');
  await prisma.partnershipCommissionThreshold.create({
    data: { clientId: u.client.id, lowLimit: Number(req.body.min) || 0, value: Number(req.body.value) || 0 },
  });
  res.json({ ok: true });
}));

router.post('/:id/remove-commission-threshold', requireAdmin('USER_PARTNERSHIP', 2), wrap(async (req, res) => {
  await prisma.partnershipCommissionThreshold.deleteMany({ where: { id: req.body.id } });
  res.json({ ok: true });
}));

export default router;
