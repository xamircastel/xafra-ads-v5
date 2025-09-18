import { Router, Request, Response } from 'express';
import { loggers } from '@xafra/shared/logger';
import { cache } from '@xafra/shared/cache';
import { prisma } from '@xafra/database';

const router = Router();

// Basic health check
router.get('/', async (req: Request, res: Response) => {
  try {
    const healthData = {
      service: 'tracking-service',
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env['npm_package_version'] || '1.0.0',
      uptime: process.uptime(),
      environment: process.env['NODE_ENV'] || 'development'
    };

    res.status(200).json(healthData);
  } catch (error) {
    res.status(503).json({
      service: 'tracking-service',
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check failed'
    });
  }
});

// Detailed health check with dependencies
router.get('/detailed', async (req: Request, res: Response) => {
  const startTime = Date.now();
  const checks = {
    database: false,
    cache: false,
    memory: false,
    disk: false
  };

  let overallStatus = 'healthy';

  try {
    // Database check
    try {
      await prisma.$queryRaw`SELECT 1`;
      checks.database = true;
    } catch (error) {
      loggers.error('Database health check failed', error as Error);
      overallStatus = 'degraded';
    }

    // Cache check  
    try {
      const testKey = 'health_check_' + Date.now();
      await cache.set(testKey, 'test', 10);
      const value = await cache.get(testKey);
      await cache.del(testKey);
      checks.cache = value === 'test';
      
      if (!checks.cache) {
        overallStatus = 'degraded';
      }
    } catch (error) {
      loggers.error('Cache health check failed', error as Error);
      overallStatus = 'degraded';
    }

    // Memory check (fail if > 90% used)
    const memUsage = process.memoryUsage();
    const memoryUsedMB = memUsage.heapUsed / 1024 / 1024;
    const memoryTotalMB = memUsage.heapTotal / 1024 / 1024;
    const memoryUsagePercent = (memoryUsedMB / memoryTotalMB) * 100;
    
    checks.memory = memoryUsagePercent < 90;
    if (!checks.memory) {
      overallStatus = 'degraded';
    }

    // Simple disk check (always pass for now)
    checks.disk = true;

    const responseTime = Date.now() - startTime;
    
    // If response time is too slow, mark as degraded
    if (responseTime > 5000) {
      overallStatus = 'degraded';
    }

    const healthData = {
      service: 'tracking-service',
      status: overallStatus,
      timestamp: new Date().toISOString(),
      version: process.env['npm_package_version'] || '1.0.0',
      uptime: process.uptime(),
      environment: process.env['NODE_ENV'] || 'development',
      responseTime: responseTime + 'ms',
      checks,
      metrics: {
        memory: {
          used: Math.round(memoryUsedMB),
          total: Math.round(memoryTotalMB), 
          usage: Math.round(memoryUsagePercent) + '%'
        },
        heap: {
          used: Math.round(memUsage.heapUsed / 1024 / 1024),
          total: Math.round(memUsage.heapTotal / 1024 / 1024)
        },
        process: {
          pid: process.pid,
          uptime: Math.round(process.uptime()),
          cpuUsage: process.cpuUsage()
        }
      }
    };

    const statusCode = overallStatus === 'healthy' ? 200 : 
                      overallStatus === 'degraded' ? 200 : 503;

    res.status(statusCode).json(healthData);

  } catch (error) {
    loggers.error('Detailed health check failed', error as Error);
    
    res.status(503).json({
      service: 'tracking-service',
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check failed',
      checks,
      responseTime: (Date.now() - startTime) + 'ms'
    });
  }
});

// Live endpoint for load balancer
router.get('/live', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'live',
    timestamp: new Date().toISOString()
  });
});

// Ready endpoint for load balancer
router.get('/ready', async (req: Request, res: Response) => {
  try {
    // Quick database connectivity check
    await prisma.$queryRaw`SELECT 1`;
    
    res.status(200).json({
      status: 'ready',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      status: 'not_ready',
      timestamp: new Date().toISOString(),
      error: 'Database not accessible'
    });
  }
});

// Service metrics endpoint
router.get('/metrics', async (req: Request, res: Response) => {
  try {
    // Get some basic tracking metrics
    const now = new Date();
    const hourAgo = new Date(now.getTime() - (60 * 60 * 1000));
    const dayAgo = new Date(now.getTime() - (24 * 60 * 60 * 1000));

    const hourAgoTs = BigInt(hourAgo.getTime());
    const dayAgoTs = BigInt(dayAgo.getTime());

    const [
      totalCampaigns,
      activeCampaigns,
      recentTrackingHour,
      recentTrackingDay,
      recentConversionsHour,
      recentConversionsDay
    ] = await Promise.all([
      prisma.campaign.count(),
      prisma.campaign.count({ where: { status: 1 } }),
      prisma.tracking.count({ where: { creation_date: { gte: hourAgoTs } } }),
      prisma.tracking.count({ where: { creation_date: { gte: dayAgoTs } } }),
      prisma.confirm.count({ 
        where: { 
          creation_date: { gte: hourAgoTs },
          status: 1 
        } 
      }),
      prisma.confirm.count({ 
        where: { 
          creation_date: { gte: dayAgoTs },
          status: 1 
        } 
      })
    ]);

    const metrics = {
      service: 'tracking-service',
      timestamp: new Date().toISOString(),
      campaigns: {
        total: totalCampaigns,
        active: activeCampaigns,
        inactive: totalCampaigns - activeCampaigns
      },
      tracking: {
        lastHour: recentTrackingHour,
        last24Hours: recentTrackingDay,
        avgPerMinute: Math.round(recentTrackingHour / 60),
        avgPerHour: Math.round(recentTrackingDay / 24)
      },
      conversions: {
        lastHour: recentConversionsHour,
        last24Hours: recentConversionsDay,
        conversionRateHour: recentTrackingHour > 0 ? 
          Math.round((recentConversionsHour / recentTrackingHour) * 10000) / 100 : 0,
        conversionRateDay: recentTrackingDay > 0 ? 
          Math.round((recentConversionsDay / recentTrackingDay) * 10000) / 100 : 0
      },
      system: {
        uptime: process.uptime(),
        memory: {
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024)
        },
        cpu: process.cpuUsage()
      }
    };

    res.json(metrics);

  } catch (error) {
    loggers.error('Metrics endpoint failed', error as Error);
    
    res.status(500).json({
      error: 'Failed to retrieve metrics',
      timestamp: new Date().toISOString()
    });
  }
});

export default router;