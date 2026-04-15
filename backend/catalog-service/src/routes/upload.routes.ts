import { Router } from 'express';
import * as uploadController from '../controllers/upload.controller';
import { uploadSingle, uploadMultiple, handleMulterError } from '../middleware/upload.middleware';
import { authMiddleware, adminMiddleware } from '../middleware/auth.middleware';

const router = Router();

// All upload routes require admin authentication
router.use(authMiddleware);
router.use(adminMiddleware);

// Upload single image
router.post(
  '/single',
  uploadSingle,
  handleMulterError,
  uploadController.uploadImage
);

// Upload multiple images
router.post(
  '/multiple',
  uploadMultiple,
  handleMulterError,
  uploadController.uploadMultipleImages
);

// Delete image by public ID
router.delete('/:publicId(*)', uploadController.deleteImage);

export default router;
