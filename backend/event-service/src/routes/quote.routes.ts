import { Router } from 'express';
import * as quoteController from '../controllers/quote.controller';
import { authMiddleware, adminMiddleware } from '../middleware/auth.middleware';
import { validateBody } from '../middleware/validation.middleware';
import { z } from 'zod';

const router = Router();

// Validation schemas
const createQuoteSchema = z.object({
  items: z.array(z.object({
    platId: z.string().uuid().optional(),
    name: z.string().min(1),
    description: z.string().optional(),
    category: z.string().optional(),
    quantity: z.number().int().positive(),
    unitPrice: z.number().positive(),
    notes: z.string().optional(),
  })).min(1, 'At least one item is required'),
  serviceFee: z.number().min(0).optional(),
  deliveryFee: z.number().min(0).optional(),
  discount: z.number().min(0).optional(),
  validDays: z.number().int().positive().optional(),
  notes: z.string().optional(),
  termsConditions: z.string().optional(),
});

const updateQuoteSchema = createQuoteSchema.partial();

// Require auth for all routes
router.use(authMiddleware);

// Public view by quote number (still requires auth)
router.get('/view/:quoteNumber', quoteController.getQuoteByNumber);

// Client routes
router.post('/:id/accept', quoteController.acceptQuote);
router.post('/:id/reject', quoteController.rejectQuote);

// Admin routes
router.get('/', adminMiddleware, quoteController.getAllQuotes);
router.get('/:id', adminMiddleware, quoteController.getQuoteById);
router.post('/event/:eventId', adminMiddleware, validateBody(createQuoteSchema), quoteController.createQuote);
router.put('/:id', adminMiddleware, validateBody(updateQuoteSchema), quoteController.updateQuote);
router.post('/:id/send', adminMiddleware, quoteController.sendQuote);

export default router;
