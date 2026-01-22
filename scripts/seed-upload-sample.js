const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding sample products for upload tests...');

  // Create sample products that could be parsed from invoices/recipes
  const sampleProducts = [
    { name: 'Farine de blé', price: 1.5, uniteParDefaut: 'kg', prixParDefaut: 1.5 },
    { name: 'Sucre blanc', price: 0.8, uniteParDefaut: 'kg', prixParDefaut: 0.8 },
    { name: 'Beurre', price: 6.5, uniteParDefaut: 'kg', prixParDefaut: 6.5 },
    { name: 'Oeufs', price: 0.2, uniteParDefaut: 'unit', prixParDefaut: 0.2 },
    { name: 'Lait entier', price: 1.2, uniteParDefaut: 'L', prixParDefaut: 1.2 },
    { name: 'Tomate', price: 2.5, uniteParDefaut: 'kg', prixParDefaut: 2.5 },
    { name: 'Oignon', price: 1.8, uniteParDefaut: 'kg', prixParDefaut: 1.8 },
    { name: 'Ail', price: 12.0, uniteParDefaut: 'kg', prixParDefaut: 12.0 },
    { name: 'Huile d\'olive', price: 15.0, uniteParDefaut: 'L', prixParDefaut: 15.0 },
    { name: 'Sel', price: 0.5, uniteParDefaut: 'kg', prixParDefaut: 0.5 },
  ];

  const createdProducts = [];

  for (const product of sampleProducts) {
    // Check if product already exists
    const existing = await prisma.product.findFirst({
      where: { name: product.name },
    });

    if (existing) {
      console.log(`Product "${product.name}" already exists, skipping.`);
      createdProducts.push(existing);
    } else {
      const created = await prisma.product.create({
        data: product,
      });
      console.log(`Created product: ${created.name} (id: ${created.id})`);
      createdProducts.push(created);
    }
  }

  // If an establishment exists, create some prix entries
  const establishment = await prisma.establishment.findFirst();
  if (establishment) {
    console.log(`\nCreating prix entries for establishment: ${establishment.name}`);
    
    for (const product of createdProducts.slice(0, 5)) {
      // Create prix for first 5 products
      const existingPrix = await prisma.prix.findFirst({
        where: {
          produitId: product.id,
          etablissementId: establishment.id,
        },
      });

      if (!existingPrix) {
        await prisma.prix.create({
          data: {
            produitId: product.id,
            etablissementId: establishment.id,
            montant: product.price,
            devise: 'EUR',
          },
        });
        console.log(`Created prix for: ${product.name}`);
      }
    }
  } else {
    console.log('\nNo establishment found. Skipping prix entries.');
  }

  console.log('\n✅ Upload sample data seeded successfully!');
  console.log(`Total products: ${createdProducts.length}`);
}

main()
  .catch((e) => {
    console.error('Error seeding data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
