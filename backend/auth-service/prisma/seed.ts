import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Fixed IDs so other services can reference them
const USERS = {
  admin: 'seed-admin-001',
  client1: 'seed-client-001',
  client2: 'seed-client-002',
  client3: 'seed-client-003',
  client4: 'seed-client-004',
};

const PASSWORD_HASH = bcrypt.hashSync('Test@1234', 12);

async function main() {
  console.log('🌱 Seeding auth-service...');

  // Admin
  const admin = await prisma.user.upsert({
    where: { email: 'admin@assiettegala.tn' },
    update: {
      passwordHash: PASSWORD_HASH,
      firstName: 'Omar',
      lastName: 'Daoud',
      phone: '+21624230587',
      role: UserRole.ADMIN,
      isActive: true,
      emailVerified: true,
    },
    create: {
      id: USERS.admin,
      email: 'admin@assiettegala.tn',
      passwordHash: PASSWORD_HASH,
      firstName: 'Omar',
      lastName: 'Daoud',
      phone: '+21624230587',
      role: UserRole.ADMIN,
      isActive: true,
      emailVerified: true,
    },
  });

  // Clients
  const client1 = await prisma.user.upsert({
    where: { email: 'ahmed.benali@email.tn' },
    update: {
      passwordHash: PASSWORD_HASH,
      firstName: 'Ahmed',
      lastName: 'Ben Ali',
      phone: '+21620123456',
      role: UserRole.CLIENT,
      isActive: true,
      emailVerified: true,
    },
    create: {
      id: USERS.client1,
      email: 'ahmed.benali@email.tn',
      passwordHash: PASSWORD_HASH,
      firstName: 'Ahmed',
      lastName: 'Ben Ali',
      phone: '+21620123456',
      role: UserRole.CLIENT,
      isActive: true,
      emailVerified: true,
    },
  });

  const client2 = await prisma.user.upsert({
    where: { email: 'fatima.trabelsi@email.tn' },
    update: {
      passwordHash: PASSWORD_HASH,
      firstName: 'Fatima',
      lastName: 'Trabelsi',
      phone: '+21622123456',
      role: UserRole.CLIENT,
      isActive: true,
      emailVerified: true,
    },
    create: {
      id: USERS.client2,
      email: 'fatima.trabelsi@email.tn',
      passwordHash: PASSWORD_HASH,
      firstName: 'Fatima',
      lastName: 'Trabelsi',
      phone: '+21622123456',
      role: UserRole.CLIENT,
      isActive: true,
      emailVerified: true,
    },
  });

  const client3 = await prisma.user.upsert({
    where: { email: 'mohamed.sassi@email.tn' },
    update: {
      passwordHash: PASSWORD_HASH,
      firstName: 'Mohamed',
      lastName: 'Sassi',
      phone: '+21623123456',
      role: UserRole.CLIENT,
      isActive: true,
      emailVerified: true,
    },
    create: {
      id: USERS.client3,
      email: 'mohamed.sassi@email.tn',
      passwordHash: PASSWORD_HASH,
      firstName: 'Mohamed',
      lastName: 'Sassi',
      phone: '+21623123456',
      role: UserRole.CLIENT,
      isActive: true,
      emailVerified: true,
    },
  });

  const client4 = await prisma.user.upsert({
    where: { email: 'contact@sfaxtech.tn' },
    update: {
      passwordHash: PASSWORD_HASH,
      firstName: 'Sfax',
      lastName: 'Tech',
      phone: '+21671123456',
      role: UserRole.CLIENT,
      isActive: true,
      emailVerified: true,
    },
    create: {
      id: USERS.client4,
      email: 'contact@sfaxtech.tn',
      passwordHash: PASSWORD_HASH,
      firstName: 'Sfax',
      lastName: 'Tech',
      phone: '+21671123456',
      role: UserRole.CLIENT,
      isActive: true,
      emailVerified: true,
    },
  });

  console.log(`✅ Created 5 users (1 admin + 4 clients)`);

  // Use actual IDs from upserted users (admin may already exist with different ID)
  const actualIds = {
    admin: admin.id,
    client1: client1.id,
    client2: client2.id,
    client3: client3.id,
    client4: client4.id,
  };
  console.log(`   Admin ID: ${actualIds.admin}`);
  console.log(`   Client1 ID: ${actualIds.client1}`);

  // Addresses
  const addresses = await Promise.all([
    prisma.address.upsert({
      where: { id: 'seed-addr-001' },
      update: { userId: actualIds.client1 },
      create: {
        id: 'seed-addr-001',
        userId: actualIds.client1,
        label: 'Domicile',
        street: '15 Rue de Marseille',
        city: 'Sfax',
        zipCode: '3000',
        isDefault: true,
      },
    }),
    prisma.address.upsert({
      where: { id: 'seed-addr-002' },
      update: { userId: actualIds.client1 },
      create: {
        id: 'seed-addr-002',
        userId: actualIds.client1,
        label: 'Bureau',
        street: 'Zone Industrielle Route de Mahdia',
        city: 'Sfax',
        zipCode: '3010',
        isDefault: false,
      },
    }),
    prisma.address.upsert({
      where: { id: 'seed-addr-003' },
      update: { userId: actualIds.client2 },
      create: {
        id: 'seed-addr-003',
        userId: actualIds.client2,
        label: 'Domicile',
        street: '25 Avenue Hedi Chaker',
        city: 'Sfax',
        zipCode: '3000',
        isDefault: true,
      },
    }),
    prisma.address.upsert({
      where: { id: 'seed-addr-004' },
      update: { userId: actualIds.client3 },
      create: {
        id: 'seed-addr-004',
        userId: actualIds.client3,
        label: 'Domicile',
        street: '10 Rue Ibn Khaldoun',
        city: 'Sfax',
        zipCode: '3025',
        isDefault: true,
      },
    }),
    prisma.address.upsert({
      where: { id: 'seed-addr-005' },
      update: { userId: actualIds.client4 },
      create: {
        id: 'seed-addr-005',
        userId: actualIds.client4,
        label: 'Siège Social',
        street: 'Immeuble Les Jasmins, Route de l\'Aéroport',
        city: 'Sfax',
        zipCode: '3060',
        isDefault: true,
      },
    }),
  ]);

  console.log(`✅ Created ${addresses.length} addresses`);
  console.log('🎉 Auth seed completed!');
  console.log('   Admin: admin@assiettegala.tn / Test@1234');
  console.log('   Client: ahmed.benali@email.tn / Test@1234');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
