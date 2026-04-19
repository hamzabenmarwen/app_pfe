import nodemailer from 'nodemailer';

// Create transporter - configure based on environment
let transporterPromise: Promise<nodemailer.Transporter>;

const createTransporter = async () => {
  // For production, use SendGrid, SES, or other SMTP service
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });
  }

  // For development, auto-create Ethereal account (free fake SMTP)
  const testAccount = await nodemailer.createTestAccount();
  
  return nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass,
    },
  });
};

transporterPromise = createTransporter();

const FROM_EMAIL = process.env.FROM_EMAIL || 'assiestte.sfaxienne@gmail.com';
const FROM_NAME = process.env.FROM_NAME || 'Assiette Gala';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// Escape HTML special characters to prevent XSS in emails
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Email templates
const templates = {
  verifyEmail: (name: string, token: string, code?: string) => {
    const safeName = escapeHtml(name);
    return {
    subject: `Vérifiez votre adresse email - ${FROM_NAME}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
          .header { background: linear-gradient(135deg, #e8614a, #ef7d6b); padding: 30px; text-align: center; }
          .header h1 { color: white; margin: 0; }
          .content { padding: 30px; background: #f9fafb; }
          .button { display: inline-block; background: #e8614a; color: white !important; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
          .code-box { margin: 18px 0; padding: 14px; border: 1px dashed #e8614a; border-radius: 10px; background: #fff3f0; text-align: center; }
          .code { font-size: 30px; letter-spacing: 0.35em; font-weight: bold; color: #e8614a; font-family: monospace; }
          .footer { padding: 20px; text-align: center; color: #6b7280; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🍽️ ${FROM_NAME}</h1>
        </div>
        <div class="content">
          <h2>Bienvenue, ${safeName} !</h2>
          <p>Merci de vous être inscrit sur ${FROM_NAME}. Pour activer votre compte, saisissez le code ci-dessous dans l'ecran de verification :</p>
          ${code ? `
          <div class="code-box">
            <p style="margin: 0 0 8px 0;">Code de verification</p>
            <div class="code">${escapeHtml(code)}</div>
          </div>
          ` : ''}
          <p>Le code expire dans 24 heures.</p>
          <p>Si vous n'avez pas créé de compte, ignorez cet email.</p>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} ${FROM_NAME}. Tous droits réservés.</p>
        </div>
      </body>
      </html>
    `,
    text: `Bienvenue ${safeName} ! Votre code de verification: ${code || 'N/A'}. Ce code expire dans 24 heures.`,
  }; },

  resetPassword: (name: string, token: string) => {
    const safeName = escapeHtml(name);
    return {
    subject: `Réinitialisation de mot de passe - ${FROM_NAME}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
          .header { background: linear-gradient(135deg, #e8614a, #ef7d6b); padding: 30px; text-align: center; }
          .header h1 { color: white; margin: 0; }
          .content { padding: 30px; background: #f9fafb; }
          .button { display: inline-block; background: #e8614a; color: white !important; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
          .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px; margin: 20px 0; }
          .footer { padding: 20px; text-align: center; color: #6b7280; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🍽️ ${FROM_NAME}</h1>
        </div>
        <div class="content">
          <h2>Réinitialisation de mot de passe</h2>
          <p>Bonjour ${name},</p>
          <p>Vous avez demandé la réinitialisation de votre mot de passe. Cliquez sur le bouton ci-dessous pour créer un nouveau mot de passe :</p>
          <p style="text-align: center;">
            <a href="${FRONTEND_URL}/reset-password?token=${token}" class="button">Réinitialiser mon mot de passe</a>
          </p>
          <div class="warning">
            <strong>⚠️ Important :</strong> Ce lien expire dans 1 heure. Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.
          </div>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} ${FROM_NAME}. Tous droits réservés.</p>
        </div>
      </body>
      </html>
    `,
    text: `Réinitialisation de mot de passe. Visitez: ${FRONTEND_URL}/reset-password?token=${token}`,
  }; },

  orderConfirmation: (name: string, orderNumber: string, orderDetails: any) => {
    const safeName = escapeHtml(name);
    return {
    subject: `Confirmation de commande #${orderNumber} - ${FROM_NAME}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
          .header { background: linear-gradient(135deg, #e8614a, #ef7d6b); padding: 30px; text-align: center; }
          .header h1 { color: white; margin: 0; }
          .content { padding: 30px; background: #f9fafb; }
          .order-box { background: white; border-radius: 8px; padding: 20px; margin: 20px 0; border: 1px solid #e5e7eb; }
          .item { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f3f4f6; }
          .total { font-size: 18px; font-weight: bold; color: #e8614a; margin-top: 15px; text-align: right; }
          .button { display: inline-block; background: #e8614a; color: white !important; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; }
          .footer { padding: 20px; text-align: center; color: #6b7280; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🍽️ ${FROM_NAME}</h1>
        </div>
        <div class="content">
          <h2>✅ Commande confirmée !</h2>
          <p>Bonjour ${safeName},</p>
          <p>Merci pour votre commande ! Voici le récapitulatif :</p>
          
          <div class="order-box">
            <h3 style="margin-top: 0;">Commande #${orderNumber}</h3>
            <p><strong>Date de livraison :</strong> ${orderDetails.deliveryDate}</p>
            <p><strong>Adresse :</strong> ${orderDetails.deliveryAddress}</p>
            
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
            
            ${orderDetails.items?.map((item: any) => `
              <div class="item">
                <span>${item.quantity}x ${item.platName}</span>
                <span>${(item.unitPrice * item.quantity).toFixed(2)} DT</span>
              </div>
            `).join('') || ''}
            
            <div class="total">
              Total: ${orderDetails.total?.toFixed(2) || '0.00'} DT
            </div>
          </div>
          
          <p style="text-align: center;">
            <a href="${FRONTEND_URL}/dashboard/orders" class="button">Suivre ma commande</a>
          </p>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} ${FROM_NAME}. Tous droits réservés.</p>
        </div>
      </body>
      </html>
    `,
    text: `Commande #${orderNumber} confirmée. Total: ${orderDetails.total} DT`,
  }; },

  quoteReady: (name: string, quoteNumber: string, eventName: string) => {
    const safeName = escapeHtml(name);
    const safeEventName = escapeHtml(eventName);
    return {
    subject: `Votre devis #${quoteNumber} est prêt - ${FROM_NAME}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
          .header { background: linear-gradient(135deg, #e8614a, #ef7d6b); padding: 30px; text-align: center; }
          .header h1 { color: white; margin: 0; }
          .content { padding: 30px; background: #f9fafb; }
          .button { display: inline-block; background: #e8614a; color: white !important; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
          .footer { padding: 20px; text-align: center; color: #6b7280; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🍽️ ${FROM_NAME}</h1>
        </div>
        <div class="content">
          <h2>📋 Votre devis est prêt !</h2>
          <p>Bonjour ${safeName},</p>
          <p>Nous avons préparé votre devis pour l'événement <strong>"${safeEventName}"</strong>.</p>
          <p style="text-align: center;">
            <a href="${FRONTEND_URL}/quotes/view/${quoteNumber}" class="button">Voir mon devis</a>
          </p>
          <p>Ce devis est valable pendant 30 jours.</p>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} ${FROM_NAME}. Tous droits réservés.</p>
        </div>
      </body>
      </html>
    `,
    text: `Votre devis #${quoteNumber} est prêt. Consultez-le sur: ${FRONTEND_URL}/quotes/view/${quoteNumber}`,
  }; },

  welcomeEmail: (name: string) => {
    const safeName = escapeHtml(name);
    return {
    subject: `Bienvenue sur ${FROM_NAME} ! 🎉`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
          .header { background: linear-gradient(135deg, #e8614a, #ef7d6b); padding: 30px; text-align: center; }
          .header h1 { color: white; margin: 0; }
          .content { padding: 30px; background: #f9fafb; }
          .feature { display: flex; align-items: center; margin: 15px 0; }
          .feature-icon { font-size: 24px; margin-right: 15px; }
          .button { display: inline-block; background: #e8614a; color: white !important; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
          .footer { padding: 20px; text-align: center; color: #6b7280; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🍽️ ${FROM_NAME}</h1>
        </div>
        <div class="content">
          <h2>Bienvenue, ${safeName} ! 🎉</h2>
          <p>Nous sommes ravis de vous compter parmi nous. ${FROM_NAME} vous permet de :</p>
          
          <div class="feature">
            <span class="feature-icon">🍽️</span>
            <span>Commander des plats délicieux pour vos événements</span>
          </div>
          <div class="feature">
            <span class="feature-icon">📅</span>
            <span>Planifier des événements (mariages, fêtes, séminaires...)</span>
          </div>
          <div class="feature">
            <span class="feature-icon">💬</span>
            <span>Obtenir des devis personnalisés rapidement</span>
          </div>
          
          <p style="text-align: center;">
            <a href="${FRONTEND_URL}/menu" class="button">Découvrir notre menu</a>
          </p>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} ${FROM_NAME}. Tous droits réservés.</p>
        </div>
      </body>
      </html>
    `,
    text: `Bienvenue ${safeName} sur ${FROM_NAME} ! Découvrez notre menu: ${FRONTEND_URL}/menu`,
  }; },
};

// Email sending functions
export async function sendEmail(options: { to: string; subject: string; html: string; text?: string }) {
  try {
    const transporter = await transporterPromise;
    const info = await transporter.sendMail({
      from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
      to: options.to,
      subject: options.subject,
      text: options.text || '',
      html: options.html,
    });

    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.info(`📧 Test email preview: ${previewUrl}`);
    }
    return true;
  } catch (error) {
    console.error('❌ Failed to send email:', error);
    return false;
  }
}

export async function sendVerificationEmail(email: string, name: string, token: string, code?: string) {
  const template = templates.verifyEmail(name, token, code);
  return sendEmail({ to: email, subject: template.subject, html: template.html, text: template.text });
}

export async function sendPasswordResetEmail(email: string, name: string, token: string) {
  const template = templates.resetPassword(name, token);
  return sendEmail({ to: email, subject: template.subject, html: template.html, text: template.text });
}

export async function sendOrderConfirmationEmail(
  email: string, 
  name: string, 
  orderNumber: string, 
  orderDetails: any
) {
  const template = templates.orderConfirmation(name, orderNumber, orderDetails);
  return sendEmail({ to: email, subject: template.subject, html: template.html, text: template.text });
}

export async function sendQuoteReadyEmail(
  email: string, 
  name: string, 
  quoteNumber: string, 
  eventName: string
) {
  const template = templates.quoteReady(name, quoteNumber, eventName);
  return sendEmail({ to: email, subject: template.subject, html: template.html, text: template.text });
}

export async function sendWelcomeEmail(email: string, name: string) {
  const template = templates.welcomeEmail(name);
  return sendEmail({ to: email, subject: template.subject, html: template.html, text: template.text });
}

export default {
  sendEmail,
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendOrderConfirmationEmail,
  sendQuoteReadyEmail,
  sendWelcomeEmail,
};
