import { Router } from 'express';
import * as invoiceController from '../controllers/invoice.controller';
import { authMiddleware, adminMiddleware } from '../middleware/auth.middleware';

const router = Router();

// Require auth for all routes
router.use(authMiddleware);

// Client routes
router.get('/my-invoices', invoiceController.getMyInvoices);
router.get('/order/:orderId', invoiceController.getInvoiceByOrderId);
router.get('/order/:orderId/pdf', invoiceController.downloadInvoicePDF);

// Admin routes
router.get('/', adminMiddleware, invoiceController.getAllInvoices);

export default router;
