import { Router } from 'express';
import * as eventInvoiceController from '../controllers/event-invoice.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.use(authMiddleware);

router.get('/my-invoices', eventInvoiceController.getMyEventInvoices);

export default router;
