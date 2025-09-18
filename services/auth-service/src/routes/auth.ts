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
        apikey: apikey,
        status: 1
      },
      include: {
        customer: true
      }
    });

    if (!authUser) {
      loggers.auth('login_failed', apikey.substring(0, 8) + '...', null, {
        reason: 'invalid_apikey',
        ip: req.ip
      });

      res.status(401).json({
        error: 'Invalid API key',
        code: 'INVALID_APIKEY'
      });
      return;
    }

    // Check if password is required and validate
    if (authUser.password && password) {
      const isPasswordValid = await bcrypt.compare(password, authUser.password);
      if (!isPasswordValid) {
        loggers.auth('login_failed', apikey.substring(0, 8) + '...', authUser.customer_id, {
          reason: 'invalid_password',
          ip: req.ip
        });

        res.status(401).json({
          error: 'Invalid password',
          code: 'INVALID_PASSWORD'
        });
        return;
      }
    }

    // Generate session token
    const sessionToken = jwt.sign(
      {
        userId: authUser.id,
        customerId: authUser.customer_id,
        apikey: apikey,
        type: 'session'
      },
      process.env['JWT_SECRET'] || 'default-secret',
      { expiresIn: '24h' }
    );

    // Create auth response
    const authData = {
      sessionToken,
      user: {
        id: authUser.id,
        username: authUser.username,
        customerId: authUser.customer_id,
        status: authUser.status
      },
      customer: {
        id: authUser.customer.id,
        name: authUser.customer.name,
        status: authUser.customer.status,
        plan: authUser.customer.plan || 'basic'
      },
      permissions: {
        canCreateCampaigns: true,
        canViewAnalytics: true,
        canManageProducts: authUser.customer.status === 1,
        canAccessAPI: authUser.status === 1
      },
      expiresIn: '24h',
      loginTime: new Date().toISOString()
    };

    // Cache for 1 hour
    await cache.set(cacheKey, JSON.stringify(authData), 3600);

    // Update last login
    await prisma.authUser.update({
      where: { id: authUser.id },
      data: {
        last_login: BigInt(Date.now()),
        login_count: (authUser.login_count || 0) + 1
      }
    });

    loggers.auth('login_success', apikey.substring(0, 8) + '...', authUser.customer_id, {
      userId: authUser.id,
      username: authUser.username,
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
      error: 'Authentication failed',
      code: 'AUTH_ERROR'
    });
  }
});

// Verify session token
router.post('/verify', async (req: Request, res: Response) => {
  const { token } = req.body;
  const authHeader = req.headers.authorization;

  const sessionToken = token || (authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null);

  try {
    if (!sessionToken) {
      res.status(400).json({
        error: 'Session token is required',
        code: 'MISSING_TOKEN'
      });
      return;
    }

    // Verify JWT token
    const decoded = jwt.verify(sessionToken, process.env['JWT_SECRET'] || 'default-secret') as any;

    if (decoded.type !== 'session') {
      res.status(401).json({
        error: 'Invalid token type',
        code: 'INVALID_TOKEN_TYPE'
      });
      return;
    }

    // Check if user still exists and is active
    const authUser = await prisma.authUser.findFirst({
      where: {
        id: decoded.userId,
        status: 1
      },
      include: {
        customer: true
      }
    });

    if (!authUser) {
      res.status(401).json({
        error: 'User not found or inactive',
        code: 'USER_INACTIVE'
      });
      return;
    }

    loggers.auth('session_verified', decoded.apikey?.substring(0, 8) + '...', decoded.customerId, {
      userId: decoded.userId,
      ip: req.ip
    });

    res.json({
      success: true,
      data: {
        valid: true,
        user: {
          id: authUser.id,
          username: authUser.username,
          customerId: authUser.customer_id,
          status: authUser.status
        },
        customer: {
          id: authUser.customer.id,
          name: authUser.customer.name,
          status: authUser.customer.status
        },
        tokenData: {
          userId: decoded.userId,
          customerId: decoded.customerId,
          expiresAt: new Date(decoded.exp * 1000).toISOString()
        }
      }
    });

  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      loggers.auth('session_invalid', null, null, {
        reason: error.message,
        ip: req.ip
      });

      res.status(401).json({
        error: 'Invalid or expired token',
        code: 'INVALID_TOKEN'
      });
      return;
    }

    loggers.error('Session verification failed', error as Error, {
      ip: req.ip
    });

    res.status(500).json({
      error: 'Verification failed',
      code: 'VERIFICATION_ERROR'
    });
  }
});

// Logout (invalidate session)
router.post('/logout', async (req: Request, res: Response) => {
  const { token, apikey } = req.body;
  const authHeader = req.headers.authorization;

  const sessionToken = token || (authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null);

  try {
    if (sessionToken) {
      try {
        const decoded = jwt.verify(sessionToken, process.env['JWT_SECRET'] || 'default-secret') as any;
        
        // Clear cache
        if (decoded.apikey) {
          const cacheKey = `auth:login:${decoded.apikey}`;
          await cache.del(cacheKey);
        }

        loggers.auth('logout_success', decoded.apikey?.substring(0, 8) + '...', decoded.customerId, {
          userId: decoded.userId,
          ip: req.ip
        });
      } catch (error) {
        // Token might be expired or invalid, but we still try to clear cache
      }
    }

    if (apikey) {
      const cacheKey = `auth:login:${apikey}`;
      await cache.del(cacheKey);
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

// Refresh session token
router.post('/refresh', async (req: Request, res: Response) => {
  const { token } = req.body;
  const authHeader = req.headers.authorization;

  const sessionToken = token || (authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null);

  try {
    if (!sessionToken) {
      res.status(400).json({
        error: 'Session token is required',
        code: 'MISSING_TOKEN'
      });
      return;
    }

    // Verify current token (allow expired tokens for refresh)
    let decoded: any;
    try {
      decoded = jwt.verify(sessionToken, process.env['JWT_SECRET'] || 'default-secret');
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        // Allow expired tokens for refresh
        decoded = jwt.decode(sessionToken);
      } else {
        throw error;
      }
    }

    if (!decoded || decoded.type !== 'session') {
      res.status(401).json({
        error: 'Invalid token',
        code: 'INVALID_TOKEN'
      });
      return;
    }

    // Check if user still exists and is active
    const authUser = await prisma.authUser.findFirst({
      where: {
        id: decoded.userId,
        status: 1
      },
      include: {
        customer: true
      }
    });

    if (!authUser) {
      res.status(401).json({
        error: 'User not found or inactive',
        code: 'USER_INACTIVE'
      });
      return;
    }

    // Generate new session token
    const newSessionToken = jwt.sign(
      {
        userId: authUser.id,
        customerId: authUser.customer_id,
        apikey: decoded.apikey,
        type: 'session'
      },
      process.env['JWT_SECRET'] || 'default-secret',
      { expiresIn: '24h' }
    );

    loggers.auth('session_refreshed', decoded.apikey?.substring(0, 8) + '...', decoded.customerId, {
      userId: decoded.userId,
      ip: req.ip
    });

    res.json({
      success: true,
      data: {
        sessionToken: newSessionToken,
        expiresIn: '24h',
        refreshedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({
        error: 'Invalid token',
        code: 'INVALID_TOKEN'
      });
      return;
    }

    loggers.error('Session refresh failed', error as Error, {
      ip: req.ip
    });

    res.status(500).json({
      error: 'Refresh failed',
      code: 'REFRESH_ERROR'
    });
  }
});

export default router;