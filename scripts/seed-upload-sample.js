// scripts/seed-upload-sample.js
// Populate sample products for upload testing

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding upload sample data...');

  // Create sample establishment if not exists
  let establishment = await prisma.establishment.findFirst({
    where: { name: 'Test Restaurant' },
  });

  if (!establishment) {
    establishment = await prisma.establishment.create({
      data: { name: 'Test Restaurant' },
    });
    console.log('✅ Created test establishment:', establishment.name);
  }

  // Sample products for mercuriale
  const sampleProducts = [
    {
      name: 'Tomates',
      price: 3.5,
      prixParDefaut: 3.5,
      uniteParDefaut: 'kg',
      description: 'Tomates fraîches',
    },
    {
      name: 'Pommes de terre',
      price: 1.2,
      prixParDefaut: 1.2,
      uniteParDefaut: 'kg',
      description: 'Pommes de terre bio',
    },
    {
      name: 'Carottes',
      price: 2.0,
      prixParDefaut: 2.0,
      uniteParDefaut: 'kg',
      description: 'Carottes fraîches',
    },
    {
      name: 'Oignons',
      price: 1.5,
      prixParDefaut: 1.5,
      uniteParDefaut: 'kg',
      description: 'Oignons jaunes',
    },
    {
      name: 'Huile d\'olive',
      price: 12.0,
      prixParDefaut: 12.0,
      uniteParDefaut: 'L',
      description: 'Huile d\'olive extra vierge',
    },
  ];

  let createdCount = 0;

  for (const productData of sampleProducts) {
    const product = await prisma.product.upsert({
      where: { name: productData.name },
      update: {},
      create: productData,
    });

    // Create prix entry
    await prisma.prix.create({
      data: {
        produitId: product.id,
        etablissementId: establishment.id,
        montant: productData.prixParDefaut,
        devise: 'EUR',
        valableDepuis: new Date(),
      },
    });

    createdCount++;
  }

  console.log(`✅ Created/updated ${createdCount} sample products with prices`);

  // Create a sample fiche technique
  const ficheProduit = await prisma.product.upsert({
    where: { name: 'Salade composée' },
    update: {},
    create: {
      name: 'Salade composée',
      price: 8.5,
      prixParDefaut: 8.5,
      uniteParDefaut: 'unit',
      description: 'Salade avec légumes variés',
    },
  });

  const existingFiche = await prisma.ficheTechnique.findUnique({
    where: { produitId: ficheProduit.id },
  });

  if (!existingFiche) {
    await prisma.ficheTechnique.create({
      data: {
        produitId: ficheProduit.id,
        rendement: 4,
        uniteRdt: 'unit',
        notes: 'Fiche technique pour test upload',
      },
    });
    console.log('✅ Created sample fiche technique');
  }

  console.log('🎉 Upload sample data seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
