import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { loggers } from '@xafra/shared/logger';
import { cache } from '@xafra/shared/cache';
import { prisma } from '@xafra/database';

const router = Router();

// Get active sessions for a customer
router.get('/customer/:customerId', async (req: Request, res: Response) => {
  const { customerId } = req.params;
  const { limit = '50', offset = '0' } = req.query;

  try {
    // Get all API keys for the customer
    const authUsers = await prisma.authUser.findMany({
      where: {
        customer_id: parseInt(customerId as string),
        status: 1
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            status: true
          }
        }
      },
      orderBy: {
        last_login: 'desc'
      },
      take: parseInt(limit as string),
      skip: parseInt(offset as string)
    });

    const sessions = [];

    // Check cache for active sessions
    for (const authUser of authUsers) {
      const cacheKey = `auth:login:${authUser.apikey}`;
      const cachedSession = await cache.get(cacheKey);
      
      if (cachedSession) {
        const sessionData = JSON.parse(cachedSession as string);
        sessions.push({
          authUserId: authUser.id,
          username: authUser.username,
          apikey: authUser.apikey.substring(0, 8) + '...' + authUser.apikey.substring(-4),
          lastLogin: authUser.last_login ? new Date(Number(authUser.last_login)).toISOString() : null,
          loginCount: authUser.login_count || 0,
          sessionActive: true,
          sessionData: {
            loginTime: sessionData.loginTime,
            expiresIn: sessionData.expiresIn
          }
        });
      } else {
        sessions.push({
          authUserId: authUser.id,
          username: authUser.username,
          apikey: authUser.apikey.substring(0, 8) + '...' + authUser.apikey.substring(-4),
          lastLogin: authUser.last_login ? new Date(Number(authUser.last_login)).toISOString() : null,
          loginCount: authUser.login_count || 0,
          sessionActive: false,
          sessionData: null
        });
      }
    }

    const totalSessions = authUsers.length;
    const activeSessions = sessions.filter(s => s.sessionActive).length;

    res.json({
      success: true,
      data: {
        customerId: parseInt(customerId as string),
        totalSessions,
        activeSessions,
        inactiveSessions: totalSessions - activeSessions,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        sessions
      }
    });

  } catch (error) {
    loggers.error('Customer sessions retrieval failed', error as Error, {
      customerId,
      ip: req.ip
    });

    res.status(500).json({
      error: 'Failed to retrieve customer sessions',
      code: 'SESSIONS_RETRIEVAL_ERROR'
    });
  }
});

// Get session details by API key
router.get('/apikey/:apikey', async (req: Request, res: Response) => {
  const { apikey } = req.params;

  try {
    const authUser = await prisma.authUser.findFirst({
      where: {
        apikey: apikey,
        status: 1
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            status: true
          }
        }
      }
    });

    if (!authUser) {
      res.status(404).json({
        error: 'API key not found or inactive',
        code: 'APIKEY_NOT_FOUND'
      });
      return;
    }

    // Check for active session
    const cacheKey = `auth:login:${apikey}`;
    const cachedSession = await cache.get(cacheKey);

    const sessionDetails = {
      authUserId: authUser.id,
      username: authUser.username,
      apikey: apikey.substring(0, 8) + '...' + apikey.substring(-4),
      customerId: authUser.customer_id,
      customer: authUser.customer,
      lastLogin: authUser.last_login ? new Date(Number(authUser.last_login)).toISOString() : null,
      loginCount: authUser.login_count || 0,
      sessionActive: !!cachedSession,
      sessionData: cachedSession ? JSON.parse(cachedSession as string) : null,
      createdAt: new Date(Number(authUser.creation_date)).toISOString()
    };

    loggers.auth('session_details_retrieved', apikey.substring(0, 8) + '...', authUser.customer_id, {
      authUserId: authUser.id,
      sessionActive: !!cachedSession,
      ip: req.ip
    });

    res.json({
      success: true,
      data: sessionDetails
    });

  } catch (error) {
    loggers.error('Session details retrieval failed', error as Error, {
      apikey: apikey?.substring(0, 8) + '...',
      ip: req.ip
    });

    res.status(500).json({
      error: 'Failed to retrieve session details',
      code: 'SESSION_DETAILS_ERROR'
    });
  }
});

// Invalidate session by API key
router.delete('/apikey/:apikey', async (req: Request, res: Response) => {
  const { apikey } = req.params;
  const { reason } = req.body;

  try {
    const authUser = await prisma.authUser.findFirst({
      where: {
        apikey: apikey
      }
    });

    if (!authUser) {
      res.status(404).json({
        error: 'API key not found',
        code: 'APIKEY_NOT_FOUND'
      });
      return;
    }

    // Clear session cache
    const cacheKey = `auth:login:${apikey}`;
    const wasActive = await cache.get(cacheKey);
    await cache.del(cacheKey);

    loggers.auth('session_invalidated', apikey.substring(0, 8) + '...', authUser.customer_id, {
      authUserId: authUser.id,
      wasActive: !!wasActive,
      reason: reason || null,
      ip: req.ip
    });

    res.json({
      success: true,
      data: {
        authUserId: authUser.id,
        apikey: apikey.substring(0, 8) + '...' + apikey.substring(-4),
        sessionInvalidated: true,
        wasActive: !!wasActive,
        invalidatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    loggers.error('Session invalidation failed', error as Error, {
      apikey: apikey?.substring(0, 8) + '...',
      ip: req.ip
    });

    res.status(500).json({
      error: 'Failed to invalidate session',
      code: 'SESSION_INVALIDATION_ERROR'
    });
  }
});

// Invalidate all sessions for a customer
router.delete('/customer/:customerId/all', async (req: Request, res: Response) => {
  const { customerId } = req.params;
  const { reason } = req.body;

  try {
    const authUsers = await prisma.authUser.findMany({
      where: {
        customer_id: parseInt(customerId as string)
      },
      select: {
        id: true,
        apikey: true
      }
    });

    if (authUsers.length === 0) {
      res.status(404).json({
        error: 'No API keys found for customer',
        code: 'NO_APIKEYS_FOUND'
      });
      return;
    }

    let invalidatedCount = 0;

    // Clear all session caches for this customer
    for (const authUser of authUsers) {
      const cacheKey = `auth:login:${authUser.apikey}`;
      const wasActive = await cache.get(cacheKey);
      if (wasActive) {
        await cache.del(cacheKey);
        invalidatedCount++;
      }
    }

    loggers.auth('customer_sessions_invalidated', null, parseInt(customerId as string), {
      totalApiKeys: authUsers.length,
      invalidatedSessions: invalidatedCount,
      reason: reason || null,
      ip: req.ip
    });

    res.json({
      success: true,
      data: {
        customerId: parseInt(customerId as string),
        totalApiKeys: authUsers.length,
        invalidatedSessions: invalidatedCount,
        invalidatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    loggers.error('Customer sessions invalidation failed', error as Error, {
      customerId,
      ip: req.ip
    });

    res.status(500).json({
      error: 'Failed to invalidate customer sessions',
      code: 'CUSTOMER_SESSIONS_INVALIDATION_ERROR'
    });
  }
});

// Get session statistics
router.get('/stats', async (req: Request, res: Response) => {
  const { 
    customer_id,
    hours = '24' 
  } = req.query;

  try {
    const hoursAgo = parseInt(hours as string);
    const startTime = BigInt(Date.now() - (hoursAgo * 60 * 60 * 1000));

    // Build where clause
    const whereClause: any = {
      last_login: {
        gte: startTime
      }
    };

    if (customer_id) {
      whereClause.customer_id = parseInt(customer_id as string);
    }

    // Get login statistics
    const [
      totalActiveUsers,
      recentLogins,
      uniqueCustomers
    ] = await Promise.all([
      prisma.authUser.count({
        where: {
          status: 1,
          ...(customer_id ? { customer_id: parseInt(customer_id as string) } : {})
        }
      }),
      prisma.authUser.count({
        where: whereClause
      }),
      customer_id ? 1 : prisma.authUser.groupBy({
        by: ['customer_id'],
        where: whereClause,
        _count: {
          customer_id: true
        }
      })
    ]);

    // Get most active users in the period
    const mostActiveUsers = await prisma.authUser.findMany({
      where: whereClause,
      include: {
        customer: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: {
        login_count: 'desc'
      },
      take: 10
    });

    const sessionStats = {
      period: `${hoursAgo} hours`,
      totalActiveUsers,
      recentLogins,
      uniqueCustomers: customer_id ? 1 : Array.isArray(uniqueCustomers) ? uniqueCustomers.length : 0,
      averageLoginsPerHour: Math.round(recentLogins / hoursAgo),
      mostActiveUsers: mostActiveUsers.map(user => ({
        authUserId: user.id,
        username: user.username,
        loginCount: user.login_count || 0,
        lastLogin: user.last_login ? new Date(Number(user.last_login)).toISOString() : null,
        customer: user.customer
      }))
    };

    res.json({
      success: true,
      data: sessionStats
    });

  } catch (error) {
    loggers.error('Session stats retrieval failed', error as Error, {
      customerId: customer_id,
      hours,
      ip: req.ip
    });

    res.status(500).json({
      error: 'Failed to retrieve session statistics',
      code: 'SESSION_STATS_ERROR'
    });
  }
});

// Validate session token directly
router.post('/validate', async (req: Request, res: Response) => {
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
        customer: {
          select: {
            id: true,
            name: true,
            status: true
          }
        }
      }
    });

    if (!authUser) {
      res.status(401).json({
        error: 'User not found or inactive',
        code: 'USER_INACTIVE'
      });
      return;
    }

    res.json({
      success: true,
      data: {
        valid: true,
        sessionData: {
          userId: decoded.userId,
          customerId: decoded.customerId,
          apikey: decoded.apikey?.substring(0, 8) + '...',
          expiresAt: new Date(decoded.exp * 1000).toISOString()
        },
        user: {
          id: authUser.id,
          username: authUser.username,
          customerId: authUser.customer_id,
          status: authUser.status
        },
        customer: authUser.customer
      }
    });

  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({
        error: 'Invalid or expired token',
        code: 'INVALID_TOKEN'
      });
      return;
    }

    loggers.error('Session validation failed', error as Error, {
      ip: req.ip
    });

    res.status(500).json({
      error: 'Session validation failed',
      code: 'VALIDATION_ERROR'
    });
  }
});

export default router;