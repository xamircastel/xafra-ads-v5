import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { loggers } from '@xafra/shared/logger';
import { cache } from '@xafra/shared/cache';
import { prisma } from '@xafra/database';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Login with API key
router.post('/login', async (req: Request, res: Response) => {
  const { apikey, password } = req.body;

  try {
    if (!apikey) {
      res.status(400).json({
        error: 'API key is required',
        code: 'MISSING_APIKEY'
      });
      return;
    }

    // Check cache first
    const cacheKey = `auth:login:${apikey}`;
    const cachedAuth = await cache.get(cacheKey);
    
    if (cachedAuth) {
      const authData = JSON.parse(cachedAuth as string);
      
      loggers.auth('login_cached', apikey.substring(0, 8) + '...', authData.customerId, {
        cached: true,
        ip: req.ip
      });

      res.json({
        success: true,
        data: authData
      });
      return;
    }

    // Validate API key
    const authUser = await prisma.authUser.findFirst({
      where: {
        api_key: apikey,
        status: 1
      }
    });

    if (!authUser) {
      res.status(401).json({
        error: 'Invalid API key',
        code: 'INVALID_APIKEY'
      });
      return;
    }

    // Check if expired
    if (authUser.expiration_date && new Date() > authUser.expiration_date) {
      loggers.auth('login_failed', apikey.substring(0, 8) + '...', Number(authUser.customer_id), {
        reason: 'expired',
        ip: req.ip
      });

      res.status(401).json({
        error: 'API key expired',
        code: 'APIKEY_EXPIRED'
      });
      return;
    }

    // Password validation if required
    if (authUser.password && password) {
      const isValidPassword = await validatePassword(password, authUser.password);
      if (!isValidPassword) {
        res.status(401).json({
          error: 'Invalid password',
          code: 'INVALID_PASSWORD'
        });
        return;
      }
    }

    // Get customer info
    const customer = await prisma.customer.findFirst({
      where: {
        id_customer: authUser.customer_id
      }
    });

    // Generate JWT token
    const tokenPayload = {
      userId: authUser.id_auth,
      customerId: authUser.customer_id,
      apikey: apikey,
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
    };

    const token = jwt.sign(tokenPayload, process.env.JWT_SECRET || 'xafra-secret-key');

    const authData = {
      token,
      user: {
        id: authUser.id_auth,
        username: authUser.user_name,
        customerId: authUser.customer_id
      },
      customer: customer ? {
        id: customer.id_customer,
        name: customer.name
      } : null,
      permissions: {
        canManageProducts: true, // Simplified - all customers can manage products
        canViewReports: true,
        canManageUsers: false
      }
    };

    // Update last login
    await prisma.authUser.update({
      where: { id_auth: authUser.id_auth },
      data: {
        last_login: new Date(),
        login_count: authUser.login_count + 1,
        modification_date: new Date()
      }
    });

    // Cache authentication data
    await cache.set(cacheKey, JSON.stringify(authData), 3600); // 1 hour

    loggers.auth('login_success', apikey.substring(0, 8) + '...', Number(authUser.customer_id), {
      userId: authUser.id_auth,
      username: authUser.user_name,
      ip: req.ip
    });

    res.json({
      success: true,
      data: authData
    });

  } catch (error) {
    loggers.error('Login failed', error as Error, {
      apikey: apikey?.substring(0, 8) + '...',
      ip: req.ip
    });

    res.status(500).json({
      error: 'Login failed',
      code: 'LOGIN_ERROR'
    });
  }
});

// Validate token
router.post('/validate', async (req: Request, res: Response) => {
  const { token } = req.body;

  try {
    if (!token) {
      res.status(400).json({
        error: 'Token is required',
        code: 'MISSING_TOKEN'
      });
      return;
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'xafra-secret-key') as any;

    // Check if user still exists and is active
    const authUser = await prisma.authUser.findFirst({
      where: {
        id_auth: decoded.userId,
        status: 1
      }
    });

    if (!authUser) {
      res.status(401).json({
        error: 'Invalid token - user not found or inactive',
        code: 'INVALID_TOKEN'
      });
      return;
    }

    // Check if expired
    if (authUser.expiration_date && new Date() > authUser.expiration_date) {
      res.status(401).json({
        error: 'Token expired',
        code: 'TOKEN_EXPIRED'
      });
      return;
    }

    // Get customer info
    const customer = await prisma.customer.findFirst({
      where: {
        id_customer: authUser.customer_id
      }
    });

    const validationData = {
      valid: true,
      user: {
        id: authUser.id_auth,
        username: authUser.user_name,
        customerId: authUser.customer_id
      },
      customer: customer ? {
        id: customer.id_customer,
        name: customer.name
      } : null
    };

    res.json({
      success: true,
      data: validationData
    });

  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({
        error: 'Invalid token',
        code: 'INVALID_TOKEN'
      });
    } else {
      loggers.error('Token validation failed', error as Error, {
        ip: req.ip
      });

      res.status(500).json({
        error: 'Token validation failed',
        code: 'VALIDATION_ERROR'
      });
    }
  }
});

// Logout
router.post('/logout', async (req: Request, res: Response) => {
  const { token, apikey } = req.body;

  try {
    if (!token && !apikey) {
      res.status(400).json({
        error: 'Token or API key is required',
        code: 'MISSING_AUTH'
      });
      return;
    }

    // If token provided, extract apikey from it
    let logoutApikey = apikey;
    if (token && !apikey) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'xafra-secret-key') as any;
        logoutApikey = decoded.apikey;
      } catch (error) {
        // Token invalid, but we can still proceed
      }
    }

    if (logoutApikey) {
      // Remove from cache
      const cacheKey = `auth:login:${logoutApikey}`;
      await cache.del(cacheKey);

      // Get user info for logging
      const authUser = await prisma.authUser.findFirst({
        where: {
          api_key: logoutApikey
        }
      });

      if (authUser) {
        loggers.auth('logout_success', logoutApikey.substring(0, 8) + '...', Number(authUser.customer_id), {
          userId: authUser.id_auth,
          ip: req.ip
        });
      }
    }

    res.json({
      success: true,
      message: 'Logged out successfully'
    });

  } catch (error) {
    loggers.error('Logout failed', error as Error, {
      ip: req.ip
    });

    res.status(500).json({
      error: 'Logout failed',
      code: 'LOGOUT_ERROR'
    });
  }
});

// Refresh token
router.post('/refresh', async (req: Request, res: Response) => {
  const { token } = req.body;

  try {
    if (!token) {
      res.status(400).json({
        error: 'Token is required',
        code: 'MISSING_TOKEN'
      });
      return;
    }

    // Verify current token (allow expired ones for refresh)
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'xafra-secret-key') as any;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        // Allow expired tokens for refresh
        decoded = jwt.decode(token) as any;
      } else {
        throw error;
      }
    }

    // Check if user still exists and is active
    const authUser = await prisma.authUser.findFirst({
      where: {
        id_auth: decoded.userId,
        status: 1
      }
    });

    if (!authUser) {
      res.status(401).json({
        error: 'Invalid token - user not found or inactive',
        code: 'INVALID_TOKEN'
      });
      return;
    }

    // Check if API key expired
    if (authUser.expiration_date && new Date() > authUser.expiration_date) {
      res.status(401).json({
        error: 'API key expired',
        code: 'APIKEY_EXPIRED'
      });
      return;
    }

    // Generate new token
    const newTokenPayload = {
      userId: authUser.id_auth,
      customerId: authUser.customer_id,
      apikey: decoded.apikey,
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
    };

    const newToken = jwt.sign(newTokenPayload, process.env.JWT_SECRET || 'xafra-secret-key');

    res.json({
      success: true,
      data: {
        token: newToken
      }
    });

  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({
        error: 'Invalid token',
        code: 'INVALID_TOKEN'
      });
    } else {
      loggers.error('Token refresh failed', error as Error, {
        ip: req.ip
      });

      res.status(500).json({
        error: 'Token refresh failed',
        code: 'REFRESH_ERROR'
      });
    }
  }
});

// Helper functions
async function validatePassword(password: string, hashedPassword: string): Promise<boolean> {
  const [salt, hash] = hashedPassword.split(':');
  return new Promise((resolve, reject) => {
    require('crypto').pbkdf2(password, salt, 1000, 64, 'sha512', (err: any, derivedKey: any) => {
      if (err) reject(err);
      resolve(hash === derivedKey.toString('hex'));
    });
  });
}

export default router;