import jwt, { SignOptions } from 'jsonwebtoken';
import { TokenPayload } from '../types/user.types';

function getEnvWithDevFallback(name: string, fallback: string): string {
  const value = process.env[name];
  if (value) return value;

  const isProduction = (process.env.NODE_ENV || 'development') === 'production';
  if (isProduction) {
    throw new Error(`${name} environment variable is required`);
  }

  console.warn(`⚠️ ${name} is not set. Using development fallback secret.`);
  return fallback;
}

const ACCESS_TOKEN_EXPIRY = process.env.JWT_ACCESS_EXPIRY || '15m';
const REFRESH_TOKEN_EXPIRY = process.env.JWT_REFRESH_EXPIRY || '7d';

function getAccessTokenSecret(): string {
  return getEnvWithDevFallback('JWT_ACCESS_SECRET', 'dev-access-secret-change-me');
}

function getRefreshTokenSecret(): string {
  return getEnvWithDevFallback('JWT_REFRESH_SECRET', 'dev-refresh-secret-change-me');
}

export function generateAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, getAccessTokenSecret(), {
    expiresIn: ACCESS_TOKEN_EXPIRY as SignOptions['expiresIn'],
  });
}

export function generateRefreshToken(payload: TokenPayload): string {
  return jwt.sign(payload, getRefreshTokenSecret(), {
    expiresIn: REFRESH_TOKEN_EXPIRY as SignOptions['expiresIn'],
  });
}

export function verifyAccessToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, getAccessTokenSecret()) as TokenPayload;
  } catch {
    return null;
  }
}

export function verifyRefreshToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, getRefreshTokenSecret()) as TokenPayload;
  } catch {
    return null;
  }
}

export function generateTokens(payload: TokenPayload) {
  return {
    accessToken: generateAccessToken(payload),
    refreshToken: generateRefreshToken(payload),
  };
}
