import { Response } from 'express';
import * as addressService from '../services/address.service';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

export async function createAddress(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const address = await addressService.createAddress(req.user.userId, req.body);
    res.status(201).json({
      success: true,
      data: address,
      message: 'Address created successfully',
    });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
}

export async function getMyAddresses(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const addresses = await addressService.getUserAddresses(req.user.userId);
    res.json({
      success: true,
      data: addresses,
    });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
}

export async function getAddressById(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const address = await addressService.getAddressById(req.params.id, req.user.userId);
    res.json({
      success: true,
      data: address,
    });
  } catch (error: any) {
    res.status(404).json({ success: false, error: error.message });
  }
}

export async function updateAddress(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const address = await addressService.updateAddress(
      req.params.id,
      req.user.userId,
      req.body
    );
    res.json({
      success: true,
      data: address,
      message: 'Address updated successfully',
    });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
}

export async function deleteAddress(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    await addressService.deleteAddress(req.params.id, req.user.userId);
    res.json({
      success: true,
      message: 'Address deleted successfully',
    });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
}

export async function setDefaultAddress(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const address = await addressService.setDefaultAddress(req.params.id, req.user.userId);
    res.json({
      success: true,
      data: address,
      message: 'Default address updated',
    });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
}
