import dotenv from 'dotenv';
dotenv.config({ path: '../../.env' });

import express from 'express';
import { loggers } from '@xafra/shared/logger';
import { errorHandler, securityMiddleware } from '@xafra/shared/middleware';

// Import routes
import postbackRoutes from './routes/postbacks.js';
import webhookRoutes from './routes/webhooks.js';
import retryRoutes from './routes/retry.js';
import healthRoutes from './routes/health.js';

const app = express();
const port = process.env['POSTBACK_SERVICE_PORT'] || 8084;

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(securityMiddleware);

// Logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    loggers.request(req.method, req.originalUrl, res.statusCode, duration, {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      service: 'postback-service'
    });
  });
  
  next();
});

// Routes
app.use('/api/postbacks', postbackRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/retry', retryRoutes);
app.use('/api/health', healthRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'Xafra Postback Service',
    version: process.env['npm_package_version'] || '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString(),
    endpoints: {
      postbacks: '/api/postbacks',
      webhooks: '/api/webhooks', 
      retry: '/api/retry',
      health: '/api/health'
    },
    description: 'Webhook notifications and delivery tracking service'
  });
});

// Error handling
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    service: 'postback-service',
    path: req.originalUrl,
    timestamp: new Date().toISOString()
  });
});

// Start server
app.listen(port, () => {
  console.log(`Postback Service started on port ${port}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Postback Service shutting down gracefully');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('Postback Service received SIGTERM, shutting down');
  process.exit(0);
});

export default app;