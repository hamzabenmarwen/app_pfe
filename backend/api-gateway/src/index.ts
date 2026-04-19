import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import {
  requestIdMiddleware,
  errorHandler,
  notFoundHandler,
} from '@traiteurpro/shared';
import { setupProxies } from './config/proxy.config';
import { enhancedSecurityHeaders, validateCorsOrigin } from './middleware/security.middleware';
import { auditMiddleware } from './middleware/audit.middleware';
import { performanceMiddleware } from './middleware/performance.middleware';
import { initRealtime } from './realtime/socket';
import realtimeRoutes from './routes/realtime.routes';
import settingsRoutes from './routes/settings.routes';
import healthRoutes from './routes/health.routes';
import { setupSwagger } from './docs/swagger';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const server = http.createServer(app);

// Request ID for distributed tracing (must be first)
app.use(requestIdMiddleware);

// Security middleware
app.use(helmet());
app.use(enhancedSecurityHeaders);

// CORS with validation
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
  'http://localhost:5174',
  'http://localhost:3000',
];
app.use(cors({
  origin: validateCorsOrigin(allowedOrigins),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
}));

// Rate limiting with per-user tracking
const isProduction = (process.env.NODE_ENV || 'development') === 'production';
const rateLimitEnabled = process.env.ENABLE_RATE_LIMIT
  ? process.env.ENABLE_RATE_LIMIT === 'true'
  : isProduction;

if (rateLimitEnabled) {
  const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
      // Use user ID if authenticated, otherwise IP
      return (req as any).user?.userId || req.ip || 'unknown';
    },
    handler: (req, res) => {
      res.status(429).json({
        success: false,
        code: 'TOO_MANY_REQUESTS',
        error: 'Too many requests, please try again later.',
        retryAfter: res.getHeader('Retry-After'),
      });
    },
  });

  app.use('/api', limiter);
  console.log('🛡️ Rate limiting enabled');
} else {
  console.log('🧪 Rate limiting disabled (development mode)');
}

// Structured logging
app.use(morgan((tokens, req, res) => {
  return JSON.stringify({
    method: tokens.method(req, res),
    url: tokens.url(req, res),
    status: tokens.status(req, res),
    responseTime: tokens['response-time'](req, res) + 'ms',
    requestId: (req as any).requestId,
    userId: (req as any).user?.userId,
    timestamp: new Date().toISOString(),
  });
}));

// Audit logging
app.use(auditMiddleware);

// Runtime performance metrics
app.use(performanceMiddleware);

// Request parsing
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Swagger documentation
setupSwagger(app);

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    service: 'api-gateway',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
  });
});

// Internal realtime emission endpoint (services -> gateway)
app.use('/internal/realtime', realtimeRoutes);

// Platform settings endpoint (admin only, handled by gateway)
app.use('/api/settings', settingsRoutes);

// Aggregated health check endpoint
app.use('/api/health', healthRoutes);

// Setup proxy routes to microservices with circuit breaker
setupProxies(app);

// 404 handler
app.use(notFoundHandler);

// Global error handling (must be last)
app.use(errorHandler);

initRealtime(server);

server.listen(PORT, () => {
  console.log(`🚀 API Gateway running on http://localhost:${PORT}`);
  console.log(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔒 Security headers enabled`);
  console.log(`📝 Audit logging enabled`);
  console.log(`🆔 Request tracing enabled`);
});
