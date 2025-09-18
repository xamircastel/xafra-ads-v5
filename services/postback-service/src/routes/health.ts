import { Router, Request, Response } from 'express';

const router = Router();

// Health check endpoint
router.get('/', async (req: Request, res: Response) => {
  const startTime = Date.now();
  
  try {
    // Mock health checks - in real implementation, check actual dependencies
    const healthChecks = {
      service: 'healthy',
      dependencies: {
        database: await checkDatabase(),
        cache: await checkCache(),
        external_apis: await checkExternalAPIs()
      },
      queue: await checkRetryQueue(),
      metrics: await getServiceMetrics()
    };

    const totalDuration = Date.now() - startTime;
    const allHealthy = Object.values(healthChecks.dependencies).every(check => check.status === 'healthy');

    res.status(allHealthy ? 200 : 503).json({
      status: allHealthy ? 'healthy' : 'degraded',
      service: 'postback-service',
      timestamp: new Date().toISOString(),
      version: process.env['npm_package_version'] || '1.0.0',
      uptime: process.uptime(),
      environment: process.env['NODE_ENV'] || 'development',
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

// Detailed health check
router.get('/detailed', async (req: Request, res: Response) => {
  const startTime = Date.now();
  const healthChecks: any = {};

  try {
    // Database health check
    try {
      const dbCheck = await checkDatabase();
      healthChecks.database = dbCheck;
    } catch (dbError) {
      healthChecks.database = {
        status: 'unhealthy',
        error: dbError instanceof Error ? dbError.message : 'Database check failed',
        responseTime: 0
      };
    }

    // Cache health check
    try {
      const cacheCheck = await checkCache();
      healthChecks.cache = cacheCheck;
    } catch (cacheError) {
      healthChecks.cache = {
        status: 'unhealthy',
        error: cacheError instanceof Error ? cacheError.message : 'Cache check failed',
        responseTime: 0
      };
    }

    // External APIs health check
    try {
      const apiCheck = await checkExternalAPIs();
      healthChecks.external_apis = apiCheck;
    } catch (apiError) {
      healthChecks.external_apis = {
        status: 'unhealthy',
        error: apiError instanceof Error ? apiError.message : 'External API check failed',
        responseTime: 0
      };
    }

    // Retry queue health check
    try {
      const queueCheck = await checkRetryQueue();
      healthChecks.retry_queue = queueCheck;
    } catch (queueError) {
      healthChecks.retry_queue = {
        status: 'unhealthy',
        error: queueError instanceof Error ? queueError.message : 'Queue check failed'
      };
    }

    // Service metrics
    try {
      const metrics = await getServiceMetrics();
      healthChecks.metrics = {
        status: 'healthy',
        data: metrics
      };
    } catch (metricsError) {
      healthChecks.metrics = {
        status: 'degraded',
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
      service: 'postback-service',
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
      service: 'postback-service',
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
    // Quick readiness checks
    const isReady = await checkServiceReadiness();
    
    if (isReady) {
      res.status(200).json({
        status: 'ready',
        service: 'postback-service',
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(503).json({
        status: 'not_ready',
        service: 'postback-service',
        timestamp: new Date().toISOString(),
        reason: 'Service dependencies not available'
      });
    }
  } catch (error) {
    res.status(503).json({
      status: 'not_ready',
      service: 'postback-service',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Service not ready'
    });
  }
});

// Live check - for Kubernetes liveness probe
router.get('/live', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'alive',
    service: 'postback-service',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Queue health check endpoint
router.get('/queue', async (req: Request, res: Response) => {
  try {
    const queueHealth = await checkRetryQueue();
    
    res.json({
      success: true,
      data: queueHealth,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Queue health check failed:', error);
    
    res.status(500).json({
      error: 'Failed to check queue health',
      code: 'QUEUE_HEALTH_CHECK_ERROR',
      timestamp: new Date().toISOString()
    });
  }
});

// Webhook endpoints health
router.get('/webhooks', async (req: Request, res: Response) => {
  try {
    const webhookHealth = await checkWebhookEndpoints();
    
    res.json({
      success: true,
      data: webhookHealth,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Webhook health check failed:', error);
    
    res.status(500).json({
      error: 'Failed to check webhook health',
      code: 'WEBHOOK_HEALTH_CHECK_ERROR',
      timestamp: new Date().toISOString()
    });
  }
});

// Helper functions
async function checkDatabase(): Promise<any> {
  const startTime = Date.now();
  
  try {
    // Mock database check
    await new Promise(resolve => setTimeout(resolve, 50));
    
    return {
      status: 'healthy',
      responseTime: Date.now() - startTime,
      connection: 'active',
      pool_size: 10,
      active_connections: 3
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      responseTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Database connection failed'
    };
  }
}

async function checkCache(): Promise<any> {
  const startTime = Date.now();
  
  try {
    // Mock cache check
    await new Promise(resolve => setTimeout(resolve, 25));
    
    return {
      status: 'healthy',
      responseTime: Date.now() - startTime,
      connection: 'active',
      memory_usage: '45%',
      keys_count: 1250
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      responseTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Cache connection failed'
    };
  }
}

async function checkExternalAPIs(): Promise<any> {
  const startTime = Date.now();
  
  try {
    // Mock external API checks
    const apiChecks = [
      { name: 'webhook_endpoint_1', status: 'healthy', responseTime: 120 },
      { name: 'webhook_endpoint_2', status: 'healthy', responseTime: 95 },
      { name: 'webhook_endpoint_3', status: 'degraded', responseTime: 3500 }
    ];
    
    const healthyAPIs = apiChecks.filter(api => api.status === 'healthy').length;
    const totalAPIs = apiChecks.length;
    
    return {
      status: healthyAPIs === totalAPIs ? 'healthy' : healthyAPIs > 0 ? 'degraded' : 'unhealthy',
      responseTime: Date.now() - startTime,
      healthy_apis: healthyAPIs,
      total_apis: totalAPIs,
      apis: apiChecks
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      responseTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'External API check failed'
    };
  }
}

async function checkRetryQueue(): Promise<any> {
  try {
    // Mock retry queue check
    const queueStats = {
      total_items: 25,
      pending_items: 15,
      processing_items: 2,
      failed_items: 5,
      completed_items: 3,
      oldest_pending: new Date(Date.now() - 300000).toISOString(), // 5 minutes ago
      avg_processing_time: 2500
    };
    
    const queueHealth = queueStats.pending_items < 100 && queueStats.failed_items < 20;
    
    return {
      status: queueHealth ? 'healthy' : 'degraded',
      queue_size: queueStats.total_items,
      pending: queueStats.pending_items,
      processing: queueStats.processing_items,
      failed: queueStats.failed_items,
      completed: queueStats.completed_items,
      oldest_pending: queueStats.oldest_pending,
      avg_processing_time: queueStats.avg_processing_time,
      health_threshold: {
        max_pending: 100,
        max_failed: 20
      }
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Queue check failed'
    };
  }
}

async function getServiceMetrics(): Promise<any> {
  return {
    postbacks: {
      total_sent: 12450,
      successful: 11890,
      failed: 560,
      success_rate: 95.5,
      avg_response_time: 1850
    },
    webhooks: {
      total_registered: 15,
      active: 12,
      inactive: 3,
      total_received: 8750,
      processed_successfully: 8640
    },
    retry_queue: {
      items_processed_today: 145,
      avg_retry_attempts: 2.3,
      retry_success_rate: 78.5
    },
    performance: {
      avg_processing_time: 250,
      throughput_per_minute: 45,
      error_rate: 4.5
    }
  };
}

async function checkServiceReadiness(): Promise<boolean> {
  try {
    // Quick checks for service readiness
    const dbCheck = await checkDatabase();
    const cacheCheck = await checkCache();
    
    return dbCheck.status === 'healthy' && cacheCheck.status === 'healthy';
  } catch (error) {
    return false;
  }
}

async function checkWebhookEndpoints(): Promise<any> {
  return {
    registered_webhooks: 15,
    active_webhooks: 12,
    inactive_webhooks: 3,
    recent_activity: {
      last_24h: {
        requests_received: 1250,
        requests_processed: 1198,
        avg_response_time: 180
      }
    },
    endpoint_health: [
      {
        webhook_id: 'wh_001',
        source: 'traffic_source_1',
        status: 'healthy',
        last_request: new Date(Date.now() - 300000).toISOString(),
        success_rate: 98.5
      },
      {
        webhook_id: 'wh_002',
        source: 'traffic_source_2',
        status: 'healthy',
        last_request: new Date(Date.now() - 600000).toISOString(),
        success_rate: 97.2
      }
    ]
  };
}

export default router;