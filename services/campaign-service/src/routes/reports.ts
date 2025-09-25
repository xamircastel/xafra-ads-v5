import { Router, Request, Response } from 'express';
import { loggers } from '@xafra/shared/logger';
import { cache } from '@xafra/shared/cache';
import { prisma } from '@xafra/database';
import moment from 'moment';

const router = Router();

// Helper function to detect device type from params
function detectDeviceTypeFromParams(params: string): string {
  try {
    const paramData = JSON.parse(params || '{}');
    const userAgent = paramData.user_agent || paramData.ua || '';
    return detectDeviceType(userAgent);
  } catch {
    return 'unknown';
  }
}

// Generate comprehensive campaign report
router.post('/generate', async (req: Request, res: Response) => {
  const { 
    report_type = 'performance',
    campaign_ids,
    customer_id,
    product_ids,
    date_range,
    format = 'json',
    include_charts = false,
    email_recipients,
    scheduled = false
  } = req.body;

  try {
    // Validate required parameters
    if (!campaign_ids && !customer_id && !product_ids) {
      res.status(400).json({
        error: 'Must specify campaign_ids, customer_id, or product_ids',
        code: 'MISSING_REPORT_CRITERIA'
      });
      return;
    }

    // Date range validation
    const startDate = date_range?.start_date ? moment(date_range.start_date) : moment().subtract(30, 'days');
    const endDate = date_range?.end_date ? moment(date_range.end_date) : moment();
    
    if (!startDate.isValid() || !endDate.isValid()) {
      res.status(400).json({
        error: 'Invalid date format. Use YYYY-MM-DD',
        code: 'INVALID_DATE_FORMAT'
      });
      return;
    }

    const startTimestamp = BigInt(startDate.valueOf());
    const endTimestamp = BigInt(endDate.valueOf());

    // Build campaign filter
    const campaignFilter: any = {};
    
    if (campaign_ids && Array.isArray(campaign_ids)) {
      campaignFilter.id = { in: campaign_ids.map((id: any) => parseInt(id)) };
    }
    
    if (customer_id) {
      campaignFilter.product = {
        customer_id: parseInt(customer_id)
      };
    }
    
    if (product_ids && Array.isArray(product_ids)) {
      campaignFilter.id_product = { in: product_ids.map((id: any) => parseInt(id)) };
    }

    // Generate report based on type
    let reportData: any = {};
    
    switch (report_type) {
      case 'performance':
        reportData = await generatePerformanceReport(campaignFilter, startTimestamp, endTimestamp);
        break;
      case 'traffic':
        reportData = await generateTrafficReport(campaignFilter, startTimestamp, endTimestamp);
        break;
      case 'conversion':
        reportData = await generateConversionReport(campaignFilter, startTimestamp, endTimestamp);
        break;
      case 'summary':
        reportData = await generateSummaryReport(campaignFilter, startTimestamp, endTimestamp);
        break;
      default:
        res.status(400).json({
          error: 'Invalid report type. Must be performance, traffic, conversion, or summary',
          code: 'INVALID_REPORT_TYPE'
        });
        return;
    }

    // Add report metadata
    const report = {
      metadata: {
        reportId: `report_${Date.now()}`,
        type: report_type,
        generatedAt: new Date().toISOString(),
        dateRange: {
          start: startDate.format('YYYY-MM-DD'),
          end: endDate.format('YYYY-MM-DD')
        },
        format,
        includeCharts: include_charts,
        totalCampaigns: reportData.totalCampaigns || 0
      },
      data: reportData,
      ...(include_charts ? { charts: generateChartData(reportData) } : {})
    };

    // Handle scheduled reports
    if (scheduled && email_recipients) {
      // In a real implementation, this would queue the report for email delivery
      loggers.tracking('scheduled_report_queued', '', 0, {
        reportType: report_type,
        recipients: email_recipients.length,
        scheduleTime: new Date().toISOString()
      });
    }

    res.json({
      success: true,
      report
    });

  } catch (error) {
    loggers.error('Report generation failed', error as Error, {
      report_type,
      campaignCount: campaign_ids?.length || 'unknown',
      ip: req.ip
    });

    res.status(500).json({
      error: 'Failed to generate report',
      code: 'REPORT_GENERATION_ERROR'
    });
  }
});

// Get available report templates
router.get('/templates', async (req: Request, res: Response) => {
  try {
    const templates = [
      {
        id: 'daily_performance',
        name: 'Daily Performance Report',
        description: 'Daily summary of campaign performance metrics',
        type: 'performance',
        frequency: 'daily',
        defaultParams: {
          date_range: { days: 1 },
          include_charts: true,
          format: 'json'
        }
      },
      {
        id: 'weekly_summary',
        name: 'Weekly Summary Report',
        description: 'Comprehensive weekly performance and traffic analysis',
        type: 'summary',
        frequency: 'weekly',
        defaultParams: {
          date_range: { days: 7 },
          include_charts: true,
          format: 'json'
        }
      },
      {
        id: 'monthly_analysis',
        name: 'Monthly Analysis Report',
        description: 'Detailed monthly performance trends and insights',
        type: 'performance',
        frequency: 'monthly',
        defaultParams: {
          date_range: { days: 30 },
          include_charts: true,
          format: 'json'
        }
      },
      {
        id: 'traffic_analysis',
        name: 'Traffic Quality Report',
        description: 'Analysis of traffic patterns, sources, and quality metrics',
        type: 'traffic',
        frequency: 'weekly',
        defaultParams: {
          date_range: { days: 7 },
          include_charts: true,
          format: 'json'
        }
      },
      {
        id: 'conversion_funnel',
        name: 'Conversion Funnel Report',
        description: 'Detailed breakdown of conversion rates and optimization opportunities',
        type: 'conversion',
        frequency: 'weekly',
        defaultParams: {
          date_range: { days: 14 },
          include_charts: true,
          format: 'json'
        }
      }
    ];

    res.json({
      success: true,
      data: {
        totalTemplates: templates.length,
        templates
      }
    });

  } catch (error) {
    loggers.error('Report templates retrieval failed', error as Error, {
      ip: req.ip
    });

    res.status(500).json({
      error: 'Failed to retrieve report templates',
      code: 'REPORT_TEMPLATES_ERROR'
    });
  }
});

// Export campaign data
router.post('/export', async (req: Request, res: Response) => {
  const { 
    campaign_ids,
    customer_id,
    export_format = 'csv',
    include_tracking = false,
    include_conversions = false,
    date_range
  } = req.body;

  try {
    // Build filter
    const campaignFilter: any = {};
    
    if (campaign_ids && Array.isArray(campaign_ids)) {
      campaignFilter.id = { in: campaign_ids.map((id: any) => parseInt(id)) };
    }
    
    if (customer_id) {
      campaignFilter.product = {
        customer_id: parseInt(customer_id)
      };
    }

    // Date range for tracking/conversion data
    let dateFilter = {};
    if (date_range) {
      const startDate = moment(date_range.start_date);
      const endDate = moment(date_range.end_date);
      
      if (startDate.isValid() && endDate.isValid()) {
        dateFilter = {
          creation_date: {
            gte: BigInt(startDate.valueOf()),
            lte: BigInt(endDate.valueOf())
          }
        };
      }
    }

    // Get campaign data
    const campaigns = await prisma.campaign.findMany({
      where: campaignFilter,
      include: {
        product: {
          include: {
            customer: true
          }
        },
        ...(include_tracking ? {
          tracking: {
            where: dateFilter,
            select: {
              id: true,
              creation_date: true,
              country: true,
              operator: true,
              ip: true,
              user_agent: true
            }
          }
        } : {}),
        ...(include_conversions ? {
          confirm: {
            where: {
              ...dateFilter,
              status: 1
            },
            select: {
              id: true,
              creation_date: true,
              country: true,
              operator: true
            }
          }
        } : {})
      }
    });

    // Format data for export
    const exportData = formatExportData(campaigns, export_format, include_tracking, include_conversions);

    res.json({
      success: true,
      data: {
        exportFormat: export_format,
        totalCampaigns: campaigns.length,
        generatedAt: new Date().toISOString(),
        exportData
      }
    });

  } catch (error) {
    loggers.error('Data export failed', error as Error, {
      export_format,
      campaignCount: campaign_ids?.length || 'unknown',
      ip: req.ip
    });

    res.status(500).json({
      error: 'Failed to export data',
      code: 'DATA_EXPORT_ERROR'
    });
  }
});

// Get historical reports
router.get('/history', async (req: Request, res: Response) => {
  const { 
    customer_id,
    report_type,
    limit = '20',
    offset = '0'
  } = req.query;

  try {
    // In a real implementation, this would query a reports history table
    // For now, return mock historical data
    const mockHistory = [
      {
        id: 'report_1',
        type: 'performance',
        generatedAt: moment().subtract(1, 'days').toISOString(),
        dateRange: {
          start: moment().subtract(8, 'days').format('YYYY-MM-DD'),
          end: moment().subtract(1, 'days').format('YYYY-MM-DD')
        },
        status: 'completed',
        campaignCount: 15,
        downloadUrl: '/api/reports/download/report_1'
      },
      {
        id: 'report_2',
        type: 'summary',
        generatedAt: moment().subtract(7, 'days').toISOString(),
        dateRange: {
          start: moment().subtract(14, 'days').format('YYYY-MM-DD'),
          end: moment().subtract(7, 'days').format('YYYY-MM-DD')
        },
        status: 'completed',
        campaignCount: 12,
        downloadUrl: '/api/reports/download/report_2'
      },
      {
        id: 'report_3',
        type: 'traffic',
        generatedAt: moment().subtract(14, 'days').toISOString(),
        dateRange: {
          start: moment().subtract(21, 'days').format('YYYY-MM-DD'),
          end: moment().subtract(14, 'days').format('YYYY-MM-DD')
        },
        status: 'completed',
        campaignCount: 18,
        downloadUrl: '/api/reports/download/report_3'
      }
    ];

    // Filter by report type if specified
    const filteredHistory = report_type 
      ? mockHistory.filter(report => report.type === report_type)
      : mockHistory;

    // Apply pagination
    const startIndex = parseInt(offset as string);
    const endIndex = startIndex + parseInt(limit as string);
    const paginatedHistory = filteredHistory.slice(startIndex, endIndex);

    res.json({
      success: true,
      data: {
        totalReports: filteredHistory.length,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        reports: paginatedHistory
      }
    });

  } catch (error) {
    loggers.error('Report history retrieval failed', error as Error, {
      customer_id,
      report_type,
      ip: req.ip
    });

    res.status(500).json({
      error: 'Failed to retrieve report history',
      code: 'REPORT_HISTORY_ERROR'
    });
  }
});

// Report generation helper functions
async function generatePerformanceReport(campaignFilter: any, startTime: bigint, endTime: bigint) {
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

  // Get counts separately using the campaign table directly
  const [totalClicks, totalConversions] = await Promise.all([
    // Count all campaigns in the filter (total clicks)
    prisma.campaign.count({
      where: {
        ...campaignFilter,
        creation_date: {
          gte: new Date(Number(startTime)),
          lte: new Date(Number(endTime))
        }
      }
    }),
    // Count only conversions (status = 1)
    prisma.campaign.count({
      where: {
        ...campaignFilter,
        creation_date: {
          gte: new Date(Number(startTime)),
          lte: new Date(Number(endTime))
        },
        status: 1
      }
    })
  ]);

  const avgConversionRate = totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0;

  // For each campaign, calculate individual stats
  const campaignDetails = await Promise.all(campaigns.map(async campaign => {
    const [campaignClicks, campaignConversions] = await Promise.all([
      prisma.campaign.count({
        where: {
          id_product: campaign.id_product,
          creation_date: {
            gte: new Date(Number(startTime)),
            lte: new Date(Number(endTime))
          }
        }
      }),
      prisma.campaign.count({
        where: {
          id_product: campaign.id_product,
          creation_date: {
            gte: new Date(Number(startTime)),
            lte: new Date(Number(endTime))
          },
          status: 1
        }
      })
    ]);

    return {
      id: campaign.id,
      trackingId: campaign.tracking,
      name: `${campaign.product.name} - ${campaign.country}/${campaign.operator}`,
      customer: campaign.product.customer.name,
      status: campaign.status,
      clicks: campaignClicks,
      conversions: campaignConversions,
      conversionRate: campaignClicks > 0 
        ? Math.round((campaignConversions / campaignClicks) * 10000) / 100 
        : 0
    };
  }));

  return {
    totalCampaigns: campaigns.length,
    summary: {
      totalClicks,
      totalConversions,
      avgConversionRate: Math.round(avgConversionRate * 100) / 100
    },
    topPerformers: campaignDetails
      .filter(c => c.clicks >= 10)
      .sort((a, b) => b.conversionRate - a.conversionRate)
      .slice(0, 10),
    campaigns: campaignDetails
  };
}

async function generateTrafficReport(campaignFilter: any, startTime: bigint, endTime: bigint) {
  const trafficData = await prisma.campaign.findMany({
    where: {
      ...campaignFilter,
      creation_date: {
        gte: new Date(Number(startTime)),
        lte: new Date(Number(endTime))
      }
    },
    select: {
      id: true,
      creation_date: true,
      country: true,
      operator: true,
      params: true,
      tracking: true,
      product: {
        select: {
          name: true,
          customer: {
            select: {
              name: true
            }
          }
        }
      }
    }
  });

  // Geographic distribution
  const geoDistribution = new Map();
  const deviceDistribution = new Map();
  const hourlyDistribution = new Array(24).fill(0);

  trafficData.forEach(traffic => {
    // Geographic
    const geoKey = `${traffic.country}/${traffic.operator}`;
    geoDistribution.set(geoKey, (geoDistribution.get(geoKey) || 0) + 1);

    // Device type from params (if available)
    const deviceType = detectDeviceTypeFromParams(traffic.params || '');
    deviceDistribution.set(deviceType, (deviceDistribution.get(deviceType) || 0) + 1);

    // Hourly
    const hour = moment(traffic.creation_date).hour();
    hourlyDistribution[hour]++;
  });

  return {
    totalClicks: trafficData.length,
    uniqueCountries: new Set(trafficData.map(t => t.country)).size,
    geographic: Array.from(geoDistribution.entries()).map(([location, count]) => {
      const [country, operator] = location.split('/');
      return { country, operator, clicks: count };
    }).sort((a, b) => b.clicks - a.clicks),
    devices: Array.from(deviceDistribution.entries()).map(([device, count]) => ({
      deviceType: device,
      clicks: count,
      percentage: Math.round((count / trafficData.length) * 10000) / 100
    })),
    hourlyPattern: hourlyDistribution.map((count, hour) => ({ hour, count }))
  };
}

async function generateConversionReport(campaignFilter: any, startTime: bigint, endTime: bigint) {
  const conversionData = await prisma.campaign.findMany({
    where: {
      ...campaignFilter,
      creation_date: {
        gte: new Date(Number(startTime)),
        lte: new Date(Number(endTime))
      },
      status: 1
    },
    include: {
      product: {
        include: {
          customer: true
        }
      }
    }
  });

  // Time-to-conversion analysis - for campaigns, this is effectively immediate
  const conversionsByHour = new Array(24).fill(0);
  const conversionsByDay = new Map();

  conversionData.forEach(conversion => {
    const conversionTime = moment(conversion.creation_date);
    
    // Hourly distribution
    conversionsByHour[conversionTime.hour()]++;
    
    // Daily distribution
    const dayKey = conversionTime.format('YYYY-MM-DD');
    conversionsByDay.set(dayKey, (conversionsByDay.get(dayKey) || 0) + 1);
  });

  return {
    totalConversions: conversionData.length,
    avgTimeToConversion: 0, // Immediate conversion for campaigns
    conversionsByProduct: groupConversionsByProduct(conversionData),
    conversionTrend: Array.from(conversionsByDay.entries()).map(([date, count]) => ({
      date,
      conversions: count
    })).sort((a, b) => a.date.localeCompare(b.date)),
    hourlyPattern: conversionsByHour.map((count, hour) => ({ hour, count }))
  };
}

async function generateSummaryReport(campaignFilter: any, startTime: bigint, endTime: bigint) {
  const [performanceData, trafficData, conversionData] = await Promise.all([
    generatePerformanceReport(campaignFilter, startTime, endTime),
    generateTrafficReport(campaignFilter, startTime, endTime),
    generateConversionReport(campaignFilter, startTime, endTime)
  ]);

  return {
    performance: performanceData.summary,
    traffic: {
      totalClicks: trafficData.totalClicks,
      uniqueCountries: trafficData.uniqueCountries,
      topCountries: trafficData.geographic.slice(0, 5)
    },
    conversions: {
      totalConversions: conversionData.totalConversions,
      avgTimeToConversion: conversionData.avgTimeToConversion
    },
    trends: {
      conversionTrend: conversionData.conversionTrend,
      hourlyPattern: trafficData.hourlyPattern
    }
  };
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

function groupConversionsByProduct(conversions: any[]) {
  const productMap = new Map();
  
  conversions.forEach(conversion => {
    const productName = conversion.campaign.product.name;
    if (!productMap.has(productName)) {
      productMap.set(productName, 0);
    }
    const currentCount = productMap.get(productName) || 0;
    productMap.set(productName, currentCount + 1);
  });

  return Array.from(productMap.entries()).map(([product, count]) => ({
    product,
    conversions: count
  })).sort((a, b) => b.conversions - a.conversions);
}

function generateConversionTrend(conversions: any[]) {
  const dailyMap = new Map();
  
  conversions.forEach(conversion => {
    const day = moment(Number(conversion.creation_date)).format('YYYY-MM-DD');
    if (!dailyMap.has(day)) {
      dailyMap.set(day, 0);
    }
    const currentCount = dailyMap.get(day) || 0;
    dailyMap.set(day, currentCount + 1);
  });

  return Array.from(dailyMap.entries())
    .map(([date, count]) => ({ date, conversions: count }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function generateChartData(reportData: any) {
  // Generate chart-ready data structures
  return {
    performanceChart: {
      type: 'bar',
      data: reportData.campaigns?.slice(0, 10).map((campaign: any) => ({
        label: campaign.name,
        clicks: campaign.clicks,
        conversions: campaign.conversions,
        conversionRate: campaign.conversionRate
      })) || []
    },
    trendChart: {
      type: 'line',
      data: reportData.trends?.conversionTrend || []
    },
    geoChart: {
      type: 'pie',
      data: reportData.traffic?.geographic?.slice(0, 5) || []
    }
  };
}

function formatExportData(campaigns: any[], format: string, includeTracking: boolean, includeConversions: boolean) {
  if (format === 'csv') {
    // CSV format
    const headers = ['Campaign ID', 'Tracking ID', 'Product', 'Customer', 'Country', 'Operator', 'Status', 'Created'];
    const rows = campaigns.map(campaign => [
      campaign.id,
      campaign.tracking,
      campaign.product.name,
      campaign.product.customer.name,
      campaign.country,
      campaign.operator,
      campaign.status,
      new Date(Number(campaign.creation_date)).toISOString()
    ]);

    return {
      headers,
      rows,
      format: 'csv'
    };
  } else {
    // JSON format
    return campaigns.map(campaign => ({
      id: campaign.id,
      trackingId: campaign.tracking,
      product: campaign.product.name,
      customer: campaign.product.customer.name,
      country: campaign.country,
      operator: campaign.operator,
      status: campaign.status,
      createdAt: new Date(Number(campaign.creation_date)).toISOString(),
      ...(includeTracking && campaign.tracking ? { 
        trackingData: campaign.tracking.map((t: any) => ({
          timestamp: new Date(Number(t.creation_date)).toISOString(),
          ip: t.ip,
          userAgent: t.user_agent
        }))
      } : {}),
      ...(includeConversions && campaign.confirm ? {
        conversions: campaign.confirm.map((c: any) => ({
          timestamp: new Date(Number(c.creation_date)).toISOString(),
          country: c.country,
          operator: c.operator
        }))
      } : {})
    }));
  }
}

export default router;