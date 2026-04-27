import { PrismaClient, OrderStatus, PaymentMethod, PaymentStatus } from '@prisma/client';

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
  console.log('🌱 Seeding order-service...');

  // Delete existing seed data
  await prisma.payment.deleteMany({ where: { id: { startsWith: 'seed-' } } });
  await prisma.invoice.deleteMany({ where: { id: { startsWith: 'seed-' } } });
  await prisma.orderItem.deleteMany({ where: { id: { startsWith: 'seed-' } } });
  await prisma.order.deleteMany({ where: { id: { startsWith: 'seed-' } } });

  // Orders
  const orders = await Promise.all([
    // Delivered orders (for stats)
    prisma.order.create({
      data: {
        id: 'seed-ord-001',
        orderNumber: 'ORD-250115-A1B2',
        userId: USERS.client1,
        status: OrderStatus.DELIVERED,
        subtotal: 45.00,
        deliveryFee: 5.00,
        tax: 8.55,
        totalAmount: 58.55,
        deliveryAddress: { street: '15 Rue de Marseille', city: 'Sfax', zipCode: '3000' },
        deliveryDate: new Date('2025-01-15T12:30:00'),
        notes: 'Sonner à l\'interphone',
        items: {
          create: [
            { id: 'seed-oi-001', platId: 'plat-004', platName: 'Gratin de crevettes', quantity: 1, unitPrice: 25.00 },
            { id: 'seed-oi-002', platId: 'plat-014', platName: 'Assiette de pâtisseries orientales', quantity: 1, unitPrice: 15.00 },
            { id: 'seed-oi-003', platId: 'plat-017', platName: 'Jus d\'orange frais', quantity: 1, unitPrice: 5.00 },
          ],
        },
      },
    }),
    prisma.order.create({
      data: {
        id: 'seed-ord-002',
        orderNumber: 'ORD-250120-C3D4',
        userId: USERS.client2,
        status: OrderStatus.DELIVERED,
        subtotal: 78.00,
        deliveryFee: 5.00,
        tax: 14.77,
        totalAmount: 97.77,
        deliveryAddress: { street: '25 Avenue Hedi Chaker', city: 'Sfax', zipCode: '3000' },
        deliveryDate: new Date('2025-01-20T11:45:00'),
        items: {
          create: [
            { id: 'seed-oi-004', platId: 'plat-008', platName: 'Mixed Grill (4 viandes)', quantity: 1, unitPrice: 35.00 },
            { id: 'seed-oi-005', platId: 'plat-004', platName: 'Gratin de crevettes', quantity: 1, unitPrice: 25.00 },
            { id: 'seed-oi-006', platId: 'plat-015', platName: 'Crème caramel maison', quantity: 2, unitPrice: 6.00 },
            { id: 'seed-oi-007', platId: 'plat-018', platName: 'Citronnade à la menthe', quantity: 2, unitPrice: 4.50 },
          ],
        },
      },
    }),
    prisma.order.create({
      data: {
        id: 'seed-ord-003',
        orderNumber: 'ORD-250205-G7H8',
        userId: USERS.client3,
        status: OrderStatus.DELIVERED,
        subtotal: 114.00,
        deliveryFee: 0,
        tax: 21.66,
        totalAmount: 135.66,
        deliveryAddress: { street: '10 Rue Ibn Khaldoun', city: 'Sfax', zipCode: '3025' },
        deliveryDate: new Date('2025-02-05T11:00:00'),
        notes: 'Commande entreprise',
        items: {
          create: [
            { id: 'seed-oi-010', platId: 'plat-011', platName: 'Couscous Royal', quantity: 3, unitPrice: 28.00 },
            { id: 'seed-oi-011', platId: 'plat-001', platName: 'Salade Mechouia', quantity: 4, unitPrice: 8.50 },
            { id: 'seed-oi-012', platId: 'plat-014', platName: 'Assiette de pâtisseries orientales', quantity: 2, unitPrice: 15.00 },
          ],
        },
      },
    }),
    prisma.order.create({
      data: {
        id: 'seed-ord-004',
        orderNumber: 'ORD-250212-I9J0',
        userId: USERS.client4,
        status: OrderStatus.DELIVERED,
        subtotal: 238.00,
        deliveryFee: 5.00,
        tax: 46.17,
        totalAmount: 289.17,
        deliveryAddress: { street: 'Immeuble Les Jasmins, Route de l\'Aéroport', city: 'Sfax', zipCode: '3060' },
        deliveryDate: new Date('2025-02-12T12:15:00'),
        notes: 'Livraison bureau',
        items: {
          create: [
            { id: 'seed-oi-013', platId: 'plat-012', platName: 'Couscous aux crevettes', quantity: 5, unitPrice: 32.00 },
            { id: 'seed-oi-014', platId: 'plat-001', platName: 'Salade Mechouia', quantity: 8, unitPrice: 8.50 },
            { id: 'seed-oi-015', platId: 'plat-019', platName: 'Eau minérale 1L', quantity: 10, unitPrice: 2.50 },
          ],
        },
      },
    }),

    // Active orders (for dashboard demo)
    prisma.order.create({
      data: {
        id: 'seed-ord-005',
        orderNumber: 'ORD-260420-K1L2',
        userId: USERS.client1,
        status: OrderStatus.PENDING,
        subtotal: 39.00,
        deliveryFee: 5.00,
        tax: 7.41,
        totalAmount: 51.41,
        deliveryAddress: { street: '15 Rue de Marseille', city: 'Sfax', zipCode: '3000' },
        deliveryDate: new Date('2026-04-21T12:00:00'),
        deliverySlot: '12:00-13:00',
        notes: 'Livrer avant 13h',
        items: {
          create: [
            { id: 'seed-oi-016', platId: 'plat-005', platName: 'Filet de daurade', quantity: 1, unitPrice: 22.00 },
            { id: 'seed-oi-017', platId: 'plat-002', platName: 'Brik à l\'œuf', quantity: 2, unitPrice: 5.00 },
            { id: 'seed-oi-018', platId: 'plat-016', platName: 'Salade de fruits frais', quantity: 1, unitPrice: 10.00 },
          ],
        },
      },
    }),
    prisma.order.create({
      data: {
        id: 'seed-ord-006',
        orderNumber: 'ORD-260420-M3N4',
        userId: USERS.client2,
        status: OrderStatus.CONFIRMED,
        subtotal: 60.00,
        deliveryFee: 5.00,
        tax: 11.40,
        totalAmount: 76.40,
        deliveryAddress: { street: '25 Avenue Hedi Chaker', city: 'Sfax', zipCode: '3000' },
        deliveryDate: new Date('2026-04-21T13:00:00'),
        deliverySlot: '13:00-14:00',
        items: {
          create: [
            { id: 'seed-oi-019', platId: 'plat-010', platName: 'Entrecôte 300g', quantity: 1, unitPrice: 42.00 },
            { id: 'seed-oi-020', platId: 'plat-003', platName: 'Salade Niçoise', quantity: 1, unitPrice: 12.00 },
            { id: 'seed-oi-021', platId: 'plat-015', platName: 'Crème caramel maison', quantity: 1, unitPrice: 6.00 },
          ],
        },
      },
    }),
    prisma.order.create({
      data: {
        id: 'seed-ord-007',
        orderNumber: 'ORD-260420-O5P6',
        userId: USERS.client3,
        status: OrderStatus.PREPARING,
        subtotal: 83.00,
        deliveryFee: 5.00,
        tax: 15.77,
        totalAmount: 103.77,
        deliveryAddress: { street: '10 Rue Ibn Khaldoun', city: 'Sfax', zipCode: '3025' },
        deliveryDate: new Date('2026-04-21T14:00:00'),
        deliverySlot: '14:00-15:00',
        notes: 'Allergique aux cacahuètes',
        items: {
          create: [
            { id: 'seed-oi-022', platId: 'plat-009', platName: 'Brochette de crevettes x6', quantity: 2, unitPrice: 28.00 },
            { id: 'seed-oi-023', platId: 'plat-001', platName: 'Salade Mechouia', quantity: 2, unitPrice: 8.50 },
            { id: 'seed-oi-024', platId: 'plat-013', platName: 'Couscous végétarien', quantity: 1, unitPrice: 18.00 },
          ],
        },
      },
    }),

    // Cancelled orders (for stats)
    prisma.order.create({
      data: {
        id: 'seed-ord-008',
        orderNumber: 'ORD-250130-Q7R8',
        userId: USERS.client2,
        status: OrderStatus.CANCELLED,
        subtotal: 38.00,
        deliveryFee: 5.00,
        tax: 7.22,
        totalAmount: 50.22,
        deliveryAddress: { street: '25 Avenue Hedi Chaker', city: 'Sfax', zipCode: '3000' },
        deliveryDate: new Date('2025-01-30T18:00:00'),
        notes: 'Client a annulé',
        items: {
          create: [
            { id: 'seed-oi-025', platId: 'plat-006', platName: 'Ojja crevettes', quantity: 1, unitPrice: 18.00 },
            { id: 'seed-oi-026', platId: 'plat-003', platName: 'Salade Niçoise', quantity: 1, unitPrice: 12.00 },
            { id: 'seed-oi-027', platId: 'plat-018', platName: 'Citronnade à la menthe', quantity: 2, unitPrice: 4.50 },
          ],
        },
      },
    }),
  ]);

  console.log(`✅ Created ${orders.length} orders`);

  // Invoices for delivered orders
  const invoices = await Promise.all([
    prisma.invoice.create({
      data: {
        id: 'seed-inv-001',
        orderId: 'seed-ord-001',
        invoiceNumber: 'INV-202501-A1B2',
        amount: 58.55,
        taxAmount: 8.55,
        sentAt: new Date('2025-01-15'),
      },
    }),
    prisma.invoice.create({
      data: {
        id: 'seed-inv-002',
        orderId: 'seed-ord-002',
        invoiceNumber: 'INV-202501-C3D4',
        amount: 97.77,
        taxAmount: 14.77,
        sentAt: new Date('2025-01-20'),
      },
    }),
    prisma.invoice.create({
      data: {
        id: 'seed-inv-003',
        orderId: 'seed-ord-003',
        invoiceNumber: 'INV-202502-G7H8',
        amount: 135.66,
        taxAmount: 21.66,
        sentAt: new Date('2025-02-05'),
      },
    }),
    prisma.invoice.create({
      data: {
        id: 'seed-inv-004',
        orderId: 'seed-ord-004',
        invoiceNumber: 'INV-202502-I9J0',
        amount: 289.17,
        taxAmount: 46.17,
        sentAt: new Date('2025-02-12'),
      },
    }),
  ]);

  console.log(`✅ Created ${invoices.length} invoices`);

  // Payments for delivered orders
  const payments = await Promise.all([
    prisma.payment.create({
      data: {
        id: 'seed-pay-001',
        invoiceId: 'seed-inv-001',
        amount: 58.55,
        method: PaymentMethod.CASH,
        status: PaymentStatus.COMPLETED,
        paidAt: new Date('2025-01-15T14:00:00'),
      },
    }),
    prisma.payment.create({
      data: {
        id: 'seed-pay-002',
        invoiceId: 'seed-inv-002',
        amount: 97.77,
        method: PaymentMethod.CASH,
        status: PaymentStatus.COMPLETED,
        paidAt: new Date('2025-01-20T13:30:00'),
      },
    }),
    prisma.payment.create({
      data: {
        id: 'seed-pay-003',
        invoiceId: 'seed-inv-003',
        amount: 135.66,
        method: PaymentMethod.CASH,
        status: PaymentStatus.COMPLETED,
        paidAt: new Date('2025-02-05T13:00:00'),
      },
    }),
    prisma.payment.create({
      data: {
        id: 'seed-pay-004',
        invoiceId: 'seed-inv-004',
        amount: 289.17,
        method: PaymentMethod.CASH,
        status: PaymentStatus.COMPLETED,
        paidAt: new Date('2025-02-12T14:30:00'),
      },
    }),
  ]);

  console.log(`✅ Created ${payments.length} payments`);
  console.log('🎉 Order seed completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
