import dotenv from 'dotenv';
dotenv.config({ path: '../../.env' });

import express from 'express';
import { dbService } from './utils/database.js';
import { redisService } from './utils/redis.js';

// Import routes
import postbackRoutes from './routes/postbacks.js';
import healthRoutes from './routes/health.js';

const app = express();
const port = process.env.POSTBACK_SERVICE_PORT || 8084;

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Simple security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// Logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.originalUrl} - ${res.statusCode} (${duration}ms)`);
  });
  
  next();
});

// Initialize services
async function initializeServices() {
  try {
    console.log('🔄 Initializing services...');
    
    // Initialize Redis connection
    const redisConnected = await redisService.connect();
    if (!redisConnected) {
      console.warn('⚠️ Redis connection failed, retry queue will be disabled');
    }
    
    // Test database connection
    const dbHealth = await dbService.healthCheck();
    if (dbHealth.status !== 'healthy') {
      console.warn('⚠️ Database connection issues:', dbHealth.error);
    }
    
    console.log('✅ Services initialized');
  } catch (error) {
    console.error('❌ Service initialization failed:', error);
  }
}

// Routes
app.use('/api/postbacks', postbackRoutes);
app.use('/api/health', healthRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'Xafra Postback Service',
    version: process.env.npm_package_version || '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString(),
    endpoints: {
      postbacks: '/api/postbacks',
      health: '/api/health'
    },
    description: 'Real-time webhook notifications with PostgreSQL and Redis integration',
    environment: process.env.NODE_ENV || 'development'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    service: 'postback-service',
    path: req.originalUrl,
    timestamp: new Date().toISOString()
  });
});

// Error handling
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', error);
  
  res.status(500).json({
    error: 'Internal server error',
    service: 'postback-service',
    timestamp: new Date().toISOString(),
    ...(process.env.NODE_ENV === 'development' ? { details: error.message } : {})
  });
});

// Start server
app.listen(port, async () => {
  console.log(`🚀 Postback Service started on port ${port}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🗄️ Database Schema: ${process.env.NODE_ENV === 'production' ? 'production' : process.env.NODE_ENV === 'staging' ? 'staging' : 'public'}`);
  
  // Initialize services after server starts
  await initializeServices();
});

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
  console.log(`${signal} received, shutting down gracefully`);
  
  try {
    await redisService.disconnect();
    await dbService.disconnect();
    console.log('✅ Services disconnected');
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
  }
  
  process.exit(0);
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

export default app;