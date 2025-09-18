import { Router, Request, Response } from 'express';
import { loggers } from '@xafra/shared/logger';
import { cache } from '@xafra/shared/cache';
import { prisma } from '@xafra/database';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Get campaign details
router.get('/:campaignId', async (req: Request, res: Response) => {
  const { campaignId } = req.params;
  const { include_stats = 'false', include_tracking = 'false' } = req.query;

  try {
    const campaign = await prisma.campaign.findFirst({
      where: {
        id: parseInt(campaignId as string)
      },
      include: {
        product: {
          include: {
            customer: {
              select: {
                id: true,
                name: true,
                status: true
              }
            }
          }
        },
        ...(include_stats === 'true' ? {
          _count: {
            select: {
              tracking: true,
              confirm: {
                where: { status: 1 }
              }
            }
          }
        } : {}),
        ...(include_tracking === 'true' ? {
          tracking: {
            take: 10,
            orderBy: {
              creation_date: 'desc'
            },
            select: {
              id: true,
              creation_date: true,
              country: true,
              operator: true,
              ip: true
            }
          }
        } : {})
      }
    });

    if (!campaign) {
      res.status(404).json({
        error: 'Campaign not found',
        code: 'CAMPAIGN_NOT_FOUND'
      });
      return;
    }

    const campaignData: any = {
      id: campaign.id,
      trackingId: campaign.tracking,
      xafraTrackingId: campaign.xafra_tracking_id,
      shortTracking: campaign.short_tracking,
      uuid: campaign.uuid,
      status: campaign.status,
      statusText: getCampaignStatusText(campaign.status),
      country: campaign.country,
      operator: campaign.operator,
      createdAt: new Date(Number(campaign.creation_date)).toISOString(),
      modifiedAt: new Date(Number(campaign.modification_date)).toISOString(),
      postbackStatus: campaign.status_post_back,
      postbackDate: campaign.date_post_back ? new Date(Number(campaign.date_post_back)).toISOString() : null,
      product: {
        id: campaign.product.id,
        name: campaign.product.name,
        url: campaign.product.url,
        country: campaign.product.country,
        operator: campaign.product.operator,
        customer: campaign.product.customer
      },
      urls: {
        standard: `${process.env['BASE_URL']}/ads/${campaign.tracking}`,
        autoTracking: `${process.env['BASE_URL']}/ads/tr/${campaign.tracking}`,
        randomTracking: `${process.env['BASE_URL']}/ads/random/${campaign.tracking}`
      }
    };

    if (include_stats === 'true' && campaign._count) {
      campaignData.stats = {
        totalClicks: campaign._count.tracking,
        totalConversions: campaign._count.confirm,
        conversionRate: campaign._count.tracking > 0 
          ? Math.round((campaign._count.confirm / campaign._count.tracking) * 10000) / 100 
          : 0
      };
    }

    if (include_tracking === 'true' && campaign.tracking) {
      campaignData.recentTracking = campaign.tracking.map(track => ({
        id: track.id,
        timestamp: new Date(Number(track.creation_date)).toISOString(),
        country: track.country,
        operator: track.operator,
        ip: track.ip
      }));
    }

    res.json({
      success: true,
      data: campaignData
    });

  } catch (error) {
    loggers.error('Campaign details retrieval failed', error as Error, {
      campaignId,
      ip: req.ip
    });

    res.status(500).json({
      error: 'Failed to retrieve campaign details',
      code: 'CAMPAIGN_DETAILS_ERROR'
    });
  }
});

// List campaigns with filters
router.get('/', async (req: Request, res: Response) => {
  const { 
    customer_id,
    product_id,
    status,
    country,
    operator,
    limit = '50',
    offset = '0',
    sortBy = 'created_desc',
    include_stats = 'false'
  } = req.query;

  try {
    // Build where clause
    const whereClause: any = {};
    
    if (customer_id) {
      whereClause.product = {
        customer_id: parseInt(customer_id as string)
      };
    }
    
    if (product_id) {
      whereClause.id_product = parseInt(product_id as string);
    }
    
    if (status !== undefined) {
      whereClause.status = parseInt(status as string);
    }
    
    if (country) {
      whereClause.country = country as string;
    }
    
    if (operator) {
      whereClause.operator = operator as string;
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

    const [campaigns, totalCount] = await Promise.all([
      prisma.campaign.findMany({
        where: whereClause,
        include: {
          product: {
            include: {
              customer: {
                select: {
                  id: true,
                  name: true,
                  status: true
                }
              }
            }
          },
          ...(include_stats === 'true' ? {
            _count: {
              select: {
                tracking: true,
                confirm: {
                  where: { status: 1 }
                }
              }
            }
          } : {})
        },
        orderBy,
        take: parseInt(limit as string),
        skip: parseInt(offset as string)
      }),
      prisma.campaign.count({ where: whereClause })
    ]);

    const campaignList = campaigns.map(campaign => ({
      id: campaign.id,
      trackingId: campaign.tracking,
      xafraTrackingId: campaign.xafra_tracking_id,
      shortTracking: campaign.short_tracking,
      uuid: campaign.uuid,
      status: campaign.status,
      statusText: getCampaignStatusText(campaign.status),
      country: campaign.country,
      operator: campaign.operator,
      createdAt: new Date(Number(campaign.creation_date)).toISOString(),
      modifiedAt: new Date(Number(campaign.modification_date)).toISOString(),
      product: {
        id: campaign.product.id,
        name: campaign.product.name,
        customer: campaign.product.customer
      },
      ...(include_stats === 'true' && campaign._count ? {
        stats: {
          totalClicks: campaign._count.tracking,
          totalConversions: campaign._count.confirm,
          conversionRate: campaign._count.tracking > 0 
            ? Math.round((campaign._count.confirm / campaign._count.tracking) * 10000) / 100 
            : 0
        }
      } : {})
    }));

    res.json({
      success: true,
      data: {
        totalCount,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        campaigns: campaignList
      }
    });

  } catch (error) {
    loggers.error('Campaign list retrieval failed', error as Error, {
      filters: { customer_id, product_id, status, country, operator },
      ip: req.ip
    });

    res.status(500).json({
      error: 'Failed to retrieve campaigns',
      code: 'CAMPAIGN_LIST_ERROR'
    });
  }
});

// Update campaign status
router.put('/:campaignId/status', async (req: Request, res: Response) => {
  const { campaignId } = req.params;
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

    const campaign = await prisma.campaign.findFirst({
      where: {
        id: parseInt(campaignId as string)
      },
      include: {
        product: {
          include: {
            customer: true
          }
        }
      }
    });

    if (!campaign) {
      res.status(404).json({
        error: 'Campaign not found',
        code: 'CAMPAIGN_NOT_FOUND'
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

    // Clear relevant caches
    const cacheKeys = [
      `tracking_info:${campaign.tracking}`,
      `validation:${campaign.tracking}`,
      `campaign:${campaign.id}`
    ];
    
    for (const key of cacheKeys) {
      await cache.del(key);
    }

    loggers.tracking('campaign_status_updated', campaign.tracking, campaign.id_product, {
      campaignId: campaign.id,
      oldStatus: campaign.status,
      newStatus: status,
      reason: reason || null,
      customerId: campaign.product.customer_id,
      ip: req.ip
    });

    res.json({
      success: true,
      data: {
        campaignId: campaign.id,
        trackingId: campaign.tracking,
        oldStatus: campaign.status,
        newStatus: status,
        statusText: getCampaignStatusText(status),
        updatedAt: new Date(Number(updatedCampaign.modification_date)).toISOString(),
        product: {
          id: campaign.product.id,
          name: campaign.product.name,
          customer: campaign.product.customer.name
        }
      }
    });

  } catch (error) {
    loggers.error('Campaign status update failed', error as Error, {
      campaignId,
      status,
      ip: req.ip
    });

    res.status(500).json({
      error: 'Failed to update campaign status',
      code: 'CAMPAIGN_STATUS_UPDATE_ERROR'
    });
  }
});

// Update campaign postback status
router.put('/:campaignId/postback', async (req: Request, res: Response) => {
  const { campaignId } = req.params;
  const { status, date, webhook_url, notes } = req.body;

  try {
    const campaign = await prisma.campaign.findFirst({
      where: {
        id: parseInt(campaignId as string)
      }
    });

    if (!campaign) {
      res.status(404).json({
        error: 'Campaign not found',
        code: 'CAMPAIGN_NOT_FOUND'
      });
      return;
    }

    const postbackDate = date ? BigInt(new Date(date).getTime()) : BigInt(Date.now());

    const updatedCampaign = await prisma.campaign.update({
      where: {
        id: campaign.id
      },
      data: {
        status_post_back: status,
        date_post_back: postbackDate,
        modification_date: BigInt(Date.now())
      }
    });

    loggers.tracking('campaign_postback_updated', campaign.tracking, campaign.id_product, {
      campaignId: campaign.id,
      oldPostbackStatus: campaign.status_post_back,
      newPostbackStatus: status,
      webhookUrl: webhook_url,
      notes: notes || null,
      ip: req.ip
    });

    res.json({
      success: true,
      data: {
        campaignId: campaign.id,
        trackingId: campaign.tracking,
        postbackStatus: status,
        postbackDate: new Date(Number(postbackDate)).toISOString(),
        updatedAt: new Date(Number(updatedCampaign.modification_date)).toISOString()
      }
    });

  } catch (error) {
    loggers.error('Campaign postback update failed', error as Error, {
      campaignId,
      status,
      ip: req.ip
    });

    res.status(500).json({
      error: 'Failed to update campaign postback',
      code: 'CAMPAIGN_POSTBACK_UPDATE_ERROR'
    });
  }
});

// Delete campaign
router.delete('/:campaignId', async (req: Request, res: Response) => {
  const { campaignId } = req.params;
  const { permanent = 'false', reason } = req.body;

  try {
    const campaign = await prisma.campaign.findFirst({
      where: {
        id: parseInt(campaignId as string)
      },
      include: {
        product: {
          include: {
            customer: true
          }
        }
      }
    });

    if (!campaign) {
      res.status(404).json({
        error: 'Campaign not found',
        code: 'CAMPAIGN_NOT_FOUND'
      });
      return;
    }

    if (permanent === 'true') {
      // Permanent deletion - remove from database
      await prisma.campaign.delete({
        where: {
          id: campaign.id
        }
      });

      loggers.tracking('campaign_deleted_permanent', campaign.tracking, campaign.id_product, {
        campaignId: campaign.id,
        reason: reason || null,
        customerId: campaign.product.customer_id,
        ip: req.ip
      });

      res.json({
        success: true,
        data: {
          campaignId: campaign.id,
          trackingId: campaign.tracking,
          deleted: true,
          permanent: true,
          deletedAt: new Date().toISOString()
        }
      });
    } else {
      // Soft deletion - set status to 0
      const updatedCampaign = await prisma.campaign.update({
        where: {
          id: campaign.id
        },
        data: {
          status: 0,
          modification_date: BigInt(Date.now())
        }
      });

      loggers.tracking('campaign_deleted_soft', campaign.tracking, campaign.id_product, {
        campaignId: campaign.id,
        reason: reason || null,
        customerId: campaign.product.customer_id,
        ip: req.ip
      });

      res.json({
        success: true,
        data: {
          campaignId: campaign.id,
          trackingId: campaign.tracking,
          deleted: true,
          permanent: false,
          deletedAt: new Date(Number(updatedCampaign.modification_date)).toISOString()
        }
      });
    }

    // Clear caches
    const cacheKeys = [
      `tracking_info:${campaign.tracking}`,
      `validation:${campaign.tracking}`,
      `campaign:${campaign.id}`
    ];
    
    for (const key of cacheKeys) {
      await cache.del(key);
    }

  } catch (error) {
    loggers.error('Campaign deletion failed', error as Error, {
      campaignId,
      permanent,
      ip: req.ip
    });

    res.status(500).json({
      error: 'Failed to delete campaign',
      code: 'CAMPAIGN_DELETION_ERROR'
    });
  }
});

// Bulk operations on campaigns
router.post('/bulk', async (req: Request, res: Response) => {
  const { 
    operation, 
    campaign_ids, 
    filters,
    data 
  } = req.body;

  try {
    if (!operation || !['status_update', 'delete', 'export'].includes(operation)) {
      res.status(400).json({
        error: 'Invalid operation. Must be status_update, delete, or export',
        code: 'INVALID_OPERATION'
      });
      return;
    }

    let targetCampaigns: number[] = [];

    if (campaign_ids && Array.isArray(campaign_ids)) {
      targetCampaigns = campaign_ids.map(id => parseInt(id));
    } else if (filters) {
      // Build where clause from filters
      const whereClause: any = {};
      
      if (filters.customer_id) whereClause.product = { customer_id: filters.customer_id };
      if (filters.product_id) whereClause.id_product = filters.product_id;
      if (filters.status !== undefined) whereClause.status = filters.status;
      if (filters.country) whereClause.country = filters.country;
      if (filters.operator) whereClause.operator = filters.operator;

      const campaigns = await prisma.campaign.findMany({
        where: whereClause,
        select: { id: true }
      });

      targetCampaigns = campaigns.map(c => c.id);
    }

    if (targetCampaigns.length === 0) {
      res.status(400).json({
        error: 'No campaigns specified for bulk operation',
        code: 'NO_CAMPAIGNS_SPECIFIED'
      });
      return;
    }

    const results: any[] = [];

    switch (operation) {
      case 'status_update':
        if (!data.status || ![0, 1, 2, 3].includes(data.status)) {
          res.status(400).json({
            error: 'Valid status required for status_update operation',
            code: 'INVALID_STATUS_FOR_BULK'
          });
          return;
        }

        const updateResult = await prisma.campaign.updateMany({
          where: {
            id: { in: targetCampaigns }
          },
          data: {
            status: data.status,
            modification_date: BigInt(Date.now())
          }
        });

        results.push({
          operation: 'status_update',
          affected: updateResult.count,
          newStatus: data.status,
          statusText: getCampaignStatusText(data.status)
        });
        break;

      case 'delete':
        if (data.permanent === true) {
          const deleteResult = await prisma.campaign.deleteMany({
            where: {
              id: { in: targetCampaigns }
            }
          });

          results.push({
            operation: 'permanent_delete',
            affected: deleteResult.count
          });
        } else {
          const softDeleteResult = await prisma.campaign.updateMany({
            where: {
              id: { in: targetCampaigns }
            },
            data: {
              status: 0,
              modification_date: BigInt(Date.now())
            }
          });

          results.push({
            operation: 'soft_delete',
            affected: softDeleteResult.count
          });
        }
        break;

      case 'export':
        const exportCampaigns = await prisma.campaign.findMany({
          where: {
            id: { in: targetCampaigns }
          },
          include: {
            product: {
              include: {
                customer: true
              }
            }
          }
        });

        results.push({
          operation: 'export',
          affected: exportCampaigns.length,
          data: exportCampaigns.map(campaign => ({
            id: campaign.id,
            trackingId: campaign.tracking,
            status: getCampaignStatusText(campaign.status),
            country: campaign.country,
            operator: campaign.operator,
            product: campaign.product.name,
            customer: campaign.product.customer.name,
            createdAt: new Date(Number(campaign.creation_date)).toISOString()
          }))
        });
        break;
    }

    res.json({
      success: true,
      data: {
        operation,
        totalCampaigns: targetCampaigns.length,
        results,
        processedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    loggers.error('Bulk campaign operation failed', error as Error, {
      operation,
      campaignCount: campaign_ids?.length || 'unknown',
      ip: req.ip
    });

    res.status(500).json({
      error: 'Bulk operation failed',
      code: 'BULK_OPERATION_ERROR'
    });
  }
});

// Helper function
function getCampaignStatusText(status: number): string {
  switch (status) {
    case 0: return 'deleted';
    case 1: return 'active';
    case 2: return 'pending';
    case 3: return 'paused';
    default: return 'unknown';
  }
}

export default router;