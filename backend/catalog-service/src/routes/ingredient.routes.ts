import { Router } from 'express';
import * as ingredientController from '../controllers/ingredient.controller';
import { authMiddleware, adminMiddleware } from '../middleware/auth.middleware';

const router = Router();

// Stock management routes (for admin stock page)
router.get('/stock/all', authMiddleware, adminMiddleware, ingredientController.getAllIngredientsStock);
router.get('/stock/low', authMiddleware, adminMiddleware, ingredientController.getLowStockItems);
router.post('/stock/notify', authMiddleware, adminMiddleware, ingredientController.notifyLowStock);
router.patch('/stock/:id', authMiddleware, adminMiddleware, ingredientController.updateStock);

// Supplier routes
router.get('/suppliers', authMiddleware, adminMiddleware, ingredientController.getAllSuppliers);
router.get('/suppliers/:id', authMiddleware, adminMiddleware, ingredientController.getSupplierById);
router.post('/suppliers', authMiddleware, adminMiddleware, ingredientController.createSupplier);
router.patch('/suppliers/:id', authMiddleware, adminMiddleware, ingredientController.updateSupplier);
router.delete('/suppliers/:id', authMiddleware, adminMiddleware, ingredientController.deleteSupplier);

// Purchase order routes
router.get('/purchase-orders', authMiddleware, adminMiddleware, ingredientController.getPurchaseOrders);
router.post('/purchase-orders', authMiddleware, adminMiddleware, ingredientController.createPurchaseOrder);
router.patch('/purchase-orders/:id/status', authMiddleware, adminMiddleware, ingredientController.updatePurchaseOrderStatus);

// Expense routes
router.get('/expenses', authMiddleware, adminMiddleware, ingredientController.getExpenses);
router.post('/expenses', authMiddleware, adminMiddleware, ingredientController.createExpense);
router.patch('/expenses/:id/status', authMiddleware, adminMiddleware, ingredientController.updateExpenseStatus);
router.delete('/expenses/:id', authMiddleware, adminMiddleware, ingredientController.deleteExpense);

// Audit log routes
router.get('/audit-logs', authMiddleware, adminMiddleware, ingredientController.getAuditLogs);

// CRUD routes
router.get('/', authMiddleware, ingredientController.getAllIngredients);
router.get('/:id', authMiddleware, ingredientController.getIngredientById);
router.post('/', authMiddleware, adminMiddleware, ingredientController.createIngredient);
router.patch('/:id', authMiddleware, adminMiddleware, ingredientController.updateIngredient);
router.delete('/:id', authMiddleware, adminMiddleware, ingredientController.deleteIngredient);

// Category routes
router.get('/categories/all', authMiddleware, ingredientController.getAllIngredientCategories);
router.post('/categories', authMiddleware, adminMiddleware, ingredientController.createIngredientCategory);
router.patch('/categories/:id', authMiddleware, adminMiddleware, ingredientController.updateIngredientCategory);
router.delete('/categories/:id', authMiddleware, adminMiddleware, ingredientController.deleteIngredientCategory);

export default router;
