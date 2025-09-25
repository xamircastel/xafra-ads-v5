import { Router, Request, Response } from 'express';
import { loggers } from '@xafra/shared/logger';
import { cache } from '@xafra/shared/cache';
import { prisma } from '@xafra/database';

const router = Router();

// Validate tracking ID exists and is active
router.get('/:trackingId', async (req: Request, res: Response) => {
  const { trackingId } = req.params;
  const { format = 'json' } = req.query;

  try {
    // Check cache first
    const cacheKey = `validation:${trackingId}`;
    const cachedResult = await cache.get(cacheKey);
    
    if (cachedResult) {
      const validationData = JSON.parse(cachedResult as string);
      
      if (format === 'simple') {
        res.json({ valid: validationData.valid });
        return;
      }
      
      res.json(validationData);
      return;
    }

    // Look up in database (removed product/customer includes)
    const campaign = await prisma.campaign.findFirst({
      where: {
        tracking: trackingId
      }
    });

    const isValid = campaign !== null && campaign.status !== 0; // Not deleted
    const validationData = {
      valid: isValid,
      trackingId: trackingId,
      exists: campaign !== null,
      status: campaign?.status,
      statusText: getStatusText(campaign?.status),
      campaign: campaign ? {
        id: campaign.id,
        xafraTrackingId: campaign.xafra_tracking_id,
        shortTracking: campaign.short_tracking,
        country: campaign.country,
        operator: campaign.operator,
        createdAt: new Date(Number(campaign.creation_date)).toISOString(),
        product: {
          id: campaign.id_product,
          name: 'Product Name' // Mock data
        }
      } : null,
      validatedAt: new Date().toISOString()
    };

    // Cache validation result for 5 minutes
    await cache.set(cacheKey, JSON.stringify(validationData), 300);

    loggers.tracking('tracking_validated', trackingId, Number(campaign?.id_product || 0), {
      valid: isValid,
      campaignId: campaign?.id,
      customerId: 1, // Mock customer ID
      ip: req.ip
    });

    if (format === 'simple') {
      res.json({ valid: isValid });
      return;
    }

    res.json(validationData);

  } catch (error) {
    loggers.error('Tracking validation failed', error as Error, {
      trackingId,
      ip: req.ip
    });

    res.status(500).json({
      valid: false,
      error: 'Validation failed',
      code: 'VALIDATION_ERROR'
    });
  }
});

// Validate multiple tracking IDs in batch
router.post('/batch', async (req: Request, res: Response) => {
  const { trackingIds } = req.body;

  try {
    if (!Array.isArray(trackingIds) || trackingIds.length === 0) {
      res.status(400).json({
        error: 'trackingIds must be a non-empty array',
        code: 'INVALID_INPUT'
      });
      return;
    }

    if (trackingIds.length > 100) {
      res.status(400).json({
        error: 'Maximum 100 tracking IDs per batch',
        code: 'BATCH_LIMIT_EXCEEDED'
      });
      return;
    }

    const results = [];

    // Process each tracking ID
    for (const trackingId of trackingIds) {
      try {
        // Check cache first
        const cacheKey = `validation:${trackingId}`;
        const cachedResult = await cache.get(cacheKey);
        
        if (cachedResult) {
          const validationData = JSON.parse(cachedResult as string);
          results.push({
            trackingId,
            valid: validationData.valid,
            status: validationData.status,
            cached: true
          });
          continue;
        }

        // Look up in database
        const campaign = await prisma.campaign.findFirst({
          where: {
            tracking: trackingId
          },
          select: {
            id: true,
            status: true,
            id_product: true
          }
        });

        const isValid = campaign !== null && campaign.status !== 0;
        
        const validationData = {
          valid: isValid,
          status: campaign?.status,
          campaignId: campaign?.id,
          productId: campaign?.id_product
        };

        // Cache for 5 minutes
        await cache.set(cacheKey, JSON.stringify(validationData), 300);

        results.push({
          trackingId,
          valid: isValid,
          status: campaign?.status,
          cached: false
        });

      } catch (error) {
        results.push({
          trackingId,
          valid: false,
          error: 'Validation failed'
        });
      }
    }

    const validCount = results.filter(r => r.valid).length;

    res.json({
      success: true,
      data: {
        results,
        summary: {
          total: trackingIds.length,
          valid: validCount,
          invalid: trackingIds.length - validCount,
          cached: results.filter(r => r.cached).length
        }
      }
    });

  } catch (error) {
    loggers.error('Batch tracking validation failed', error as Error, {
      trackingIdsCount: trackingIds?.length,
      ip: req.ip
    });

    res.status(500).json({
      error: 'Batch validation failed',
      code: 'BATCH_VALIDATION_ERROR'
    });
  }
});

// Check tracking ID availability for new campaigns
router.get('/available/:trackingId', async (req: Request, res: Response) => {
  const { trackingId } = req.params;

  try {
    const existingCampaign = await prisma.campaign.findFirst({
      where: {
        tracking: trackingId
      },
      select: {
        id: true,
        status: true
      }
    });

    const isAvailable = existingCampaign === null;

    res.json({
      trackingId,
      available: isAvailable,
      exists: existingCampaign !== null,
      status: existingCampaign?.status,
      statusText: getStatusText(existingCampaign?.status),
      checkedAt: new Date().toISOString()
    });

  } catch (error) {
    loggers.error('Tracking availability check failed', error as Error, {
      trackingId,
      ip: req.ip
    });

    res.status(500).json({
      error: 'Availability check failed',
      code: 'AVAILABILITY_CHECK_ERROR'
    });
  }
});

// Validate short tracking ID format and availability
router.get('/short/:shortTracking', async (req: Request, res: Response) => {
  const { shortTracking } = req.params;

  try {
    // Validate format (for Kolbi)
    if (shortTracking.length > 8) {
      res.json({
        valid: false,
        available: false,
        reason: 'Short tracking ID too long (max 8 characters)',
        shortTracking
      });
      return;
    }

    // Check if already in use (removed product/customer includes)
    const existingCampaign = await prisma.campaign.findFirst({
      where: {
        short_tracking: shortTracking,
        status: { in: [1, 2] } // Active or pending
      }
    });

    const isAvailable = existingCampaign === null;

    res.json({
      shortTracking,
      valid: shortTracking.length <= 8,
      available: isAvailable,
      exists: existingCampaign !== null,
      inUseBy: existingCampaign ? {
        campaignId: existingCampaign.id,
        product: 'Product Name', // Mock data
        customer: 'Customer Name' // Mock data
      } : null,
      checkedAt: new Date().toISOString()
    });

  } catch (error) {
    loggers.error('Short tracking validation failed', error as Error, {
      shortTracking,
      ip: req.ip
    });

    res.status(500).json({
      error: 'Short tracking validation failed',
      code: 'SHORT_TRACKING_ERROR'
    });
  }
});

// Helper function to get status text
function getStatusText(status: number | undefined): string {
  switch (status) {
    case 0: return 'deleted';
    case 1: return 'active';
    case 2: return 'pending';
    case 3: return 'paused';
    default: return 'unknown';
  }
}

export default router;