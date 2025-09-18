import { Request, Response, NextFunction } from 'express';
import { logger } from '../logger/index.js';

export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  logger.error('Unhandled error', {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    headers: req.headers,
    body: req.body
  });

  // Don't leak error details in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  res.status(500).json({
    error: 'Internal server error',
    ...(isDevelopment && { details: error.message, stack: error.stack })
  });
};

export const notFoundHandler = (req: Request, res: Response): void => {
  logger.warn('Route not found', {
    url: req.url,
    method: req.method,
    ip: req.ip
  });

  res.status(404).json({
    error: 'Route not found',
    path: req.url,
    method: req.method
  });
};

export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('Request completed', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
  });

  next();
};