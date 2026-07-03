export const PERMISSION_KEYS: { key: string; label: string }[] = [
  { key: 'USER_DATA', label: 'Dane użytkownika' },
  { key: 'PAYMENT', label: 'Płatności' },
  { key: 'PROGRAM', label: 'Programy' },
  { key: 'BONUS', label: 'Bonusy' },
  { key: 'SETTINGS', label: 'Ustawienia' },
  { key: 'TERMS', label: 'Regulaminy' },
  { key: 'FAQ', label: 'FAQ' },
  { key: 'STATISTICS', label: 'Statystyki' },
  { key: 'NEWS', label: 'Aktualności' },
  { key: 'FILES', label: 'Pliki' },
  { key: 'USER_PARTNERSHIP', label: 'Partnerstwo użytkownika' },
];

export const PERMISSION_LEVELS: { value: number; label: string }[] = [
  { value: 0, label: 'Brak' },
  { value: 1, label: 'Odczyt' },
  { value: 2, label: 'Zapis' },
];
