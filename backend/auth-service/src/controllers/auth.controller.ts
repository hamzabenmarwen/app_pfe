import { Request, Response } from 'express';
import * as authService from '../services/auth.service';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

export async function register(req: Request, res: Response) {
  try {
    const result = await authService.register(req.body);
    res.status(201).json({
      success: true,
      data: result,
      message: 'Registration successful',
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
}

export async function login(req: Request, res: Response) {
  try {
    const result = await authService.login(req.body);
    res.json({
      success: true,
      data: result,
      message: 'Login successful',
    });
  } catch (error: any) {
    res.status(401).json({
      success: false,
      error: error.message,
    });
  }
}

export async function refreshToken(req: Request, res: Response) {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      res.status(400).json({
        success: false,
        error: 'Refresh token is required',
      });
      return;
    }

    const tokens = await authService.refreshAccessToken(refreshToken);
    res.json({
      success: true,
      data: tokens,
    });
  } catch (error: any) {
    res.status(401).json({
      success: false,
      error: error.message,
    });
  }
}

export async function logout(req: Request, res: Response) {
  try {
    const { refreshToken } = req.body;
    
    if (refreshToken) {
      await authService.logout(refreshToken);
    }

    res.json({
      success: true,
      message: 'Logout successful',
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
}

export async function logoutAll(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
      return;
    }

    await authService.logoutAll(req.user.userId);
    res.json({
      success: true,
      message: 'Logged out from all devices',
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
}

export async function getMe(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
      return;
    }

    const { getUserById } = await import('../services/user.service');
    const user = await getUserById(req.user.userId);
    
    res.json({
      success: true,
      data: user,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
}

// Password Reset
export async function forgotPassword(req: Request, res: Response) {
  try {
    const { email } = req.body;
    
    if (!email) {
      res.status(400).json({
        success: false,
        error: 'Email is required',
      });
      return;
    }

    await authService.requestPasswordReset(email);
    
    // Always return success to prevent email enumeration
    res.json({
      success: true,
      message: 'If an account exists with this email, you will receive a password reset link',
    });
  } catch (error: any) {
    // Still return success to prevent enumeration
    res.json({
      success: true,
      message: 'If an account exists with this email, you will receive a password reset link',
    });
  }
}

export async function resetPassword(req: Request, res: Response) {
  try {
    const { token, password } = req.body;
    
    if (!token || !password) {
      res.status(400).json({
        success: false,
        error: 'Token and password are required',
      });
      return;
    }

    if (password.length < 8) {
      res.status(400).json({
        success: false,
        error: 'Password must be at least 8 characters',
      });
      return;
    }

    await authService.resetPassword(token, password);
    
    res.json({
      success: true,
      message: 'Password reset successful. You can now login with your new password.',
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
}

// Email Verification
export async function verifyEmail(req: Request, res: Response) {
  try {
    const { token } = req.query;
    
    if (!token || typeof token !== 'string') {
      res.status(400).json({
        success: false,
        error: 'Verification token is required',
      });
      return;
    }

    await authService.verifyEmail(token);
    
    res.json({
      success: true,
      message: 'Email verified successfully',
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
}

export async function resendVerificationEmail(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
      return;
    }

    await authService.resendVerificationEmail(req.user.userId);
    
    res.json({
      success: true,
      message: 'Verification email sent',
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
}

// OAuth2 Google
export async function googleAuth(req: Request, res: Response) {
  try {
    const { credential } = req.body;
    
    if (!credential) {
      res.status(400).json({
        success: false,
        error: 'Google credential is required',
      });
      return;
    }

    // Verify Google token
    const { OAuth2Client } = await import('google-auth-library');
    const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
    
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    
    const payload = ticket.getPayload();
    
    if (!payload || !payload.email) {
      res.status(400).json({
        success: false,
        error: 'Invalid Google token',
      });
      return;
    }

    const result = await authService.findOrCreateOAuthUser({
      email: payload.email,
      firstName: payload.given_name || 'User',
      lastName: payload.family_name || '',
      provider: 'google',
      providerId: payload.sub,
    });

    res.json({
      success: true,
      data: result,
      message: 'Google login successful',
    });
  } catch (error: any) {
    console.error('Google auth error:', error);
    res.status(400).json({
      success: false,
      error: 'Google authentication failed',
    });
  }
}

export async function exportMyData(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const { exportUserData } = await import('../services/user.service');
    const data = await exportUserData(req.user.userId);

    res.json({
      success: true,
      data,
      message: 'Export des données personnelles généré',
    });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
}

export async function deleteMyAccount(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const { anonymizeUserData } = await import('../services/user.service');
    const result = await anonymizeUserData(req.user.userId);

    res.json({
      success: true,
      data: result,
      message: 'Compte supprimé (anonymisé) avec succès',
    });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
}
