import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Built for production under the /cms path (served by Vercel at origin/cms).
// In dev it runs at the root of port 5174.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/cms/' : '/',
  plugins: [react()],
  server: { port: 5174, proxy: { '/api': 'http://localhost:4000' } },
}));
