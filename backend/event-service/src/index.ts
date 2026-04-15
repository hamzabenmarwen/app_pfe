import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import eventRoutes from './routes/event.routes';
import quoteRoutes from './routes/quote.routes';
import templateRoutes from './routes/template.routes';
import eventInvoiceRoutes from './routes/event-invoice.routes';
import { errorMiddleware } from './middleware/error.middleware';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3004;

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
  res.json({ status: 'ok', service: 'event-service' });
});

// Routes
app.use('/api/events', eventRoutes);
app.use('/api/quotes', quoteRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/event-invoices', eventInvoiceRoutes);

// Error handling
app.use(errorMiddleware);

app.listen(PORT, () => {
  console.log(`🎉 Event Service running on port ${PORT}`);
});

export default app;
