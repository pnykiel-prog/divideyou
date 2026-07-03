// Vercel serverless entry — the Express app is served as a single function.
// All /api/* requests are rewritten here (see vercel.json). Local dev uses
// server/src/server.ts instead.
import app from '../server/src/app.js';

export default app;
