// Fixed-point money helpers. Everything is stored in minor units (integers).
import { MONEY_SCALE } from './constants.js';

export const toMinor = (major: number): number => Math.round(major * MONEY_SCALE);
export const toMajor = (minor: number): number => minor / MONEY_SCALE;

// Convert JR (minor units) to PLN (minor units) at a given exchange rate.
// rate = PLN minor units per 1 whole JR.
export function jrToPln(jrMinor: number, rateMinorPerJr: number): number {
  return Math.round((jrMinor / MONEY_SCALE) * rateMinorPerJr);
}

// Convert PLN (minor units) to JR (minor units).
export function plnToJr(plnMinor: number, rateMinorPerJr: number): number {
  if (rateMinorPerJr <= 0) return 0;
  return Math.round((plnMinor / rateMinorPerJr) * MONEY_SCALE);
}

export const money = { toMinor, toMajor, jrToPln, plnToJr };
