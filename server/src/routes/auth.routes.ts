import { Router } from 'express';
import { randomBytes } from 'crypto';
import { prisma } from '../lib/prisma.js';
import { wrap, badRequest, unauthorized } from '../lib/http.js';
import {
  hashPassword,
  verifyPassword,
  generateAuthToken,
  bumpAuthSeq,
} from '../services/auth.service.js';
import { computeRoles } from '../services/auth.service.js';
import { UserType, BlockedStatus, TokenType, GdprType } from '../lib/constants.js';
import { clientDto } from '../services/serialize.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

const genPartnerNumber = () => {
  const year = new Date().getFullYear().toString().slice(2);
  return year + Math.floor(100000 + Math.random() * 900000).toString();
};

// POST /api/register — client self-registration
router.post(
  '/register',
  wrap(async (req, res) => {
    const { email, password, name, agreement, partnerNumber } = req.body;
    if (!email || !password) throw badRequest('E-mail i hasło są wymagane');
    if (!agreement) throw badRequest('Musisz zaakceptować regulamin rejestracji');
    const existing = await prisma.user.findUnique({ where: { email: String(email).toLowerCase() } });
    if (existing) throw badRequest('E-mail jest już zarejestrowany');

    let partnerOfId: string | null = null;
    if (partnerNumber) {
      const partner = await prisma.userClient.findUnique({ where: { partnerNumber: String(partnerNumber) } });
      if (partner) partnerOfId = partner.id;
    }

    const user = await prisma.user.create({
      data: {
        email: String(email).toLowerCase(),
        password: await hashPassword(password),
        type: UserType.CLIENT,
        emailConfirmed: true, // demo build: auto-confirm (legacy sent an email token)
        client: {
          create: {
            firstName: name || null,
            partnerOfId,
          },
        },
      },
      include: { client: true },
    });

    await prisma.gdprAgreement.create({
      data: { clientId: user.client!.id, type: GdprType.REGISTRATION, content: 'Zaakceptowano regulamin rejestracji' },
    });

    if (partnerOfId) {
      await prisma.invitation.updateMany({
        where: { clientId: partnerOfId, email: String(email).toLowerCase(), registered: false },
        data: { registered: true },
      });
    }

    res.json({ ok: true });
  })
);

// POST /api/login — client login
router.post(
  '/login',
  wrap(async (req, res) => {
    const user = await authenticate(req.body, UserType.CLIENT);
    const token = await issueToken(user);
    const fresh = await prisma.user.findUnique({
      where: { id: user.id },
      include: { client: true, admin: true },
    });
    res.json({
      user: clientDto({ ...clientPayload(fresh), roles: computeRoles(fresh) }),
      authToken: token,
      fileAccessToken: token,
    });
  })
);

// POST /api/admin/login — admin login
router.post(
  '/admin/login',
  wrap(async (req, res) => {
    const user = await authenticate(req.body, UserType.ADMIN);
    const token = await issueToken(user);
    const fresh = await prisma.user.findUnique({ where: { id: user.id }, include: { admin: true } });
    res.json({
      user: {
        id: fresh!.id,
        email: fresh!.email,
        name: fresh!.admin?.name,
        superAdmin: fresh!.admin?.superAdmin,
        permissions: JSON.parse(fresh!.admin?.permissions || '{}'),
        roles: computeRoles(fresh),
      },
      authToken: token,
      fileAccessToken: token,
    });
  })
);

// GET /api/logout & /api/admin/logout — invalidate token by bumping seq
router.get('/logout', requireAuth, wrap(async (req, res) => {
  await bumpAuthSeq(req.auth!.id);
  res.json({ ok: true });
}));
router.get('/admin/logout', requireAuth, wrap(async (req, res) => {
  await bumpAuthSeq(req.auth!.id);
  res.json({ ok: true });
}));

// Password recovery (demo: returns the token instead of emailing).
router.post('/password-recovery', wrap((req, res) => recovery(req, res, UserType.CLIENT)));
router.post('/admin/password-recovery', wrap((req, res) => recovery(req, res, UserType.ADMIN)));

router.post('/password-reset', wrap((req, res) => reset(req, res)));
router.post('/admin/password-reset', wrap((req, res) => reset(req, res)));

// GET /api/registration-rules — public registration terms
router.get(
  '/registration-rules',
  wrap(async (_req, res) => {
    const rules = await prisma.registrationRule.findMany({ orderBy: { sortOrder: 'asc' } });
    res.json(rules);
  })
);

// ---- helpers ----

function clientPayload(user: any) {
  return { ...user.client, userId: user.id, email: user.email, client: user.client };
}

async function authenticate(body: any, type: number) {
  const { email, password } = body;
  if (!email || !password) throw badRequest('E-mail i hasło są wymagane');
  const user = await prisma.user.findUnique({
    where: { email: String(email).toLowerCase() },
    include: { client: true, admin: true },
  });
  if (!user || user.type !== type) throw unauthorized('Nieprawidłowe dane logowania');
  if (!(await verifyPassword(password, user.password))) throw unauthorized('Nieprawidłowe dane logowania');
  if (type === UserType.CLIENT) {
    if (!user.emailConfirmed) throw unauthorized('E-mail nie został potwierdzony');
    if (user.blockedStatus === BlockedStatus.BY_ADMIN) throw unauthorized('Konto zablokowane');
  }
  return user;
}

async function issueToken(user: any) {
  const seq = await bumpAuthSeq(user.id);
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  return generateAuthToken({ id: user.id, authTokenSeq: seq, type: user.type });
}

async function recovery(req: any, res: any, type: number) {
  const { email } = req.body;
  const user = await prisma.user.findUnique({ where: { email: String(email || '').toLowerCase() } });
  if (!user || user.type !== type) return res.json({ ok: true }); // don't leak
  const token = randomBytes(24).toString('hex');
  await prisma.token.create({ data: { token, type: TokenType.PASSWORD_RESET, userId: user.id } });
  // Demo: expose token so reset can be tested without a mail server.
  res.json({ ok: true, token });
}

async function reset(req: any, res: any) {
  const { token, password } = req.body;
  if (!token || !password) throw badRequest('Token i hasło są wymagane');
  const record = await prisma.token.findUnique({ where: { token: String(token) } });
  if (!record || record.type !== TokenType.PASSWORD_RESET) throw badRequest('Nieprawidłowy token');
  await prisma.user.update({
    where: { id: record.userId },
    data: { password: await hashPassword(password), authTokenSeq: { increment: 1 } },
  });
  await prisma.token.delete({ where: { id: record.id } });
  res.json({ ok: true });
}

export { genPartnerNumber };
export default router;
