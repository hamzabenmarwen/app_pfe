import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import addressRoutes from './routes/address.routes';
import contactRoutes from './routes/contact.routes';
import { errorHandler } from './middleware/error.middleware';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

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
    service: 'auth-service',
    timestamp: new Date().toISOString(),
  });
});

// Routes
app.use('/api', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/addresses', addressRoutes);
app.use('/api/contact', contactRoutes);

// Internal route for inter-service admin email notifications
app.post('/api/internal/notify-admin', async (req, res) => {
  try {
    const { sendEmail } = await import('./services/email.service');
    const adminEmail = process.env.ADMIN_EMAIL || process.env.FROM_EMAIL || 'assiestte.sfaxienne@gmail.com';
    const { subject, message, type } = req.body;

    await sendEmail({
      to: adminEmail,
      subject: `[Admin] ${subject || 'Notification'}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #e8614a, #ef7d6b); padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0;">🍽️ Assiette Gala</h1>
          </div>
          <div style="padding: 30px; background: #f9fafb;">
            <h2>${type === 'NEW_ORDER' ? '🛒 Nouvelle commande' : type === 'NEW_EVENT' ? '📅 Nouvelle demande d\'événement' : '🔔 Notification'}</h2>
            <p>${message || ''}</p>
            <p style="text-align: center; margin-top: 20px;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/admin" 
                 style="display: inline-block; background: #e8614a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                Voir dans le dashboard
              </a>
            </p>
          </div>
          <div style="padding: 15px; text-align: center; color: #6b7280; font-size: 12px;">
            <p>© ${new Date().getFullYear()} Assiette Gala. Notification automatique.</p>
          </div>
        </div>
      `,
    });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to send notification' });
  }
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handling (must be after 404)
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`🔐 Auth Service running on http://localhost:${PORT}`);
});
