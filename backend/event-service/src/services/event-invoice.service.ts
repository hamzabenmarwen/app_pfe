import prisma from '../config/database';

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
  const dueDate = addDays(issuedAt, 7);

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
      status: 'SENT',
    },
    create: {
      eventId: quote.eventId,
      quoteId: quote.id,
      userId: quote.event.userId,
      invoiceNumber: generateEventInvoiceNumber(),
      status: 'SENT',
      subtotal: quote.subtotal,
      serviceFee: quote.serviceFee,
      deliveryFee: quote.deliveryFee,
      tax: quote.tax,
      discount: quote.discount,
      totalAmount: quote.totalAmount,
      issuedAt,
      dueDate,
    },
  });

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
    subtotal: Number(invoice.subtotal),
    serviceFee: Number(invoice.serviceFee),
    deliveryFee: Number(invoice.deliveryFee),
    tax: Number(invoice.tax),
    discount: Number(invoice.discount),
    totalAmount: Number(invoice.totalAmount),
  };
}
