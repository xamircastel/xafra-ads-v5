import { Router, Request, Response } from 'express';
import { logger, loggers } from '../utils/simple-logger';
import { prisma } from '../utils/simple-database';
import { getCacheService } from '../utils/simple-cache';
import { validateRequest } from '../utils/simple-validation';
import { UtilitySchema } from '../utils/simple-schemas';
import { EncryptionService } from '../utils/simple-encryption';

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
      logger.info('Invalid API key attempt', { apikey: `${apikey.substring(0, 8)}...`, ip: req.ip });
      res.status(401).json({
        error: 'Invalid API key',
        code: 'UNAUTHORIZED'
      });
      return;
    }

    // Convert product_id to BigInt safely
    let productBigIntId: bigint;
    try {
      productBigIntId = BigInt(product_id);
    } catch (conversionError) {
      logger.error('Invalid product_id format', conversionError as Error, { product_id, ip: req.ip });
      res.status(400).json({
        error: 'Invalid product_id format',
        code: 'INVALID_PRODUCT_ID'
      });
      return;
    }

    // Verify product exists
    const product = await prisma.product.findFirst({
      where: {
        id_product: productBigIntId,
        active: 1
      }
    });

    if (!product) {
      logger.info('Product not found', { product_id, ip: req.ip });
      res.status(404).json({
        error: 'Product not found',
        code: 'PRODUCT_NOT_FOUND'
      });
      return;
    }

    // Handle expiration logic
    const isNeverExpire = expire_hours === 0 || expire_hours === null;
    const expirationTime = isNeverExpire ? null : Date.now() + (expire_hours * 60 * 60 * 1000);

    let existingEncryptedId: string | null = null;

    // For never-expiring IDs, check if there's already one stored in the database
    if (isNeverExpire && product.encrypted_id) {
      // Verify the stored encrypted_id is still valid in cache
      const cache = getCacheService();
      const cacheKey = `encrypted:${product.encrypted_id}`;
      const cachedData = await cache.get(cacheKey);
      
      if (cachedData) {
        const parsedData = JSON.parse(cachedData as string);
        // Verify it matches our product and never expires
        if (parsedData.product_id === product_id && parsedData.never_expires) {
          const validEncryptedId = product.encrypted_id;
          
          logger.info('Reusing database stored encrypted ID', {
            apikey: `${apikey.substring(0, 8)}...`,
            productId: product_id,
            encryptedId: validEncryptedId,
            reused: true,
            source: 'database',
            ip: req.ip
          });
          
          res.json({
            success: true,
            data: {
              encrypted_id: validEncryptedId,
              product_id: product_id,
              length: validEncryptedId.length,
              expire_hours: expire_hours,
              never_expires: isNeverExpire,
              expires_at: null
            }
          });
          return;
        }
      }
      
      // If cached data is invalid/missing, we'll regenerate and update the database
      logger.warn('Database encrypted_id found but cache invalid, regenerating', {
        productId: product_id,
        storedEncryptedId: product.encrypted_id
      });
    }

    // Check cache for existing deterministic ID
    const cache = getCacheService();
    
    if (!existingEncryptedId) {
      try {
        // Create deterministic ID based on product_id and expiration
        const deterministicData = `${product_id}:${isNeverExpire ? 'never' : expire_hours}`;
        const proposedEncryptedId = createShortEncryption(deterministicData, !isNeverExpire); // Don't add timestamp for never-expire IDs
        
        // Check if this deterministic ID already exists and is valid
        const existingCacheKey = `encrypted:${proposedEncryptedId}`;
        const existingCacheData = await cache.get(existingCacheKey);
        
        if (existingCacheData) {
          const parsedData = JSON.parse(existingCacheData);
          // If it exists and matches our requirements, reuse it
          if (parsedData.product_id === product_id && 
              parsedData.never_expires === isNeverExpire &&
              (isNeverExpire || parsedData.expire_hours === expire_hours)) {
            
            // Check if it's still valid (not expired)
            if (isNeverExpire || !parsedData.expires_at || Date.now() < parsedData.expires_at) {
              existingEncryptedId = proposedEncryptedId;
              
              logger.info('Reusing existing cache encrypted ID', {
                apikey: `${apikey.substring(0, 8)}...`,
                productId: product_id,
                encryptedId: existingEncryptedId,
                reused: true,
                source: 'cache',
                ip: req.ip
              });
              
              res.json({
                success: true,
                data: {
                  encrypted_id: existingEncryptedId,
                  product_id: product_id,
                  length: existingEncryptedId.length,
                  expire_hours: expire_hours,
                  never_expires: isNeverExpire,
                  expires_at: parsedData.expires_at ? new Date(parsedData.expires_at).toISOString() : null
                }
              });
              return;
            }
          }
        }
        
        // If no existing valid ID found, use the deterministic approach
        existingEncryptedId = proposedEncryptedId;
        
      } catch (cacheError) {
        logger.warn('Cache search failed, creating new encrypted ID', cacheError as Error);
        // Fallback to creating new ID with timestamp for uniqueness (only for expiring IDs)
        if (isNeverExpire) {
          // For never-expire IDs, use deterministic approach even in fallback
          const deterministicData = `${product_id}:never:fallback`;
          existingEncryptedId = createShortEncryption(deterministicData, false);
        } else {
          // For expiring IDs, use timestamp for uniqueness
          const compactData = `${product_id}:${Date.now()}:${expire_hours || 0}`;
          existingEncryptedId = createShortEncryption(compactData, true);
        }
      }
    }

    // Create tracking data for encryption - use the determined encrypted ID
    const encryptedId = existingEncryptedId || createShortEncryption(`${product_id}:${Date.now()}`, false);

    // Store mapping in Redis for fast decryption
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

    // For never-expiring IDs, also store in database for persistence
    if (isNeverExpire && product.encrypted_id !== encryptedId) {
      try {
        await prisma.product.update({
          where: { id_product: productBigIntId },
          data: { encrypted_id: encryptedId }
        });
        
        logger.info('Encrypted ID saved to database', {
          productId: product_id,
          encryptedId: encryptedId,
          updated: product.encrypted_id ? 'updated' : 'created'
        });
      } catch (dbError) {
        logger.error('Failed to save encrypted_id to database', dbError as Error, {
          productId: product_id,
          encryptedId: encryptedId
        });
        // Don't fail the request if database update fails
      }
    }

    logger.info('Encryption successful', {
      apikey: `${apikey.substring(0, 8)}...`,
      productId: product_id,
      encryptedLength: encryptedId.length,
      neverExpires: isNeverExpire,
      cached: true,
      savedToDb: isNeverExpire,
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
      res.status(400).json({
        error: 'encrypted_id is required',
        code: 'MISSING_ENCRYPTED_ID'
      });
      return;
    }

    // Get cached data from Redis
    const cache = getCacheService();
    const cacheKey = `encrypted:${encrypted_id}`;
    let cachedData = await cache.get(cacheKey);
    let dataSource = 'cache';

    // If not found in cache, try PostgreSQL fallback for never-expire IDs
    if (!cachedData) {
      logger.info('Encrypted ID not found in cache, checking database fallback', {
        encryptedId: encrypted_id,
        ip: req.ip
      });

      try {
        // Search for never-expire IDs in database
        const product = await prisma.product.findFirst({
          where: {
            encrypted_id: encrypted_id,
            active: 1
          },
          select: {
            id_product: true,
            id_customer: true,
            encrypted_id: true
          }
        });

        if (product) {
          // Found in database - reconstruct cache data for never-expire ID
          const reconstructedData = {
            product_id: Number(product.id_product),
            customer_id: Number(product.id_customer),
            created_at: Date.now(), // We don't have original creation time
            expire_hours: 0,
            expires_at: null,
            never_expires: true
          };

          // Re-populate cache for future requests
          const cacheData = JSON.stringify(reconstructedData);
          const cacheTTL = 365 * 24 * 3600; // 1 year for never-expire
          await cache.set(cacheKey, cacheData, cacheTTL);

          cachedData = cacheData;
          dataSource = 'database_fallback';

          logger.info('Encrypted ID recovered from database and re-cached', {
            encryptedId: encrypted_id,
            productId: product.id_product,
            customerId: product.id_customer,
            ip: req.ip
          });
        }
      } catch (dbError) {
        logger.error('Database fallback lookup failed', dbError as Error, {
          encryptedId: encrypted_id,
          ip: req.ip
        });
      }
    }

    // If still not found after cache + database check
    if (!cachedData) {
      logger.warn('Encrypted ID not found in cache or database', {
        encryptedId: encrypted_id,
        ip: req.ip
      });

      res.status(404).json({
        error: 'Invalid or expired encrypted ID',
        code: 'INVALID_ENCRYPTED_ID'
      });
      return;
    }

    const decryptedData = JSON.parse(cachedData as string);

    // Check if expired (only if it's not set to never expire)
    const now = Date.now();
    if (!decryptedData.never_expires && decryptedData.expires_at && now > decryptedData.expires_at) {
      // Remove expired cache entry
      await cache.del(cacheKey);
      
      logger.info('Encrypted ID expired and removed from cache', {
        encryptedId: encrypted_id,
        expiresAt: new Date(decryptedData.expires_at).toISOString(),
        ip: req.ip
      });

      res.status(410).json({
        error: 'Encrypted ID has expired',
        code: 'EXPIRED_ENCRYPTED_ID'
      });
      return;
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
      dataSource: dataSource,
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
function createShortEncryption(data: string, addTimestamp: boolean = true): string {
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
  
  if (addTimestamp) {
    // Add timestamp component for uniqueness (last 4 digits in base36)
    const timeComponent = (Date.now() % 1679616).toString(36); // base36 gives us ~6 chars max
    
    // Combine and ensure max 18 characters (leaving room for padding)
    const combined = result + timeComponent;
    
    // Take first 18 characters and ensure it's URL-safe
    return combined.substring(0, 18);
  } else {
    // For deterministic IDs (never expire), don't add timestamp
    // Ensure minimum length by padding if necessary
    while (result.length < 8) {
      result = '0' + result;
    }
    
    // Take first 16 characters for deterministic IDs
    return result.substring(0, 16);
  }
}

export default router;