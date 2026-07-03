// Shared enums mirroring the legacy domain (see docs/DOMAIN.md).

// Money is stored as integers in minor units (×100).
export const MONEY_SCALE = 100;

export const UserType = { CLIENT: 1, ADMIN: 2, DELETED: 99 } as const;

export const BlockedStatus = {
  UNBLOCKED: 0,
  SUBSCRIPTION_UNPAID: 1,
  DEMO_EXPIRED: 2,
  BY_ADMIN: 3,
} as const;

export const ClientType = { PERSONAL: 1, BUSINESS: 2 } as const;

export const PaymentStatus = { INIT: 0, PENDING: 1, ACCEPTED: 2, REJECTED: 3 } as const;

export const PaymentType = {
  JR_PURCHASE: 1,
  ACCESS_FEE: 2,
  JR_PAYOUT: 10,
  COMMISSION_PAYOUT: 11,
  ACCESS_PAYOUT: 12,
} as const;

export const TransactionType = {
  ACCESS_FEE_PURCHASE: 1,
  JR_PURCHASE: 10,
  JR_PURCHASE_ONLINE: 11,
  PROGRAM_PURCHASE: 20,
  BONUS_PURCHASE: 21,
  ACCOUNT_DONATION: 30,
  REQUEST_DONATION: 31,
  SUBSCRIPTION_FEE: 40,
  PARTNERSHIP_COMMISSION_INCOME: 50,
  PAYOUT: 60,
  COMMISSION_PAYOUT: 61,
  REQUEST_PAYOUT: 62,
  FROZEN_RESOURCES: 70,
  CANCELLATION: 100,
  ACCESS_CANCELLATION: 101,
} as const;

export const RequestType = { CASH: 1, JR: 2, ACCESS_FEE: 3 } as const;
export const RequestStatus = { PENDING: 1, ACCEPTED: 2, REJECTED: 3 } as const;

export const ClientPaymentStatus = { SAFE: 1, WARNING: 2, DANGER: 3 } as const;

export const AttributeType = { LABEL: 1, CHECKBOX: 2, NUMERICAL: 3 } as const;

export const GdprType = {
  REGISTRATION: 1,
  ACCESS: 2,
  EDIT_DATA: 3,
  PARTNERSHIP: 4,
} as const;

export const TokenType = { EMAIL_CONFIRM: 1, PASSWORD_RESET: 2 } as const;

// Admin permission keys and levels.
export const PermissionLevel = { PREVIEW: 1, EDIT: 2 } as const;
export const PermissionKeys = [
  'USER_MANAGEMENT', 'USER_DATA', 'USER_PAYMENT', 'USER_PROGRAM', 'USER_PARTNERSHIP',
  'PAYMENT', 'PROGRAM', 'BONUS', 'LOCATION', 'SETTINGS', 'TERMS', 'FAQ',
  'STATISTICS', 'NEWS', 'FILES',
] as const;
