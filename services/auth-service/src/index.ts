import dotenv from 'dotenv';
dotenv.config({ path: '../../.env' });

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';

import { logger, loggers } from './utils/simple-logger';
import { errorHandler, notFoundHandler, requestLogger, securityMiddleware } from './utils/simple-middleware';
import { getConfig } from './utils/simple-config';
import { connectDatabase, checkDatabaseHealth } from './utils/simple-database';
import { getCacheService } from './utils/simple-cache';

// Import routes
import authRoutes from './routes/auth.js';
import apiKeyRoutes from './routes/apikeys.js';
import customerRoutes from './routes/customers.js';
import sessionRoutes from './routes/sessions.js';
import healthRoutes from './routes/health.js';

const app = express();
const config = getConfig();

// Override port for auth-service - use PORT for Cloud Run compatibility
config.service.port = parseInt(process.env.PORT || process.env.AUTH_SERVICE_PORT || '8081', 10);

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
app.use('/auth', authRoutes);           // Authentication endpoints
app.use('/apikeys', apiKeyRoutes);      // API key management
app.use('/customers', customerRoutes);  // Customer management
app.use('/sessions', sessionRoutes);    // Session management

// Default info endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'Xafra Ads Auth Service',
    version: '5.0.0',
    status: 'running',
    timestamp: new Date().toISOString(),
    endpoints: {
      auth: '/auth',
      apikeys: '/apikeys',
      customers: '/customers',
      sessions: '/sessions',
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
      logger.info(`🚀 Auth Service started successfully`, {
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
          logger.info('✅ Auth Service shut down gracefully');
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
    loggers.error('Failed to start Auth Service', error as Error);
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