import { Router, Request, Response } from 'express';
import { loggers } from '@xafra/shared/logger';
import { cache } from '@xafra/shared/cache';
import { prisma } from '@xafra/database';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

const router = Router();

// Generate new tracking campaign
router.post('/campaign', async (req: Request, res: Response) => {
  const { apikey, product_id, country, operator, reference } = req.body;

  try {
    // Verify API key
    const authUser = await prisma.authUser.findFirst({
      where: {
        api_key: apikey,
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

    // Verify product exists and belongs to customer
    const product = await prisma.product.findFirst({
      where: {
        id_product: product_id,
        id_customer: authUser.customer_id
      }
    });

    if (!product) {
      res.status(404).json({
        error: 'Product not found or access denied',
        code: 'PRODUCT_NOT_FOUND'
      });
      return;
    }

    // Generate tracking IDs
    const trackingId = generateTrackingId();
    const shortTracking = generateShortTracking();
    const uuid = uuidv4();
    const timestamp = new Date();

    // Create campaign
    const campaign = await prisma.campaign.create({
      data: {
        xafra_tracking_id: trackingId,
        short_tracking: shortTracking,
        uuid: uuid,
        id_product: product_id,
        tracking: `${trackingId}-${country}-${operator}`,
        status: 1,
        country: country || '',
        operator: operator || '',
        creation_date: timestamp,
        modification_date: timestamp
      }
    });

    loggers.tracking('campaign_generated', trackingId, product_id, {
      customerId: Number(authUser.customer_id),
      country,
      operator,
      reference,
      ip: req.ip
    });

    const response = {
      success: true,
      data: {
        campaignId: campaign.id.toString(),
        trackingId: trackingId,
        shortTracking: shortTracking,
        uuid: uuid,
        product: {
          id: product.id_product.toString(),
          name: product.name,
          customerId: product.id_customer.toString()
        },
        config: {
          country,
          operator,
          reference,
          status: 'active'
        },
        urls: {
          tracking: `${process.env.TRACKING_BASE_URL || 'https://track.xafra.com'}/${shortTracking}`,
          redirect: product.url_redirect_success
        },
        createdAt: campaign.creation_date?.toISOString()
      }
    };

    res.status(201).json(response);

  } catch (error) {
    loggers.error('Campaign generation failed', error as Error, {
      apikey: apikey?.substring(0, 8) + '...',
      productId: product_id,
      ip: req.ip
    });

    res.status(500).json({
      error: 'Campaign generation failed',
      code: 'GENERATION_ERROR'
    });
  }
});

// Generate bulk campaigns
router.post('/bulk', async (req: Request, res: Response) => {
  const { apikey, campaigns } = req.body;

  try {
    if (!Array.isArray(campaigns) || campaigns.length === 0) {
      res.status(400).json({
        error: 'Campaigns array is required',
        code: 'INVALID_CAMPAIGNS'
      });
      return;
    }

    // Verify API key
    const authUser = await prisma.authUser.findFirst({
      where: {
        api_key: apikey,
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

    const results = [];
    const errors = [];

    for (const [index, campaignData] of campaigns.entries()) {
      try {
        const { product_id, country, operator, reference } = campaignData;

        // Verify product exists and belongs to customer
        const product = await prisma.product.findFirst({
          where: {
            id_product: product_id,
            id_customer: authUser.customer_id
          }
        });

        if (!product) {
          errors.push({
            index,
            error: 'Product not found or access denied',
            productId: product_id
          });
          continue;
        }

        // Generate tracking IDs
        const trackingId = generateTrackingId();
        const shortTracking = generateShortTracking();
        const uuid = uuidv4();
        const timestamp = new Date();

        // Create campaign
        const campaign = await prisma.campaign.create({
          data: {
            xafra_tracking_id: trackingId,
            short_tracking: shortTracking,
            uuid: uuid,
            id_product: product_id,
            tracking: `${trackingId}-${country}-${operator}`,
            status: 1,
            country: country || '',
            operator: operator || '',
            creation_date: timestamp,
            modification_date: timestamp
          }
        });

        results.push({
          index,
          campaignId: campaign.id.toString(),
          trackingId: trackingId,
          shortTracking: shortTracking,
          productId: product_id,
          country,
          operator
        });

      } catch (error) {
        errors.push({
          index,
          error: 'Campaign creation failed',
          details: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    loggers.tracking('bulk_campaigns_generated', 'bulk_operation', Number(authUser.customer_id), {
      totalRequested: campaigns.length,
      successfulCreations: results.length,
      errors: errors.length,
      ip: req.ip
    });

    res.json({
      success: true,
      data: {
        totalRequested: campaigns.length,
        successful: results.length,
        failed: errors.length,
        results,
        errors
      }
    });

  } catch (error) {
    loggers.error('Bulk campaign generation failed', error as Error, {
      apikey: apikey?.substring(0, 8) + '...',
      campaignCount: campaigns?.length || 0,
      ip: req.ip
    });

    res.status(500).json({
      error: 'Bulk campaign generation failed',
      code: 'BULK_GENERATION_ERROR'
    });
  }
});

// Generate short tracking URL for existing campaign
router.post('/short-url', async (req: Request, res: Response) => {
  const { apikey, campaign_id } = req.body;

  try {
    // Verify API key
    const authUser = await prisma.authUser.findFirst({
      where: {
        api_key: apikey,
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

    // Get campaign and verify ownership
    const campaign = await prisma.campaign.findFirst({
      where: {
        id: BigInt(campaign_id)
      },
      include: {
        product: true
      }
    });

    if (!campaign || campaign.product?.id_customer !== authUser.customer_id) {
      res.status(404).json({
        error: 'Campaign not found or access denied',
        code: 'CAMPAIGN_NOT_FOUND'
      });
      return;
    }

    // Generate new short tracking if needed
    let shortTracking = campaign.short_tracking;
    if (!shortTracking) {
      shortTracking = generateShortTracking();
      
      await prisma.campaign.update({
        where: { id: campaign.id },
        data: { 
          short_tracking: shortTracking,
          modification_date: new Date()
        }
      });
    }

    const shortUrl = `${process.env.TRACKING_BASE_URL || 'https://track.xafra.com'}/${shortTracking}`;

    res.json({
      success: true,
      data: {
        campaignId: campaign.id.toString(),
        shortTracking: shortTracking,
        shortUrl: shortUrl,
        originalTracking: campaign.xafra_tracking_id
      }
    });

  } catch (error) {
    loggers.error('Short URL generation failed', error as Error, {
      apikey: apikey?.substring(0, 8) + '...',
      campaignId: campaign_id,
      ip: req.ip
    });

    res.status(500).json({
      error: 'Short URL generation failed',
      code: 'SHORT_URL_ERROR'
    });
  }
});

// Helper functions
function generateTrackingId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `XF-${timestamp}-${random}`.toUpperCase();
}

function generateShortTracking(): string {
  return crypto.randomBytes(4).toString('hex').toLowerCase();
}

export default router;