import { PrismaClient, EventType, EventStatus, QuoteStatus, EventInvoiceStatus, EventInvoicePaymentStatus, EventInvoicePaymentMethod } from '@prisma/client';

const prisma = new PrismaClient();

// Must match auth-service seed user IDs
const USERS = {
  admin: 'seed-admin-001',
  client1: 'seed-client-001',
  client2: 'seed-client-002',
  client3: 'seed-client-003',
  client4: 'seed-client-004',
};

async function main() {
  console.log('🌱 Seeding event-service...');

  // Clean existing seed data
  await prisma.eventInvoicePayment.deleteMany({ where: { id: { startsWith: 'seed-' } } });
  await prisma.eventInvoice.deleteMany({ where: { id: { startsWith: 'seed-' } } });
  await prisma.quoteItem.deleteMany({ where: { id: { startsWith: 'seed-' } } });
  await prisma.quote.deleteMany({ where: { id: { startsWith: 'seed-' } } });
  await prisma.eventMenuItem.deleteMany({ where: { id: { startsWith: 'seed-' } } });
  await prisma.event.deleteMany({ where: { id: { startsWith: 'seed-' } } });

  // Event templates
  const templates = await Promise.all([
    prisma.eventTemplate.upsert({
      where: { id: 'seed-tpl-001' },
      update: {},
      create: {
        id: 'seed-tpl-001',
        name: 'Mariage Traditionnel',
        eventType: EventType.WEDDING,
        description: 'Formule complète pour un mariage traditionnel tunisien avec entrées, plats, desserts et boissons.',
        defaultGuestCount: 150,
        defaultServiceType: 'Buffet',
        suggestedBudgetMin: 8000,
        suggestedBudgetMax: 15000,
        suggestedItems: [],
        isActive: true,
      },
    }),
    prisma.eventTemplate.upsert({
      where: { id: 'seed-tpl-002' },
      update: {},
      create: {
        id: 'seed-tpl-002',
        name: 'Cocktail d\'Entreprise',
        eventType: EventType.CORPORATE,
        description: 'Cocktail dinatoire pour événements professionnels avec amuse-bouches et boissons.',
        defaultGuestCount: 80,
        defaultServiceType: 'Cocktail',
        suggestedBudgetMin: 3000,
        suggestedBudgetMax: 6000,
        suggestedItems: [],
        isActive: true,
      },
    }),
    prisma.eventTemplate.upsert({
      where: { id: 'seed-tpl-003' },
      update: {},
      create: {
        id: 'seed-tpl-003',
        name: 'Anniversaire Prestige',
        eventType: EventType.BIRTHDAY,
        description: 'Fête d\'anniversaire avec service traiteur complet, gâteau personnalisé.',
        defaultGuestCount: 40,
        defaultServiceType: 'Service à table',
        suggestedBudgetMin: 1200,
        suggestedBudgetMax: 3000,
        suggestedItems: [],
        isActive: true,
      },
    }),
  ]);

  console.log(`✅ Created ${templates.length} event templates`);

  // Events
  const events = await Promise.all([
    // Confirmed wedding
    prisma.event.create({
      data: {
        id: 'seed-evt-001',
        userId: USERS.client1,
        name: 'Mariage Ahmed & Salma',
        eventType: EventType.WEDDING,
        status: EventStatus.CONFIRMED,
        eventDate: new Date('2026-06-15T17:00:00'),
        startTime: '17:00',
        endTime: '02:00',
        venue: { name: 'Salle El Jem', address: 'Route de Gabès', city: 'Sfax', zipCode: '3010', country: 'Tunisie' },
        guestCount: 120,
        dietaryRequirements: { vegetarian: 15, vegan: 5, halal: 100 },
        serviceType: 'Buffet',
        budget: 8500,
        budgetFlexible: true,
        contactName: 'Ahmed Ben Ali',
        contactPhone: '+21620123456',
        contactEmail: 'ahmed.benali@email.tn',
        menuItems: {
          create: [
            { id: 'seed-emi-001', platId: 'plat-001', platName: 'Salade Mechouia', category: 'Entrées', quantity: 120 },
            { id: 'seed-emi-002', platId: 'plat-002', platName: 'Brik à l\'œuf', category: 'Entrées', quantity: 120 },
            { id: 'seed-emi-003', platId: 'plat-011', platName: 'Couscous Royal', category: 'Plats principaux', quantity: 120 },
            { id: 'seed-emi-004', platId: 'plat-008', platName: 'Mixed Grill (4 viandes)', category: 'Plats principaux', quantity: 60 },
            { id: 'seed-emi-005', platId: 'plat-014', platName: 'Assiette de pâtisseries orientales', category: 'Desserts', quantity: 120 },
          ],
        },
      },
    }),

    // Confirmed corporate event
    prisma.event.create({
      data: {
        id: 'seed-evt-002',
        userId: USERS.client4,
        name: 'Déjeuner Fin d\'Année Sfax Tech',
        eventType: EventType.CORPORATE,
        status: EventStatus.CONFIRMED,
        eventDate: new Date('2026-05-20T12:00:00'),
        startTime: '12:00',
        endTime: '15:00',
        venue: { name: 'Hôtel Les Oliviers', address: 'Avenue Habib Bourguiba', city: 'Sfax', zipCode: '3000', country: 'Tunisie' },
        guestCount: 80,
        serviceType: 'Service à table',
        budget: 3200,
        contactName: 'Sfax Tech',
        contactPhone: '+21671123456',
        contactEmail: 'contact@sfaxtech.tn',
        menuItems: {
          create: [
            { id: 'seed-emi-006', platId: 'plat-003', platName: 'Salade Niçoise', category: 'Entrées', quantity: 80 },
            { id: 'seed-emi-007', platId: 'plat-007', platName: 'Cordon bleu de poulet', category: 'Plats principaux', quantity: 80 },
            { id: 'seed-emi-008', platId: 'plat-015', platName: 'Crème caramel maison', category: 'Desserts', quantity: 80 },
          ],
        },
      },
    }),

    // Confirmed birthday
    prisma.event.create({
      data: {
        id: 'seed-evt-003',
        userId: USERS.client2,
        name: 'Anniversaire 40 ans Fatima',
        eventType: EventType.BIRTHDAY,
        status: EventStatus.CONFIRMED,
        eventDate: new Date('2026-05-10T19:00:00'),
        startTime: '19:00',
        endTime: '23:00',
        venue: { name: 'Villa Les Jasmins', address: 'Route de la Plage', city: 'Sfax', zipCode: '3000', country: 'Tunisie' },
        guestCount: 40,
        serviceType: 'Cocktail',
        budget: 1200,
        contactName: 'Fatima Trabelsi',
        contactPhone: '+21622123456',
        contactEmail: 'fatima.trabelsi@email.tn',
        menuItems: {
          create: [
            { id: 'seed-emi-009', platId: 'plat-001', platName: 'Salade Mechouia', category: 'Entrées', quantity: 40 },
            { id: 'seed-emi-010', platId: 'plat-009', platName: 'Brochette de crevettes x6', category: 'Plats principaux', quantity: 20 },
            { id: 'seed-emi-011', platId: 'plat-016', platName: 'Salade de fruits frais', category: 'Desserts', quantity: 40 },
          ],
        },
      },
    }),

    // Pending quote - wedding
    prisma.event.create({
      data: {
        id: 'seed-evt-004',
        userId: USERS.client3,
        name: 'Grand Mariage Mohamed',
        eventType: EventType.WEDDING,
        status: EventStatus.PENDING_QUOTE,
        eventDate: new Date('2026-09-10T16:00:00'),
        startTime: '16:00',
        endTime: '04:00',
        venue: { address: 'À confirmer', city: 'Sfax', zipCode: '3000', country: 'Tunisie' },
        guestCount: 200,
        dietaryRequirements: { halal: 200 },
        serviceType: 'Buffet',
        budget: 12000,
        budgetFlexible: true,
        specialRequests: '3 services (cocktail, dîner, buffet tardif). Piste de danse.',
        contactName: 'Mohamed Sassi',
        contactPhone: '+21623123456',
        contactEmail: 'mohamed.sassi@email.tn',
      },
    }),

    // Pending quote - conference
    prisma.event.create({
      data: {
        id: 'seed-evt-005',
        userId: USERS.client4,
        name: 'Conférence Tech Sfax 2026',
        eventType: EventType.CONFERENCE,
        status: EventStatus.PENDING_QUOTE,
        eventDate: new Date('2026-07-01T09:00:00'),
        startTime: '09:00',
        endTime: '18:00',
        venue: { name: 'Centre des Congrès', address: 'Route de l\'Aéroport', city: 'Sfax', zipCode: '3060', country: 'Tunisie' },
        guestCount: 150,
        serviceType: 'Cocktail',
        budget: 5500,
        specialRequests: 'Pause café matin et après-midi, déjeuner debout.',
        contactName: 'Sfax Tech',
        contactPhone: '+21671123456',
        contactEmail: 'contact@sfaxtech.tn',
      },
    }),

    // Draft event
    prisma.event.create({
      data: {
        id: 'seed-evt-006',
        userId: USERS.client1,
        name: 'Fête fin d\'étude',
        eventType: EventType.GRADUATION,
        status: EventStatus.DRAFT,
        eventDate: new Date('2026-07-20T19:00:00'),
        guestCount: 30,
        budget: 800,
        contactName: 'Ahmed Ben Ali',
        contactPhone: '+21620123456',
      },
    }),
  ]);

  console.log(`✅ Created ${events.length} events`);

  // Quotes for confirmed events
  const quotes = await Promise.all([
    prisma.quote.create({
      data: {
        id: 'seed-qt-001',
        eventId: 'seed-evt-001',
        quoteNumber: 'QT-20260401-A1',
        status: QuoteStatus.ACCEPTED,
        subtotal: 7200,
        serviceFee: 720,
        deliveryFee: 300,
        tax: 1368,
        discount: 0,
        totalAmount: 9588,
        validUntil: new Date('2026-05-01'),
        notes: 'Formule mariage traditionnel avec service buffet complet.',
        termsConditions: 'Acompte de 30% à la signature, solde 7 jours avant l\'événement.',
        sentAt: new Date('2026-04-01'),
        viewedAt: new Date('2026-04-02'),
        respondedAt: new Date('2026-04-05'),
        items: {
          create: [
            { id: 'seed-qi-001', platId: 'plat-001', name: 'Salade Mechouia', category: 'Entrées', quantity: 120, unitPrice: 8.50, totalPrice: 1020 },
            { id: 'seed-qi-002', platId: 'plat-002', name: 'Brik à l\'œuf', category: 'Entrées', quantity: 120, unitPrice: 5.00, totalPrice: 600 },
            { id: 'seed-qi-003', platId: 'plat-011', name: 'Couscous Royal', category: 'Plats principaux', quantity: 120, unitPrice: 28.00, totalPrice: 3360 },
            { id: 'seed-qi-004', platId: 'plat-008', name: 'Mixed Grill (4 viandes)', category: 'Plats principaux', quantity: 60, unitPrice: 35.00, totalPrice: 2100 },
            { id: 'seed-qi-005', platId: 'plat-014', name: 'Assiette de pâtisseries orientales', category: 'Desserts', quantity: 120, unitPrice: 15.00, totalPrice: 1800 },
          ],
        },
      },
    }),
    prisma.quote.create({
      data: {
        id: 'seed-qt-002',
        eventId: 'seed-evt-002',
        quoteNumber: 'QT-20260402-B2',
        status: QuoteStatus.ACCEPTED,
        subtotal: 2560,
        serviceFee: 256,
        deliveryFee: 0,
        tax: 486.40,
        totalAmount: 3302.40,
        validUntil: new Date('2026-05-01'),
        sentAt: new Date('2026-04-02'),
        viewedAt: new Date('2026-04-03'),
        respondedAt: new Date('2026-04-04'),
        items: {
          create: [
            { id: 'seed-qi-006', platId: 'plat-003', name: 'Salade Niçoise', category: 'Entrées', quantity: 80, unitPrice: 12.00, totalPrice: 960 },
            { id: 'seed-qi-007', platId: 'plat-007', name: 'Cordon bleu de poulet', category: 'Plats principaux', quantity: 80, unitPrice: 16.00, totalPrice: 1280 },
            { id: 'seed-qi-008', platId: 'plat-015', name: 'Crème caramel maison', category: 'Desserts', quantity: 80, unitPrice: 6.00, totalPrice: 480 },
          ],
        },
      },
    }),
    prisma.quote.create({
      data: {
        id: 'seed-qt-003',
        eventId: 'seed-evt-003',
        quoteNumber: 'QT-20260403-C3',
        status: QuoteStatus.ACCEPTED,
        subtotal: 1000,
        serviceFee: 100,
        deliveryFee: 50,
        tax: 190,
        totalAmount: 1340,
        validUntil: new Date('2026-04-20'),
        sentAt: new Date('2026-04-03'),
        viewedAt: new Date('2026-04-04'),
        respondedAt: new Date('2026-04-06'),
        items: {
          create: [
            { id: 'seed-qi-009', platId: 'plat-001', name: 'Salade Mechouia', category: 'Entrées', quantity: 40, unitPrice: 8.50, totalPrice: 340 },
            { id: 'seed-qi-010', platId: 'plat-009', name: 'Brochette de crevettes x6', category: 'Plats principaux', quantity: 20, unitPrice: 28.00, totalPrice: 560 },
            { id: 'seed-qi-011', platId: 'plat-016', name: 'Salade de fruits frais', category: 'Desserts', quantity: 40, unitPrice: 10.00, totalPrice: 400 },
          ],
        },
      },
    }),
  ]);

  console.log(`✅ Created ${quotes.length} quotes`);

  // Event invoices for accepted quotes
  const invoices = await Promise.all([
    prisma.eventInvoice.create({
      data: {
        id: 'seed-einv-001',
        eventId: 'seed-evt-001',
        quoteId: 'seed-qt-001',
        userId: USERS.client1,
        invoiceNumber: 'EINV-20260401-A1',
        status: EventInvoiceStatus.PAID,
        subtotal: 7200,
        serviceFee: 720,
        deliveryFee: 300,
        tax: 1368,
        totalAmount: 9588,
        dueDate: new Date('2026-06-08'),
        paidAt: new Date('2026-04-10'),
        payment: {
          create: {
            id: 'seed-epay-001',
            amount: 9588,
            method: EventInvoicePaymentMethod.CASH,
            status: EventInvoicePaymentStatus.COMPLETED,
            paidAt: new Date('2026-04-10'),
          },
        },
      },
    }),
    prisma.eventInvoice.create({
      data: {
        id: 'seed-einv-002',
        eventId: 'seed-evt-002',
        quoteId: 'seed-qt-002',
        userId: USERS.client4,
        invoiceNumber: 'EINV-20260402-B2',
        status: EventInvoiceStatus.SENT,
        subtotal: 2560,
        serviceFee: 256,
        deliveryFee: 0,
        tax: 486.40,
        totalAmount: 3302.40,
        dueDate: new Date('2026-05-13'),
        payment: {
          create: {
            id: 'seed-epay-002',
            amount: 3302.40,
            method: EventInvoicePaymentMethod.FLOUCI,
            status: EventInvoicePaymentStatus.PENDING,
          },
        },
      },
    }),
    prisma.eventInvoice.create({
      data: {
        id: 'seed-einv-003',
        eventId: 'seed-evt-003',
        quoteId: 'seed-qt-003',
        userId: USERS.client2,
        invoiceNumber: 'EINV-20260403-C3',
        status: EventInvoiceStatus.SENT,
        subtotal: 1000,
        serviceFee: 100,
        deliveryFee: 50,
        tax: 190,
        totalAmount: 1340,
        dueDate: new Date('2026-05-03'),
        payment: {
          create: {
            id: 'seed-epay-003',
            amount: 1340,
            method: EventInvoicePaymentMethod.CASH,
            status: EventInvoicePaymentStatus.PENDING,
          },
        },
      },
    }),
  ]);

  console.log(`✅ Created ${invoices.length} event invoices`);
  console.log('🎉 Event seed completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
