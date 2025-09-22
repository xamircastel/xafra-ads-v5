// Simple security middleware replacement for @xafra/shared/middleware/security

import { Request, Response, NextFunction } from 'express';

export const securityMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Simple security headers - in production use helmet and other security measures
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  next();
};