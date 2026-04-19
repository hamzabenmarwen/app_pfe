import { Request, Response } from 'express';
import * as ingredientService from '../services/ingredient.service';
import * as emailService from '../services/email.service';
import * as stockReservationService from '../services/stock-reservation.service';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

function hasInternalAccess(req: Request): boolean {
  const expectedToken = process.env.INTERNAL_SERVICE_TOKEN;
  const receivedToken = req.header('x-internal-service-token') || req.header('X-Internal-Service-Token');

  if (!expectedToken) {
    return true;
  }

  return receivedToken === expectedToken;
}

export async function createStockReservationInternal(req: Request, res: Response) {
  try {
    if (!hasInternalAccess(req)) {
      res.status(401).json({ success: false, error: 'Unauthorized internal request' });
      return;
    }

    const reservation = await stockReservationService.reserveIngredientsForOrder(req.body);
    res.status(201).json({
      success: true,
      data: reservation,
      message: 'Stock reserved successfully',
    });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
}

export async function getStockReservationInternal(req: Request, res: Response) {
  try {
    if (!hasInternalAccess(req)) {
      res.status(401).json({ success: false, error: 'Unauthorized internal request' });
      return;
    }

    const reservation = await stockReservationService.getStockReservation(req.params.reference);
    if (!reservation) {
      res.status(404).json({ success: false, error: 'Reservation not found' });
      return;
    }

    res.json({ success: true, data: reservation });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
}

export async function releaseStockReservationInternal(req: Request, res: Response) {
  try {
    if (!hasInternalAccess(req)) {
      res.status(401).json({ success: false, error: 'Unauthorized internal request' });
      return;
    }

    const reservation = await stockReservationService.releaseStockReservation(req.params.reference);
    if (!reservation) {
      res.status(404).json({ success: false, error: 'Reservation not found' });
      return;
    }

    res.json({
      success: true,
      data: reservation,
      message: 'Stock reservation released',
    });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
}

export async function consumeStockReservationInternal(req: Request, res: Response) {
  try {
    if (!hasInternalAccess(req)) {
      res.status(401).json({ success: false, error: 'Unauthorized internal request' });
      return;
    }

    const reservation = await stockReservationService.consumeStockReservation(req.params.reference);
    if (!reservation) {
      res.status(404).json({ success: false, error: 'Reservation not found' });
      return;
    }

    res.json({
      success: true,
      data: reservation,
      message: 'Stock reservation consumed',
    });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
}

export async function getAllIngredients(req: Request, res: Response) {
  try {
    const {
      page = '1',
      limit = '10',
      sortBy,
      sortOrder,
      categoryId,
      isLowStock,
      search,
    } = req.query;

    const filters: ingredientService.IngredientFilters = {};

    if (categoryId) filters.categoryId = categoryId as string;
    if (isLowStock === 'true') filters.isLowStock = true;
    if (search) filters.search = search as string;
    filters.isActive = true;

    const pagination: ingredientService.PaginationOptions = {
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      sortBy: sortBy as string,
      sortOrder: sortOrder as 'asc' | 'desc',
    };

    const result = await ingredientService.getAllIngredients(filters, pagination);
    res.json({
      success: true,
      data: result.ingredients,
      pagination: result.pagination,
    });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
}

export async function getIngredientById(req: Request, res: Response) {
  try {
    const ingredient = await ingredientService.getIngredientById(req.params.id);
    res.json({
      success: true,
      data: ingredient,
    });
  } catch (error: any) {
    res.status(404).json({ success: false, error: error.message });
  }
}

export async function createIngredient(req: Request, res: Response) {
  try {
    const ingredient = await ingredientService.createIngredient(req.body);
    res.status(201).json({
      success: true,
      data: ingredient,
      message: 'Ingredient created successfully',
    });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
}

export async function updateIngredient(req: Request, res: Response) {
  try {
    const ingredient = await ingredientService.updateIngredient(req.params.id, req.body);
    res.json({
      success: true,
      data: ingredient,
      message: 'Ingredient updated successfully',
    });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
}

export async function deleteIngredient(req: Request, res: Response) {
  try {
    await ingredientService.deleteIngredient(req.params.id);
    res.json({
      success: true,
      message: 'Ingredient deleted successfully',
    });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
}

export async function getAllIngredientsStock(req: Request, res: Response) {
  try {
    const ingredients = await ingredientService.getAllIngredientsStock();
    res.json({
      success: true,
      data: ingredients,
    });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
}

export async function updateStock(req: Request, res: Response) {
  try {
    const { quantity, lowStockThreshold } = req.body;
    if (quantity === undefined || quantity < 0) {
      return res.status(400).json({ success: false, error: 'Quantity must be a non-negative number' });
    }
    const ingredient = await ingredientService.updateStock(req.params.id, quantity, lowStockThreshold);
    res.json({
      success: true,
      data: ingredient,
      message: 'Stock updated successfully',
    });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
}

export async function getLowStockItems(req: Request, res: Response) {
  try {
    const items = await ingredientService.getLowStockItems();
    res.json({
      success: true,
      data: items,
      count: items.length,
    });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
}

export async function notifyLowStock(req: Request, res: Response) {
  try {
    const items = await ingredientService.getLowStockItems();
    if (items.length > 0) {
      const result = await emailService.sendLowStockAlert(items);
      res.json({
        success: true,
        message: 'Notification envoyée',
        data: result
      });
    } else {
      res.json({
        success: true,
        message: 'Aucun article en rupture de stock'
      });
    }
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
}

// Ingredient Category Controllers

export async function getAllIngredientCategories(req: Request, res: Response) {
  try {
    const categories = await ingredientService.getAllIngredientCategories();
    res.json({
      success: true,
      data: categories,
    });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
}

export async function createIngredientCategory(req: Request, res: Response) {
  try {
    const category = await ingredientService.createIngredientCategory(req.body);
    res.status(201).json({
      success: true,
      data: category,
      message: 'Category created successfully',
    });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
}

export async function updateIngredientCategory(req: Request, res: Response) {
  try {
    const category = await ingredientService.updateIngredientCategory(req.params.id, req.body);
    res.json({
      success: true,
      data: category,
      message: 'Category updated successfully',
    });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
}

export async function deleteIngredientCategory(req: Request, res: Response) {
  try {
    await ingredientService.deleteIngredientCategory(req.params.id);
    res.json({
      success: true,
      message: 'Category deleted successfully',
    });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
}

// Supplier Controllers

export async function getAllSuppliers(req: Request, res: Response) {
  try {
    const { search, includeInactive } = req.query;
    const suppliers = await ingredientService.getAllSuppliers(
      search as string | undefined,
      includeInactive === 'true'
    );

    res.json({
      success: true,
      data: suppliers,
    });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
}

export async function getSupplierById(req: Request, res: Response) {
  try {
    const supplier = await ingredientService.getSupplierById(req.params.id);
    res.json({
      success: true,
      data: supplier,
    });
  } catch (error: any) {
    res.status(404).json({ success: false, error: error.message });
  }
}

export async function createSupplier(req: Request, res: Response) {
  try {
    if (!req.body?.name?.trim()) {
      return res.status(400).json({ success: false, error: 'Supplier name is required' });
    }

    const supplier = await ingredientService.createSupplier({
      name: req.body.name.trim(),
      contactName: req.body.contactName,
      email: req.body.email,
      phone: req.body.phone,
      address: req.body.address,
      leadTimeDays: req.body.leadTimeDays,
      paymentTerms: req.body.paymentTerms,
      notes: req.body.notes,
    });

    res.status(201).json({
      success: true,
      data: supplier,
      message: 'Supplier created successfully',
    });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
}

export async function updateSupplier(req: Request, res: Response) {
  try {
    const supplier = await ingredientService.updateSupplier(req.params.id, req.body);
    res.json({
      success: true,
      data: supplier,
      message: 'Supplier updated successfully',
    });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
}

export async function deleteSupplier(req: Request, res: Response) {
  try {
    const result = await ingredientService.deleteSupplier(req.params.id);
    res.json({
      success: true,
      message: 'Supplier deleted successfully',
      data: result,
    });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
}

// Purchase Order Controllers

export async function getPurchaseOrders(req: Request, res: Response) {
  try {
    const { status, supplierId, search } = req.query;
    const orders = await ingredientService.getPurchaseOrders({
      status: status as any,
      supplierId: supplierId as string | undefined,
      search: search as string | undefined,
    });

    res.json({
      success: true,
      data: orders,
    });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
}

export async function createPurchaseOrder(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.body?.supplierId || !Array.isArray(req.body?.lines) || req.body.lines.length === 0) {
      return res.status(400).json({ success: false, error: 'Invalid purchase order payload' });
    }

    const order = await ingredientService.createPurchaseOrder(
      {
        supplierId: req.body.supplierId,
        expectedDate: req.body.expectedDate ? new Date(req.body.expectedDate) : undefined,
        notes: req.body.notes,
        lines: req.body.lines,
      },
      req.user?.userId
    );

    res.status(201).json({
      success: true,
      data: order,
      message: 'Purchase order created successfully',
    });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
}

export async function updatePurchaseOrderStatus(req: AuthenticatedRequest, res: Response) {
  try {
    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ success: false, error: 'Status is required' });
    }

    const order = await ingredientService.updatePurchaseOrderStatus(
      req.params.id,
      status,
      req.user?.userId
    );

    res.json({
      success: true,
      data: order,
      message: 'Purchase order status updated successfully',
    });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
}

// Expense Controllers

export async function getExpenses(req: Request, res: Response) {
  try {
    const { status, category, from, to, search } = req.query;

    const expenses = await ingredientService.getExpenses({
      status: status as any,
      category: category as string | undefined,
      from: from ? new Date(from as string) : undefined,
      to: to ? new Date(to as string) : undefined,
      search: search as string | undefined,
    });

    res.json({
      success: true,
      data: expenses,
    });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
}

export async function createExpense(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.body?.title || !req.body?.category || req.body?.amount === undefined || !req.body?.expenseDate) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    const expense = await ingredientService.createExpense(
      {
        title: req.body.title,
        category: req.body.category,
        amount: Number(req.body.amount),
        expenseDate: new Date(req.body.expenseDate),
        supplierName: req.body.supplierName,
        paymentMethod: req.body.paymentMethod,
        notes: req.body.notes,
      },
      req.user?.userId
    );

    res.status(201).json({
      success: true,
      data: expense,
      message: 'Expense created successfully',
    });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
}

export async function updateExpenseStatus(req: AuthenticatedRequest, res: Response) {
  try {
    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ success: false, error: 'Status is required' });
    }

    const expense = await ingredientService.updateExpenseStatus(
      req.params.id,
      status,
      req.user?.userId
    );

    res.json({
      success: true,
      data: expense,
      message: 'Expense status updated successfully',
    });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
}

export async function deleteExpense(req: AuthenticatedRequest, res: Response) {
  try {
    const result = await ingredientService.deleteExpense(req.params.id, req.user?.userId);
    res.json({
      success: true,
      data: result,
      message: 'Expense deleted successfully',
    });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
}

// Audit Log Controllers

export async function getAuditLogs(req: Request, res: Response) {
  try {
    const { module, search, limit } = req.query;
    const logs = await ingredientService.getAuditLogs({
      module: module as string | undefined,
      search: search as string | undefined,
      limit: limit ? Number(limit) : undefined,
    });

    res.json({
      success: true,
      data: logs,
    });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
}

export async function createAuditLog(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.body?.module || !req.body?.action || !req.body?.entityType || !req.body?.entityId || !req.body?.message) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    const log = await ingredientService.createAuditLog({
      module: req.body.module,
      action: req.body.action,
      entityType: req.body.entityType,
      entityId: req.body.entityId,
      message: req.body.message,
      metadata: req.body.metadata,
      actorId: req.user?.userId,
    });

    res.status(201).json({
      success: true,
      data: log,
      message: 'Audit log created successfully',
    });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
}
