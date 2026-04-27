import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import * as orderController from '../controllers/order.controller';
import { authMiddleware, adminMiddleware } from '../middleware/auth.middleware';
import { validateBody } from '../middleware/validation.middleware';
import { z } from 'zod';

const router = Router();

// Validation schemas
const createOrderSchema = z.object({
  items: z.array(z.object({
    platId: z.string().uuid(),
    quantity: z.number().int().positive(),
    notes: z.string().optional(),
  })).min(1, 'At least one item is required'),
  deliveryAddress: z.object({
    street: z.string().min(1),
    city: z.string().min(1),
    zipCode: z.string().min(1),
    country: z.string().default('Tunisie'),
  }),
  deliveryDate: z.string().datetime(),
  deliverySlot: z.string().optional(),
  notes: z.string().optional(),
  paymentMethod: z.enum(['CASH', 'FLOUCI']).optional(),
});

const updateStatusSchema = z.object({
  status: z.enum(['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'DELIVERING', 'DELIVERED', 'CANCELLED']),
});

const createOrderRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return (req as any).user?.userId || req.ip || 'unknown';
  },
  handler: (_req, res) => {
    res.status(429).json({
      success: false,
      error: 'Too many order creation requests. Please try again later.',
    });
  },
});

// Require auth for all routes
router.use(authMiddleware);

// Client routes (static paths first)
router.post('/', createOrderRateLimiter, validateBody(createOrderSchema), orderController.createOrder);
router.get('/my-orders', orderController.getMyOrders);
router.get('/config', orderController.getOrderConfig);

// Admin routes (static paths)
router.get('/', adminMiddleware, orderController.getAllOrders);
router.get('/stats/overview', adminMiddleware, orderController.getOrderStats);

// Dynamic param routes (MUST be after all static routes to avoid catching /stats, /my-orders, etc.)
router.get('/:id', orderController.getOrderById);
router.post('/:id/cancel', orderController.cancelOrder);
router.patch('/:id/status', adminMiddleware, validateBody(updateStatusSchema), orderController.updateOrderStatus);

export default router;
