export interface DatabaseConfig {
  url: string;
  maxConnections: number;
  connectionTimeout: number;
  idleTimeout: number;
}

export interface RedisConfig {
  url: string;
  defaultTTL: number;
  keyPrefix: string;
  maxRetries: number;
}

export interface SecurityConfig {
  encryptionKey: string;
  encryptionSalt: string;
  jwtSecret: string;
  apiRateLimit: number;
  allowedOrigins: string[];
}

export interface ServiceConfig {
  port: number;
  name: string;
  version: string;
  environment: 'development' | 'staging' | 'production';
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

export interface PerformanceConfig {
  maxRedirectTime: number;
  webhookTimeout: number;
  cacheEnabled: boolean;
  cacheTTL: {
    product: number;
    tracking: number;
    conversionRate: number;
  };
}

export interface KolbiConfig {
  trackingLength: number;
  trackingPrefix: string;
  enabled: boolean;
}

export interface XafraConfig {
  database: DatabaseConfig;
  redis: RedisConfig;
  security: SecurityConfig;
  service: ServiceConfig;
  performance: PerformanceConfig;
  kolbi: KolbiConfig;
}

// Default configuration values
const defaultConfig: XafraConfig = {
  database: {
    url: 'postgresql://localhost:5432/xafra_ads_v5',
    maxConnections: 20,
    connectionTimeout: 10000,
    idleTimeout: 30000,
  },
  redis: {
    url: 'redis://localhost:6379',
    defaultTTL: 3600,
    keyPrefix: 'xafra',
    maxRetries: 3,
  },
  security: {
    encryptionKey: 'default-key-change-in-production',
    encryptionSalt: 'default-salt-change-in-production',
    jwtSecret: 'default-jwt-secret-change-in-production-with-at-least-32-chars',
    apiRateLimit: 1000,
    allowedOrigins: ['http://localhost:3000'],
  },
  service: {
    port: 3001,
    name: 'xafra-service',
    version: '5.0.0',
    environment: 'development',
    logLevel: 'info',
  },
  performance: {
    maxRedirectTime: 50,
    webhookTimeout: 5000,
    cacheEnabled: true,
    cacheTTL: {
      product: 3600, // 1 hour
      tracking: 1800, // 30 minutes
      conversionRate: 300, // 5 minutes
    },
  },
  kolbi: {
    trackingLength: 6,
    trackingPrefix: 'KLB',
    enabled: true,
  },
};

// Environment variable mapping
const getConfigFromEnv = (): Partial<XafraConfig> => {
  return {
    database: {
      url: process.env.DATABASE_URL || defaultConfig.database.url,
      maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || '20', 10),
      connectionTimeout: parseInt(process.env.DB_CONNECTION_TIMEOUT || '10000', 10),
      idleTimeout: parseInt(process.env.DB_IDLE_TIMEOUT || '30000', 10),
    },
    redis: {
      url: process.env.REDIS_URL || defaultConfig.redis.url,
      defaultTTL: parseInt(process.env.REDIS_DEFAULT_TTL || '3600', 10),
      keyPrefix: process.env.REDIS_KEY_PREFIX || defaultConfig.redis.keyPrefix,
      maxRetries: parseInt(process.env.REDIS_MAX_RETRIES || '3', 10),
    },
    security: {
      encryptionKey: process.env.ENCRYPTION_KEY || defaultConfig.security.encryptionKey,
      encryptionSalt: process.env.ENCRYPTION_SALT || defaultConfig.security.encryptionSalt,
      jwtSecret: process.env.JWT_SECRET || defaultConfig.security.jwtSecret,
      apiRateLimit: parseInt(process.env.API_RATE_LIMIT || '1000', 10),
      allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || defaultConfig.security.allowedOrigins,
    },
    service: {
      port: parseInt(process.env.PORT || '3001', 10),
      name: process.env.SERVICE_NAME || defaultConfig.service.name,
      version: process.env.SERVICE_VERSION || defaultConfig.service.version,
      environment: (process.env.NODE_ENV as any) || defaultConfig.service.environment,
      logLevel: (process.env.LOG_LEVEL as any) || defaultConfig.service.logLevel,
    },
    performance: {
      maxRedirectTime: parseInt(process.env.MAX_REDIRECT_TIME || '50', 10),
      webhookTimeout: parseInt(process.env.WEBHOOK_TIMEOUT || '5000', 10),
      cacheEnabled: process.env.CACHE_ENABLED !== 'false',
      cacheTTL: {
        product: parseInt(process.env.CACHE_TTL_PRODUCT || '3600', 10),
        tracking: parseInt(process.env.CACHE_TTL_TRACKING || '1800', 10),
        conversionRate: parseInt(process.env.CACHE_TTL_CONVERSION_RATE || '300', 10),
      },
    },
    kolbi: {
      trackingLength: parseInt(process.env.KOLBI_SHORT_TRACKING_LENGTH || '6', 10),
      trackingPrefix: process.env.KOLBI_TRACKING_PREFIX || defaultConfig.kolbi.trackingPrefix,
      enabled: process.env.KOLBI_ENABLED !== 'false',
    },
  };
};

// Merge default config with environment overrides
export const createConfig = (): XafraConfig => {
  const envConfig = getConfigFromEnv();
  
  return {
    database: { ...defaultConfig.database, ...envConfig.database },
    redis: { ...defaultConfig.redis, ...envConfig.redis },
    security: { ...defaultConfig.security, ...envConfig.security },
    service: { ...defaultConfig.service, ...envConfig.service },
    performance: { ...defaultConfig.performance, ...envConfig.performance },
    kolbi: { ...defaultConfig.kolbi, ...envConfig.kolbi },
  };
};

// Validate configuration
export const validateConfig = (config: XafraConfig): void => {
  const errors: string[] = [];

  // Database validation
  if (!config.database.url) {
    errors.push('Database URL is required');
  }

  // Security validation
  if (config.security.encryptionKey.length < 32) {
    errors.push('Encryption key must be at least 32 characters long');
  }

  if (config.security.jwtSecret.length < 32) {
    errors.push('JWT secret must be at least 32 characters long');
  }

  // Service validation
  if (config.service.port < 1 || config.service.port > 65535) {
    errors.push('Service port must be between 1 and 65535');
  }

  // Performance validation
  if (config.performance.maxRedirectTime > 1000) {
    console.warn('Max redirect time is set to more than 1000ms, this may impact ad performance');
  }

  if (errors.length > 0) {
    throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
  }
};

// Singleton configuration instance
let configInstance: XafraConfig | null = null;

export const getConfig = (): XafraConfig => {
  if (!configInstance) {
    configInstance = createConfig();
    validateConfig(configInstance);
  }
  return configInstance;
};

// Export specific config sections for convenience
export const getDatabaseConfig = (): DatabaseConfig => getConfig().database;
export const getRedisConfig = (): RedisConfig => getConfig().redis;
export const getSecurityConfig = (): SecurityConfig => getConfig().security;
export const getServiceConfig = (): ServiceConfig => getConfig().service;
export const getPerformanceConfig = (): PerformanceConfig => getConfig().performance;
export const getKolbiConfig = (): KolbiConfig => getConfig().kolbi;