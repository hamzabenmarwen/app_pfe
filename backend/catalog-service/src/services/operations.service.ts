import { Prisma, PurchaseOrderStatus, ExpenseStatus } from '@prisma/client';
import prisma from '../config/database';

export interface PurchaseOrderLineInput {
  ingredientId: string;
  quantity: number;
  unitCost: number;
}

export interface CreatePurchaseOrderInput {
  supplierId: string;
  expectedDate?: string;
  notes?: string;
  lines: PurchaseOrderLineInput[];
}

export interface PurchaseOrderFilters {
  status?: PurchaseOrderStatus;
  supplierId?: string;
  search?: string;
}

export interface CreateExpenseInput {
  title: string;
  category: string;
  amount: number;
  expenseDate: string;
  supplierName?: string;
  paymentMethod?: string;
  notes?: string;
}

export interface ExpenseFilters {
  status?: ExpenseStatus;
  category?: string;
  from?: string;
  to?: string;
  search?: string;
}

export interface AuditLogFilters {
  module?: string;
  search?: string;
  limit?: number;
}

function toNumber(value: Prisma.Decimal | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  return Number(value);
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

async function addAuditLog(params: {
  module: string;
  action: string;
  entityType: string;
  entityId: string;
  message: string;
  actorId?: string;
  metadata?: Prisma.InputJsonValue | null;
}) {
  const metadataValue = params.metadata === null ? Prisma.JsonNull : params.metadata;

  await prisma.auditLog.create({
    data: {
      module: params.module,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      message: params.message,
      actorId: params.actorId,
      metadata: metadataValue,
    },
  });
}

function buildPONumber() {
  const d = new Date();
  const datePart = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  const rand = Math.floor(Math.random() * 900 + 100);
  return `PO-${datePart}-${rand}`;
}

export async function getPurchaseOrders(filters: PurchaseOrderFilters = {}) {
  const where: Prisma.PurchaseOrderWhereInput = {};

  if (filters.status) where.status = filters.status;
  if (filters.supplierId) where.supplierId = filters.supplierId;

  if (filters.search) {
    where.OR = [
      { poNumber: { contains: filters.search, mode: 'insensitive' } },
      { supplier: { name: { contains: filters.search, mode: 'insensitive' } } },
      {
        lines: {
          some: {
            ingredient: {
              name: { contains: filters.search, mode: 'insensitive' },
            },
          },
        },
      },
    ];
  }

  const orders = await prisma.purchaseOrder.findMany({
    where,
    orderBy: [{ createdAt: 'desc' }],
    include: {
      supplier: {
        select: {
          id: true,
          name: true,
        },
      },
      lines: {
        include: {
          ingredient: {
            select: {
              id: true,
              name: true,
              unit: true,
            },
          },
        },
      },
    },
  });

  return orders.map(transformPurchaseOrder);
}

export async function createPurchaseOrder(input: CreatePurchaseOrderInput, actorId?: string) {
  if (!input.lines?.length) {
    throw new Error('At least one line is required');
  }

  const supplier = await prisma.supplier.findUnique({
    where: { id: input.supplierId },
    select: { id: true, name: true, isActive: true },
  });

  if (!supplier || !supplier.isActive) {
    throw new Error('Supplier not found');
  }

  const ingredientIds = [...new Set(input.lines.map((line) => line.ingredientId))];
  const ingredients = await prisma.ingredient.findMany({
    where: { id: { in: ingredientIds }, isActive: true },
    select: { id: true },
  });
  const ingredientIdSet = new Set(ingredients.map((i) => i.id));

  for (const line of input.lines) {
    if (!ingredientIdSet.has(line.ingredientId)) {
      throw new Error(`Ingredient not found: ${line.ingredientId}`);
    }
    if (!(line.quantity > 0)) {
      throw new Error('Line quantity must be greater than zero');
    }
    if (!(line.unitCost > 0)) {
      throw new Error('Line unitCost must be greater than zero');
    }
  }

  let poNumber = buildPONumber();
  let attempts = 0;
  while (attempts < 5) {
    const exists = await prisma.purchaseOrder.findUnique({ where: { poNumber }, select: { id: true } });
    if (!exists) break;
    poNumber = buildPONumber();
    attempts += 1;
  }

  const subtotal = input.lines.reduce((sum, line) => sum + line.quantity * line.unitCost, 0);

  const created = await prisma.purchaseOrder.create({
    data: {
      poNumber,
      supplierId: supplier.id,
      expectedDate: input.expectedDate ? new Date(input.expectedDate) : null,
      notes: input.notes,
      subtotal: new Prisma.Decimal(subtotal),
      createdBy: actorId,
      lines: {
        create: input.lines.map((line) => ({
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

  await addAuditLog({
    module: 'purchase-orders',
    action: 'create',
    entityType: 'purchase-order',
    entityId: created.id,
    actorId,
    message: `Purchase order ${created.poNumber} created`,
    metadata: {
      supplierId: created.supplierId,
      linesCount: created.lines.length,
      subtotal,
    },
  });

  return transformPurchaseOrder(created);
}

export async function updatePurchaseOrderStatus(id: string, status: PurchaseOrderStatus, actorId?: string) {
  const existing = await prisma.purchaseOrder.findUnique({
    where: { id },
    include: {
      lines: true,
    },
  });

  if (!existing) {
    throw new Error('Purchase order not found');
  }

  if (existing.status === 'CANCELLED' || existing.status === 'RECEIVED') {
    throw new Error('Purchase order can no longer be changed');
  }

  // Strict state machine for PO transitions
  const validPOTransitions: Record<string, string[]> = {
    DRAFT: ['SENT', 'CANCELLED'],
    SENT: ['RECEIVED', 'CANCELLED'],
  };

  const allowed = validPOTransitions[existing.status];
  if (!allowed || !allowed.includes(status)) {
    throw new Error(`Cannot transition purchase order from ${existing.status} to ${status}`);
  }

  if (status === 'RECEIVED') {
    const result = await prisma.$transaction(async (tx) => {
      for (const line of existing.lines) {
        const ingredient = await tx.ingredient.findUnique({ where: { id: line.ingredientId } });
        if (!ingredient) continue;

        const currentQty = Number(ingredient.quantity);
        const incomingQty = Number(line.quantity);
        const newQty = currentQty + incomingQty;
        const threshold = Number(ingredient.lowStockThreshold);

        await tx.ingredient.update({
          where: { id: ingredient.id },
          data: {
            quantity: new Prisma.Decimal(newQty),
            isLowStock: newQty <= threshold,
          },
        });
      }

      const updated = await tx.purchaseOrder.update({
        where: { id },
        data: {
          status,
          receivedAt: new Date(),
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
          action: 'receive',
          entityType: 'purchase-order',
          entityId: updated.id,
          actorId,
          message: `Purchase order ${updated.poNumber} received`,
          metadata: {
            linesCount: updated.lines.length,
            subtotal: Number(updated.subtotal),
          },
        },
      });

      return updated;
    });

    return transformPurchaseOrder(result);
  }

  const updated = await prisma.purchaseOrder.update({
    where: { id },
    data: {
      status,
      sentAt: status === 'SENT' ? new Date() : null,
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

  await addAuditLog({
    module: 'purchase-orders',
    action: 'status-change',
    entityType: 'purchase-order',
    entityId: updated.id,
    actorId,
    message: `Purchase order ${updated.poNumber} status changed to ${status}`,
    metadata: {
      previousStatus: existing.status,
      newStatus: status,
    },
  });

  return transformPurchaseOrder(updated);
}

export async function getExpenses(filters: ExpenseFilters = {}) {
  const where: Prisma.ExpenseWhereInput = {};

  if (filters.status) where.status = filters.status;
  if (filters.category) where.category = filters.category;

  if (filters.from || filters.to) {
    where.expenseDate = {
      gte: filters.from ? new Date(filters.from) : undefined,
      lte: filters.to ? new Date(filters.to) : undefined,
    };
  }

  if (filters.search) {
    where.OR = [
      { title: { contains: filters.search, mode: 'insensitive' } },
      { category: { contains: filters.search, mode: 'insensitive' } },
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

export async function createExpense(input: CreateExpenseInput, actorId?: string) {
  if (!input.title.trim()) throw new Error('Title is required');
  if (!(input.amount > 0)) throw new Error('Amount must be greater than zero');
  if (!input.expenseDate) throw new Error('Expense date is required');

  const created = await prisma.expense.create({
    data: {
      title: input.title.trim(),
      category: input.category.trim() || 'Other',
      amount: new Prisma.Decimal(input.amount),
      expenseDate: new Date(input.expenseDate),
      supplierName: input.supplierName,
      paymentMethod: input.paymentMethod,
      notes: input.notes,
      createdBy: actorId,
    },
  });

  await addAuditLog({
    module: 'expenses',
    action: 'create',
    entityType: 'expense',
    entityId: created.id,
    actorId,
    message: `Expense ${created.title} created`,
    metadata: {
      amount: input.amount,
      category: created.category,
    },
  });

  return transformExpense(created);
}

export async function updateExpenseStatus(id: string, status: ExpenseStatus, actorId?: string) {
  const existing = await prisma.expense.findUnique({ where: { id } });
  if (!existing) throw new Error('Expense not found');

  // Strict state machine for expense transitions
  const validExpenseTransitions: Record<string, string[]> = {
    DRAFT: ['APPROVED', 'REJECTED'],
    APPROVED: ['PAID', 'REJECTED'],
    PAID: [],      // terminal
    REJECTED: [],  // terminal
  };

  const allowed = validExpenseTransitions[existing.status];
  if (!allowed || !allowed.includes(status)) {
    throw new Error(`Cannot transition expense from ${existing.status} to ${status}`);
  }

  const updated = await prisma.expense.update({
    where: { id },
    data: { status },
  });

  await addAuditLog({
    module: 'expenses',
    action: 'status-change',
    entityType: 'expense',
    entityId: updated.id,
    actorId,
    message: `Expense ${updated.title} status changed to ${status}`,
    metadata: {
      previousStatus: existing.status,
      newStatus: status,
    },
  });

  return transformExpense(updated);
}

export async function deleteExpense(id: string, actorId?: string) {
  const existing = await prisma.expense.findUnique({ where: { id } });
  if (!existing) throw new Error('Expense not found');

  // Only DRAFT expenses can be deleted
  if (existing.status !== 'DRAFT') {
    throw new Error('Only draft expenses can be deleted');
  }

  await prisma.expense.delete({ where: { id } });

  await addAuditLog({
    module: 'expenses',
    action: 'delete',
    entityType: 'expense',
    entityId: id,
    actorId,
    message: `Expense ${existing.title} deleted`,
    metadata: {
      amount: toNumber(existing.amount),
      category: existing.category,
    },
  });

  return { deleted: true };
}

export async function getAuditLogs(filters: AuditLogFilters = {}) {
  const where: Prisma.AuditLogWhereInput = {};

  if (filters.module) where.module = filters.module;

  if (filters.search) {
    where.OR = [
      { message: { contains: filters.search, mode: 'insensitive' } },
      { entityType: { contains: filters.search, mode: 'insensitive' } },
      { action: { contains: filters.search, mode: 'insensitive' } },
      { entityId: { contains: filters.search, mode: 'insensitive' } },
    ];
  }

  const logs = await prisma.auditLog.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: filters.limit && filters.limit > 0 ? Math.min(filters.limit, 1000) : 300,
  });

  return logs;
}

export async function createAuditLogEntry(input: {
  module: string;
  action: string;
  entityType: string;
  entityId: string;
  message: string;
  metadata?: Prisma.InputJsonValue | null;
}, actorId?: string) {
  const metadataValue = input.metadata === null ? Prisma.JsonNull : input.metadata;

  const created = await prisma.auditLog.create({
    data: {
      module: input.module,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      message: input.message,
      actorId,
      metadata: metadataValue,
    },
  });

  return created;
}
