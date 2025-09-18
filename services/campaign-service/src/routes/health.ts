import { Router, Request, Response } from 'express';
import { prisma } from '@xafra/database';
import { cache } from '@xafra/shared/cache';

const router = Router();

// Health check endpoint
router.get('/', async (req: Request, res: Response) => {
  const startTime = Date.now();
  
  try {
    // Check database connectivity
    const dbStart = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    const dbDuration = Date.now() - dbStart;

    // Check cache connectivity
    const cacheStart = Date.now();
    await cache.set('health_test', 'ok', 5);
    await cache.get('health_test');
    const cacheDuration = Date.now() - cacheStart;

    // Get basic metrics
    const [campaignCount, activeCount] = await Promise.all([
      prisma.campaign.count(),
      prisma.campaign.count({
        where: {
          status: 1
        }
      })
    ]);

    const totalDuration = Date.now() - startTime;

    res.json({
      status: 'healthy',
      service: 'campaign-service',
      timestamp: new Date().toISOString(),
      version: process.env['npm_package_version'] || '1.0.0',
      uptime: process.uptime(),
      environment: process.env['NODE_ENV'] || 'development',
      checks: {
        database: {
          status: 'healthy',
          responseTime: `${dbDuration}ms`
        },
        cache: {
          status: 'healthy',
          responseTime: `${cacheDuration}ms`
        }
      },
      metrics: {
        totalCampaigns: campaignCount,
        activeCampaigns: activeCount,
        responseTime: `${totalDuration}ms`
      },
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        external: Math.round(process.memoryUsage().external / 1024 / 1024)
      }
    });

  } catch (error) {
    console.error('Health check failed:', error);
    
    res.status(503).json({
      status: 'unhealthy',
      service: 'campaign-service',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
      uptime: process.uptime(),
      responseTime: `${Date.now() - startTime}ms`
    });
  }
});

// Detailed health check with dependencies
router.get('/detailed', async (req: Request, res: Response) => {
  const startTime = Date.now();
  const healthChecks: any = {};

  try {
    // Database health check
    try {
      const dbStart = Date.now();
      const result = await prisma.$queryRaw`SELECT version()`;
      healthChecks.database = {
        status: 'healthy',
        responseTime: Date.now() - dbStart,
        version: Array.isArray(result) && result.length > 0 ? result[0] : 'unknown'
      };
    } catch (dbError) {
      healthChecks.database = {
        status: 'unhealthy',
        error: dbError instanceof Error ? dbError.message : 'Database connection failed'
      };
    }

    // Cache health check
    try {
      const cacheStart = Date.now();
      await cache.set('health_check', 'ok', 10);
      const testValue = await cache.get('health_check');
      
      healthChecks.cache = {
        status: testValue === 'ok' ? 'healthy' : 'degraded',
        responseTime: Date.now() - cacheStart
      };
    } catch (cacheError) {
      healthChecks.cache = {
        status: 'unhealthy',
        error: cacheError instanceof Error ? cacheError.message : 'Cache connection failed'
      };
    }

    // Service-specific metrics
    try {
      const metricsStart = Date.now();
      const [
        totalCampaigns,
        activeCampaigns,
        todayTracking,
        todayConversions,
        recentActivity
      ] = await Promise.all([
        prisma.campaign.count(),
        prisma.campaign.count({ where: { status: 1 } }),
        prisma.tracking.count({
          where: {
            creation_date: {
              gte: BigInt(new Date().setHours(0, 0, 0, 0))
            }
          }
        }),
        prisma.confirm.count({
          where: {
            creation_date: {
              gte: BigInt(new Date().setHours(0, 0, 0, 0))
            },
            status: 1
          }
        }),
        prisma.campaign.findFirst({
          orderBy: {
            modification_date: 'desc'
          },
          select: {
            id: true,
            modification_date: true
          }
        })
      ]);

      healthChecks.metrics = {
        status: 'healthy',
        responseTime: Date.now() - metricsStart,
        data: {
          totalCampaigns,
          activeCampaigns,
          todayTracking,
          todayConversions,
          lastActivity: recentActivity 
            ? new Date(Number(recentActivity.modification_date)).toISOString()
            : null
        }
      };
    } catch (metricsError) {
      healthChecks.metrics = {
        status: 'unhealthy',
        error: metricsError instanceof Error ? metricsError.message : 'Metrics collection failed'
      };
    }

    // Overall status determination
    const unhealthyServices = Object.values(healthChecks).filter(
      (check: any) => check.status === 'unhealthy'
    ).length;

    const overallStatus = unhealthyServices === 0 ? 'healthy' : 
                         unhealthyServices < Object.keys(healthChecks).length ? 'degraded' : 'unhealthy';

    res.status(overallStatus === 'healthy' ? 200 : overallStatus === 'degraded' ? 200 : 503).json({
      status: overallStatus,
      service: 'campaign-service',
      timestamp: new Date().toISOString(),
      version: process.env['npm_package_version'] || '1.0.0',
      uptime: process.uptime(),
      environment: process.env['NODE_ENV'] || 'development',
      totalResponseTime: Date.now() - startTime,
      checks: healthChecks,
      system: {
        memory: {
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
          rss: Math.round(process.memoryUsage().rss / 1024 / 1024),
          external: Math.round(process.memoryUsage().external / 1024 / 1024)
        },
        cpu: {
          usage: process.cpuUsage()
        },
        platform: process.platform,
        nodeVersion: process.version
      }
    });

  } catch (error) {
    console.error('Detailed health check failed:', error);
    
    res.status(503).json({
      status: 'unhealthy',
      service: 'campaign-service',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Health check system failure',
      uptime: process.uptime(),
      responseTime: Date.now() - startTime
    });
  }
});

// Ready check - for Kubernetes readiness probe
router.get('/ready', async (req: Request, res: Response) => {
  try {
    // Quick database connectivity check
    await prisma.$queryRaw`SELECT 1`;
    
    res.status(200).json({
      status: 'ready',
      service: 'campaign-service',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      status: 'not_ready',
      service: 'campaign-service',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Service not ready'
    });
  }
});

// Live check - for Kubernetes liveness probe
router.get('/live', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'alive',
    service: 'campaign-service',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

export default router;