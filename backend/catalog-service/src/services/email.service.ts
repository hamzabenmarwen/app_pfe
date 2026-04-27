import nodemailer from 'nodemailer';

// Create transporter - uses environment variables for configuration
// For development, uses Ethereal (fake SMTP) if no real config is provided
let transporter: nodemailer.Transporter;

async function getTransporter() {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;

  if (host && user && pass) {
    // Production SMTP configuration
    transporter = nodemailer.createTransport({
      host,
      port: parseInt(port || '587'),
      secure: port === '465',
      auth: { user, pass },
    });
  } else {
    // Development: use Ethereal fake SMTP
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
    console.log('📧 Using Ethereal test email account:', testAccount.user);
  }

  return transporter;
}

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@assiettegala.tn';
const SITE_NAME = 'Assiette Gala';

interface LowStockItem {
  id: string;
  name: string;
  stock: number;
  lowStockThreshold: number;
  category?: { name: string };
}

export async function sendLowStockAlert(items: LowStockItem[]) {
  if (items.length === 0) return;

  const transport = await getTransporter();

  const itemRows = items.map((item) => `
    <tr>
      <td style="padding: 12px 16px; border-bottom: 1px solid #f0f0f0; font-weight: 500; color: #333;">${item.name}</td>
      <td style="padding: 12px 16px; border-bottom: 1px solid #f0f0f0; color: #666;">${item.category?.name || '-'}</td>
      <td style="padding: 12px 16px; border-bottom: 1px solid #f0f0f0; text-align: center;">
        <span style="display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 13px; font-weight: 600; ${item.stock === 0 ? 'background: #fde8e8; color: #c53030;' : 'background: #fefcbf; color: #975a16;'}">
          ${item.stock}
        </span>
      </td>
      <td style="padding: 12px 16px; border-bottom: 1px solid #f0f0f0; text-align: center; color: #666;">${item.lowStockThreshold}</td>
    </tr>
  `).join('');

  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"></head>
    <body style="font-family: 'Segoe UI', Tahoma, sans-serif; background: #f8f9fa; margin: 0; padding: 20px;">
      <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.06);">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #b5854b 0%, #d4a76a 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 600;">Alerte Stock Faible</h1>
          <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 14px;">${SITE_NAME} - Notification automatique</p>
        </div>

        <!-- Content -->
        <div style="padding: 30px;">
          <p style="color: #333; font-size: 15px; line-height: 1.6; margin: 0 0 20px;">
            <strong>${items.length} article(s)</strong> ont un stock faible ou sont en rupture de stock. 
            Veuillez reapprovisionner les articles suivants :
          </p>

          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <thead>
              <tr style="background: #f8f9fa;">
                <th style="padding: 10px 16px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #888; font-weight: 600;">Article</th>
                <th style="padding: 10px 16px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #888; font-weight: 600;">Categorie</th>
                <th style="padding: 10px 16px; text-align: center; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #888; font-weight: 600;">Stock</th>
                <th style="padding: 10px 16px; text-align: center; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #888; font-weight: 600;">Seuil</th>
              </tr>
            </thead>
            <tbody>
              ${itemRows}
            </tbody>
          </table>

          <div style="margin-top: 24px; padding: 16px; background: #fff8f0; border-radius: 12px; border-left: 4px solid #b5854b;">
            <p style="margin: 0; color: #975a16; font-size: 13px;">
              Connectez-vous au tableau de bord admin pour mettre a jour les niveaux de stock.
            </p>
          </div>
        </div>

        <!-- Footer -->
        <div style="padding: 20px; background: #f8f9fa; text-align: center; border-top: 1px solid #eee;">
          <p style="margin: 0; color: #999; font-size: 12px;">
            ${SITE_NAME} - Plateforme Traiteur Intelligente
          </p>
          <p style="margin: 4px 0 0; color: #ccc; font-size: 11px;">
            Cet email est envoye automatiquement. Ne pas repondre.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    const info = await transport.sendMail({
      from: `"${SITE_NAME}" <noreply@assiettegala.tn>`,
      to: ADMIN_EMAIL,
      subject: `[${SITE_NAME}] Alerte: ${items.length} article(s) en stock faible`,
      html,
    });

    console.log('Low stock email sent:', info.messageId);

    // In dev mode, show the Ethereal preview URL
    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.log('Preview URL:', previewUrl);
    }

    return { success: true, messageId: info.messageId, previewUrl };
  } catch (error: any) {
    console.error('Failed to send low stock email:', error.message);
    return { success: false, error: error.message };
  }
}
