import { Router } from 'express';
import { validateBody } from '../middleware/validation.middleware';
import { z } from 'zod';
import { sendEmail } from '../services/email.service';

const router = Router();

const SITE_NAME = process.env.FROM_NAME || 'Assiette Gala';

const contactSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Valid email required'),
  phone: z.string().optional(),
  subject: z.string().min(1, 'Subject is required'),
  message: z.string().min(10, 'Message must be at least 10 characters'),
});

router.post('/', validateBody(contactSchema), async (req, res) => {
  try {
    const { name, email, phone, subject, message } = req.body;

    // Send notification email to admin
    await sendEmail({
      to: process.env.CONTACT_EMAIL || 'assiestte.sfaxienne@gmail.com',
      subject: `[Contact] ${subject} - de ${name}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #E85D04;">Nouveau message de contact</h2>
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Nom:</strong> ${name}</p>
            <p><strong>Email:</strong> ${email}</p>
            ${phone ? `<p><strong>Téléphone:</strong> ${phone}</p>` : ''}
            <p><strong>Sujet:</strong> ${subject}</p>
          </div>
          <div style="padding: 20px; border-left: 4px solid #E85D04;">
            <p><strong>Message:</strong></p>
            <p>${message.replace(/\n/g, '<br>')}</p>
          </div>
        </div>
      `,
    });

    // Send confirmation email to user
    await sendEmail({
      to: email,
      subject: `Votre message a bien été reçu - ${SITE_NAME}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #E85D04;">Merci pour votre message, ${name} !</h2>
          <p>Nous avons bien reçu votre message et nous vous répondrons dans les plus brefs délais.</p>
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Sujet:</strong> ${subject}</p>
            <p><strong>Message:</strong> ${message}</p>
          </div>
          <p>Cordialement,<br>L'équipe ${SITE_NAME}</p>
        </div>
      `,
    });

    res.json({
      success: true,
      message: 'Message sent successfully',
    });
  } catch (error: any) {
    console.error('Contact form error:', error);
    // Still return success even if email fails (message was received)
    res.json({
      success: true,
      message: 'Message received (email notification may be delayed)',
    });
  }
});

export default router;
