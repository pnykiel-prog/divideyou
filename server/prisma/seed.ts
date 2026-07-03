import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const M = 100; // money scale
const jr = (n: number) => Math.round(n * M);
const pln = (n: number) => Math.round(n * M);

// Seeds demo data. Reused by the CLI (npm run seed) and the bootstrap endpoint.
export async function runSeed(prisma: PrismaClient) {
  console.log('Seeding DivideYou...');

  // wipe
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

  // ---- Settings ----
  await prisma.settings.create({
    data: {
      demoAccessDays: 14,
      accessPrice: pln(99),
      jrExchangeRate: pln(1), // 1 JR = 1.00 PLN
      jrWithdrawalPeriodDays: 30,
      jrProtectionPeriodDays: 0,
      minJrForVip: jr(500),
      minJrForBonus: jr(100),
      partnerTerm: 'Przystępując do programu partnerskiego DivideYou zgadzasz się na uczciwe promowanie platformy oraz na warunki prowizji za polecenia.',
    },
  });

  // ---- Global commission thresholds ----
  await prisma.partnershipCommissionThreshold.createMany({
    data: [
      { global: true, lowLimit: 0, highLimit: 4, value: 3 },
      { global: true, lowLimit: 5, highLimit: 14, value: 5 },
      { global: true, lowLimit: 15, highLimit: 999999, value: 8 },
    ],
  });

  // ---- Super admin ----
  const permAll = Object.fromEntries(
    ['USER_MANAGEMENT','USER_DATA','USER_PAYMENT','USER_PROGRAM','USER_PARTNERSHIP','PAYMENT','PROGRAM','BONUS','LOCATION','SETTINGS','TERMS','FAQ','STATISTICS','NEWS','FILES'].map((k) => [k, 2])
  );
  await prisma.user.create({
    data: {
      email: 'admin@divideyou.test',
      password: pw,
      type: 2,
      emailConfirmed: true,
      admin: { create: { name: 'Marcin Admin', phone: '123123123', superAdmin: true, permissions: JSON.stringify(permAll) } },
    },
  });

  // ---- Registration rules ----
  await prisma.registrationRule.createMany({
    data: [
      { name: 'Regulamin platformy', content: 'Akceptuję regulamin platformy DivideYou.', required: true, sortOrder: 0 },
      { name: 'Polityka prywatności (RODO)', content: 'Wyrażam zgodę na przetwarzanie moich danych osobowych.', required: true, sortOrder: 1 },
      { name: 'Marketing', content: 'Wyrażam zgodę na otrzymywanie komunikatów marketingowych.', required: false, sortOrder: 2 },
    ],
  });

  // ---- News ----
  await prisma.news.createMany({
    data: [
      { slug: 'welcome-divideyou', title: 'Witamy na nowej platformie DivideYou', content: 'Z radością uruchamiamy przebudowaną platformę DivideYou. Przeglądaj programy, doładuj portfel JR i zacznij oszczędzać.', photo: null },
      { slug: 'new-partnership-tiers', title: 'Nowe progi prowizji partnerskiej', content: 'Zaproś więcej znajomych i odblokuj wyższe stawki prowizji — do 8%.', photo: null },
      { slug: 'summer-programs', title: 'Letnie programy są już dostępne', content: 'Nowe programy i lokalizacje dodane na sezon letni.', photo: null },
    ],
  });

  // ---- FAQ ----
  await prisma.faq.createMany({
    data: [
      { question: 'Czym jest JR?', answer: 'JR (jednostka rozliczeniowa) to wewnętrzna waluta, którą doładowujesz pieniędzmi i wydajesz na programy.', sortOrder: 0, onDashboard: true },
      { question: 'Jak kupić program?', answer: 'Przeglądaj programy, otwórz lokalizację, skonfiguruj ją w kreatorze i potwierdź zakup, korzystając z salda JR.', sortOrder: 1, onDashboard: true },
      { question: 'Jak działa program partnerski?', answer: 'Udostępnij swój link polecający; gdy zaproszone przez Ciebie osoby doładują JR, otrzymujesz prowizję.', sortOrder: 2, onDashboard: false },
      { question: 'Jak wypłacić środki?', answer: 'Środki stają się dostępne do wypłaty po okresie karencji. Zleć wypłatę ze swojego portfela.', sortOrder: 3, onDashboard: false },
    ],
  });

  // ---- Programs + locations ----
  const fitness = await prisma.program.create({
    data: {
      name: 'Karnet na siłownię FitLife',
      description: 'Dostęp do ogólnokrajowej sieci klubów fitness z elastycznym planem oszczędzania.',
      marketingText: 'Zadbaj o formę, oszczędzając.',
      gracePeriod: 6,
      entryFee: jr(50),
      subscriptionPrice: jr(20),
      amountBlocked: jr(100),
      recommended: true,
      gallery: JSON.stringify([]),
    },
  });
  const gymWarsaw = await prisma.location.create({
    data: {
      programId: fitness.id,
      name: 'FitLife Warszawa Centrum',
      description: 'Flagowy klub w sercu Warszawy.',
      address: 'ul. Marszałkowska 1', city: 'Warszawa', postalCode: '00-001',
      latitude: 52.2297, longitude: 21.0122,
      purchaseDuration: 12, entryFee: jr(50), subscriptionPrice: jr(20), amountBlocked: jr(100), maxPurchases: 100,
    },
  });
  await prisma.location.create({
    data: {
      programId: fitness.id,
      name: 'FitLife Kraków Kazimierz',
      description: 'Nowoczesny klub w Krakowie.',
      address: 'ul. Krakowska 10', city: 'Kraków', postalCode: '30-001',
      latitude: 50.0614, longitude: 19.9366,
      purchaseDuration: 12, entryFee: jr(40), subscriptionPrice: jr(18), amountBlocked: jr(80), maxPurchases: 100,
    },
  });
  // attributes for the Warsaw location
  const plan = await prisma.programAttribute.create({
    data: { locationId: gymWarsaw.id, name: 'Plan członkostwa', type: 1, isRequired: true, sortOrder: 0 },
  });
  await prisma.programAttribute.createMany({
    data: [
      { locationId: gymWarsaw.id, parentId: plan.id, name: 'Standard', type: 2, isFinal: true, startFee: jr(0), subscriptionPrice: jr(0), sortOrder: 0 },
      { locationId: gymWarsaw.id, parentId: plan.id, name: 'Premium (+basen i sauna)', type: 2, isFinal: true, startFee: jr(20), subscriptionPrice: jr(10), amountBlocked: jr(20), sortOrder: 1 },
    ],
  });
  await prisma.programAttribute.create({
    data: { locationId: gymWarsaw.id, name: 'Sesje treningu personalnego', type: 3, unit: 'sesje', maxCount: 10, startFee: jr(5), isMultiselect: true, sortOrder: 1 },
  });

  const language = await prisma.program.create({
    data: {
      name: 'Kursy językowe SpeakUp',
      description: 'Ucz się nowego języka z planem oszczędnościowym w szkołach partnerskich.',
      gracePeriod: 3, entryFee: jr(30), subscriptionPrice: jr(15), amountBlocked: jr(60),
      gallery: JSON.stringify([]),
    },
  });
  await prisma.location.create({
    data: {
      programId: language.id, name: 'SpeakUp Wrocław', description: 'Szkoła językowa we Wrocławiu.',
      address: 'ul. Świdnicka 5', city: 'Wrocław', postalCode: '50-001', latitude: 51.1079, longitude: 17.0385,
      purchaseDuration: 9, entryFee: jr(30), subscriptionPrice: jr(15), amountBlocked: jr(60), maxPurchases: 50,
    },
  });

  // VIP program
  const vip = await prisma.program.create({
    data: {
      name: 'Klub Wellness Prestige', vip: true,
      description: 'Ekskluzywne członkostwo wellness VIP. Wymaga minimalnego salda JR.',
      gracePeriod: 12, entryFee: jr(200), subscriptionPrice: jr(80), amountBlocked: jr(400), minimalJrForView: jr(500),
      gallery: JSON.stringify([]),
    },
  });
  await prisma.location.create({
    data: {
      programId: vip.id, name: 'Prestige Sopot', description: 'Nadmorski ośrodek wellness VIP.',
      address: 'ul. Bohaterów Monte Cassino 1', city: 'Sopot', postalCode: '81-001', latitude: 54.4416, longitude: 18.5601,
      purchaseDuration: 12, entryFee: jr(200), subscriptionPrice: jr(80), amountBlocked: jr(400), maxPurchases: 20,
    },
  });

  // ---- Bonuses ----
  await prisma.program.create({
    data: {
      name: 'Pakiet powitalny', isBonus: true, maxPurchases: 1000,
      description: 'Startowy bonus z rabatowymi voucherami partnerskimi.',
      gracePeriod: 1, entryFee: jr(10), subscriptionPrice: jr(0), amountBlocked: jr(0),
      gallery: JSON.stringify([]),
    },
  });
  await prisma.program.create({
    data: {
      name: 'Bonus voucher do kina', isBonus: true, maxPurchases: 200,
      description: 'Vouchery do kina do wykorzystania w sieciach partnerskich.',
      gracePeriod: 2, entryFee: jr(25), subscriptionPrice: jr(0), amountBlocked: jr(0),
      gallery: JSON.stringify([]),
    },
  });

  // ---- Demo clients ----
  // Partner (upline) with a topped-up wallet and one active program
  const partner = await prisma.user.create({
    data: {
      email: 'anna@divideyou.test', password: pw, type: 1, emailConfirmed: true,
      client: {
        create: {
          type: 1, firstName: 'Anna', lastName: 'Kowalska', personalNumber: '90010112345',
          address: 'ul. Testowa 1', postalCode: '00-001', city: 'Warszawa', phone: '600100200',
          bankAccountNumber: 'PL61109010140000071219812874',
          accessFeePaid: true, accessPaidDate: new Date(), detailDataConfirmed: true,
          partnershipTermAccepted: true, partnershipTermDate: new Date(), partnerNumber: '26100200',
        },
      },
    },
    include: { client: true },
  });

  // Downline client referred by Anna
  const client = await prisma.user.create({
    data: {
      email: 'jan@divideyou.test', password: pw, type: 1, emailConfirmed: true,
      client: {
        create: {
          type: 1, firstName: 'Jan', lastName: 'Nowak', personalNumber: '85050554321',
          address: 'ul. Przykładowa 5', postalCode: '30-001', city: 'Kraków', phone: '600300400',
          bankAccountNumber: 'PL27114020040000300201355387',
          accessFeePaid: true, accessPaidDate: new Date(), detailDataConfirmed: true,
          partnerOfId: partner.client!.id,
        },
      },
    },
    include: { client: true },
  });

  // Give Anna some JR (accepted payment) so her wallet is funded
  const rate = pln(1);
  const topUp = jr(1000);
  const p1 = await prisma.payment.create({ data: { clientId: partner.client!.id, type: 1, status: 2, value: Math.round((topUp / 100) * rate) } });
  await prisma.transaction.create({ data: { clientId: partner.client!.id, type: 10, value: topUp, plnEquivalent: Math.round((topUp / 100) * rate), paymentId: p1.id, description: 'Doładowanie JR' } });

  // Give Jan some JR and buy the FitLife Warsaw location
  const janTop = jr(500);
  const p2 = await prisma.payment.create({ data: { clientId: client.client!.id, type: 1, status: 2, value: Math.round((janTop / 100) * rate) } });
  await prisma.transaction.create({ data: { clientId: client.client!.id, type: 10, value: janTop, plnEquivalent: Math.round((janTop / 100) * rate), paymentId: p2.id, description: 'Doładowanie JR' } });
  // Jan's top-up earns Anna a commission (3% at 1 downline)
  await prisma.transaction.create({ data: { clientId: partner.client!.id, type: 50, value: Math.round(janTop * 0.03), plnEquivalent: Math.round((janTop * 0.03 / 100) * rate), partnerId: client.client!.id, description: 'Prowizja 3% z doładowania partnera' } });

  const now = new Date();
  const purchase = await prisma.purchase.create({
    data: {
      userClientId: client.client!.id, locationId: gymWarsaw.id, isBonus: false,
      price: jr(50), subscriptionFee: jr(20), amountBlocked: jr(100),
      active: true, boughtDate: now, activationDate: now,
      endDate: new Date(now.getFullYear(), now.getMonth() + 12, now.getDate()),
      nextPaymentDate: new Date(now.getFullYear(), now.getMonth() + 1, now.getDate()),
      attributes: { create: [{ programAttributeId: plan.id, name: 'Standard', count: 1 }] },
    },
  });
  await prisma.transaction.create({ data: { clientId: client.client!.id, type: 20, value: jr(50), plnEquivalent: Math.round((jr(50) / 100) * rate), purchaseId: purchase.id, description: 'Zakup programu' } });
  await prisma.transaction.create({ data: { clientId: client.client!.id, type: 70, value: jr(100), plnEquivalent: Math.round((jr(100) / 100) * rate), purchaseId: purchase.id, description: 'Zabezpieczenie (zamrożone)' } });
  await prisma.userClient.update({ where: { id: client.client!.id }, data: { anyProgramBought: true } });

  // A demo (unpaid access) client
  await prisma.user.create({
    data: {
      email: 'demo@divideyou.test', password: pw, type: 1, emailConfirmed: true,
      client: { create: { type: 1, firstName: 'Demo', lastName: 'User' } },
    },
  });

  console.log('Seed complete.');
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
