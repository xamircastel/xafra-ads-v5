// Simple logger implementation for auth-service
// Replaces @xafra/shared/logger dependencies

interface LogContext {
  [key: string]: any;
}

class SimpleLogger {
  private serviceName: string;

  constructor(serviceName: string = 'auth-service') {
    this.serviceName = serviceName;
  }

  private formatMessage(level: string, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` | Context: ${JSON.stringify(context)}` : '';
    return `[${timestamp}] [${level}] [${this.serviceName}] ${message}${contextStr}`;
  }

  info(message: string, context?: LogContext) {
    console.log(this.formatMessage('INFO', message, context));
  }

  error(message: string, error?: Error | unknown, context?: LogContext) {
    const errorInfo = error instanceof Error ? ` | Error: ${error.message}` : '';
    console.error(this.formatMessage('ERROR', message, context) + errorInfo);
    if (error instanceof Error && error.stack) {
      console.error(error.stack);
    }
  }

  warn(message: string, context?: LogContext) {
    console.warn(this.formatMessage('WARN', message, context));
  }

  debug(message: string, context?: LogContext) {
    if (process.env.NODE_ENV === 'development') {
      console.debug(this.formatMessage('DEBUG', message, context));
    }
  }

  // Specific loggers for different types of events
  security(event: string, ip: string, context?: LogContext) {
    this.warn(`Security Event: ${event} from IP ${ip}`, context);
  }

  auth(event: string, userId?: string | number, context?: LogContext) {
    this.info(`Auth Event: ${event}${userId ? ` for user ${userId}` : ''}`, context);
  }

  apikey(event: string, keyId?: string, context?: LogContext) {
    this.info(`API Key Event: ${event}${keyId ? ` for key ${keyId}` : ''}`, context);
  }

  customer(event: string, customerId?: string | number, context?: LogContext) {
    this.info(`Customer Event: ${event}${customerId ? ` for customer ${customerId}` : ''}`, context);
  }
}

// Create singleton instances
export const logger = new SimpleLogger('auth-service');

// Export loggers object for compatibility
export const loggers = {
  auth: (event: string, userId?: string | number, context?: LogContext) => 
    logger.auth(event, userId, context),
  security: (event: string, ip: string, context?: LogContext) => 
    logger.security(event, ip, context),
  apikey: (event: string, keyId?: string, context?: LogContext) => 
    logger.apikey(event, keyId, context),
  customer: (event: string, customerId?: string | number, context?: LogContext) => 
    logger.customer(event, customerId, context),
  error: (message: string, error?: Error | unknown, context?: LogContext) => 
    logger.error(message, error, context),
  info: (message: string, context?: LogContext) => 
    logger.info(message, context),
  warn: (message: string, context?: LogContext) => 
    logger.warn(message, context),
  debug: (message: string, context?: LogContext) => 
    logger.debug(message, context)
};