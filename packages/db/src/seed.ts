import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const roles = ['admin', 'gestion', 'consultation'];
  const paymentMethods = [
    'Virement',
    'Carte bancaire',
    'Prelevement',
    'Cheque',
    'Especes',
    'Autre',
  ];
  const movementTypes = [
    'Operation courante',
    'Virement',
    'Retrait',
    'Depot',
    'Abonnement',
    'Portefeuille',
    'Dividende',
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

  for (const label of paymentMethods) {
    await prisma.paymentMethod.upsert({
      where: { id: label.toLowerCase().replace(/[^a-z0-9]+/g, '-') },
      update: { label, active: true },
      create: {
        id: label.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        label,
        active: true,
      },
    });
  }

  for (const label of movementTypes) {
    await prisma.movementType.upsert({
      where: { id: label.toLowerCase().replace(/[^a-z0-9]+/g, '-') },
      update: { label, active: true },
      create: {
        id: label.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        label,
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
