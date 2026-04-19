import prisma from '../config/database';
import { QuoteStatus, Prisma } from '@prisma/client';
import { createInvoiceFromAcceptedQuote } from './event-invoice.service';

const QUOTE_TAX_RATE = Number(process.env.EVENT_QUOTE_TAX_RATE || 0.2);
const QUOTE_DEFAULT_VALID_DAYS = Number(process.env.EVENT_QUOTE_DEFAULT_VALID_DAYS || 30);

function generateQuoteNumber(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `QT-${year}${month}-${random}`;
}

export interface QuoteItemData {
  platId?: string;
  name: string;
  description?: string;
  category?: string;
  quantity: number;
  unitPrice: number;
  notes?: string;
}

export interface CreateQuoteData {
  items: QuoteItemData[];
  serviceFee?: number;
  deliveryFee?: number;
  discount?: number;
  validDays?: number;
  notes?: string;
  termsConditions?: string;
}

function getAllowedNextQuoteStatuses(current: QuoteStatus): QuoteStatus[] {
  const transitions: Record<QuoteStatus, QuoteStatus[]> = {
    DRAFT: [QuoteStatus.SENT],
    SENT: [QuoteStatus.VIEWED, QuoteStatus.ACCEPTED, QuoteStatus.REJECTED, QuoteStatus.EXPIRED],
    VIEWED: [QuoteStatus.ACCEPTED, QuoteStatus.REJECTED, QuoteStatus.EXPIRED],
    ACCEPTED: [],
    REJECTED: [],
    EXPIRED: [],
  };

  return transitions[current] || [];
}

function assertQuoteTransition(current: QuoteStatus, next: QuoteStatus) {
  if (!getAllowedNextQuoteStatuses(current).includes(next)) {
    throw new Error(`Cannot transition quote from ${current} to ${next}`);
  }
}

async function refreshExpiredQuoteStatus(quoteId: string) {
  const quote = await prisma.quote.findUnique({
    where: { id: quoteId },
  });

  if (!quote) {
    throw new Error('Quote not found');
  }

  const isExpirable = quote.status === QuoteStatus.SENT || quote.status === QuoteStatus.VIEWED;
  const isExpired = new Date() > quote.validUntil;

  if (isExpirable && isExpired) {
    return prisma.quote.update({
      where: { id: quote.id },
      data: { status: QuoteStatus.EXPIRED },
    });
  }

  return quote;
}

export async function createQuote(eventId: string, data: CreateQuoteData) {
  // Verify event exists
  const event = await prisma.event.findUnique({
    where: { id: eventId },
  });

  if (!event) {
    throw new Error('Event not found');
  }

  // Calculate totals
  const subtotal = data.items.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity,
    0
  );
  const serviceFee = data.serviceFee || 0;
  const deliveryFee = data.deliveryFee || 0;
  const discount = data.discount || 0;
  const taxRate = QUOTE_TAX_RATE;
  const taxableAmount = subtotal + serviceFee + deliveryFee - discount;
  const tax = taxableAmount * taxRate;
  const totalAmount = taxableAmount + tax;

  // Calculate validity date
  const validDays = data.validDays || QUOTE_DEFAULT_VALID_DAYS;
  const validUntil = new Date();
  validUntil.setDate(validUntil.getDate() + validDays);

  const quote = await prisma.quote.create({
    data: {
      eventId,
      quoteNumber: generateQuoteNumber(),
      subtotal: new Prisma.Decimal(subtotal),
      serviceFee: new Prisma.Decimal(serviceFee),
      deliveryFee: new Prisma.Decimal(deliveryFee),
      tax: new Prisma.Decimal(tax),
      discount: new Prisma.Decimal(discount),
      totalAmount: new Prisma.Decimal(totalAmount),
      validUntil,
      notes: data.notes,
      termsConditions: data.termsConditions,
      items: {
        create: data.items.map((item) => ({
          platId: item.platId,
          name: item.name,
          description: item.description,
          category: item.category,
          quantity: item.quantity,
          unitPrice: new Prisma.Decimal(item.unitPrice),
          totalPrice: new Prisma.Decimal(item.unitPrice * item.quantity),
          notes: item.notes,
        })),
      },
    },
    include: {
      items: true,
      event: true,
    },
  });

  // Update event status
  await prisma.event.update({
    where: { id: eventId },
    data: { status: 'QUOTE_SENT' },
  });

  return transformQuote(quote);
}

export async function getQuoteById(quoteId: string) {
  const quote = await prisma.quote.findUnique({
    where: { id: quoteId },
    include: {
      items: true,
      event: {
        include: { menuItems: true },
      },
    },
  });

  if (!quote) {
    throw new Error('Quote not found');
  }

  return transformQuote(quote);
}

export async function getQuoteByNumber(
  quoteNumber: string,
  requesterUserId: string,
  requesterRole: string
) {
  const quote = await prisma.quote.findUnique({
    where: { quoteNumber },
    include: {
      items: true,
      event: true,
    },
  });

  if (!quote) {
    throw new Error('Quote not found');
  }

  const isAdmin = requesterRole === 'ADMIN';
  const isOwner = quote.event?.userId === requesterUserId;

  if (!isAdmin && !isOwner) {
    throw new Error('Quote not found');
  }

  const refreshedQuote = await refreshExpiredQuoteStatus(quote.id);

  if (refreshedQuote.status === QuoteStatus.EXPIRED) {
    return transformQuote({
      ...quote,
      status: QuoteStatus.EXPIRED,
    });
  }

  // Mark as viewed if first time
  if (!quote.viewedAt && quote.status === QuoteStatus.SENT) {
    const viewedQuote = await prisma.quote.update({
      where: { id: quote.id },
      data: { viewedAt: new Date(), status: QuoteStatus.VIEWED },
      include: {
        items: true,
        event: true,
      },
    });

    return transformQuote(viewedQuote);
  }

  const freshQuote = await prisma.quote.findUnique({
    where: { id: quote.id },
    include: {
      items: true,
      event: true,
    },
  });

  if (!freshQuote) {
    throw new Error('Quote not found');
  }

  return transformQuote(freshQuote);
}

export async function sendQuote(quoteId: string) {
  const existing = await prisma.quote.findUnique({
    where: { id: quoteId },
  });

  if (!existing) {
    throw new Error('Quote not found');
  }

  assertQuoteTransition(existing.status, QuoteStatus.SENT);

  const quote = await prisma.quote.update({
    where: { id: quoteId },
    data: {
      status: QuoteStatus.SENT,
      sentAt: new Date(),
    },
    include: {
      items: true,
      event: true,
    },
  });

  // Update event status
  await prisma.event.update({
    where: { id: quote.eventId },
    data: { status: 'QUOTE_SENT' },
  });

  return transformQuote(quote);
}

export async function acceptQuote(quoteId: string, userId: string) {
  const existingQuote = await prisma.quote.findUnique({
    where: { id: quoteId },
    include: { event: true },
  });

  if (!existingQuote) {
    throw new Error('Quote not found');
  }

  // Verify ownership
  if (existingQuote.event.userId !== userId) {
    throw new Error('Quote not found');
  }

  const quote = await refreshExpiredQuoteStatus(existingQuote.id);

  // Check if expired
  if (new Date() > quote.validUntil) {
    throw new Error('Quote has expired');
  }

  assertQuoteTransition(quote.status, QuoteStatus.ACCEPTED);

  const updated = await prisma.quote.update({
    where: { id: quoteId },
    data: {
      status: QuoteStatus.ACCEPTED,
      respondedAt: new Date(),
    },
    include: {
      items: true,
      event: true,
    },
  });

  // Update event status
  await prisma.event.update({
    where: { id: quote.eventId },
    data: { status: 'QUOTE_ACCEPTED' },
  });

  // Generate or refresh invoice from accepted quote
  await createInvoiceFromAcceptedQuote(updated.id);

  return transformQuote(updated);
}

export async function rejectQuote(quoteId: string, userId: string) {
  const existingQuote = await prisma.quote.findUnique({
    where: { id: quoteId },
    include: { event: true },
  });

  if (!existingQuote) {
    throw new Error('Quote not found');
  }

  // Verify ownership
  if (existingQuote.event.userId !== userId) {
    throw new Error('Quote not found');
  }

  const quote = await refreshExpiredQuoteStatus(existingQuote.id);

  if (quote.status === QuoteStatus.EXPIRED) {
    throw new Error('Quote has expired');
  }

  assertQuoteTransition(quote.status, QuoteStatus.REJECTED);

  const updated = await prisma.quote.update({
    where: { id: quoteId },
    data: {
      status: QuoteStatus.REJECTED,
      respondedAt: new Date(),
    },
    include: {
      items: true,
      event: true,
    },
  });

  return transformQuote(updated);
}

export async function updateQuote(
  quoteId: string,
  data: Partial<CreateQuoteData>
) {
  const existing = await prisma.quote.findUnique({
    where: { id: quoteId },
    include: { items: true },
  });

  if (!existing) {
    throw new Error('Quote not found');
  }

  if (existing.status !== QuoteStatus.DRAFT) {
    throw new Error('Cannot update quote after it has been sent');
  }

  // If items provided, recalculate totals
  let updateData: Prisma.QuoteUpdateInput = {};

  if (data.items) {
    // Delete existing items
    await prisma.quoteItem.deleteMany({
      where: { quoteId },
    });

    const subtotal = data.items.reduce(
      (sum, item) => sum + item.unitPrice * item.quantity,
      0
    );
    const serviceFee = data.serviceFee ?? Number(existing.serviceFee);
    const deliveryFee = data.deliveryFee ?? Number(existing.deliveryFee);
    const discount = data.discount ?? Number(existing.discount);
    const taxableAmount = subtotal + serviceFee + deliveryFee - discount;
    const tax = taxableAmount * QUOTE_TAX_RATE;
    const totalAmount = taxableAmount + tax;

    updateData = {
      subtotal: new Prisma.Decimal(subtotal),
      serviceFee: new Prisma.Decimal(serviceFee),
      deliveryFee: new Prisma.Decimal(deliveryFee),
      discount: new Prisma.Decimal(discount),
      tax: new Prisma.Decimal(tax),
      totalAmount: new Prisma.Decimal(totalAmount),
      items: {
        create: data.items.map((item) => ({
          platId: item.platId,
          name: item.name,
          description: item.description,
          category: item.category,
          quantity: item.quantity,
          unitPrice: new Prisma.Decimal(item.unitPrice),
          totalPrice: new Prisma.Decimal(item.unitPrice * item.quantity),
          notes: item.notes,
        })),
      },
    };
  }

  if (data.notes !== undefined) updateData.notes = data.notes;
  if (data.termsConditions !== undefined) updateData.termsConditions = data.termsConditions;

  const quote = await prisma.quote.update({
    where: { id: quoteId },
    data: updateData,
    include: {
      items: true,
      event: true,
    },
  });

  return transformQuote(quote);
}

export async function getAllQuotes(
  page = 1,
  limit = 10,
  status?: QuoteStatus
) {
  const skip = (page - 1) * limit;
  const where: Prisma.QuoteWhereInput = {};

  if (status) where.status = status;

  const [quotes, total] = await Promise.all([
    prisma.quote.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        items: true,
        event: true,
      },
    }),
    prisma.quote.count({ where }),
  ]);

  return {
    quotes: quotes.map(transformQuote),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

function transformQuote(quote: any) {
  return {
    ...quote,
    subtotal: Number(quote.subtotal),
    serviceFee: Number(quote.serviceFee),
    deliveryFee: Number(quote.deliveryFee),
    tax: Number(quote.tax),
    discount: Number(quote.discount),
    totalAmount: Number(quote.totalAmount),
    items: quote.items?.map((item: any) => ({
      ...item,
      unitPrice: Number(item.unitPrice),
      totalPrice: Number(item.totalPrice),
    })),
    event: quote.event
      ? {
          ...quote.event,
          budget: quote.event.budget ? Number(quote.event.budget) : null,
        }
      : null,
  };
}
