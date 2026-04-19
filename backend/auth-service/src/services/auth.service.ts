import prisma from '../config/database';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { UserRole } from '@prisma/client';
import { sendVerificationEmail, sendWelcomeEmail, sendPasswordResetEmail } from './email.service';

// Read secrets lazily (after dotenv.config() runs)
function getAccessSecret() {
  const secret = process.env.JWT_ACCESS_SECRET;
  if (!secret) throw new Error('JWT_ACCESS_SECRET environment variable is required');
  return secret;
}
function getRefreshSecret() {
  const secret = process.env.JWT_REFRESH_SECRET;
  if (!secret) throw new Error('JWT_REFRESH_SECRET environment variable is required');
  return secret;
}
function getAccessExpiry() { return parseInt(process.env.JWT_ACCESS_EXPIRY_SECONDS || '900'); }
function getRefreshExpiry() { return parseInt(process.env.JWT_REFRESH_EXPIRY_SECONDS || '604800'); }
const EMAIL_VERIFICATION_CODE_LENGTH = 6;
const OTP_FAILURE_WINDOW_MS = parseInt(process.env.OTP_FAILURE_WINDOW_MS || '900000');
const OTP_FAILURE_MAX_ATTEMPTS = parseInt(process.env.OTP_FAILURE_MAX_ATTEMPTS || '5');
const OTP_FAILURE_LOCK_MS = parseInt(process.env.OTP_FAILURE_LOCK_MS || '900000');
const GENERIC_VERIFICATION_RESEND_MESSAGE = 'Si un compte existe avec cette adresse, un code de verification a ete envoye.';

interface OtpFailureState {
  count: number;
  startedAt: number;
  lockUntil: number;
}

const otpFailureAttempts = new Map<string, OtpFailureState>();

function isEmailVerificationBypassed() {
  const raw = (process.env.AUTH_BYPASS_EMAIL_VERIFICATION || '').trim().toLowerCase();
  return raw === 'true' || raw === '1' || raw === 'yes';
}

function generateEmailVerificationCode(token: string): string {
  const digest = crypto.createHash('sha256').update(token).digest('hex');
  const seed = parseInt(digest.slice(0, 8), 16);
  const code = (seed % 900000) + 100000;
  return String(code).padStart(EMAIL_VERIFICATION_CODE_LENGTH, '0');
}

function assertOtpNotLocked(email: string) {
  const state = otpFailureAttempts.get(email);
  if (!state) {
    return;
  }

  const now = Date.now();
  if (state.lockUntil > now) {
    const retryAfterSeconds = Math.max(1, Math.ceil((state.lockUntil - now) / 1000));
    throw new Error(`Trop de tentatives. Reessayez dans ${retryAfterSeconds} secondes.`);
  }

  if (now - state.startedAt > OTP_FAILURE_WINDOW_MS) {
    otpFailureAttempts.delete(email);
  }
}

function registerOtpFailure(email: string): { locked: boolean; remainingAttempts: number } {
  const now = Date.now();
  const current = otpFailureAttempts.get(email);

  if (!current || now - current.startedAt > OTP_FAILURE_WINDOW_MS) {
    const nextState: OtpFailureState = {
      count: 1,
      startedAt: now,
      lockUntil: 0,
    };
    otpFailureAttempts.set(email, nextState);
    return {
      locked: false,
      remainingAttempts: Math.max(0, OTP_FAILURE_MAX_ATTEMPTS - nextState.count),
    };
  }

  current.count += 1;
  if (current.count >= OTP_FAILURE_MAX_ATTEMPTS) {
    current.lockUntil = now + OTP_FAILURE_LOCK_MS;
    otpFailureAttempts.set(email, current);
    return { locked: true, remainingAttempts: 0 };
  }

  otpFailureAttempts.set(email, current);
  return {
    locked: false,
    remainingAttempts: Math.max(0, OTP_FAILURE_MAX_ATTEMPTS - current.count),
  };
}

function clearOtpFailures(email: string) {
  otpFailureAttempts.delete(email);
}

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
}

export interface LoginData {
  email: string;
  password: string;
}

function generateTokens(userId: string, email: string, role: UserRole) {
  const payload = { userId, email, role };
  
  const accessToken = jwt.sign(payload, getAccessSecret(), {
    expiresIn: getAccessExpiry(),
  });
  
  const refreshToken = jwt.sign(payload, getRefreshSecret(), {
    expiresIn: getRefreshExpiry(),
  });

  return { accessToken, refreshToken };
}

export async function register(data: RegisterData) {
  // Check if user exists
  const existingUser = await prisma.user.findUnique({
    where: { email: data.email },
  });

  if (existingUser) {
    throw new Error('Email already registered');
  }

  // Hash password
  const passwordHash = await bcrypt.hash(data.password, 12);

  // Create user
  const user = await prisma.user.create({
    data: {
      email: data.email,
      passwordHash,
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone,
      role: UserRole.CLIENT,
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      role: true,
      avatarUrl: true,
      isActive: true,
      createdAt: true,
    },
  });

  // Create email verification token
  const verificationToken = crypto.randomUUID() + '-' + crypto.randomUUID();
  const verifyExpiresAt = new Date();
  verifyExpiresAt.setHours(verifyExpiresAt.getHours() + 24);
  
  await prisma.emailVerificationToken.create({
    data: {
      userId: user.id,
      token: verificationToken,
      expiresAt: verifyExpiresAt,
    },
  });

  const verificationCode = generateEmailVerificationCode(verificationToken);

  // Send verification email (async, don't wait)
  sendVerificationEmail(user.email, user.firstName, verificationToken, verificationCode).catch(console.error);
  
  // Send welcome email (async, don't wait)
  sendWelcomeEmail(user.email, user.firstName).catch(console.error);

  return { user, message: 'Veuillez vérifier votre email avant de vous connecter.' };
}

export async function login(data: LoginData) {
  // Find user
  const user = await prisma.user.findUnique({
    where: { email: data.email },
  });

  if (!user) {
    throw new Error('Invalid email or password');
  }

  if (!user.isActive) {
    throw new Error('Account is deactivated');
  }

  if (!user.emailVerified && !isEmailVerificationBypassed()) {
    throw new Error('Veuillez vérifier votre adresse email avant de vous connecter. Consultez votre boîte de réception.');
  }

  if (!user.emailVerified && isEmailVerificationBypassed()) {
    console.warn(`[AUTH] Email verification bypass active for user ${user.email}`);
  }

  // Verify password (handle OAuth users who may not have a password)
  if (!user.passwordHash) {
    throw new Error('Please use social login for this account');
  }
  
  const isValidPassword = await bcrypt.compare(data.password, user.passwordHash);
  
  if (!isValidPassword) {
    throw new Error('Invalid email or password');
  }

  // Generate tokens
  const tokens = generateTokens(user.id, user.email, user.role);

  // Save refresh token
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);
  
  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      token: tokens.refreshToken,
      expiresAt,
    },
  });

  // Return user without password
  const { passwordHash, ...userWithoutPassword } = user;

  return { user: userWithoutPassword, ...tokens };
}

export async function refreshAccessToken(refreshToken: string) {
  // Verify refresh token
  let payload: any;
  try {
    payload = jwt.verify(refreshToken, getRefreshSecret());
  } catch {
    throw new Error('Invalid refresh token');
  }

  // Check if refresh token exists in database
  const storedToken = await prisma.refreshToken.findUnique({
    where: { token: refreshToken },
    include: { user: true },
  });

  if (!storedToken) {
    throw new Error('Refresh token not found');
  }

  if (storedToken.expiresAt < new Date()) {
    await prisma.refreshToken.delete({ where: { id: storedToken.id } });
    throw new Error('Refresh token expired');
  }

  // Generate new tokens
  const tokens = generateTokens(
    storedToken.user.id,
    storedToken.user.email,
    storedToken.user.role
  );

  // Update refresh token
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);
  
  await prisma.refreshToken.update({
    where: { id: storedToken.id },
    data: {
      token: tokens.refreshToken,
      expiresAt,
    },
  });

  return tokens;
}

export async function logout(refreshToken: string) {
  await prisma.refreshToken.deleteMany({
    where: { token: refreshToken },
  });
}

export async function logoutAll(userId: string) {
  await prisma.refreshToken.deleteMany({
    where: { userId },
  });
}

// ============ Password Reset Functions ============

export async function requestPasswordReset(email: string) {
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    // Don't reveal if email exists
    return { message: 'If this email exists, a reset link has been sent' };
  }

  // Delete existing reset tokens for this user
  await prisma.passwordResetToken.deleteMany({
    where: { userId: user.id },
  });

  // Generate token
  const token = crypto.randomUUID() + '-' + crypto.randomUUID();
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 1); // 1 hour expiry

  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      token,
      expiresAt,
    },
  });

  // Send the password reset email
  try {
    await sendPasswordResetEmail(user.email, user.firstName, token);
  } catch (err) {
    console.error('Failed to send password reset email:', err);
  }

  return { 
    user: { 
      email: user.email, 
      firstName: user.firstName 
    } 
  };
}

export async function resetPassword(token: string, newPassword: string) {
  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!resetToken) {
    throw new Error('Invalid or expired reset token');
  }

  if (resetToken.expiresAt < new Date()) {
    await prisma.passwordResetToken.delete({ where: { id: resetToken.id } });
    throw new Error('Reset token has expired');
  }

  if (resetToken.usedAt) {
    throw new Error('Reset token has already been used');
  }

  // Hash new password
  const passwordHash = await bcrypt.hash(newPassword, 12);

  // Update user password and mark token as used
  await prisma.$transaction([
    prisma.user.update({
      where: { id: resetToken.userId },
      data: { passwordHash },
    }),
    prisma.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { usedAt: new Date() },
    }),
    // Invalidate all refresh tokens for security
    prisma.refreshToken.deleteMany({
      where: { userId: resetToken.userId },
    }),
  ]);

  return { message: 'Password reset successfully' };
}

// ============ Email Verification Functions ============

export async function createEmailVerificationToken(userId: string) {
  // Delete existing tokens
  await prisma.emailVerificationToken.deleteMany({
    where: { userId },
  });

  const token = crypto.randomUUID() + '-' + crypto.randomUUID();
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 24); // 24 hour expiry

  await prisma.emailVerificationToken.create({
    data: {
      userId,
      token,
      expiresAt,
    },
  });

  return token;
}

export async function verifyEmail(token: string) {
  const verifyToken = await prisma.emailVerificationToken.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!verifyToken) {
    throw new Error('Invalid verification token');
  }

  if (verifyToken.expiresAt < new Date()) {
    await prisma.emailVerificationToken.delete({ where: { id: verifyToken.id } });
    throw new Error('Verification token has expired');
  }

  if (verifyToken.usedAt) {
    throw new Error('Email already verified');
  }

  // Mark email as verified
  await prisma.$transaction([
    prisma.user.update({
      where: { id: verifyToken.userId },
      data: { emailVerified: true },
    }),
    prisma.emailVerificationToken.update({
      where: { id: verifyToken.id },
      data: { usedAt: new Date() },
    }),
  ]);

  return { message: 'Email verified successfully' };
}

export async function verifyEmailCode(email: string, code: string) {
  const normalizedEmail = email.trim().toLowerCase();
  assertOtpNotLocked(normalizedEmail);

  const normalizedCode = code.replace(/\D/g, '').slice(0, EMAIL_VERIFICATION_CODE_LENGTH);

  if (normalizedCode.length !== EMAIL_VERIFICATION_CODE_LENGTH) {
    const state = registerOtpFailure(normalizedEmail);
    if (state.locked) {
      throw new Error('Trop de tentatives. Reessayez plus tard.');
    }
    throw new Error(`Code de verification invalide. Il vous reste ${state.remainingAttempts} tentative(s).`);
  }

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (!user) {
    const state = registerOtpFailure(normalizedEmail);
    if (state.locked) {
      throw new Error('Trop de tentatives. Reessayez plus tard.');
    }
    throw new Error(`Code de verification invalide. Il vous reste ${state.remainingAttempts} tentative(s).`);
  }

  const activeTokens = await prisma.emailVerificationToken.findMany({
    where: {
      userId: user.id,
      usedAt: null,
      expiresAt: {
        gte: new Date(),
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: 10,
  });

  if (activeTokens.length === 0) {
    const state = registerOtpFailure(normalizedEmail);
    if (state.locked) {
      throw new Error('Trop de tentatives. Reessayez plus tard.');
    }
    throw new Error(`Code de verification invalide. Il vous reste ${state.remainingAttempts} tentative(s).`);
  }

  const matchedToken = activeTokens.find((entry) => generateEmailVerificationCode(entry.token) === normalizedCode);

  if (!matchedToken) {
    const state = registerOtpFailure(normalizedEmail);
    if (state.locked) {
      throw new Error('Trop de tentatives. Reessayez plus tard.');
    }
    throw new Error(`Code de verification invalide. Il vous reste ${state.remainingAttempts} tentative(s).`);
  }

  clearOtpFailures(normalizedEmail);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: true },
    }),
    prisma.emailVerificationToken.update({
      where: { id: matchedToken.id },
      data: { usedAt: new Date() },
    }),
    prisma.emailVerificationToken.deleteMany({
      where: {
        userId: user.id,
        id: { not: matchedToken.id },
      },
    }),
  ]);

  const tokens = generateTokens(user.id, user.email, user.role);
  const refreshExpiresAt = new Date();
  refreshExpiresAt.setDate(refreshExpiresAt.getDate() + 7);

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      token: tokens.refreshToken,
      expiresAt: refreshExpiresAt,
    },
  });

  const authenticatedUser = {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone,
    role: user.role,
    avatarUrl: user.avatarUrl,
    isActive: user.isActive,
    emailVerified: true,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };

  return {
    message: 'Email verified successfully',
    user: authenticatedUser,
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
  };
}

export async function resendVerificationEmail(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new Error('User not found');
  }

  if (user.emailVerified) {
    throw new Error('Email already verified');
  }

  const token = await createEmailVerificationToken(userId);
  const verificationCode = generateEmailVerificationCode(token);

  // Send the verification email
  try {
    await sendVerificationEmail(user.email, user.firstName, token, verificationCode);
  } catch (err) {
    console.error('Failed to send verification email:', err);
  }

  return { user: { email: user.email, firstName: user.firstName } };
}

export async function resendVerificationEmailByEmail(email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (!user) {
    return { message: GENERIC_VERIFICATION_RESEND_MESSAGE };
  }

  if (user.emailVerified) {
    return { message: GENERIC_VERIFICATION_RESEND_MESSAGE };
  }

  const token = await createEmailVerificationToken(user.id);
  const verificationCode = generateEmailVerificationCode(token);

  try {
    await sendVerificationEmail(user.email, user.firstName, token, verificationCode);
  } catch (err) {
    console.error('Failed to send verification email:', err);
  }

  return { message: GENERIC_VERIFICATION_RESEND_MESSAGE };
}

// ============ OAuth Functions ============

export interface OAuthUserData {
  email: string;
  firstName: string;
  lastName: string;
  provider: string;
  providerId: string;
  avatarUrl?: string;
  accessToken?: string;
  refreshToken?: string;
}

type OAuthUserPublic = Record<string, any>;

interface OAuthVerificationRequiredResult {
  user: OAuthUserPublic;
  requiresVerification: true;
  message: string;
  isNewUser: boolean;
}

interface OAuthAuthenticatedResult {
  user: OAuthUserPublic;
  accessToken: string;
  refreshToken: string;
  requiresVerification: false;
  isNewUser: boolean;
}

type OAuthAuthResult = OAuthVerificationRequiredResult | OAuthAuthenticatedResult;

const OAUTH_VERIFICATION_REQUIRED_MESSAGE =
  'Votre compte Google est cree, mais vous devez verifier votre email avant de vous connecter. Un email de verification vient d\'etre envoye.';

async function ensureOAuthEmailVerification(user: {
  id: string;
  email: string;
  firstName: string;
  emailVerified: boolean;
}) {
  if (user.emailVerified || isEmailVerificationBypassed()) {
    return null;
  }

  const token = await createEmailVerificationToken(user.id);
  const verificationCode = generateEmailVerificationCode(token);
  sendVerificationEmail(user.email, user.firstName, token, verificationCode).catch(console.error);
  return OAUTH_VERIFICATION_REQUIRED_MESSAGE;
}

async function createOAuthSessionResult(
  user: any,
  isNewUser: boolean
): Promise<OAuthAuthResult> {
  const { passwordHash, ...userWithoutPassword } = user;
  const verificationMessage = await ensureOAuthEmailVerification(user);

  if (verificationMessage) {
    return {
      user: userWithoutPassword,
      requiresVerification: true,
      message: verificationMessage,
      isNewUser,
    };
  }

  const tokens = generateTokens(user.id, user.email, user.role);

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      token: tokens.refreshToken,
      expiresAt,
    },
  });

  return {
    user: userWithoutPassword,
    ...tokens,
    requiresVerification: false,
    isNewUser,
  };
}

export async function findOrCreateOAuthUser(data: OAuthUserData) {
  // Check if OAuth account already exists
  const existingOAuth = await prisma.oAuthAccount.findUnique({
    where: {
      provider_providerId: {
        provider: data.provider,
        providerId: data.providerId,
      },
    },
    include: { user: true },
  });

  if (existingOAuth) {
    // Update OAuth tokens
    await prisma.oAuthAccount.update({
      where: { id: existingOAuth.id },
      data: {
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
      },
    });

    return createOAuthSessionResult(existingOAuth.user, false);
  }

  // Check if user with this email already exists
  let user = await prisma.user.findUnique({
    where: { email: data.email },
  });

  if (user) {
    // Link OAuth to existing user
    await prisma.oAuthAccount.create({
      data: {
        userId: user.id,
        provider: data.provider,
        providerId: data.providerId,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
      },
    });
  } else {
    // Create new user with OAuth
    user = await prisma.user.create({
      data: {
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        avatarUrl: data.avatarUrl,
        emailVerified: false,
        role: UserRole.CLIENT,
        oauthAccounts: {
          create: {
            provider: data.provider,
            providerId: data.providerId,
            accessToken: data.accessToken,
            refreshToken: data.refreshToken,
          },
        },
      },
    });
  }

  return createOAuthSessionResult(user, !existingOAuth);
}
