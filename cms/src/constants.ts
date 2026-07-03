export const PERMISSION_KEYS: { key: string; label: string }[] = [
  { key: 'USER_DATA', label: 'User data' },
  { key: 'PAYMENT', label: 'Payments' },
  { key: 'PROGRAM', label: 'Programs' },
  { key: 'BONUS', label: 'Bonuses' },
  { key: 'SETTINGS', label: 'Settings' },
  { key: 'TERMS', label: 'Regulations' },
  { key: 'FAQ', label: 'FAQ' },
  { key: 'STATISTICS', label: 'Statistics' },
  { key: 'NEWS', label: 'News' },
  { key: 'FILES', label: 'Files' },
  { key: 'USER_PARTNERSHIP', label: 'User partnership' },
];

export const PERMISSION_LEVELS: { value: number; label: string }[] = [
  { value: 0, label: 'None' },
  { value: 1, label: 'Read' },
  { value: 2, label: 'Write' },
];
