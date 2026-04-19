import { Request, Response, NextFunction } from 'express';

interface RateLimitBucket {
  count: number;
  startedAt: number;
}

interface RateLimitConfig {
  scope: string;
  windowMs: number;
  maxRequests: number;
  errorMessage: string;
}

const buckets = new Map<string, RateLimitBucket>();
const MAX_BUCKETS = 10000;

function readPositiveIntEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  const parsed = Number(raw);
  if (!raw || Number.isNaN(parsed) || parsed <= 0) {
    return fallback;
  }
  return Math.floor(parsed);
}

function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || 'unknown';
}

function buildKey(req: Request, scope: string): string {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : 'anonymous';
  const ip = getClientIp(req);
  return `${scope}:${ip}:${email}`;
}

function cleanupStaleBuckets(windowMs: number, now: number) {
  if (buckets.size <= MAX_BUCKETS) {
    return;
  }

  for (const [key, bucket] of buckets) {
    if (now - bucket.startedAt > windowMs * 2) {
      buckets.delete(key);
    }
  }
}

function createRateLimitMiddleware(config: RateLimitConfig) {
  return (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    cleanupStaleBuckets(config.windowMs, now);

    const key = buildKey(req, config.scope);
    const existing = buckets.get(key);

    if (!existing || now - existing.startedAt >= config.windowMs) {
      buckets.set(key, { count: 1, startedAt: now });
      next();
      return;
    }

    if (existing.count >= config.maxRequests) {
      const retryAfterMs = config.windowMs - (now - existing.startedAt);
      const retryAfterSec = Math.max(1, Math.ceil(retryAfterMs / 1000));

      res.setHeader('Retry-After', String(retryAfterSec));
      res.status(429).json({
        success: false,
        error: config.errorMessage,
      });
      return;
    }

    existing.count += 1;
    buckets.set(key, existing);
    next();
  };
}

export const otpVerifyRateLimit = createRateLimitMiddleware({
  scope: 'otp-verify',
  windowMs: readPositiveIntEnv('OTP_VERIFY_RATE_WINDOW_MS', 10 * 60 * 1000),
  maxRequests: readPositiveIntEnv('OTP_VERIFY_RATE_MAX', 8),
  errorMessage: 'Trop de tentatives de verification. Veuillez reessayer dans quelques minutes.',
});

export const otpResendRateLimit = createRateLimitMiddleware({
  scope: 'otp-resend',
  windowMs: readPositiveIntEnv('OTP_RESEND_RATE_WINDOW_MS', 15 * 60 * 1000),
  maxRequests: readPositiveIntEnv('OTP_RESEND_RATE_MAX', 3),
  errorMessage: 'Trop de demandes de renvoi de code. Veuillez patienter avant de reessayer.',
});
