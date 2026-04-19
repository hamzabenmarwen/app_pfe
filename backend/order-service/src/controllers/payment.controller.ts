import { Request, Response } from 'express';
import * as paymentService from '../services/payment.service';
import * as flouciService from '../services/flouci.service';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

export async function createCashPayment(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const { orderId } = req.body;
    const result = await paymentService.createCashPayment(orderId, req.user.userId, req.user.role);

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
}


export async function markPaymentCompleted(req: AuthenticatedRequest, res: Response) {
  try {
    const result = await paymentService.markPaymentCompleted(req.params.orderId);
    res.json({ success: true, ...result });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
}

export async function getPaymentStatus(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const payment = await paymentService.getPaymentByOrderId(req.params.orderId);

    if (!payment) {
      res.status(404).json({ success: false, error: 'Payment not found' });
      return;
    }

    if (req.user.role !== 'ADMIN' && payment.invoice?.order?.userId !== req.user.userId) {
      res.status(403).json({ success: false, error: 'Access denied' });
      return;
    }

    res.json({
      success: true,
      data: payment,
    });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
}

export async function refundPayment(req: AuthenticatedRequest, res: Response) {
  try {
    const result = await paymentService.refundPayment(req.params.orderId);

    res.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
}

export async function initiateFlouci(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const { orderId } = req.body;
    const result = await flouciService.initiateFlouciPayment(orderId, req.user.userId);

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
}

export async function verifyFlouci(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const { paymentId } = req.params;
    const result = await flouciService.verifyFlouciPayment(
      paymentId,
      req.user.userId,
      req.user.role
    );

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
}
