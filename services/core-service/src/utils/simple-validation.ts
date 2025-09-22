// Simple validation middleware replacement for @xafra/shared/middleware/auth

import { Request, Response, NextFunction } from 'express';

export const validateRequest = (schema: any) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Simple validation - in production this should use proper schema validation
    const { apikey, product_id } = req.body;
    
    if (!apikey) {
      res.status(400).json({ error: 'API key is required' });
      return;
    }
    
    if (product_id === undefined || product_id === null) {
      res.status(400).json({ error: 'Product ID is required' });
      return;
    }
    
    next();
  };
};