import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import compression from 'compression';
import cors from 'cors';

export const securityMiddleware = [
  // CORS configuration
  cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key']
  }),

  // Security headers
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false,
  }),

  // Compression
  compression({
    filter: (req: Request, res: Response) => {
      if (req.headers['x-no-compression']) {
        return false;
      }
      return compression.filter(req, res);
    },
    threshold: 1024
  })
];

export const rateLimitByIP = (windowMs: number, max: number) => {
  const requests = new Map<string, { count: number; resetTime: number }>();

  return (req: Request, res: Response, next: NextFunction): void => {
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const now = Date.now();
    const windowStart = now - windowMs;

    // Clean old entries
    for (const [key, value] of requests.entries()) {
      if (value.resetTime < windowStart) {
        requests.delete(key);
      }
    }

    const current = requests.get(ip) || { count: 0, resetTime: now + windowMs };
    
    if (current.resetTime < now) {
      current.count = 1;
      current.resetTime = now + windowMs;
    } else {
      current.count++;
    }

    requests.set(ip, current);

    if (current.count > max) {
      res.status(429).json({
        error: 'Too many requests',
        retryAfter: Math.ceil((current.resetTime - now) / 1000)
      });
      return;
    }

    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, max - current.count));
    res.setHeader('X-RateLimit-Reset', Math.ceil(current.resetTime / 1000));

    next();
  };
};