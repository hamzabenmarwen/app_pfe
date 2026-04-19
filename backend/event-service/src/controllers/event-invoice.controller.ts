import { Response } from 'express';
import { EventInvoiceStatus } from '@prisma/client';
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

export async function getAllEventInvoices(req: AuthenticatedRequest, res: Response) {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as EventInvoiceStatus | undefined;
    const from = req.query.from ? new Date(req.query.from as string) : undefined;
    const to = req.query.to ? new Date(req.query.to as string) : undefined;

    const result = await eventInvoiceService.getAllEventInvoices(page, limit, status, from, to);

    res.json({
      success: true,
      data: result.invoices,
      pagination: result.pagination,
    });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
}

export async function markEventInvoicePaid(req: AuthenticatedRequest, res: Response) {
  try {
    const invoice = await eventInvoiceService.markEventInvoicePaid(req.params.id);

    res.json({
      success: true,
      data: invoice,
      message: 'Invoice marked as paid',
    });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
}

export async function initiateFlouciPayment(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const result = await eventInvoiceService.initiateFlouciEventInvoicePayment(
      req.params.id,
      req.user.userId
    );

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
}

export async function refreshFlouciPayment(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const result = await eventInvoiceService.refreshFlouciEventInvoicePayment(
      req.params.id,
      req.user.userId,
      req.user.role
    );

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
}

export async function getEventInvoicePaymentStatus(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const invoice = await eventInvoiceService.getEventInvoicePaymentStatus(
      req.params.id,
      req.user.userId,
      req.user.role
    );

    res.json({
      success: true,
      data: invoice,
    });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
}
