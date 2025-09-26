export interface CacheConfig {
    url: string;
    defaultTTL: number;
    keyPrefix: string;
}
export declare class CacheService {
    private readonly config;
    private client;
    private isConnected;
    constructor(config: CacheConfig);
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    private getKey;
    get<T>(key: string): Promise<T | null>;
    set<T>(key: string, value: T, ttl?: number): Promise<boolean>;
    del(key: string): Promise<boolean>;
    exists(key: string): Promise<boolean>;
    increment(key: string, amount?: number): Promise<number>;
    expire(key: string, ttl: number): Promise<boolean>;
    cacheProductDetails(productId: number, details: any, ttl?: number): Promise<boolean>;
    getProductDetails(productId: number): Promise<any | null>;
    cacheTrackingInfo(trackingId: string, info: any, ttl?: number): Promise<boolean>;
    getTrackingInfo(trackingId: string): Promise<any | null>;
    cacheConversionRate(productId: number, rate: number, ttl?: number): Promise<boolean>;
    getConversionRate(productId: number): Promise<number | null>;
    rateLimitCheck(identifier: string, limit: number, window: number): Promise<{
        allowed: boolean;
        remaining: number;
    }>;
}
export declare const getCacheService: () => CacheService;
export declare const cache: CacheService;
//# sourceMappingURL=index.d.ts.map