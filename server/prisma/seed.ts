import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { refreshClientDenormalized } from '../src/services/wallet.service.js';

// Money scale: integers in minor units (×100). 1 JR = 1.00 PLN (rate below).
const M = 100;
const jr = (n: number) => Math.round(n * M);
const pln = (n: number) => Math.round(n * M);
const uid = () => (globalThis.crypto as Crypto).randomUUID();

// Deterministic PRNG so re-seeds are reproducible.
let _s = 0x9e3779b9;
const rnd = () => {
  _s |= 0; _s = (_s + 0x6d2b79f5) | 0;
  let t = Math.imul(_s ^ (_s >>> 15), 1 | _s);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const ri = (a: number, b: number) => a + Math.floor(rnd() * (b - a + 1));
const pick = <T>(arr: T[]): T => arr[Math.floor(rnd() * arr.length)];
const chance = (p: number) => rnd() < p;

// Timeline: the platform has been running for several years.
const START = new Date('2022-01-01T00:00:00Z').getTime();
const NOW = new Date('2026-06-25T00:00:00Z').getTime();
const DAY = 86400000;
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * DAY);
const addMonths = (d: Date, n: number) => { const x = new Date(d); x.setMonth(x.getMonth() + n); return x; };
const between = (a: number, b: number) => new Date(a + rnd() * (b - a));
const monthsBetween = (a: Date, b: Date) => Math.max(0, (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth()));

// ---- Polish data pools ----
const firstNamesM = ['Jan', 'Piotr', 'Andrzej', 'Krzysztof', 'Tomasz', 'Marcin', 'Paweł', 'Michał', 'Marek', 'Grzegorz', 'Jakub', 'Adam', 'Łukasz', 'Rafał', 'Mateusz', 'Kamil', 'Wojciech', 'Bartosz'];
const firstNamesF = ['Anna', 'Maria', 'Katarzyna', 'Małgorzata', 'Agnieszka', 'Barbara', 'Ewa', 'Magdalena', 'Joanna', 'Zofia', 'Julia', 'Aleksandra', 'Natalia', 'Karolina', 'Monika', 'Beata', 'Weronika'];
const lastNames = ['Nowak', 'Kowalski', 'Wiśniewski', 'Wójcik', 'Kowalczyk', 'Kamiński', 'Lewandowski', 'Zieliński', 'Szymański', 'Woźniak', 'Dąbrowski', 'Kozłowski', 'Jankowski', 'Mazur', 'Kwiatkowski', 'Krawczyk', 'Piotrowski', 'Grabowski', 'Zając', 'Pawłowski'];
const companyBrands = ['Solmar', 'Interbud', 'Nexus', 'Alfabet', 'Polinvest', 'Kredowy', 'Wektor', 'Horizon', 'Fenix', 'Granit', 'Optima', 'Merkury', 'Sfera', 'Tramwaj', 'Bastion'];
const companyForms = ['Sp. z o.o.', 'S.A.', 'Sp. j.', 'S.C.'];
const cities = [
  { city: 'Warszawa', postal: '00-001', lat: 52.2297, lng: 21.0122, streets: ['Marszałkowska', 'Puławska', 'Jana Pawła II', 'Grójecka'] },
  { city: 'Kraków', postal: '30-001', lat: 50.0614, lng: 19.9366, streets: ['Floriańska', 'Karmelicka', 'Długa', 'Grodzka'] },
  { city: 'Wrocław', postal: '50-001', lat: 51.1079, lng: 17.0385, streets: ['Świdnicka', 'Ruska', 'Legnicka', 'Powstańców Śląskich'] },
  { city: 'Poznań', postal: '61-001', lat: 52.4064, lng: 16.9252, streets: ['Półwiejska', 'Święty Marcin', 'Głogowska', 'Dąbrowskiego'] },
  { city: 'Gdańsk', postal: '80-001', lat: 54.352, lng: 18.6466, streets: ['Długa', 'Grunwaldzka', 'Rajska', 'Podwale Staromiejskie'] },
  { city: 'Łódź', postal: '90-001', lat: 51.7592, lng: 19.4560, streets: ['Piotrkowska', 'Narutowicza', 'Zielona', 'Kościuszki'] },
  { city: 'Katowice', postal: '40-001', lat: 50.2649, lng: 19.0238, streets: ['Mariacka', 'Warszawska', 'Mikołowska', '3 Maja'] },
  { city: 'Szczecin', postal: '70-001', lat: 53.4285, lng: 14.5528, streets: ['Wojska Polskiego', 'Jagiellońska', 'Bohaterów Warszawy'] },
  { city: 'Lublin', postal: '20-001', lat: 51.2465, lng: 22.5684, streets: ['Krakowskie Przedmieście', 'Narutowicza', 'Lipowa'] },
  { city: 'Bydgoszcz', postal: '85-001', lat: 53.1235, lng: 18.0084, streets: ['Gdańska', 'Długa', 'Focha'] },
  { city: 'Rzeszów', postal: '35-001', lat: 50.0412, lng: 21.9991, streets: ['3 Maja', 'Grunwaldzka', 'Lisa-Kuli'] },
  { city: 'Gdynia', postal: '81-001', lat: 54.5189, lng: 18.5305, streets: ['Świętojańska', 'Starowiejska', '10 Lutego'] },
];

type ProgTpl = { name: string; desc: string; mkt: string; entry: number; sub: number; blocked: number; grace: number; vip?: boolean; rec?: boolean; addon: string; unit: string };
const programTpls: ProgTpl[] = [
  { name: 'Karnet na siłownię FitLife', desc: 'Dostęp do ogólnokrajowej sieci klubów fitness z elastycznym planem oszczędzania.', mkt: 'Zadbaj o formę, oszczędzając.', entry: 50, sub: 20, blocked: 100, grace: 6, rec: true, addon: 'Sesje z trenerem', unit: 'sesje' },
  { name: 'Kursy językowe SpeakUp', desc: 'Ucz się nowego języka z planem oszczędnościowym w szkołach partnerskich.', mkt: 'Mów śmiało w nowym języku.', entry: 30, sub: 15, blocked: 60, grace: 3, addon: 'Lekcje indywidualne', unit: 'lekcje' },
  { name: 'Strefa Wellness & SPA', desc: 'Relaks i regeneracja w sieci ośrodków wellness w całej Polsce.', mkt: 'Zasłużony relaks w dobrej cenie.', entry: 60, sub: 25, blocked: 120, grace: 6, addon: 'Zabiegi SPA', unit: 'zabiegi' },
  { name: 'Coworking OfficeHub', desc: 'Elastyczny dostęp do przestrzeni coworkingowych i sal konferencyjnych.', mkt: 'Twoje biuro w każdym mieście.', entry: 40, sub: 30, blocked: 80, grace: 12, addon: 'Sale konferencyjne', unit: 'godziny' },
  { name: 'Szkoła jazdy DriveOn', desc: 'Kurs prawa jazdy kat. B z wygodnym planem ratalnym w JR.', mkt: 'Prawo jazdy bez dużych wydatków naraz.', entry: 80, sub: 40, blocked: 150, grace: 6, addon: 'Dodatkowe jazdy', unit: 'godziny' },
  { name: 'Klub Tenisowy Ace', desc: 'Rezerwacje kortów i treningi tenisa w klubach partnerskich.', mkt: 'Graj w tenisa cały rok.', entry: 45, sub: 22, blocked: 90, grace: 6, addon: 'Trening z trenerem', unit: 'sesje' },
  { name: 'Kuchnia BoxFood', desc: 'Catering dietetyczny z dostawą i elastycznym abonamentem.', mkt: 'Zdrowe posiłki bez gotowania.', entry: 35, sub: 28, blocked: 70, grace: 3, addon: 'Dodatkowe posiłki', unit: 'posiłki' },
  { name: 'Akademia Kodowania DevStart', desc: 'Bootcamp programowania z mentorem i planem oszczędnościowym.', mkt: 'Zostań programistą.', entry: 100, sub: 50, blocked: 200, grace: 9, rec: true, addon: 'Konsultacje z mentorem', unit: 'godziny' },
  { name: 'Klub Malucha KidsPlay', desc: 'Zajęcia edukacyjne i opieka dla dzieci w placówkach partnerskich.', mkt: 'Rozwój Twojego dziecka.', entry: 40, sub: 26, blocked: 80, grace: 6, addon: 'Zajęcia dodatkowe', unit: 'zajęcia' },
  { name: 'Szkoła Muzyczna Sonata', desc: 'Lekcje gry na instrumentach i śpiewu w szkołach partnerskich.', mkt: 'Odkryj swój talent muzyczny.', entry: 38, sub: 24, blocked: 76, grace: 6, addon: 'Lekcje indywidualne', unit: 'lekcje' },
  { name: 'Basen AquaZone', desc: 'Nielimitowany dostęp do basenów i aquaparków w sieci partnerskiej.', mkt: 'Pływaj, kiedy chcesz.', entry: 42, sub: 18, blocked: 84, grace: 6, addon: 'Nauka pływania', unit: 'sesje' },
  { name: 'Warsztaty Fotografii FrameArt', desc: 'Kursy fotografii od podstaw do poziomu zaawansowanego.', mkt: 'Rób lepsze zdjęcia.', entry: 36, sub: 20, blocked: 72, grace: 3, addon: 'Plener ze studiem', unit: 'sesje' },
  { name: 'Prestige VIP Wellness', desc: 'Ekskluzywne członkostwo wellness premium. Wymaga minimalnego salda JR.', mkt: 'Ekskluzywność, na jaką zasługujesz.', entry: 120, sub: 60, blocked: 250, grace: 12, vip: true, addon: 'Prywatny trener', unit: 'sesje' },
  { name: 'Klub Golfowy Eagle VIP', desc: 'Dostęp do prestiżowych pól golfowych i lekcji z profesjonalistami.', mkt: 'Golf na najwyższym poziomie.', entry: 150, sub: 80, blocked: 300, grace: 12, vip: true, addon: 'Lekcje z PRO', unit: 'sesje' },
  { name: 'Klinika PrivateMed VIP', desc: 'Pakiet prywatnej opieki medycznej premium z szybkim dostępem do specjalistów.', mkt: 'Zdrowie bez kolejek.', entry: 140, sub: 70, blocked: 280, grace: 12, vip: true, addon: 'Konsultacje specjalistyczne', unit: 'wizyty' },
];

type BonusTpl = { name: string; desc: string; entry: number };
const bonusTpls: BonusTpl[] = [
  { name: 'Vouchery do kina Cinema+', desc: 'Bilety do sieci kin partnerskich do wykorzystania w dogodnym terminie.', entry: 15 },
  { name: 'Karta zakupowa ShopMax', desc: 'Rabatowe vouchery do sieci sklepów partnerskich.', entry: 20 },
  { name: 'Karta paliwowa FuelGo', desc: 'Zniżki na paliwo na stacjach partnerskich.', entry: 25 },
  { name: 'Klub Książki ReadMore', desc: 'Abonament na książki i audiobooki.', entry: 12 },
  { name: 'Kawa CoffeePass', desc: 'Codzienna kawa w sieci kawiarni partnerskich.', entry: 10 },
];

const permAll = ['USER_MANAGEMENT', 'USER_DATA', 'USER_PAYMENT', 'USER_PROGRAM', 'USER_PARTNERSHIP', 'PAYMENT', 'PROGRAM', 'BONUS', 'LOCATION', 'SETTINGS', 'TERMS', 'FAQ', 'STATISTICS', 'NEWS', 'FILES'];
const pesel = () => String(ri(60, 99)) + String(ri(1, 12)).padStart(2, '0') + String(ri(1, 28)).padStart(2, '0') + String(ri(10000, 99999));
const nip = () => String(ri(100, 999)) + '-' + String(ri(100, 999)) + '-' + String(ri(10, 99)) + '-' + String(ri(10, 99));
const iban = () => 'PL' + String(ri(10, 99)) + ' ' + Array.from({ length: 6 }, () => String(ri(1000, 9999))).join(' ');
const phone = () => String(ri(500, 899)) + ' ' + String(ri(100, 999)) + ' ' + String(ri(100, 999));

export async function runSeed(prisma: PrismaClient) {
  console.log('Seeding DivideYou (rich dataset)...');
  _s = 0x9e3779b9; // reset PRNG

  // wipe (FK-safe order)
  await prisma.transaction.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.clientRequest.deleteMany();
  await prisma.purchaseAttribute.deleteMany();
  await prisma.purchase.deleteMany();
  await prisma.programAttribute.deleteMany();
  await prisma.electronicRule.deleteMany();
  await prisma.location.deleteMany();
  await prisma.observedItem.deleteMany();
  await prisma.program.deleteMany();
  await prisma.partnershipCommissionThreshold.deleteMany();
  await prisma.invitation.deleteMany();
  await prisma.gdprAgreement.deleteMany();
  await prisma.token.deleteMany();
  await prisma.userAdmin.deleteMany();
  await prisma.userClient.deleteMany();
  await prisma.user.deleteMany();
  await prisma.settings.deleteMany();
  await prisma.registrationRule.deleteMany();
  await prisma.news.deleteMany();
  await prisma.faq.deleteMany();
  await prisma.fileItem.deleteMany();

  const pw = await bcrypt.hash('Password1', 10);
  const RATE = pln(1); // 1 JR = 1.00 PLN
  const ACCESS_PRICE = pln(99);

  // ---- Settings + thresholds + content ----
  await prisma.settings.create({
    data: {
      demoAccessDays: 14, accessPrice: ACCESS_PRICE, jrExchangeRate: RATE,
      jrWithdrawalPeriodDays: 30, jrProtectionPeriodDays: 0,
      minJrForVip: jr(500), minJrForBonus: jr(100),
      partnerTerm: 'Przystępując do programu partnerskiego DivideYou zgadzasz się na uczciwe promowanie platformy oraz na warunki prowizji za polecenia.',
    },
  });
  await prisma.partnershipCommissionThreshold.createMany({
    data: [
      { global: true, lowLimit: 0, highLimit: 4, value: 3 },
      { global: true, lowLimit: 5, highLimit: 14, value: 5 },
      { global: true, lowLimit: 15, highLimit: 999999, value: 8 },
    ],
  });
  await prisma.registrationRule.createMany({
    data: [
      { name: 'Regulamin platformy', content: 'Akceptuję regulamin platformy DivideYou.', required: true, sortOrder: 0 },
      { name: 'Polityka prywatności (RODO)', content: 'Wyrażam zgodę na przetwarzanie moich danych osobowych.', required: true, sortOrder: 1 },
      { name: 'Marketing', content: 'Wyrażam zgodę na otrzymywanie komunikatów marketingowych.', required: false, sortOrder: 2 },
    ],
  });
  await prisma.news.createMany({
    data: [
      { slug: 'witamy-divideyou', title: 'Witamy na nowej platformie DivideYou', content: 'Z radością uruchamiamy przebudowaną platformę DivideYou. Przeglądaj programy, doładuj portfel JR i zacznij oszczędzać.', createdAt: new Date('2022-01-05') },
      { slug: 'nowe-progi-prowizji', title: 'Nowe progi prowizji partnerskiej', content: 'Zaproś więcej znajomych i odblokuj wyższe stawki prowizji — do 8%.', createdAt: new Date('2022-06-10') },
      { slug: 'programy-vip', title: 'Programy VIP już dostępne', content: 'Ekskluzywne członkostwa premium dla najbardziej aktywnych użytkowników.', createdAt: new Date('2023-03-01') },
      { slug: 'aplikacja-mobilna', title: 'Pracujemy nad aplikacją mobilną', content: 'Już wkrótce DivideYou w Twoim telefonie. Trzymajcie kciuki!', createdAt: new Date('2024-02-15') },
      { slug: 'letnie-programy-2025', title: 'Letnie programy 2025 są już dostępne', content: 'Nowe programy i lokalizacje dodane na sezon letni.', createdAt: new Date('2025-06-01') },
    ],
  });
  await prisma.faq.createMany({
    data: [
      { question: 'Czym jest JR?', answer: 'JR (jednostka rozliczeniowa) to wewnętrzna waluta, którą doładowujesz pieniędzmi i wydajesz na programy.', sortOrder: 0, onDashboard: true },
      { question: 'Jak kupić program?', answer: 'Przeglądaj programy, otwórz lokalizację, skonfiguruj ją w kreatorze i potwierdź zakup, korzystając z salda JR.', sortOrder: 1, onDashboard: true },
      { question: 'Jak działa program partnerski?', answer: 'Udostępnij swój link polecający; gdy zaproszone przez Ciebie osoby doładują JR, otrzymujesz prowizję.', sortOrder: 2, onDashboard: false },
      { question: 'Jak wypłacić środki?', answer: 'Środki stają się dostępne do wypłaty po okresie karencji. Zleć wypłatę ze swojego portfela.', sortOrder: 3, onDashboard: false },
      { question: 'Czym różni się program VIP?', answer: 'Programy VIP wymagają minimalnego salda JR i oferują ekskluzywne korzyści.', sortOrder: 4, onDashboard: false },
    ],
  });

  // ---- Collectors for bulk insert ----
  const users: any[] = [];
  const admins: any[] = [];
  const clients: any[] = [];
  const programs: any[] = [];
  const locations: any[] = [];
  const attrParents: any[] = [];
  const attrChildren: any[] = [];
  const purchases: any[] = [];
  const purchaseAttrs: any[] = [];
  const payments: any[] = [];
  const requests: any[] = [];
  const txs: any[] = [];
  const gdpr: any[] = [];
  const spentByClient: Record<string, number> = {};
  const commByClient: Record<string, number> = {};

  const tx = (o: any) => txs.push({ cancelled: false, subscriptionMonths: 0, plnEquivalent: o.value ?? 0, ...o });

  // ---- Admins ----
  const adminDefs = [
    { email: 'admin@divideyou.test', name: 'Marcin Administrator', super: true, perms: permAll },
    { email: 'anna.cms@divideyou.test', name: 'Anna Księgowa', super: false, perms: ['USER_MANAGEMENT', 'USER_PAYMENT', 'PAYMENT', 'STATISTICS'] },
    { email: 'tomasz.cms@divideyou.test', name: 'Tomasz Katalog', super: false, perms: ['PROGRAM', 'BONUS', 'LOCATION', 'FILES', 'NEWS'] },
    { email: 'karol.cms@divideyou.test', name: 'Karol Support', super: false, perms: ['USER_MANAGEMENT', 'USER_DATA', 'FAQ'] },
    { email: 'ewa.cms@divideyou.test', name: 'Ewa Marketing', super: false, perms: ['NEWS', 'FAQ', 'FILES', 'STATISTICS'] },
    { email: 'piotr.cms@divideyou.test', name: 'Piotr Partnerski', super: false, perms: ['USER_PARTNERSHIP', 'STATISTICS', 'TERMS'] },
  ];
  adminDefs.forEach((a, i) => {
    const userId = uid();
    const created = between(START, START + 120 * DAY);
    users.push({ id: userId, email: a.email, password: pw, type: 2, emailConfirmed: true, createdAt: created, lastLoginAt: between(NOW - 20 * DAY, NOW) });
    admins.push({ id: uid(), userId, name: a.name, phone: phone(), superAdmin: a.super, permissions: JSON.stringify(Object.fromEntries(a.perms.map((k) => [k, 2]))), createdAt: created });
  });

  // ---- Programs + locations + attributes ----
  const locByProgram: Record<string, any[]> = {};
  const allSellableLocations: { loc: any; prog: any }[] = [];
  const bonusPrograms: any[] = [];

  programTpls.forEach((t, idx) => {
    const pid = uid();
    const created = between(START, START + 400 * DAY);
    programs.push({
      id: pid, name: t.name, description: t.desc, marketingText: t.mkt, gallery: '[]',
      vip: !!t.vip, recommended: !!t.rec, isBonus: false, visible: true,
      gracePeriod: t.grace, entryFee: jr(t.entry), subscriptionPrice: jr(t.sub), amountBlocked: jr(t.blocked),
      minimalJrForView: t.vip ? jr(500) : 0, createdAt: created,
    });
    const nLoc = ri(1, 3);
    const usedCities = new Set<number>();
    locByProgram[pid] = [];
    for (let k = 0; k < nLoc; k++) {
      let ci = ri(0, cities.length - 1);
      while (usedCities.has(ci) && usedCities.size < cities.length) ci = ri(0, cities.length - 1);
      usedCities.add(ci);
      const c = cities[ci];
      const lid = uid();
      const loc = {
        id: lid, programId: pid, name: `${t.name.split(' ').slice(-1)[0]} ${c.city}`,
        description: `${t.desc} Placówka w mieście ${c.city}.`,
        address: `ul. ${pick(c.streets)} ${ri(1, 120)}`, city: c.city, postalCode: c.postal,
        latitude: c.lat + (rnd() - 0.5) * 0.05, longitude: c.lng + (rnd() - 0.5) * 0.05,
        visible: true, purchaseDuration: t.grace, entryFee: jr(t.entry), subscriptionPrice: jr(t.sub),
        amountBlocked: jr(t.blocked), maxPurchases: ri(50, 200), gallery: '[]', createdAt: created,
      };
      locations.push(loc);
      locByProgram[pid].push(loc);
      allSellableLocations.push({ loc, prog: programs[programs.length - 1] });
      // attribute tree for the creator
      const parentId = uid();
      attrParents.push({ id: parentId, locationId: lid, name: 'Wariant członkostwa', type: 1, isRequired: true, sortOrder: 0 });
      attrChildren.push({ id: uid(), locationId: lid, parentId, name: 'Standard', type: 2, isFinal: true, startFee: 0, subscriptionPrice: 0, sortOrder: 0 });
      const premStart = jr(ri(10, 30)); const premSub = jr(ri(5, 15)); const premBlock = jr(ri(10, 30));
      attrChildren.push({ id: uid(), locationId: lid, parentId, name: 'Premium', type: 2, isFinal: true, startFee: premStart, subscriptionPrice: premSub, amountBlocked: premBlock, sortOrder: 1 });
      attrParents.push({ id: uid(), locationId: lid, name: t.addon, type: 3, unit: t.unit, maxCount: ri(5, 12), startFee: jr(ri(2, 8)), isMultiselect: true, sortOrder: 1 });
    }
  });

  bonusTpls.forEach((t) => {
    const pid = uid();
    const created = between(START + 200 * DAY, NOW - 200 * DAY);
    const p = {
      id: pid, name: t.name, description: t.desc, marketingText: '', gallery: '[]',
      vip: false, recommended: false, isBonus: true, visible: true,
      gracePeriod: 1, entryFee: jr(t.entry), subscriptionPrice: 0, amountBlocked: 0,
      minimalJrForView: jr(100), maxPurchases: ri(100, 500), createdAt: created,
    };
    programs.push(p); bonusPrograms.push(p);
    // bonus attributes live on the program
    const parentId = uid();
    attrParents.push({ id: parentId, programId: pid, name: 'Wariant', type: 1, isRequired: true, sortOrder: 0 });
    attrChildren.push({ id: uid(), programId: pid, parentId, name: 'Podstawowy', type: 2, isFinal: true, startFee: 0, sortOrder: 0 });
    attrChildren.push({ id: uid(), programId: pid, parentId, name: 'Rozszerzony', type: 2, isFinal: true, startFee: jr(ri(5, 15)), sortOrder: 1 });
  });

  const nonVipLocations = allSellableLocations.filter((x) => !x.prog.vip);

  // ---- Clients ----
  // Named accounts first, then generated ones.
  type C = { id: string; userId: string; email: string; createdAt: Date; accessPaid: boolean; isPartner: boolean; partnerOfId: string | null; topups: { value: number; ts: Date }[]; type: number };
  const clientMeta: C[] = [];

  function makeClient(opts: { email?: string; created?: Date; type?: number; accessPaid?: boolean; partner?: boolean; female?: boolean }) {
    const created = opts.created ?? new Date(START + (NOW - START) * Math.pow(rnd(), 0.72));
    const type = opts.type ?? (chance(0.25) ? 2 : 1);
    const female = opts.female ?? chance(0.5);
    const fn = female ? pick(firstNamesF) : pick(firstNamesM);
    const ln = pick(lastNames);
    const userId = uid(); const cid = uid();
    const email = opts.email ?? `${fn}.${ln}${ri(1, 999)}@example.com`.toLowerCase().replace(/[żź]/g, 'z').replace(/ł/g, 'l').replace(/ó/g, 'o').replace(/ą/g, 'a').replace(/ę/g, 'e').replace(/ś/g, 's').replace(/ć/g, 'c').replace(/ń/g, 'n');
    const accessPaid = opts.accessPaid ?? chance(0.86);
    const demoExpired = !accessPaid && chance(0.5);
    const blocked = accessPaid && chance(0.04) ? 3 : 0;
    const c = cities[ri(0, cities.length - 1)];
    users.push({ id: userId, email, password: pw, type: 1, emailConfirmed: true, blockedStatus: blocked, onlyPay: accessPaid && chance(0.05), createdAt: created, lastLoginAt: accessPaid ? between(NOW - 40 * DAY, NOW) : between(created.getTime(), created.getTime() + 20 * DAY) });
    clients.push({
      id: cid, userId, type,
      firstName: type === 1 ? fn : null, lastName: type === 1 ? ln : null,
      companyName: type === 2 ? `${pick(companyBrands)} ${pick(companyForms)}` : null,
      personalNumber: type === 1 ? pesel() : null, taxNumber: type === 2 ? nip() : null,
      address: `ul. ${pick(c.streets)} ${ri(1, 120)}`, postalCode: c.postal, city: c.city, phone: phone(),
      bankAccountNumber: accessPaid ? iban() : null,
      accessFeePaid: accessPaid, accessPaidDate: accessPaid ? addDays(created, ri(1, 20)) : null,
      demoExpired, detailDataConfirmed: accessPaid, anyProgramBought: false,
      partnerNumber: null, partnerOfId: null, partnershipTermAccepted: false,
      createdAt: created,
    });
    if (accessPaid) gdpr.push({ id: uid(), clientId: cid, type: 1, content: 'Zaakceptowano regulamin rejestracji', createdAt: created });
    const meta: C = { id: cid, userId, email, createdAt: created, accessPaid, isPartner: !!opts.partner, partnerOfId: null, topups: [], type };
    clientMeta.push(meta);
    return meta;
  }

  const anna = makeClient({ email: 'anna@divideyou.test', created: new Date('2022-02-01'), type: 1, accessPaid: true, partner: true, female: true });
  const jan = makeClient({ email: 'jan@divideyou.test', created: new Date('2022-03-15'), type: 1, accessPaid: true, female: false });
  makeClient({ email: 'demo@divideyou.test', created: new Date(NOW - 5 * DAY), type: 1, accessPaid: false });

  for (let i = 0; i < 74; i++) makeClient({ partner: chance(0.22) });

  // Mark partners: named anna + those flagged
  const partnerClients = clientMeta.filter((c) => c.isPartner && c.accessPaid);
  for (const p of partnerClients) {
    const ci = clients.find((x) => x.id === p.id)!;
    ci.partnershipTermAccepted = true;
    ci.partnerNumber = 'P-' + (10000 + clients.indexOf(ci));
    ci.partnershipTermDate = addDays(p.createdAt, ri(5, 60));
    ci.partnershipRegisterIp = `${ri(31, 93)}.${ri(0, 255)}.${ri(0, 255)}.${ri(1, 254)}`;
    if (chance(0.3)) { ci.customPartnershipCommission = true; ci.partnershipCommissionValue = ri(1, 3); }
  }

  // Assign downlines: each accessPaid client (registered after a partner) may be referred.
  const partnerUpdates: { id: string; partnerOfId: string }[] = [];
  const downlineOf: Record<string, C[]> = {};
  // Ensure anna has a solid downline
  const annaDownline = clientMeta.filter((c) => c.id !== anna.id && c.createdAt > anna.createdAt).slice(0, 7);
  for (const c of clientMeta) {
    if (c.id === anna.id) continue;
    let ref: C | undefined;
    if (annaDownline.includes(c)) ref = anna;
    else if (chance(0.45)) ref = pick(partnerClients.filter((p) => p.id !== c.id && p.createdAt < c.createdAt));
    if (ref) {
      c.partnerOfId = ref.id;
      partnerUpdates.push({ id: c.id, partnerOfId: ref.id });
      (downlineOf[ref.id] ||= []).push(c);
    }
  }

  // ---- Financial timelines ----
  const rejectedNote = 'Płatność odrzucona';
  function topup(c: C, value: number, ts: Date, status: number) {
    const pid = uid();
    payments.push({ id: pid, clientId: c.id, type: 1, status, value, createdAt: ts });
    tx({ clientId: c.id, type: chance(0.5) ? 10 : 11, value, paymentId: pid, timestamp: ts, description: 'Doładowanie JR' });
    if (status === 2) c.topups.push({ value, ts });
  }

  for (const c of clientMeta) {
    if (!c.accessPaid) {
      if (chance(0.5)) topup(c, jr(ri(1, 6)), between(c.createdAt.getTime(), NOW), 1); // pending only
      continue;
    }
    // access fee payment
    payments.push({ id: uid(), clientId: c.id, type: 2, status: 2, value: ACCESS_PRICE, createdAt: addDays(c.createdAt, ri(1, 15)) });

    // Plan purchases (jan — the showcase client — always owns at least one)
    const nPur = c.email === 'jan@divideyou.test' ? ri(1, 2) : c.isPartner ? ri(1, 3) : pick([0, 1, 1, 1, 2, 2, 3]);
    const plan: any[] = [];
    let spend = 0;
    const earliestBuy = addDays(c.createdAt, ri(8, 40));
    for (let k = 0; k < nPur; k++) {
      const janShowcase = c.email === 'jan@divideyou.test' && k === 0;
      const isBonus = janShowcase ? false : chance(0.28) && bonusPrograms.length > 0;
      let price: number, sub: number, blocked: number, grace: number, programId: string | null, locationId: string | null, name: string, premium = false;
      if (isBonus) {
        const bp = pick(bonusPrograms);
        programId = bp.id; locationId = null; name = bp.name;
        premium = chance(0.4);
        price = bp.entryFee + (premium ? jr(ri(5, 15)) : 0); sub = 0; blocked = 0; grace = 1;
      } else {
        const sel = pick(nonVipLocations);
        programId = sel.prog.id; locationId = sel.loc.id; name = sel.loc.name; grace = sel.prog.gracePeriod;
        premium = chance(0.4);
        price = sel.loc.entryFee + (premium ? jr(ri(10, 30)) : 0);
        sub = sel.loc.subscriptionPrice + (premium ? jr(ri(5, 15)) : 0);
        blocked = sel.loc.amountBlocked;
      }
      const boughtDate = janShowcase ? between(NOW - 55 * DAY, NOW - 25 * DAY) : between(earliestBuy.getTime(), NOW - 20 * DAY);
      const roll = janShowcase ? 0 : rnd();
      const active = roll < 0.82, finished = roll >= 0.82 && roll < 0.9, canceled = roll >= 0.9;
      const activation = boughtDate;
      const elapsed = monthsBetween(activation, new Date(NOW));
      const monthsPaid = isBonus ? 0 : Math.min(elapsed, active ? ri(1, Math.max(1, Math.min(elapsed, grace))) : ri(0, 2));
      spend += price + sub * monthsPaid;
      plan.push({ id: uid(), isBonus, programId, locationId, name, price, sub, blocked, grace, boughtDate, active, finished, canceled, activation, monthsPaid, premium });
    }

    // Funding: enough accepted top-ups to cover all spend + surplus, first one before earliest purchase.
    const surplus = jr(ri(3, 25));
    let fundNeeded = spend + surplus;
    const firstDate = addDays(c.createdAt, ri(2, 10));
    const firstVal = Math.max(jr(5), Math.round(fundNeeded * (0.55 + rnd() * 0.25)));
    topup(c, firstVal, firstDate, 2);
    let remaining = fundNeeded - firstVal;
    const nMore = ri(1, 4);
    for (let j = 0; j < nMore; j++) {
      const last = j === nMore - 1;
      let val = last ? remaining : Math.round((remaining / (nMore - j)) * (0.7 + rnd() * 0.5));
      val = Math.max(jr(1), Math.min(val, remaining));
      remaining -= val;
      if (val <= 0) break;
      topup(c, val, between(firstDate.getTime(), NOW - 3 * DAY), 2);
      if (remaining <= 0) break;
    }
    if (remaining > 0) topup(c, remaining, between(firstDate.getTime(), NOW - 3 * DAY), 2);
    // occasional pending / rejected top-ups for realism
    if (chance(0.28)) topup(c, jr(ri(1, 10)), between(NOW - 45 * DAY, NOW), 1);
    if (chance(0.1)) { const pid = uid(); payments.push({ id: pid, clientId: c.id, type: 1, status: 3, value: jr(ri(1, 8)), createdAt: between(c.createdAt.getTime(), NOW) }); tx({ clientId: c.id, type: 10, value: 0, paymentId: pid, timestamp: between(c.createdAt.getTime(), NOW), description: rejectedNote }); }

    // Emit purchases + related transactions
    let boughtAny = false;
    for (const p of plan) {
      boughtAny = boughtAny || p.active;
      purchases.push({
        id: p.id, userClientId: c.id, programId: p.programId, locationId: p.locationId, isBonus: p.isBonus,
        price: p.price, subscriptionFee: p.sub, amountBlocked: p.blocked,
        active: p.active, finished: p.finished, canceled: p.canceled, canceledByAdmin: false,
        activationDate: p.activation, boughtDate: p.boughtDate,
        endDate: p.isBonus ? null : addMonths(p.activation, p.grace),
        nextPaymentDate: p.active && !p.isBonus ? addMonths(p.activation, p.monthsPaid + 1) : null,
        createdAt: p.boughtDate,
      });
      purchaseAttrs.push({ id: uid(), purchaseId: p.id, programAttributeId: uid(), name: p.premium ? 'Premium' : 'Standard', count: 1, startFee: 0, subscriptionPrice: p.sub, amountBlocked: p.blocked });
      tx({ clientId: c.id, type: p.isBonus ? 21 : 20, value: p.price, purchaseId: p.id, timestamp: p.boughtDate, description: p.isBonus ? 'Zakup bonusu' : 'Zakup programu' });
      if (p.active && !p.isBonus && p.blocked > 0) tx({ clientId: c.id, type: 70, value: p.blocked, purchaseId: p.id, timestamp: p.boughtDate, description: 'Zabezpieczenie (zamrożone)' });
      for (let m = 1; m <= p.monthsPaid; m++) tx({ clientId: c.id, type: 40, value: p.sub, purchaseId: p.id, subscriptionMonths: 1, timestamp: addMonths(p.activation, m), description: `Abonament (${m} mies.)` });
      if (p.canceled) tx({ clientId: c.id, type: 100, value: 0, purchaseId: p.id, timestamp: addDays(p.boughtDate, ri(30, 200)), description: 'Anulowanie zakupu' });
    }
    if (boughtAny) clients.find((x) => x.id === c.id)!.anyProgramBought = true;
    spentByClient[c.id] = spend;
  }

  // ---- Partnership commissions (income for uplines from downline top-ups) ----
  for (const partner of partnerClients) {
    const down = downlineOf[partner.id] || [];
    const size = down.length;
    const pct = size >= 15 ? 8 : size >= 5 ? 5 : 3;
    for (const d of down) {
      for (const t of d.topups.slice(0, 6)) {
        if (!chance(0.7)) continue;
        const commission = Math.round((t.value * pct) / 100);
        if (commission <= 0) continue;
        tx({ clientId: partner.id, type: 50, value: commission, partnerId: d.id, timestamp: addDays(t.ts, ri(0, 3)), description: `Prowizja ${pct}% z doładowania partnera` });
        commByClient[partner.id] = (commByClient[partner.id] || 0) + commission;
      }
    }
  }

  // ---- A few payouts / commission payouts / return requests ----
  // Guarded by a running available-balance estimate so no wallet bucket goes negative.
  for (const c of clientMeta) {
    if (!c.accessPaid || c.topups.length === 0) continue;
    const topupTotal = c.topups.reduce((s, t) => s + t.value, 0);
    let avail = topupTotal + (commByClient[c.id] || 0) - (spentByClient[c.id] || 0);
    let commAvail = commByClient[c.id] || 0;
    const oldEnough = c.topups.some((t) => t.ts.getTime() < NOW - 40 * DAY);

    if (oldEnough && avail > jr(6) && chance(0.15)) {
      const val = jr(ri(1, 4));
      if (val + jr(2) <= avail) {
        avail -= val;
        const pid = uid(); const ts = between(NOW - 30 * DAY, NOW);
        payments.push({ id: pid, clientId: c.id, type: 10, status: chance(0.7) ? 2 : 1, value: val, createdAt: ts });
        tx({ clientId: c.id, type: 60, value: val, paymentId: pid, timestamp: ts, description: 'Wypłata JR' });
      }
    }
    if (c.isPartner && commAvail > jr(4) && chance(0.3)) {
      const val = jr(ri(1, 3));
      if (val <= commAvail) {
        commAvail -= val;
        const pid = uid(); const ts = between(NOW - 30 * DAY, NOW);
        payments.push({ id: pid, clientId: c.id, type: 11, status: 2, value: val, createdAt: ts });
        tx({ clientId: c.id, type: 61, value: val, paymentId: pid, timestamp: ts, description: 'Wypłata prowizji' });
      }
    }
    if (chance(0.1)) {
      const val = jr(ri(1, 5));
      const status = pick([1, 2, 3]);
      // only drain funds for pending/accepted returns, and only if covered
      if (status === 3 || val + jr(2) <= avail) {
        if (status !== 3) avail -= val;
        const rid = uid(); const ts = between(NOW - 60 * DAY, NOW);
        requests.push({ id: rid, clientId: c.id, type: chance(0.5) ? 1 : 2, status, value: val, plnEquivalent: val, description: 'Wniosek o zwrot środków', createdAt: ts });
        if (status !== 3) tx({ clientId: c.id, type: 62, value: val, clientRequestId: rid, timestamp: ts, description: 'Wniosek o zwrot' });
      }
    }
  }

  // ---- Bulk insert (FK-safe order) ----
  const chunk = <T>(a: T[], n = 500) => { const out: T[][] = []; for (let i = 0; i < a.length; i += n) out.push(a.slice(i, i + n)); return out; };
  const insert = async (model: any, rows: any[]) => { for (const b of chunk(rows)) if (b.length) await model.createMany({ data: b }); };

  await insert(prisma.user, users);
  await insert(prisma.userAdmin, admins);
  await insert(prisma.userClient, clients);
  for (const u of partnerUpdates) await prisma.userClient.update({ where: { id: u.id }, data: { partnerOfId: u.partnerOfId } });
  await insert(prisma.program, programs);
  await insert(prisma.location, locations);
  await insert(prisma.programAttribute, attrParents);
  await insert(prisma.programAttribute, attrChildren);
  await insert(prisma.purchase, purchases);
  await insert(prisma.purchaseAttribute, purchaseAttrs);
  await insert(prisma.payment, payments);
  await insert(prisma.clientRequest, requests);
  // transactions sorted by time so the autoincrement id (ledger sequence) ascends chronologically
  txs.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  await insert(prisma.transaction, txs);
  await insert(prisma.gdprAgreement, gdpr);

  // ---- Recompute denormalized wallet fields per client (parallel batches) ----
  for (const batch of chunk(clientMeta.map((c) => c.id), 10)) {
    await Promise.all(batch.map((id) => refreshClientDenormalized(id).catch(() => {})));
  }

  console.log(`Seed complete: ${clients.length} clients, ${admins.length} admins, ${programs.length} programs, ${locations.length} locations, ${purchases.length} purchases, ${payments.length} payments, ${txs.length} transactions.`);
}

// CLI entry: `npm run seed`. Skipped when imported as a module.
const isCli = process.argv[1] && /seed\.ts$/.test(process.argv[1]);
if (isCli) {
  const prisma = new PrismaClient();
  runSeed(prisma)
    .then(() => {
      console.log('  Admin:   admin@divideyou.test / Password1');
      console.log('  Partner: anna@divideyou.test  / Password1');
      console.log('  Client:  jan@divideyou.test   / Password1');
      console.log('  Demo:    demo@divideyou.test  / Password1');
    })
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
