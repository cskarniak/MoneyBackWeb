import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const roles = ['admin', 'gestion', 'consultation'];
  const paymentMethods = [
    { label: 'Virement', code: 'VIR' },
    { label: 'Carte bancaire', code: 'CB' },
    { label: 'Prelevement', code: 'PRL' },
    { label: 'Cheque', code: 'CHQ' },
    { label: 'Especes', code: 'ESP' },
    { label: 'Autre', code: 'AUT' },
  ];
  const movementTypes = [
    { label: 'Operation courante', code: 'OPE' },
    { label: 'Virement', code: 'VIR' },
    { label: 'Retrait', code: 'RET' },
    { label: 'Depot', code: 'DEP' },
    { label: 'Abonnement', code: 'ABO' },
    { label: 'Portefeuille', code: 'PRT' },
    { label: 'Dividende', code: 'DIV' },
  ];
  const settings = [
    ['app.name', 'MoneyBack Web'],
    ['app.currency', 'EUR'],
    ['app.timezone', 'Europe/Paris'],
  ] as const;

  for (const role of roles) {
    await prisma.role.upsert({
      where: { name: role },
      update: {},
      create: { name: role },
    });
  }

  for (const { label, code } of paymentMethods) {
    await prisma.paymentMethod.upsert({
      where: { id: label.toLowerCase().replace(/[^a-z0-9]+/g, '-') },
      update: { label, code, active: true },
      create: {
        id: label.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        label,
        code,
        active: true,
      },
    });
  }

  for (const { label, code } of movementTypes) {
    await prisma.movementType.upsert({
      where: { id: label.toLowerCase().replace(/[^a-z0-9]+/g, '-') },
      update: { label, code, active: true },
      create: {
        id: label.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        label,
        code,
        active: true,
      },
    });
  }

  for (const [key, value] of settings) {
    await prisma.setting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async error => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
