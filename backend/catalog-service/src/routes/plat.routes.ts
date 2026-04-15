import { Router } from 'express';
import * as platController from '../controllers/plat.controller';
import { authMiddleware, adminMiddleware, optionalAuth } from '../middleware/auth.middleware';
import { validateBody } from '../middleware/validation.middleware';
import { z } from 'zod';

const router = Router();

// Validation schemas
const createPlatSchema = z.object({
  categoryId: z.string().uuid('Invalid category ID'),
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  price: z.number().positive('Price must be positive'),
  images: z.array(z.string().url()).optional(),
  preparationTime: z.number().int().positive().optional(),
  isVegetarian: z.boolean().optional(),
  isVegan: z.boolean().optional(),
  isHalal: z.boolean().optional(),
  isGlutenFree: z.boolean().optional(),
  spiceLevel: z.number().int().min(0).max(5).optional(),
  calories: z.number().int().positive().optional(),
  ingredients: z.string().optional(),
  allergenIds: z.array(z.string().uuid()).optional(),
});

const updatePlatSchema = z.object({
  categoryId: z.string().uuid().optional(),
  name: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  price: z.number().positive().optional(),
  images: z.array(z.string().url()).optional(),
  preparationTime: z.number().int().positive().optional().nullable(),
  isAvailable: z.boolean().optional(),
  isVegetarian: z.boolean().optional(),
  isVegan: z.boolean().optional(),
  isHalal: z.boolean().optional(),
  isGlutenFree: z.boolean().optional(),
  spiceLevel: z.number().int().min(0).max(5).optional(),
  calories: z.number().int().positive().optional().nullable(),
  ingredients: z.string().optional().nullable(),
  allergenIds: z.array(z.string().uuid()).optional(),
});

// Public routes
router.get('/', optionalAuth, platController.getAllPlats);
router.get('/popular', platController.getPopularPlats);
router.get('/:id', platController.getPlatById);

// Admin routes
router.post('/', authMiddleware, adminMiddleware, validateBody(createPlatSchema), platController.createPlat);
router.put('/:id', authMiddleware, adminMiddleware, validateBody(updatePlatSchema), platController.updatePlat);
router.delete('/:id', authMiddleware, adminMiddleware, platController.deletePlat);
router.patch('/:id/toggle-availability', authMiddleware, adminMiddleware, platController.togglePlatAvailability);

// Stock management routes (admin only)
router.get('/stock/all', authMiddleware, adminMiddleware, platController.getAllPlatsStock);
router.get('/stock/low', authMiddleware, adminMiddleware, platController.getLowStockItems);
router.post('/stock/notify', authMiddleware, adminMiddleware, platController.notifyLowStock);
router.patch('/:id/stock', authMiddleware, adminMiddleware, platController.updateStock);

export default router;
