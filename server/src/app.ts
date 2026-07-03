import express from 'express';
import cors from 'cors';
import { sendError, ApiError } from './lib/http.js';

import authRoutes from './routes/auth.routes.js';
import publicRoutes from './routes/public.routes.js';
import profileRoutes from './routes/client/profile.routes.js';
import catalogRoutes from './routes/client/catalog.routes.js';
import purchaseRoutes from './routes/client/purchase.routes.js';
import paymentRoutes from './routes/client/payments.routes.js';
import miscClientRoutes from './routes/client/misc.routes.js';

import adminUsers from './routes/admin/users.routes.js';
import adminPrograms from './routes/admin/programs.routes.js';
import adminLocations from './routes/admin/locations.routes.js';
import adminPayments from './routes/admin/payments.routes.js';
import adminContent from './routes/admin/content.routes.js';
import adminMisc from './routes/admin/misc.routes.js';
import bootstrapRoutes from './routes/bootstrap.routes.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));

app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'divideyou-api' }));
app.use('/api/bootstrap', bootstrapRoutes);

// Public + auth
app.use('/api', authRoutes);
app.use('/api', publicRoutes);
app.use('/api/admin', publicRoutes); // /api/admin/config

// Admin — mounted before the broad client routers so /api/admin/* matches
// here first (the client routers apply a blanket client guard to /api/*).
app.use('/api/admin/users', adminUsers);
app.use('/api/admin/programs', adminPrograms);
app.use('/api/admin/locations', adminLocations);
app.use('/api/admin/payments', adminPayments);
app.use('/api/admin', adminContent);
app.use('/api/admin', adminMisc);

// Client
app.use('/api/profile', profileRoutes);
app.use('/api/purchase', purchaseRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api', catalogRoutes);
app.use('/api', miscClientRoutes);

// 404 + error handler
app.use((_req, res) => res.status(404).json({ error: 'not_found', error_message: 'Route not found' }));
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  sendError(res, err instanceof ApiError ? err : err);
});

export default app;
