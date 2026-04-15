import PDFDocument from 'pdfkit';

const SITE_NAME = process.env.FROM_NAME || 'Assiette Gala';
const SITE_EMAIL = process.env.FROM_EMAIL || 'assiestte.sfaxienne@gmail.com';

interface OrderItem {
  platName: string;
  quantity: number;
  unitPrice: number;
}

interface InvoiceData {
  invoiceNumber: string;
  orderNumber: string;
  date: Date;
  dueDate: Date;
  customer: {
    name: string;
    email: string;
    address?: string;
    phone?: string;
  };
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  tax: number;
  total: number;
  paymentMethod: string;
  paymentStatus: string;
  notes?: string;
}

export function generateInvoicePDF(data: InvoiceData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 50,
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Header
      doc
        .fontSize(24)
        .font('Helvetica-Bold')
        .text(SITE_NAME, 50, 50)
        .fontSize(10)
        .font('Helvetica')
        .text('Plateforme de gestion pour traiteurs', 50, 80)
        .text('Tunisie', 50, 95)
        .text(SITE_EMAIL, 50, 110);

      // Invoice Title
      doc
        .fontSize(20)
        .font('Helvetica-Bold')
        .text('FACTURE', 400, 50, { align: 'right' })
        .fontSize(10)
        .font('Helvetica')
        .text(`N° ${data.invoiceNumber}`, 400, 80, { align: 'right' })
        .text(`Commande: #${data.orderNumber}`, 400, 95, { align: 'right' })
        .text(`Date: ${data.date.toLocaleDateString('fr-FR')}`, 400, 110, { align: 'right' })
        .text(`Échéance: ${data.dueDate.toLocaleDateString('fr-FR')}`, 400, 125, { align: 'right' });

      // Divider
      doc
        .moveTo(50, 170)
        .lineTo(545, 170)
        .stroke();

      // Customer Info
      doc
        .fontSize(12)
        .font('Helvetica-Bold')
        .text('Facturé à:', 50, 190)
        .fontSize(10)
        .font('Helvetica')
        .text(data.customer.name, 50, 210)
        .text(data.customer.email, 50, 225);
      
      if (data.customer.address) {
        doc.text(data.customer.address, 50, 240);
      }
      if (data.customer.phone) {
        doc.text(`Tél: ${data.customer.phone}`, 50, 255);
      }

      // Items Table Header
      const tableTop = 300;
      doc
        .fontSize(10)
        .font('Helvetica-Bold')
        .text('Description', 50, tableTop)
        .text('Qté', 300, tableTop, { width: 50, align: 'center' })
        .text('Prix unit.', 360, tableTop, { width: 80, align: 'right' })
        .text('Total', 460, tableTop, { width: 80, align: 'right' });

      // Table line
      doc
        .moveTo(50, tableTop + 15)
        .lineTo(545, tableTop + 15)
        .stroke();

      // Items
      let y = tableTop + 25;
      doc.font('Helvetica');
      
      for (const item of data.items) {
        const itemTotal = item.quantity * item.unitPrice;
        
        doc
          .text(item.platName, 50, y, { width: 240 })
          .text(item.quantity.toString(), 300, y, { width: 50, align: 'center' })
          .text(`${item.unitPrice.toFixed(2)} DT`, 360, y, { width: 80, align: 'right' })
          .text(`${itemTotal.toFixed(2)} DT`, 460, y, { width: 80, align: 'right' });
        
        y += 20;
      }

      // Line before totals
      y += 10;
      doc
        .moveTo(350, y)
        .lineTo(545, y)
        .stroke();

      // Totals
      y += 15;
      doc
        .text('Sous-total:', 360, y, { width: 80, align: 'right' })
        .text(`${data.subtotal.toFixed(2)} DT`, 460, y, { width: 80, align: 'right' });

      y += 18;
      doc
        .text('Frais de livraison:', 360, y, { width: 80, align: 'right' })
        .text(`${data.deliveryFee.toFixed(2)} DT`, 460, y, { width: 80, align: 'right' });

      y += 18;
      doc
        .text('TVA (19%):', 360, y, { width: 80, align: 'right' })
        .text(`${data.tax.toFixed(2)} DT`, 460, y, { width: 80, align: 'right' });

      y += 20;
      doc
        .moveTo(350, y)
        .lineTo(545, y)
        .stroke();

      y += 10;
      doc
        .font('Helvetica-Bold')
        .fontSize(12)
        .text('TOTAL:', 360, y, { width: 80, align: 'right' })
        .text(`${data.total.toFixed(2)} DT`, 460, y, { width: 80, align: 'right' });

      // Payment Info
      y += 50;
      doc
        .font('Helvetica-Bold')
        .fontSize(10)
        .text('Informations de paiement', 50, y);
      
      y += 15;
      doc
        .font('Helvetica')
        .text(`Mode de paiement: ${getPaymentMethodLabel(data.paymentMethod)}`, 50, y)
        .text(`Statut: ${getPaymentStatusLabel(data.paymentStatus)}`, 50, y + 15);

      // Notes
      if (data.notes) {
        y += 50;
        doc
          .font('Helvetica-Bold')
          .text('Notes:', 50, y)
          .font('Helvetica')
          .text(data.notes, 50, y + 15, { width: 495 });
      }

      // Footer
      doc
        .fontSize(8)
        .text(
          `${SITE_NAME} - Plateforme Traiteur Intelligente`,
          50,
          780,
          { align: 'center', width: 495 }
        )
        .text('Merci pour votre confiance !', 50, 795, { align: 'center', width: 495 });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

function getPaymentMethodLabel(method: string): string {
  const labels: Record<string, string> = {
    CARD: 'Carte bancaire',
    CASH: 'Espèces',
    FLOUCI: 'Flouci (paiement en ligne)',
  };
  return labels[method] || method;
}

function getPaymentStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    PENDING: 'En attente',
    COMPLETED: 'Payé',
    FAILED: 'Échoué',
    REFUNDED: 'Remboursé',
  };
  return labels[status] || status;
}

export function generateInvoiceNumber(orderId: string): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const shortId = orderId.slice(-6).toUpperCase();
  return `FAC-${year}${month}-${shortId}`;
}
