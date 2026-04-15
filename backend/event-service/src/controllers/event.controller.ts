import { Response } from 'express';
import * as eventService from '../services/event.service';
import { emitRealtimeEvent } from '../services/realtime.service';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { EventStatus, EventType } from '@prisma/client';

// Helper: emit event change notification to the owner and admins
function notifyEventChange(eventName: string, event: any, extra?: Record<string, any>) {
  void emitRealtimeEvent({
    event: eventName,
    data: { eventId: event.id, name: event.name, status: event.status, userId: event.userId, ...extra },
    rooms: event.userId ? [`user:${event.userId}`] : [],
    broadcastToAdmins: true,
  });
}

export async function createEvent(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const event = await eventService.createEvent(req.user.userId, {
      ...req.body,
      eventDate: new Date(req.body.eventDate),
    });

    res.status(201).json({
      success: true,
      data: event,
      message: 'Event created successfully',
    });

    notifyEventChange('event.created', event);
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
}

export async function getMyEvents(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 100);
    const status = req.query.status as EventStatus | undefined;

    const result = await eventService.getUserEvents(req.user.userId, page, limit, status);

    res.json({
      success: true,
      data: result.events,
      pagination: result.pagination,
    });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
}

export async function getAllEvents(req: AuthenticatedRequest, res: Response) {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 100);
    const status = req.query.status as EventStatus | undefined;
    const eventType = req.query.eventType as EventType | undefined;
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

    const result = await eventService.getAllEvents(page, limit, status, eventType, startDate, endDate);

    res.json({
      success: true,
      data: result.events,
      pagination: result.pagination,
    });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
}

export async function getEventById(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const userId = req.user.role === 'ADMIN' ? undefined : req.user.userId;
    const event = await eventService.getEventById(req.params.id, userId);

    res.json({
      success: true,
      data: event,
    });
  } catch (error: any) {
    res.status(404).json({ success: false, error: error.message });
  }
}

export async function updateEvent(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const userId = req.user.role === 'ADMIN' ? undefined : req.user.userId;
    const data = {
      ...req.body,
      eventDate: req.body.eventDate ? new Date(req.body.eventDate) : undefined,
    };

    const event = await eventService.updateEvent(req.params.id, userId, data);

    res.json({
      success: true,
      data: event,
      message: 'Event updated successfully',
    });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
}

export async function updateEventStatus(req: AuthenticatedRequest, res: Response) {
  try {
    const { status } = req.body;
    const event = await eventService.updateEventStatus(req.params.id, status);

    res.json({
      success: true,
      data: event,
      message: `Event status updated to ${status}`,
    });

    notifyEventChange('event.status.updated', event, { updatedAt: new Date().toISOString() });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
}

export async function deleteEvent(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const userId = req.user.role === 'ADMIN' ? undefined : req.user.userId;
    const result = await eventService.deleteEvent(req.params.id, userId);

    res.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
}

export async function addMenuItem(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const userId = req.user.role === 'ADMIN' ? undefined : req.user.userId;
    const menuItem = await eventService.addMenuItem(req.params.id, userId, req.body);

    res.status(201).json({
      success: true,
      data: menuItem,
      message: 'Menu item added',
    });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
}

export async function removeMenuItem(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const userId = req.user.role === 'ADMIN' ? undefined : req.user.userId;
    const result = await eventService.removeMenuItem(req.params.id, req.params.itemId, userId);

    res.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
}

export async function requestQuote(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const userId = req.user.role === 'ADMIN' ? undefined : req.user.userId;
    const event = await eventService.requestQuote(req.params.id, userId);

    res.json({
      success: true,
      data: event,
      message: 'Quote request submitted',
    });

    notifyEventChange('event.status.updated', event, { updatedAt: new Date().toISOString() });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
}

export async function getEventStats(req: AuthenticatedRequest, res: Response) {
  try {
    const stats = await eventService.getEventStats();

    res.json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
}
