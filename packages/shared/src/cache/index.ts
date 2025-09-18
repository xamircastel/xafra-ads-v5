import { createClient, RedisClientType } from 'redis';

export interface CacheConfig {
  url: string;
  defaultTTL: number;
  keyPrefix: string;
}

export class CacheService {
  private client: RedisClientType;
  private isConnected = false;

  constructor(private readonly config: CacheConfig) {
    this.client = createClient({
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

  async connect(): Promise<void> {
    if (!this.isConnected) {
      await this.client.connect();
    }
  }

  async disconnect(): Promise<void> {
    if (this.isConnected) {
      await this.client.disconnect();
    }
  }

  private getKey(key: string): string {
    return `${this.config.keyPrefix}:${key}`;
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.client.get(this.getKey(key));
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<boolean> {
    try {
      const serialized = JSON.stringify(value);
      const expiration = ttl || this.config.defaultTTL;
      
      await this.client.setEx(this.getKey(key), expiration, serialized);
      return true;
    } catch (error) {
      console.error('Cache set error:', error);
      return false;
    }
  }

  async del(key: string): Promise<boolean> {
    try {
      const result = await this.client.del(this.getKey(key));
      return result > 0;
    } catch (error) {
      console.error('Cache delete error:', error);
      return false;
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.client.exists(this.getKey(key));
      return result === 1;
    } catch (error) {
      console.error('Cache exists error:', error);
      return false;
    }
  }

  async increment(key: string, amount = 1): Promise<number> {
    try {
      return await this.client.incrBy(this.getKey(key), amount);
    } catch (error) {
      console.error('Cache increment error:', error);
      return 0;
    }
  }

  async expire(key: string, ttl: number): Promise<boolean> {
    try {
      const result = await this.client.expire(this.getKey(key), ttl);
      return Boolean(result);
    } catch (error) {
      console.error('Cache expire error:', error);
      return false;
    }
  }

  // Specific cache methods for Xafra-ads
  async cacheProductDetails(productId: number, details: any, ttl = 3600): Promise<boolean> {
    return this.set(`product:${productId}`, details, ttl);
  }

  async getProductDetails(productId: number): Promise<any | null> {
    return this.get(`product:${productId}`);
  }

  async cacheTrackingInfo(trackingId: string, info: any, ttl = 1800): Promise<boolean> {
    return this.set(`tracking:${trackingId}`, info, ttl);
  }

  async getTrackingInfo(trackingId: string): Promise<any | null> {
    return this.get(`tracking:${trackingId}`);
  }

  async cacheConversionRate(productId: number, rate: number, ttl = 300): Promise<boolean> {
    return this.set(`conversion:${productId}`, rate, ttl);
  }

  async getConversionRate(productId: number): Promise<number | null> {
    return this.get(`conversion:${productId}`);
  }

  // Rate limiting helpers
  async rateLimitCheck(identifier: string, limit: number, window: number): Promise<{ allowed: boolean; remaining: number }> {
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

// Singleton instance
let cacheService: CacheService;

export const getCacheService = (): CacheService => {
  if (!cacheService) {
    const config: CacheConfig = {
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      defaultTTL: 3600, // 1 hour
      keyPrefix: 'xafra'
    };
    cacheService = new CacheService(config);
  }
  return cacheService;
};

// Export a default cache instance for easy access
export const cache = getCacheService();