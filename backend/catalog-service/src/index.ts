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
import operationsRoutes from './routes/operations.routes';
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
app.use('/api/ingredients', operationsRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handling (must be after 404)
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`🍽️  Catalog Service running on http://localhost:${PORT}`);
});
