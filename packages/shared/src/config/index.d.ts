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
export declare const createConfig: () => XafraConfig;
export declare const validateConfig: (config: XafraConfig) => void;
export declare const getConfig: () => XafraConfig;
export declare const getDatabaseConfig: () => DatabaseConfig;
export declare const getRedisConfig: () => RedisConfig;
export declare const getSecurityConfig: () => SecurityConfig;
export declare const getServiceConfig: () => ServiceConfig;
export declare const getPerformanceConfig: () => PerformanceConfig;
export declare const getKolbiConfig: () => KolbiConfig;
//# sourceMappingURL=index.d.ts.map