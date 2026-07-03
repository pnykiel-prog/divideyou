import { Router } from 'express';
import { wrap } from '../lib/http.js';
import { currentSettings } from '../services/settings.service.js';
import { settingsDto } from '../services/serialize.js';
import { toMajor } from '../lib/money.js';

const router = Router();

// GET /api/config — public runtime config
router.get(
  '/config',
  wrap(async (_req, res) => {
    const s = await currentSettings();
    res.json({
      currencyMultiplier: 100,
      jrExchangeRate: toMajor(s.jrExchangeRate),
      bankAccountNumber: 'PL00 0000 0000 0000 0000 0000 0000',
      frontUrl: process.env.FRONT_URL,
    });
  })
);

// GET /api/settings — latest global settings
router.get(
  '/settings',
  wrap(async (_req, res) => {
    const s = await currentSettings();
    res.json(settingsDto(s));
  })
);

export default router;
