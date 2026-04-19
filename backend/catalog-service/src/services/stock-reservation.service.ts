import { IngredientReservationStatus, Prisma } from '@prisma/client';
import prisma from '../config/database';

export interface RecipeLineInput {
  ingredientId: string;
  quantityPerPlat: number;
}

export interface ReserveOrderStockInput {
  reference: string;
  reason?: string;
  items: Array<{
    platId: string;
    quantity: number;
  }>;
}

function toNumber(value: Prisma.Decimal | number | string): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return Number(value);
  return Number(value);
}

function normalizeReservation(reservation: any) {
  return {
    id: reservation.id,
    reference: reservation.reference,
    status: reservation.status,
    reason: reservation.reason || null,
    createdAt: reservation.createdAt,
    updatedAt: reservation.updatedAt,
    lines: (reservation.lines || []).map((line: any) => ({
      ingredientId: line.ingredientId,
      ingredientName: line.ingredient?.name || null,
      ingredientUnit: line.ingredient?.unit || null,
      quantity: toNumber(line.quantity),
    })),
  };
}

export async function getPlatRecipe(platId: string) {
  const plat = await prisma.plat.findUnique({
    where: { id: platId },
    select: {
      id: true,
      name: true,
      recipeItems: {
        orderBy: { ingredient: { name: 'asc' } },
        include: {
          ingredient: {
            select: {
              id: true,
              name: true,
              unit: true,
              isActive: true,
              quantity: true,
            },
          },
        },
      },
    },
  });

  if (!plat) {
    throw new Error('Plat not found');
  }

  return {
    platId: plat.id,
    platName: plat.name,
    lines: plat.recipeItems.map((line) => ({
      ingredientId: line.ingredientId,
      ingredientName: line.ingredient.name,
      ingredientUnit: line.ingredient.unit,
      quantityPerPlat: toNumber(line.quantityPerPlat),
      ingredientAvailableQuantity: toNumber(line.ingredient.quantity),
      ingredientIsActive: line.ingredient.isActive,
    })),
  };
}

export async function setPlatRecipe(platId: string, lines: RecipeLineInput[]) {
  if (!Array.isArray(lines) || lines.length === 0) {
    throw new Error('Recipe must contain at least one ingredient line');
  }

  const invalidLine = lines.find(
    (line) => !line.ingredientId || !Number.isFinite(line.quantityPerPlat) || line.quantityPerPlat <= 0
  );

  if (invalidLine) {
    throw new Error('Each recipe line must contain a valid ingredientId and quantityPerPlat > 0');
  }

  const duplicate = lines.find(
    (line, index, all) => all.findIndex((other) => other.ingredientId === line.ingredientId) !== index
  );

  if (duplicate) {
    throw new Error('Duplicate ingredients are not allowed in a recipe');
  }

  const plat = await prisma.plat.findUnique({ where: { id: platId }, select: { id: true } });
  if (!plat) {
    throw new Error('Plat not found');
  }

  const ingredientIds = lines.map((line) => line.ingredientId);
  const ingredients = await prisma.ingredient.findMany({
    where: { id: { in: ingredientIds }, isActive: true },
    select: { id: true },
  });

  if (ingredients.length !== ingredientIds.length) {
    throw new Error('Some ingredients are invalid or inactive');
  }

  await prisma.$transaction(async (tx) => {
    await tx.platIngredient.deleteMany({ where: { platId } });
    await tx.platIngredient.createMany({
      data: lines.map((line) => ({
        platId,
        ingredientId: line.ingredientId,
        quantityPerPlat: new Prisma.Decimal(line.quantityPerPlat),
      })),
    });
  });

  return getPlatRecipe(platId);
}

export async function reserveIngredientsForOrder(data: ReserveOrderStockInput) {
  const reference = String(data.reference || '').trim();
  if (!reference) {
    throw new Error('Reservation reference is required');
  }

  if (!Array.isArray(data.items) || data.items.length === 0) {
    throw new Error('At least one order item is required to reserve stock');
  }

  const normalizedItems = data.items.map((item) => ({
    platId: String(item.platId || '').trim(),
    quantity: Number(item.quantity),
  }));

  const invalidItem = normalizedItems.find(
    (item) => !item.platId || !Number.isFinite(item.quantity) || !Number.isInteger(item.quantity) || item.quantity <= 0
  );

  if (invalidItem) {
    throw new Error('Each item must include a valid platId and quantity > 0');
  }

  const itemByPlat = new Map<string, number>();
  for (const item of normalizedItems) {
    itemByPlat.set(item.platId, (itemByPlat.get(item.platId) || 0) + item.quantity);
  }

  const platIds = [...itemByPlat.keys()];

  const reservation = await prisma.$transaction(async (tx) => {
    const existingReservation = await tx.ingredientReservation.findUnique({
      where: { reference },
      include: {
        lines: {
          include: {
            ingredient: {
              select: { id: true, name: true, unit: true },
            },
          },
        },
      },
    });

    if (existingReservation) {
      if (existingReservation.status === IngredientReservationStatus.RESERVED) {
        return existingReservation;
      }

      throw new Error(`Reservation ${reference} already exists with status ${existingReservation.status}`);
    }

    const recipeLines = await tx.platIngredient.findMany({
      where: { platId: { in: platIds } },
      include: {
        ingredient: {
          select: {
            id: true,
            name: true,
            unit: true,
            quantity: true,
            isActive: true,
            lowStockThreshold: true,
          },
        },
      },
    });

    const recipeByPlat = new Map<string, typeof recipeLines>();
    for (const recipeLine of recipeLines) {
      const existing = recipeByPlat.get(recipeLine.platId) || [];
      existing.push(recipeLine);
      recipeByPlat.set(recipeLine.platId, existing);
    }

    const platsWithoutRecipe = platIds.filter((platId) => {
      const linesForPlat = recipeByPlat.get(platId) || [];
      return linesForPlat.length === 0;
    });

    if (platsWithoutRecipe.length > 0) {
      throw new Error(`Missing recipe for plat(s): ${platsWithoutRecipe.join(', ')}`);
    }

    const requiredByIngredient = new Map<
      string,
      { ingredientId: string; ingredientName: string; ingredientUnit: string; requiredQuantity: number }
    >();

    for (const [platId, orderedQuantity] of itemByPlat.entries()) {
      const linesForPlat = recipeByPlat.get(platId) || [];
      for (const line of linesForPlat) {
        if (!line.ingredient.isActive) {
          throw new Error(`Ingredient is inactive: ${line.ingredient.name}`);
        }

        const current = requiredByIngredient.get(line.ingredientId);
        const requiredQuantity = toNumber(line.quantityPerPlat) * orderedQuantity;

        if (!current) {
          requiredByIngredient.set(line.ingredientId, {
            ingredientId: line.ingredientId,
            ingredientName: line.ingredient.name,
            ingredientUnit: line.ingredient.unit,
            requiredQuantity,
          });
        } else {
          current.requiredQuantity += requiredQuantity;
        }
      }
    }

    const requirements = [...requiredByIngredient.values()];

    for (const requirement of requirements) {
      const requiredDecimal = new Prisma.Decimal(requirement.requiredQuantity);
      const updated = await tx.ingredient.updateMany({
        where: {
          id: requirement.ingredientId,
          isActive: true,
          quantity: { gte: requiredDecimal },
        },
        data: {
          quantity: { decrement: requiredDecimal },
        },
      });

      if (updated.count === 0) {
        throw new Error(`Insufficient stock for ingredient: ${requirement.ingredientName}`);
      }
    }

    const affectedIngredientIds = requirements.map((requirement) => requirement.ingredientId);
    const affectedIngredients = await tx.ingredient.findMany({
      where: { id: { in: affectedIngredientIds } },
      select: {
        id: true,
        quantity: true,
        lowStockThreshold: true,
      },
    });

    for (const ingredient of affectedIngredients) {
      const nextQty = toNumber(ingredient.quantity);
      const threshold = toNumber(ingredient.lowStockThreshold);
      await tx.ingredient.update({
        where: { id: ingredient.id },
        data: {
          isLowStock: nextQty <= threshold,
        },
      });
    }

    const created = await tx.ingredientReservation.create({
      data: {
        reference,
        reason: data.reason,
        status: IngredientReservationStatus.RESERVED,
        lines: {
          create: requirements.map((requirement) => ({
            ingredientId: requirement.ingredientId,
            quantity: new Prisma.Decimal(requirement.requiredQuantity),
          })),
        },
      },
      include: {
        lines: {
          include: {
            ingredient: {
              select: { id: true, name: true, unit: true },
            },
          },
        },
      },
    });

    return created;
  });

  return normalizeReservation(reservation);
}

export async function getStockReservation(reference: string) {
  const normalizedReference = String(reference || '').trim();
  if (!normalizedReference) {
    throw new Error('Reservation reference is required');
  }

  const reservation = await prisma.ingredientReservation.findUnique({
    where: { reference: normalizedReference },
    include: {
      lines: {
        include: {
          ingredient: {
            select: { id: true, name: true, unit: true },
          },
        },
      },
    },
  });

  if (!reservation) {
    return null;
  }

  return normalizeReservation(reservation);
}

export async function releaseStockReservation(reference: string) {
  const normalizedReference = String(reference || '').trim();
  if (!normalizedReference) {
    throw new Error('Reservation reference is required');
  }

  const reservation = await prisma.$transaction(async (tx) => {
    const existing = await tx.ingredientReservation.findUnique({
      where: { reference: normalizedReference },
      include: {
        lines: {
          include: {
            ingredient: {
              select: { id: true, name: true, unit: true, lowStockThreshold: true },
            },
          },
        },
      },
    });

    if (!existing) {
      return null;
    }

    if (existing.status === IngredientReservationStatus.RELEASED) {
      return existing;
    }

    if (existing.status === IngredientReservationStatus.CONSUMED) {
      throw new Error('A consumed reservation cannot be released');
    }

    for (const line of existing.lines) {
      await tx.ingredient.update({
        where: { id: line.ingredientId },
        data: {
          quantity: { increment: line.quantity },
        },
      });
    }

    const ingredients = await tx.ingredient.findMany({
      where: { id: { in: existing.lines.map((line) => line.ingredientId) } },
      select: { id: true, quantity: true, lowStockThreshold: true },
    });

    for (const ingredient of ingredients) {
      await tx.ingredient.update({
        where: { id: ingredient.id },
        data: {
          isLowStock: toNumber(ingredient.quantity) <= toNumber(ingredient.lowStockThreshold),
        },
      });
    }

    return tx.ingredientReservation.update({
      where: { id: existing.id },
      data: { status: IngredientReservationStatus.RELEASED },
      include: {
        lines: {
          include: {
            ingredient: {
              select: { id: true, name: true, unit: true },
            },
          },
        },
      },
    });
  });

  if (!reservation) {
    return null;
  }

  return normalizeReservation(reservation);
}

export async function consumeStockReservation(reference: string) {
  const normalizedReference = String(reference || '').trim();
  if (!normalizedReference) {
    throw new Error('Reservation reference is required');
  }

  const reservation = await prisma.ingredientReservation.findUnique({
    where: { reference: normalizedReference },
    include: {
      lines: {
        include: {
          ingredient: {
            select: { id: true, name: true, unit: true },
          },
        },
      },
    },
  });

  if (!reservation) {
    return null;
  }

  if (reservation.status === IngredientReservationStatus.CONSUMED) {
    return normalizeReservation(reservation);
  }

  if (reservation.status === IngredientReservationStatus.RELEASED) {
    throw new Error('A released reservation cannot be consumed');
  }

  const updated = await prisma.ingredientReservation.update({
    where: { id: reservation.id },
    data: {
      status: IngredientReservationStatus.CONSUMED,
    },
    include: {
      lines: {
        include: {
          ingredient: {
            select: { id: true, name: true, unit: true },
          },
        },
      },
    },
  });

  return normalizeReservation(updated);
}
