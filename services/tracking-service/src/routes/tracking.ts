import { Router, Request, Response } from 'express';
import { loggers } from '@xafra/shared/logger';
import { cache } from '@xafra/shared/cache';
import { prisma } from '@xafra/database';

const router = Router();

// Get tracking information by tracking ID
router.get('/:trackingId', async (req: Request, res: Response) => {
  const { trackingId } = req.params;
  const { include = 'basic' } = req.query;

  try {
    // Check cache first
    const cacheKey = `tracking_info:${trackingId}`;
    const cachedData = await cache.get(cacheKey);
    
    if (cachedData && include === 'basic') {
      res.json(JSON.parse(cachedData as string));
      return;
    }

    // Get campaign and related data
    const campaign = await prisma.campaign.findFirst({
      where: {
        tracking: trackingId
      },
      include: {
        product: {
          include: {
            customer: true
          }
        },
        ...(include === 'full' ? {
          tracking: {
            take: 10,
            orderBy: {
              creation_date: 'desc'
            }
          },
          confirm: {
            take: 10,
            orderBy: {
              creation_date: 'desc'
            }
          }
        } : {})
      }
    });

    if (!campaign) {
      res.status(404).json({
        error: 'Tracking ID not found',
        code: 'TRACKING_NOT_FOUND',
        trackingId
      });
      return;
    }

    // Build response data
    const trackingInfo = {
      trackingId: campaign.tracking,
      xafraTrackingId: campaign.xafra_tracking_id,
      shortTracking: campaign.short_tracking,
      uuid: campaign.uuid,
      status: campaign.status,
      statusText: getStatusText(campaign.status),
      country: campaign.country,
      operator: campaign.operator,
      campaign: {
        id: campaign.id,
        createdAt: new Date(Number(campaign.creation_date)).toISOString(),
        modifiedAt: new Date(Number(campaign.modification_date)).toISOString()
      },
      product: {
        id: campaign.product.id,
        name: campaign.product.name,
        country: campaign.product.country,
        operator: campaign.product.operator,
        customer: {
          id: campaign.product.customer.id,
          name: campaign.product.customer.name
        }
      },
      urls: {
        standard: `${process.env['BASE_URL']}/ads/${trackingId}`,
        autoTracking: `${process.env['BASE_URL']}/ads/tr/${trackingId}`,
        randomTracking: `${process.env['BASE_URL']}/ads/random/${trackingId}`
      },
      ...(include === 'full' && campaign.tracking ? {
        stats: {
          totalClicks: campaign.tracking.length,
          totalConversions: campaign.confirm?.filter(c => c.status === 1).length || 0,
          recentClicks: campaign.tracking.map(track => ({
            id: track.id,
            timestamp: new Date(Number(track.creation_date)).toISOString(),
            country: track.country,
            operator: track.operator,
            ip: track.ip
          })),
          recentConversions: campaign.confirm?.filter(c => c.status === 1).map(conv => ({
            id: conv.id,
            timestamp: new Date(Number(conv.creation_date)).toISOString(),
            amount: conv.amount,
            currency: conv.currency
          })) || []
        }
      } : {})
    };

    // Cache basic info for 5 minutes
    if (include === 'basic') {
      await cache.set(cacheKey, JSON.stringify(trackingInfo), 300);
    }

    loggers.tracking('tracking_info_retrieved', trackingId, campaign.id_product, {
      campaignId: campaign.id,
      customerId: campaign.product.customer_id,
      includeLevel: include,
      ip: req.ip
    });

    res.json({
      success: true,
      data: trackingInfo
    });

  } catch (error) {
    loggers.error('Tracking info retrieval failed', error as Error, {
      trackingId,
      include,
      ip: req.ip
    });

    res.status(500).json({
      error: 'Failed to retrieve tracking information',
      code: 'TRACKING_INFO_ERROR'
    });
  }
});

// Update tracking ID status
router.put('/:trackingId/status', async (req: Request, res: Response) => {
  const { trackingId } = req.params;
  const { status, reason } = req.body;

  try {
    // Validate status
    const validStatuses = [0, 1, 2, 3]; // deleted, active, pending, paused
    if (!validStatuses.includes(status)) {
      res.status(400).json({
        error: 'Invalid status. Must be 0 (deleted), 1 (active), 2 (pending), or 3 (paused)',
        code: 'INVALID_STATUS'
      });
      return;
    }

    // Find and update campaign
    const campaign = await prisma.campaign.findFirst({
      where: {
        tracking: trackingId
      }
    });

    if (!campaign) {
      res.status(404).json({
        error: 'Tracking ID not found',
        code: 'TRACKING_NOT_FOUND'
      });
      return;
    }

    const updatedCampaign = await prisma.campaign.update({
      where: {
        id: campaign.id
      },
      data: {
        status: status,
        modification_date: BigInt(Date.now())
      }
    });

    // Clear cache
    await cache.del(`tracking_info:${trackingId}`);
    await cache.del(`validation:${trackingId}`);

    loggers.tracking('tracking_status_updated', trackingId, campaign.id_product, {
      campaignId: campaign.id,
      oldStatus: campaign.status,
      newStatus: status,
      reason: reason || null,
      ip: req.ip
    });

    res.json({
      success: true,
      data: {
        trackingId,
        campaignId: campaign.id,
        oldStatus: campaign.status,
        newStatus: status,
        statusText: getStatusText(status),
        updatedAt: new Date(Number(updatedCampaign.modification_date)).toISOString()
      }
    });

  } catch (error) {
    loggers.error('Tracking status update failed', error as Error, {
      trackingId,
      status,
      ip: req.ip
    });

    res.status(500).json({
      error: 'Failed to update tracking status',
      code: 'STATUS_UPDATE_ERROR'
    });
  }
});

// Get all tracking IDs for a product
router.get('/product/:productId', async (req: Request, res: Response) => {
  const { productId } = req.params;
  const { 
    status,
    limit = '50',
    offset = '0',
    sortBy = 'created_desc'
  } = req.query;

  try {
    // Build where clause
    const whereClause: any = {
      id_product: parseInt(productId as string)
    };

    if (status !== undefined) {
      whereClause.status = parseInt(status as string);
    }

    // Build order clause
    const orderBy: any = {};
    switch (sortBy) {
      case 'created_asc':
        orderBy.creation_date = 'asc';
        break;
      case 'created_desc':
        orderBy.creation_date = 'desc';
        break;
      case 'modified_asc':
        orderBy.modification_date = 'asc';
        break;
      case 'modified_desc':
        orderBy.modification_date = 'desc';
        break;
      default:
        orderBy.creation_date = 'desc';
    }

    // Get campaigns
    const campaigns = await prisma.campaign.findMany({
      where: whereClause,
      include: {
        product: {
          select: {
            id: true,
            name: true,
            customer: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        _count: {
          select: {
            tracking: true,
            confirm: {
              where: {
                status: 1
              }
            }
          }
        }
      },
      orderBy,
      take: parseInt(limit as string),
      skip: parseInt(offset as string)
    });

    // Get total count
    const totalCount = await prisma.campaign.count({
      where: whereClause
    });

    const trackingList = campaigns.map(campaign => ({
      campaignId: campaign.id,
      trackingId: campaign.tracking,
      xafraTrackingId: campaign.xafra_tracking_id,
      shortTracking: campaign.short_tracking,
      uuid: campaign.uuid,
      status: campaign.status,
      statusText: getStatusText(campaign.status),
      country: campaign.country,
      operator: campaign.operator,
      createdAt: new Date(Number(campaign.creation_date)).toISOString(),
      modifiedAt: new Date(Number(campaign.modification_date)).toISOString(),
      product: campaign.product,
      stats: {
        totalClicks: campaign._count.tracking,
        totalConversions: campaign._count.confirm
      },
      urls: {
        standard: `${process.env['BASE_URL']}/ads/${campaign.tracking}`,
        autoTracking: `${process.env['BASE_URL']}/ads/tr/${campaign.tracking}`,
        randomTracking: `${process.env['BASE_URL']}/ads/random/${campaign.tracking}`
      }
    }));

    res.json({
      success: true,
      data: {
        productId: parseInt(productId as string),
        totalCount,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        campaigns: trackingList
      }
    });

  } catch (error) {
    loggers.error('Product tracking list failed', error as Error, {
      productId,
      ip: req.ip
    });

    res.status(500).json({
      error: 'Failed to retrieve product tracking list',
      code: 'PRODUCT_TRACKING_ERROR'
    });
  }
});

// Search tracking IDs
router.get('/search/:query', async (req: Request, res: Response) => {
  const { query } = req.params;
  const { limit = '20' } = req.query;

  try {
    // Search in tracking, xafra_tracking_id, short_tracking, and uuid fields
    const campaigns = await prisma.campaign.findMany({
      where: {
        OR: [
          {
            tracking: {
              contains: query,
              mode: 'insensitive'
            }
          },
          {
            xafra_tracking_id: {
              contains: query,
              mode: 'insensitive'
            }
          },
          {
            short_tracking: {
              contains: query,
              mode: 'insensitive'
            }
          },
          {
            uuid: {
              contains: query,
              mode: 'insensitive'
            }
          }
        ],
        status: { not: 0 } // Exclude deleted
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            customer: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      },
      take: parseInt(limit as string),
      orderBy: {
        creation_date: 'desc'
      }
    });

    const searchResults = campaigns.map(campaign => ({
      campaignId: campaign.id,
      trackingId: campaign.tracking,
      xafraTrackingId: campaign.xafra_tracking_id,
      shortTracking: campaign.short_tracking,
      uuid: campaign.uuid,
      status: campaign.status,
      statusText: getStatusText(campaign.status),
      country: campaign.country,
      operator: campaign.operator,
      product: campaign.product,
      createdAt: new Date(Number(campaign.creation_date)).toISOString(),
      matchType: getMatchType(query, campaign)
    }));

    res.json({
      success: true,
      data: {
        query,
        totalResults: searchResults.length,
        results: searchResults
      }
    });

  } catch (error) {
    loggers.error('Tracking search failed', error as Error, {
      query,
      ip: req.ip
    });

    res.status(500).json({
      error: 'Search failed',
      code: 'SEARCH_ERROR'
    });
  }
});

// Helper function to get status text
function getStatusText(status: number): string {
  switch (status) {
    case 0: return 'deleted';
    case 1: return 'active';
    case 2: return 'pending';
    case 3: return 'paused';
    default: return 'unknown';
  }
}

// Helper function to determine match type in search
function getMatchType(query: string, campaign: any): string {
  const lowerQuery = query.toLowerCase();
  
  if (campaign.tracking.toLowerCase().includes(lowerQuery)) return 'tracking_id';
  if (campaign.xafra_tracking_id?.toLowerCase().includes(lowerQuery)) return 'xafra_tracking_id';
  if (campaign.short_tracking?.toLowerCase().includes(lowerQuery)) return 'short_tracking';
  if (campaign.uuid?.toLowerCase().includes(lowerQuery)) return 'uuid';
  
  return 'unknown';
}

export default router;