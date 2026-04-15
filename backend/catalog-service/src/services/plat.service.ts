import prisma from '../config/database';
import { Prisma } from '@prisma/client';

// Helper function to transform plat for API response
function transformPlat(plat: any) {
  return {
    ...plat,
    price: Number(plat.price),
    image: plat.images?.[0] || null, // Add image field for frontend compatibility
    allergens: plat.allergens?.map((pa: any) => pa.allergen) || [],
  };
}

export interface CreatePlatData {
  categoryId: string;
  name: string;
  description?: string;
  price: number;
  images?: string[];
  preparationTime?: number;
  isVegetarian?: boolean;
  isVegan?: boolean;
  isHalal?: boolean;
  isGlutenFree?: boolean;
  spiceLevel?: number;
  calories?: number;
  ingredients?: string;
  allergenIds?: string[];
}

export interface UpdatePlatData {
  categoryId?: string;
  name?: string;
  description?: string;
  price?: number;
  images?: string[];
  preparationTime?: number;
  isAvailable?: boolean;
  isVegetarian?: boolean;
  isVegan?: boolean;
  isHalal?: boolean;
  isGlutenFree?: boolean;
  spiceLevel?: number;
  calories?: number;
  ingredients?: string;
  allergenIds?: string[];
}

export interface PlatFilters {
  categoryId?: string;
  isVegetarian?: boolean;
  isVegan?: boolean;
  isHalal?: boolean;
  isGlutenFree?: boolean;
  maxSpiceLevel?: number;
  minPrice?: number;
  maxPrice?: number;
  search?: string;
  isAvailable?: boolean;
}

export interface PaginationOptions {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export async function getAllPlats(
  filters: PlatFilters = {},
  pagination: PaginationOptions = { page: 1, limit: 10 }
) {
  const { page, limit, sortBy = 'createdAt', sortOrder = 'desc' } = pagination;
  const skip = (page - 1) * limit;

  // Build where clause
  const where: Prisma.PlatWhereInput = {};

  if (filters.categoryId) {
    where.categoryId = filters.categoryId;
  }

  if (filters.isVegetarian !== undefined) {
    where.isVegetarian = filters.isVegetarian;
  }

  if (filters.isVegan !== undefined) {
    where.isVegan = filters.isVegan;
  }

  if (filters.isHalal !== undefined) {
    where.isHalal = filters.isHalal;
  }

  if (filters.isGlutenFree !== undefined) {
    where.isGlutenFree = filters.isGlutenFree;
  }

  if (filters.maxSpiceLevel !== undefined) {
    where.spiceLevel = { lte: filters.maxSpiceLevel };
  }

  if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
    where.price = {};
    if (filters.minPrice !== undefined) {
      where.price.gte = filters.minPrice;
    }
    if (filters.maxPrice !== undefined) {
      where.price.lte = filters.maxPrice;
    }
  }

  if (filters.search) {
    where.OR = [
      { name: { contains: filters.search, mode: 'insensitive' } },
      { description: { contains: filters.search, mode: 'insensitive' } },
      { ingredients: { contains: filters.search, mode: 'insensitive' } },
    ];
  }

  if (filters.isAvailable !== undefined) {
    where.isAvailable = filters.isAvailable;
  }

  const [plats, total] = await Promise.all([
    prisma.plat.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      include: {
        category: {
          select: { id: true, name: true },
        },
        allergens: {
          include: { allergen: true },
        },
      },
    }),
    prisma.plat.count({ where }),
  ]);

  // Transform plats for API response
  const transformedPlats = plats.map(transformPlat);

  return {
    plats: transformedPlats,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getPlatById(id: string) {
  const plat = await prisma.plat.findUnique({
    where: { id },
    include: {
      category: true,
      allergens: {
        include: { allergen: true },
      },
    },
  });

  if (!plat) {
    throw new Error('Plat not found');
  }

  return transformPlat(plat);
}

export async function createPlat(data: CreatePlatData) {
  // Verify category exists
  const category = await prisma.category.findUnique({
    where: { id: data.categoryId },
  });

  if (!category) {
    throw new Error('Category not found');
  }

  const { allergenIds, ...platData } = data;

  const plat = await prisma.plat.create({
    data: {
      ...platData,
      price: new Prisma.Decimal(data.price),
      allergens: allergenIds
        ? {
            create: allergenIds.map((allergenId) => ({
              allergen: { connect: { id: allergenId } },
            })),
          }
        : undefined,
    },
    include: {
      category: true,
      allergens: {
        include: { allergen: true },
      },
    },
  });

  return transformPlat(plat);
}

export async function updatePlat(id: string, data: UpdatePlatData) {
  // Verify plat exists
  const existing = await prisma.plat.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new Error('Plat not found');
  }

  // Verify category if changing
  if (data.categoryId) {
    const category = await prisma.category.findUnique({
      where: { id: data.categoryId },
    });
    if (!category) {
      throw new Error('Category not found');
    }
  }

  const { allergenIds, ...platData } = data;

  // Update allergens if provided
  if (allergenIds !== undefined) {
    // Remove existing allergens
    await prisma.platAllergen.deleteMany({
      where: { platId: id },
    });

    // Add new allergens
    if (allergenIds.length > 0) {
      await prisma.platAllergen.createMany({
        data: allergenIds.map((allergenId) => ({
          platId: id,
          allergenId,
        })),
      });
    }
  }

  const updateData: any = { ...platData };
  if (data.price !== undefined) {
    updateData.price = new Prisma.Decimal(data.price);
  }

  const plat = await prisma.plat.update({
    where: { id },
    data: updateData,
    include: {
      category: true,
      allergens: {
        include: { allergen: true },
      },
    },
  });

  return transformPlat(plat);
}

export async function deletePlat(id: string) {
  const existing = await prisma.plat.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new Error('Plat not found');
  }

  await prisma.plat.delete({
    where: { id },
  });
}

export async function togglePlatAvailability(id: string) {
  const plat = await prisma.plat.findUnique({
    where: { id },
  });

  if (!plat) {
    throw new Error('Plat not found');
  }

  const updated = await prisma.plat.update({
    where: { id },
    data: { isAvailable: !plat.isAvailable },
    include: {
      category: true,
      allergens: {
        include: { allergen: true },
      },
    },
  });

  return transformPlat(updated);
}

export async function getPopularPlats(limit = 10) {
  // For now, return random plats. Later this can be based on order count
  const plats = await prisma.plat.findMany({
    where: { isAvailable: true },
    take: limit,
    include: {
      category: {
        select: { id: true, name: true },
      },
      allergens: {
        include: { allergen: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return plats.map(transformPlat);
}

export async function updateStock(id: string, stock: number, lowStockThreshold?: number) {
  void id;
  void stock;
  void lowStockThreshold;
  throw new Error('Plat stock is deprecated. Use /api/ingredients/stock/:id for stock updates.');
}

export async function getLowStockItems() {
  // Legacy endpoint kept for backward compatibility after migration to ingredient stock.
  return [];
}

export async function getAllPlatsStock() {
  // Legacy endpoint kept for backward compatibility after migration to ingredient stock.
  return [];
}
