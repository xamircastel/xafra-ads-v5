import { Router, Request, Response } from 'express';
import { loggers } from '@xafra/shared/logger';
import { cache } from '@xafra/shared/cache';
import { prisma } from '@xafra/database';
import { nanoid } from 'nanoid';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Generate new tracking ID for campaigns
router.post('/campaign', async (req: Request, res: Response) => {
  const { apikey, product_id, country, operator, short_tracking } = req.body;

  try {
    // Verify API key
    const authUser = await prisma.authUser.findFirst({
      where: {
        apikey: apikey,
        status: 1
      },
      include: {
        customer: true
      }
    });

    if (!authUser) {
      res.status(401).json({
        error: 'Invalid API key',
        code: 'UNAUTHORIZED'
      });
      return;
    }

    // Verify product exists and belongs to customer
    const product = await prisma.product.findFirst({
      where: {
        id: product_id,
        customer_id: authUser.customer_id,
        status: 1
      }
    });

    if (!product) {
      res.status(404).json({
        error: 'Product not found or access denied',
        code: 'PRODUCT_NOT_FOUND'
      });
      return;
    }

    // Generate tracking ID
    const trackingId = generateTrackingId(country, operator);
    const xafraTrackingId = generateXafraTrackingId();
    const uuid = uuidv4();
    const timestamp = BigInt(Date.now());

    // Check if short tracking is already in use
    if (short_tracking) {
      const existingShortTracking = await prisma.campaign.findFirst({
        where: {
          short_tracking: short_tracking,
          status: { in: [1, 2] } // Active or pending
        }
      });

      if (existingShortTracking) {
        res.status(409).json({
          error: 'Short tracking ID already in use',
          code: 'SHORT_TRACKING_EXISTS',
          shortTracking: short_tracking
        });
        return;
      }
    }

    // Create campaign
    const campaign = await prisma.campaign.create({
      data: {
        id_product: product_id,
        tracking: trackingId,
        xafra_tracking_id: xafraTrackingId,
        uuid: uuid,
        status: 2, // Pending
        country: country || product.country,
        operator: operator || product.operator,
        short_tracking: short_tracking || null,
        creation_date: timestamp,
        modification_date: timestamp,
        status_post_back: 0,
        date_post_back: null
      }
    });

    // Cache the tracking data for fast lookup
    const cacheKey = `tracking:${trackingId}`;
    const cacheData = {
      campaignId: campaign.id,
      productId: product_id,
      customerId: authUser.customer_id,
      country: country || product.country,
      operator: operator || product.operator,
      xafraTrackingId: xafraTrackingId,
      shortTracking: short_tracking
    };

    await cache.set(cacheKey, JSON.stringify(cacheData), 3600); // 1 hour cache

    loggers.tracking('campaign_tracking_generated', trackingId, product_id, {
      campaignId: campaign.id,
      xafraTrackingId: xafraTrackingId,
      shortTracking: short_tracking,
      customerId: authUser.customer_id,
      country: country || product.country,
      operator: operator || product.operator
    });

    res.status(201).json({
      success: true,
      data: {
        campaignId: campaign.id,
        trackingId: trackingId,
        xafraTrackingId: xafraTrackingId,
        shortTracking: short_tracking,
        uuid: uuid,
        status: 'pending',
        product: {
          id: product.id,
          name: product.name
        },
        urls: {
          standard: `${process.env['BASE_URL']}/ads/${trackingId}`,
          autoTracking: `${process.env['BASE_URL']}/ads/tr/${trackingId}`,
          randomTracking: `${process.env['BASE_URL']}/ads/random/${trackingId}`
        },
        createdAt: new Date(Number(timestamp)).toISOString()
      }
    });

  } catch (error) {
    loggers.error('Campaign tracking generation failed', error as Error, {
      apikey: apikey?.substring(0, 8) + '...',
      productId: product_id,
      country,
      operator,
      ip: req.ip
    });

    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

// Batch generate tracking IDs
router.post('/batch', async (req: Request, res: Response) => {
  const { apikey, campaigns } = req.body;

  try {
    // Verify API key
    const authUser = await prisma.authUser.findFirst({
      where: {
        apikey: apikey,
        status: 1
      }
    });

    if (!authUser) {
      res.status(401).json({
        error: 'Invalid API key',
        code: 'UNAUTHORIZED'
      });
      return;
    }

    if (!Array.isArray(campaigns) || campaigns.length === 0) {
      res.status(400).json({
        error: 'campaigns must be a non-empty array',
        code: 'INVALID_INPUT'
      });
      return;
    }

    if (campaigns.length > 50) {
      res.status(400).json({
        error: 'Maximum 50 campaigns per batch',
        code: 'BATCH_LIMIT_EXCEEDED'
      });
      return;
    }

    const results: any[] = [];
    const timestamp = BigInt(Date.now());

    // Process each campaign
    for (const campaignData of campaigns) {
      try {
        const { product_id, country, operator, short_tracking } = campaignData;

        // Verify product exists and belongs to customer
        const product = await prisma.product.findFirst({
          where: {
            id: product_id,
            customer_id: authUser.customer_id,
            status: 1
          }
        });

        if (!product) {
          results.push({
            productId: product_id,
            success: false,
            error: 'Product not found or access denied'
          });
          continue;
        }

        // Generate tracking IDs
        const trackingId = generateTrackingId(country, operator);
        const xafraTrackingId = generateXafraTrackingId();
        const uuid = uuidv4();

        // Create campaign
        const campaign = await prisma.campaign.create({
          data: {
            id_product: product_id,
            tracking: trackingId,
            xafra_tracking_id: xafraTrackingId,
            uuid: uuid,
            status: 2, // Pending
            country: country || product.country,
            operator: operator || product.operator,
            short_tracking: short_tracking || null,
            creation_date: timestamp,
            modification_date: timestamp,
            status_post_back: 0,
            date_post_back: null
          }
        });

        results.push({
          productId: product_id,
          success: true,
          campaignId: campaign.id,
          trackingId: trackingId,
          xafraTrackingId: xafraTrackingId,
          shortTracking: short_tracking,
          uuid: uuid
        });

        loggers.tracking('batch_tracking_generated', trackingId, product_id, {
          campaignId: campaign.id,
          batchIndex: results.length - 1
        });

      } catch (error) {
        results.push({
          productId: campaignData.product_id,
          success: false,
          error: 'Processing failed'
        });
      }
    }

    const successCount = results.filter(r => r.success).length;

    res.json({
      success: true,
      message: `Processed ${successCount}/${campaigns.length} campaigns`,
      data: {
        results,
        summary: {
          total: campaigns.length,
          successful: successCount,
          failed: campaigns.length - successCount
        }
      }
    });

  } catch (error) {
    loggers.error('Batch tracking generation failed', error as Error, {
      apikey: apikey?.substring(0, 8) + '...',
      campaignsCount: campaigns?.length,
      ip: req.ip
    });

    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

// Generate custom tracking ID with specific format
router.post('/custom', async (req: Request, res: Response) => {
  const { 
    apikey, 
    product_id, 
    custom_format, 
    length = 8,
    prefix = '',
    suffix = ''
  } = req.body;

  try {
    // Verify API key
    const authUser = await prisma.authUser.findFirst({
      where: {
        apikey: apikey,
        status: 1
      }
    });

    if (!authUser) {
      res.status(401).json({
        error: 'Invalid API key',
        code: 'UNAUTHORIZED'
      });
      return;
    }

    // Generate custom tracking ID
    let customTrackingId: string;

    switch (custom_format) {
      case 'numeric':
        customTrackingId = prefix + generateNumericId(length) + suffix;
        break;
      case 'alphanumeric':
        customTrackingId = prefix + generateAlphanumericId(length) + suffix;
        break;
      case 'hex':
        customTrackingId = prefix + generateHexId(length) + suffix;
        break;
      default:
        customTrackingId = prefix + generateTrackingId() + suffix;
    }

    // Check if tracking ID already exists
    const existingCampaign = await prisma.campaign.findFirst({
      where: {
        tracking: customTrackingId
      }
    });

    if (existingCampaign) {
      res.status(409).json({
        error: 'Tracking ID already exists',
        code: 'TRACKING_EXISTS',
        trackingId: customTrackingId
      });
      return;
    }

    res.json({
      success: true,
      data: {
        trackingId: customTrackingId,
        format: custom_format,
        length: customTrackingId.length,
        preview: {
          standard: `${process.env['BASE_URL']}/ads/${customTrackingId}`,
          autoTracking: `${process.env['BASE_URL']}/ads/tr/${customTrackingId}`,
          randomTracking: `${process.env['BASE_URL']}/ads/random/${customTrackingId}`
        }
      }
    });

  } catch (error) {
    loggers.error('Custom tracking generation failed', error as Error, {
      apikey: apikey?.substring(0, 8) + '...',
      productId: product_id,
      customFormat: custom_format,
      ip: req.ip
    });

    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

// Helper functions for ID generation
function generateTrackingId(country?: string, operator?: string): string {
  const timestamp = Date.now().toString(36);
  const random = nanoid(8);
  
  let prefix = '';
  if (country === 'CR' && operator === 'KOLBI') {
    prefix = 'K';
  } else if (country) {
    prefix = country.substring(0, 2).toUpperCase();
  }
  
  return prefix + timestamp + random;
}

function generateXafraTrackingId(): string {
  return 'XFR' + Date.now().toString(36) + nanoid(6);
}

function generateNumericId(length: number): string {
  return Math.random().toString().slice(2, 2 + length);
}

function generateAlphanumericId(length: number): string {
  return nanoid(length);
}

function generateHexId(length: number): string {
  return Array.from({ length }, () => Math.floor(Math.random() * 16).toString(16)).join('');
}

export default router;