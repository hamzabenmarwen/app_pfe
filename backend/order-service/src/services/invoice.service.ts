import prisma from '../config/database';

export async function getInvoiceByOrderId(orderId: string, userId?: string) {
  const invoice = await prisma.invoice.findUnique({
    where: { orderId },
    include: {
      order: {
        include: { items: true },
      },
      payment: true,
    },
  });

  if (!invoice) {
    throw new Error('Invoice not found');
  }

  // Check ownership if userId provided
  if (userId && invoice.order.userId !== userId) {
    throw new Error('Invoice not found');
  }

  return transformInvoice(invoice);
}

export async function getUserInvoices(userId: string, page = 1, limit = 10) {
  const skip = (page - 1) * limit;

  const [invoices, total] = await Promise.all([
    prisma.invoice.findMany({
      where: {
        order: { userId },
      },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        order: true,
        payment: true,
      },
    }),
    prisma.invoice.count({
      where: { order: { userId } },
    }),
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

export async function getAllInvoices(page = 1, limit = 10) {
  const skip = (page - 1) * limit;

  const [invoices, total] = await Promise.all([
    prisma.invoice.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        order: true,
        payment: true,
      },
    }),
    prisma.invoice.count(),
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
    amount: Number(invoice.amount),
    taxAmount: Number(invoice.taxAmount),
    order: invoice.order
      ? {
          ...invoice.order,
          subtotal: Number(invoice.order.subtotal),
          deliveryFee: Number(invoice.order.deliveryFee),
          tax: Number(invoice.order.tax),
          totalAmount: Number(invoice.order.totalAmount),
          items: invoice.order.items?.map((item: any) => ({
            ...item,
            unitPrice: Number(item.unitPrice),
          })),
        }
      : null,
    payment: invoice.payment
      ? {
          ...invoice.payment,
          amount: Number(invoice.payment.amount),
        }
      : null,
  };
}
