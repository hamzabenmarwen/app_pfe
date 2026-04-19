/**
 * Enhanced JWT utilities with security improvements
 * - Secret validation and strength checking
 * - Token blacklisting support
 * - Better error handling
 * - Token metadata tracking
 */

import jwt, { SignOptions, JwtPayload } from 'jsonwebtoken';
import { TokenPayload } from '../types/user.types';
import { UnauthorizedError } from '../errors/AppError';

// Token configuration
const ACCESS_TOKEN_EXPIRY = process.env.JWT_ACCESS_EXPIRY || '15m';
const REFRESH_TOKEN_EXPIRY = process.env.JWT_REFRESH_EXPIRY || '7d';
const MIN_SECRET_LENGTH = 32;

/**
 * Validates JWT secret strength
 */
function validateSecret(secret: string, name: string): void {
  if (!secret) {
    throw new Error(`${name} environment variable is required`);
  }

  if (secret.length < MIN_SECRET_LENGTH) {
    throw new Error(
      `${name} must be at least ${MIN_SECRET_LENGTH} characters long for security`
    );
  }

  // Check for common weak secrets
  const weakPatterns = [
    'secret',
    'password',
    '123',
    'abc',
    'qwerty',
    'keyboard',
    'default',
    'change',
    'test',
    'dev',
  ];

  const lowerSecret = secret.toLowerCase();
  for (const pattern of weakPatterns) {
    if (lowerSecret.includes(pattern)) {
      throw new Error(
        `${name} contains a weak pattern '${pattern}'. Use a strong random secret.`
      );
    }
  }
}

/**
 * Get access token secret with validation
 */
function getAccessTokenSecret(): string {
  const secret = process.env.JWT_ACCESS_SECRET;
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction && !secret) {
    console.warn(
      '⚠️ JWT_ACCESS_SECRET not set. Using development fallback. DO NOT USE IN PRODUCTION!'
    );
    return 'dev-fallback-secret-not-for-production-use-only';
  }

  validateSecret(secret || '', 'JWT_ACCESS_SECRET');
  return secret!;
}

/**
 * Get refresh token secret with validation
 */
function getRefreshTokenSecret(): string {
  const secret = process.env.JWT_REFRESH_SECRET;
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction && !secret) {
    console.warn(
      '⚠️ JWT_REFRESH_SECRET not set. Using development fallback. DO NOT USE IN PRODUCTION!'
    );
    return 'dev-fallback-refresh-secret-not-for-production-use';
  }

  validateSecret(secret || '', 'JWT_REFRESH_SECRET');
  return secret!;
}

/**
 * In-memory token blacklist (use Redis in production)
 */
const tokenBlacklist: Set<string> = new Set();

/**
 * Add token to blacklist
 */
export function blacklistToken(token: string): void {
  tokenBlacklist.add(token);
  
  // Auto-cleanup old tokens (simplified - use TTL in production)
  if (tokenBlacklist.size > 10000) {
    const firstKey = tokenBlacklist.keys().next().value;
    if (firstKey) {
      tokenBlacklist.delete(firstKey);
    }
  }
}

/**
 * Check if token is blacklisted
 */
export function isTokenBlacklisted(token: string | undefined): boolean {
  if (!token) return false;
  return tokenBlacklist.has(token);
}

/**
 * Generate access token
 */
export function generateAccessToken(
  payload: TokenPayload,
  options?: { expiresIn?: string }
): string {
  return jwt.sign(payload, getAccessTokenSecret(), {
    expiresIn: (options?.expiresIn || ACCESS_TOKEN_EXPIRY) as SignOptions['expiresIn'],
    issuer: 'assiette-gala',
    audience: 'assiette-gala-api',
  });
}

/**
 * Generate refresh token
 */
export function generateRefreshToken(
  payload: TokenPayload,
  options?: { expiresIn?: string }
): string {
  return jwt.sign(
    { ...payload, type: 'refresh' },
    getRefreshTokenSecret(),
    {
      expiresIn: (options?.expiresIn || REFRESH_TOKEN_EXPIRY) as SignOptions['expiresIn'],
      issuer: 'assiette-gala',
      audience: 'assiette-gala-api',
    }
  );
}

/**
 * Verify access token with enhanced checks
 */
export function verifyAccessToken(token: string): TokenPayload {
  if (isTokenBlacklisted(token)) {
    throw new UnauthorizedError('Token has been revoked');
  }

  try {
    const decoded = jwt.verify(token, getAccessTokenSecret(), {
      issuer: 'assiette-gala',
      audience: 'assiette-gala-api',
    }) as JwtPayload & TokenPayload;

    if (decoded.type === 'refresh') {
      throw new UnauthorizedError('Invalid token type');
    }

    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new UnauthorizedError('Token has expired');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new UnauthorizedError('Invalid token');
    }
    throw new UnauthorizedError('Token verification failed');
  }
}

/**
 * Verify refresh token with enhanced checks
 */
export function verifyRefreshToken(token: string): TokenPayload {
  if (isTokenBlacklisted(token)) {
    throw new UnauthorizedError('Token has been revoked');
  }

  try {
    const decoded = jwt.verify(token, getRefreshTokenSecret(), {
      issuer: 'assiette-gala',
      audience: 'assiette-gala-api',
    }) as JwtPayload & TokenPayload;

    if (decoded.type !== 'refresh') {
      throw new UnauthorizedError('Invalid token type');
    }

    // Remove type from returned payload
    const { type, ...payload } = decoded;
    return payload;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new UnauthorizedError('Refresh token has expired');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new UnauthorizedError('Invalid refresh token');
    }
    throw new UnauthorizedError('Token verification failed');
  }
}

/**
 * Decode token without verification (for inspection only)
 */
export function decodeToken(token: string): JwtPayload | null {
  try {
    return jwt.decode(token, { complete: false }) as JwtPayload;
  } catch {
    return null;
  }
}

/**
 * Get token expiration time
 */
export function getTokenExpiration(token: string): Date | null {
  const decoded = decodeToken(token);
  if (!decoded?.exp) return null;
  return new Date(decoded.exp * 1000);
}

/**
 * Generate token pair
 */
export function generateTokens(
  payload: TokenPayload,
  options?: { accessExpiry?: string; refreshExpiry?: string }
): { accessToken: string; refreshToken: string } {
  return {
    accessToken: generateAccessToken(payload, { expiresIn: options?.accessExpiry }),
    refreshToken: generateRefreshToken(payload, { expiresIn: options?.refreshExpiry }),
  };
}

/**
 * Rotate refresh token (invalidate old, generate new)
 */
export function rotateRefreshToken(
  oldRefreshToken: string,
  payload: TokenPayload
): { accessToken: string; refreshToken: string } {
  // Verify old token first
  verifyRefreshToken(oldRefreshToken);
  
  // Blacklist the old token
  blacklistToken(oldRefreshToken);
  
  // Generate new tokens
  return generateTokens(payload);
}

/**
 * Check if token is about to expire
 */
export function isTokenExpiringSoon(token: string, thresholdMinutes: number = 5): boolean {
  const expiration = getTokenExpiration(token);
  if (!expiration) return true;
  
  const threshold = new Date(Date.now() + thresholdMinutes * 60 * 1000);
  return expiration <= threshold;
}

export default {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  generateTokens,
  rotateRefreshToken,
  blacklistToken,
  isTokenBlacklisted,
  decodeToken,
  getTokenExpiration,
  isTokenExpiringSoon,
};
