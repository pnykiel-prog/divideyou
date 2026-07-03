// Assembles the static output for Vercel:
//   front/dist  -> public/       (consumer app at /)
//   cms/dist    -> public/cms/   (admin app at /cms)
import { cp, rm, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';

const root = new URL('..', import.meta.url).pathname;
const publicDir = `${root}public`;

await rm(publicDir, { recursive: true, force: true });
await mkdir(publicDir, { recursive: true });

if (!existsSync(`${root}front/dist`)) throw new Error('front/dist not found — did front build run?');
await cp(`${root}front/dist`, publicDir, { recursive: true });

if (!existsSync(`${root}cms/dist`)) throw new Error('cms/dist not found — did cms build run?');
await cp(`${root}cms/dist`, `${publicDir}/cms`, { recursive: true });

console.log('Assembled public/ (front at /, cms at /cms).');
