import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { setupProxies } from './config/proxy.config';
import { errorHandler } from './middleware/error.middleware';
import { performanceMiddleware } from './middleware/performance.middleware';
import { initRealtime } from './realtime/socket';
import realtimeRoutes from './routes/realtime.routes';
import settingsRoutes from './routes/settings.routes';
import healthRoutes from './routes/health.routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const server = http.createServer(app);

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5174'],
  credentials: true,
}));

// Rate limiting
const isProduction = (process.env.NODE_ENV || 'development') === 'production';
const rateLimitEnabled = process.env.ENABLE_RATE_LIMIT
  ? process.env.ENABLE_RATE_LIMIT === 'true'
  : isProduction;

if (rateLimitEnabled) {
  const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
    message: { error: 'Too many requests, please try again later.' },
  });

  app.use('/api', limiter);
  console.log('🛡️ Rate limiting enabled');
} else {
  console.log('🧪 Rate limiting disabled (development mode)');
}

// Logging
app.use(morgan('dev'));

// Runtime performance metrics
app.use(performanceMiddleware);

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    service: 'api-gateway',
    timestamp: new Date().toISOString() 
  });
});

// Internal realtime emission endpoint (services -> gateway)
app.use('/internal/realtime', express.json(), realtimeRoutes);

// Platform settings endpoint (admin only, handled by gateway)
app.use('/api/settings', express.json(), settingsRoutes);

// Aggregated health check endpoint
app.use('/api/health', healthRoutes);

// Setup proxy routes to microservices
setupProxies(app);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handling (must be after 404)
app.use(errorHandler);

initRealtime(server);

server.listen(PORT, () => {
  console.log(`🚀 API Gateway running on http://localhost:${PORT}`);
  console.log(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);
});
