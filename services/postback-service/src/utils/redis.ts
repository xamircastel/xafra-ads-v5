import Redis from 'ioredis';

// Redis service for retry queue management
class RedisService {
  private client: Redis;
  private isConnected: boolean = false;

  constructor() {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    
    this.client = new Redis(redisUrl, {
      lazyConnect: true,
      maxRetriesPerRequest: 3
    });

    this.client.on('connect', () => {
      console.log('✅ Redis connected successfully');
      this.isConnected = true;
    });

    this.client.on('error', (error) => {
      console.error('❌ Redis connection error:', error.message);
      this.isConnected = false;
    });

    this.client.on('close', () => {
      console.log('🔌 Redis connection closed');
      this.isConnected = false;
    });
  }

  // Initialize connection
  async connect() {
    try {
      await this.client.connect();
      return true;
    } catch (error) {
      console.error('Failed to connect to Redis:', error);
      return false;
    }
  }

  // Add postback to retry queue
  async addToRetryQueue(postbackData: any, delayMs: number = 60000) {
    try {
      const queueKey = 'postback:retry:queue';
      const scheduleTime = Date.now() + delayMs;
      
      const payload = {
        ...postbackData,
        scheduled_at: scheduleTime,
        created_at: Date.now()
      };

      await this.client.zadd(queueKey, scheduleTime, JSON.stringify(payload));
      console.log(`Postback added to retry queue (delay: ${delayMs}ms):`, {
        campaign_id: postbackData.campaign_id,
        tracking_id: postbackData.tracking_id
      });
      
      return true;
    } catch (error) {
      console.error('Failed to add postback to retry queue:', error);
      return false;
    }
  }

  // Get pending postbacks from retry queue
  async getPendingRetries(limit: number = 10) {
    try {
      const queueKey = 'postback:retry:queue';
      const now = Date.now();
      
      // Get items that are ready to be processed (score <= now)
      const items = await this.client.zrangebyscore(
        queueKey, 
        0, 
        now, 
        'LIMIT', 
        0, 
        limit
      );

      return items.map(item => {
        try {
          return JSON.parse(item);
        } catch {
          return null;
        }
      }).filter(Boolean);
    } catch (error) {
      console.error('Failed to get pending retries:', error);
      return [];
    }
  }

  // Remove processed item from retry queue
  async removeFromRetryQueue(postbackData: any) {
    try {
      const queueKey = 'postback:retry:queue';
      const payload = JSON.stringify({
        ...postbackData,
        scheduled_at: postbackData.scheduled_at,
        created_at: postbackData.created_at
      });
      
      await this.client.zrem(queueKey, payload);
      return true;
    } catch (error) {
      console.error('Failed to remove from retry queue:', error);
      return false;
    }
  }

  // Cache postback result temporarily
  async cachePostbackResult(campaignId: number, result: any, ttlSeconds: number = 300) {
    try {
      const key = `postback:result:${campaignId}`;
      await this.client.setex(key, ttlSeconds, JSON.stringify(result));
      return true;
    } catch (error) {
      console.error('Failed to cache postback result:', error);
      return false;
    }
  }

  // Get cached postback result
  async getCachedPostbackResult(campaignId: number) {
    try {
      const key = `postback:result:${campaignId}`;
      const result = await this.client.get(key);
      return result ? JSON.parse(result) : null;
    } catch (error) {
      console.error('Failed to get cached postback result:', error);
      return null;
    }
  }

  // Health check
  async healthCheck() {
    try {
      if (!this.isConnected) {
        await this.connect();
      }
      
      const pong = await this.client.ping();
      return {
        status: pong === 'PONG' ? 'healthy' : 'unhealthy',
        connected: this.isConnected,
        response: pong
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        connected: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Get queue stats
  async getQueueStats() {
    try {
      const queueKey = 'postback:retry:queue';
      const total = await this.client.zcard(queueKey);
      const pending = await this.client.zcount(queueKey, 0, Date.now());
      const future = total - pending;

      return {
        total_items: total,
        pending_items: pending,
        future_items: future,
        oldest_pending: await this.getOldestPendingTime()
      };
    } catch (error) {
      console.error('Failed to get queue stats:', error);
      return {
        total_items: 0,
        pending_items: 0,
        future_items: 0,
        oldest_pending: null
      };
    }
  }

  private async getOldestPendingTime() {
    try {
      const queueKey = 'postback:retry:queue';
      const oldest = await this.client.zrange(queueKey, 0, 0, 'WITHSCORES');
      
      if (oldest.length >= 2) {
        return new Date(parseInt(oldest[1])).toISOString();
      }
      return null;
    } catch {
      return null;
    }
  }

  async disconnect() {
    if (this.client) {
      await this.client.quit();
    }
  }
}

export const redisService = new RedisService();