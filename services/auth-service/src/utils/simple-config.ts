// Simple configuration for auth-service
// Replaces @xafra/shared/config dependencies

interface ServiceConfig {
  port: number;
  name: string;
  version: string;
  environment: string;
}

interface DatabaseConfig {
  url: string;
  maxConnections: number;
}

interface CacheConfig {
  type: 'memory' | 'redis';
  url?: string;
  ttl: number;
}

interface Config {
  service: ServiceConfig;
  database: DatabaseConfig;
  cache: CacheConfig;
  security: {
    rateLimitWindowMs: number;
    rateLimitMaxRequests: number;
    jwtSecret: string;
    bcryptRounds: number;
  };
}

export function getConfig(): Config {
  return {
    service: {
      port: parseInt(process.env.AUTH_SERVICE_PORT || '8081', 10),
      name: 'auth-service',
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development'
    },
    database: {
      url: process.env.DATABASE_URL || 'postgresql://localhost:5432/xafra_ads_v5',
      maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || '20', 10)
    },
    cache: {
      type: process.env.CACHE_TYPE as 'memory' | 'redis' || 'memory',
      url: process.env.REDIS_URL,
      ttl: parseInt(process.env.CACHE_TTL || '3600', 10)
    },
    security: {
      rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
      rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
      jwtSecret: process.env.JWT_SECRET || 'dev-jwt-secret-change-in-production',
      bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '12', 10)
    }
  };
}