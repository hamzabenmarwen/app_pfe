import prisma from '../config/database';

export interface CreateCategoryData {
  name: string;
  description?: string;
  imageUrl?: string;
  displayOrder?: number;
}

export interface UpdateCategoryData {
  name?: string;
  description?: string;
  imageUrl?: string;
  displayOrder?: number;
  isActive?: boolean;
}

export async function getAllCategories(includeInactive = false) {
  const where = includeInactive ? {} : { isActive: true };
  
  const categories = await prisma.category.findMany({
    where,
    orderBy: { displayOrder: 'asc' },
    include: {
      _count: {
        select: { plats: true },
      },
    },
  });

  return categories;
}

export async function getCategoryById(id: string) {
  const category = await prisma.category.findUnique({
    where: { id },
    include: {
      plats: {
        where: { isAvailable: true },
        include: {
          allergens: {
            include: { allergen: true },
          },
        },
      },
    },
  });

  if (!category) {
    throw new Error('Category not found');
  }

  return category;
}

export async function createCategory(data: CreateCategoryData) {
  // Check if name already exists
  const existing = await prisma.category.findUnique({
    where: { name: data.name },
  });

  if (existing) {
    throw new Error('Category name already exists');
  }

  const category = await prisma.category.create({
    data: {
      name: data.name,
      description: data.description,
      imageUrl: data.imageUrl,
      displayOrder: data.displayOrder || 0,
    },
  });

  return category;
}

export async function updateCategory(id: string, data: UpdateCategoryData) {
  // Check if category exists
  const existing = await prisma.category.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new Error('Category not found');
  }

  // Check if new name conflicts
  if (data.name && data.name !== existing.name) {
    const nameExists = await prisma.category.findUnique({
      where: { name: data.name },
    });
    if (nameExists) {
      throw new Error('Category name already exists');
    }
  }

  const category = await prisma.category.update({
    where: { id },
    data,
  });

  return category;
}

export async function deleteCategory(id: string) {
  // Check if category has plats
  const category = await prisma.category.findUnique({
    where: { id },
    include: { _count: { select: { plats: true } } },
  });

  if (!category) {
    throw new Error('Category not found');
  }

  if (category._count.plats > 0) {
    throw new Error('Cannot delete category with existing plats');
  }

  await prisma.category.delete({
    where: { id },
  });
}

export async function toggleCategoryStatus(id: string) {
  const category = await prisma.category.findUnique({
    where: { id },
  });

  if (!category) {
    throw new Error('Category not found');
  }

  const updated = await prisma.category.update({
    where: { id },
    data: { isActive: !category.isActive },
  });

  return updated;
}
