import prisma from '../config/database';
import { Prisma } from '@prisma/client';
import crypto from 'crypto';

// Helper function to transform ingredient for API response
function transformIngredient(ingredient: any) {
  return {
    ...ingredient,
    quantity: Number(ingredient.quantity),
    minQuantity: Number(ingredient.minQuantity),
    lowStockThreshold: Number(ingredient.lowStockThreshold),
    costPerUnit: ingredient.costPerUnit ? Number(ingredient.costPerUnit) : null,
    supplier: ingredient.supplierRef?.name || ingredient.supplier || null,
    supplierRef: ingredient.supplierRef || null,
  };
}

function transformSupplier(supplier: any) {
  return {
    ...supplier,
    ingredientsCount: supplier._count?.ingredients ?? 0,
    lowStockIngredientsCount:
      supplier.ingredients?.filter((ingredient: any) => ingredient.isLowStock).length ?? 0,
  };
}

export interface CreateIngredientData {
  categoryId: string;
  supplierId?: string;
  name: string;
  description?: string;
  unit?: string;
  quantity?: number;
  minQuantity?: number;
  lowStockThreshold?: number;
  supplier?: string;
  costPerUnit?: number;
  expiryDate?: Date;
  storageLocation?: string;
}

export interface UpdateIngredientData {
  categoryId?: string;
  supplierId?: string | null;
  name?: string;
  description?: string;
  unit?: string;
  quantity?: number;
  minQuantity?: number;
  lowStockThreshold?: number;
  supplier?: string;
  costPerUnit?: number;
  expiryDate?: Date;
  storageLocation?: string;
  isActive?: boolean;
}

export interface CreatePurchaseOrderData {
  supplierId: string;
  expectedDate?: Date;
  notes?: string;
  lines: Array<{
    ingredientId: string;
    quantity: number;
    unitCost: number;
  }>;
}

export interface PurchaseOrderFilters {
  status?: 'DRAFT' | 'SENT' | 'RECEIVED' | 'CANCELLED';
  supplierId?: string;
  search?: string;
}

export interface CreateExpenseData {
  title: string;
  category: string;
  amount: number;
  expenseDate: Date;
  supplierName?: string;
  paymentMethod?: string;
  notes?: string;
}

export interface ExpenseFilters {
  status?: 'DRAFT' | 'APPROVED' | 'PAID' | 'REJECTED';
  category?: string;
  from?: Date;
  to?: Date;
  search?: string;
}

export interface CreateAuditLogData {
  module: string;
  action: string;
  entityType: string;
  entityId: string;
  message: string;
  actorId?: string;
  metadata?: Record<string, unknown>;
}

export interface IngredientFilters {
  categoryId?: string;
  supplierId?: string;
  search?: string;
  isLowStock?: boolean;
  isActive?: boolean;
}

function transformPurchaseOrder(order: any) {
  return {
    ...order,
    subtotal: Number(order.subtotal),
    lines: (order.lines || []).map((line: any) => ({
      ...line,
      quantity: Number(line.quantity),
      unitCost: Number(line.unitCost),
      lineTotal: Number(line.lineTotal),
      ingredientName: line.ingredient?.name,
      unit: line.ingredient?.unit,
    })),
  };
}

function transformExpense(expense: any) {
  return {
    ...expense,
    amount: Number(expense.amount),
  };
}

function transformAuditLog(log: any) {
  return {
    ...log,
    metadata: log.metadata || null,
  };
}

function generatePurchaseOrderNumber() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const suffix = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `PO-${y}${m}${d}-${suffix}`;
}

export interface CreateSupplierData {
  name: string;
  contactName?: string;
  email?: string;
  phone?: string;
  address?: string;
  leadTimeDays?: number;
  paymentTerms?: string;
  notes?: string;
}

export interface UpdateSupplierData {
  name?: string;
  contactName?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  leadTimeDays?: number | null;
  paymentTerms?: string | null;
  notes?: string | null;
  isActive?: boolean;
}

export interface PaginationOptions {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export async function getAllIngredients(
  filters: IngredientFilters = {},
  pagination: PaginationOptions = { page: 1, limit: 10 }
) {
  const { page, limit, sortBy = 'createdAt', sortOrder = 'desc' } = pagination;
  const skip = (page - 1) * limit;

  const where: Prisma.IngredientWhereInput = {};

  if (filters.categoryId) {
    where.categoryId = filters.categoryId;
  }

  if (filters.supplierId) {
    where.supplierId = filters.supplierId;
  }

  if (filters.isLowStock !== undefined) {
    where.isLowStock = filters.isLowStock;
  }

  if (filters.isActive !== undefined) {
    where.isActive = filters.isActive;
  }

  if (filters.search) {
    where.OR = [
      { name: { contains: filters.search, mode: 'insensitive' } },
      { description: { contains: filters.search, mode: 'insensitive' } },
      { supplier: { contains: filters.search, mode: 'insensitive' } },
    ];
  }

  const [ingredients, total] = await Promise.all([
    prisma.ingredient.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      include: {
        category: {
          select: { id: true, name: true },
        },
        supplierRef: {
          select: { id: true, name: true },
        },
      },
    }),
    prisma.ingredient.count({ where }),
  ]);

  return {
    ingredients: ingredients.map(transformIngredient),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getIngredientById(id: string) {
  const ingredient = await prisma.ingredient.findUnique({
    where: { id },
    include: {
      category: true,
      supplierRef: {
        select: { id: true, name: true },
      },
    },
  });

  if (!ingredient) {
    throw new Error('Ingredient not found');
  }

  return transformIngredient(ingredient);
}

export async function createIngredient(data: CreateIngredientData) {
  const category = await prisma.ingredientCategory.findUnique({
    where: { id: data.categoryId },
  });

  if (!category) {
    throw new Error('Category not found');
  }

  let supplierName: string | undefined;
  if (data.supplierId) {
    const supplier = await prisma.supplier.findUnique({ where: { id: data.supplierId } });
    if (!supplier || !supplier.isActive) {
      throw new Error('Supplier not found');
    }
    supplierName = supplier.name;
  }

  const ingredient = await prisma.ingredient.create({
    data: {
      ...data,
      supplier: supplierName ?? data.supplier,
      quantity: new Prisma.Decimal(data.quantity ?? 0),
      minQuantity: new Prisma.Decimal(data.minQuantity ?? 0),
      lowStockThreshold: new Prisma.Decimal(data.lowStockThreshold ?? 5),
      costPerUnit: data.costPerUnit ? new Prisma.Decimal(data.costPerUnit) : null,
      isLowStock: (data.quantity ?? 0) <= (data.lowStockThreshold ?? 5),
    },
    include: {
      category: {
        select: { id: true, name: true },
      },
      supplierRef: {
        select: { id: true, name: true },
      },
    },
  });

  return transformIngredient(ingredient);
}

export async function updateIngredient(id: string, data: UpdateIngredientData) {
  const existing = await prisma.ingredient.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new Error('Ingredient not found');
  }

  if (data.categoryId) {
    const category = await prisma.ingredientCategory.findUnique({
      where: { id: data.categoryId },
    });
    if (!category) {
      throw new Error('Category not found');
    }
  }

  const updateData: any = { ...data };

  if (data.supplierId) {
    const supplier = await prisma.supplier.findUnique({ where: { id: data.supplierId } });
    if (!supplier || !supplier.isActive) {
      throw new Error('Supplier not found');
    }
    updateData.supplier = supplier.name;
  }

  if (data.supplierId === null) {
    updateData.supplier = null;
  }

  if (data.quantity !== undefined) {
    updateData.quantity = new Prisma.Decimal(data.quantity);
  }
  if (data.minQuantity !== undefined) {
    updateData.minQuantity = new Prisma.Decimal(data.minQuantity);
  }
  if (data.lowStockThreshold !== undefined) {
    updateData.lowStockThreshold = new Prisma.Decimal(data.lowStockThreshold);
  }
  if (data.costPerUnit !== undefined) {
    updateData.costPerUnit = data.costPerUnit ? new Prisma.Decimal(data.costPerUnit) : null;
  }

  // Recalculate isLowStock if quantity or threshold changed
  if (data.quantity !== undefined || data.lowStockThreshold !== undefined) {
    const newQuantity = data.quantity !== undefined ? data.quantity : Number(existing.quantity);
    const newThreshold = data.lowStockThreshold !== undefined ? data.lowStockThreshold : Number(existing.lowStockThreshold);
    updateData.isLowStock = newQuantity <= newThreshold;
  }

  const ingredient = await prisma.ingredient.update({
    where: { id },
    data: updateData,
    include: {
      category: {
        select: { id: true, name: true },
      },
      supplierRef: {
        select: { id: true, name: true },
      },
    },
  });

  return transformIngredient(ingredient);
}

export async function deleteIngredient(id: string) {
  const existing = await prisma.ingredient.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new Error('Ingredient not found');
  }

  await prisma.ingredient.delete({
    where: { id },
  });
}

export async function updateStock(id: string, quantity: number, lowStockThreshold?: number) {
  const ingredient = await prisma.ingredient.findUnique({ where: { id } });
  if (!ingredient) throw new Error('Ingredient not found');

  const threshold = lowStockThreshold !== undefined ? lowStockThreshold : Number(ingredient.lowStockThreshold);
  const isLowStock = quantity <= threshold;

  const updated = await prisma.ingredient.update({
    where: { id },
    data: {
      quantity: new Prisma.Decimal(quantity),
      lowStockThreshold: new Prisma.Decimal(threshold),
      isLowStock,
    },
    include: {
      category: { select: { id: true, name: true } },
      supplierRef: { select: { id: true, name: true } },
    },
  });

  return transformIngredient(updated);
}

export async function getLowStockItems() {
  const ingredients = await prisma.ingredient.findMany({
    where: { isLowStock: true, isActive: true },
    orderBy: { quantity: 'asc' },
    include: {
      category: { select: { id: true, name: true } },
      supplierRef: { select: { id: true, name: true } },
    },
  });

  return ingredients.map(transformIngredient);
}

export async function getAllIngredientsStock() {
  const ingredients = await prisma.ingredient.findMany({
    orderBy: [{ isLowStock: 'desc' }, { quantity: 'asc' }, { name: 'asc' }],
    include: {
      category: { select: { id: true, name: true } },
    },
  });

  return ingredients.map(transformIngredient);
}

// Ingredient Category Services

export async function getAllIngredientCategories() {
  return prisma.ingredientCategory.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
  });
}

export async function createIngredientCategory(data: { name: string; description?: string }) {
  return prisma.ingredientCategory.create({
    data,
  });
}

export async function updateIngredientCategory(id: string, data: { name?: string; description?: string; isActive?: boolean }) {
  const existing = await prisma.ingredientCategory.findUnique({ where: { id } });
  if (!existing) throw new Error('Category not found');

  return prisma.ingredientCategory.update({
    where: { id },
    data,
  });
}

export async function deleteIngredientCategory(id: string) {
  const existing = await prisma.ingredientCategory.findUnique({ where: { id } });
  if (!existing) throw new Error('Category not found');

  await prisma.ingredientCategory.delete({ where: { id } });
}

// Supplier Services

export async function getAllSuppliers(search?: string, includeInactive = false) {
  const where: Prisma.SupplierWhereInput = {};

  if (!includeInactive) {
    where.isActive = true;
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { contactName: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { phone: { contains: search, mode: 'insensitive' } },
    ];
  }

  const suppliers = await prisma.supplier.findMany({
    where,
    orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
    include: {
      _count: {
        select: {
          ingredients: true,
        },
      },
      ingredients: {
        select: {
          id: true,
          isLowStock: true,
        },
      },
    },
  });

  return suppliers.map(transformSupplier);
}

export async function getSupplierById(id: string) {
  const supplier = await prisma.supplier.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          ingredients: true,
        },
      },
      ingredients: {
        select: {
          id: true,
          name: true,
          unit: true,
          quantity: true,
          costPerUnit: true,
          isLowStock: true,
          isActive: true,
          updatedAt: true,
        },
      },
    },
  });

  if (!supplier) {
    throw new Error('Supplier not found');
  }

  return {
    ...transformSupplier(supplier),
    ingredients: supplier.ingredients.map((ingredient: any) => ({
      ...ingredient,
      quantity: Number(ingredient.quantity),
      costPerUnit: ingredient.costPerUnit ? Number(ingredient.costPerUnit) : null,
    })),
  };
}

export async function createSupplier(data: CreateSupplierData) {
  const supplier = await prisma.supplier.create({
    data,
    include: {
      _count: {
        select: {
          ingredients: true,
        },
      },
      ingredients: {
        select: {
          id: true,
          isLowStock: true,
        },
      },
    },
  });

  return transformSupplier(supplier);
}

export async function updateSupplier(id: string, data: UpdateSupplierData) {
  const existing = await prisma.supplier.findUnique({ where: { id } });
  if (!existing) {
    throw new Error('Supplier not found');
  }

  const supplier = await prisma.supplier.update({
    where: { id },
    data,
    include: {
      _count: {
        select: {
          ingredients: true,
        },
      },
      ingredients: {
        select: {
          id: true,
          isLowStock: true,
        },
      },
    },
  });

  if (data.name && data.name !== existing.name) {
    await prisma.ingredient.updateMany({
      where: { supplierId: id },
      data: { supplier: data.name },
    });
  }

  return transformSupplier(supplier);
}

export async function deleteSupplier(id: string) {
  const existing = await prisma.supplier.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          ingredients: true,
        },
      },
    },
  });

  if (!existing) {
    throw new Error('Supplier not found');
  }

  await prisma.ingredient.updateMany({
    where: { supplierId: id },
    data: {
      supplierId: null,
    },
  });

  await prisma.supplier.delete({ where: { id } });

  return {
    unlinkedIngredients: existing._count.ingredients,
  };
}

// Purchase Order Services

export async function getPurchaseOrders(filters: PurchaseOrderFilters = {}) {
  const where: Prisma.PurchaseOrderWhereInput = {};

  if (filters.status) where.status = filters.status;
  if (filters.supplierId) where.supplierId = filters.supplierId;
  if (filters.search) {
    where.OR = [
      { poNumber: { contains: filters.search, mode: 'insensitive' } },
      { supplier: { name: { contains: filters.search, mode: 'insensitive' } } },
      { notes: { contains: filters.search, mode: 'insensitive' } },
    ];
  }

  const orders = await prisma.purchaseOrder.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      supplier: { select: { id: true, name: true } },
      lines: {
        include: {
          ingredient: { select: { id: true, name: true, unit: true } },
        },
      },
    },
  });

  return orders.map(transformPurchaseOrder);
}

export async function createPurchaseOrder(data: CreatePurchaseOrderData, actorId?: string) {
  if (!data.lines?.length) {
    throw new Error('At least one line is required');
  }

  const invalidLine = data.lines.find(
    (line) =>
      !line.ingredientId ||
      !Number.isFinite(line.quantity) ||
      line.quantity <= 0 ||
      !Number.isFinite(line.unitCost) ||
      line.unitCost <= 0
  );
  if (invalidLine) {
    throw new Error('Each purchase order line must have valid ingredient, quantity and unit cost');
  }

  const duplicateIngredient = data.lines.find(
    (line, index, lines) => lines.findIndex((other) => other.ingredientId === line.ingredientId) !== index
  );
  if (duplicateIngredient) {
    throw new Error('Duplicate ingredients are not allowed in the same purchase order');
  }

  const supplier = await prisma.supplier.findUnique({ where: { id: data.supplierId } });
  if (!supplier || !supplier.isActive) {
    throw new Error('Supplier not found');
  }

  const ingredientIds = [...new Set(data.lines.map((line) => line.ingredientId))];
  const ingredients = await prisma.ingredient.findMany({
    where: { id: { in: ingredientIds }, isActive: true },
    select: { id: true },
  });

  if (ingredients.length !== ingredientIds.length) {
    throw new Error('Some ingredients are invalid');
  }

  const subtotal = data.lines.reduce((sum, line) => sum + line.quantity * line.unitCost, 0);

  const created = await prisma.$transaction(async (tx) => {
    const order = await tx.purchaseOrder.create({
      data: {
        poNumber: generatePurchaseOrderNumber(),
        supplierId: data.supplierId,
        expectedDate: data.expectedDate,
        notes: data.notes,
        subtotal: new Prisma.Decimal(subtotal),
        createdBy: actorId,
        lines: {
          create: data.lines.map((line) => ({
            ingredientId: line.ingredientId,
            quantity: new Prisma.Decimal(line.quantity),
            unitCost: new Prisma.Decimal(line.unitCost),
            lineTotal: new Prisma.Decimal(line.quantity * line.unitCost),
          })),
        },
      },
      include: {
        supplier: { select: { id: true, name: true } },
        lines: {
          include: {
            ingredient: { select: { id: true, name: true, unit: true } },
          },
        },
      },
    });

    await tx.auditLog.create({
      data: {
        module: 'purchase-orders',
        action: 'create',
        entityType: 'purchase-order',
        entityId: order.id,
        message: `Creation du bon ${order.poNumber}`,
        actorId,
        metadata: {
          supplierId: order.supplierId,
          linesCount: order.lines.length,
          subtotal,
        },
      },
    });

    return order;
  });

  return transformPurchaseOrder(created);
}

export async function updatePurchaseOrderStatus(
  id: string,
  status: 'DRAFT' | 'SENT' | 'RECEIVED' | 'CANCELLED',
  actorId?: string
) {
  const order = await prisma.purchaseOrder.findUnique({
    where: { id },
    include: {
      lines: true,
    },
  });

  if (!order) throw new Error('Purchase order not found');

  const validTransitions: Record<'DRAFT' | 'SENT' | 'RECEIVED' | 'CANCELLED', Array<'DRAFT' | 'SENT' | 'RECEIVED' | 'CANCELLED'>> = {
    DRAFT: ['SENT', 'CANCELLED'],
    SENT: ['RECEIVED', 'CANCELLED'],
    RECEIVED: [],
    CANCELLED: [],
  };

  if (!validTransitions[order.status].includes(status)) {
    throw new Error(`Cannot transition purchase order from ${order.status} to ${status}`);
  }

  const updated = await prisma.$transaction(async (tx) => {
    if (status === 'RECEIVED') {
      for (const line of order.lines) {
        const ingredient = await tx.ingredient.findUnique({ where: { id: line.ingredientId } });
        if (!ingredient) {
          throw new Error('Ingredient not found while receiving order');
        }

        const nextQuantity = Number(ingredient.quantity) + Number(line.quantity);
        await tx.ingredient.update({
          where: { id: ingredient.id },
          data: {
            quantity: new Prisma.Decimal(nextQuantity),
            isLowStock: nextQuantity <= Number(ingredient.lowStockThreshold),
          },
        });
      }
    }

    const po = await tx.purchaseOrder.update({
      where: { id },
      data: {
        status,
        sentAt: status === 'SENT' ? new Date() : order.sentAt,
        receivedAt: status === 'RECEIVED' ? new Date() : order.receivedAt,
      },
      include: {
        supplier: { select: { id: true, name: true } },
        lines: {
          include: {
            ingredient: { select: { id: true, name: true, unit: true } },
          },
        },
      },
    });

    await tx.auditLog.create({
      data: {
        module: 'purchase-orders',
        action: 'status-change',
        entityType: 'purchase-order',
        entityId: po.id,
        message: `Statut bon ${po.poNumber} -> ${status}`,
        actorId,
        metadata: {
          status,
        },
      },
    });

    return po;
  });

  return transformPurchaseOrder(updated);
}

// Expense Services

export async function getExpenses(filters: ExpenseFilters = {}) {
  const where: Prisma.ExpenseWhereInput = {};

  if (filters.status) where.status = filters.status;
  if (filters.category) where.category = filters.category;
  if (filters.from || filters.to) {
    where.expenseDate = {};
    if (filters.from) where.expenseDate.gte = filters.from;
    if (filters.to) where.expenseDate.lte = filters.to;
  }
  if (filters.search) {
    where.OR = [
      { title: { contains: filters.search, mode: 'insensitive' } },
      { supplierName: { contains: filters.search, mode: 'insensitive' } },
      { notes: { contains: filters.search, mode: 'insensitive' } },
    ];
  }

  const expenses = await prisma.expense.findMany({
    where,
    orderBy: [{ expenseDate: 'desc' }, { createdAt: 'desc' }],
  });

  return expenses.map(transformExpense);
}

export async function createExpense(data: CreateExpenseData, actorId?: string) {
  const normalizedTitle = data.title?.trim();
  const normalizedCategory = data.category?.trim();
  const amount = Number(data.amount);

  if (!normalizedTitle) {
    throw new Error('Expense title is required');
  }
  if (!normalizedCategory) {
    throw new Error('Expense category is required');
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('Expense amount must be a positive number');
  }
  if (!(data.expenseDate instanceof Date) || Number.isNaN(data.expenseDate.getTime())) {
    throw new Error('Expense date is invalid');
  }

  const created = await prisma.$transaction(async (tx) => {
    const expense = await tx.expense.create({
      data: {
        title: normalizedTitle,
        category: normalizedCategory,
        amount: new Prisma.Decimal(amount),
        expenseDate: data.expenseDate,
        supplierName: data.supplierName,
        paymentMethod: data.paymentMethod,
        notes: data.notes,
        createdBy: actorId,
      },
    });

    await tx.auditLog.create({
      data: {
        module: 'expenses',
        action: 'create',
        entityType: 'expense',
        entityId: expense.id,
        message: `Creation depense ${expense.title}`,
        actorId,
        metadata: {
          amount: Number(expense.amount),
          category: expense.category,
        },
      },
    });

    return expense;
  });

  return transformExpense(created);
}

export async function updateExpenseStatus(
  id: string,
  status: 'DRAFT' | 'APPROVED' | 'PAID' | 'REJECTED',
  actorId?: string
) {
  const existing = await prisma.expense.findUnique({ where: { id } });
  if (!existing) throw new Error('Expense not found');

  const validTransitions: Record<'DRAFT' | 'APPROVED' | 'PAID' | 'REJECTED', Array<'DRAFT' | 'APPROVED' | 'PAID' | 'REJECTED'>> = {
    DRAFT: ['APPROVED', 'REJECTED'],
    APPROVED: ['PAID', 'REJECTED'],
    PAID: [],
    REJECTED: [],
  };

  if (!validTransitions[existing.status].includes(status)) {
    throw new Error(`Cannot transition expense from ${existing.status} to ${status}`);
  }

  const updated = await prisma.$transaction(async (tx) => {
    const expense = await tx.expense.update({
      where: { id },
      data: { status },
    });

    await tx.auditLog.create({
      data: {
        module: 'expenses',
        action: 'status-change',
        entityType: 'expense',
        entityId: expense.id,
        message: `Statut depense ${expense.title} -> ${status}`,
        actorId,
        metadata: {
          previousStatus: existing.status,
          newStatus: status,
        },
      },
    });

    return expense;
  });

  return transformExpense(updated);
}

export async function deleteExpense(id: string, actorId?: string) {
  const existing = await prisma.expense.findUnique({ where: { id } });
  if (!existing) throw new Error('Expense not found');

  if (existing.status !== 'DRAFT') {
    throw new Error('Only draft expenses can be deleted');
  }

  await prisma.$transaction(async (tx) => {
    await tx.expense.delete({ where: { id } });
    await tx.auditLog.create({
      data: {
        module: 'expenses',
        action: 'delete',
        entityType: 'expense',
        entityId: id,
        message: `Suppression depense ${existing.title}`,
        actorId,
        metadata: {
          amount: Number(existing.amount),
          category: existing.category,
        },
      },
    });
  });

  return { deleted: true };
}

// Audit Log Services

export async function getAuditLogs(params: { module?: string; search?: string; limit?: number } = {}) {
  const where: Prisma.AuditLogWhereInput = {};

  if (params.module) where.module = params.module;
  if (params.search) {
    where.OR = [
      { message: { contains: params.search, mode: 'insensitive' } },
      { action: { contains: params.search, mode: 'insensitive' } },
      { entityType: { contains: params.search, mode: 'insensitive' } },
      { entityId: { contains: params.search, mode: 'insensitive' } },
    ];
  }

  const logs = await prisma.auditLog.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: Math.min(params.limit || 500, 2000),
  });

  return logs.map(transformAuditLog);
}

export async function createAuditLog(data: CreateAuditLogData) {
  const log = await prisma.auditLog.create({
    data: {
      module: data.module,
      action: data.action,
      entityType: data.entityType,
      entityId: data.entityId,
      message: data.message,
      actorId: data.actorId,
      metadata: data.metadata ? (data.metadata as Prisma.InputJsonValue) : undefined,
    },
  });

  return transformAuditLog(log);
}
