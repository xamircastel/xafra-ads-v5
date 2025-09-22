import { Router, Request, Response } from 'express';
import { logger } from '../utils/simple-logger';
import { checkDatabaseHealth } from '../utils/simple-database';

const router = Router();

// Health check endpoint
router.get('/', async (req: Request, res: Response) => {
  try {
    const dbHealthy = await checkDatabaseHealth();
    
    const healthStatus = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'core-service',
      version: '5.0.0',
      database: dbHealthy ? 'connected' : 'disconnected',
      uptime: process.uptime()
    };

    res.json(healthStatus);
  } catch (error) {
    logger.error('Health check failed', error as Error);
    
    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      service: 'core-service',
      version: '5.0.0',
      error: 'Service unavailable'
    });
  }
});

export default router;