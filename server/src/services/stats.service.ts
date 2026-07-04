import { prisma } from '../lib/prisma.js';

// ---------------------------------------------------------------------------
// Demographic derivation (PESEL → age / gender) and geography (city → region)
// ---------------------------------------------------------------------------

export function peselBirthdate(pesel?: string | null): Date | null {
  if (!pesel || !/^\d{11}$/.test(pesel)) return null;
  const y = +pesel.slice(0, 2);
  let m = +pesel.slice(2, 4);
  const d = +pesel.slice(4, 6);
  let century: number;
  if (m >= 1 && m <= 12) century = 1900;
  else if (m >= 21 && m <= 32) { century = 2000; m -= 20; }
  else if (m >= 41 && m <= 52) { century = 2100; m -= 40; }
  else if (m >= 61 && m <= 72) { century = 2200; m -= 60; }
  else if (m >= 81 && m <= 92) { century = 1800; m -= 80; }
  else return null;
  const dt = new Date(Date.UTC(century + y, m - 1, d));
  return dt.getUTCMonth() === m - 1 ? dt : null;
}

export function ageFromPesel(pesel?: string | null, now = new Date()): number | null {
  const bd = peselBirthdate(pesel);
  if (!bd) return null;
  let a = now.getUTCFullYear() - bd.getUTCFullYear();
  const mm = now.getUTCMonth() - bd.getUTCMonth();
  if (mm < 0 || (mm === 0 && now.getUTCDate() < bd.getUTCDate())) a--;
  return a >= 0 && a < 120 ? a : null;
}

export const AGE_GROUPS = ['18–24', '25–34', '35–44', '45–54', '55–64', '65+'];
export function ageGroupOf(pesel?: string | null): string | null {
  const a = ageFromPesel(pesel);
  if (a == null) return null;
  if (a < 25) return AGE_GROUPS[0];
  if (a < 35) return AGE_GROUPS[1];
  if (a < 45) return AGE_GROUPS[2];
  if (a < 55) return AGE_GROUPS[3];
  if (a < 65) return AGE_GROUPS[4];
  return AGE_GROUPS[5];
}

export function genderOf(pesel?: string | null): 'K' | 'M' | null {
  if (!pesel || !/^\d{11}$/.test(pesel)) return null;
  return +pesel[9] % 2 === 0 ? 'K' : 'M';
}

const CITY_REGION: Record<string, string> = {
  'Warszawa': 'mazowieckie', 'Kraków': 'małopolskie', 'Wrocław': 'dolnośląskie',
  'Poznań': 'wielkopolskie', 'Gdańsk': 'pomorskie', 'Gdynia': 'pomorskie',
  'Łódź': 'łódzkie', 'Katowice': 'śląskie', 'Szczecin': 'zachodniopomorskie',
  'Lublin': 'lubelskie', 'Bydgoszcz': 'kujawsko-pomorskie', 'Rzeszów': 'podkarpackie',
};
export const REGIONS = Array.from(new Set(Object.values(CITY_REGION))).sort();
export function regionOf(city?: string | null): string {
  return (city && CITY_REGION[city]) || 'inne';
}

// ---------------------------------------------------------------------------
// Date bucketing
// ---------------------------------------------------------------------------
export type Granularity = 'day' | 'week' | 'month' | 'quarter' | 'year';

function startOfWeek(d: Date): Date {
  const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = (x.getUTCDay() + 6) % 7; // Monday = 0
  x.setUTCDate(x.getUTCDate() - day);
  return x;
}

export function bucketKey(d: Date, g: Granularity): string {
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth();
  switch (g) {
    case 'day': return d.toISOString().slice(0, 10);
    case 'week': return startOfWeek(d).toISOString().slice(0, 10);
    case 'month': return `${y}-${String(m + 1).padStart(2, '0')}`;
    case 'quarter': return `${y}-Q${Math.floor(m / 3) + 1}`;
    case 'year': return String(y);
  }
}

// All bucket keys between from..to inclusive (for zero-filling continuous series).
export function bucketRange(from: Date, to: Date, g: Granularity): string[] {
  const keys: string[] = [];
  const cur = new Date(from);
  let guard = 0;
  while (cur <= to && guard++ < 4000) {
    keys.push(bucketKey(cur, g));
    if (g === 'day') cur.setUTCDate(cur.getUTCDate() + 1);
    else if (g === 'week') cur.setUTCDate(cur.getUTCDate() + 7);
    else if (g === 'month') cur.setUTCMonth(cur.getUTCMonth() + 1);
    else if (g === 'quarter') cur.setUTCMonth(cur.getUTCMonth() + 3);
    else cur.setUTCFullYear(cur.getUTCFullYear() + 1);
  }
  return Array.from(new Set(keys));
}

// ---------------------------------------------------------------------------
// Shared filter model
// ---------------------------------------------------------------------------
export interface Filters {
  from: Date;
  to: Date;
  granularity: Granularity;
  segment?: 'private' | 'business';
  ageGroup?: string;
  gender?: 'K' | 'M';
  region?: string;
  city?: string;
  source?: 'organic' | 'partner';
  paymentStatus?: number;
}

export function parseFilters(body: any): Filters {
  const now = new Date();
  const to = body?.to ? new Date(body.to) : now;
  const from = body?.from ? new Date(body.from) : new Date(to.getTime() - 365 * 86400000);
  const g = ['day', 'week', 'month', 'quarter', 'year'].includes(body?.granularity) ? body.granularity : 'month';
  return {
    from, to, granularity: g,
    segment: body?.segment === 'private' || body?.segment === 'business' ? body.segment : undefined,
    ageGroup: body?.ageGroup || undefined,
    gender: body?.gender === 'K' || body?.gender === 'M' ? body.gender : undefined,
    region: body?.region || undefined,
    city: body?.city || undefined,
    source: body?.source === 'organic' || body?.source === 'partner' ? body.source : undefined,
    paymentStatus: body?.paymentStatus ? Number(body.paymentStatus) : undefined,
  };
}

// Resolve the set of client ids matching client-level filters.
// Returns null when no client-level filter is active (meaning "all clients").
export async function resolveClientIds(f: Filters, opts: { ignoreDemographic?: boolean } = {}): Promise<Set<string> | null> {
  const demographic = !opts.ignoreDemographic && (f.ageGroup || f.gender || f.region);
  const sqlFilter = f.segment || f.city || f.source || f.paymentStatus;
  if (!demographic && !sqlFilter) return null;

  const where: any = { user: { type: 1 } };
  if (f.segment === 'private') where.type = 1;
  if (f.segment === 'business') where.type = 2;
  if (f.city) where.city = f.city;
  if (f.paymentStatus) where.paymentStatus = f.paymentStatus;
  if (f.source === 'partner') where.partnerOfId = { not: null };
  if (f.source === 'organic') where.partnerOfId = null;

  const clients = await prisma.userClient.findMany({ where, select: { id: true, personalNumber: true, city: true } });
  let list = clients;
  if (!opts.ignoreDemographic) {
    if (f.region) list = list.filter((c) => regionOf(c.city) === f.region);
    if (f.ageGroup) list = list.filter((c) => ageGroupOf(c.personalNumber) === f.ageGroup);
    if (f.gender) list = list.filter((c) => genderOf(c.personalNumber) === f.gender);
  }
  return new Set(list.map((c) => c.id));
}

// Convenience: group rows {date,value} into a continuous zero-filled series.
export function toSeries(rows: { date: Date; value: number }[], f: Filters): { date: string; value: number }[] {
  const map = new Map<string, number>();
  for (const r of rows) {
    const k = bucketKey(r.date, f.granularity);
    map.set(k, (map.get(k) || 0) + r.value);
  }
  return bucketRange(f.from, f.to, f.granularity).map((k) => ({ date: k, value: +(map.get(k) || 0).toFixed(2) }));
}

export const M = 100; // money scale (minor units)
