import { PrismaClient } from '@prisma/client';
declare const process: { exit(code?: number): never; env: Record<string, string | undefined> };

const prisma = new PrismaClient();

async function ensureCategory() {
  return prisma.category.upsert({
    where: { name: 'Spécialités tunisiennes' },
    update: {
      description: 'Cuisine tunisienne authentique: entrées, plats traditionnels et douceurs',
      displayOrder: 6,
      isActive: true,
    },
    create: {
      name: 'Spécialités tunisiennes',
      description: 'Cuisine tunisienne authentique: entrées, plats traditionnels et douceurs',
      displayOrder: 6,
      isActive: true,
    },
  });
}

async function ensureNamedCategory(name: string, description: string, displayOrder: number) {
  return prisma.category.upsert({
    where: { name },
    update: {
      description,
      displayOrder,
      isActive: true,
    },
    create: {
      name,
      description,
      displayOrder,
      isActive: true,
    },
  });
}

async function ensurePlat(categoryId: string, data: {
  name: string;
  description: string;
  price: number;
  preparationTime?: number;
  isVegetarian?: boolean;
  isVegan?: boolean;
  isHalal?: boolean;
  isGlutenFree?: boolean;
  spiceLevel?: number;
  calories?: number;
  ingredients?: string;
}) {
  const existing = await prisma.plat.findFirst({
    where: {
      categoryId,
      name: data.name,
    },
  });

  if (existing) {
    return prisma.plat.update({
      where: { id: existing.id },
      data,
    });
  }

  return prisma.plat.create({
    data: {
      categoryId,
      ...data,
    },
  });
}

async function main() {
  console.log('🇹🇳 Seeding Tunisian category and plats...');

  const tunisianCategory = await ensureCategory();
  const tunisianStreetFoodCategory = await ensureNamedCategory(
    'Street food tunisien',
    'Sandwiches et snacks tunisiens populaires',
    7,
  );
  const tunisianDrinksCategory = await ensureNamedCategory(
    'Boissons tunisiennes',
    'Boissons chaudes et fraîches inspirées de la tradition tunisienne',
    8,
  );
  const tunisianPastriesCategory = await ensureNamedCategory(
    'Pâtisseries tunisiennes',
    'Douceurs tunisiennes artisanales',
    9,
  );

  const tunisianPlats = [
    {
      name: 'Brik à l’œuf et thon',
      description: 'Feuille croustillante farcie au thon, œuf coulant, câpres et persil.',
      price: 8.5,
      preparationTime: 12,
      isHalal: true,
      spiceLevel: 1,
      calories: 320,
      ingredients: 'Malsouka, œuf, thon, câpres, persil, oignon',
    },
    {
      name: 'Ojja merguez',
      description: 'Ragoût de tomates épicé avec merguez et œufs, servi chaud.',
      price: 13.0,
      preparationTime: 18,
      isHalal: true,
      spiceLevel: 3,
      calories: 540,
      ingredients: 'Tomates, merguez, œufs, ail, harissa, huile d’olive',
    },
    {
      name: 'Lablabi',
      description: 'Soupe tunisienne de pois chiches au pain, harissa et citron.',
      price: 9.5,
      preparationTime: 15,
      isVegetarian: true,
      isVegan: true,
      isHalal: true,
      spiceLevel: 2,
      calories: 390,
      ingredients: 'Pois chiches, ail, cumin, harissa, pain, citron, huile d’olive',
    },
    {
      name: 'Couscous tunisien au poisson',
      description: 'Couscous rouge au poisson et légumes, parfumé aux épices tunisiennes.',
      price: 21.0,
      preparationTime: 40,
      isHalal: true,
      spiceLevel: 2,
      calories: 680,
      ingredients: 'Semoule, poisson, tomates, piments, carottes, courgettes, pois chiches',
    },
    {
      name: 'Kamounia de bœuf',
      description: 'Ragoût de bœuf au cumin, sauce onctueuse et relevée.',
      price: 19.0,
      preparationTime: 45,
      isHalal: true,
      spiceLevel: 2,
      calories: 620,
      ingredients: 'Bœuf, cumin, ail, tomate concentrée, huile d’olive, piment',
    },
    {
      name: 'Makroud',
      description: 'Pâtisserie traditionnelle à la semoule fourrée aux dattes et miel.',
      price: 6.0,
      preparationTime: 8,
      isVegetarian: true,
      isHalal: true,
      calories: 280,
      ingredients: 'Semoule, dattes, beurre, miel, fleur d’oranger',
    },
  ];

  for (const plat of tunisianPlats) {
    await ensurePlat(tunisianCategory.id, plat);
  }

  const streetFoodPlats = [
    {
      name: 'Fricassé tunisien',
      description: 'Petit pain frit garni de thon, œuf, olives, harissa et pommes de terre.',
      price: 7.5,
      preparationTime: 12,
      isHalal: true,
      spiceLevel: 2,
      calories: 430,
      ingredients: 'Pain frit, thon, œuf, olives, pommes de terre, harissa',
    },
    {
      name: 'Mlewi thon-harissa',
      description: 'Galette feuilletée garnie de thon, fromage et sauce harissa maison.',
      price: 8.0,
      preparationTime: 10,
      isHalal: true,
      spiceLevel: 2,
      calories: 470,
      ingredients: 'Mlewi, thon, fromage, harissa, oignon',
    },
    {
      name: 'Chapati tunisien escalope',
      description: 'Pain chapati farci avec escalope, fromage et légumes croquants.',
      price: 11.0,
      preparationTime: 14,
      isHalal: true,
      spiceLevel: 1,
      calories: 560,
      ingredients: 'Pain chapati, escalope, fromage, salade, tomate, mayonnaise',
    },
  ];

  const tunisianDrinks = [
    {
      name: 'Thé à la menthe tunisien',
      description: 'Thé vert infusé à la menthe fraîche, servi sucré avec pignons.',
      price: 3.5,
      preparationTime: 6,
      isVegetarian: true,
      isVegan: true,
      isHalal: true,
      calories: 90,
      ingredients: 'Thé vert, menthe fraîche, sucre, pignons',
    },
    {
      name: 'Citronnade tunisienne',
      description: 'Boisson fraîche au citron, eau de fleur d’oranger et menthe.',
      price: 4.5,
      preparationTime: 5,
      isVegetarian: true,
      isVegan: true,
      isHalal: true,
      isGlutenFree: true,
      calories: 120,
      ingredients: 'Citron, eau, sucre, fleur d’oranger, menthe',
    },
    {
      name: 'Jus de grenade',
      description: 'Jus pressé de grenade, légèrement acidulé et rafraîchissant.',
      price: 5.0,
      preparationTime: 4,
      isVegetarian: true,
      isVegan: true,
      isHalal: true,
      isGlutenFree: true,
      calories: 110,
      ingredients: 'Grenade fraîche pressée',
    },
  ];

  const tunisianPastries = [
    {
      name: 'Baklawa tunisienne',
      description: 'Feuilleté aux fruits secs et sirop de miel, spécialité festive.',
      price: 6.5,
      preparationTime: 7,
      isVegetarian: true,
      isHalal: true,
      calories: 320,
      ingredients: 'Pâte filo, amandes, pistaches, miel, beurre',
    },
    {
      name: 'Yoyo tunisien',
      description: 'Beignet traditionnel parfumé, glacé au citron et pistaches.',
      price: 5.5,
      preparationTime: 6,
      isVegetarian: true,
      isHalal: true,
      calories: 290,
      ingredients: 'Farine, œufs, sucre, citron, pistaches',
    },
    {
      name: 'Kaak warka',
      description: 'Biscuit fin fourré à la pâte d’amande, parfumé à la fleur d’oranger.',
      price: 5.0,
      preparationTime: 5,
      isVegetarian: true,
      isHalal: true,
      calories: 260,
      ingredients: 'Amandes, sucre, farine, fleur d’oranger',
    },
  ];

  for (const plat of streetFoodPlats) {
    await ensurePlat(tunisianStreetFoodCategory.id, plat);
  }

  for (const drink of tunisianDrinks) {
    await ensurePlat(tunisianDrinksCategory.id, drink);
  }

  for (const pastry of tunisianPastries) {
    await ensurePlat(tunisianPastriesCategory.id, pastry);
  }

  console.log(`✅ Category ready: ${tunisianCategory.name}`);
  console.log(`✅ Tunisian plats upserted: ${tunisianPlats.length}`);
  console.log(`✅ Street food plats upserted: ${streetFoodPlats.length}`);
  console.log(`✅ Tunisian drinks upserted: ${tunisianDrinks.length}`);
  console.log(`✅ Tunisian pastries upserted: ${tunisianPastries.length}`);
  console.log('🎉 Tunisian seed completed');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
