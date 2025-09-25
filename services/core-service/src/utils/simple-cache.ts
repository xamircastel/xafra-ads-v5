// Redis cache service for production
import Redis from 'ioredis';
import { logger } from './simple-logger';

let redisClient: Redis | null = null;

export const getCacheService = () => {
  return {
    get: async (key: string) => {
      try {
        if (!redisClient) {
          logger.warn('Redis client not connected, initializing...');
          await connectRedis();
        }
        
        const value = await redisClient?.get(key);
        return value || null;
      } catch (error) {
        logger.error('Redis GET error', error as Error, { key });
        return null;
      }
    },
    
    set: async (key: string, value: any, ttl?: number) => {
      try {
        if (!redisClient) {
          logger.warn('Redis client not connected, initializing...');
          await connectRedis();
        }
        
        if (ttl && ttl > 0) {
          await redisClient?.setex(key, ttl, value);
        } else {
          await redisClient?.set(key, value);
        }
        
        return true;
      } catch (error) {
        logger.error('Redis SET error', error as Error, { key, ttl });
        return false;
      }
    },
    
    del: async (key: string) => {
      try {
        if (!redisClient) {
          logger.warn('Redis client not connected, initializing...');
          await connectRedis();
        }
        
        await redisClient?.del(key);
        return true;
      } catch (error) {
        logger.error('Redis DEL error', error as Error, { key });
        return false;
      }
    },
    
    connect: async () => {
      try {
        await connectRedis();
        logger.info('[CACHE] Connected to Redis successfully');
        return true;
      } catch (error) {
        logger.error('[CACHE] Failed to connect to Redis', error as Error);
        return false;
      }
    },
    
    disconnect: async () => {
      try {
        if (redisClient) {
          await redisClient.quit();
          redisClient = null;
        }
        logger.info('[CACHE] Disconnected from Redis');
        return true;
      } catch (error) {
        logger.error('[CACHE] Error disconnecting from Redis', error as Error);
        return false;
      }
    }
  };
};

async function connectRedis(): Promise<void> {
  if (redisClient && redisClient.status === 'ready') {
    return; // Already connected
  }

  try {
    // Redis connection configuration - support both URL and individual config
    let redisConfig: any;
    
    if (process.env.REDIS_URL) {
      // Parse REDIS_URL for staging/production
      redisConfig = process.env.REDIS_URL;
    } else {
      // Individual configuration for development
      redisConfig = {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
        password: process.env.REDIS_PASSWORD || undefined,
        db: parseInt(process.env.REDIS_DB || '0', 10),
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3,
        lazyConnect: true,
        keepAlive: 30000,
        connectTimeout: 10000,
        commandTimeout: 5000
      };
    }

    redisClient = new Redis(redisConfig);

    // Event handlers
    redisClient.on('connect', () => {
      logger.info('[REDIS] Connection established');
    });

    redisClient.on('ready', () => {
      logger.info('[REDIS] Client ready for operations');
    });

    redisClient.on('error', (error: Error) => {
      logger.error('[REDIS] Connection error', error);
    });

    redisClient.on('close', () => {
      logger.warn('[REDIS] Connection closed');
    });

    redisClient.on('reconnecting', () => {
      logger.info('[REDIS] Attempting to reconnect...');
    });

    // Connect to Redis
    await redisClient.connect();
    
  } catch (error) {
    logger.error('[REDIS] Failed to initialize client', error as Error);
    throw error;
  }
}