import prisma from '../config/database';
import {
  EventInvoicePaymentMethod,
  EventInvoicePaymentStatus,
  EventInvoiceStatus,
  EventStatus,
  Prisma,
} from '@prisma/client';

const EVENT_INVOICE_DUE_DAYS = Number(process.env.EVENT_INVOICE_DUE_DAYS || 7);
const FLOUCI_API_URL = 'https://developers.flouci.com/api';
const FLOUCI_APP_TOKEN = process.env.FLOUCI_APP_TOKEN || '';
const FLOUCI_APP_SECRET = process.env.FLOUCI_APP_SECRET || '';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5174';

interface FlouciPaymentResponse {
  result: {
    link: string;
    payment_id: string;
    success: boolean;
  };
}

interface FlouciVerifyResponse {
  result: {
    status: string;
    amount: number;
    payment_id: string;
  };
  success: boolean;
}

function generateEventInvoiceNumber(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const suffix = Math.floor(1000 + Math.random() * 9000);
  return `EINV-${y}${m}${d}-${suffix}`;
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function withOverdueStatus(invoice: { status: EventInvoiceStatus; dueDate: Date }) {
  if (invoice.status === EventInvoiceStatus.SENT && invoice.dueDate.getTime() < Date.now()) {
    return EventInvoiceStatus.OVERDUE;
  }

  return invoice.status;
}

function ensureRequesterCanAccessInvoice(
  invoice: { userId: string },
  requesterUserId: string,
  requesterRole: string
) {
  const isAdmin = requesterRole === 'ADMIN';
  const isOwner = invoice.userId === requesterUserId;

  if (!isAdmin && !isOwner) {
    throw new Error('Invoice not found');
  }
}

async function markEventAsConfirmedIfQuotedAccepted(tx: Prisma.TransactionClient, eventId: string) {
  await tx.event.updateMany({
    where: {
      id: eventId,
      status: EventStatus.QUOTE_ACCEPTED,
    },
    data: {
      status: EventStatus.CONFIRMED,
    },
  });
}

async function applySuccessfulInvoicePayment(
  tx: Prisma.TransactionClient,
  invoiceId: string,
  paymentMethod: EventInvoicePaymentMethod,
  transactionRef?: string,
  paymentUrl?: string
) {
  const now = new Date();

  const invoice = await tx.eventInvoice.update({
    where: { id: invoiceId },
    data: {
      status: EventInvoiceStatus.PAID,
      paidAt: now,
    },
    include: {
      event: {
        select: {
          id: true,
          name: true,
          eventDate: true,
        },
      },
      quote: {
        select: {
          id: true,
          quoteNumber: true,
        },
      },
      payment: true,
    },
  });

  await tx.eventInvoicePayment.upsert({
    where: { invoiceId },
    create: {
      invoiceId,
      amount: invoice.totalAmount,
      method: paymentMethod,
      status: EventInvoicePaymentStatus.COMPLETED,
      transactionRef,
      paymentUrl,
      paidAt: now,
    },
    update: {
      amount: invoice.totalAmount,
      method: paymentMethod,
      status: EventInvoicePaymentStatus.COMPLETED,
      transactionRef,
      paymentUrl,
      paidAt: now,
    },
  });

  await markEventAsConfirmedIfQuotedAccepted(tx, invoice.eventId);

  return invoice;
}

export async function createInvoiceFromAcceptedQuote(quoteId: string) {
  const quote = await prisma.quote.findUnique({
    where: { id: quoteId },
    include: { event: true },
  });

  if (!quote) {
    throw new Error('Quote not found');
  }

  if (quote.status !== 'ACCEPTED') {
    throw new Error('Invoice can only be created from accepted quotes');
  }

  const issuedAt = new Date();
  const dueDate = addDays(issuedAt, EVENT_INVOICE_DUE_DAYS);

  const invoice = await prisma.eventInvoice.upsert({
    where: { quoteId: quote.id },
    update: {
      subtotal: quote.subtotal,
      serviceFee: quote.serviceFee,
      deliveryFee: quote.deliveryFee,
      tax: quote.tax,
      discount: quote.discount,
      totalAmount: quote.totalAmount,
      dueDate,
      status: EventInvoiceStatus.SENT,
    },
    create: {
      eventId: quote.eventId,
      quoteId: quote.id,
      userId: quote.event.userId,
      invoiceNumber: generateEventInvoiceNumber(),
      status: EventInvoiceStatus.SENT,
      subtotal: quote.subtotal,
      serviceFee: quote.serviceFee,
      deliveryFee: quote.deliveryFee,
      tax: quote.tax,
      discount: quote.discount,
      totalAmount: quote.totalAmount,
      issuedAt,
      dueDate,
    },
    include: {
      payment: true,
    },
  });

  return transformInvoice(invoice);
}

export async function getAllEventInvoices(
  page = 1,
  limit = 20,
  status?: EventInvoiceStatus,
  from?: Date,
  to?: Date
) {
  const skip = (page - 1) * limit;
  const where: Prisma.EventInvoiceWhereInput = {};

  if (status) {
    where.status = status;
  }

  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.gte = from;
    if (to) where.createdAt.lte = to;
  }

  const [invoices, total] = await Promise.all([
    prisma.eventInvoice.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        event: {
          select: {
            id: true,
            name: true,
            eventDate: true,
          },
        },
        quote: {
          select: {
            id: true,
            quoteNumber: true,
            status: true,
          },
        },
        payment: true,
      },
    }),
    prisma.eventInvoice.count({ where }),
  ]);

  return {
    invoices: invoices.map(transformInvoice),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function markEventInvoicePaid(invoiceId: string) {
  const existing = await prisma.eventInvoice.findUnique({
    where: { id: invoiceId },
    include: { payment: true },
  });

  if (!existing) {
    throw new Error('Invoice not found');
  }

  if (existing.status === EventInvoiceStatus.CANCELLED) {
    throw new Error('Cancelled invoices cannot be marked as paid');
  }

  if (existing.status === EventInvoiceStatus.PAID) {
    return transformInvoice(existing);
  }

  const updated = await prisma.$transaction(async (tx) => {
    const invoice = await applySuccessfulInvoicePayment(tx, invoiceId, EventInvoicePaymentMethod.CASH);
    return invoice;
  });

  return transformInvoice(updated);
}

export async function initiateFlouciEventInvoicePayment(invoiceId: string, userId: string) {
  const invoice = await prisma.eventInvoice.findFirst({
    where: { id: invoiceId, userId },
    include: { payment: true },
  });

  if (!invoice) {
    throw new Error('Invoice not found');
  }

  if (invoice.status === EventInvoiceStatus.CANCELLED) {
    throw new Error('Cannot pay a cancelled invoice');
  }

  if (invoice.status === EventInvoiceStatus.PAID || invoice.payment?.status === EventInvoicePaymentStatus.COMPLETED) {
    throw new Error('This invoice is already paid');
  }

  const amountInMillimes = Math.round(Number(invoice.totalAmount) * 1000);

  const response = await fetch(`${FLOUCI_API_URL}/generate_payment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      app_token: FLOUCI_APP_TOKEN,
      app_secret: FLOUCI_APP_SECRET,
      amount: amountInMillimes,
      accept_card: 'true',
      session_timeout_secs: 1800,
      success_link: `${FRONTEND_URL}/dashboard/invoices?eventPayment=success&eventInvoiceId=${invoice.id}`,
      fail_link: `${FRONTEND_URL}/dashboard/invoices?eventPayment=failed&eventInvoiceId=${invoice.id}`,
      developer_tracking_id: `event-invoice:${invoice.id}`,
    }),
  });

  if (!response.ok) {
    throw new Error('Unable to connect to payment provider');
  }

  const data = (await response.json()) as FlouciPaymentResponse;

  if (!data.result?.success || !data.result.payment_id || !data.result.link) {
    throw new Error('Could not initiate event invoice payment');
  }

  await prisma.eventInvoicePayment.upsert({
    where: { invoiceId: invoice.id },
    create: {
      invoiceId: invoice.id,
      amount: invoice.totalAmount,
      method: EventInvoicePaymentMethod.FLOUCI,
      status: EventInvoicePaymentStatus.PENDING,
      transactionRef: data.result.payment_id,
      paymentUrl: data.result.link,
    },
    update: {
      amount: invoice.totalAmount,
      method: EventInvoicePaymentMethod.FLOUCI,
      status: EventInvoicePaymentStatus.PENDING,
      transactionRef: data.result.payment_id,
      paymentUrl: data.result.link,
      paidAt: null,
    },
  });

  return {
    invoiceId: invoice.id,
    paymentUrl: data.result.link,
    paymentId: data.result.payment_id,
    amount: Number(invoice.totalAmount),
  };
}

export async function refreshFlouciEventInvoicePayment(
  invoiceId: string,
  requesterUserId: string,
  requesterRole: string
) {
  const invoice = await prisma.eventInvoice.findUnique({
    where: { id: invoiceId },
    include: { payment: true },
  });

  if (!invoice) {
    throw new Error('Invoice not found');
  }

  ensureRequesterCanAccessInvoice(invoice, requesterUserId, requesterRole);

  if (!invoice.payment || invoice.payment.method !== EventInvoicePaymentMethod.FLOUCI) {
    return {
      verified: false,
      status: 'NO_PENDING_PAYMENT',
      invoiceId: invoice.id,
    };
  }

  if (invoice.status === EventInvoiceStatus.PAID || invoice.payment.status === EventInvoicePaymentStatus.COMPLETED) {
    return {
      verified: true,
      status: 'COMPLETED',
      invoiceId: invoice.id,
    };
  }

  if (!invoice.payment.transactionRef) {
    return {
      verified: false,
      status: 'MISSING_TRANSACTION_REF',
      invoiceId: invoice.id,
    };
  }

  const verifyResponse = await fetch(`${FLOUCI_API_URL}/verify_payment/${invoice.payment.transactionRef}`, {
    headers: { 'Content-Type': 'application/json' },
  });

  if (!verifyResponse.ok) {
    throw new Error('Unable to verify payment status');
  }

  const verifyData = (await verifyResponse.json()) as FlouciVerifyResponse;

  if (!verifyData.success) {
    await prisma.eventInvoicePayment.update({
      where: { invoiceId: invoice.id },
      data: { status: EventInvoicePaymentStatus.FAILED },
    });

    return {
      verified: false,
      status: 'FAILED',
      invoiceId: invoice.id,
    };
  }

  if (verifyData.result.status === 'SUCCESS') {
    const updated = await prisma.$transaction(async (tx) => {
      return applySuccessfulInvoicePayment(
        tx,
        invoice.id,
        EventInvoicePaymentMethod.FLOUCI,
        invoice.payment?.transactionRef || undefined,
        invoice.payment?.paymentUrl || undefined
      );
    });

    return {
      verified: true,
      status: 'COMPLETED',
      invoiceId: updated.id,
      eventId: updated.eventId,
    };
  }

  await prisma.eventInvoicePayment.update({
    where: { invoiceId: invoice.id },
    data: {
      status: verifyData.result.status === 'REFUNDED'
        ? EventInvoicePaymentStatus.REFUNDED
        : EventInvoicePaymentStatus.FAILED,
    },
  });

  return {
    verified: false,
    status: verifyData.result.status,
    invoiceId: invoice.id,
  };
}

export async function getEventInvoicePaymentStatus(
  invoiceId: string,
  requesterUserId: string,
  requesterRole: string
) {
  const invoice = await prisma.eventInvoice.findUnique({
    where: { id: invoiceId },
    include: {
      payment: true,
      event: {
        select: {
          id: true,
          name: true,
          eventDate: true,
        },
      },
      quote: {
        select: {
          id: true,
          quoteNumber: true,
        },
      },
    },
  });

  if (!invoice) {
    throw new Error('Invoice not found');
  }

  ensureRequesterCanAccessInvoice(invoice, requesterUserId, requesterRole);

  return transformInvoice(invoice);
}

export async function getMyEventInvoices(userId: string, page = 1, limit = 20) {
  const skip = (page - 1) * limit;

  const [invoices, total] = await Promise.all([
    prisma.eventInvoice.findMany({
      where: { userId },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        event: {
          select: {
            id: true,
            name: true,
            eventDate: true,
          },
        },
        quote: {
          select: {
            id: true,
            quoteNumber: true,
          },
        },
        payment: true,
      },
    }),
    prisma.eventInvoice.count({ where: { userId } }),
  ]);

  return {
    invoices: invoices.map(transformInvoice),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

function transformInvoice(invoice: any) {
  return {
    ...invoice,
    status: withOverdueStatus(invoice),
    subtotal: Number(invoice.subtotal),
    serviceFee: Number(invoice.serviceFee),
    deliveryFee: Number(invoice.deliveryFee),
    tax: Number(invoice.tax),
    discount: Number(invoice.discount),
    totalAmount: Number(invoice.totalAmount),
    payment: invoice.payment
      ? {
          ...invoice.payment,
          amount: Number(invoice.payment.amount),
        }
      : null,
  };
}
