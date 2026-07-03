import { prisma } from '../lib/prisma.js';
import { TransactionType, PaymentStatus, RequestStatus, ClientPaymentStatus } from '../lib/constants.js';
import { currentSettings } from './settings.service.js';

export interface WalletModel {
  active: number;
  pending: number;
  inactive: number;
  toPayout: number;
  toCommissionPayout: number;
  blocked: number;
}

const empty = (): WalletModel => ({
  active: 0,
  pending: 0,
  inactive: 0,
  toPayout: 0,
  toCommissionPayout: 0,
  blocked: 0,
});

// Replays a client's transaction ledger into the 6 wallet buckets.
// Faithful port of the legacy WalletCalculator (see docs/DOMAIN.md).
export async function calculateWallet(clientId: string): Promise<WalletModel> {
  const settings = await currentSettings();
  const withdrawalDays = settings.jrWithdrawalPeriodDays;
  const now = new Date();

  const transactions = await prisma.transaction.findMany({
    where: { clientId, cancelled: false },
    orderBy: { id: 'asc' },
    include: {
      payment: true,
      purchase: true,
      clientRequest: true,
    },
  });

  const w = empty();

  const spend = (value: number) => {
    // Spending drains toPayout first, then active, then pending.
    if (w.toPayout > 0) {
      const spendableActive = w.active - w.toPayout;
      if (value > spendableActive) {
        const payoutToTake = value - spendableActive;
        w.toPayout = w.toPayout < payoutToTake ? 0 : w.toPayout - payoutToTake;
      }
    }
    if (value > w.active) {
      w.pending -= value - w.active;
      w.active = 0;
    } else {
      w.active -= value;
    }
    w.inactive += value;
  };

  const withdrawalEligible = (ts: Date) => {
    const eligibleAt = new Date(ts.getTime() + withdrawalDays * 24 * 3600 * 1000);
    return eligibleAt < now;
  };

  for (const t of transactions) {
    const value = t.value;
    switch (t.type) {
      case TransactionType.JR_PURCHASE:
      case TransactionType.JR_PURCHASE_ONLINE: {
        if (t.payment?.status === PaymentStatus.ACCEPTED) {
          w.active += value;
          if (withdrawalEligible(t.timestamp)) w.toPayout += value;
        } else if (t.payment?.status === PaymentStatus.PENDING) {
          w.pending += value;
        }
        break;
      }
      case TransactionType.PROGRAM_PURCHASE:
      case TransactionType.BONUS_PURCHASE:
      case TransactionType.SUBSCRIPTION_FEE:
        spend(value);
        break;
      case TransactionType.ACCOUNT_DONATION:
      case TransactionType.REQUEST_DONATION:
        w.active += value;
        break;
      case TransactionType.PARTNERSHIP_COMMISSION_INCOME:
        w.active += value;
        w.toCommissionPayout += value;
        break;
      case TransactionType.PAYOUT:
        if (t.payment?.status === PaymentStatus.ACCEPTED) {
          w.active -= value;
          w.toPayout -= value;
          w.inactive += value;
        } else if (t.payment?.status === PaymentStatus.PENDING) {
          w.active -= value;
          w.toPayout -= value;
        }
        break;
      case TransactionType.COMMISSION_PAYOUT:
        if (t.payment?.status === PaymentStatus.ACCEPTED) {
          w.toCommissionPayout -= value;
          w.toPayout += value;
        } else if (t.payment?.status === PaymentStatus.PENDING) {
          w.toCommissionPayout -= value;
        }
        break;
      case TransactionType.REQUEST_PAYOUT:
        if (t.clientRequest?.status === RequestStatus.ACCEPTED) {
          w.active -= value;
          w.inactive += value;
        } else if (t.clientRequest?.status === RequestStatus.PENDING) {
          w.active -= value;
        }
        break;
      case TransactionType.FROZEN_RESOURCES: {
        const p = t.purchase;
        const expired =
          !!p &&
          ((p.active && p.endDate != null && p.endDate < now) || p.finished || p.canceled);
        if (expired) w.active += value;
        else w.blocked += value;
        break;
      }
      default:
        break;
    }
  }

  // Clamp tiny negatives from ordering edge cases.
  for (const k of Object.keys(w) as (keyof WalletModel)[]) {
    if (Math.abs(w[k]) < 1e-6) w[k] = 0;
  }
  return w;
}

// Funds the client is missing to afford a given price (active + pending).
export async function missingFundsForPrice(clientId: string, price: number): Promise<number> {
  const w = await calculateWallet(clientId);
  const available = w.active + w.pending;
  const missing = price - available;
  return missing > 0 ? missing : 0;
}

// Recompute denormalized helper fields on the client record.
export async function refreshClientDenormalized(clientId: string) {
  const w = await calculateWallet(clientId);
  const activePurchases = await prisma.purchase.findMany({
    where: { userClientId: clientId, active: true },
    include: { program: true, location: { include: { program: true } } },
  });

  let programsCount = 0;
  let programsVipCount = 0;
  let bonusCount = 0;
  for (const p of activePurchases) {
    if (p.isBonus) bonusCount++;
    else {
      const vip = p.program?.vip || p.location?.program?.vip;
      if (vip) programsVipCount++;
      else programsCount++;
    }
  }

  // payment status: SAFE if >= 3 months of subscriptions covered, WARNING if >=1, else DANGER
  const monthlySub = activePurchases.reduce((s, p) => s + p.subscriptionFee, 0);
  let paymentStatus: number = ClientPaymentStatus.SAFE;
  if (monthlySub > 0) {
    if (w.active >= monthlySub * 3) paymentStatus = ClientPaymentStatus.SAFE;
    else if (w.active >= monthlySub) paymentStatus = ClientPaymentStatus.WARNING;
    else paymentStatus = ClientPaymentStatus.DANGER;
  }

  await prisma.userClient.update({
    where: { id: clientId },
    data: {
      jrActive: Math.round(w.active),
      jrNotActive: Math.round(w.inactive),
      programsCount,
      programsVipCount,
      bonusCount,
      paymentStatus,
    },
  });
  return w;
}
