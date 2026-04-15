import prisma from '../config/database';
import { OrderStatus, PaymentMethod, PaymentStatus } from '@prisma/client';
import crypto from 'crypto';

async function applyOrderStatusAfterSuccessfulPayment(orderId: string, currentStatus: OrderStatus) {
  if (currentStatus === OrderStatus.CANCELLED) {
    throw new Error('Cannot complete payment for a cancelled order');
  }

  if (currentStatus === OrderStatus.PENDING) {
    await prisma.order.update({
      where: { id: orderId },
      data: { status: OrderStatus.CONFIRMED },
    });
  }
}

export async function createCashPayment(orderId: string, userId: string, role: string = 'CLIENT') {
  const order =
    role === 'ADMIN'
      ? await prisma.order.findUnique({
          where: { id: orderId },
          include: { invoice: true },
        })
      : await prisma.order.findFirst({
          where: { id: orderId, userId },
          include: { invoice: true },
        });

  if (!order) {
    throw new Error('Order not found');
  }

  if (order.status === OrderStatus.CANCELLED) {
    throw new Error('Cannot create payment for a cancelled order');
  }

  let invoice = order.invoice;
  if (!invoice) {
    invoice = await prisma.invoice.create({
      data: {
        orderId: order.id,
        invoiceNumber: generateInvoiceNumber(),
        amount: order.totalAmount,
        taxAmount: order.tax,
      },
    });
  }

  let payment = await prisma.payment.findUnique({
    where: { invoiceId: invoice.id },
  });

  if (payment && payment.status === PaymentStatus.COMPLETED) {
    throw new Error('Order already paid');
  }

  if (payment && payment.status === PaymentStatus.REFUNDED) {
    throw new Error('Order payment has already been refunded');
  }

  if (!payment) {
    payment = await prisma.payment.create({
      data: {
        invoiceId: invoice.id,
        amount: order.totalAmount,
        method: PaymentMethod.CASH,
        status: PaymentStatus.PENDING,
      },
    });
  } else {
    payment = await prisma.payment.update({
      where: { id: payment.id },
      data: {
        method: PaymentMethod.CASH,
        transactionRef: null,
        status: PaymentStatus.PENDING,
      },
    });
  }

  return {
    paymentId: payment.id,
    amount: Number(order.totalAmount),
    status: payment.status,
  };
}


export async function markPaymentCompleted(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      invoice: {
        include: { payment: true },
      },
    },
  });

  if (!order?.invoice?.payment) {
    throw new Error('Payment not found');
  }

  if (order.invoice.payment.status === PaymentStatus.REFUNDED) {
    throw new Error('Cannot complete a refunded payment');
  }

  if (order.invoice.payment.status !== PaymentStatus.COMPLETED) {
    await prisma.payment.update({
      where: { id: order.invoice.payment.id },
      data: {
        status: PaymentStatus.COMPLETED,
        paidAt: new Date(),
      },
    });
  }

  await applyOrderStatusAfterSuccessfulPayment(orderId, order.status);

  return { message: 'Payment marked as completed' };
}

export async function getPaymentByOrderId(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      invoice: {
        include: { payment: true },
      },
    },
  });

  if (!order?.invoice?.payment) {
    return null;
  }

  return {
    ...order.invoice.payment,
    amount: Number(order.invoice.payment.amount),
    invoice: { order: { userId: order.userId } },
  };
}

export async function refundPayment(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      invoice: {
        include: { payment: true },
      },
    },
  });

  if (!order?.invoice?.payment) {
    throw new Error('Payment not found');
  }

  const payment = order.invoice.payment;

  if (payment.status === PaymentStatus.REFUNDED) {
    return { message: 'Payment already refunded' };
  }

  if (payment.status !== PaymentStatus.COMPLETED) {
    throw new Error('Cannot refund unpaid order');
  }

  await prisma.payment.update({
    where: { id: payment.id },
    data: { status: PaymentStatus.REFUNDED },
  });

  return { message: 'Refund initiated' };
}

function generateInvoiceNumber(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const random = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `INV-${year}${month}-${random}`;
}
