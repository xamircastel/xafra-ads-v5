import { Request, Response, NextFunction } from 'express';
import { logger } from '../logger/index.js';

export interface AuthenticatedRequest extends Request {
  apiKey?: string;
  customerId?: number;
}

export const authenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const apiKey = req.headers['x-api-key'] as string || req.params.apikey;
    
    if (!apiKey) {
      res.status(401).json({ error: 'API key required' });
      return;
    }

    // TODO: Validate API key against database
    // For now, we'll store it in the request
    req.apiKey = apiKey;
    
    logger.info('Authentication successful', { apiKey: apiKey.substring(0, 8) + '...' });
    next();
  } catch (error) {
    logger.error('Authentication failed', error);
    res.status(401).json({ error: 'Invalid API key' });
  }
};

export const validateRequest = (schema: any) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const result = schema.safeParse(req.body);
      if (!result.success) {
        res.status(400).json({
          error: 'Validation failed',
          details: result.error.errors
        });
        return;
      }
      next();
    } catch (error) {
      logger.error('Request validation failed', error);
      res.status(400).json({ error: 'Invalid request format' });
    }
  };
};