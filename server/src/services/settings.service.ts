import { prisma } from '../lib/prisma.js';

// The newest Settings row is the current configuration.
export async function currentSettings() {
  let s = await prisma.settings.findFirst({ orderBy: { createdAt: 'desc' } });
  if (!s) {
    s = await prisma.settings.create({ data: {} });
  }
  return s;
}
