import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { wrap, forbidden } from '../lib/http.js';
import { runSeed } from '../../prisma/seed.js';

const router = Router();

// One-time demo-data bootstrap for a fresh (e.g. Neon) database.
// Guarded by SEED_SECRET. Safe to call repeatedly — it re-seeds only when asked.
//   GET/POST /api/bootstrap?secret=YOUR_SECRET[&force=1]
async function handler(req: any, res: any) {
  const secret = process.env.SEED_SECRET;
  if (!secret) throw forbidden('Bootstrap disabled: SEED_SECRET is not configured');
  const provided = req.query.secret || req.header('x-seed-secret');
  if (provided !== secret) throw forbidden('Invalid bootstrap secret');

  const existing = await prisma.user.count();
  const force = req.query.force === '1' || req.query.force === 'true';
  if (existing > 0 && !force) {
    return res.json({ ok: true, seeded: false, message: `Database already has ${existing} users. Pass force=1 to re-seed.` });
  }

  await runSeed(prisma);
  res.json({
    ok: true,
    seeded: true,
    accounts: {
      admin: 'admin@divideyou.test / Password1',
      partner: 'anna@divideyou.test / Password1',
      client: 'jan@divideyou.test / Password1',
      demo: 'demo@divideyou.test / Password1',
    },
  });
}

router.get('/', wrap(handler));
router.post('/', wrap(handler));

export default router;
