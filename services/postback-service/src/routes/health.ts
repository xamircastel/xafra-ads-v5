import { Router, Request, Response } from 'express';
import { dbService } from '../utils/database.js';
import { redisService } from '../utils/redis.js';

const router = Router();

// Health check endpoint
router.get('/', async (req: Request, res: Response) => {
  const startTime = Date.now();
  
  try {
    // Real health checks
    const [dbCheck, redisCheck] = await Promise.allSettled([
      dbService.healthCheck(),
      redisService.healthCheck()
    ]);

    const queueStats = await redisService.getQueueStats();

    const healthChecks = {
      service: 'healthy',
      dependencies: {
        database: dbCheck.status === 'fulfilled' ? dbCheck.value : { 
          status: 'unhealthy', 
          error: dbCheck.status === 'rejected' ? dbCheck.reason?.message : 'Unknown error' 
        },
        cache: redisCheck.status === 'fulfilled' ? redisCheck.value : { 
          status: 'unhealthy', 
          error: redisCheck.status === 'rejected' ? redisCheck.reason?.message : 'Unknown error' 
        }
      },
      queue: {
        status: 'healthy',
        ...queueStats
      }
    };

    const totalDuration = Date.now() - startTime;
    const allHealthy = healthChecks.dependencies.database.status === 'healthy' && 
                      healthChecks.dependencies.cache.status === 'healthy';

    res.status(allHealthy ? 200 : 503).json({
      status: allHealthy ? 'healthy' : 'degraded',
      service: 'postback-service',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      checks: healthChecks,
      responseTime: `${totalDuration}ms`,
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
      service: 'postback-service',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
      uptime: process.uptime(),
      responseTime: `${Date.now() - startTime}ms`
    });
  }
});

export default router;