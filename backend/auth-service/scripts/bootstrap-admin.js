const { PrismaClient, UserRole } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const ADMIN_EMAIL = process.env.ADMIN_BOOTSTRAP_EMAIL || 'admin@assiettegala.tn';
const ADMIN_PASSWORD = process.env.ADMIN_BOOTSTRAP_PASSWORD || 'Admin@123456';
const ADMIN_FIRST_NAME = process.env.ADMIN_BOOTSTRAP_FIRST_NAME || 'System';
const ADMIN_LAST_NAME = process.env.ADMIN_BOOTSTRAP_LAST_NAME || 'Admin';
const ADMIN_PHONE = process.env.ADMIN_BOOTSTRAP_PHONE || '+21600000000';

async function main() {
  if (ADMIN_PASSWORD.length < 8) {
    throw new Error('ADMIN_BOOTSTRAP_PASSWORD must contain at least 8 characters.');
  }

  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);

  const admin = await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    create: {
      email: ADMIN_EMAIL,
      passwordHash,
      firstName: ADMIN_FIRST_NAME,
      lastName: ADMIN_LAST_NAME,
      phone: ADMIN_PHONE,
      role: UserRole.ADMIN,
      isActive: true,
      emailVerified: true,
    },
    update: {
      passwordHash,
      firstName: ADMIN_FIRST_NAME,
      lastName: ADMIN_LAST_NAME,
      phone: ADMIN_PHONE,
      role: UserRole.ADMIN,
      isActive: true,
      emailVerified: true,
    },
  });

  await prisma.emailVerificationToken.deleteMany({
    where: { userId: admin.id },
  });

  console.log('----------------------------------------');
  console.log('Admin account is ready (verified).');
  console.log(`Email: ${ADMIN_EMAIL}`);
  console.log(`Password: ${ADMIN_PASSWORD}`);
  console.log('----------------------------------------');
}

main()
  .catch((error) => {
    console.error('Failed to bootstrap admin account:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
