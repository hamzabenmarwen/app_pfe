import prisma from '../config/database';
import { OrderStatus, PaymentMethod, PaymentStatus, Prisma } from '@prisma/client';
import crypto from 'crypto';

const ORDER_MIN_LEAD_HOURS = Number(process.env.ORDER_MIN_LEAD_HOURS || 48);
const ORDER_MIN_AMOUNT_DT = Number(process.env.ORDER_MIN_AMOUNT_DT || 30);
const ORDER_DELIVERY_FEE_DT = Number(process.env.ORDER_DELIVERY_FEE_DT || 5);
const ORDER_TAX_RATE = Number(process.env.ORDER_TAX_RATE || 0.19);

type CatalogPlatSnapshot = {
  id: string;
  name: string;
  price: number;
  isAvailable: boolean;
};

// Generate unique order number using crypto for collision resistance
function generateOrderNumber(): string {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const random = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `ORD-${year}${month}${day}-${random}`;
}

function generateInvoiceNumber(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const random = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `INV-${year}${month}-${random}`;
}

async function fetchPlatSnapshot(platId: string): Promise<CatalogPlatSnapshot> {
  const catalogServiceUrl = process.env.CATALOG_SERVICE_URL || 'http://localhost:3002';

  let response: Response;
  try {
    response = await fetch(`${catalogServiceUrl}/api/plats/${platId}`);
  } catch {
    throw new Error('Catalog service unavailable');
  }

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(`Plat not found: ${platId}`);
    }
    throw new Error('Catalog service unavailable');
  }

  const payload = (await response.json()) as { data?: any };
  const plat = payload?.data;

  if (!plat?.id || !plat?.name) {
    throw new Error(`Invalid catalog response for plat: ${platId}`);
  }

  const price = Number(plat.price);
  if (!Number.isFinite(price) || price <= 0) {
    throw new Error(`Invalid price for plat: ${plat.name}`);
  }

  if (!plat.isAvailable) {
    throw new Error(`Plat is not available: ${plat.name}`);
  }

  return {
    id: plat.id,
    name: plat.name,
    price,
    isAvailable: Boolean(plat.isAvailable),
  };
}

export interface DeliveryAddress {
  street: string;
  city: string;
  zipCode: string;
  country: string;
}

export interface CreateOrderItemData {
  platId: string;
  quantity: number;
  platName?: string;
  unitPrice?: number;
  notes?: string;
}

export interface CreateOrderData {
  items: CreateOrderItemData[];
  deliveryAddress: DeliveryAddress;
  deliveryDate: Date;
  deliverySlot?: string;
  notes?: string;
  paymentMethod?: 'CASH' | 'FLOUCI';
}

export async function createOrder(userId: string, data: CreateOrderData) {
  if (!Array.isArray(data.items) || data.items.length === 0) {
    throw new Error('At least one order item is required');
  }

  if (!data.deliveryAddress) {
    throw new Error('Delivery address is required');
  }

  const normalizedDeliveryAddress = {
    street: String(data.deliveryAddress.street || '').trim(),
    city: String(data.deliveryAddress.city || '').trim(),
    zipCode: String(data.deliveryAddress.zipCode || '').trim(),
    country: String(data.deliveryAddress.country || 'Tunisie').trim() || 'Tunisie',
  };

  if (!normalizedDeliveryAddress.street || !normalizedDeliveryAddress.city || !normalizedDeliveryAddress.zipCode) {
    throw new Error('Delivery address is incomplete');
  }

  if (!(data.deliveryDate instanceof Date) || Number.isNaN(data.deliveryDate.getTime())) {
    throw new Error('Invalid delivery date');
  }

  const minimumDeliveryDate = new Date(Date.now() + ORDER_MIN_LEAD_HOURS * 60 * 60 * 1000);
  if (data.deliveryDate.getTime() < minimumDeliveryDate.getTime()) {
    throw new Error(`Orders require at least ${ORDER_MIN_LEAD_HOURS} hours lead time`);
  }

  const normalizedItems = data.items.map((item) => {
    const quantity = Number(item.quantity);
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new Error(`Invalid quantity for plat: ${item.platId}`);
    }

    return {
      platId: item.platId,
      quantity,
      notes: item.notes,
    };
  });

  const uniquePlatIds = [...new Set(normalizedItems.map((item) => item.platId))];
  const platSnapshots = await Promise.all(uniquePlatIds.map((platId) => fetchPlatSnapshot(platId)));
  const platMap = new Map(platSnapshots.map((plat) => [plat.id, plat]));

  const resolvedItems = normalizedItems.map((item) => {
    const plat = platMap.get(item.platId);
    if (!plat) {
      throw new Error(`Plat not found: ${item.platId}`);
    }

    return {
      platId: item.platId,
      platName: plat.name,
      quantity: item.quantity,
      unitPrice: plat.price,
      notes: item.notes,
    };
  });

  const subtotal = resolvedItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);

  if (subtotal < ORDER_MIN_AMOUNT_DT) {
    throw new Error(`Minimum order amount is ${ORDER_MIN_AMOUNT_DT} DT`);
  }

  const deliveryFee = ORDER_DELIVERY_FEE_DT;
  const tax = subtotal * ORDER_TAX_RATE;
  const totalAmount = subtotal + deliveryFee + tax;

  const order = await prisma.order.create({
    data: {
      userId,
      orderNumber: generateOrderNumber(),
      subtotal: new Prisma.Decimal(subtotal),
      deliveryFee: new Prisma.Decimal(deliveryFee),
      tax: new Prisma.Decimal(tax),
      totalAmount: new Prisma.Decimal(totalAmount),
      deliveryAddress: normalizedDeliveryAddress as any,
      deliveryDate: data.deliveryDate,
      deliverySlot: data.deliverySlot,
      notes: data.notes,
      items: {
        create: resolvedItems.map((item) => ({
          platId: item.platId,
          platName: item.platName,
          quantity: item.quantity,
          unitPrice: new Prisma.Decimal(item.unitPrice),
          notes: item.notes,
        })),
      },
      invoice: {
        create: {
          invoiceNumber: generateInvoiceNumber(),
          amount: new Prisma.Decimal(totalAmount),
          taxAmount: new Prisma.Decimal(tax),
          ...(data.paymentMethod === 'CASH' ? {
            payment: {
              create: {
                amount: new Prisma.Decimal(totalAmount),
                method: PaymentMethod.CASH,
                status: PaymentStatus.PENDING,
              },
            },
          } : {}),
        },
      },
    },
    include: {
      items: true,
      invoice: {
        include: {
          payment: true,
        },
      },
    },
  });

  return transformOrder(order);
}

export async function getOrderById(orderId: string, userId?: string) {
  const where: Prisma.OrderWhereInput = { id: orderId };
  if (userId) {
    where.userId = userId;
  }

  const order = await prisma.order.findFirst({
    where,
    include: {
      items: true,
      invoice: {
        include: {
          payment: true,
        },
      },
    },
  });

  if (!order) {
    throw new Error('Order not found');
  }

  return transformOrder(order);
}

export async function getUserOrders(
  userId: string,
  page = 1,
  limit = 10,
  status?: OrderStatus
) {
  const skip = (page - 1) * limit;
  const where: Prisma.OrderWhereInput = { userId };
  
  if (status) {
    where.status = status;
  }

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        items: true,
        invoice: {
          include: { payment: true },
        },
      },
    }),
    prisma.order.count({ where }),
  ]);

  return {
    orders: orders.map(transformOrder),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getAllOrders(
  page = 1,
  limit = 10,
  status?: OrderStatus,
  startDate?: Date,
  endDate?: Date
) {
  const skip = (page - 1) * limit;
  const where: Prisma.OrderWhereInput = {};

  if (status) {
    where.status = status;
  }

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = startDate;
    if (endDate) where.createdAt.lte = endDate;
  }

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        items: true,
        invoice: {
          include: { payment: true },
        },
      },
    }),
    prisma.order.count({ where }),
  ]);

  return {
    orders: orders.map(transformOrder),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function updateOrderStatus(orderId: string, status: OrderStatus) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
  });

  if (!order) {
    throw new Error('Order not found');
  }

  // Validate status transition
  const validTransitions: Record<OrderStatus, OrderStatus[]> = {
    PENDING: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
    CONFIRMED: [OrderStatus.PREPARING, OrderStatus.CANCELLED],
    PREPARING: [OrderStatus.READY, OrderStatus.CANCELLED],
    READY: [OrderStatus.DELIVERING, OrderStatus.CANCELLED],
    DELIVERING: [OrderStatus.DELIVERED],
    DELIVERED: [],
    CANCELLED: [],
  };

  if (!validTransitions[order.status].includes(status)) {
    throw new Error(`Cannot transition from ${order.status} to ${status}`);
  }

  const updated = await prisma.order.update({
    where: { id: orderId },
    data: { status },
    include: {
      items: true,
      invoice: {
        include: { payment: true },
      },
    },
  });

  return transformOrder(updated);
}

export async function cancelOrder(orderId: string, userId?: string) {
  const where: Prisma.OrderWhereInput = { id: orderId };
  if (userId) {
    where.userId = userId;
  }

  const order = await prisma.order.findFirst({ where });

  if (!order) {
    throw new Error('Order not found');
  }

  // Only pending or confirmed orders can be cancelled
  if (order.status !== OrderStatus.PENDING && order.status !== OrderStatus.CONFIRMED) {
    throw new Error('Order cannot be cancelled');
  }

  const updated = await prisma.order.update({
    where: { id: orderId },
    data: { status: OrderStatus.CANCELLED },
    include: {
      items: true,
    },
  });

  return transformOrder(updated);
}

export async function getOrderStats() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  const [
    totalOrders,
    todayOrders,
    monthOrders,
    pendingOrders,
    deliveredOrders,
    todayRevenue,
    totalRevenue,
    monthRevenue,
    topPlats,
    avgProcessingHoursResult,
  ] = await Promise.all([
    prisma.order.count(),
    prisma.order.count({
      where: { createdAt: { gte: today } },
    }),
    prisma.order.count({
      where: { createdAt: { gte: thisMonth } },
    }),
    prisma.order.count({
      where: { status: OrderStatus.PENDING },
    }),
    prisma.order.count({
      where: { status: OrderStatus.DELIVERED },
    }),
    prisma.order.aggregate({
      _sum: { totalAmount: true },
      where: {
        createdAt: { gte: today },
        status: {
          in: [
            OrderStatus.CONFIRMED,
            OrderStatus.PREPARING,
            OrderStatus.READY,
            OrderStatus.DELIVERING,
            OrderStatus.DELIVERED,
          ],
        },
      },
    }),
    prisma.order.aggregate({
      _sum: { totalAmount: true },
      where: { status: OrderStatus.DELIVERED },
    }),
    prisma.order.aggregate({
      _sum: { totalAmount: true },
      where: {
        status: OrderStatus.DELIVERED,
        createdAt: { gte: thisMonth },
      },
    }),
    prisma.$queryRaw<Array<{ platId: string; platName: string; quantitySold: number; revenue: unknown }>>(
      Prisma.sql`
        SELECT
          oi.plat_id AS "platId",
          oi.plat_name AS "platName",
          SUM(oi.quantity)::int AS "quantitySold",
          SUM((oi.quantity * oi.unit_price)) AS "revenue"
        FROM order_items oi
        INNER JOIN orders o ON o.id = oi.order_id
        WHERE o.status = 'DELIVERED'
        GROUP BY oi.plat_id, oi.plat_name
        ORDER BY "quantitySold" DESC
        LIMIT 5
      `
    ),
    prisma.$queryRaw<Array<{ avgHours: unknown }>>(
      Prisma.sql`
        SELECT AVG(EXTRACT(EPOCH FROM (updated_at - created_at)) / 3600.0) AS "avgHours"
        FROM orders
        WHERE status = 'DELIVERED'
      `
    ),
  ]);

  const totalRevenueValue = Number(totalRevenue._sum.totalAmount || 0);
  const monthRevenueValue = Number(monthRevenue._sum.totalAmount || 0);
  const todayRevenueValue = Number(todayRevenue._sum.totalAmount || 0);
  const averageOrderValue = totalOrders > 0 ? totalRevenueValue / totalOrders : 0;
  const completionRate = totalOrders > 0 ? (deliveredOrders / totalOrders) * 100 : 0;
  const averageProcessingHours = Number(avgProcessingHoursResult?.[0]?.avgHours || 0);

  return {
    totalOrders,
    todayOrders,
    monthOrders,
    pendingOrders,
    deliveredOrders,
    todayRevenue: Number(todayRevenueValue.toFixed(2)),
    totalRevenue: totalRevenueValue,
    monthRevenue: monthRevenueValue,
    averageOrderValue: Number(averageOrderValue.toFixed(2)),
    completionRate: Number(completionRate.toFixed(2)),
    averageProcessingHours: Number(averageProcessingHours.toFixed(2)),
    topPlats: topPlats.map((item) => ({
      platId: item.platId,
      platName: item.platName,
      quantitySold: Number(item.quantitySold || 0),
      revenue: Number(item.revenue || 0),
    })),
  };
}

function transformOrder(order: any) {
  return {
    ...order,
    subtotal: Number(order.subtotal),
    deliveryFee: Number(order.deliveryFee),
    tax: Number(order.tax),
    totalAmount: Number(order.totalAmount),
    items: order.items?.map((item: any) => ({
      ...item,
      unitPrice: Number(item.unitPrice),
    })),
    invoice: order.invoice
      ? {
          ...order.invoice,
          amount: Number(order.invoice.amount),
          taxAmount: Number(order.invoice.taxAmount),
          payment: order.invoice.payment
            ? {
                ...order.invoice.payment,
                amount: Number(order.invoice.payment.amount),
              }
            : null,
        }
      : null,
  };
}
