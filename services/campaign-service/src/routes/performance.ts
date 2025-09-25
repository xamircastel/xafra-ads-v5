import { Router, Request, Response } from 'express';
import { loggers } from '@xafra/shared/logger';
import { cache } from '@xafra/shared/cache';
import { prisma } from '@xafra/database';
import moment from 'moment';

const router = Router();

// Performance optimization for campaigns
router.post('/optimize/:campaignId', async (req: Request, res: Response) => {
  const { campaignId } = req.params;
  const { 
    optimization_type = 'conversion_rate',
    min_data_points = 100,
    confidence_level = 0.95,
    rebalance_weights = true 
  } = req.body;

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

    // Get performance data for the last 30 days
    const thirtyDaysAgo = BigInt(moment().subtract(30, 'days').valueOf());

    const [trackingData, confirmData, relatedCampaigns] = await Promise.all([
      // Count all campaigns for this product (clicks) in the last 30 days
      prisma.campaign.count({
        where: {
          id_product: campaign.id_product,
          creation_date: {
            gte: new Date(Number(thirtyDaysAgo))
          }
        }
      }),
      // Count only confirmed conversions in the last 30 days
      prisma.campaign.count({
        where: {
          id_product: campaign.id_product,
          creation_date: {
            gte: new Date(Number(thirtyDaysAgo))
          },
          status: 1
        }
      }),
      prisma.campaign.findMany({
        where: {
          id_product: campaign.id_product,
          country: campaign.country,
          operator: campaign.operator,
          status: 1,
          id: {
            not: campaign.id
          }
        },
        select: {
          id: true,
          creation_date: true,
          status: true
        }
      })
    ]);

    // Check if we have enough data points
    if (trackingData < min_data_points) {
      res.status(400).json({
        error: `Insufficient data points. Need at least ${min_data_points}, got ${trackingData}`,
        code: 'INSUFFICIENT_DATA'
      });
      return;
    }

    // Calculate current performance metrics
    const currentConversionRate = trackingData > 0 ? (confirmData / trackingData) * 100 : 0;
    
    // Calculate performance recommendations
    const recommendations = generatePerformanceRecommendations(
      campaign,
      { clicks: trackingData, conversions: confirmData, conversionRate: currentConversionRate },
      relatedCampaigns,
      optimization_type
    );

    // Update optimization metadata
    const optimizationData = {
      lastOptimized: new Date().toISOString(),
      optimizationType: optimization_type,
      dataPoints: trackingData,
      confidenceLevel: confidence_level,
      recommendations: recommendations.length
    };

    res.json({
      success: true,
      data: {
        campaign: {
          id: campaign.id,
          trackingId: campaign.tracking,
          name: `${campaign.product.name} - ${campaign.country}/${campaign.operator}`,
          customer: campaign.product.customer.name
        },
        currentPerformance: {
          clicks: trackingData,
          conversions: confirmData,
          conversionRate: Math.round(currentConversionRate * 100) / 100
        },
        optimization: optimizationData,
        recommendations,
        relatedCampaigns: relatedCampaigns.length
      }
    });

  } catch (error) {
    loggers.error('Campaign optimization failed', error as Error, {
      campaignId,
      optimization_type,
      ip: req.ip
    });

    res.status(500).json({
      error: 'Failed to optimize campaign',
      code: 'CAMPAIGN_OPTIMIZATION_ERROR'
    });
  }
});

// Traffic distribution analysis
router.get('/traffic-distribution/:campaignId', async (req: Request, res: Response) => {
  const { campaignId } = req.params;
  const { days = '7', granularity = 'hour' } = req.query;

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

    const daysBack = parseInt(days as string);
    const startTime = BigInt(moment().subtract(daysBack, 'days').valueOf());

    // Get traffic distribution data from campaigns for this product
    const trafficData = await prisma.campaign.findMany({
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
        operator: true,
        params: true
      },
      orderBy: {
        creation_date: 'asc'
      }
    });

    // Analyze traffic patterns
    const trafficAnalysis = analyzeTrafficDistribution(trafficData, granularity as string);
    
    // Calculate traffic health score
    const healthScore = calculateTrafficHealthScore(trafficData, daysBack);

    res.json({
      success: true,
      data: {
        campaign: {
          id: campaign.id,
          trackingId: campaign.tracking
        },
        timeframe: {
          days: daysBack,
          granularity,
          startDate: moment().subtract(daysBack, 'days').format('YYYY-MM-DD'),
          endDate: moment().format('YYYY-MM-DD')
        },
        summary: {
          totalClicks: trafficData.length,
          averageClicksPerDay: Math.round(trafficData.length / daysBack),
          uniqueCountries: new Set(trafficData.map(t => t.country)).size,
          healthScore: healthScore
        },
        distribution: trafficAnalysis,
        patterns: analyzeTrafficPatterns(trafficData)
      }
    });

  } catch (error) {
    loggers.error('Traffic distribution analysis failed', error as Error, {
      campaignId,
      days,
      ip: req.ip
    });

    res.status(500).json({
      error: 'Failed to analyze traffic distribution',
      code: 'TRAFFIC_DISTRIBUTION_ERROR'
    });
  }
});

// Campaign A/B testing results
router.get('/ab-test/:productId', async (req: Request, res: Response) => {
  const { productId } = req.params;
  const { 
    test_duration_days = '14',
    confidence_level = '0.95',
    include_segments = 'false' 
  } = req.query;

  try {
    const testDays = parseInt(test_duration_days as string);
    const startTime = BigInt(moment().subtract(testDays, 'days').valueOf());

    // Get all active campaigns for the product
    const campaigns = await prisma.campaign.findMany({
      where: {
        id_product: parseInt(productId as string),
        status: 1,
        creation_date: {
          gte: new Date(Number(startTime))
        }
      },
      include: {
        product: {
          include: {
            customer: true
          }
        }
      }
    });

    if (campaigns.length < 2) {
      res.status(400).json({
        error: 'A/B testing requires at least 2 campaigns',
        code: 'INSUFFICIENT_CAMPAIGNS_FOR_AB_TEST'
      });
      return;
    }

    // Calculate A/B test statistics
    const abTestResults = calculateABTestResults(campaigns, parseFloat(confidence_level as string));

    // Get segment analysis if requested
    let segmentAnalysis = null;
    if (include_segments === 'true') {
      segmentAnalysis = await analyzeABTestSegments(campaigns, startTime);
    }

    res.json({
      success: true,
      data: {
        product: {
          id: campaigns[0].product.id_product,
          name: campaigns[0].product.name,
          customer: campaigns[0].product.customer.name
        },
        testParameters: {
          duration_days: testDays,
          confidence_level: parseFloat(confidence_level as string),
          startDate: moment().subtract(testDays, 'days').format('YYYY-MM-DD'),
          endDate: moment().format('YYYY-MM-DD')
        },
        campaigns: campaigns.length,
        results: abTestResults,
        ...(segmentAnalysis ? { segmentAnalysis } : {})
      }
    });

  } catch (error) {
    loggers.error('A/B test analysis failed', error as Error, {
      productId,
      test_duration_days,
      ip: req.ip
    });

    res.status(500).json({
      error: 'Failed to analyze A/B test results',
      code: 'AB_TEST_ANALYSIS_ERROR'
    });
  }
});

// Performance benchmarking
router.get('/benchmark/:campaignId', async (req: Request, res: Response) => {
  const { campaignId } = req.params;
  const { 
    benchmark_period = '30',
    comparison_type = 'similar_campaigns' 
  } = req.query;

  try {
    const days = parseInt(benchmark_period as string);
    const startTime = BigInt(moment().subtract(days, 'days').valueOf());

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

    // Get campaign performance
    const [campaignClicks, campaignConversions] = await Promise.all([
      // Count all campaigns for this product (clicks)
      prisma.campaign.count({
        where: {
          id_product: campaign.id_product,
          creation_date: {
            gte: new Date(Number(startTime))
          }
        }
      }),
      // Count only confirmed conversions
      prisma.campaign.count({
        where: {
          id_product: campaign.id_product,
          creation_date: {
            gte: new Date(Number(startTime))
          },
          status: 1
        }
      })
    ]);

    // Get benchmark campaigns based on comparison type
    let benchmarkFilter: any = {};
    
    switch (comparison_type) {
      case 'same_customer':
        benchmarkFilter = {
          product: {
            customer: {
              id_customer: campaign.product.customer.id_customer
            }
          },
          id: {
            not: campaign.id
          },
          status: 1
        };
        break;
      case 'same_country_operator':
        benchmarkFilter = {
          country: campaign.country,
          operator: campaign.operator,
          id: {
            not: campaign.id
          },
          status: 1
        };
        break;
      case 'similar_campaigns':
      default:
        benchmarkFilter = {
          country: campaign.country,
          operator: campaign.operator,
          product: {
            customer: {
              id_customer: campaign.product.customer.id_customer
            }
          },
          id: {
            not: campaign.id
          },
          status: 1
        };
        break;
    }

    const benchmarkCampaigns = await prisma.campaign.findMany({
      where: benchmarkFilter,
      select: {
        id: true,
        id_product: true,
        creation_date: true,
        status: true
      }
    });

    // Calculate benchmark statistics
    const benchmarkStats = calculateBenchmarkStatistics(benchmarkCampaigns);
    
    // Compare campaign against benchmarks
    const campaignPerformance = {
      clicks: campaignClicks,
      conversions: campaignConversions,
      conversionRate: campaignClicks > 0 ? (campaignConversions / campaignClicks) * 100 : 0
    };

    const comparison = compareToBenchmark(campaignPerformance, benchmarkStats);

    res.json({
      success: true,
      data: {
        campaign: {
          id: campaign.id,
          trackingId: campaign.tracking,
          name: `${campaign.product.name} - ${campaign.country}/${campaign.operator}`,
          customer: campaign.product.customer.name
        },
        benchmarkPeriod: {
          days,
          startDate: moment().subtract(days, 'days').format('YYYY-MM-DD'),
          endDate: moment().format('YYYY-MM-DD')
        },
        campaignPerformance,
        benchmarkData: {
          totalCampaigns: benchmarkCampaigns.length,
          comparisonType: comparison_type,
          statistics: benchmarkStats
        },
        comparison
      }
    });

  } catch (error) {
    loggers.error('Performance benchmarking failed', error as Error, {
      campaignId,
      benchmark_period,
      comparison_type,
      ip: req.ip
    });

    res.status(500).json({
      error: 'Failed to generate performance benchmark',
      code: 'PERFORMANCE_BENCHMARK_ERROR'
    });
  }
});

// Helper functions
function generatePerformanceRecommendations(
  campaign: any,
  performance: { clicks: number; conversions: number; conversionRate: number },
  relatedCampaigns: any[],
  optimizationType: string
) {
  const recommendations = [];

  // Conversion rate optimization
  if (optimizationType === 'conversion_rate' || optimizationType === 'all') {
    if (performance.conversionRate < 1.0) {
      recommendations.push({
        type: 'conversion_optimization',
        priority: 'high',
        title: 'Low Conversion Rate Detected',
        description: 'Consider reviewing traffic quality and landing page optimization',
        actionItems: [
          'Analyze traffic sources for quality',
          'Review landing page performance',
          'Check for fraud patterns'
        ]
      });
    }

    // Compare with related campaigns
    if (relatedCampaigns.length > 0) {
      const avgRelatedConversion = relatedCampaigns.reduce((sum, c) => {
        const rate = c._count.tracking > 0 ? (c._count.confirm / c._count.tracking) * 100 : 0;
        return sum + rate;
      }, 0) / relatedCampaigns.length;

      if (performance.conversionRate < avgRelatedConversion * 0.8) {
        recommendations.push({
          type: 'underperforming',
          priority: 'medium',
          title: 'Underperforming vs Similar Campaigns',
          description: `This campaign has ${Math.round((avgRelatedConversion - performance.conversionRate) * 100) / 100}% lower conversion rate than similar campaigns`,
          actionItems: [
            'Review campaign configuration',
            'Compare traffic patterns with better performing campaigns',
            'Consider pausing if trend continues'
          ]
        });
      }
    }
  }

  // Traffic volume optimization
  if (optimizationType === 'traffic_volume' || optimizationType === 'all') {
    if (performance.clicks < 10) {
      recommendations.push({
        type: 'traffic_volume',
        priority: 'high',
        title: 'Low Traffic Volume',
        description: 'Campaign is receiving very low traffic',
        actionItems: [
          'Check campaign status and configuration',
          'Verify traffic source integration',
          'Review targeting parameters'
        ]
      });
    }
  }

  return recommendations;
}

function analyzeTrafficDistribution(trafficData: any[], granularity: string) {
  const distributionMap = new Map();

  trafficData.forEach(traffic => {
    let bucket: string;
    const moment_date = moment(Number(traffic.creation_date));

    switch (granularity) {
      case 'hour':
        bucket = moment_date.format('YYYY-MM-DD HH:00');
        break;
      case 'day':
        bucket = moment_date.format('YYYY-MM-DD');
        break;
      case 'weekday':
        bucket = moment_date.format('dddd');
        break;
      default:
        bucket = moment_date.format('YYYY-MM-DD HH:00');
    }

    if (!distributionMap.has(bucket)) {
      distributionMap.set(bucket, 0);
    }
    const currentCount = distributionMap.get(bucket) || 0;
    distributionMap.set(bucket, currentCount + 1);
  });

  return Array.from(distributionMap.entries())
    .map(([period, count]) => ({ period, count }))
    .sort((a, b) => a.period.localeCompare(b.period));
}

function calculateTrafficHealthScore(trafficData: any[], days: number): number {
  if (trafficData.length === 0) return 0;

  const uniqueIPs = new Set(trafficData.map(t => t.ip)).size;
  const totalClicks = trafficData.length;
  const avgClicksPerDay = totalClicks / days;

  // Score based on multiple factors
  let score = 0;

  // Volume score (30%)
  if (avgClicksPerDay > 100) score += 30;
  else if (avgClicksPerDay > 50) score += 20;
  else if (avgClicksPerDay > 10) score += 10;

  // IP diversity score (40%)
  const ipDiversityRatio = uniqueIPs / totalClicks;
  if (ipDiversityRatio > 0.8) score += 40;
  else if (ipDiversityRatio > 0.6) score += 30;
  else if (ipDiversityRatio > 0.4) score += 20;
  else if (ipDiversityRatio > 0.2) score += 10;

  // Consistency score (30%)
  const dailyDistribution = analyzeTrafficDistribution(trafficData, 'day');
  const dailyVolumes = dailyDistribution.map(d => d.count);
  const avgDaily = dailyVolumes.reduce((sum, vol) => sum + vol, 0) / dailyVolumes.length;
  const variance = dailyVolumes.reduce((sum, vol) => sum + Math.pow(vol - avgDaily, 2), 0) / dailyVolumes.length;
  const stdDev = Math.sqrt(variance);
  const consistencyRatio = avgDaily > 0 ? 1 - (stdDev / avgDaily) : 0;

  if (consistencyRatio > 0.8) score += 30;
  else if (consistencyRatio > 0.6) score += 20;
  else if (consistencyRatio > 0.4) score += 10;

  return Math.min(100, Math.max(0, score));
}

function analyzeTrafficPatterns(trafficData: any[]) {
  const hourlyPattern = new Array(24).fill(0);
  const weekdayPattern = new Array(7).fill(0);

  trafficData.forEach(traffic => {
    const moment_date = moment(Number(traffic.creation_date));
    hourlyPattern[moment_date.hour()]++;
    weekdayPattern[moment_date.day()]++;
  });

  const peakHour = hourlyPattern.indexOf(Math.max(...hourlyPattern));
  const peakWeekday = weekdayPattern.indexOf(Math.max(...weekdayPattern));

  return {
    hourlyDistribution: hourlyPattern.map((count, hour) => ({ hour, count })),
    weekdayDistribution: weekdayPattern.map((count, day) => ({ 
      day: moment().day(day).format('dddd'), 
      count 
    })),
    patterns: {
      peakHour,
      peakWeekday: moment().day(peakWeekday).format('dddd'),
      totalClicks: trafficData.length
    }
  };
}

function calculateABTestResults(campaigns: any[], confidenceLevel: number) {
  const results = campaigns.map(campaign => {
    const clicks = campaign._count.tracking;
    const conversions = campaign._count.confirm;
    const conversionRate = clicks > 0 ? (conversions / clicks) * 100 : 0;

    return {
      campaignId: campaign.id,
      trackingId: campaign.tracking,
      clicks,
      conversions,
      conversionRate: Math.round(conversionRate * 100) / 100,
      sampleSize: clicks
    };
  });

  // Statistical significance testing (simplified)
  const analysisResults: any[] = [...results];
  
  if (results.length === 2) {
    const [control, variant] = results;
    const pooledRate = (control.conversions + variant.conversions) / (control.clicks + variant.clicks);
    const standardError = Math.sqrt(pooledRate * (1 - pooledRate) * (1/control.clicks + 1/variant.clicks));
    const zScore = Math.abs((variant.conversionRate/100) - (control.conversionRate/100)) / standardError;
    const pValue = 2 * (1 - normalCDF(Math.abs(zScore)));
    
    analysisResults.push({
      statistical_significance: {
        z_score: Math.round(zScore * 10000) / 10000,
        p_value: Math.round(pValue * 10000) / 10000,
        is_significant: pValue < (1 - confidenceLevel),
        confidence_level: confidenceLevel
      }
    });
  }

  return analysisResults;
}

function normalCDF(x: number): number {
  return 0.5 * (1 + erf(x / Math.sqrt(2)));
}

function erf(x: number): number {
  // Approximation of error function
  const a1 =  0.254829592;
  const a2 = -0.284496736;
  const a3 =  1.421413741;
  const a4 = -1.453152027;
  const a5 =  1.061405429;
  const p  =  0.3275911;

  const sign = x >= 0 ? 1 : -1;
  x = Math.abs(x);

  const t = 1.0 / (1.0 + p * x);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

  return sign * y;
}

async function analyzeABTestSegments(campaigns: any[], startTime: bigint) {
  // This would typically involve more complex segmentation analysis
  // For now, return basic country/operator breakdown
  const segmentData = new Map();

  for (const campaign of campaigns) {
    const key = `${campaign.country}/${campaign.operator}`;
    if (!segmentData.has(key)) {
      segmentData.set(key, []);
    }
    segmentData.get(key).push({
      campaignId: campaign.id,
      clicks: campaign._count.tracking,
      conversions: campaign._count.confirm
    });
  }

  return Array.from(segmentData.entries()).map(([segment, data]) => ({
    segment,
    campaigns: data
  }));
}

function calculateBenchmarkStatistics(campaigns: any[]) {
  if (campaigns.length === 0) {
    return {
      avgClicks: 0,
      avgConversions: 0,
      avgConversionRate: 0,
      medianConversionRate: 0,
      percentiles: {
        p25: 0,
        p50: 0,
        p75: 0,
        p90: 0
      }
    };
  }

  const metrics = campaigns.map(campaign => {
    const clicks = campaign._count.tracking;
    const conversions = campaign._count.confirm;
    return {
      clicks,
      conversions,
      conversionRate: clicks > 0 ? (conversions / clicks) * 100 : 0
    };
  });

  const conversionRates = metrics.map(m => m.conversionRate).sort((a, b) => a - b);
  
  return {
    avgClicks: Math.round(metrics.reduce((sum, m) => sum + m.clicks, 0) / metrics.length),
    avgConversions: Math.round(metrics.reduce((sum, m) => sum + m.conversions, 0) / metrics.length),
    avgConversionRate: Math.round((metrics.reduce((sum, m) => sum + m.conversionRate, 0) / metrics.length) * 100) / 100,
    medianConversionRate: getPercentile(conversionRates, 0.5),
    percentiles: {
      p25: getPercentile(conversionRates, 0.25),
      p50: getPercentile(conversionRates, 0.5),
      p75: getPercentile(conversionRates, 0.75),
      p90: getPercentile(conversionRates, 0.9)
    }
  };
}

function getPercentile(sortedArray: number[], percentile: number): number {
  const index = percentile * (sortedArray.length - 1);
  if (Math.floor(index) === index) {
    return Math.round(sortedArray[index] * 100) / 100;
  } else {
    const lower = sortedArray[Math.floor(index)];
    const upper = sortedArray[Math.ceil(index)];
    return Math.round(((lower + upper) / 2) * 100) / 100;
  }
}

function compareToBenchmark(performance: any, benchmark: any) {
  return {
    vs_average: {
      clicks: performance.clicks - benchmark.avgClicks,
      conversions: performance.conversions - benchmark.avgConversions,
      conversionRate: Math.round((performance.conversionRate - benchmark.avgConversionRate) * 100) / 100
    },
    percentile_ranking: {
      conversionRate: calculatePercentileRank(performance.conversionRate, benchmark)
    },
    performance_level: getPerformanceLevel(performance.conversionRate, benchmark)
  };
}

function calculatePercentileRank(value: number, benchmark: any): number {
  if (value >= benchmark.percentiles.p90) return 90;
  if (value >= benchmark.percentiles.p75) return 75;
  if (value >= benchmark.percentiles.p50) return 50;
  if (value >= benchmark.percentiles.p25) return 25;
  return 10;
}

function getPerformanceLevel(conversionRate: number, benchmark: any): string {
  if (conversionRate >= benchmark.percentiles.p90) return 'excellent';
  if (conversionRate >= benchmark.percentiles.p75) return 'good';
  if (conversionRate >= benchmark.percentiles.p50) return 'average';
  if (conversionRate >= benchmark.percentiles.p25) return 'below_average';
  return 'poor';
}

export default router;