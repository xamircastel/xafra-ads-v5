import dotenv from 'dotenv';
dotenv.config({ path: '../../.env' });

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';

import { logger, loggers } from '@xafra/shared/logger';
import { errorHandler, notFoundHandler, requestLogger } from '@xafra/shared/middleware/error';
import { securityMiddleware } from '@xafra/shared/middleware/security';
import { getConfig } from '@xafra/shared/config';
import { connectDatabase, checkDatabaseHealth } from '@xafra/database';
import { getCacheService } from '@xafra/shared/cache';

// Import routes
import trackingRoutes from './routes/tracking.js';
import generateRoutes from './routes/generate.js';
import validateRoutes from './routes/validate.js';
import analyticsRoutes from './routes/analytics.js';
import healthRoutes from './routes/health.js';

const app = express();
const config = getConfig();

// Override port for tracking-service
config.service.port = parseInt(process.env.PORT || process.env.TRACKING_SERVICE_PORT || '8082', 10);

// Trust proxy for accurate IP addresses in load balancer setup
app.set('trust proxy', true);

// Apply security middleware
app.use(securityMiddleware);

// Request parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
app.use(morgan('combined', {
  stream: {
    write: (message: string) => {
      logger.info(message.trim());
    }
  }
}));

app.use(requestLogger);

// Health check endpoint (before other routes for load balancer)
app.use('/health', healthRoutes);

// Main routes
app.use('/tracking', trackingRoutes);     // Track ID management
app.use('/generate', generateRoutes);     // ID generation endpoints
app.use('/validate', validateRoutes);     // Validation endpoints
app.use('/analytics', analyticsRoutes);   // Analytics and reporting

// Default info endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'Xafra Ads Tracking Service',
    version: '5.0.0',
    status: 'running',
    timestamp: new Date().toISOString(),
    endpoints: {
      tracking: '/tracking/:trackingId',
      generate: '/generate/tracking',
      validate: '/validate/:trackingId',
      analytics: '/analytics/performance',
      health: '/health'
    }
  });
});

// Global error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Server startup
const startServer = async (): Promise<void> => {
  try {
    // Initialize database connection
    await connectDatabase();
    
    // Initialize cache service
    const cacheService = getCacheService();
    await cacheService.connect();

    // Check database health
    const dbHealthy = await checkDatabaseHealth();
    if (!dbHealthy) {
      throw new Error('Database health check failed');
    }

    // Start server
    const server = app.listen(config.service.port, () => {
      logger.info(`🚀 Tracking Service started successfully`, {
        port: config.service.port,
        environment: config.service.environment,
        version: config.service.version,
        database: 'connected',
        cache: 'connected'
      });
    });

    // Graceful shutdown
    const gracefulShutdown = async (signal: string) => {
      logger.info(`📡 Received ${signal}. Starting graceful shutdown...`);
      
      server.close(async () => {
        try {
          await cacheService.disconnect();
          logger.info('✅ Tracking Service shut down gracefully');
          process.exit(0);
        } catch (error) {
          loggers.error('Error during shutdown', error as Error);
          process.exit(1);
        }
      });

      // Force shutdown after 30 seconds
      setTimeout(() => {
        logger.error('💥 Forced shutdown due to timeout');
        process.exit(1);
      }, 30000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    loggers.error('Failed to start Tracking Service', error as Error);
    process.exit(1);
  }
};

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  loggers.error('Uncaught Exception', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  loggers.error('Unhandled Rejection', new Error(String(reason)), { promise });
  process.exit(1);
});

// Start the server
startServer();