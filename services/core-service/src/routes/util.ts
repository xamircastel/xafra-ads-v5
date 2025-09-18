import { Router, Request, Response } from 'express';
import { logger, loggers } from '@xafra/shared/logger';
import { prisma } from '@xafra/database';
import { getCacheService } from '@xafra/shared/cache';
import { validateRequest } from '@xafra/shared/middleware/auth';
import { UtilitySchema } from '@xafra/shared/validation';
import { EncryptionService } from '@xafra/shared/encryption';

const router = Router();

// Generate encrypted product ID endpoint
router.post('/encrypt', validateRequest(UtilitySchema), async (req: Request, res: Response) => {
  // Extract values without default assignment to detect explicit 0/null
  const { apikey, product_id } = req.body;
  let { expire_hours } = req.body;
  
  // If expire_hours is not provided, use 24 as default. If explicitly 0 or null, treat as never expire
  if (expire_hours === undefined) {
    expire_hours = 24; // Default to 24 hours if not specified
  }

  try {
    // Verify API key exists in database
    const authUser = await prisma.authUser.findFirst({
      where: {
        api_key: apikey,
        active: 1
      }
    });

    if (!authUser) {
      res.status(401).json({
        error: 'Invalid API key',
        code: 'UNAUTHORIZED'
      });
      return;
    }

    // Verify product exists
    const product = await prisma.product.findFirst({
      where: {
        id_product: BigInt(product_id),
        active: 1
      }
    });

    if (!product) {
      res.status(404).json({
        error: 'Product not found',
        code: 'PRODUCT_NOT_FOUND'
      });
      return;
    }

    // Handle expiration logic
    const isNeverExpire = expire_hours === 0 || expire_hours === null;
    const expirationTime = isNeverExpire ? null : Date.now() + (expire_hours * 60 * 60 * 1000);

    // Create tracking data for encryption - use compact format
    const compactData = `${product_id}:${Date.now()}:${expire_hours || 0}`;

    // Create short encrypted ID for URL usage (max 20 chars)
    const encryptedId = createShortEncryption(compactData);

    // Store mapping in Redis for fast decryption
    const cache = getCacheService();
    const cacheKey = `encrypted:${encryptedId}`;
    const cacheData = {
      product_id: product_id,
      customer_id: Number(product.id_customer),
      created_at: Date.now(),
      expire_hours: expire_hours,
      expires_at: expirationTime,
      never_expires: isNeverExpire
    };
    
    // Cache TTL: If never expires, set to 1 year (max Redis TTL), otherwise expire_hours + 1 hour buffer
    const cacheTTL = isNeverExpire ? (365 * 24 * 3600) : ((expire_hours + 1) * 3600);
    await cache.set(cacheKey, JSON.stringify(cacheData), cacheTTL);

    logger.info('Encryption successful', {
      apikey: `${apikey.substring(0, 8)}...`,
      productId: product_id,
      encryptedLength: encryptedId.length,
      neverExpires: isNeverExpire,
      cached: true,
      ip: req.ip
    });

    res.json({
      success: true,
      data: {
        encrypted_id: encryptedId,
        product_id: product_id,
        length: encryptedId.length,
        expire_hours: expire_hours,
        never_expires: isNeverExpire,
        expires_at: expirationTime ? new Date(expirationTime).toISOString() : null
      }
    });

  } catch (error) {
    loggers.error('Encryption failed', error as Error, {
      apikey: `${apikey.substring(0, 8)}...`,
      productId: product_id,
      ip: req.ip
    });

    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

// Decrypt/validate encrypted product ID endpoint  
router.post('/decrypt', async (req: Request, res: Response) => {
  const { encrypted_id } = req.body;

  try {
    if (!encrypted_id) {
      return res.status(400).json({
        error: 'encrypted_id is required',
        code: 'MISSING_ENCRYPTED_ID'
      });
    }

    // Get cached data from Redis
    const cache = getCacheService();
    const cacheKey = `encrypted:${encrypted_id}`;
    const cachedData = await cache.get(cacheKey);

    if (!cachedData) {
      return res.status(404).json({
        error: 'Invalid or expired encrypted ID',
        code: 'INVALID_ENCRYPTED_ID'
      });
    }

    const decryptedData = JSON.parse(cachedData as string);

    // Check if expired (only if it's not set to never expire)
    const now = Date.now();
    if (!decryptedData.never_expires && decryptedData.expires_at && now > decryptedData.expires_at) {
      // Remove expired cache entry
      await cache.del(cacheKey);
      
      return res.status(410).json({
        error: 'Encrypted ID has expired',
        code: 'EXPIRED_ENCRYPTED_ID'
      });
    }

    // Calculate time remaining (if applicable)
    let timeRemainingMinutes = null;
    if (!decryptedData.never_expires && decryptedData.expires_at) {
      timeRemainingMinutes = Math.max(0, Math.floor((decryptedData.expires_at - now) / 60000));
    }

    logger.info('Decryption successful', {
      encryptedId: encrypted_id,
      productId: decryptedData.product_id,
      customerId: decryptedData.customer_id,
      neverExpires: decryptedData.never_expires,
      ip: req.ip
    });

    res.json({
      success: true,
      data: {
        product_id: decryptedData.product_id,
        customer_id: decryptedData.customer_id,
        created_at: new Date(decryptedData.created_at).toISOString(),
        expire_hours: decryptedData.expire_hours,
        never_expires: decryptedData.never_expires,
        expires_at: decryptedData.expires_at ? new Date(decryptedData.expires_at).toISOString() : null,
        is_valid: true,
        time_remaining_minutes: timeRemainingMinutes
      }
    });

  } catch (error) {
    loggers.error('Decryption failed', error as Error, {
      encryptedId: encrypted_id,
      ip: req.ip
    });

    res.status(500).json({
      error: 'Decryption failed',
      code: 'DECRYPTION_ERROR'
    });
  }
});

// Short encryption function for URL-friendly IDs (max 20 characters)
function createShortEncryption(data: string): string {
  // Use base62 encoding for shorter URLs (alphanumeric only)
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  
  // Create a hash from the input data
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  // Convert to positive number and then to base62
  const positiveHash = Math.abs(hash);
  let result = '';
  let num = positiveHash;
  
  // Convert to base62
  do {
    result = chars[num % 62] + result;
    num = Math.floor(num / 62);
  } while (num > 0);
  
  // Add timestamp component for uniqueness (last 4 digits in base36)
  const timeComponent = (Date.now() % 1679616).toString(36); // base36 gives us ~6 chars max
  
  // Combine and ensure max 18 characters (leaving room for padding)
  const combined = result + timeComponent;
  
  // Take first 18 characters and ensure it's URL-safe
  return combined.substring(0, 18);
}

export default router;