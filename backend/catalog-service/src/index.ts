import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import categoryRoutes from './routes/category.routes';
import platRoutes from './routes/plat.routes';
import allergenRoutes from './routes/allergen.routes';
import uploadRoutes from './routes/upload.routes';
import ingredientRoutes from './routes/ingredient.routes';
import { errorHandler } from './middleware/error.middleware';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:5174'],
  credentials: true,
}));
app.use(morgan('dev'));
app.use(express.json({ limit: '1mb' }));

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'catalog-service',
    timestamp: new Date().toISOString(),
  });
});

// Routes
app.use('/api/categories', categoryRoutes);
app.use('/api/plats', platRoutes);
app.use('/api/allergens', allergenRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/ingredients', ingredientRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handling (must be after 404)
app.use(errorHandler);

const server = app.listen(PORT, () => {
  console.log(`🍽️  Catalog Service running on http://localhost:${PORT}`);
});

// Graceful shutdown
function gracefulShutdown(signal: string) {
  console.log(`\n${signal} received. Shutting down gracefully...`);
  server.close(() => {
    console.log('HTTP server closed.');
    process.exit(0);
  });

  setTimeout(() => {
    console.error('Forced shutdown due to timeout');
    process.exit(1);
  }, 30000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
