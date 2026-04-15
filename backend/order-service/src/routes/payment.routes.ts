import { Router } from 'express';
import * as paymentController from '../controllers/payment.controller';
import { authMiddleware, adminMiddleware } from '../middleware/auth.middleware';
import { validateBody } from '../middleware/validation.middleware';
import { z } from 'zod';

const router = Router();

const createPaymentSchema = z.object({
  orderId: z.string().uuid(),
});

// Authenticated routes
router.post('/create', authMiddleware, validateBody(createPaymentSchema), paymentController.createCashPayment);
router.post('/flouci/initiate', authMiddleware, validateBody(createPaymentSchema), paymentController.initiateFlouci);
router.get('/flouci/verify/:paymentId', authMiddleware, paymentController.verifyFlouci);
router.get('/order/:orderId', authMiddleware, paymentController.getPaymentStatus);
router.post('/order/:orderId/complete', authMiddleware, adminMiddleware, paymentController.markPaymentCompleted);
router.post('/order/:orderId/refund', authMiddleware, adminMiddleware, paymentController.refundPayment);

export default router;

