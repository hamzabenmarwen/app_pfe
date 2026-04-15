import prisma from '../config/database';

export async function getAllAllergens() {
  const allergens = await prisma.allergen.findMany({
    orderBy: { name: 'asc' },
  });
  return allergens;
}

export async function getAllergenById(id: string) {
  const allergen = await prisma.allergen.findUnique({
    where: { id },
  });

  if (!allergen) {
    throw new Error('Allergen not found');
  }

  return allergen;
}

export async function createAllergen(name: string, icon?: string) {
  const existing = await prisma.allergen.findUnique({
    where: { name },
  });

  if (existing) {
    throw new Error('Allergen already exists');
  }

  const allergen = await prisma.allergen.create({
    data: { name, icon },
  });

  return allergen;
}

export async function updateAllergen(id: string, name?: string, icon?: string) {
  const existing = await prisma.allergen.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new Error('Allergen not found');
  }

  if (name && name !== existing.name) {
    const nameExists = await prisma.allergen.findUnique({
      where: { name },
    });
    if (nameExists) {
      throw new Error('Allergen name already exists');
    }
  }

  const allergen = await prisma.allergen.update({
    where: { id },
    data: { name, icon },
  });

  return allergen;
}

export async function deleteAllergen(id: string) {
  const existing = await prisma.allergen.findUnique({
    where: { id },
    include: { _count: { select: { plats: true } } },
  });

  if (!existing) {
    throw new Error('Allergen not found');
  }

  if (existing._count.plats > 0) {
    throw new Error('Cannot delete allergen that is assigned to plats');
  }

  await prisma.allergen.delete({
    where: { id },
  });
}
