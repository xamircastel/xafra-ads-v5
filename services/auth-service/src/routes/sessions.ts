import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { loggers } from '../utils/simple-logger';
import { cache } from '../utils/simple-cache';
import { prisma } from '../utils/simple-database';

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
      orderBy: {
        last_login: 'desc'
      },
      take: parseInt(limit as string),
      skip: parseInt(offset as string)
    });

    const sessions = [];

    // Check cache for active sessions
    for (const authUser of authUsers) {
      const cacheKey = `auth:login:${authUser.api_key}`;
      const cachedSession = await cache.get(cacheKey);
      
      if (cachedSession) {
        const sessionData = JSON.parse(cachedSession as string);
        sessions.push({
          authUserId: authUser.id_auth,
          username: authUser.user_name,
          apikey: authUser.api_key.substring(0, 8) + '...' + authUser.api_key.substring(-4),
          lastLogin: authUser.last_login ? new Date(Number(authUser.last_login)).toISOString() : null,
          loginCount: authUser.login_count || 0,
          isActive: true,
          cacheExpiry: sessionData.exp ? new Date(sessionData.exp * 1000).toISOString() : null
        });
      } else {
        // Not cached = not active session
        sessions.push({
          authUserId: authUser.id_auth,
          username: authUser.user_name,
          apikey: authUser.api_key.substring(0, 8) + '...' + authUser.api_key.substring(-4),
          lastLogin: authUser.last_login ? new Date(Number(authUser.last_login)).toISOString() : null,
          loginCount: authUser.login_count || 0,
          isActive: false,
          cacheExpiry: null
        });
      }
    }

    res.json({
      success: true,
      data: {
        customerId: parseInt(customerId as string),
        totalSessions: sessions.length,
        activeSessions: sessions.filter(s => s.isActive).length,
        sessions
      }
    });

  } catch (error) {
    loggers.error('Customer sessions retrieval failed', error as Error, {
      customerId,
      ip: req.ip
    });

    res.status(500).json({
      error: 'Customer sessions retrieval failed',
      code: 'SESSIONS_ERROR'
    });
  }
});

// Get session details by API key
router.get('/details/:apikey', async (req: Request, res: Response) => {
  const { apikey } = req.params;

  try {
    const authUser = await prisma.authUser.findFirst({
      where: {
        api_key: apikey,
        status: 1
      }
    });

    if (!authUser) {
      res.status(404).json({
        error: 'Session not found',
        code: 'SESSION_NOT_FOUND'
      });
      return;
    }

    // Check if session is active in cache
    const cacheKey = `auth:login:${apikey}`;
    const cachedSession = await cache.get(cacheKey);

    // Get customer info
    const customer = await prisma.customer.findFirst({
      where: {
        id_customer: authUser.customer_id
      }
    });

    const sessionDetails = {
      authUserId: authUser.id_auth,
      username: authUser.user_name,
      customerId: authUser.customer_id,
      customerName: customer?.name || 'Unknown',
      apikey: apikey.substring(0, 8) + '...' + apikey.substring(-4),
      status: authUser.status,
      isActive: !!cachedSession,
      lastLogin: authUser.last_login ? new Date(Number(authUser.last_login)).toISOString() : null,
      loginCount: authUser.login_count || 0,
      expirationDate: authUser.expiration_date ? new Date(Number(authUser.expiration_date)).toISOString() : null,
      createdAt: new Date(Number(authUser.creation_date)).toISOString()
    };

    loggers.auth('session_details_retrieved', apikey.substring(0, 8) + '...', Number(authUser.customer_id), {
      authUserId: authUser.id_auth,
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
      error: 'Session details retrieval failed',
      code: 'SESSION_DETAILS_ERROR'
    });
  }
});

// Invalidate session (logout)
router.delete('/invalidate/:apikey', async (req: Request, res: Response) => {
  const { apikey } = req.params;

  try {
    const authUser = await prisma.authUser.findFirst({
      where: {
        api_key: apikey
      }
    });

    if (!authUser) {
      res.status(404).json({
        error: 'Session not found',
        code: 'SESSION_NOT_FOUND'
      });
      return;
    }

    // Remove from cache
    const cacheKey = `auth:login:${apikey}`;
    await cache.del(cacheKey);

    loggers.auth('session_invalidated', apikey.substring(0, 8) + '...', Number(authUser.customer_id), {
      authUserId: authUser.id_auth,
      ip: req.ip
    });

    res.json({
      success: true,
      data: {
        authUserId: authUser.id_auth,
        message: 'Session invalidated successfully'
      }
    });

  } catch (error) {
    loggers.error('Session invalidation failed', error as Error, {
      apikey: apikey?.substring(0, 8) + '...',
      ip: req.ip
    });

    res.status(500).json({
      error: 'Session invalidation failed',
      code: 'SESSION_INVALIDATION_ERROR'
    });
  }
});

// Get all active sessions across all customers (admin endpoint)
router.get('/all-active', async (req: Request, res: Response) => {
  const { limit = '100', offset = '0' } = req.query;

  try {
    // Get all active auth users
    const authUsers = await prisma.authUser.findMany({
      where: {
        status: 1
      },
      orderBy: {
        last_login: 'desc'
      },
      take: parseInt(limit as string),
      skip: parseInt(offset as string)
    });

    const activeSessions = [];

    // Check cache for each user
    for (const authUser of authUsers) {
      const cacheKey = `auth:login:${authUser.api_key}`;
      const cachedSession = await cache.get(cacheKey);
      
      if (cachedSession) {
        // Get customer info
        const customer = await prisma.customer.findFirst({
          where: {
            id_customer: authUser.customer_id
          }
        });

        activeSessions.push({
          authUserId: authUser.id_auth,
          username: authUser.user_name,
          customerId: authUser.customer_id,
          customerName: customer?.name || 'Unknown',
          apikey: authUser.api_key.substring(0, 8) + '...' + authUser.api_key.substring(-4),
          lastLogin: authUser.last_login ? new Date(Number(authUser.last_login)).toISOString() : null,
          loginCount: authUser.login_count || 0
        });
      }
    }

    res.json({
      success: true,
      data: {
        totalActiveSessions: activeSessions.length,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        sessions: activeSessions
      }
    });

  } catch (error) {
    loggers.error('All active sessions retrieval failed', error as Error, {
      ip: req.ip
    });

    res.status(500).json({
      error: 'All active sessions retrieval failed',
      code: 'ALL_SESSIONS_ERROR'
    });
  }
});

// Get session analytics
router.get('/analytics', async (req: Request, res: Response) => {
  const { customerId } = req.query;

  try {
    const now = BigInt(Date.now());
    const hourAgo = now - BigInt(60 * 60 * 1000);
    const dayAgo = now - BigInt(24 * 60 * 60 * 1000);
    const weekAgo = now - BigInt(7 * 24 * 60 * 60 * 1000);

    let whereClause: any = { status: 1 };
    
    if (customerId) {
      whereClause.customer_id = parseInt(customerId as string);
    }

    const [
      totalAuthUsers,
      activeAuthUsers,
      loginsLastHour,
      loginsLastDay,
      loginsLastWeek
    ] = await Promise.all([
      prisma.authUser.count({ where: whereClause }),
      prisma.authUser.count({ 
        where: { 
          ...whereClause,
          last_login: { gte: dayAgo }
        } 
      }),
      prisma.authUser.count({ 
        where: { 
          ...whereClause,
          last_login: { gte: hourAgo }
        } 
      }),
      prisma.authUser.count({ 
        where: { 
          ...whereClause,
          last_login: { gte: dayAgo }
        } 
      }),
      prisma.authUser.count({ 
        where: { 
          ...whereClause,
          last_login: { gte: weekAgo }
        } 
      })
    ]);

    // Count active sessions from cache
    const allAuthUsers = await prisma.authUser.findMany({
      where: whereClause,
      select: {
        id_auth: true,
        api_key: true
      }
    });

    let activeSessionsCount = 0;
    for (const user of allAuthUsers) {
      const cacheKey = `auth:login:${user.api_key}`;
      const cachedSession = await cache.get(cacheKey);
      if (cachedSession) {
        activeSessionsCount++;
      }
    }

    const analytics = {
      totalAuthUsers,
      activeAuthUsers,
      activeSessionsCount,
      loginActivity: {
        lastHour: loginsLastHour,
        lastDay: loginsLastDay,
        lastWeek: loginsLastWeek
      },
      sessionMetrics: {
        averageSessionsPerUser: totalAuthUsers > 0 ? (activeSessionsCount / totalAuthUsers).toFixed(2) : 0,
        sessionUtilization: totalAuthUsers > 0 ? ((activeSessionsCount / totalAuthUsers) * 100).toFixed(1) + '%' : '0%'
      }
    };

    res.json({
      success: true,
      data: analytics
    });

  } catch (error) {
    loggers.error('Session analytics retrieval failed', error as Error, {
      customerId,
      ip: req.ip
    });

    res.status(500).json({
      error: 'Session analytics retrieval failed',
      code: 'ANALYTICS_ERROR'
    });
  }
});

// Invalidate all sessions for a customer
router.delete('/customer/:customerId/invalidate-all', async (req: Request, res: Response) => {
  const { customerId } = req.params;

  try {
    // Get all auth users for the customer
    const authUsers = await prisma.authUser.findMany({
      where: {
        customer_id: parseInt(customerId as string)
      }
    });

    let invalidatedCount = 0;

    // Remove all sessions from cache
    for (const authUser of authUsers) {
      const cacheKey = `auth:login:${authUser.api_key}`;
      const result = await cache.del(cacheKey);
      if (result) {
        invalidatedCount++;
      }
    }

    if (authUsers.length > 0) {
      loggers.auth('customer_sessions_invalidated', 'bulk_operation', parseInt(customerId as string), {
        invalidatedCount,
        totalApiKeys: authUsers.length,
        ip: req.ip
      });
    }

    res.json({
      success: true,
      data: {
        customerId: parseInt(customerId as string),
        totalApiKeys: authUsers.length,
        invalidatedSessions: invalidatedCount,
        message: `${invalidatedCount} active sessions invalidated`
      }
    });

  } catch (error) {
    loggers.error('Customer sessions invalidation failed', error as Error, {
      customerId,
      ip: req.ip
    });

    res.status(500).json({
      error: 'Customer sessions invalidation failed',
      code: 'CUSTOMER_INVALIDATION_ERROR'
    });
  }
});

export default router;