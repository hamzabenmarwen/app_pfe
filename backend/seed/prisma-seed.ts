// ============================================================
// PRISMA SEED SCRIPT - Assiette Gala Sfaxienne
// Usage: npx prisma db seed
// ============================================================

import { PrismaClient, OrderStatus, Role } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Démarrage du seeding...\n');

  // ============================================================
  // 1. USERS (Auth Service)
  // ============================================================
  console.log('👥 Création des utilisateurs...');
  
  const hashedPassword = await bcrypt.hash('password123', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'omar.daoud@assiettegala.tn' },
    update: {},
    create: {
      email: 'omar.daoud@assiettegala.tn',
      password: hashedPassword,
      firstName: 'Omar',
      lastName: 'Daoud',
      phone: '24230587',
      role: Role.ADMIN,
      isVerified: true,
    },
  });
  console.log(`  ✓ Admin créé: ${admin.firstName} ${admin.lastName}`);

  const clients = await Promise.all([
    prisma.user.upsert({
      where: { email: 'client1@email.tn' },
      update: {},
      create: {
        email: 'client1@email.tn',
        password: hashedPassword,
        firstName: 'Ahmed',
        lastName: 'Ben Ali',
        phone: '20123456',
        role: Role.CLIENT,
        isVerified: true,
      },
    }),
    prisma.user.upsert({
      where: { email: 'client2@email.tn' },
      update: {},
      create: {
        email: 'client2@email.tn',
        password: hashedPassword,
        firstName: 'Fatima',
        lastName: 'Trabelsi',
        phone: '22123456',
        role: Role.CLIENT,
        isVerified: true,
      },
    }),
    prisma.user.upsert({
      where: { email: 'client3@email.tn' },
      update: {},
      create: {
        email: 'client3@email.tn',
        password: hashedPassword,
        firstName: 'Mohamed',
        lastName: 'Sassi',
        phone: '23123456',
        role: Role.CLIENT,
        isVerified: true,
      },
    }),
  ]);
  console.log(`  ✓ ${clients.length} clients créés\n`);

  // ============================================================
  // 2. CATEGORIES & ALLERGENS (Catalog Service)
  // ============================================================
  console.log('🍽️  Création des catégories et allergènes...');

  const categories = await Promise.all([
    prisma.category.upsert({ where: { name: 'Entrées' }, update: {}, create: { name: 'Entrées', description: 'Salades et hors-dœuvre variés' } }),
    prisma.category.upsert({ where: { name: 'Plats Principaux' }, update: {}, create: { name: 'Plats Principaux', description: 'Spécialités de la maison' } }),
    prisma.category.upsert({ where: { name: 'Grillades' }, update: {}, create: { name: 'Grillades', description: 'Viandes et poissons grillés' } }),
    prisma.category.upsert({ where: { name: 'Couscous' }, update: {}, create: { name: 'Couscous', description: 'Couscous traditionnels tunisiens' } }),
    prisma.category.upsert({ where: { name: 'Desserts' }, update: {}, create: { name: 'Desserts', description: 'Pâtisseries orientales et desserts' } }),
    prisma.category.upsert({ where: { name: 'Boissons' }, update: {}, create: { name: 'Boissons', description: 'Jus frais et boissons' } }),
  ]);
  console.log(`  ✓ ${categories.length} catégories créées`);

  const allergens = await Promise.all([
    prisma.allergen.upsert({ where: { name: 'Gluten' }, update: {}, create: { name: 'Gluten' } }),
    prisma.allergen.upsert({ where: { name: 'Crustacés' }, update: {}, create: { name: 'Crustacés' } }),
    prisma.allergen.upsert({ where: { name: 'Œufs' }, update: {}, create: { name: 'Œufs' } }),
    prisma.allergen.upsert({ where: { name: 'Poisson' }, update: {}, create: { name: 'Poisson' } }),
    prisma.allergen.upsert({ where: { name: 'Arachides' }, update: {}, create: { name: 'Arachides' } }),
    prisma.allergen.upsert({ where: { name: 'Lait' }, update: {}, create: { name: 'Lait' } }),
    prisma.allergen.upsert({ where: { name: 'Sésame' }, update: {}, create: { name: 'Sésame' } }),
  ]);
  console.log(`  ✓ ${allergens.length} allergènes créés\n`);

  // ============================================================
  // 3. PLATS (Catalog Service)
  // ============================================================
  console.log('🥘 Création des plats...');

  const platsData = [
    { name: 'Salade Mechouia', description: 'Poivrons et tomates grillés, assaisonnés à lhuile dolive', price: 8.50, category: 'Entrées', allergens: [] },
    { name: 'Brik à lœuf', description: 'Feuille de brick croustillante garnie dœuf et de thon', price: 5.00, category: 'Entrées', allergens: ['Œufs', 'Poisson'] },
    { name: 'Salade Niçoise', description: 'Thon, œufs, haricots verts, olives et pommes de terre', price: 12.00, category: 'Entrées', allergens: ['Œufs', 'Poisson'] },
    { name: 'Gratin de crevettes', description: 'Crevettes gratinées au fromage et béchamel', price: 25.00, category: 'Plats Principaux', allergens: ['Crustacés', 'Lait'] },
    { name: 'Filet de daurade', description: 'Filet de daurade grillé, sauce citron et herbes', price: 22.00, category: 'Plats Principaux', allergens: ['Poisson'] },
    { name: 'Ojja crevettes', description: 'Sauce tomate épicée aux crevettes et aux œufs', price: 18.00, category: 'Plats Principaux', allergens: ['Crustacés', 'Œufs'] },
    { name: 'Mixed Grill (4 viandes)', description: 'Agneau, bœuf, poulet et merguez, marinade maison', price: 35.00, category: 'Grillades', allergens: ['Sésame'] },
    { name: 'Brochette de crevettes x6', description: 'Crevettes marinées, grillées à la perfection', price: 28.00, category: 'Grillades', allergens: ['Crustacés'] },
    { name: 'Couscous Royal', description: 'Agneau, poulet, merguez, légumes variés', price: 28.00, category: 'Couscous', allergens: [] },
    { name: 'Couscous aux crevettes', description: 'Crevettes, calamars et poisson, légumes', price: 32.00, category: 'Couscous', allergens: ['Crustacés', 'Poisson'] },
    { name: 'Couscous végétarien', description: 'Légumes de saison, pois chiches, raisins secs', price: 18.00, category: 'Couscous', allergens: ['Gluten'] },
    { name: 'Assiette de pâtisseries orientales', description: 'Baklava, kaak, ghribia (6 pièces)', price: 15.00, category: 'Desserts', allergens: ['Gluten', 'Arachides', 'Lait', 'Sésame'] },
    { name: 'Jus dorange frais', description: 'Pressé à la commande', price: 5.00, category: 'Boissons', allergens: [] },
  ];

  for (const platData of platsData) {
    const category = categories.find(c => c.name === platData.category);
    const platAllergens = allergens.filter(a => platData.allergens.includes(a.name));

    await prisma.plat.upsert({
      where: { name: platData.name },
      update: {},
      create: {
        name: platData.name,
        description: platData.description,
        price: platData.price,
        image: `https://res.cloudinary.com/demo/assiette/${platData.name.toLowerCase().replace(/\s+/g, '-')}.jpg`,
        isAvailable: true,
        categoryId: category!.id,
        allergens: { connect: platAllergens.map(a => ({ id: a.id })) },
      },
    });
  }
  console.log(`  ✓ ${platsData.length} plats créés\n`);

  // ============================================================
  // 4. ORDERS (Order Service)
  // ============================================================
  console.log('📦 Création des commandes...');

  const plats = await prisma.plat.findMany();

  // Commande 1: Livrée
  const order1 = await prisma.order.create({
    data: {
      orderNumber: 'ORD-250115-A1B2',
      userId: clients[0].id,
      status: OrderStatus.DELIVERED,
      totalAmount: 52.50,
      deliveryFee: 7.00,
      vatAmount: 8.50,
      deliveryAddress: '15 Rue de Marseille, Sfax',
      paymentMethod: 'CASH_ON_DELIVERY',
      notes: 'Sonner à linterphone',
      createdAt: new Date('2025-01-15T12:30:00'),
      updatedAt: new Date('2025-01-15T14:00:00'),
      items: {
        create: [
          { platId: plats.find(p => p.name === 'Gratin de crevettes')!.id, platName: 'Gratin de crevettes', unitPrice: 25.00, quantity: 1 },
          { platId: plats.find(p => p.name === 'Assiette de pâtisseries orientales')!.id, platName: 'Assiette de pâtisseries orientales', unitPrice: 15.00, quantity: 1 },
          { platId: plats.find(p => p.name === 'Jus dorange frais')!.id, platName: 'Jus dorange frais', unitPrice: 5.00, quantity: 1 },
        ],
      },
    },
  });
  console.log(`  ✓ Commande ${order1.orderNumber} créée (DELIVERED)`);

  // Commande 2: Livrée - Grosse commande
  const order2 = await prisma.order.create({
    data: {
      orderNumber: 'ORD-250120-C3D4',
      userId: clients[1].id,
      status: OrderStatus.DELIVERED,
      totalAmount: 85.00,
      deliveryFee: 7.00,
      vatAmount: 13.77,
      deliveryAddress: '25 Avenue Hedi Chaker, Sfax',
      paymentMethod: 'CASH_ON_DELIVERY',
      createdAt: new Date('2025-01-20T11:45:00'),
      updatedAt: new Date('2025-01-20T13:30:00'),
      items: {
        create: [
          { platId: plats.find(p => p.name === 'Mixed Grill (4 viandes)')!.id, platName: 'Mixed Grill (4 viandes)', unitPrice: 35.00, quantity: 1 },
          { platId: plats.find(p => p.name === 'Gratin de crevettes')!.id, platName: 'Gratin de crevettes', unitPrice: 25.00, quantity: 1 },
        ],
      },
    },
  });
  console.log(`  ✓ Commande ${order2.orderNumber} créée (DELIVERED)`);

  // Commande 3: En attente (pour démo dashboard)
  const order3 = await prisma.order.create({
    data: {
      orderNumber: 'ORD-260420-K1L2',
      userId: clients[0].id,
      status: OrderStatus.PENDING,
      totalAmount: 48.50,
      deliveryFee: 7.00,
      vatAmount: 7.85,
      deliveryAddress: '15 Rue de Marseille, Sfax',
      paymentMethod: 'CASH_ON_DELIVERY',
      notes: 'Livrer avant 13h',
      createdAt: new Date(),
      updatedAt: new Date(),
      items: {
        create: [
          { platId: plats.find(p => p.name === 'Filet de daurade')!.id, platName: 'Filet de daurade', unitPrice: 22.00, quantity: 1 },
          { platId: plats.find(p => p.name === 'Brik à lœuf')!.id, platName: 'Brik à lœuf', unitPrice: 5.00, quantity: 2 },
        ],
      },
    },
  });
  console.log(`  ✓ Commande ${order3.orderNumber} créée (PENDING - visible sur dashboard)`);

  // Commande 4: Annulée (pour taux de conversion)
  const order4 = await prisma.order.create({
    data: {
      orderNumber: 'ORD-250130-Q7R8',
      userId: clients[1].id,
      status: OrderStatus.CANCELLED,
      totalAmount: 45.00,
      deliveryFee: 7.00,
      vatAmount: 7.28,
      deliveryAddress: '25 Avenue Hedi Chaker, Sfax',
      paymentMethod: 'CASH_ON_DELIVERY',
      notes: 'Client a annulé',
      createdAt: new Date('2025-01-30T18:00:00'),
      updatedAt: new Date('2025-01-30T18:15:00'),
      items: {
        create: [
          { platId: plats.find(p => p.name === 'Couscous Royal')!.id, platName: 'Couscous Royal', unitPrice: 28.00, quantity: 1 },
        ],
      },
    },
  });
  console.log(`  ✓ Commande ${order4.orderNumber} créée (CANCELLED - pour stats)\n`);

  console.log('✅ Seeding terminé avec succès !\n');
  console.log('📊 Résumé:');
  console.log(`   - 1 Admin (Omar Daoud)`);
  console.log(`   - ${clients.length} Clients`);
  console.log(`   - ${categories.length} Catégories`);
  console.log(`   - ${allergens.length} Allergènes`);
  console.log(`   - ${platsData.length} Plats`);
  console.log(`   - 4 Commandes (2 livrées, 1 en attente, 1 annulée)`);
  console.log('\n🔑 Identifiants de test:');
  console.log(`   Admin: omar.daoud@assiettegala.tn / password123`);
  console.log(`   Client: client1@email.tn / password123`);
}

main()
  .catch((e) => {
    console.error('❌ Erreur pendant le seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
