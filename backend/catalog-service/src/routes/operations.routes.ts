import { Router } from 'express';
import { authMiddleware, adminMiddleware } from '../middleware/auth.middleware';
import * as operationsController from '../controllers/operations.controller';

const router = Router();

router.use(authMiddleware, adminMiddleware);

// Purchase Orders
router.get('/purchase-orders', operationsController.getPurchaseOrders);
router.post('/purchase-orders', operationsController.createPurchaseOrder);
router.patch('/purchase-orders/:id/status', operationsController.updatePurchaseOrderStatus);

// Expenses
router.get('/expenses', operationsController.getExpenses);
router.post('/expenses', operationsController.createExpense);
router.patch('/expenses/:id/status', operationsController.updateExpenseStatus);
router.delete('/expenses/:id', operationsController.deleteExpense);

// Audit logs (read-only — writes happen internally via service layer)
router.get('/audit-logs', operationsController.getAuditLogs);

export default router;
