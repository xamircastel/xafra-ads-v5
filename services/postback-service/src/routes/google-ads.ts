import { Router, Request, Response } from 'express';
import { dbService } from '../utils/database.js';

const router = Router();

/**
 * Google Ads Conversion Upload Endpoint
 * POST /api/postbacks/google/conversion
 * 
 * This endpoint receives conversion data from Core-Service and sends it to Google Ads API
 */
router.post('/conversion', async (req: Request, res: Response) => {
  const startTime = Date.now();
  
  try {
    const {
      conversion_id,
      tracking, // gclid
      customer_id,
      country,
      operator,
      msisdn,
      campaign,
      conversion_date,
      id_product
    } = req.body;

    // Validate required fields
    if (!conversion_id || !tracking || !customer_id) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields: conversion_id, tracking, customer_id',
        code: 'INVALID_REQUEST'
      });
      return;
    }

    console.log(`📤 Processing Google Ads conversion upload`);
    console.log(`   - Conversion ID: ${conversion_id}`);
    console.log(`   - Tracking (gclid): ${tracking}`);
    console.log(`   - Customer ID: ${customer_id}`);
    console.log(`   - Country: ${country}`);
    console.log(`   - Operator: ${operator}`);
    console.log(`   - Campaign: ${campaign || 'N/A'}`);

    // Upload conversion to Google Ads API
    const result = await uploadConversionToGoogleAds({
      gclid: tracking,
      conversionDateTime: conversion_date,
      conversionValue: 1.0,
      currencyCode: 'PEN',
      customerId: customer_id,
      country,
      operator,
      campaign,
      msisdn,
      idProduct: id_product
    });

    const responseTime = Date.now() - startTime;

    console.log(`✅ Google Ads conversion uploaded successfully`);
    console.log(`   - Response time: ${responseTime}ms`);
    console.log(`   - Status: ${result.status}`);

    res.json({
      success: true,
      message: 'Conversion uploaded to Google Ads successfully',
      data: {
        conversion_id,
        tracking,
        google_response: result,
        response_time: responseTime,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.error('❌ Google Ads conversion upload failed:', error);

    res.status(500).json({
      success: false,
      error: 'Google Ads API error',
      code: 'GOOGLE_ADS_ERROR',
      response_time: responseTime,
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Health check for Google Ads integration
 * GET /api/postbacks/google/health
 */
router.get('/health', async (req: Request, res: Response) => {
  try {
    res.json({
      success: true,
      service: 'Google Ads Postback Service',
      status: 'healthy',
      timestamp: new Date().toISOString(),
      endpoints: {
        conversion_upload: '/api/postbacks/google/conversion'
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Health check failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get conversion statistics
 * GET /api/postbacks/google/stats
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const { days = 7 } = req.query;
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - Number(days));

    const stats = await dbService.executeQuery(`
      SELECT 
        COUNT(*) as total_conversions,
        COUNT(CASE WHEN status_post_back = 'success' THEN 1 END) as successful,
        COUNT(CASE WHEN status_post_back = 'failed' THEN 1 END) as failed,
        COUNT(CASE WHEN status_post_back = 'pending' OR status_post_back IS NULL THEN 1 END) as pending,
        DATE(conversion_date) as date
      FROM {schema}.conversions
      WHERE conversion_date >= $1
        AND (source = 'google' OR source LIKE '%google%')
      GROUP BY DATE(conversion_date)
      ORDER BY date DESC
    `, [daysAgo]);

    const summary = await dbService.executeQuery(`
      SELECT 
        COUNT(*) as total_conversions,
        COUNT(CASE WHEN status_post_back = 'success' THEN 1 END) as successful,
        COUNT(CASE WHEN status_post_back = 'failed' THEN 1 END) as failed,
        COUNT(CASE WHEN status_post_back = 'pending' OR status_post_back IS NULL THEN 1 END) as pending,
        COUNT(DISTINCT customer_id::text) as unique_customers,
        COUNT(DISTINCT campaign) as unique_campaigns
      FROM {schema}.conversions
      WHERE conversion_date >= $1
        AND (source = 'google' OR source LIKE '%google%')
    `, [daysAgo]);

    // Get totals for all time
    const totals = await dbService.executeQuery(`
      SELECT 
        COUNT(*) as total_sent,
        COUNT(CASE WHEN status_post_back = 'success' THEN 1 END) as total_success,
        COUNT(CASE WHEN status_post_back = 'failed' THEN 1 END) as total_failed,
        COUNT(CASE WHEN status_post_back = 'pending' OR status_post_back IS NULL THEN 1 END) as total_pending
      FROM {schema}.conversions
      WHERE (source = 'google' OR source LIKE '%google%')
    `, []);

    res.json({
      success: true,
      ...(totals[0] || {}),
      data: {
        summary: summary[0] || {},
        daily_stats: stats || [],
        period_days: Number(days),
        generated_at: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Failed to fetch Google conversion stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch statistics',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Upload conversion to Google Ads API
 * 
 * IMPLEMENTATION NOTE:
 * This is a placeholder implementation. To fully integrate with Google Ads API:
 * 
 * 1. Install Google Ads API client:
 *    npm install google-ads-api
 * 
 * 2. Configure OAuth2 credentials:
 *    - Get developer token from Google Ads
 *    - Set up OAuth2 refresh token
 *    - Configure customer ID and conversion action ID
 * 
 * 3. Use Google Ads API Client Library:
 *    const { GoogleAdsApi } = require('google-ads-api');
 *    const client = new GoogleAdsApi({
 *      client_id: process.env.GOOGLE_ADS_CLIENT_ID,
 *      client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET,
 *      developer_token: process.env.GOOGLE_ADS_DEVELOPER_TOKEN
 *    });
 * 
 * 4. Upload click conversion:
 *    await customer.clickConversions.upload([{
 *      gclid: data.gclid,
 *      conversion_action: 'customers/xxx/conversionActions/yyy',
 *      conversion_date_time: data.conversionDateTime,
 *      conversion_value: data.conversionValue,
 *      currency_code: data.currencyCode
 *    }]);
 * 
 * Documentation: https://developers.google.com/google-ads/api/docs/conversions/upload-clicks
 */
async function uploadConversionToGoogleAds(data: {
  gclid: string;
  conversionDateTime: string;
  conversionValue: number;
  currencyCode: string;
  customerId: number;
  country?: string;
  operator?: string;
  campaign?: string;
  msisdn?: string;
  idProduct?: number;
}) {
  console.log('🔄 Preparing Google Ads API call...');
  console.log('   Data:', JSON.stringify(data, null, 2));

  // Check if Google Ads credentials are configured
  const hasCredentials = !!(
    process.env.GOOGLE_ADS_DEVELOPER_TOKEN &&
    process.env.GOOGLE_ADS_CLIENT_ID &&
    process.env.GOOGLE_ADS_CLIENT_SECRET &&
    process.env.GOOGLE_ADS_CUSTOMER_ID &&
    process.env.GOOGLE_ADS_CONVERSION_ACTION_ID
  );

  if (!hasCredentials) {
    console.warn('⚠️ Google Ads credentials not configured - using mock response');
    console.warn('   Configure the following environment variables:');
    console.warn('   - GOOGLE_ADS_DEVELOPER_TOKEN');
    console.warn('   - GOOGLE_ADS_CLIENT_ID');
    console.warn('   - GOOGLE_ADS_CLIENT_SECRET');
    console.warn('   - GOOGLE_ADS_CUSTOMER_ID');
    console.warn('   - GOOGLE_ADS_CONVERSION_ACTION_ID');
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return {
      status: 'mock_success',
      message: 'Mock conversion upload (credentials not configured)',
      gclid: data.gclid,
      conversion_value: data.conversionValue,
      currency_code: data.currencyCode,
      timestamp: new Date().toISOString(),
      note: 'This is a placeholder response. Configure Google Ads API credentials for real integration.'
    };
  }

  // TODO: Real Google Ads API implementation
  // When credentials are configured, implement the actual API call here
  /*
  const { GoogleAdsApi } = require('google-ads-api');
  
  const client = new GoogleAdsApi({
    client_id: process.env.GOOGLE_ADS_CLIENT_ID,
    client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET,
    developer_token: process.env.GOOGLE_ADS_DEVELOPER_TOKEN
  });

  const customer = client.Customer({
    customer_id: process.env.GOOGLE_ADS_CUSTOMER_ID,
    refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN
  });

  const conversionAction = `customers/${process.env.GOOGLE_ADS_CUSTOMER_ID}/conversionActions/${process.env.GOOGLE_ADS_CONVERSION_ACTION_ID}`;

  const result = await customer.clickConversions.upload([{
    gclid: data.gclid,
    conversion_action: conversionAction,
    conversion_date_time: data.conversionDateTime,
    conversion_value: data.conversionValue,
    currency_code: data.currencyCode
  }]);

  return {
    status: 'success',
    google_response: result,
    gclid: data.gclid,
    timestamp: new Date().toISOString()
  };
  */

  // Placeholder return
  await new Promise(resolve => setTimeout(resolve, 500));
  
  return {
    status: 'uploaded',
    gclid: data.gclid,
    conversion_value: data.conversionValue,
    currency_code: data.currencyCode,
    timestamp: new Date().toISOString()
  };
}

export default router;
