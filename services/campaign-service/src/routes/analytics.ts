import { Router, Request, Response } from 'express';
import { loggers } from '@xafra/shared/logger';
import { cache } from '@xafra/shared/cache';
import { prisma } from '@xafra/database';
import moment from 'moment';

const router = Router();

// Campaign performance analytics
router.get('/performance/:campaignId', async (req: Request, res: Response) => {
  const { campaignId } = req.params;
  const { 
    start_date, 
    end_date, 
    granularity = 'day', 
    timezone = 'UTC',
    include_geo = 'false',
    include_devices = 'false' 
  } = req.query;

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

    // Date range validation
    const startDate = start_date ? moment(start_date as string) : moment().subtract(30, 'days');
    const endDate = end_date ? moment(end_date as string) : moment();
    
    if (!startDate.isValid() || !endDate.isValid()) {
      res.status(400).json({
        error: 'Invalid date format. Use YYYY-MM-DD',
        code: 'INVALID_DATE_FORMAT'
      });
      return;
    }

    if (endDate.isBefore(startDate)) {
      res.status(400).json({
        error: 'End date must be after start date',
        code: 'INVALID_DATE_RANGE'
      });
      return;
    }

    const startTimestamp = BigInt(startDate.valueOf());
    const endTimestamp = BigInt(endDate.valueOf());

    // Base analytics query - Using campaign table with status filtering
    const [trackingData, confirmData] = await Promise.all([
      // All campaign records (clicks) for this product
      prisma.campaign.findMany({
        where: {
          id_product: campaign.id_product,
          creation_date: {
            gte: new Date(Number(startTimestamp)),
            lte: new Date(Number(endTimestamp))
          }
        },
        select: {
          id: true,
          creation_date: true,
          country: true,
          operator: true,
          status: true,
          params: true // This might contain user_agent and ip info
        }
      }),
      // Only confirmed campaigns (conversions) for this product
      prisma.campaign.findMany({
        where: {
          id_product: campaign.id_product,
          creation_date: {
            gte: new Date(Number(startTimestamp)),
            lte: new Date(Number(endTimestamp))
          },
          status: 1 // Only confirmed conversions
        },
        select: {
          id: true,
          creation_date: true,
          country: true,
          operator: true,
          status: true
        }
      })
    ]);

    // Time series aggregation
    const timeSeriesData = aggregateTimeSeriesData(trackingData, confirmData, granularity as string, timezone as string);

    // Overall metrics
    const totalClicks = trackingData.length;
    const totalConversions = confirmData.length;
    const conversionRate = totalClicks > 0 ? Math.round((totalConversions / totalClicks) * 10000) / 100 : 0;

    const analytics: any = {
      campaign: {
        id: campaign.id,
        trackingId: campaign.tracking,
        name: `${campaign.product.name} - ${campaign.country}/${campaign.operator}`,
        status: campaign.status,
        customer: campaign.product.customer.name
      },
      dateRange: {
        start: startDate.format('YYYY-MM-DD'),
        end: endDate.format('YYYY-MM-DD'),
        timezone,
        granularity
      },
      summary: {
        totalClicks,
        totalConversions,
        conversionRate,
        averageDailyClicks: Math.round(totalClicks / Math.max(1, endDate.diff(startDate, 'days'))),
        averageDailyConversions: Math.round(totalConversions / Math.max(1, endDate.diff(startDate, 'days')))
      },
      timeSeries: timeSeriesData
    };

    // Geographic breakdown
    if (include_geo === 'true') {
      const geoAnalytics = aggregateGeoData(trackingData, confirmData);
      analytics.geographic = geoAnalytics;
    }

    // Device/User Agent breakdown
    if (include_devices === 'true') {
      const deviceAnalytics = aggregateDeviceData(trackingData);
      analytics.devices = deviceAnalytics;
    }

    res.json({
      success: true,
      data: analytics
    });

  } catch (error) {
    loggers.error('Campaign analytics retrieval failed', error as Error, {
      campaignId,
      dateRange: { start_date, end_date },
      ip: req.ip
    });

    res.status(500).json({
      error: 'Failed to retrieve campaign analytics',
      code: 'CAMPAIGN_ANALYTICS_ERROR'
    });
  }
});

// Aggregate analytics across multiple campaigns
router.get('/aggregate', async (req: Request, res: Response) => {
  const { 
    customer_id,
    product_ids,
    campaign_ids,
    start_date, 
    end_date,
    group_by = 'product',
    timezone = 'UTC'
  } = req.query;

  try {
    if (!customer_id && !product_ids && !campaign_ids) {
      res.status(400).json({
        error: 'Must specify customer_id, product_ids, or campaign_ids',
        code: 'MISSING_FILTER_CRITERIA'
      });
      return;
    }

    // Date range validation
    const startDate = start_date ? moment(start_date as string) : moment().subtract(30, 'days');
    const endDate = end_date ? moment(end_date as string) : moment();

    const startTimestamp = BigInt(startDate.valueOf());
    const endTimestamp = BigInt(endDate.valueOf());

    // Build campaign filter
    const campaignFilter: any = {};
    
    if (customer_id) {
      campaignFilter.product = {
        customer_id: parseInt(customer_id as string)
      };
    }
    
    if (product_ids) {
      const productIdList = (product_ids as string).split(',').map(id => parseInt(id.trim()));
      campaignFilter.id_product = { in: productIdList };
    }
    
    if (campaign_ids) {
      const campaignIdList = (campaign_ids as string).split(',').map(id => parseInt(id.trim()));
      campaignFilter.id = { in: campaignIdList };
    }

    // Get campaigns with their analytics (using simplified approach)
    const campaigns = await prisma.campaign.findMany({
      where: campaignFilter,
      include: {
        product: {
          include: {
            customer: true
          }
        }
      }
    });

    // Aggregate data based on group_by parameter
    const aggregatedData = aggregateDataByGroup(campaigns, group_by as string);

    res.json({
      success: true,
      data: {
        dateRange: {
          start: startDate.format('YYYY-MM-DD'),
          end: endDate.format('YYYY-MM-DD'),
          timezone
        },
        groupBy: group_by,
        totalCampaigns: campaigns.length,
        aggregations: aggregatedData
      }
    });

  } catch (error) {
    loggers.error('Aggregate analytics retrieval failed', error as Error, {
      filters: { customer_id, product_ids, campaign_ids },
      ip: req.ip
    });

    res.status(500).json({
      error: 'Failed to retrieve aggregate analytics',
      code: 'AGGREGATE_ANALYTICS_ERROR'
    });
  }
});

// Top performing campaigns
router.get('/top-performers', async (req: Request, res: Response) => {
  const { 
    customer_id,
    metric = 'conversion_rate',
    limit = '10',
    start_date,
    end_date,
    min_clicks = '10'
  } = req.query;

  try {
    const startDate = start_date ? moment(start_date as string) : moment().subtract(30, 'days');
    const endDate = end_date ? moment(end_date as string) : moment();
    
    const startTimestamp = BigInt(startDate.valueOf());
    const endTimestamp = BigInt(endDate.valueOf());
    
    const campaignFilter: any = {};
    if (customer_id) {
      campaignFilter.product = {
        customer_id: parseInt(customer_id as string)
      };
    }

    const campaigns = await prisma.campaign.findMany({
      where: campaignFilter,
      include: {
        product: {
          include: {
            customer: true
          }
        }
      }
    });

    // Calculate metrics manually for each campaign since we don't have _count
    const campaignsWithMetrics = await Promise.all(campaigns.map(async (campaign) => {
      // Get clicks (all campaign records for this product in date range)
      const clicks = await prisma.campaign.count({
        where: {
          id_product: campaign.id_product,
          creation_date: {
            gte: new Date(Number(startTimestamp)),
            lte: new Date(Number(endTimestamp))
          }
        }
      });
      
      // Get conversions (only status=1 records for this product in date range)
      const conversions = await prisma.campaign.count({
        where: {
          id_product: campaign.id_product,
          creation_date: {
            gte: new Date(Number(startTimestamp)),
            lte: new Date(Number(endTimestamp))
          },
          status: 1
        }
      });
      
      const conversionRate = clicks > 0 ? (conversions / clicks) * 100 : 0;

        return {
          id: campaign.id,
          trackingId: campaign.tracking,
          name: `${campaign.product?.name} - ${campaign.country}/${campaign.operator}`,
          status: campaign.status,
          customer: campaign.product?.customer?.name,
          metrics: {
            clicks,
            conversions,
            conversionRate: Math.round(conversionRate * 100) / 100
          }
        };
      }));
    
    // Filter by minimum clicks
    const filteredCampaigns = campaignsWithMetrics
      .filter(campaign => campaign.metrics.clicks >= parseInt(min_clicks as string));

    // Sort by selected metric
    const sortedCampaigns = campaignsWithMetrics.sort((a, b) => {
      switch (metric) {
        case 'clicks':
          return b.metrics.clicks - a.metrics.clicks;
        case 'conversions':
          return b.metrics.conversions - a.metrics.conversions;
        case 'conversion_rate':
        default:
          return b.metrics.conversionRate - a.metrics.conversionRate;
      }
    });

    const topPerformers = sortedCampaigns.slice(0, parseInt(limit as string));

    res.json({
      success: true,
      data: {
        dateRange: {
          start: startDate.format('YYYY-MM-DD'),
          end: endDate.format('YYYY-MM-DD')
        },
        metric,
        minClicks: parseInt(min_clicks as string),
        totalCampaignsAnalyzed: campaigns.length,
        qualifyingCampaigns: campaignsWithMetrics.length,
        topPerformers
      }
    });

  } catch (error) {
    loggers.error('Top performers analytics failed', error as Error, {
      metric,
      customer_id,
      ip: req.ip
    });

    res.status(500).json({
      error: 'Failed to retrieve top performers',
      code: 'TOP_PERFORMERS_ERROR'
    });
  }
});

// Real-time campaign metrics
router.get('/realtime/:campaignId', async (req: Request, res: Response) => {
  const { campaignId } = req.params;
  const { hours = '24' } = req.query;

  try {
    const hoursBack = parseInt(hours as string);
    const startTime = BigInt(moment().subtract(hoursBack, 'hours').valueOf());

    const cacheKey = `realtime_analytics:${campaignId}:${hoursBack}h`;
    
    // Try to get from cache first
    const cachedData = await cache.get(cacheKey);
    if (cachedData && typeof cachedData === 'string') {
      res.json({
        success: true,
        data: JSON.parse(cachedData),
        cached: true
      });
      return;
    }

    const campaign = await prisma.campaign.findFirst({
      where: {
        id: parseInt(campaignId as string)
      },
      include: {
        product: true
      }
    });

    if (!campaign) {
      res.status(404).json({
        error: 'Campaign not found',
        code: 'CAMPAIGN_NOT_FOUND'
      });
      return;
    }

    const [recentTracking, recentConfirm] = await Promise.all([
      // Get all recent campaign records for this product (representing clicks)
      prisma.campaign.findMany({
        where: {
          id_product: campaign.id_product,
          creation_date: {
            gte: new Date(Number(startTime))
          }
        },
        select: {
          id: true,
          creation_date: true,
          country: true,
          operator: true
        },
        orderBy: {
          creation_date: 'desc'
        }
      }),
      // Get only confirmed conversions for this product
      prisma.campaign.findMany({
        where: {
          id_product: campaign.id_product,
          creation_date: {
            gte: new Date(Number(startTime))
          },
          status: 1
        },
        select: {
          id: true,
          creation_date: true
        },
        orderBy: {
          creation_date: 'desc'
        }
      })
    ]);

    // Generate hourly breakdown
    const hourlyData = generateHourlyBreakdown(recentTracking, recentConfirm, hoursBack);

    const realtimeData = {
      campaign: {
        id: campaign.id,
        trackingId: campaign.tracking,
        name: campaign.product.name,
        status: campaign.status
      },
      timeframe: {
        hours: hoursBack,
        startTime: moment().subtract(hoursBack, 'hours').format('YYYY-MM-DD HH:mm:ss'),
        endTime: moment().format('YYYY-MM-DD HH:mm:ss')
      },
      summary: {
        totalClicks: recentTracking.length,
        totalConversions: recentConfirm.length,
        conversionRate: recentTracking.length > 0 
          ? Math.round((recentConfirm.length / recentTracking.length) * 10000) / 100 
          : 0,
        clicksPerHour: Math.round(recentTracking.length / hoursBack),
        conversionsPerHour: Math.round(recentConfirm.length / hoursBack)
      },
      hourlyBreakdown: hourlyData,
      lastActivity: recentTracking.length > 0 
        ? moment(Number(recentTracking[0].creation_date)).format('YYYY-MM-DD HH:mm:ss')
        : null
    };

    // Cache for 5 minutes
    await cache.set(cacheKey, JSON.stringify(realtimeData), 300);

    res.json({
      success: true,
      data: realtimeData,
      cached: false
    });

  } catch (error) {
    loggers.error('Realtime analytics failed', error as Error, {
      campaignId,
      hours,
      ip: req.ip
    });

    res.status(500).json({
      error: 'Failed to retrieve realtime analytics',
      code: 'REALTIME_ANALYTICS_ERROR'
    });
  }
});

// Helper functions
function aggregateTimeSeriesData(trackingData: any[], confirmData: any[], granularity: string, timezone: string) {
  const dataPoints = new Map();
  
  // Initialize time buckets
  const startMoment = moment.min(trackingData.map(t => moment(Number(t.creation_date))));
  const endMoment = moment.max(trackingData.map(t => moment(Number(t.creation_date))));
  
  let current = startMoment.clone().startOf(granularity === 'hour' ? 'hour' : 'day');
  const end = endMoment.clone().endOf(granularity === 'hour' ? 'hour' : 'day');
  
  while (current.isSameOrBefore(end)) {
    const key = current.format(granularity === 'hour' ? 'YYYY-MM-DD HH:00' : 'YYYY-MM-DD');
    dataPoints.set(key, { clicks: 0, conversions: 0, conversionRate: 0 });
    current.add(1, granularity === 'hour' ? 'hour' : 'day');
  }
  
  // Aggregate clicks
  trackingData.forEach(track => {
    const bucket = moment(Number(track.creation_date)).format(granularity === 'hour' ? 'YYYY-MM-DD HH:00' : 'YYYY-MM-DD');
    if (dataPoints.has(bucket)) {
      dataPoints.get(bucket).clicks++;
    }
  });
  
  // Aggregate conversions
  confirmData.forEach(confirm => {
    const bucket = moment(Number(confirm.creation_date)).format(granularity === 'hour' ? 'YYYY-MM-DD HH:00' : 'YYYY-MM-DD');
    if (dataPoints.has(bucket)) {
      dataPoints.get(bucket).conversions++;
    }
  });
  
  // Calculate conversion rates
  dataPoints.forEach((data, key) => {
    data.conversionRate = data.clicks > 0 ? Math.round((data.conversions / data.clicks) * 10000) / 100 : 0;
  });
  
  return Array.from(dataPoints.entries()).map(([timestamp, data]) => ({
    timestamp,
    ...data
  }));
}

function aggregateGeoData(trackingData: any[], confirmData: any[]) {
  const geoMap = new Map();
  
  trackingData.forEach(track => {
    const key = `${track.country}/${track.operator}`;
    if (!geoMap.has(key)) {
      geoMap.set(key, { clicks: 0, conversions: 0 });
    }
    geoMap.get(key).clicks++;
  });
  
  confirmData.forEach(confirm => {
    const key = `${confirm.country}/${confirm.operator}`;
    if (geoMap.has(key)) {
      geoMap.get(key).conversions++;
    }
  });
  
  return Array.from(geoMap.entries()).map(([location, data]) => {
    const [country, operator] = location.split('/');
    return {
      country,
      operator,
      clicks: data.clicks,
      conversions: data.conversions,
      conversionRate: data.clicks > 0 ? Math.round((data.conversions / data.clicks) * 10000) / 100 : 0
    };
  }).sort((a, b) => b.clicks - a.clicks);
}

function aggregateDeviceData(trackingData: any[]) {
  const deviceMap = new Map();
  
  trackingData.forEach(track => {
    const userAgent = track.user_agent || 'Unknown';
    const deviceType = detectDeviceType(userAgent);
    
    if (!deviceMap.has(deviceType)) {
      deviceMap.set(deviceType, 0);
    }
    const currentCount = deviceMap.get(deviceType) || 0;
    deviceMap.set(deviceType, currentCount + 1);
  });
  
  const total = trackingData.length;
  return Array.from(deviceMap.entries()).map(([device, count]) => ({
    deviceType: device,
    clicks: count,
    percentage: total > 0 ? Math.round((count / total) * 10000) / 100 : 0
  })).sort((a, b) => b.clicks - a.clicks);
}

function detectDeviceType(userAgent: string): string {
  const ua = userAgent.toLowerCase();
  if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
    return 'Mobile';
  } else if (ua.includes('tablet') || ua.includes('ipad')) {
    return 'Tablet';
  } else {
    return 'Desktop';
  }
}

function aggregateDataByGroup(campaigns: any[], groupBy: string) {
  const groupMap = new Map();
  
  campaigns.forEach(campaign => {
    let key: string;
    switch (groupBy) {
      case 'customer':
        key = campaign.product.customer.name;
        break;
      case 'product':
        key = campaign.product.name;
        break;
      case 'country':
        key = campaign.country;
        break;
      case 'operator':
        key = `${campaign.country}/${campaign.operator}`;
        break;
      default:
        key = 'All';
    }
    
    if (!groupMap.has(key)) {
      groupMap.set(key, {
        campaigns: 0,
        totalClicks: 0,
        totalConversions: 0
      });
    }
    
    const group = groupMap.get(key);
    group.campaigns++;
    group.totalClicks += campaign.tracking.length;
    group.totalConversions += campaign.confirm.length;
  });
  
  return Array.from(groupMap.entries()).map(([name, data]) => ({
    name,
    campaigns: data.campaigns,
    totalClicks: data.totalClicks,
    totalConversions: data.totalConversions,
    conversionRate: data.totalClicks > 0 
      ? Math.round((data.totalConversions / data.totalClicks) * 10000) / 100 
      : 0
  })).sort((a, b) => b.totalClicks - a.totalClicks);
}

function generateHourlyBreakdown(trackingData: any[], confirmData: any[], hours: number) {
  const hourlyMap = new Map();
  
  // Initialize hours
  for (let i = hours - 1; i >= 0; i--) {
    const hour = moment().subtract(i, 'hours').format('YYYY-MM-DD HH:00');
    hourlyMap.set(hour, { clicks: 0, conversions: 0 });
  }
  
  // Aggregate tracking
  trackingData.forEach(track => {
    const hour = moment(Number(track.creation_date)).format('YYYY-MM-DD HH:00');
    if (hourlyMap.has(hour)) {
      hourlyMap.get(hour).clicks++;
    }
  });
  
  // Aggregate confirmations
  confirmData.forEach(confirm => {
    const hour = moment(Number(confirm.creation_date)).format('YYYY-MM-DD HH:00');
    if (hourlyMap.has(hour)) {
      hourlyMap.get(hour).conversions++;
    }
  });
  
  return Array.from(hourlyMap.entries()).map(([hour, data]) => ({
    hour,
    clicks: data.clicks,
    conversions: data.conversions,
    conversionRate: data.clicks > 0 ? Math.round((data.conversions / data.clicks) * 10000) / 100 : 0
  }));
}

export default router;