import prisma from '../config/database';

export interface CreateAddressData {
  label: string;
  street: string;
  city: string;
  zipCode: string;
  country?: string;
  isDefault?: boolean;
}

export async function createAddress(userId: string, data: CreateAddressData) {
  // If this is set as default, unset other defaults
  if (data.isDefault) {
    await prisma.address.updateMany({
      where: { userId, isDefault: true },
      data: { isDefault: false },
    });
  }

  const address = await prisma.address.create({
    data: {
      userId,
      label: data.label,
      street: data.street,
      city: data.city,
      zipCode: data.zipCode,
      country: data.country || 'Tunisie',
      isDefault: data.isDefault || false,
    },
  });

  return address;
}

export async function getUserAddresses(userId: string) {
  const addresses = await prisma.address.findMany({
    where: { userId },
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
  });

  return addresses;
}

export async function getAddressById(addressId: string, userId: string) {
  const address = await prisma.address.findFirst({
    where: { id: addressId, userId },
  });

  if (!address) {
    throw new Error('Address not found');
  }

  return address;
}

export async function updateAddress(
  addressId: string,
  userId: string,
  data: Partial<CreateAddressData>
) {
  // Verify ownership
  const existing = await prisma.address.findFirst({
    where: { id: addressId, userId },
  });

  if (!existing) {
    throw new Error('Address not found');
  }

  // If this is set as default, unset other defaults
  if (data.isDefault) {
    await prisma.address.updateMany({
      where: { userId, isDefault: true, id: { not: addressId } },
      data: { isDefault: false },
    });
  }

  const address = await prisma.address.update({
    where: { id: addressId },
    data,
  });

  return address;
}

export async function deleteAddress(addressId: string, userId: string) {
  // Verify ownership
  const existing = await prisma.address.findFirst({
    where: { id: addressId, userId },
  });

  if (!existing) {
    throw new Error('Address not found');
  }

  await prisma.address.delete({
    where: { id: addressId },
  });
}

export async function setDefaultAddress(addressId: string, userId: string) {
  // Verify ownership
  const existing = await prisma.address.findFirst({
    where: { id: addressId, userId },
  });

  if (!existing) {
    throw new Error('Address not found');
  }

  // Unset all defaults
  await prisma.address.updateMany({
    where: { userId, isDefault: true },
    data: { isDefault: false },
  });

  // Set new default
  const address = await prisma.address.update({
    where: { id: addressId },
    data: { isDefault: true },
  });

  return address;
}
