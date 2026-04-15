import prisma from '../config/database';
import { EventType, EventStatus, QuoteStatus, Prisma } from '@prisma/client';

export interface Venue {
  name?: string;
  address: string;
  city: string;
  zipCode: string;
  country: string;
}

export interface DietaryRequirements {
  vegetarian?: number;
  vegan?: number;
  halal?: number;
  glutenFree?: number;
  other?: string;
}

export interface CreateEventData {
  name: string;
  eventType: EventType;
  eventDate: Date;
  startTime?: string;
  endTime?: string;
  venue?: Venue;
  guestCount: number;
  guestCountMin?: number;
  guestCountMax?: number;
  dietaryRequirements?: DietaryRequirements;
  allergens?: string[];
  serviceType?: string;
  description?: string;
  specialRequests?: string;
  budget?: number;
  budgetFlexible?: boolean;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
}

export async function createEvent(userId: string, data: CreateEventData) {
  const event = await prisma.event.create({
    data: {
      userId,
      name: data.name,
      eventType: data.eventType,
      eventDate: data.eventDate,
      startTime: data.startTime,
      endTime: data.endTime,
      venue: data.venue as any,
      guestCount: data.guestCount,
      guestCountMin: data.guestCountMin,
      guestCountMax: data.guestCountMax,
      dietaryRequirements: data.dietaryRequirements as any,
      allergens: data.allergens as any,
      serviceType: data.serviceType,
      description: data.description,
      specialRequests: data.specialRequests,
      budget: data.budget ? new Prisma.Decimal(data.budget) : null,
      budgetFlexible: data.budgetFlexible,
      contactName: data.contactName,
      contactPhone: data.contactPhone,
      contactEmail: data.contactEmail,
    },
    include: {
      menuItems: true,
      quotes: true,
    },
  });

  return transformEvent(event);
}

export async function getEventById(eventId: string, userId?: string) {
  const where: Prisma.EventWhereInput = { id: eventId };
  if (userId) {
    where.userId = userId;
  }

  const event = await prisma.event.findFirst({
    where,
    include: {
      menuItems: true,
      quotes: {
        include: {
          items: true,
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!event) {
    throw new Error('Event not found');
  }

  return transformEvent(event);
}

export async function getUserEvents(
  userId: string,
  page = 1,
  limit = 10,
  status?: EventStatus
) {
  const skip = (page - 1) * limit;
  const where: Prisma.EventWhereInput = { userId };

  if (status) {
    where.status = status;
  }

  const [events, total] = await Promise.all([
    prisma.event.findMany({
      where,
      skip,
      take: limit,
      orderBy: { eventDate: 'desc' },
      include: {
        menuItems: true,
        quotes: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    }),
    prisma.event.count({ where }),
  ]);

  return {
    events: events.map(transformEvent),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getAllEvents(
  page = 1,
  limit = 10,
  status?: EventStatus,
  eventType?: EventType,
  startDate?: Date,
  endDate?: Date
) {
  const skip = (page - 1) * limit;
  const where: Prisma.EventWhereInput = {};

  if (status) where.status = status;
  if (eventType) where.eventType = eventType;
  
  if (startDate || endDate) {
    where.eventDate = {};
    if (startDate) where.eventDate.gte = startDate;
    if (endDate) where.eventDate.lte = endDate;
  }

  const [events, total] = await Promise.all([
    prisma.event.findMany({
      where,
      skip,
      take: limit,
      orderBy: { eventDate: 'asc' },
      include: {
        menuItems: true,
        quotes: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    }),
    prisma.event.count({ where }),
  ]);

  return {
    events: events.map(transformEvent),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function updateEvent(
  eventId: string,
  userId: string | undefined,
  data: Partial<CreateEventData>
) {
  const where: Prisma.EventWhereInput = { id: eventId };
  if (userId) {
    where.userId = userId;
  }

  const existing = await prisma.event.findFirst({ where });
  if (!existing) {
    throw new Error('Event not found');
  }

  const updateData: Prisma.EventUpdateInput = {};
  
  if (data.name !== undefined) updateData.name = data.name;
  if (data.eventType !== undefined) updateData.eventType = data.eventType;
  if (data.eventDate !== undefined) updateData.eventDate = data.eventDate;
  if (data.startTime !== undefined) updateData.startTime = data.startTime;
  if (data.endTime !== undefined) updateData.endTime = data.endTime;
  if (data.venue !== undefined) updateData.venue = data.venue as any;
  if (data.guestCount !== undefined) updateData.guestCount = data.guestCount;
  if (data.guestCountMin !== undefined) updateData.guestCountMin = data.guestCountMin;
  if (data.guestCountMax !== undefined) updateData.guestCountMax = data.guestCountMax;
  if (data.dietaryRequirements !== undefined) updateData.dietaryRequirements = data.dietaryRequirements as any;
  if (data.allergens !== undefined) updateData.allergens = data.allergens as any;
  if (data.serviceType !== undefined) updateData.serviceType = data.serviceType;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.specialRequests !== undefined) updateData.specialRequests = data.specialRequests;
  if (data.budget !== undefined) updateData.budget = new Prisma.Decimal(data.budget);
  if (data.budgetFlexible !== undefined) updateData.budgetFlexible = data.budgetFlexible;
  if (data.contactName !== undefined) updateData.contactName = data.contactName;
  if (data.contactPhone !== undefined) updateData.contactPhone = data.contactPhone;
  if (data.contactEmail !== undefined) updateData.contactEmail = data.contactEmail;

  const event = await prisma.event.update({
    where: { id: eventId },
    data: updateData,
    include: {
      menuItems: true,
      quotes: {
        include: { items: true },
      },
    },
  });

  return transformEvent(event);
}

export async function updateEventStatus(eventId: string, status: EventStatus) {
  const existing = await prisma.event.findUnique({
    where: { id: eventId },
  });

  if (!existing) {
    throw new Error('Event not found');
  }

  // Strict state machine for event status transitions
  const validTransitions: Record<EventStatus, EventStatus[]> = {
    DRAFT: [EventStatus.PENDING_QUOTE, EventStatus.CANCELLED],
    PENDING_QUOTE: [EventStatus.QUOTE_SENT, EventStatus.CANCELLED],
    QUOTE_SENT: [EventStatus.QUOTE_ACCEPTED, EventStatus.CANCELLED],
    QUOTE_ACCEPTED: [EventStatus.CONFIRMED, EventStatus.CANCELLED],
    CONFIRMED: [EventStatus.IN_PROGRESS, EventStatus.CANCELLED],
    IN_PROGRESS: [EventStatus.COMPLETED, EventStatus.CANCELLED],
    COMPLETED: [],    // terminal
    CANCELLED: [],    // terminal
  };

  const allowed = validTransitions[existing.status];
  if (!allowed || !allowed.includes(status)) {
    throw new Error(`Cannot transition event from ${existing.status} to ${status}`);
  }

  const event = await prisma.event.update({
    where: { id: eventId },
    data: { status },
    include: {
      menuItems: true,
      quotes: true,
    },
  });

  return transformEvent(event);
}

export async function deleteEvent(eventId: string, userId?: string) {
  const where: Prisma.EventWhereInput = { id: eventId };
  if (userId) {
    where.userId = userId;
  }

  const existing = await prisma.event.findFirst({ where });
  if (!existing) {
    throw new Error('Event not found');
  }

  await prisma.event.delete({
    where: { id: eventId },
  });

  return { message: 'Event deleted successfully' };
}

export async function addMenuItem(
  eventId: string,
  userId: string | undefined,
  item: { platId: string; platName: string; category?: string; quantity?: number; notes?: string }
) {
  const where: Prisma.EventWhereInput = { id: eventId };
  if (userId) {
    where.userId = userId;
  }

  const event = await prisma.event.findFirst({ where });
  if (!event) {
    throw new Error('Event not found');
  }

  const menuItem = await prisma.eventMenuItem.create({
    data: {
      eventId,
      platId: item.platId,
      platName: item.platName,
      category: item.category,
      quantity: item.quantity,
      notes: item.notes,
    },
  });

  return menuItem;
}

export async function removeMenuItem(eventId: string, menuItemId: string, userId?: string) {
  const where: Prisma.EventWhereInput = { id: eventId };
  if (userId) {
    where.userId = userId;
  }

  const event = await prisma.event.findFirst({ where });
  if (!event) {
    throw new Error('Event not found');
  }

  await prisma.eventMenuItem.delete({
    where: { id: menuItemId },
  });

  return { message: 'Menu item removed' };
}

export async function requestQuote(eventId: string, userId?: string) {
  const where: Prisma.EventWhereInput = { id: eventId };
  if (userId) {
    where.userId = userId;
  }

  const event = await prisma.event.findFirst({
    where,
  });

  if (!event) {
    throw new Error('Event not found');
  }

  const updated = await prisma.event.update({
    where: { id: eventId },
    data: { status: EventStatus.PENDING_QUOTE },
    include: {
      menuItems: true,
      quotes: true,
    },
  });

  return transformEvent(updated);
}

export async function getEventStats() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  const [
    totalEvents,
    pendingQuotes,
    upcomingEvents,
    monthEvents,
    eventsByType,
    totalQuotes,
    acceptedQuotes,
    avgQuoteResponseHoursResult,
    avgEventProcessingHoursResult,
  ] = await Promise.all([
    prisma.event.count(),
    prisma.event.count({
      where: { status: EventStatus.PENDING_QUOTE },
    }),
    prisma.event.count({
      where: {
        eventDate: { gte: today },
        status: { in: [EventStatus.CONFIRMED, EventStatus.QUOTE_ACCEPTED] },
      },
    }),
    prisma.event.count({
      where: {
        eventDate: { gte: thisMonth, lte: nextMonth },
      },
    }),
    prisma.event.groupBy({
      by: ['eventType'],
      _count: true,
    }),
    prisma.quote.count(),
    prisma.quote.count({
      where: { status: QuoteStatus.ACCEPTED },
    }),
    prisma.$queryRaw<Array<{ avgHours: unknown }>>(
      Prisma.sql`
        SELECT AVG(EXTRACT(EPOCH FROM ("respondedAt" - "createdAt")) / 3600.0) AS "avgHours"
        FROM "Quote"
        WHERE "respondedAt" IS NOT NULL
      `
    ),
    prisma.$queryRaw<Array<{ avgHours: unknown }>>(
      Prisma.sql`
        SELECT AVG(EXTRACT(EPOCH FROM ("updatedAt" - "createdAt")) / 3600.0) AS "avgHours"
        FROM "Event"
        WHERE "status" IN ('CONFIRMED', 'COMPLETED')
      `
    ),
  ]);

  const quoteConversionRate = totalQuotes > 0 ? (acceptedQuotes / totalQuotes) * 100 : 0;
  const avgQuoteResponseHours = Number(avgQuoteResponseHoursResult?.[0]?.avgHours || 0);
  const avgEventProcessingHours = Number(avgEventProcessingHoursResult?.[0]?.avgHours || 0);

  return {
    totalEvents,
    pendingQuotes,
    upcomingEvents,
    monthEvents,
    totalQuotes,
    acceptedQuotes,
    quoteConversionRate: Number(quoteConversionRate.toFixed(2)),
    avgQuoteResponseHours: Number(avgQuoteResponseHours.toFixed(2)),
    avgEventProcessingHours: Number(avgEventProcessingHours.toFixed(2)),
    eventsByType: eventsByType.map(e => ({
      type: e.eventType,
      count: (e as any)._count?._all ?? 0,
    })),
  };
}

function transformEvent(event: any) {
  return {
    ...event,
    budget: event.budget ? Number(event.budget) : null,
    quotes: event.quotes?.map((q: any) => ({
      ...q,
      subtotal: Number(q.subtotal),
      serviceFee: Number(q.serviceFee),
      deliveryFee: Number(q.deliveryFee),
      tax: Number(q.tax),
      discount: Number(q.discount),
      totalAmount: Number(q.totalAmount),
      items: q.items?.map((i: any) => ({
        ...i,
        unitPrice: Number(i.unitPrice),
        totalPrice: Number(i.totalPrice),
      })),
    })),
  };
}
