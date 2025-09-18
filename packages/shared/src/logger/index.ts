import winston from 'winston';

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

winston.addColors(colors);

// Define format for logs
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`
  )
);

// Define transports
const transports = [
  // Console transport
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }),
  
  // File transport for errors
  new winston.transports.File({
    filename: 'logs/error.log',
    level: 'error',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    )
  }),
  
  // File transport for all logs
  new winston.transports.File({
    filename: 'logs/combined.log',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    )
  }),
];

// Create logger instance
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  levels,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { 
    service: process.env.SERVICE_NAME || 'xafra-service',
    version: process.env.SERVICE_VERSION || '1.0.0'
  },
  transports,
});

// Performance tracking
export const performanceLogger = {
  track: (operation: string, startTime: number, metadata?: Record<string, any>) => {
    const duration = Date.now() - startTime;
    logger.info(`Performance: ${operation}`, {
      operation,
      duration,
      ...metadata
    });
    
    // Alert if operation takes too long (especially for ads redirects)
    if (operation.includes('redirect') && duration > 50) {
      logger.warn(`Slow redirect detected: ${duration}ms`, {
        operation,
        duration,
        ...metadata
      });
    }
    
    return duration;
  }
};

// Structured logging helpers
export const loggers = {
  request: (method: string, url: string, statusCode: number, duration: number, metadata?: Record<string, any>) => {
    logger.info('HTTP Request', {
      method,
      url,
      statusCode,
      duration,
      ...metadata
    });
  },

  database: (operation: string, table: string, duration: number, metadata?: Record<string, any>) => {
    logger.debug('Database Operation', {
      operation,
      table,
      duration,
      ...metadata
    });
  },

  tracking: (action: string, trackingId: string, productId?: number, metadata?: Record<string, any>) => {
    logger.info('Tracking Event', {
      action,
      trackingId,
      productId,
      ...metadata
    });
  },

  auth: (event: string, apikey: string | null, customerId: number | null, metadata?: Record<string, any>) => {
    logger.info('Auth Event', {
      event,
      apikey,
      customerId,
      timestamp: new Date().toISOString(),
      ...metadata
    });
  },

  security: (event: string, ip: string, metadata?: Record<string, any>) => {
    logger.warn('Security Event', {
      event,
      ip,
      timestamp: new Date().toISOString(),
      ...metadata
    });
  },

  error: (message: string, error: Error, metadata?: Record<string, any>) => {
    logger.error(message, {
      error: error.message,
      stack: error.stack,
      ...metadata
    });
  }
};