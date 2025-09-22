// Simple middleware replacements for @xafra/shared/middleware

import { Request, Response, NextFunction } from 'express';

export const errorHandler = (error: any, req: Request, res: Response, next: NextFunction) => {
  console.error('[ERROR HANDLER]', error);
  
  if (res.headersSent) {
    return next(error);
  }
  
  const status = error.status || error.statusCode || 500;
  const message = error.message || 'Internal Server Error';
  
  res.status(status).json({
    error: message,
    status,
    timestamp: new Date().toISOString()
  });
};

export const notFoundHandler = (req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.originalUrl} not found`,
    status: 404,
    timestamp: new Date().toISOString()
  });
};

export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[REQUEST] ${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`);
  });
  
  next();
};