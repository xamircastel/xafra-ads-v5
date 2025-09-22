// Simple authentication middleware replacement for @xafra/shared/middleware

import { Request, Response, NextFunction } from 'express';

export const authenticate = (req: Request, res: Response, next: NextFunction): void => {
  // Simple API key authentication
  const apiKey = req.headers['x-api-key'] as string;
  
  if (!apiKey) {
    res.status(401).json({ error: 'API key required' });
    return;
  }
  
  // For now, just accept any API key - in production this should validate against database
  // This is a simplified version for Docker build compatibility
  next();
};