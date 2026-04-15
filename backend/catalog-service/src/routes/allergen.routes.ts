import { Router } from 'express';
import * as allergenController from '../controllers/allergen.controller';
import { authMiddleware, adminMiddleware } from '../middleware/auth.middleware';
import { validateBody } from '../middleware/validation.middleware';
import { z } from 'zod';

const router = Router();

// Validation schemas
const createAllergenSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  icon: z.string().optional(),
});

const updateAllergenSchema = z.object({
  name: z.string().min(1).optional(),
  icon: z.string().optional().nullable(),
});

// Public routes
router.get('/', allergenController.getAllAllergens);
router.get('/:id', allergenController.getAllergenById);

// Admin routes
router.post('/', authMiddleware, adminMiddleware, validateBody(createAllergenSchema), allergenController.createAllergen);
router.put('/:id', authMiddleware, adminMiddleware, validateBody(updateAllergenSchema), allergenController.updateAllergen);
router.delete('/:id', authMiddleware, adminMiddleware, allergenController.deleteAllergen);

export default router;
