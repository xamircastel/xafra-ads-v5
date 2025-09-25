// Simple middleware implementations for auth-service
// Replaces @xafra/shared/middleware dependencies

import { Request, Response, NextFunction } from 'express';
import { loggers } from './simple-logger';

// Error handling middleware
export function errorHandler(error: any, req: Request, res: Response, next: NextFunction): void {
  loggers.error('Unhandled error', error, {
    path: req.path,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  if (res.headersSent) {
    return next(error);
  }

  const statusCode = error.statusCode || error.status || 500;
  
  res.status(statusCode).json({
    success: false,
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : error.message || 'Unknown error',
    code: error.code || 'INTERNAL_ERROR',
    timestamp: new Date().toISOString(),
    path: req.path
  });
}

// 404 handler
export function notFoundHandler(req: Request, res: Response): void {
  loggers.warn('Route not found', {
    path: req.path,
    method: req.method,
    ip: req.ip
  });

  res.status(404).json({
    success: false,
    error: 'Route not found',
    code: 'NOT_FOUND',
    path: req.path,
    timestamp: new Date().toISOString()
  });
}

// Request logging middleware
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logLevel = res.statusCode >= 400 ? 'warn' : 'info';
    
    loggers[logLevel](`${req.method} ${req.path}`, {
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
  });

  next();
}

// Security middleware
export function securityMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Add security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Log potential security issues
  const suspiciousPatterns = [
    /script/i,
    /javascript/i,
    /vbscript/i,
    /onload/i,
    /onerror/i
  ];

  const userAgent = req.get('User-Agent') || '';
  const suspicious = suspiciousPatterns.some(pattern => pattern.test(userAgent));
  
  if (suspicious) {
    loggers.security('suspicious_user_agent', req.ip || '0.0.0.0', {
      userAgent,
      path: req.path
    });
  }

  next();
}