import { Router } from 'express';
import * as templateController from '../controllers/template.controller';
import { authMiddleware, adminMiddleware } from '../middleware/auth.middleware';
import { validateBody } from '../middleware/validation.middleware';
import { z } from 'zod';

const router = Router();

// Validation schemas
const createTemplateSchema = z.object({
  name: z.string().min(1),
  eventType: z.enum([
    'WEDDING', 'CORPORATE', 'BIRTHDAY', 'GRADUATION',
    'BABY_SHOWER', 'FUNERAL', 'RELIGIOUS', 'COCKTAIL',
    'CONFERENCE', 'PRIVATE', 'OTHER'
  ]),
  description: z.string().optional(),
  defaultGuestCount: z.number().int().positive().optional(),
  defaultServiceType: z.string().optional(),
  suggestedBudgetMin: z.number().positive().optional(),
  suggestedBudgetMax: z.number().positive().optional(),
  suggestedItems: z.array(z.object({
    platId: z.string().uuid(),
    quantity: z.number().int().positive(),
    category: z.string().optional(),
  })).optional(),
});
const updateTemplateSchema = createTemplateSchema.partial();

// Public routes (for selecting template when creating event)
router.get('/', templateController.getTemplates);
router.get('/:id', templateController.getTemplateById);

// Admin routes
router.post('/', authMiddleware, adminMiddleware, validateBody(createTemplateSchema), templateController.createTemplate);
router.put('/:id', authMiddleware, adminMiddleware, validateBody(updateTemplateSchema), templateController.updateTemplate);
router.delete('/:id', authMiddleware, adminMiddleware, templateController.deleteTemplate);

export default router;
