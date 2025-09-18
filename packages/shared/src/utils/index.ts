import { randomBytes } from 'crypto';

// Generate UUID v4
export const generateUUID = (): string => {
  const bytes = randomBytes(16);
  bytes[6] = (bytes[6]! & 0x0f) | 0x40; // Version 4
  bytes[8] = (bytes[8]! & 0x3f) | 0x80; // Variant bits

  const hex = bytes.toString('hex');
  return [
    hex.substring(0, 8),
    hex.substring(8, 12),
    hex.substring(12, 16),
    hex.substring(16, 20),
    hex.substring(20, 32)
  ].join('-');
};

// Generate API key
export const generateApiKey = (): string => {
  return randomBytes(16).toString('hex');
};

// Generate tracking ID
export const generateTrackingId = (prefix?: string): string => {
  const timestamp = Date.now().toString(36);
  const random = randomBytes(4).toString('hex');
  return prefix ? `${prefix}_${timestamp}_${random}` : `${timestamp}_${random}`;
};

// Generate short tracking for Kolbi (Costa Rica)
export const generateShortTracking = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// URL utilities
export const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

export const buildTrackingUrl = (
  baseUrl: string,
  encryptedId: string,
  path: 'ads' | 'ads/tr' | 'ads/random' = 'ads',
  tracker?: string
): string => {
  const url = new URL(`${baseUrl}/${path}/${encryptedId}`);
  if (tracker) {
    url.searchParams.set('tracker', tracker);
  }
  return url.toString();
};

export const buildConfirmUrl = (
  baseUrl: string,
  apiKey: string,
  tracking: string,
  isShort = false
): string => {
  const path = isShort ? 'confirm/short' : 'confirm';
  return `${baseUrl}/${path}/${apiKey}/${tracking}`;
};

// String utilities
export const sanitizeString = (str: string): string => {
  return str.replace(/[<>\"'&]/g, '');
};

export const truncateString = (str: string, maxLength: number): string => {
  return str.length > maxLength ? str.substring(0, maxLength) + '...' : str;
};

// Country and operator utilities
export const normalizeCountryCode = (country: string): string => {
  return country.toUpperCase().substring(0, 2);
};

export const normalizeOperatorCode = (operator: string): string => {
  return operator.trim().toUpperCase();
};

export const isKolbiOperator = (country?: string, operator?: string): boolean => {
  return country === 'CR' && operator?.toUpperCase() === 'KOLBI';
};

// Date utilities
export const getCurrentTimestamp = (): number => {
  return Date.now();
};

export const formatDate = (timestamp: number): string => {
  return new Date(timestamp).toISOString();
};

export const isWithinTimeframe = (timestamp: number, hoursAgo: number): boolean => {
  const timeframe = hoursAgo * 60 * 60 * 1000; // Convert hours to milliseconds
  return Date.now() - timestamp <= timeframe;
};

// Validation utilities
export const isValidProductId = (id: any): id is number => {
  return typeof id === 'number' && id > 0 && Number.isInteger(id);
};

export const isValidApiKey = (key: any): key is string => {
  return typeof key === 'string' && key.length === 32 && /^[a-f0-9]{32}$/.test(key);
};

export const isValidTrackingId = (tracking: any): tracking is string => {
  return typeof tracking === 'string' && tracking.length > 0 && tracking.length <= 255;
};

// Performance utilities
export const measureTime = <T>(fn: () => T): { result: T; duration: number } => {
  const start = Date.now();
  const result = fn();
  const duration = Date.now() - start;
  return { result, duration };
};

export const measureTimeAsync = async <T>(fn: () => Promise<T>): Promise<{ result: T; duration: number }> => {
  const start = Date.now();
  const result = await fn();
  const duration = Date.now() - start;
  return { result, duration };
};

// Network utilities
export const getClientIP = (req: any): string => {
  return req.headers['x-forwarded-for']?.split(',')[0] ||
         req.headers['x-real-ip'] ||
         req.connection?.remoteAddress ||
         req.socket?.remoteAddress ||
         req.ip ||
         'unknown';
};

export const getUserAgent = (req: any): string => {
  return req.headers['user-agent'] || 'unknown';
};

// Error utilities
export class XafraError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public details?: any
  ) {
    super(message);
    this.name = 'XafraError';
  }
}

export const createError = (
  message: string,
  code: string,
  statusCode: number = 500,
  details?: any
): XafraError => {
  return new XafraError(message, code, statusCode, details);
};

// Retry utilities
export const retry = async <T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  delay: number = 1000
): Promise<T> => {
  let lastError: Error;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === maxAttempts) {
        throw lastError;
      }

      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, delay * attempt));
    }
  }

  throw lastError!;
};

// Rate limiting utilities
export const createRateLimiter = (maxRequests: number, windowMs: number) => {
  const requests = new Map<string, { count: number; resetTime: number }>();

  return (identifier: string): { allowed: boolean; remaining: number; resetTime: number } => {
    const now = Date.now();
    const windowStart = now - windowMs;

    // Clean old entries
    for (const [key, value] of requests.entries()) {
      if (value.resetTime < windowStart) {
        requests.delete(key);
      }
    }

    const current = requests.get(identifier) || { count: 0, resetTime: now + windowMs };
    
    if (current.resetTime < now) {
      current.count = 1;
      current.resetTime = now + windowMs;
    } else {
      current.count++;
    }

    requests.set(identifier, current);

    return {
      allowed: current.count <= maxRequests,
      remaining: Math.max(0, maxRequests - current.count),
      resetTime: current.resetTime
    };
  };
};

// Math utilities for conversion rates
export const calculateConversionRate = (conversions: number, totalClicks: number): number => {
  if (totalClicks === 0) return 0;
  return Math.round((conversions / totalClicks) * 10000) / 10000; // 4 decimal places
};

export const calculateWeightedDistribution = (conversionRates: number[]): number[] => {
  const total = conversionRates.reduce((sum, rate) => sum + rate, 0);
  
  if (total === 0) {
    // Equal distribution if no conversion data
    const equalWeight = 1 / conversionRates.length;
    return conversionRates.map(() => equalWeight);
  }

  return conversionRates.map(rate => rate / total);
};

// Configuration utilities
export const getEnvVar = (name: string, defaultValue?: string): string => {
  const value = process.env[name];
  if (!value && !defaultValue) {
    throw new Error(`Environment variable ${name} is required`);
  }
  return value || defaultValue!;
};

export const getEnvVarAsNumber = (name: string, defaultValue?: number): number => {
  const value = process.env[name];
  if (!value && defaultValue === undefined) {
    throw new Error(`Environment variable ${name} is required`);
  }
  
  const parsed = parseInt(value || defaultValue!.toString(), 10);
  if (isNaN(parsed)) {
    throw new Error(`Environment variable ${name} must be a valid number`);
  }
  
  return parsed;
};

export const getEnvVarAsBoolean = (name: string, defaultValue?: boolean): boolean => {
  const value = process.env[name];
  if (!value && defaultValue === undefined) {
    throw new Error(`Environment variable ${name} is required`);
  }
  
  if (!value) return defaultValue!;
  
  return ['true', '1', 'yes', 'on'].includes(value.toLowerCase());
};