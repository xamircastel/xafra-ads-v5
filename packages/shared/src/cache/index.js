"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cache = exports.getCacheService = exports.CacheService = void 0;
const redis_1 = require("redis");
class CacheService {
    constructor(config) {
        this.config = config;
        this.isConnected = false;
        this.client = (0, redis_1.createClient)({
            url: config.url,
        });
        this.client.on('error', (err) => {
            console.error('Redis Client Error', err);
        });
        this.client.on('connect', () => {
            console.log('Redis Client Connected');
            this.isConnected = true;
        });
        this.client.on('disconnect', () => {
            console.log('Redis Client Disconnected');
            this.isConnected = false;
        });
    }
    async connect() {
        if (!this.isConnected) {
            await this.client.connect();
        }
    }
    async disconnect() {
        if (this.isConnected) {
            await this.client.disconnect();
        }
    }
    getKey(key) {
        return `${this.config.keyPrefix}:${key}`;
    }
    async get(key) {
        try {
            const value = await this.client.get(this.getKey(key));
            return value ? JSON.parse(value) : null;
        }
        catch (error) {
            console.error('Cache get error:', error);
            return null;
        }
    }
    async set(key, value, ttl) {
        try {
            const serialized = JSON.stringify(value);
            const expiration = ttl || this.config.defaultTTL;
            await this.client.setEx(this.getKey(key), expiration, serialized);
            return true;
        }
        catch (error) {
            console.error('Cache set error:', error);
            return false;
        }
    }
    async del(key) {
        try {
            const result = await this.client.del(this.getKey(key));
            return result > 0;
        }
        catch (error) {
            console.error('Cache delete error:', error);
            return false;
        }
    }
    async exists(key) {
        try {
            const result = await this.client.exists(this.getKey(key));
            return result === 1;
        }
        catch (error) {
            console.error('Cache exists error:', error);
            return false;
        }
    }
    async increment(key, amount = 1) {
        try {
            return await this.client.incrBy(this.getKey(key), amount);
        }
        catch (error) {
            console.error('Cache increment error:', error);
            return 0;
        }
    }
    async expire(key, ttl) {
        try {
            const result = await this.client.expire(this.getKey(key), ttl);
            return Boolean(result);
        }
        catch (error) {
            console.error('Cache expire error:', error);
            return false;
        }
    }
    async cacheProductDetails(productId, details, ttl = 3600) {
        return this.set(`product:${productId}`, details, ttl);
    }
    async getProductDetails(productId) {
        return this.get(`product:${productId}`);
    }
    async cacheTrackingInfo(trackingId, info, ttl = 1800) {
        return this.set(`tracking:${trackingId}`, info, ttl);
    }
    async getTrackingInfo(trackingId) {
        return this.get(`tracking:${trackingId}`);
    }
    async cacheConversionRate(productId, rate, ttl = 300) {
        return this.set(`conversion:${productId}`, rate, ttl);
    }
    async getConversionRate(productId) {
        return this.get(`conversion:${productId}`);
    }
    async rateLimitCheck(identifier, limit, window) {
        const key = `ratelimit:${identifier}`;
        const current = await this.increment(key);
        if (current === 1) {
            await this.expire(key, window);
        }
        return {
            allowed: current <= limit,
            remaining: Math.max(0, limit - current)
        };
    }
}
exports.CacheService = CacheService;
let cacheService;
const getCacheService = () => {
    if (!cacheService) {
        const config = {
            url: process.env.REDIS_URL || 'redis://localhost:6379',
            defaultTTL: 3600,
            keyPrefix: 'xafra'
        };
        cacheService = new CacheService(config);
    }
    return cacheService;
};
exports.getCacheService = getCacheService;
exports.cache = (0, exports.getCacheService)();
//# sourceMappingURL=index.js.map