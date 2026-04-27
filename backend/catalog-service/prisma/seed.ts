import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create allergens
  const allergens = await Promise.all([
    prisma.allergen.upsert({
      where: { name: 'Gluten' },
      update: {},
      create: { name: 'Gluten', icon: '🌾' },
    }),
    prisma.allergen.upsert({
      where: { name: 'Lactose' },
      update: {},
      create: { name: 'Lactose', icon: '🥛' },
    }),
    prisma.allergen.upsert({
      where: { name: 'Œufs' },
      update: {},
      create: { name: 'Œufs', icon: '🥚' },
    }),
    prisma.allergen.upsert({
      where: { name: 'Fruits à coque' },
      update: {},
      create: { name: 'Fruits à coque', icon: '🥜' },
    }),
    prisma.allergen.upsert({
      where: { name: 'Poisson' },
      update: {},
      create: { name: 'Poisson', icon: '🐟' },
    }),
    prisma.allergen.upsert({
      where: { name: 'Crustacés' },
      update: {},
      create: { name: 'Crustacés', icon: '🦐' },
    }),
    prisma.allergen.upsert({
      where: { name: 'Soja' },
      update: {},
      create: { name: 'Soja', icon: '🫘' },
    }),
    prisma.allergen.upsert({
      where: { name: 'Céleri' },
      update: {},
      create: { name: 'Céleri', icon: '🥬' },
    }),
  ]);

  console.log(`✅ Created ${allergens.length} allergens`);

  // Create categories
  const categories = await Promise.all([
    prisma.category.upsert({
      where: { name: 'Entrées' },
      update: {},
      create: {
        name: 'Entrées',
        description: 'Nos délicieuses entrées pour bien commencer votre repas',
        displayOrder: 1,
      },
    }),
    prisma.category.upsert({
      where: { name: 'Plats principaux' },
      update: {},
      create: {
        name: 'Plats principaux',
        description: 'Plats généreux et savoureux',
        displayOrder: 2,
      },
    }),
    prisma.category.upsert({
      where: { name: 'Desserts' },
      update: {},
      create: {
        name: 'Desserts',
        description: 'Finissez en beauté avec nos desserts maison',
        displayOrder: 3,
      },
    }),
    prisma.category.upsert({
      where: { name: 'Boissons' },
      update: {},
      create: {
        name: 'Boissons',
        description: 'Boissons fraîches et chaudes',
        displayOrder: 4,
      },
    }),
    prisma.category.upsert({
      where: { name: 'Menus événements' },
      update: {},
      create: {
        name: 'Menus événements',
        description: 'Formules spéciales pour vos événements',
        displayOrder: 5,
      },
    }),
  ]);

  console.log(`✅ Created ${categories.length} categories`);

  // Create sample plats
  const entreesCategory = categories.find(c => c.name === 'Entrées')!;
  const platsCategory = categories.find(c => c.name === 'Plats principaux')!;
  const dessertsCategory = categories.find(c => c.name === 'Desserts')!;

  const plats = await Promise.all([
    // Entrées
    prisma.plat.create({
      data: {
        categoryId: entreesCategory.id,
        name: 'Salade César',
        description: 'Salade romaine, poulet grillé, parmesan, croûtons et sauce césar maison',
        price: 12.50,
        preparationTime: 15,
        isHalal: true,
        calories: 350,
        ingredients: 'Salade romaine, poulet, parmesan, croûtons, sauce césar',
      },
    }),
    prisma.plat.create({
      data: {
        categoryId: entreesCategory.id,
        name: 'Velouté de butternut',
        description: 'Velouté onctueux de courge butternut, crème fraîche et noisettes torréfiées',
        price: 9.00,
        preparationTime: 10,
        isVegetarian: true,
        isHalal: true,
        calories: 180,
        ingredients: 'Butternut, crème fraîche, noisettes, huile d\'olive',
      },
    }),
    prisma.plat.create({
      data: {
        categoryId: entreesCategory.id,
        name: 'Foie gras maison',
        description: 'Foie gras de canard mi-cuit, chutney de figues et pain brioché',
        price: 18.00,
        preparationTime: 5,
        calories: 450,
        ingredients: 'Foie gras de canard, figues, pain brioché',
      },
    }),
    
    // Plats principaux
    prisma.plat.create({
      data: {
        categoryId: platsCategory.id,
        name: 'Tajine d\'agneau',
        description: 'Tajine d\'agneau aux pruneaux et amandes, accompagné de semoule',
        price: 22.00,
        preparationTime: 45,
        isHalal: true,
        spiceLevel: 2,
        calories: 650,
        ingredients: 'Agneau, pruneaux, amandes, oignons, épices orientales, semoule',
      },
    }),
    prisma.plat.create({
      data: {
        categoryId: platsCategory.id,
        name: 'Filet de bœuf Rossini',
        description: 'Filet de bœuf, escalope de foie gras poêlée, sauce aux truffes',
        price: 35.00,
        preparationTime: 30,
        calories: 780,
        ingredients: 'Filet de bœuf, foie gras, truffe, sauce demi-glace',
      },
    }),
    prisma.plat.create({
      data: {
        categoryId: platsCategory.id,
        name: 'Risotto aux champignons',
        description: 'Risotto crémeux aux champignons des bois et parmesan',
        price: 18.00,
        preparationTime: 25,
        isVegetarian: true,
        isHalal: true,
        calories: 520,
        ingredients: 'Riz arborio, champignons, parmesan, vin blanc, bouillon',
      },
    }),
    prisma.plat.create({
      data: {
        categoryId: platsCategory.id,
        name: 'Couscous royal',
        description: 'Couscous avec agneau, poulet et merguez, légumes et bouillon parfumé',
        price: 24.00,
        preparationTime: 40,
        isHalal: true,
        spiceLevel: 2,
        calories: 720,
        ingredients: 'Semoule, agneau, poulet, merguez, légumes, pois chiches',
      },
    }),
    
    // Desserts
    prisma.plat.create({
      data: {
        categoryId: dessertsCategory.id,
        name: 'Fondant au chocolat',
        description: 'Fondant au chocolat noir, cœur coulant, glace vanille',
        price: 9.00,
        preparationTime: 15,
        isVegetarian: true,
        isHalal: true,
        calories: 420,
        ingredients: 'Chocolat noir, beurre, œufs, sucre, farine',
      },
    }),
    prisma.plat.create({
      data: {
        categoryId: dessertsCategory.id,
        name: 'Tarte au citron meringuée',
        description: 'Tarte au citron avec meringue italienne légèrement torchée',
        price: 8.00,
        preparationTime: 5,
        isVegetarian: true,
        isHalal: true,
        calories: 320,
        ingredients: 'Pâte sablée, citron, œufs, sucre, meringue',
      },
    }),
    prisma.plat.create({
      data: {
        categoryId: dessertsCategory.id,
        name: 'Panna cotta fruits rouges',
        description: 'Panna cotta à la vanille, coulis de fruits rouges',
        price: 7.50,
        preparationTime: 5,
        isVegetarian: true,
        isGlutenFree: true,
        isHalal: true,
        calories: 280,
        ingredients: 'Crème, vanille, gélatine, fruits rouges',
      },
    }),
  ]);

  console.log(`✅ Created ${plats.length} plats`);

  // Add allergens to some plats
  const glutenAllergen = allergens.find(a => a.name === 'Gluten')!;
  const lactoseAllergen = allergens.find(a => a.name === 'Lactose')!;
  const oeufsAllergen = allergens.find(a => a.name === 'Œufs')!;
  const noisettesAllergen = allergens.find(a => a.name === 'Fruits à coque')!;

  // Find plats and add allergens
  const saladeCesar = plats.find(p => p.name === 'Salade César')!;
  const veloute = plats.find(p => p.name === 'Velouté de butternut')!;
  const fondant = plats.find(p => p.name === 'Fondant au chocolat')!;

  await Promise.all([
    prisma.platAllergen.create({
      data: { platId: saladeCesar.id, allergenId: glutenAllergen.id },
    }),
    prisma.platAllergen.create({
      data: { platId: saladeCesar.id, allergenId: lactoseAllergen.id },
    }),
    prisma.platAllergen.create({
      data: { platId: saladeCesar.id, allergenId: oeufsAllergen.id },
    }),
    prisma.platAllergen.create({
      data: { platId: veloute.id, allergenId: lactoseAllergen.id },
    }),
    prisma.platAllergen.create({
      data: { platId: veloute.id, allergenId: noisettesAllergen.id },
    }),
    prisma.platAllergen.create({
      data: { platId: fondant.id, allergenId: glutenAllergen.id },
    }),
    prisma.platAllergen.create({
      data: { platId: fondant.id, allergenId: lactoseAllergen.id },
    }),
    prisma.platAllergen.create({
      data: { platId: fondant.id, allergenId: oeufsAllergen.id },
    }),
  ]);

  console.log('✅ Added allergens to plats');

  // Create ingredient categories
  const ingredientCategories = await Promise.all([
    prisma.ingredientCategory.upsert({
      where: { name: 'Légumes' },
      update: {},
      create: { name: 'Légumes', description: 'Légumes frais pour la cuisine' },
    }),
    prisma.ingredientCategory.upsert({
      where: { name: 'Viandes' },
      update: {},
      create: { name: 'Viandes', description: 'Viandes de qualité' },
    }),
    prisma.ingredientCategory.upsert({
      where: { name: 'Épices' },
      update: {},
      create: { name: 'Épices', description: 'Épices et condiments' },
    }),
    prisma.ingredientCategory.upsert({
      where: { name: 'Fruits' },
      update: {},
      create: { name: 'Fruits', description: 'Fruits frais' },
    }),
    prisma.ingredientCategory.upsert({
      where: { name: 'Produits laitiers' },
      update: {},
      create: { name: 'Produits laitiers', description: 'Fromages, crèmes, beurre' },
    }),
    prisma.ingredientCategory.upsert({
      where: { name: 'Céréales' },
      update: {},
      create: { name: 'Céréales', description: 'Semoule, riz, farine' },
    }),
  ]);

  console.log(`✅ Created ${ingredientCategories.length} ingredient categories`);

  // Create sample ingredients
  const legumesCat = ingredientCategories.find(c => c.name === 'Légumes')!;
  const viandesCat = ingredientCategories.find(c => c.name === 'Viandes')!;
  const epicesCat = ingredientCategories.find(c => c.name === 'Épices')!;
  const fruitsCat = ingredientCategories.find(c => c.name === 'Fruits')!;
  const laitiersCat = ingredientCategories.find(c => c.name === 'Produits laitiers')!;
  const cerealesCat = ingredientCategories.find(c => c.name === 'Céréales')!;

  await Promise.all([
    // Légumes
    prisma.ingredient.create({
      data: {
        categoryId: legumesCat.id,
        name: 'Tomates',
        unit: 'kg',
        quantity: 25,
        minQuantity: 5,
        lowStockThreshold: 10,
        supplier: 'Marché Central Tunis',
        costPerUnit: 3.5,
        storageLocation: 'Chambre froide 1',
      },
    }),
    prisma.ingredient.create({
      data: {
        categoryId: legumesCat.id,
        name: 'Oignons',
        unit: 'kg',
        quantity: 30,
        minQuantity: 5,
        lowStockThreshold: 10,
        supplier: 'Marché Central Tunis',
        costPerUnit: 2.8,
        storageLocation: 'Chambre froide 1',
      },
    }),
    prisma.ingredient.create({
      data: {
        categoryId: legumesCat.id,
        name: 'Carottes',
        unit: 'kg',
        quantity: 15,
        minQuantity: 3,
        lowStockThreshold: 6,
        supplier: 'Marché Central Tunis',
        costPerUnit: 2.5,
        storageLocation: 'Chambre froide 1',
      },
    }),
    // Viandes
    prisma.ingredient.create({
      data: {
        categoryId: viandesCat.id,
        name: 'Filet de bœuf',
        unit: 'kg',
        quantity: 12,
        minQuantity: 2,
        lowStockThreshold: 5,
        supplier: 'Boucherie La Marsa',
        costPerUnit: 85,
        storageLocation: 'Chambre froide 2',
      },
    }),
    prisma.ingredient.create({
      data: {
        categoryId: viandesCat.id,
        name: 'Agneau',
        unit: 'kg',
        quantity: 18,
        minQuantity: 3,
        lowStockThreshold: 6,
        supplier: 'Boucherie Halal Tunis',
        costPerUnit: 45,
        storageLocation: 'Chambre froide 2',
      },
    }),
    prisma.ingredient.create({
      data: {
        categoryId: viandesCat.id,
        name: 'Poulet',
        unit: 'kg',
        quantity: 20,
        minQuantity: 4,
        lowStockThreshold: 8,
        supplier: 'Ferme Volaille Nabeul',
        costPerUnit: 18,
        storageLocation: 'Chambre froide 2',
      },
    }),
    // Épices
    prisma.ingredient.create({
      data: {
        categoryId: epicesCat.id,
        name: 'Cumin',
        unit: 'kg',
        quantity: 5,
        minQuantity: 0.5,
        lowStockThreshold: 1,
        supplier: 'Épices du Sud',
        costPerUnit: 25,
        storageLocation: 'Étagère épicerie',
      },
    }),
    prisma.ingredient.create({
      data: {
        categoryId: epicesCat.id,
        name: 'Paprika',
        unit: 'kg',
        quantity: 3,
        minQuantity: 0.3,
        lowStockThreshold: 0.5,
        supplier: 'Épices du Sud',
        costPerUnit: 30,
        storageLocation: 'Étagère épicerie',
      },
    }),
    // Fruits
    prisma.ingredient.create({
      data: {
        categoryId: fruitsCat.id,
        name: 'Citron',
        unit: 'kg',
        quantity: 8,
        minQuantity: 2,
        lowStockThreshold: 4,
        supplier: 'Marché Central Tunis',
        costPerUnit: 4,
        storageLocation: 'Chambre froide 1',
      },
    }),
    prisma.ingredient.create({
      data: {
        categoryId: fruitsCat.id,
        name: 'Fraises',
        unit: 'kg',
        quantity: 4,
        minQuantity: 1,
        lowStockThreshold: 2,
        supplier: 'Ferme Jebel Ichkeul',
        costPerUnit: 12,
        storageLocation: 'Chambre froide 1',
      },
    }),
    // Produits laitiers
    prisma.ingredient.create({
      data: {
        categoryId: laitiersCat.id,
        name: 'Beurre',
        unit: 'kg',
        quantity: 10,
        minQuantity: 2,
        lowStockThreshold: 4,
        supplier: 'Laiterie Centrale',
        costPerUnit: 15,
        storageLocation: 'Chambre froide 3',
      },
    }),
    prisma.ingredient.create({
      data: {
        categoryId: laitiersCat.id,
        name: 'Crème fraîche',
        unit: 'L',
        quantity: 12,
        minQuantity: 2,
        lowStockThreshold: 4,
        supplier: 'Laiterie Centrale',
        costPerUnit: 8,
        storageLocation: 'Chambre froide 3',
      },
    }),
    // Céréales
    prisma.ingredient.create({
      data: {
        categoryId: cerealesCat.id,
        name: 'Semoule moyenne',
        unit: 'kg',
        quantity: 50,
        minQuantity: 10,
        lowStockThreshold: 20,
        supplier: 'Minoterie Tunis',
        costPerUnit: 2.2,
        storageLocation: 'Réserve sèche',
      },
    }),
    prisma.ingredient.create({
      data: {
        categoryId: cerealesCat.id,
        name: 'Riz arborio',
        unit: 'kg',
        quantity: 15,
        minQuantity: 3,
        lowStockThreshold: 6,
        supplier: 'Import Italia',
        costPerUnit: 8.5,
        storageLocation: 'Réserve sèche',
      },
    }),
  ]);

  console.log('✅ Created sample ingredients');

  // Create suppliers
  const suppliers = await Promise.all([
    prisma.supplier.upsert({
      where: { name: 'Primeur du Centre' },
      update: {},
      create: {
        name: 'Primeur du Centre',
        contactName: 'Ahmed Ben Salah',
        email: 'contact@primeurcentre.tn',
        phone: '+21674234567',
        address: 'Marché central, Sfax',
        leadTimeDays: 1,
        paymentTerms: 'Net 30',
      },
    }),
    prisma.supplier.upsert({
      where: { name: 'Boucherie Moderne' },
      update: {},
      create: {
        name: 'Boucherie Moderne',
        contactName: 'Ridha Gafsi',
        email: 'commandes@boucherie.tn',
        phone: '+21673234567',
        address: 'Route de Gabès km 3, Sfax',
        leadTimeDays: 1,
        paymentTerms: 'Net 15',
      },
    }),
    prisma.supplier.upsert({
      where: { name: 'Poissonnerie Kerkennah' },
      update: {},
      create: {
        name: 'Poissonnerie Kerkennah',
        contactName: 'Khaled Mrabet',
        email: 'kerkennah@poisson.tn',
        phone: '+21672234567',
        address: 'Port de pêche, Sfax',
        leadTimeDays: 0,
        paymentTerms: 'Cash on delivery',
      },
    }),
    prisma.supplier.upsert({
      where: { name: 'Épicerie Fine Sfax' },
      update: {},
      create: {
        name: 'Épicerie Fine Sfax',
        contactName: 'Samia Jaziri',
        email: 'epicerie@sfax.tn',
        phone: '+21671234567',
        address: 'Avenue Habib Bourguiba, Sfax',
        leadTimeDays: 2,
        paymentTerms: 'Net 30',
      },
    }),
    prisma.supplier.upsert({
      where: { name: 'Laiterie Centrale' },
      update: {},
      create: {
        name: 'Laiterie Centrale',
        contactName: 'Fatma Driss',
        email: 'lait@coop.tn',
        phone: '+21669234567',
        address: 'Zone agricole, Sfax',
        leadTimeDays: 1,
        paymentTerms: 'Net 15',
      },
    }),
  ]);

  console.log(`✅ Created ${suppliers.length} suppliers`);

  // Link some ingredients to suppliers
  const primeur = suppliers.find(s => s.name === 'Primeur du Centre')!;
  const boucherie = suppliers.find(s => s.name === 'Boucherie Moderne')!;
  const laiterie = suppliers.find(s => s.name === 'Laiterie Centrale')!;

  const tomate = await prisma.ingredient.findFirst({ where: { name: 'Tomates' } });
  const agneau = await prisma.ingredient.findFirst({ where: { name: 'Agneau' } });
  const beurre = await prisma.ingredient.findFirst({ where: { name: 'Beurre' } });

  if (tomate) await prisma.ingredient.update({ where: { id: tomate.id }, data: { supplierId: primeur.id } });
  if (agneau) await prisma.ingredient.update({ where: { id: agneau.id }, data: { supplierId: boucherie.id } });
  if (beurre) await prisma.ingredient.update({ where: { id: beurre.id }, data: { supplierId: laiterie.id } });

  console.log('✅ Linked ingredients to suppliers');

  // Create plat-ingredient recipe links (for stock management)
  const couscousRoyal = await prisma.plat.findFirst({ where: { name: 'Couscous royal' } });
  const semoule = await prisma.ingredient.findFirst({ where: { name: 'Semoule moyenne' } });
  const agneauIng = await prisma.ingredient.findFirst({ where: { name: 'Agneau' } });
  const poulet = await prisma.ingredient.findFirst({ where: { name: 'Poulet' } });
  const oignons = await prisma.ingredient.findFirst({ where: { name: 'Oignons' } });
  const risotto = await prisma.plat.findFirst({ where: { name: 'Risotto aux champignons' } });
  const riz = await prisma.ingredient.findFirst({ where: { name: 'Riz arborio' } });
  const creme = await prisma.ingredient.findFirst({ where: { name: 'Crème fraîche' } });
  const tajine = await prisma.plat.findFirst({ where: { name: 'Tajine d\'agneau' } });
  const cumin = await prisma.ingredient.findFirst({ where: { name: 'Cumin' } });

  if (couscousRoyal && semoule) {
    await prisma.platIngredient.upsert({
      where: { platId_ingredientId: { platId: couscousRoyal.id, ingredientId: semoule.id } },
      update: {},
      create: { platId: couscousRoyal.id, ingredientId: semoule.id, quantityPerPlat: 0.2 },
    });
  }
  if (couscousRoyal && agneauIng) {
    await prisma.platIngredient.upsert({
      where: { platId_ingredientId: { platId: couscousRoyal.id, ingredientId: agneauIng.id } },
      update: {},
      create: { platId: couscousRoyal.id, ingredientId: agneauIng.id, quantityPerPlat: 0.15 },
    });
  }
  if (couscousRoyal && poulet) {
    await prisma.platIngredient.upsert({
      where: { platId_ingredientId: { platId: couscousRoyal.id, ingredientId: poulet.id } },
      update: {},
      create: { platId: couscousRoyal.id, ingredientId: poulet.id, quantityPerPlat: 0.1 },
    });
  }
  if (couscousRoyal && oignons) {
    await prisma.platIngredient.upsert({
      where: { platId_ingredientId: { platId: couscousRoyal.id, ingredientId: oignons.id } },
      update: {},
      create: { platId: couscousRoyal.id, ingredientId: oignons.id, quantityPerPlat: 0.1 },
    });
  }
  if (risotto && riz) {
    await prisma.platIngredient.upsert({
      where: { platId_ingredientId: { platId: risotto.id, ingredientId: riz.id } },
      update: {},
      create: { platId: risotto.id, ingredientId: riz.id, quantityPerPlat: 0.15 },
    });
  }
  if (risotto && creme) {
    await prisma.platIngredient.upsert({
      where: { platId_ingredientId: { platId: risotto.id, ingredientId: creme.id } },
      update: {},
      create: { platId: risotto.id, ingredientId: creme.id, quantityPerPlat: 0.05 },
    });
  }
  if (tajine && agneauIng) {
    await prisma.platIngredient.upsert({
      where: { platId_ingredientId: { platId: tajine.id, ingredientId: agneauIng.id } },
      update: {},
      create: { platId: tajine.id, ingredientId: agneauIng.id, quantityPerPlat: 0.2 },
    });
  }
  if (tajine && cumin) {
    await prisma.platIngredient.upsert({
      where: { platId_ingredientId: { platId: tajine.id, ingredientId: cumin.id } },
      update: {},
      create: { platId: tajine.id, ingredientId: cumin.id, quantityPerPlat: 0.01 },
    });
  }

  console.log('✅ Created plat-ingredient recipe links');

  // Create sample expenses
  await Promise.all([
    prisma.expense.create({
      data: {
        title: 'Commande légumes semaine',
        category: 'Matières premières',
        amount: 450.000,
        expenseDate: new Date('2026-04-18'),
        supplierName: 'Primeur du Centre',
        paymentMethod: 'Virement',
        status: 'APPROVED',
      },
    }),
    prisma.expense.create({
      data: {
        title: 'Commande viandes semaine',
        category: 'Matières premières',
        amount: 820.000,
        expenseDate: new Date('2026-04-18'),
        supplierName: 'Boucherie Moderne',
        paymentMethod: 'Chèque',
        status: 'PAID',
      },
    }),
    prisma.expense.create({
      data: {
        title: 'Électricité cuisine',
        category: 'Charges fixes',
        amount: 380.000,
        expenseDate: new Date('2026-04-01'),
        paymentMethod: 'Prélèvement',
        status: 'PAID',
      },
    }),
    prisma.expense.create({
      data: {
        title: 'Produits d\'entretien',
        category: 'Fournitures',
        amount: 120.000,
        expenseDate: new Date('2026-04-15'),
        paymentMethod: 'Espèces',
        status: 'DRAFT',
      },
    }),
  ]);

  console.log('✅ Created sample expenses');

  console.log('🎉 Seeding completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
