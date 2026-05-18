const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database…');

  // ── Clean slate ──────────────────────────────────────────────────────────
  await prisma.document.deleteMany();
  await prisma.asset.deleteMany();
  await prisma.debt.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.familyMember.deleteMany();
  await prisma.bankAccount.deleteMany();
  await prisma.nextOfKin.deleteMany();
  await prisma.child.deleteMany();
  await prisma.spouse.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();

  // ── User ─────────────────────────────────────────────────────────────────
  const passwordHash = await bcrypt.hash('password123', 12);

  const user = await prisma.user.create({
    data: {
      email: 'john.doe@example.com',
      passwordHash,
      firstName: 'John',
      lastName: 'Doe',
      birthName: 'John Alexander Doe',
      usedName: 'John Doe',
      dateOfBirth: '1980-05-15',
      placeOfBirth: 'New York, NY',
      phone: '555-0123',
      street: '123 Main St',
      city: 'New York',
      state: 'NY',
      zip: '10001',
      country: 'USA',
      taxId: '123-45-6789',
      annualIncome: 120000,
      netWorth: 750000,
      maritalStatus: 'Married',
    },
  });

  // ── Spouse ────────────────────────────────────────────────────────────────
  await prisma.spouse.create({
    data: {
      userId: user.id,
      birthName: 'Jane Elizabeth Smith',
      usedName: 'Jane Doe',
      firstNames: 'Jane Elizabeth',
      dateOfBirth: '1982-07-22',
      placeOfBirth: 'Boston, MA',
      street: '123 Main St',
      city: 'New York',
      state: 'NY',
      zip: '10001',
      country: 'USA',
      phone: '555-0124',
      email: 'jane.doe@example.com',
    },
  });

  // ── Children ──────────────────────────────────────────────────────────────
  await prisma.child.create({
    data: {
      userId: user.id,
      birthName: 'Emily Grace Doe',
      usedName: 'Emily Doe',
      firstNames: 'Emily Grace',
      dateOfBirth: '2010-03-10',
      placeOfBirth: 'New York, NY',
      street: '123 Main St',
      city: 'New York',
      state: 'NY',
      zip: '10001',
      country: 'USA',
      phone: '555-0125',
      email: 'emily.doe@example.com',
      sortOrder: 0,
    },
  });

  // ── Next of Kin ───────────────────────────────────────────────────────────
  await prisma.nextOfKin.create({
    data: {
      userId: user.id,
      birthName: 'Robert Michael Doe',
      usedName: 'Robert Doe',
      firstNames: 'Robert Michael',
      dateOfBirth: '1955-11-30',
      placeOfBirth: 'Chicago, IL',
      relationship: 'Father',
      street: '456 Oak St',
      city: 'Chicago',
      state: 'IL',
      zip: '60601',
      country: 'USA',
      phone: '555-0126',
      email: 'robert.doe@example.com',
      sortOrder: 0,
    },
  });

  // ── Bank Accounts ─────────────────────────────────────────────────────────
  await prisma.bankAccount.create({
    data: {
      userId: user.id,
      accountName: 'Compte 1',
      bankName: 'Banque Lumière',
      accountType: 'Compte courant',
      accountNumber: 'FR76 1234 5678 9123 4567 8901 234',
      approxBalance: '5 320.75',
      sortOrder: 0,
    },
  });

  await prisma.bankAccount.create({
    data: {
      userId: user.id,
      accountName: 'Épargne',
      bankName: 'Caisse d\'Épargne',
      accountType: 'Livret A',
      accountNumber: 'FR76 9876 5432 1098 7654 3210 123',
      approxBalance: '22 000.00',
      sortOrder: 1,
    },
  });

  // ── Assets ────────────────────────────────────────────────────────────────
  const primaryHome = await prisma.asset.create({
    data: {
      userId: user.id,
      name: 'Primary Home',
      category: 'Real Estate',
      value: 500000,
    },
  });

  await prisma.document.create({
    data: { assetId: primaryHome.id, fileName: 'Deed.pdf' },
  });

  await prisma.asset.create({
    data: {
      userId: user.id,
      name: 'Stock Portfolio',
      category: 'Stocks',
      value: 100000,
    },
  });

  await prisma.asset.create({
    data: {
      userId: user.id,
      name: 'Farm (In Nakuru)',
      category: 'Real Estate',
      value: 200000,
    },
  });

  await prisma.asset.create({
    data: {
      userId: user.id,
      name: 'Life Insurance Policy',
      category: 'Insurance',
      value: 250000,
    },
  });

  await prisma.asset.create({
    data: {
      userId: user.id,
      name: 'Retirement Account (401k)',
      category: 'Retirement',
      value: 180000,
    },
  });

  // ── Debts ─────────────────────────────────────────────────────────────────
  await prisma.debt.create({
    data: {
      userId: user.id,
      name: 'Home Mortgage',
      category: 'Mortgage',
      amount: 300000,
    },
  });

  await prisma.debt.create({
    data: {
      userId: user.id,
      name: 'Car Loan',
      category: 'Car Loan',
      amount: 20000,
    },
  });

  await prisma.debt.create({
    data: {
      userId: user.id,
      name: 'Student Loan',
      category: 'Education',
      amount: 15000,
    },
  });

  // ── Notifications ─────────────────────────────────────────────────────────
  await prisma.notification.createMany({
    data: [
      { userId: user.id, message: 'New document uploaded', createdAt: new Date('2023-10-01'), read: true },
      { userId: user.id, message: 'Asset value updated', createdAt: new Date('2023-10-02'), read: true },
      { userId: user.id, message: 'Quarterly wealth summary is ready', createdAt: new Date('2024-01-15'), read: false },
      { userId: user.id, message: 'Tax document deadline approaching', createdAt: new Date('2024-03-01'), read: false },
    ],
  });

  // ── Family Members ────────────────────────────────────────────────────────
  await prisma.familyMember.createMany({
    data: [
      { userId: user.id, name: 'Jane Doe', email: 'jane@example.com', role: 'Editor' },
      { userId: user.id, name: 'John Smith', email: 'john@example.com', role: 'Viewer' },
      { userId: user.id, name: 'Sarah Doe', email: 'sarah@example.com', role: 'Viewer' },
    ],
  });

  // ── Demo admin user ────────────────────────────────────────────────────────
  await prisma.user.create({
    data: {
      email: 'demo@auprea.com',
      passwordHash: await bcrypt.hash('demo1234', 12),
      firstName: 'Demo',
      lastName: 'User',
      annualIncome: 0,
      netWorth: 0,
      maritalStatus: 'Single',
    },
  });

  console.log('Seeding complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
