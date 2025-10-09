"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getKolbiConfig = exports.getPerformanceConfig = exports.getServiceConfig = exports.getSecurityConfig = exports.getRedisConfig = exports.getDatabaseConfig = exports.getConfig = exports.validateConfig = exports.createConfig = void 0;
// Default configuration values
const defaultConfig = {
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
const getConfigFromEnv = () => {
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
            environment: process.env.NODE_ENV || defaultConfig.service.environment,
            logLevel: process.env.LOG_LEVEL || defaultConfig.service.logLevel,
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
const createConfig = () => {
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
exports.createConfig = createConfig;
// Validate configuration
const validateConfig = (config) => {
    const errors = [];
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
exports.validateConfig = validateConfig;
// Singleton configuration instance
let configInstance = null;
const getConfig = () => {
    if (!configInstance) {
        configInstance = (0, exports.createConfig)();
        (0, exports.validateConfig)(configInstance);
    }
    return configInstance;
};
exports.getConfig = getConfig;
// Export specific config sections for convenience
const getDatabaseConfig = () => (0, exports.getConfig)().database;
exports.getDatabaseConfig = getDatabaseConfig;
const getRedisConfig = () => (0, exports.getConfig)().redis;
exports.getRedisConfig = getRedisConfig;
const getSecurityConfig = () => (0, exports.getConfig)().security;
exports.getSecurityConfig = getSecurityConfig;
const getServiceConfig = () => (0, exports.getConfig)().service;
exports.getServiceConfig = getServiceConfig;
const getPerformanceConfig = () => (0, exports.getConfig)().performance;
exports.getPerformanceConfig = getPerformanceConfig;
const getKolbiConfig = () => (0, exports.getConfig)().kolbi;
exports.getKolbiConfig = getKolbiConfig;
//# sourceMappingURL=index.js.map