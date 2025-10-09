import dotenv from 'dotenv';
dotenv.config({ path: '../../.env' });

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import path from 'path';

import { logger, loggers } from './utils/simple-logger';
import { errorHandler, notFoundHandler, requestLogger } from './utils/simple-middleware';
import { securityMiddleware } from './utils/simple-security';
import { getConfig } from './utils/simple-config';
import { connectDatabase, checkDatabaseHealth } from './utils/simple-database';
import { getCacheService } from './utils/simple-cache';

// Import routes
import adsRoutes from './routes/ads';
import confirmRoutes from './routes/confirm';
import configRoutes from './routes/config';
import utilRoutes from './routes/util';
import healthRoutes from './routes/health';
import conversionRoutes from './routes/google-conversions';

const app = express();
const config = getConfig();

// Override port for core-service (main service)
config.service.port = parseInt(process.env.PORT || process.env.CORE_SERVICE_PORT || '8080', 10);

// Trust proxy for accurate IP addresses in load balancer setup
app.set('trust proxy', true);

// Configure helmet with relaxed CSP for development
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      fontSrc: ["'self'", "data:"],
    },
  },
}));

// Serve static files
app.use(express.static(path.join(__dirname, '../public')));

// Apply security middleware (after helmet configuration)
// app.use(securityMiddleware); // Disabled to avoid conflict with helmet

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

// Homepage route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Main routes
app.use('/ads', adsRoutes);           // High-performance tracking URLs
app.use('/api/confirm', confirmRoutes);   // Sale confirmation endpoints
app.use('/api/config', configRoutes); // Configuration endpoints (Kolbi)
app.use('/api/util', utilRoutes);     // Utility endpoints (encrypt/decrypt)
app.use('/service/v1', conversionRoutes); // Conversion tracking endpoints (Google Ads, etc.)

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
      logger.info(`🚀 Core Service started successfully`, {
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
          logger.info('✅ Core Service shut down gracefully');
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
    loggers.error('Failed to start Core Service', error as Error);
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