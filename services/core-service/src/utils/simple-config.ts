// Simple config replacement for @xafra/shared/config

export const getConfig = () => {
  return {
    port: parseInt(process.env.PORT || '8080', 10),
    environment: process.env.NODE_ENV || 'development',
    service: {
      port: parseInt(process.env.CORE_SERVICE_PORT || '8080', 10),
      environment: process.env.NODE_ENV || 'development',
      version: process.env.SERVICE_VERSION || '1.0.0'
    },
    database: {
      url: process.env.DATABASE_URL || '',
      schema: process.env.DATABASE_SCHEMA || 'public'
    },
    redis: {
      url: process.env.REDIS_URL || '',
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379')
    },
    encryption: {
      key: process.env.ENCRYPTION_KEY || 'default-key'
    }
  };
};