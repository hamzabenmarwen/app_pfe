import { Router } from 'express';
import * as addressController from '../controllers/address.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { validateBody } from '../middleware/validation.middleware';
import { z } from 'zod';

const router = Router();

// Validation schemas
const createAddressSchema = z.object({
  label: z.string().min(1, 'Label is required'),
  street: z.string().min(1, 'Street is required'),
  city: z.string().min(1, 'City is required'),
  zipCode: z.string().min(1, 'Zip code is required'),
  country: z.string().default('Tunisie'),
  isDefault: z.boolean().default(false),
});

const updateAddressSchema = z.object({
  label: z.string().min(1).optional(),
  street: z.string().min(1).optional(),
  city: z.string().min(1).optional(),
  zipCode: z.string().min(1).optional(),
  country: z.string().optional(),
  isDefault: z.boolean().optional(),
});

// All routes require authentication
router.use(authMiddleware);

// Routes
router.post('/', validateBody(createAddressSchema), addressController.createAddress);
router.get('/', addressController.getMyAddresses);
router.get('/:id', addressController.getAddressById);
router.put('/:id', validateBody(updateAddressSchema), addressController.updateAddress);
router.delete('/:id', addressController.deleteAddress);
router.patch('/:id/set-default', addressController.setDefaultAddress);

export default router;
