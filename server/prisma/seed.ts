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
      partnerTerm: 'By joining the DivideYou partnership programme you agree to promote the platform fairly and to the referral commission terms.',
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
      { name: 'Platform terms', content: 'I accept the DivideYou platform terms and conditions.', required: true, sortOrder: 0 },
      { name: 'Privacy policy (RODO)', content: 'I consent to the processing of my personal data.', required: true, sortOrder: 1 },
      { name: 'Marketing', content: 'I agree to receive marketing communications.', required: false, sortOrder: 2 },
    ],
  });

  // ---- News ----
  await prisma.news.createMany({
    data: [
      { slug: 'welcome-divideyou', title: 'Welcome to the new DivideYou platform', content: 'We are excited to launch the rebuilt DivideYou. Explore programs, top up your JR wallet and start saving.', photo: null },
      { slug: 'new-partnership-tiers', title: 'New partnership commission tiers', content: 'Invite more friends and unlock higher commission rates — up to 8%.', photo: null },
      { slug: 'summer-programs', title: 'Summer programs are live', content: 'Fresh programs and locations added for the summer season.', photo: null },
    ],
  });

  // ---- FAQ ----
  await prisma.faq.createMany({
    data: [
      { question: 'What is JR?', answer: 'JR (settlement unit) is the internal currency you top up with money and spend on programs.', sortOrder: 0, onDashboard: true },
      { question: 'How do I buy a program?', answer: 'Browse programs, open a location, configure it in the creator and confirm the purchase using your JR balance.', sortOrder: 1, onDashboard: true },
      { question: 'How does the partnership programme work?', answer: 'Share your referral link; when the people you invite top up JR, you earn a commission.', sortOrder: 2, onDashboard: false },
      { question: 'How do I withdraw funds?', answer: 'Funds become available for payout after the withdrawal period. Request a payout from your wallet.', sortOrder: 3, onDashboard: false },
    ],
  });

  // ---- Programs + locations ----
  const fitness = await prisma.program.create({
    data: {
      name: 'FitLife Gym Membership',
      description: 'Access to a national network of fitness clubs with a flexible savings plan.',
      marketingText: 'Stay fit while you save.',
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
      name: 'FitLife Warsaw Centrum',
      description: 'Flagship club in the heart of Warsaw.',
      address: 'ul. Marszałkowska 1', city: 'Warszawa', postalCode: '00-001',
      latitude: 52.2297, longitude: 21.0122,
      purchaseDuration: 12, entryFee: jr(50), subscriptionPrice: jr(20), amountBlocked: jr(100), maxPurchases: 100,
    },
  });
  await prisma.location.create({
    data: {
      programId: fitness.id,
      name: 'FitLife Kraków Kazimierz',
      description: 'Modern club in Kraków.',
      address: 'ul. Krakowska 10', city: 'Kraków', postalCode: '30-001',
      latitude: 50.0614, longitude: 19.9366,
      purchaseDuration: 12, entryFee: jr(40), subscriptionPrice: jr(18), amountBlocked: jr(80), maxPurchases: 100,
    },
  });
  // attributes for the Warsaw location
  const plan = await prisma.programAttribute.create({
    data: { locationId: gymWarsaw.id, name: 'Membership plan', type: 1, isRequired: true, sortOrder: 0 },
  });
  await prisma.programAttribute.createMany({
    data: [
      { locationId: gymWarsaw.id, parentId: plan.id, name: 'Standard', type: 2, isFinal: true, startFee: jr(0), subscriptionPrice: jr(0), sortOrder: 0 },
      { locationId: gymWarsaw.id, parentId: plan.id, name: 'Premium (+pool & sauna)', type: 2, isFinal: true, startFee: jr(20), subscriptionPrice: jr(10), amountBlocked: jr(20), sortOrder: 1 },
    ],
  });
  await prisma.programAttribute.create({
    data: { locationId: gymWarsaw.id, name: 'Personal training sessions', type: 3, unit: 'sessions', maxCount: 10, startFee: jr(5), isMultiselect: true, sortOrder: 1 },
  });

  const language = await prisma.program.create({
    data: {
      name: 'SpeakUp Language Courses',
      description: 'Learn a new language with a pay-as-you-save plan across partner schools.',
      gracePeriod: 3, entryFee: jr(30), subscriptionPrice: jr(15), amountBlocked: jr(60),
      gallery: JSON.stringify([]),
    },
  });
  await prisma.location.create({
    data: {
      programId: language.id, name: 'SpeakUp Wrocław', description: 'Language school in Wrocław.',
      address: 'ul. Świdnicka 5', city: 'Wrocław', postalCode: '50-001', latitude: 51.1079, longitude: 17.0385,
      purchaseDuration: 9, entryFee: jr(30), subscriptionPrice: jr(15), amountBlocked: jr(60), maxPurchases: 50,
    },
  });

  // VIP program
  const vip = await prisma.program.create({
    data: {
      name: 'Prestige Wellness Club', vip: true,
      description: 'Exclusive VIP wellness membership. Requires a minimum JR balance.',
      gracePeriod: 12, entryFee: jr(200), subscriptionPrice: jr(80), amountBlocked: jr(400), minimalJrForView: jr(500),
      gallery: JSON.stringify([]),
    },
  });
  await prisma.location.create({
    data: {
      programId: vip.id, name: 'Prestige Sopot', description: 'Seaside VIP wellness retreat.',
      address: 'ul. Bohaterów Monte Cassino 1', city: 'Sopot', postalCode: '81-001', latitude: 54.4416, longitude: 18.5601,
      purchaseDuration: 12, entryFee: jr(200), subscriptionPrice: jr(80), amountBlocked: jr(400), maxPurchases: 20,
    },
  });

  // ---- Bonuses ----
  await prisma.program.create({
    data: {
      name: 'Welcome Bonus Pack', isBonus: true, maxPurchases: 1000,
      description: 'A starter bonus with discounted partner vouchers.',
      gracePeriod: 1, entryFee: jr(10), subscriptionPrice: jr(0), amountBlocked: jr(0),
      gallery: JSON.stringify([]),
    },
  });
  await prisma.program.create({
    data: {
      name: 'Cinema Voucher Bonus', isBonus: true, maxPurchases: 200,
      description: 'Redeemable cinema vouchers at partner networks.',
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
  await prisma.transaction.create({ data: { clientId: partner.client!.id, type: 10, value: topUp, plnEquivalent: Math.round((topUp / 100) * rate), paymentId: p1.id, description: 'JR top-up' } });

  // Give Jan some JR and buy the FitLife Warsaw location
  const janTop = jr(500);
  const p2 = await prisma.payment.create({ data: { clientId: client.client!.id, type: 1, status: 2, value: Math.round((janTop / 100) * rate) } });
  await prisma.transaction.create({ data: { clientId: client.client!.id, type: 10, value: janTop, plnEquivalent: Math.round((janTop / 100) * rate), paymentId: p2.id, description: 'JR top-up' } });
  // Jan's top-up earns Anna a commission (3% at 1 downline)
  await prisma.transaction.create({ data: { clientId: partner.client!.id, type: 50, value: Math.round(janTop * 0.03), plnEquivalent: Math.round((janTop * 0.03 / 100) * rate), partnerId: client.client!.id, description: 'Commission 3% from partner top-up' } });

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
  await prisma.transaction.create({ data: { clientId: client.client!.id, type: 20, value: jr(50), plnEquivalent: Math.round((jr(50) / 100) * rate), purchaseId: purchase.id, description: 'Program purchase' } });
  await prisma.transaction.create({ data: { clientId: client.client!.id, type: 70, value: jr(100), plnEquivalent: Math.round((jr(100) / 100) * rate), purchaseId: purchase.id, description: 'Frozen collateral' } });
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
