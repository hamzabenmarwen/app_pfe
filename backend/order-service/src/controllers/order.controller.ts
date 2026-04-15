import { Response } from 'express';
import * as orderService from '../services/order.service';
import { emitRealtimeEvent } from '../services/realtime.service';
import { notifyAdminNewOrder } from '../services/notification.service';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { OrderStatus } from '@prisma/client';

// Helper: emit order status change event to the owner and admins
function notifyOrderChange(eventName: string, order: any, extra?: Record<string, any>) {
  void emitRealtimeEvent({
    event: eventName,
    data: { orderId: order.id, orderNumber: order.orderNumber, status: order.status, userId: order.userId, ...extra },
    rooms: order.userId ? [`user:${order.userId}`] : [],
    broadcastToAdmins: true,
  });
}

export async function createOrder(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const order = await orderService.createOrder(req.user.userId, {
      ...req.body,
      deliveryDate: new Date(req.body.deliveryDate),
      paymentMethod: req.body.paymentMethod,
    });

    res.status(201).json({
      success: true,
      data: order,
      message: 'Order created successfully',
    });

    notifyOrderChange('order.created', order, { totalAmount: order.totalAmount });

    // Non-blocking admin email notification
    const itemCount = (order.items || []).reduce(
      (sum: number, item: any) => sum + Number(item.quantity || 0),
      0
    );
    notifyAdminNewOrder({
      orderNumber: order.orderNumber,
      totalAmount: order.totalAmount,
      deliveryDate: new Date(order.deliveryDate).toLocaleDateString('fr-FR'),
      itemCount,
    });
  } catch (error: any) {
    console.error('Create order error:', error.message);
    res.status(400).json({ success: false, error: error.message || 'Failed to create order' });
  }
}

export async function getMyOrders(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 100);
    const status = req.query.status as OrderStatus | undefined;

    const result = await orderService.getUserOrders(req.user.userId, page, limit, status);

    res.json({
      success: true,
      data: result.orders,
      pagination: result.pagination,
    });
  } catch (error: any) {
    console.error('Get orders error:', error.message);
    res.status(400).json({ success: false, error: 'Failed to retrieve orders' });
  }
}

export async function getAllOrders(req: AuthenticatedRequest, res: Response) {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 100);
    const status = req.query.status as OrderStatus | undefined;
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

    const result = await orderService.getAllOrders(page, limit, status, startDate, endDate);

    res.json({
      success: true,
      data: result.orders,
      pagination: result.pagination,
    });
  } catch (error: any) {
    console.error('Get all orders error:', error.message);
    res.status(400).json({ success: false, error: 'Failed to retrieve orders' });
  }
}

export async function getOrderById(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const userId = req.user.role === 'ADMIN' ? undefined : req.user.userId;
    const order = await orderService.getOrderById(req.params.id, userId);

    res.json({
      success: true,
      data: order,
    });
  } catch (error: any) {
    res.status(404).json({ success: false, error: error.message });
  }
}

export async function updateOrderStatus(req: AuthenticatedRequest, res: Response) {
  try {
    const { status } = req.body;
    const order = await orderService.updateOrderStatus(req.params.id, status);

    res.json({
      success: true,
      data: order,
      message: `Order status updated to ${status}`,
    });

    notifyOrderChange('order.status.updated', order, { updatedAt: new Date().toISOString() });
  } catch (error: any) {
    console.error('Update status error:', error.message);
    res.status(400).json({ success: false, error: 'Failed to update order status' });
  }
}

export async function cancelOrder(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const userId = req.user.role === 'ADMIN' ? undefined : req.user.userId;
    const order = await orderService.cancelOrder(req.params.id, userId);

    res.json({
      success: true,
      data: order,
      message: 'Order cancelled successfully',
    });

    notifyOrderChange('order.status.updated', order, { updatedAt: new Date().toISOString() });
  } catch (error: any) {
    console.error('Cancel order error:', error.message);
    res.status(400).json({ success: false, error: 'Failed to cancel order' });
  }
}

export async function getOrderStats(req: AuthenticatedRequest, res: Response) {
  try {
    const stats = await orderService.getOrderStats();

    res.json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
}
