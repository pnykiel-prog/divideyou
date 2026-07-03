import { prisma } from '../lib/prisma.js';

// Recompute a draft purchase's price/subscription/blocked from base fees + attributes.
export async function recomputePurchaseTotals(purchaseId: string) {
  const purchase = await prisma.purchase.findUnique({
    where: { id: purchaseId },
    include: { program: true, location: true, attributes: true },
  });
  if (!purchase) return null;

  const base = purchase.isBonus ? purchase.program : purchase.location;
  let price = base?.entryFee ?? 0;
  let subscriptionFee = base?.subscriptionPrice ?? 0;
  let amountBlocked = base?.amountBlocked ?? 0;

  for (const a of purchase.attributes) {
    price += a.startFee * a.count;
    subscriptionFee += a.subscriptionPrice * a.count;
    amountBlocked += a.amountBlocked * a.count;
  }

  return prisma.purchase.update({
    where: { id: purchaseId },
    data: { price, subscriptionFee, amountBlocked },
    include: { program: true, location: { include: { program: true } }, attributes: true },
  });
}

// Months between two dates (whole months elapsed).
export function monthsBetween(from: Date, to: Date): number {
  return (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
}

export function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}
