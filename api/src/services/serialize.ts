import { toMajor } from '../lib/money.js';
import type { WalletModel } from './wallet.service.js';

const j = (s: string | null | undefined) => {
  try {
    return s ? JSON.parse(s) : [];
  } catch {
    return [];
  }
};

export function walletDto(w: WalletModel, rate: number) {
  const pln = (jr: number) => toMajor(Math.round((jr / 100) * rate));
  return {
    active: toMajor(w.active),
    pending: toMajor(w.pending),
    inactive: toMajor(w.inactive),
    toPayout: toMajor(w.toPayout),
    toCommissionPayout: toMajor(w.toCommissionPayout),
    blocked: toMajor(w.blocked),
    activePln: pln(w.active),
    toPayoutPln: pln(w.toPayout),
    toCommissionPayoutPln: pln(w.toCommissionPayout),
  };
}

export function clientDto(u: any) {
  const c = u.client ?? u;
  return {
    id: u.id ?? c.userId,
    clientId: c.id,
    email: u.email,
    type: c.type,
    firstName: c.firstName,
    lastName: c.lastName,
    companyName: c.companyName,
    personalNumber: c.personalNumber,
    taxNumber: c.taxNumber,
    address: c.address,
    postalCode: c.postalCode,
    city: c.city,
    phone: c.phone,
    bankAccountNumber: c.bankAccountNumber,
    accessFeePaid: c.accessFeePaid,
    demoExpired: c.demoExpired,
    detailDataConfirmed: c.detailDataConfirmed,
    anyProgramBought: c.anyProgramBought,
    partnerNumber: c.partnerNumber,
    partnershipTermAccepted: c.partnershipTermAccepted,
    paymentStatus: c.paymentStatus,
    roles: u.roles,
    createdAt: c.createdAt,
  };
}

export function programDto(p: any) {
  return {
    id: p.id,
    name: p.name,
    description: p.description,
    marketingText: p.marketingText,
    profilePhoto: p.profilePhoto,
    gallery: j(p.gallery),
    vip: p.vip,
    recommended: p.recommended,
    isBonus: p.isBonus,
    visible: p.visible,
    gracePeriod: p.gracePeriod,
    entryFee: toMajor(p.entryFee),
    subscriptionPrice: toMajor(p.subscriptionPrice),
    amountBlocked: toMajor(p.amountBlocked),
    minimalJrForView: toMajor(p.minimalJrForView),
    maxPurchases: p.maxPurchases,
    locationsCount: p._count?.locations ?? p.locations?.length,
    purchaseCount: p._count?.purchases,
    locations: p.locations?.map(locationDto),
    createdAt: p.createdAt,
  };
}

export function locationDto(l: any) {
  return {
    id: l.id,
    programId: l.programId,
    programName: l.program?.name,
    name: l.name,
    description: l.description,
    address: l.address,
    city: l.city,
    postalCode: l.postalCode,
    latitude: l.latitude,
    longitude: l.longitude,
    visible: l.visible,
    purchaseDuration: l.purchaseDuration,
    entryFee: toMajor(l.entryFee),
    subscriptionPrice: toMajor(l.subscriptionPrice),
    amountBlocked: toMajor(l.amountBlocked),
    maxPurchases: l.maxPurchases,
    gallery: j(l.gallery),
    createdAt: l.createdAt,
  };
}

export function attributeDto(a: any): any {
  return {
    id: a.id,
    name: a.name,
    description: a.description,
    type: a.type,
    isFinal: a.isFinal,
    isMultiselect: a.isMultiselect,
    isRequired: a.isRequired,
    startFee: toMajor(a.startFee),
    subscriptionPrice: toMajor(a.subscriptionPrice),
    amountBlocked: toMajor(a.amountBlocked),
    maxCount: a.maxCount,
    maxPurchases: a.maxPurchases,
    unit: a.unit,
    parentId: a.parentId,
    sortOrder: a.sortOrder,
    children: a.children?.map(attributeDto),
  };
}

export function purchaseDto(p: any) {
  return {
    id: p.id,
    isBonus: p.isBonus,
    program: p.program ? { id: p.program.id, name: p.program.name } : null,
    location: p.location
      ? { id: p.location.id, name: p.location.name, programName: p.location.program?.name }
      : null,
    price: toMajor(p.price),
    subscriptionFee: toMajor(p.subscriptionFee),
    amountBlocked: toMajor(p.amountBlocked),
    active: p.active,
    finished: p.finished,
    canceled: p.canceled,
    canceledByAdmin: p.canceledByAdmin,
    activationDate: p.activationDate,
    endDate: p.endDate,
    boughtDate: p.boughtDate,
    nextPaymentDate: p.nextPaymentDate,
    attributes: p.attributes?.map((a: any) => ({
      id: a.id,
      programAttributeId: a.programAttributeId,
      name: a.name,
      count: a.count,
      startFee: toMajor(a.startFee),
      subscriptionPrice: toMajor(a.subscriptionPrice),
      amountBlocked: toMajor(a.amountBlocked),
    })),
    createdAt: p.createdAt,
  };
}

export function transactionDto(t: any) {
  return {
    id: t.id,
    sequenceNumber: t.id,
    type: t.type,
    value: toMajor(t.value),
    plnEquivalent: toMajor(t.plnEquivalent),
    cancelled: t.cancelled,
    status: t.payment?.status,
    description: t.description,
    programName: t.purchase?.program?.name ?? t.purchase?.location?.name,
    timestamp: t.timestamp,
  };
}

export function paymentDto(p: any) {
  return {
    id: p.id,
    type: p.type,
    status: p.status,
    value: toMajor(p.value),
    client: p.client
      ? {
          id: p.client.id,
          userId: p.client.userId,
          firstName: p.client.firstName,
          lastName: p.client.lastName,
          companyName: p.client.companyName,
          email: p.client.user?.email,
        }
      : undefined,
    transaction: p.transaction ? { id: p.transaction.id, type: p.transaction.type, value: toMajor(p.transaction.value) } : undefined,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}

export function requestDto(r: any) {
  return {
    id: r.id,
    type: r.type,
    status: r.status,
    value: toMajor(r.value),
    plnEquivalent: toMajor(r.plnEquivalent),
    description: r.description,
    client: r.client
      ? {
          id: r.client.id,
          firstName: r.client.firstName,
          lastName: r.client.lastName,
          companyName: r.client.companyName,
          email: r.client.user?.email,
        }
      : undefined,
    createdAt: r.createdAt,
  };
}

export function newsDto(n: any) {
  return { id: n.id, slug: n.slug, title: n.title, content: n.content, photo: n.photo, createdAt: n.createdAt };
}

export function faqDto(f: any) {
  return { id: f.id, question: f.question, answer: f.answer, sortOrder: f.sortOrder, onDashboard: f.onDashboard };
}

export function settingsDto(s: any) {
  return {
    id: s.id,
    demoAccessDays: s.demoAccessDays,
    accessPrice: toMajor(s.accessPrice),
    jrExchangeRate: toMajor(s.jrExchangeRate),
    jrWithdrawalPeriodDays: s.jrWithdrawalPeriodDays,
    jrProtectionPeriodDays: s.jrProtectionPeriodDays,
    minJrForVip: toMajor(s.minJrForVip),
    minJrForBonus: toMajor(s.minJrForBonus),
    partnerTerm: s.partnerTerm,
    createdAt: s.createdAt,
  };
}
