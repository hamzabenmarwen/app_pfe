import { Router } from 'express';
import * as categoryController from '../controllers/category.controller';
import { authMiddleware, adminMiddleware, optionalAuth } from '../middleware/auth.middleware';
import { validateBody } from '../middleware/validation.middleware';
import { z } from 'zod';

const router = Router();

// Validation schemas
const createCategorySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  imageUrl: z.string().url().optional(),
  displayOrder: z.number().int().optional(),
});

const updateCategorySchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  imageUrl: z.string().url().optional().nullable(),
  displayOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

// Public routes
router.get('/', optionalAuth, categoryController.getAllCategories);
router.get('/:id', categoryController.getCategoryById);

// Admin routes
router.post('/', authMiddleware, adminMiddleware, validateBody(createCategorySchema), categoryController.createCategory);
router.put('/:id', authMiddleware, adminMiddleware, validateBody(updateCategorySchema), categoryController.updateCategory);
router.delete('/:id', authMiddleware, adminMiddleware, categoryController.deleteCategory);
router.patch('/:id/toggle-status', authMiddleware, adminMiddleware, categoryController.toggleCategoryStatus);

export default router;
