// Simple cache implementation for auth-service
// Replaces @xafra/shared/cache dependencies

interface CacheService {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds?: number): Promise<void>;
  del(key: string): Promise<boolean>;
  exists(key: string): Promise<boolean>;
  clear(): Promise<void>;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
}

class MemoryCache implements CacheService {
  private cache = new Map<string, { value: string; expiry: number | null }>();

  async get(key: string): Promise<string | null> {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (item.expiry && Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }
    
    return item.value;
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    const expiry = ttlSeconds ? Date.now() + (ttlSeconds * 1000) : null;
    this.cache.set(key, { value, expiry });
  }

  async del(key: string): Promise<boolean> {
    return this.cache.delete(key);
  }

  async exists(key: string): Promise<boolean> {
    return this.cache.has(key);
  }

  async clear(): Promise<void> {
    this.cache.clear();
  }

  async connect(): Promise<void> {
    // Memory cache doesn't need connection
    console.log('[AUTH-SERVICE] Memory cache initialized');
  }

  async disconnect(): Promise<void> {
    // Memory cache doesn't need disconnection
    this.cache.clear();
    console.log('[AUTH-SERVICE] Memory cache cleared');
  }
}

// Create cache service instance
const cacheService = new MemoryCache();

export function getCacheService(): CacheService {
  return cacheService;
}

export const cache = cacheService;