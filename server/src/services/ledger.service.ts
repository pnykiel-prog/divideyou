import { prisma } from '../lib/prisma.js';
import { TransactionType, RequestStatus } from '../lib/constants.js';
import { jrToPln } from '../lib/money.js';
import { currentSettings } from './settings.service.js';

// Commission percentage for a partner based on their downline size.
// Personal thresholds override globals; picks the highest tier the partner qualifies for.
export async function commissionPercent(partner: {
  id: string;
  customPartnershipCommission: boolean;
  partnershipCommissionValue: number;
}): Promise<number> {
  const partnersCount = await prisma.userClient.count({ where: { partnerOfId: partner.id } });

  if (partner.customPartnershipCommission) {
    const personal = await prisma.partnershipCommissionThreshold.findMany({
      where: { clientId: partner.id },
      orderBy: { lowLimit: 'desc' },
    });
    const tier = personal.find((t) => partnersCount >= t.lowLimit);
    return partner.partnershipCommissionValue + (tier?.value ?? 0);
  }

  const globals = await prisma.partnershipCommissionThreshold.findMany({
    where: { global: true },
    orderBy: { lowLimit: 'desc' },
  });
  const tier = globals.find((t) => partnersCount >= t.lowLimit);
  return tier?.value ?? 0;
}

interface LogArgs {
  clientId: string;
  type: number;
  value: number; // JR minor units
  paymentId?: string;
  purchaseId?: string;
  partnerId?: string;
  clientRequestId?: string;
  subscriptionMonths?: number;
  description?: string;
}

export async function logTransaction(args: LogArgs) {
  const settings = await currentSettings();
  const plnEquivalent = jrToPln(args.value, settings.jrExchangeRate);
  return prisma.transaction.create({
    data: {
      clientId: args.clientId,
      type: args.type,
      value: args.value,
      plnEquivalent,
      paymentId: args.paymentId,
      purchaseId: args.purchaseId,
      partnerId: args.partnerId,
      clientRequestId: args.clientRequestId,
      subscriptionMonths: args.subscriptionMonths ?? 0,
      description: args.description,
    },
  });
}

// When a client buys JR, credit their upline partner a commission.
export async function payPartnershipCommission(client: {
  id: string;
  partnerOfId: string | null;
}, jrValue: number, sourceTransactionId: number) {
  if (!client.partnerOfId) return;
  const partner = await prisma.userClient.findUnique({ where: { id: client.partnerOfId } });
  if (!partner) return;
  const percent = await commissionPercent(partner);
  if (percent <= 0) return;
  const commission = Math.round((jrValue * percent) / 100);
  if (commission <= 0) return;
  await logTransaction({
    clientId: partner.id,
    type: TransactionType.PARTNERSHIP_COMMISSION_INCOME,
    value: commission,
    partnerId: client.id,
    description: `Prowizja ${percent}% z doładowania partnera`,
  });
}
