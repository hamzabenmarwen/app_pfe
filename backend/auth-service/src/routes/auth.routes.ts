import { Router } from 'express';
import * as authController from '../controllers/auth.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { validateBody } from '../middleware/validation.middleware';
import { z } from 'zod';

const router = Router();

// Validation schemas
const nameRegex = /^[^<>]*$/;

const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  firstName: z.string().min(2, 'First name must be at least 2 characters').regex(nameRegex, 'HTML tags are not allowed'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters').regex(nameRegex, 'HTML tags are not allowed'),
  phone: z.string().optional().refine(val => !val || nameRegex.test(val), 'HTML tags are not allowed'),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email format'),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

const googleAuthSchema = z.object({
  credential: z.string().min(1, 'Credential is required'),
});

// Routes
router.post('/register', validateBody(registerSchema), authController.register);
router.post('/login', validateBody(loginSchema), authController.login);
router.post('/refresh', authController.refreshToken);
router.post('/logout', authController.logout);
router.post('/logout-all', authMiddleware, authController.logoutAll);
router.get('/me', authMiddleware, authController.getMe);
router.get('/me/export', authMiddleware, authController.exportMyData);
router.delete('/me/delete', authMiddleware, authController.deleteMyAccount);

// Password Reset
router.post('/forgot-password', validateBody(forgotPasswordSchema), authController.forgotPassword);
router.post('/reset-password', validateBody(resetPasswordSchema), authController.resetPassword);

// Email Verification
router.get('/verify-email', authController.verifyEmail);
router.post('/resend-verification', authMiddleware, authController.resendVerificationEmail);

// OAuth2
router.post('/oauth/google', validateBody(googleAuthSchema), authController.googleAuth);

export default router;
