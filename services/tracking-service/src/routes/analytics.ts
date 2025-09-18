import { Router, Request, Response } from 'express';
import { loggers } from '@xafra/shared/logger';
import { cache } from '@xafra/shared/cache';
import { prisma } from '@xafra/database';

const router = Router();

// Get tracking analytics for a specific campaign
router.get('/campaign/:campaignId', async (req: Request, res: Response) => {
  const { campaignId } = req.params;
  const { 
    startDate, 
    endDate, 
    groupBy = 'day',
    includeDetails = 'false'
  } = req.query;

  try {
    // Verify campaign exists
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

    // Build date filter
    const dateFilter: any = {};
    if (startDate) {
      dateFilter.gte = BigInt(new Date(startDate as string).getTime());
    }
    if (endDate) {
      dateFilter.lte = BigInt(new Date(endDate as string).getTime());
    }

    // Get tracking stats
    const trackingStats = await prisma.tracking.findMany({
      where: {
        id_campaign: parseInt(campaignId as string),
        ...(Object.keys(dateFilter).length > 0 ? { creation_date: dateFilter } : {})
      },
      select: {
        id: true,
        creation_date: true,
        country: true,
        operator: true,
        device_type: true,
        ip: true,
        user_agent: true,
        referer: true
      },
      orderBy: {
        creation_date: 'desc'
      }
    });

    // Get conversion stats
    const conversionStats = await prisma.confirm.findMany({
      where: {
        id_campaign: parseInt(campaignId as string),
        ...(Object.keys(dateFilter).length > 0 ? { creation_date: dateFilter } : {})
      },
      select: {
        id: true,
        creation_date: true,
        amount: true,
        currency: true,
        status: true
      }
    });

    // Group data by specified period
    const groupedData = groupDataByPeriod(trackingStats, conversionStats, groupBy as string);

    // Calculate summary metrics
    const totalClicks = trackingStats.length;
    const totalConversions = conversionStats.filter(c => c.status === 1).length;
    const totalRevenue = conversionStats
      .filter(c => c.status === 1)
      .reduce((sum, c) => sum + (c.amount || 0), 0);
    const conversionRate = totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0;

    // Country breakdown
    const countryBreakdown = trackingStats.reduce((acc: any, track) => {
      const country = track.country || 'Unknown';
      acc[country] = (acc[country] || 0) + 1;
      return acc;
    }, {});

    // Device breakdown
    const deviceBreakdown = trackingStats.reduce((acc: any, track) => {
      const device = track.device_type || 'Unknown';
      acc[device] = (acc[device] || 0) + 1;
      return acc;
    }, {});

    const analytics = {
      campaign: {
        id: campaign.id,
        trackingId: campaign.tracking,
        xafraTrackingId: campaign.xafra_tracking_id,
        shortTracking: campaign.short_tracking,
        status: campaign.status,
        product: {
          id: campaign.product.id,
          name: campaign.product.name,
          customer: {
            id: campaign.product.customer.id,
            name: campaign.product.customer.name
          }
        }
      },
      dateRange: {
        startDate: startDate || null,
        endDate: endDate || null,
        groupBy: groupBy
      },
      summary: {
        totalClicks,
        totalConversions,
        totalRevenue,
        conversionRate: Math.round(conversionRate * 100) / 100,
        averageRevenuePerClick: totalClicks > 0 ? Math.round((totalRevenue / totalClicks) * 100) / 100 : 0
      },
      breakdown: {
        countries: countryBreakdown,
        devices: deviceBreakdown
      },
      timeline: groupedData,
      ...(includeDetails === 'true' ? {
        details: {
          recentClicks: trackingStats.slice(0, 10).map(track => ({
            id: track.id,
            timestamp: new Date(Number(track.creation_date)).toISOString(),
            country: track.country,
            operator: track.operator,
            device: track.device_type,
            ip: track.ip,
            userAgent: track.user_agent,
            referer: track.referer
          })),
          recentConversions: conversionStats.slice(0, 10).map(conv => ({
            id: conv.id,
            timestamp: new Date(Number(conv.creation_date)).toISOString(),
            amount: conv.amount,
            currency: conv.currency,
            status: conv.status
          }))
        }
      } : {})
    };

    // Cache analytics for 10 minutes
    const cacheKey = `analytics:campaign:${campaignId}:${groupBy}:${startDate || 'all'}:${endDate || 'all'}`;
    await cache.set(cacheKey, JSON.stringify(analytics), 600);

    loggers.tracking('analytics_generated', campaign.tracking, campaign.id_product, {
      campaignId: campaign.id,
      totalClicks,
      totalConversions,
      conversionRate,
      customerId: campaign.product.customer_id
    });

    res.json({
      success: true,
      data: analytics
    });

  } catch (error) {
    loggers.error('Campaign analytics failed', error as Error, {
      campaignId,
      ip: req.ip
    });

    res.status(500).json({
      error: 'Analytics generation failed',
      code: 'ANALYTICS_ERROR'
    });
  }
});

// Get analytics for a customer's campaigns
router.get('/customer/:customerId', async (req: Request, res: Response) => {
  const { customerId } = req.params;
  const { 
    startDate, 
    endDate, 
    limit = '10',
    sortBy = 'clicks'
  } = req.query;

  try {
    // Build date filter
    const dateFilter: any = {};
    if (startDate) {
      dateFilter.gte = BigInt(new Date(startDate as string).getTime());
    }
    if (endDate) {
      dateFilter.lte = BigInt(new Date(endDate as string).getTime());
    }

    // Get customer campaigns with analytics
    const campaigns = await prisma.campaign.findMany({
      where: {
        product: {
          customer_id: parseInt(customerId as string)
        },
        status: { not: 0 } // Not deleted
      },
      include: {
        product: true,
        _count: {
          select: {
            tracking: {
              where: Object.keys(dateFilter).length > 0 ? { creation_date: dateFilter } : undefined
            },
            confirm: {
              where: {
                status: 1,
                ...(Object.keys(dateFilter).length > 0 ? { creation_date: dateFilter } : {})
              }
            }
          }
        }
      },
      take: parseInt(limit as string)
    });

    // Get revenue data for each campaign
    const campaignAnalytics = await Promise.all(
      campaigns.map(async (campaign) => {
        const revenue = await prisma.confirm.aggregate({
          where: {
            id_campaign: campaign.id,
            status: 1,
            ...(Object.keys(dateFilter).length > 0 ? { creation_date: dateFilter } : {})
          },
          _sum: {
            amount: true
          }
        });

        const clicks = campaign._count.tracking;
        const conversions = campaign._count.confirm;
        const totalRevenue = revenue._sum.amount || 0;
        const conversionRate = clicks > 0 ? (conversions / clicks) * 100 : 0;

        return {
          campaign: {
            id: campaign.id,
            trackingId: campaign.tracking,
            xafraTrackingId: campaign.xafra_tracking_id,
            shortTracking: campaign.short_tracking,
            status: campaign.status,
            country: campaign.country,
            operator: campaign.operator,
            product: {
              id: campaign.product.id,
              name: campaign.product.name
            },
            createdAt: new Date(Number(campaign.creation_date)).toISOString()
          },
          metrics: {
            clicks,
            conversions,
            revenue: totalRevenue,
            conversionRate: Math.round(conversionRate * 100) / 100,
            averageRevenuePerClick: clicks > 0 ? Math.round((totalRevenue / clicks) * 100) / 100 : 0
          }
        };
      })
    );

    // Sort campaigns based on sortBy parameter
    campaignAnalytics.sort((a, b) => {
      switch (sortBy) {
        case 'conversions':
          return b.metrics.conversions - a.metrics.conversions;
        case 'revenue':
          return b.metrics.revenue - a.metrics.revenue;
        case 'conversion_rate':
          return b.metrics.conversionRate - a.metrics.conversionRate;
        case 'clicks':
        default:
          return b.metrics.clicks - a.metrics.clicks;
      }
    });

    // Calculate totals
    const totals = campaignAnalytics.reduce((acc, item) => {
      acc.clicks += item.metrics.clicks;
      acc.conversions += item.metrics.conversions;
      acc.revenue += item.metrics.revenue;
      return acc;
    }, { clicks: 0, conversions: 0, revenue: 0 });

    const overallConversionRate = totals.clicks > 0 ? (totals.conversions / totals.clicks) * 100 : 0;

    res.json({
      success: true,
      data: {
        customerId: parseInt(customerId as string),
        dateRange: {
          startDate: startDate || null,
          endDate: endDate || null
        },
        summary: {
          totalCampaigns: campaignAnalytics.length,
          totalClicks: totals.clicks,
          totalConversions: totals.conversions,
          totalRevenue: totals.revenue,
          overallConversionRate: Math.round(overallConversionRate * 100) / 100,
          averageRevenuePerClick: totals.clicks > 0 ? Math.round((totals.revenue / totals.clicks) * 100) / 100 : 0
        },
        campaigns: campaignAnalytics
      }
    });

  } catch (error) {
    loggers.error('Customer analytics failed', error as Error, {
      customerId,
      ip: req.ip
    });

    res.status(500).json({
      error: 'Customer analytics failed',
      code: 'CUSTOMER_ANALYTICS_ERROR'
    });
  }
});

// Get real-time tracking statistics
router.get('/realtime/:trackingId', async (req: Request, res: Response) => {
  const { trackingId } = req.params;
  const { minutes = '60' } = req.query;

  try {
    const minutesAgo = parseInt(minutes as string);
    const startTime = BigInt(Date.now() - (minutesAgo * 60 * 1000));

    // Get recent tracking data
    const recentTracking = await prisma.tracking.findMany({
      where: {
        campaign: {
          tracking: trackingId
        },
        creation_date: {
          gte: startTime
        }
      },
      select: {
        id: true,
        creation_date: true,
        country: true,
        operator: true,
        device_type: true,
        ip: true
      },
      orderBy: {
        creation_date: 'desc'
      }
    });

    // Get recent conversions
    const recentConversions = await prisma.confirm.findMany({
      where: {
        campaign: {
          tracking: trackingId
        },
        creation_date: {
          gte: startTime
        }
      },
      select: {
        id: true,
        creation_date: true,
        amount: true,
        currency: true,
        status: true
      },
      orderBy: {
        creation_date: 'desc'
      }
    });

    // Group by minute for real-time chart
    const minutelyData = groupDataByMinute(recentTracking, recentConversions, minutesAgo);

    res.json({
      success: true,
      data: {
        trackingId,
        timeRange: {
          minutes: minutesAgo,
          startTime: new Date(Number(startTime)).toISOString(),
          endTime: new Date().toISOString()
        },
        summary: {
          totalClicks: recentTracking.length,
          totalConversions: recentConversions.filter(c => c.status === 1).length,
          uniqueCountries: [...new Set(recentTracking.map(t => t.country))].length,
          activeMinutes: minutelyData.filter(m => m.clicks > 0).length
        },
        timeline: minutelyData,
        recentActivity: recentTracking.slice(0, 20).map(track => ({
          timestamp: new Date(Number(track.creation_date)).toISOString(),
          country: track.country,
          operator: track.operator,
          device: track.device_type,
          ip: track.ip
        }))
      }
    });

  } catch (error) {
    loggers.error('Real-time analytics failed', error as Error, {
      trackingId,
      ip: req.ip
    });

    res.status(500).json({
      error: 'Real-time analytics failed',
      code: 'REALTIME_ANALYTICS_ERROR'
    });
  }
});

// Helper function to group data by period
function groupDataByPeriod(trackingData: any[], conversionData: any[], groupBy: string) {
  const groups: any = {};

  // Process tracking data
  trackingData.forEach(track => {
    const date = new Date(Number(track.creation_date));
    const key = getGroupKey(date, groupBy);
    
    if (!groups[key]) {
      groups[key] = { date: key, clicks: 0, conversions: 0, revenue: 0 };
    }
    groups[key].clicks++;
  });

  // Process conversion data
  conversionData.forEach(conv => {
    if (conv.status === 1) {
      const date = new Date(Number(conv.creation_date));
      const key = getGroupKey(date, groupBy);
      
      if (!groups[key]) {
        groups[key] = { date: key, clicks: 0, conversions: 0, revenue: 0 };
      }
      groups[key].conversions++;
      groups[key].revenue += conv.amount || 0;
    }
  });

  // Convert to array and sort
  return Object.values(groups).sort((a: any, b: any) => a.date.localeCompare(b.date));
}

// Helper function to get group key based on period
function getGroupKey(date: Date, groupBy: string): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');

  switch (groupBy) {
    case 'hour':
      return `${year}-${month}-${day} ${hour}:00`;
    case 'day':
      return `${year}-${month}-${day}`;
    case 'month':
      return `${year}-${month}`;
    case 'year':
      return `${year}`;
    default:
      return `${year}-${month}-${day}`;
  }
}

// Helper function to group data by minute for real-time
function groupDataByMinute(trackingData: any[], conversionData: any[], totalMinutes: number) {
  const now = new Date();
  const minutes = [];

  for (let i = totalMinutes - 1; i >= 0; i--) {
    const minute = new Date(now.getTime() - (i * 60 * 1000));
    const minuteKey = minute.toISOString().substring(0, 16); // YYYY-MM-DDTHH:MM
    
    const clicks = trackingData.filter(track => {
      const trackTime = new Date(Number(track.creation_date));
      return trackTime.toISOString().substring(0, 16) === minuteKey;
    }).length;

    const conversions = conversionData.filter(conv => {
      if (conv.status !== 1) return false;
      const convTime = new Date(Number(conv.creation_date));
      return convTime.toISOString().substring(0, 16) === minuteKey;
    }).length;

    minutes.push({
      minute: minuteKey,
      clicks,
      conversions
    });
  }

  return minutes;
}

export default router;