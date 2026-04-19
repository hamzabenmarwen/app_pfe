import { Request, Response } from 'express';
import * as userService from '../services/user.service';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

export async function getAllUsers(req: Request, res: Response) {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    const result = await userService.getAllUsers(page, limit);
    
    res.json({
      success: true,
      data: result.users,
      pagination: result.pagination,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
}

export async function getUserById(req: Request, res: Response) {
  try {
    const user = await userService.getUserById(req.params.id);
    res.json({
      success: true,
      data: user,
    });
  } catch (error: any) {
    res.status(404).json({
      success: false,
      error: error.message,
    });
  }
}

export async function updateProfile(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
      return;
    }

    const user = await userService.updateUser(req.user.userId, req.body);
    res.json({
      success: true,
      data: user,
      message: 'Profile updated successfully',
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
}

export async function changePassword(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
      return;
    }

    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      res.status(400).json({
        success: false,
        error: 'Current password and new password are required',
      });
      return;
    }

    await userService.changePassword(req.user.userId, currentPassword, newPassword);
    res.json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
}

export async function toggleUserStatus(req: Request, res: Response) {
  try {
    const user = await userService.toggleUserStatus(req.params.id);
    res.json({
      success: true,
      data: user,
      message: `User ${user.isActive ? 'activated' : 'deactivated'} successfully`,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
}

export async function updateUserRole(req: Request, res: Response) {
  try {
    const { role } = req.body;
    if (!role || !['CLIENT', 'ADMIN'].includes(role)) {
      res.status(400).json({
        success: false,
        error: 'Invalid role. Must be CLIENT or ADMIN',
      });
      return;
    }
    const user = await userService.updateUser(req.params.id, { role: role as 'ADMIN' | 'CLIENT' });
    res.json({
      success: true,
      data: user,
      message: `User role updated to ${role} successfully`,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
}

export async function deleteUser(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
      return;
    }

    if (req.user.userId === req.params.id) {
      res.status(400).json({
        success: false,
        error: 'Vous ne pouvez pas supprimer votre propre compte admin',
      });
      return;
    }

    const mode = req.query.mode === 'delete' ? 'delete' : 'anonymize';
    const result = await userService.deleteUserByMode(req.params.id, mode);

    res.json({
      success: true,
      data: result,
      message: mode === 'delete' ? 'Compte supprimé définitivement' : 'Compte anonymisé avec succès',
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
}
