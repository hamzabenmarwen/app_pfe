import prisma from '../config/database';
import bcrypt from 'bcryptjs';

export async function getUserById(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      role: true,
      avatarUrl: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user) {
    throw new Error('User not found');
  }

  return user;
}

export async function getAllUsers(page = 1, limit = 10) {
  const skip = (page - 1) * limit;

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      skip,
      take: limit,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        avatarUrl: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.user.count(),
  ]);

  return {
    users,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export interface UpdateUserData {
  firstName?: string;
  lastName?: string;
  phone?: string;
  avatarUrl?: string;
  role?: 'ADMIN' | 'CLIENT';
}

export async function updateUser(userId: string, data: UpdateUserData) {
  const user = await prisma.user.update({
    where: { id: userId },
    data,
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      role: true,
      avatarUrl: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return user;
}

export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string
) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new Error('User not found');
  }

  if (!user.passwordHash) {
    throw new Error('Cannot change password for social login accounts');
  }

  const isValidPassword = await bcrypt.compare(currentPassword, user.passwordHash);
  
  if (!isValidPassword) {
    throw new Error('Current password is incorrect');
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);

  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash },
  });
}

export async function toggleUserStatus(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new Error('User not found');
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: { isActive: !user.isActive },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      isActive: true,
    },
  });

  return updatedUser;
}

export async function deleteUser(userId: string) {
  return deleteUserByMode(userId, 'anonymize');
}

export type UserDeletionMode = 'anonymize' | 'delete';

async function ensureNotLastAdmin(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true },
  });

  if (!user) {
    throw new Error('User not found');
  }

  if (user.role !== 'ADMIN') {
    return user;
  }

  const adminCount = await prisma.user.count({
    where: { role: 'ADMIN' },
  });

  if (adminCount <= 1) {
    throw new Error('Impossible de supprimer ou anonymiser le dernier compte admin');
  }

  return user;
}

export async function deleteUserByMode(userId: string, mode: UserDeletionMode = 'anonymize') {
  await ensureNotLastAdmin(userId);

  if (mode === 'delete') {
    await prisma.user.delete({
      where: { id: userId },
    });
    return { mode: 'delete' as const };
  }

  const result = await anonymizeUserData(userId);
  return {
    mode: 'anonymize' as const,
    ...result,
  };
}

export async function exportUserData(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      addresses: true,
      oauthAccounts: {
        select: {
          provider: true,
          providerId: true,
          createdAt: true,
        },
      },
      refreshTokens: {
        select: {
          id: true,
          createdAt: true,
          expiresAt: true,
        },
      },
    },
  });

  if (!user) {
    throw new Error('User not found');
  }

  return {
    exportedAt: new Date().toISOString(),
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      role: user.role,
      avatarUrl: user.avatarUrl,
      isActive: user.isActive,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    },
    addresses: user.addresses,
    oauthAccounts: user.oauthAccounts,
    sessions: user.refreshTokens,
  };
}

export async function anonymizeUserData(userId: string) {
  const existing = await prisma.user.findUnique({ where: { id: userId } });
  if (!existing) {
    throw new Error('User not found');
  }

  const anonymizedEmail = `deleted-${userId}@anonymized.local`;

  await prisma.$transaction([
    prisma.address.deleteMany({ where: { userId } }),
    prisma.refreshToken.deleteMany({ where: { userId } }),
    prisma.passwordResetToken.deleteMany({ where: { userId } }),
    prisma.emailVerificationToken.deleteMany({ where: { userId } }),
    prisma.oAuthAccount.deleteMany({ where: { userId } }),
    prisma.user.update({
      where: { id: userId },
      data: {
        email: anonymizedEmail,
        firstName: 'Utilisateur',
        lastName: 'Supprimé',
        phone: null,
        avatarUrl: null,
        passwordHash: null,
        role: 'CLIENT',
        isActive: false,
        emailVerified: false,
      },
    }),
  ]);

  return {
    message: 'Compte anonymisé conformément au RGPD',
    anonymizedEmail,
  };
}
