// Local development entry point — starts an HTTP listener.
// On Vercel the app is imported directly as a serverless function (see /api/index.ts).
import app from './app.js';

const port = Number(process.env.PORT) || 4000;
app.listen(port, () => console.log(`DivideYou API listening on http://localhost:${port}`));
