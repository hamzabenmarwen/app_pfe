import { Response } from 'express';
import { ExpenseStatus, PurchaseOrderStatus } from '@prisma/client';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import * as operationsService from '../services/operations.service';

function getActorId(req: AuthenticatedRequest): string | undefined {
  return req.user?.userId;
}

function asPurchaseOrderStatus(value: string | undefined): PurchaseOrderStatus | undefined {
  if (!value) return undefined;
  if (!Object.values(PurchaseOrderStatus).includes(value as PurchaseOrderStatus)) {
    throw new Error('Invalid purchase order status');
  }
  return value as PurchaseOrderStatus;
}

function asExpenseStatus(value: string | undefined): ExpenseStatus | undefined {
  if (!value) return undefined;
  if (!Object.values(ExpenseStatus).includes(value as ExpenseStatus)) {
    throw new Error('Invalid expense status');
  }
  return value as ExpenseStatus;
}

export async function getPurchaseOrders(req: AuthenticatedRequest, res: Response) {
  try {
    const data = await operationsService.getPurchaseOrders({
      status: asPurchaseOrderStatus(req.query.status as string | undefined),
      supplierId: req.query.supplierId as string | undefined,
      search: req.query.search as string | undefined,
    });

    res.json({
      success: true,
      data,
    });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
}

export async function createPurchaseOrder(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.body?.supplierId) {
      return res.status(400).json({ success: false, error: 'supplierId is required' });
    }

    const lines = Array.isArray(req.body.lines) ? req.body.lines : [];
    if (lines.length === 0) {
      return res.status(400).json({ success: false, error: 'At least one line is required' });
    }

    const data = await operationsService.createPurchaseOrder(
      {
        supplierId: req.body.supplierId,
        expectedDate: req.body.expectedDate,
        notes: req.body.notes,
        lines,
      },
      getActorId(req)
    );

    res.status(201).json({
      success: true,
      data,
      message: 'Purchase order created successfully',
    });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
}

export async function updatePurchaseOrderStatus(req: AuthenticatedRequest, res: Response) {
  try {
    const status = asPurchaseOrderStatus(req.body?.status);
    if (!status) {
      return res.status(400).json({ success: false, error: 'status is required' });
    }

    const data = await operationsService.updatePurchaseOrderStatus(req.params.id, status, getActorId(req));

    res.json({
      success: true,
      data,
      message: 'Purchase order status updated successfully',
    });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
}

export async function getExpenses(req: AuthenticatedRequest, res: Response) {
  try {
    const data = await operationsService.getExpenses({
      status: asExpenseStatus(req.query.status as string | undefined),
      category: req.query.category as string | undefined,
      from: req.query.from as string | undefined,
      to: req.query.to as string | undefined,
      search: req.query.search as string | undefined,
    });

    res.json({
      success: true,
      data,
    });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
}

export async function createExpense(req: AuthenticatedRequest, res: Response) {
  try {
    const data = await operationsService.createExpense(
      {
        title: req.body?.title,
        category: req.body?.category,
        amount: Number(req.body?.amount),
        expenseDate: req.body?.expenseDate,
        supplierName: req.body?.supplierName,
        paymentMethod: req.body?.paymentMethod,
        notes: req.body?.notes,
      },
      getActorId(req)
    );

    res.status(201).json({
      success: true,
      data,
      message: 'Expense created successfully',
    });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
}

export async function updateExpenseStatus(req: AuthenticatedRequest, res: Response) {
  try {
    const status = asExpenseStatus(req.body?.status);
    if (!status) {
      return res.status(400).json({ success: false, error: 'status is required' });
    }

    const data = await operationsService.updateExpenseStatus(req.params.id, status, getActorId(req));

    res.json({
      success: true,
      data,
      message: 'Expense status updated successfully',
    });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
}

export async function deleteExpense(req: AuthenticatedRequest, res: Response) {
  try {
    const data = await operationsService.deleteExpense(req.params.id, getActorId(req));

    res.json({
      success: true,
      data,
      message: 'Expense deleted successfully',
    });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
}

export async function getAuditLogs(req: AuthenticatedRequest, res: Response) {
  try {
    const limit = req.query.limit ? Number(req.query.limit) : undefined;
    const data = await operationsService.getAuditLogs({
      module: req.query.module as string | undefined,
      search: req.query.search as string | undefined,
      limit,
    });

    res.json({
      success: true,
      data,
    });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
}

export async function createAuditLog(req: AuthenticatedRequest, res: Response) {
  try {
    const { module, action, entityType, entityId, message, metadata } = req.body || {};
    if (!module || !action || !entityType || !entityId || !message) {
      return res.status(400).json({ success: false, error: 'module, action, entityType, entityId and message are required' });
    }

    const data = await operationsService.createAuditLogEntry(
      {
        module,
        action,
        entityType,
        entityId,
        message,
        metadata,
      },
      getActorId(req)
    );

    res.status(201).json({
      success: true,
      data,
      message: 'Audit log created successfully',
    });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
}
