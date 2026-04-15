import { Response } from 'express';
import * as invoiceService from '../services/invoice.service';
import { generateInvoicePDF, generateInvoiceNumber } from '../services/pdf.service';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

async function fetchCustomerInfo(userId: string, authToken?: string): Promise<{ name: string; email: string; phone?: string }> {
  const authServiceUrl = process.env.AUTH_SERVICE_URL || 'http://localhost:3001';
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (authToken) {
      headers['Authorization'] = authToken;
    }
    const response = await fetch(`${authServiceUrl}/api/users/${userId}`, { headers });
    if (response.ok) {
      const data: any = await response.json();
      const user = data.data || data;
      return {
        name: [user.firstName, user.lastName].filter(Boolean).join(' ') || 'Client',
        email: user.email || '',
        phone: user.phone || undefined,
      };
    }
  } catch {
    // Fallback silently
  }
  return { name: 'Client', email: '' };
}

function formatDeliveryAddress(address: any): string {
  if (!address) return '';
  if (typeof address === 'string') return address;
  const parts = [address.street, address.city, address.zipCode, address.country].filter(Boolean);
  return parts.join(', ');
}

export async function getMyInvoices(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    const result = await invoiceService.getUserInvoices(req.user.userId, page, limit);

    res.json({
      success: true,
      data: result.invoices,
      pagination: result.pagination,
    });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
}

export async function getAllInvoices(req: AuthenticatedRequest, res: Response) {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    const result = await invoiceService.getAllInvoices(page, limit);

    res.json({
      success: true,
      data: result.invoices,
      pagination: result.pagination,
    });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
}

export async function getInvoiceByOrderId(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const userId = req.user.role === 'ADMIN' ? undefined : req.user.userId;
    const invoice = await invoiceService.getInvoiceByOrderId(req.params.orderId, userId);

    res.json({
      success: true,
      data: invoice,
    });
  } catch (error: any) {
    res.status(404).json({ success: false, error: error.message });
  }
}

export async function downloadInvoicePDF(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const { orderId } = req.params;
    const userId = req.user.role === 'ADMIN' ? undefined : req.user.userId;

    const invoice = await invoiceService.getInvoiceByOrderId(orderId, userId);

    if (!invoice) {
      res.status(404).json({ success: false, error: 'Invoice not found' });
      return;
    }

    const orderUserId = invoice.order?.userId || req.user.userId;
    const authHeader = req.headers.authorization as string | undefined;
    const customer = await fetchCustomerInfo(orderUserId, authHeader);

    const pdfBuffer = await generateInvoicePDF({
      invoiceNumber: invoice.invoiceNumber || generateInvoiceNumber(orderId),
      orderNumber: invoice.order?.orderNumber || orderId.slice(-8).toUpperCase(),
      date: new Date(invoice.createdAt),
      dueDate: new Date(new Date(invoice.createdAt).setDate(new Date(invoice.createdAt).getDate() + 30)),
      customer: {
        name: customer.name,
        email: customer.email || req.user.email || '',
        address: formatDeliveryAddress(invoice.order?.deliveryAddress),
        phone: customer.phone,
      },
      items: (invoice.order?.items || []).map((item: any) => ({
        platName: item.platName || 'Plat',
        quantity: item.quantity,
        unitPrice: parseFloat(item.unitPrice),
      })),
      subtotal: parseFloat(invoice.order?.subtotal || '0'),
      deliveryFee: parseFloat(invoice.order?.deliveryFee || '0'),
      tax: parseFloat(invoice.order?.tax || '0'),
      total: parseFloat(invoice.order?.totalAmount || '0'),
      paymentMethod: invoice.payment?.method || 'CASH',
      paymentStatus: invoice.payment?.status || 'PENDING',
      notes: invoice.order?.notes,
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=facture-${invoice.invoiceNumber || orderId}.pdf`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.send(pdfBuffer);
  } catch (error: any) {
    console.error('PDF generation error:', error);
    res.status(500).json({ success: false, error: 'Failed to generate PDF' });
  }
}
