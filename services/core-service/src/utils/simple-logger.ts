// Simple logger to replace @xafra/shared/logger
export const logger = {
  info: (message: string, ...args: any[]) => {
    console.log(`[INFO] ${message}`, ...args);
  },
  warn: (message: string, ...args: any[]) => {
    console.warn(`[WARN] ${message}`, ...args);
  },
  error: (message: string, error?: Error, ...args: any[]) => {
    console.error(`[ERROR] ${message}`, error, ...args);
  },
  debug: (message: string, ...args: any[]) => {
    console.log(`[DEBUG] ${message}`, ...args);
  }
};

// Simple loggers for tracking
export const loggers = {
  tracking: (action: string, trackingId: string, productId: number, data?: any) => {
    console.log(`[TRACKING] ${action} - trackingId: ${trackingId}, productId: ${productId}`, data);
  },
  error: (message: string, error: any, data?: any) => {
    console.error(`[ERROR] ${message}`, error, data || {});
  },
  security: (event: string, ip: string, data?: any) => {
    console.warn(`[SECURITY] ${event} - IP: ${ip}`, data || {});
  }
};