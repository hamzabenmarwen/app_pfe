import { Router } from 'express';
import * as eventInvoiceController from '../controllers/event-invoice.controller';
import { authMiddleware, adminMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.use(authMiddleware);

router.get('/my-invoices', eventInvoiceController.getMyEventInvoices);
router.get('/:id/payment-status', eventInvoiceController.getEventInvoicePaymentStatus);
router.post('/:id/payments/flouci/initiate', eventInvoiceController.initiateFlouciPayment);
router.post('/:id/payments/flouci/refresh', eventInvoiceController.refreshFlouciPayment);
router.get('/', adminMiddleware, eventInvoiceController.getAllEventInvoices);
router.patch('/:id/mark-paid', adminMiddleware, eventInvoiceController.markEventInvoicePaid);

export default router;
