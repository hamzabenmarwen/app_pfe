import prisma from '../config/database';
import { OrderStatus, PaymentMethod, PaymentStatus, Prisma } from '@prisma/client';
import crypto from 'crypto';

const ORDER_MIN_LEAD_HOURS = Number(process.env.ORDER_MIN_LEAD_HOURS || 48);
const ORDER_MIN_AMOUNT_DT = Number(process.env.ORDER_MIN_AMOUNT_DT || 30);
const ORDER_DELIVERY_FEE_DT = Number(process.env.ORDER_DELIVERY_FEE_DT || 5);
const ORDER_TAX_RATE = Number(process.env.ORDER_TAX_RATE || 0.19);
const ORDER_MAX_ORDERS_PER_DAY = Number(process.env.ORDER_MAX_ORDERS_PER_DAY || 0);
const ORDER_MAX_ORDERS_PER_SLOT = Number(process.env.ORDER_MAX_ORDERS_PER_SLOT || 0);
const ORDER_ENFORCE_INGREDIENT_STOCK = (process.env.ORDER_ENFORCE_INGREDIENT_STOCK || 'true') === 'true';
const CATALOG_INTERNAL_SERVICE_TOKEN = process.env.INTERNAL_SERVICE_TOKEN || '';

type CatalogPlatSnapshot = {
  id: string;
  name: string;
  price: number;
  isAvailable: boolean;
};

type CatalogStockReservationResponse = {
  success: boolean;
  data?: {
    id: string;
    reference: string;
    status: 'RESERVED' | 'CONSUMED' | 'RELEASED';
  };
  error?: string;
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

async function callCatalogInternal<T>(path: string, init: RequestInit): Promise<T> {
  const catalogServiceUrl = process.env.CATALOG_SERVICE_URL || 'http://localhost:3002';

  const headers = new Headers(init.headers || {});
  headers.set('Content-Type', 'application/json');
  if (CATALOG_INTERNAL_SERVICE_TOKEN) {
    headers.set('x-internal-service-token', CATALOG_INTERNAL_SERVICE_TOKEN);
  }

  const response = await fetch(`${catalogServiceUrl}${path}`, {
    ...init,
    headers,
  });

  const payload = (await response.json().catch(() => null)) as { success?: boolean; error?: string; data?: T } | null;
  if (!response.ok || !payload?.success) {
    throw new Error(payload?.error || `Catalog stock operation failed (${response.status})`);
  }

  return payload.data as T;
}

async function reserveOrderStock(reference: string, items: Array<{ platId: string; quantity: number }>) {
  return callCatalogInternal<CatalogStockReservationResponse['data']>('/api/ingredients/internal/reservations', {
    method: 'POST',
    body: JSON.stringify({
      reference,
      reason: 'ORDER_CREATED',
      items,
    }),
  });
}

async function releaseOrderStockReservation(reference: string) {
  return callCatalogInternal<CatalogStockReservationResponse['data']>(
    `/api/ingredients/internal/reservations/${reference}/release`,
    {
      method: 'POST',
    }
  );
}

async function consumeOrderStockReservation(reference: string) {
  return callCatalogInternal<CatalogStockReservationResponse['data']>(
    `/api/ingredients/internal/reservations/${reference}/consume`,
    {
      method: 'POST',
    }
  );
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

async function assertDeliveryCapacity(deliveryDate: Date, deliverySlot?: string) {
  const dayStart = new Date(deliveryDate);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(deliveryDate);
  dayEnd.setHours(23, 59, 59, 999);

  const where: Prisma.OrderWhereInput = {
    status: {
      in: [
        OrderStatus.PENDING,
        OrderStatus.CONFIRMED,
        OrderStatus.PREPARING,
        OrderStatus.READY,
        OrderStatus.DELIVERING,
      ],
    },
    deliveryDate: {
      gte: dayStart,
      lte: dayEnd,
    },
  };

  if (ORDER_MAX_ORDERS_PER_DAY > 0) {
    const currentDayOrders = await prisma.order.count({ where });
    if (currentDayOrders >= ORDER_MAX_ORDERS_PER_DAY) {
      throw new Error('Delivery capacity reached for this date. Please choose another date.');
    }
  }

  if (ORDER_MAX_ORDERS_PER_SLOT > 0 && deliverySlot) {
    const currentSlotOrders = await prisma.order.count({
      where: {
        ...where,
        deliverySlot,
      },
    });

    if (currentSlotOrders >= ORDER_MAX_ORDERS_PER_SLOT) {
      throw new Error('Delivery slot is full. Please choose another slot.');
    }
  }
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

  await assertDeliveryCapacity(data.deliveryDate, data.deliverySlot);

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

  const orderNumber = generateOrderNumber();
  let stockReserved = false;

  try {
    await reserveOrderStock(
      orderNumber,
      normalizedItems.map((item) => ({
        platId: item.platId,
        quantity: item.quantity,
      }))
    );
    stockReserved = true;
  } catch (error: any) {
    if (ORDER_ENFORCE_INGREDIENT_STOCK) {
      throw new Error(`Unable to reserve ingredient stock: ${error.message}`);
    }

    console.warn(`[ORDER_STOCK_WARN] Reservation skipped for ${orderNumber}: ${error.message}`);
  }

  try {
    const order = await prisma.order.create({
      data: {
        userId,
        orderNumber,
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
            ...(data.paymentMethod === 'CASH'
              ? {
                  payment: {
                    create: {
                      amount: new Prisma.Decimal(totalAmount),
                      method: PaymentMethod.CASH,
                      status: PaymentStatus.PENDING,
                    },
                  },
                }
              : {}),
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
  } catch (error) {
    if (stockReserved) {
      try {
        await releaseOrderStockReservation(orderNumber);
      } catch (releaseError: any) {
        console.error(
          `[ORDER_STOCK_ERROR] Failed to release reservation ${orderNumber} after order create failure: ${releaseError.message}`
        );
      }
    }

    throw error;
  }
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

  const updated = await prisma.$transaction(async (tx) => {
    const updatedOrder = await tx.order.update({
      where: { id: orderId },
      data: { status },
      include: {
        items: true,
        invoice: {
          include: { payment: true },
        },
      },
    });

    if (status === OrderStatus.DELIVERED && updatedOrder.invoice) {
      const payment = updatedOrder.invoice.payment;

      if (!payment) {
        await tx.payment.create({
          data: {
            invoiceId: updatedOrder.invoice.id,
            amount: updatedOrder.invoice.amount,
            method: PaymentMethod.CASH,
            status: PaymentStatus.COMPLETED,
            paidAt: new Date(),
          },
        });
      } else if (payment.status !== PaymentStatus.COMPLETED && payment.status !== PaymentStatus.REFUNDED) {
        await tx.payment.update({
          where: { id: payment.id },
          data: {
            status: PaymentStatus.COMPLETED,
            paidAt: payment.paidAt || new Date(),
          },
        });
      }
    }

    const refreshedOrder = await tx.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
        invoice: {
          include: { payment: true },
        },
      },
    });

    if (!refreshedOrder) {
      throw new Error('Order not found after update');
    }

    return refreshedOrder;
  });

  if (status === OrderStatus.DELIVERED) {
    try {
      await consumeOrderStockReservation(updated.orderNumber);
    } catch (error: any) {
      console.error(
        `[ORDER_STOCK_ERROR] Failed to consume reservation ${updated.orderNumber} on delivery: ${error.message}`
      );
    }
  }

  if (status === OrderStatus.CANCELLED) {
    try {
      await releaseOrderStockReservation(updated.orderNumber);
    } catch (error: any) {
      console.error(
        `[ORDER_STOCK_ERROR] Failed to release reservation ${updated.orderNumber} on cancellation: ${error.message}`
      );
    }
  }

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

  try {
    await releaseOrderStockReservation(order.orderNumber);
  } catch (error: any) {
    console.error(
      `[ORDER_STOCK_ERROR] Failed to release reservation ${order.orderNumber} after cancelOrder: ${error.message}`
    );
  }

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
    upcomingOrders,
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
    prisma.order.findMany({
      where: {
        status: {
          in: [
            OrderStatus.PENDING,
            OrderStatus.CONFIRMED,
            OrderStatus.PREPARING,
            OrderStatus.READY,
            OrderStatus.DELIVERING,
          ],
        },
        deliveryDate: { gte: today },
      },
      select: {
        deliveryDate: true,
        deliverySlot: true,
      },
    }),
  ]);

  const totalRevenueValue = Number(totalRevenue._sum.totalAmount || 0);
  const monthRevenueValue = Number(monthRevenue._sum.totalAmount || 0);
  const todayRevenueValue = Number(todayRevenue._sum.totalAmount || 0);
  const averageOrderValue = totalOrders > 0 ? totalRevenueValue / totalOrders : 0;
  const completionRate = totalOrders > 0 ? (deliveredOrders / totalOrders) * 100 : 0;
  const averageProcessingHours = Number(avgProcessingHoursResult?.[0]?.avgHours || 0);
  const upcomingByDateSlot = upcomingOrders.reduce<Record<string, number>>((acc, order) => {
    const dateKey = order.deliveryDate.toISOString().slice(0, 10);
    const slotKey = order.deliverySlot || 'NO_SLOT';
    const key = `${dateKey}|${slotKey}`;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const capacityUsage = Object.entries(upcomingByDateSlot)
    .map(([key, count]) => {
      const [date, slot] = key.split('|');
      return {
        date,
        slot,
        orders: count,
        slotCapacity: ORDER_MAX_ORDERS_PER_SLOT > 0 ? ORDER_MAX_ORDERS_PER_SLOT : null,
        dayCapacity: ORDER_MAX_ORDERS_PER_DAY > 0 ? ORDER_MAX_ORDERS_PER_DAY : null,
      };
    })
    .sort((a, b) => {
      if (a.date === b.date) {
        return (a.slot || '').localeCompare(b.slot || '');
      }
      return a.date.localeCompare(b.date);
    });

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
    capacityUsage,
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
