import prisma from '../config/database';
import { OrderStatus, PaymentMethod, PaymentStatus } from '@prisma/client';
import crypto from 'crypto';

const FLOUCI_API_URL = 'https://developers.flouci.com/api';
const FLOUCI_APP_TOKEN = process.env.FLOUCI_APP_TOKEN || '';
const FLOUCI_APP_SECRET = process.env.FLOUCI_APP_SECRET || '';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5174';

async function applyOrderStatusAfterSuccessfulPayment(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { status: true },
  });

  if (!order) {
    throw new Error('Commande introuvable');
  }

  const currentStatus = String(order.status);

  if (currentStatus === 'CANCELLED') {
    throw new Error('Cannot complete payment for a cancelled order');
  }

  if (currentStatus === 'PENDING') {
    await prisma.order.update({
      where: { id: orderId },
      data: { status: OrderStatus.CONFIRMED },
    });
  }
}

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

export async function initiateFlouciPayment(orderId: string, userId: string) {
  const order = await prisma.order.findFirst({
    where: { id: orderId, userId },
    include: { invoice: true },
  });

  if (!order) {
    throw new Error('Commande introuvable');
  }

  if (String(order.status) === 'CANCELLED') {
    throw new Error('Impossible de payer une commande annulee');
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

  const existingPayment = await prisma.payment.findUnique({
    where: { invoiceId: invoice.id },
  });

  if (existingPayment && existingPayment.status === PaymentStatus.COMPLETED) {
    throw new Error('Cette commande est deja payee');
  }

  if (existingPayment && existingPayment.status === PaymentStatus.REFUNDED) {
    throw new Error('Cette commande a deja ete remboursee');
  }

  // Amount in millimes (Flouci uses millimes: 1 DT = 1000 millimes)
  const amountInMillimes = Math.round(Number(order.totalAmount) * 1000);

  const response = await fetch(`${FLOUCI_API_URL}/generate_payment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      app_token: FLOUCI_APP_TOKEN,
      app_secret: FLOUCI_APP_SECRET,
      amount: amountInMillimes,
      accept_card: 'true',
      session_timeout_secs: 1800,
      success_link: `${FRONTEND_URL}/dashboard/orders/${orderId}?payment=success`,
      fail_link: `${FRONTEND_URL}/dashboard/orders/${orderId}?payment=failed`,
      developer_tracking_id: orderId,
    }),
  });

  if (!response.ok) {
    throw new Error('Erreur lors de la connexion au service de paiement');
  }

  const data = (await response.json()) as FlouciPaymentResponse;

  if (!data.result?.success) {
    throw new Error('Impossible de creer la session de paiement');
  }

  if (existingPayment) {
    await prisma.payment.update({
      where: { id: existingPayment.id },
      data: {
        method: PaymentMethod.FLOUCI,
        transactionRef: data.result.payment_id,
        status: PaymentStatus.PENDING,
      },
    });
  } else {
    await prisma.payment.create({
      data: {
        invoiceId: invoice.id,
        amount: order.totalAmount,
        method: PaymentMethod.FLOUCI,
        status: PaymentStatus.PENDING,
        transactionRef: data.result.payment_id,
      },
    });
  }

  return {
    paymentUrl: data.result.link,
    paymentId: data.result.payment_id,
    amount: Number(order.totalAmount),
  };
}

export async function verifyFlouciPayment(paymentId: string) {
  const response = await fetch(`${FLOUCI_API_URL}/verify_payment/${paymentId}`, {
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    throw new Error('Erreur lors de la verification du paiement');
  }

  const data = (await response.json()) as FlouciVerifyResponse;

  if (!data.success) {
    return { verified: false, status: 'FAILED' };
  }

  const payment = await prisma.payment.findFirst({
    where: { transactionRef: paymentId },
    include: { invoice: true },
  });

  if (!payment) {
    throw new Error('Paiement introuvable');
  }

  if (payment.status === PaymentStatus.REFUNDED) {
    throw new Error('Ce paiement est deja rembourse');
  }

  if (data.result.status === 'SUCCESS') {
    if (payment.status !== PaymentStatus.COMPLETED) {
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.COMPLETED,
          paidAt: new Date(),
        },
      });
    }

    await applyOrderStatusAfterSuccessfulPayment(payment.invoice.orderId);

    return {
      verified: true,
      status: 'COMPLETED',
      orderId: payment.invoice.orderId,
    };
  }

  return { verified: false, status: data.result.status };
}

function generateInvoiceNumber(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const random = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `INV-${year}${month}-${random}`;
}
