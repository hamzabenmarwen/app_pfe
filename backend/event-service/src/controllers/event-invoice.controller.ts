import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import * as eventInvoiceService from '../services/event-invoice.service';

export async function getMyEventInvoices(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const result = await eventInvoiceService.getMyEventInvoices(req.user.userId, page, limit);

    res.json({
      success: true,
      data: result.invoices,
      pagination: result.pagination,
    });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
}
