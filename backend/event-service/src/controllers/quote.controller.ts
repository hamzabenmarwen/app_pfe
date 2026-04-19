import { Response } from 'express';
import * as quoteService from '../services/quote.service';
import { emitRealtimeEvent } from '../services/realtime.service';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { QuoteStatus } from '@prisma/client';

export async function createQuote(req: AuthenticatedRequest, res: Response) {
  try {
    const { eventId } = req.params;
    const quote = await quoteService.createQuote(eventId, req.body);

    res.status(201).json({
      success: true,
      data: quote,
      message: 'Quote created successfully',
    });

    void emitRealtimeEvent({
      event: 'quote.status.updated',
      data: {
        quoteId: quote.id,
        quoteNumber: quote.quoteNumber,
        status: quote.status,
        eventId: quote.eventId,
        userId: quote.event?.userId,
        updatedAt: new Date().toISOString(),
      },
      rooms: quote.event?.userId ? [`user:${quote.event.userId}`] : [],
      broadcastToAdmins: true,
    });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
}

export async function getQuoteById(req: AuthenticatedRequest, res: Response) {
  try {
    const quote = await quoteService.getQuoteById(req.params.id);

    res.json({
      success: true,
      data: quote,
    });
  } catch (error: any) {
    res.status(404).json({ success: false, error: error.message });
  }
}

export async function getQuoteByNumber(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const quote = await quoteService.getQuoteByNumber(
      req.params.quoteNumber,
      req.user.userId,
      req.user.role
    );

    res.json({
      success: true,
      data: quote,
    });
  } catch (error: any) {
    res.status(404).json({ success: false, error: error.message });
  }
}

export async function sendQuote(req: AuthenticatedRequest, res: Response) {
  try {
    const quote = await quoteService.sendQuote(req.params.id);

    res.json({
      success: true,
      data: quote,
      message: 'Quote sent successfully',
    });

    void emitRealtimeEvent({
      event: 'quote.status.updated',
      data: {
        quoteId: quote.id,
        quoteNumber: quote.quoteNumber,
        status: quote.status,
        eventId: quote.eventId,
        userId: quote.event?.userId,
        updatedAt: new Date().toISOString(),
      },
      rooms: quote.event?.userId ? [`user:${quote.event.userId}`] : [],
      broadcastToAdmins: true,
    });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
}

export async function acceptQuote(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const quote = await quoteService.acceptQuote(req.params.id, req.user.userId);

    res.json({
      success: true,
      data: quote,
      message: 'Quote accepted',
    });

    void emitRealtimeEvent({
      event: 'quote.status.updated',
      data: {
        quoteId: quote.id,
        quoteNumber: quote.quoteNumber,
        status: quote.status,
        eventId: quote.eventId,
        userId: quote.event?.userId,
        updatedAt: new Date().toISOString(),
      },
      rooms: quote.event?.userId ? [`user:${quote.event.userId}`] : [],
      broadcastToAdmins: true,
    });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
}

export async function rejectQuote(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const quote = await quoteService.rejectQuote(req.params.id, req.user.userId);

    res.json({
      success: true,
      data: quote,
      message: 'Quote rejected',
    });

    void emitRealtimeEvent({
      event: 'quote.status.updated',
      data: {
        quoteId: quote.id,
        quoteNumber: quote.quoteNumber,
        status: quote.status,
        eventId: quote.eventId,
        userId: quote.event?.userId,
        updatedAt: new Date().toISOString(),
      },
      rooms: quote.event?.userId ? [`user:${quote.event.userId}`] : [],
      broadcastToAdmins: true,
    });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
}

export async function updateQuote(req: AuthenticatedRequest, res: Response) {
  try {
    const quote = await quoteService.updateQuote(req.params.id, req.body);

    res.json({
      success: true,
      data: quote,
      message: 'Quote updated successfully',
    });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
}

export async function getAllQuotes(req: AuthenticatedRequest, res: Response) {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const status = req.query.status as QuoteStatus | undefined;

    const result = await quoteService.getAllQuotes(page, limit, status);

    res.json({
      success: true,
      data: result.quotes,
      pagination: result.pagination,
    });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
}
