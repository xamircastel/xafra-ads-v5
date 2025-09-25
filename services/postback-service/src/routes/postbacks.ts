import { Router, Request, Response } from 'express';
import { dbService } from '../utils/database.js';
import { redisService } from '../utils/redis.js';
import { PostbackProcessor, PostbackRequest, PostbackResponse } from '../utils/postback-processor.js';

// Helper function to convert BigInt to number
function convertBigIntToNumber(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'bigint') return Number(obj);
  if (Array.isArray(obj)) return obj.map(convertBigIntToNumber);
  if (typeof obj === 'object') {
    const converted: any = {};
    for (const key in obj) {
      converted[key] = convertBigIntToNumber(obj[key]);
    }
    return converted;
  }
  return obj;
}

const router = Router();

// Send postback notification - MAIN ENDPOINT
router.post('/send', async (req: Request, res: Response) => {
  const startTime = Date.now();
  
  try {
    const postbackRequest: PostbackRequest = req.body;
    
    // Validate required parameters
    const validation = validatePostbackRequest(postbackRequest);
    if (!validation.valid) {
      res.status(400).json({
        success: false,
        error: validation.error,
        code: 'INVALID_REQUEST'
      });
      return;
    }

    const {
      campaign_id,
      tracking_id,
      webhook_url,
      postback_parameters,
      priority = 'normal'
    } = postbackRequest;

    // Generate conversion ID if not provided
    const conversion_id = postbackRequest.conversion_id || 
      PostbackProcessor.generateConversionId(campaign_id, tracking_id);

    console.log(`📤 Processing postback for campaign ${campaign_id}, tracking: ${tracking_id}`);

    // Get campaign and product data from database
    const campaignData = await dbService.getCampaignWithProduct(campaign_id) as any[];
    
    if (!campaignData || campaignData.length === 0) {
      res.status(404).json({
        success: false,
        error: 'Campaign not found',
        code: 'CAMPAIGN_NOT_FOUND'
      });
      return;
    }

    const campaign = convertBigIntToNumber(campaignData[0]);
    const method = (postback_parameters.method || campaign.method_postback || 'GET').toUpperCase();

    // Log method determination
    console.log(`🔧 Method determined:`, {
      requested_method: postback_parameters.method,
      campaign_method: campaign.method_postback,
      final_method: method,
      source: postback_parameters.method ? 'request_parameter' : 
              campaign.method_postback ? 'campaign_config' : 'default'
    });

    // Process dynamic URL with tracking replacement
    const processedUrl = PostbackProcessor.processWebhookUrl(webhook_url, tracking_id);
    
    // Validate processed URL
    const urlValidation = PostbackProcessor.validateWebhookUrl(processedUrl);
    if (!urlValidation.valid) {
      res.status(400).json({
        success: false,
        error: `Invalid webhook URL: ${urlValidation.error}`,
        code: 'INVALID_WEBHOOK_URL'
      });
      return;
    }

    // Prepare postback data
    const postbackData = {
      campaign_id,
      tracking_id,
      conversion_id,
      customer_id: postback_parameters.customer_id,
      customer_name: postback_parameters.customer_name,
      product_id: postback_parameters.product_id,
      product_name: postback_parameters.product_name,
      original_tracking: postback_parameters.original_tracking,
      short_tracking: postback_parameters.short_tracking,
      tracking_used: postback_parameters.tracking_used,
      is_kolbi_confirmation: postback_parameters.is_kolbi_confirmation,
      confirmed_at: postback_parameters.confirmed_at,
      country: postback_parameters.country || 'CR',
      operator: postback_parameters.operator || 'KOLBI'
    };

    // Process body template if provided
    let finalPostbackData = postbackData;
    if (method === 'POST' && (postback_parameters.body_template || campaign.body_postback)) {
      finalPostbackData = PostbackProcessor.processBodyTemplate(
        postback_parameters.body_template || campaign.body_postback,
        tracking_id,
        postbackData
      );
    }

    // Send the postback
    const result = await PostbackProcessor.sendPostback({
      url: processedUrl,
      method: method as 'GET' | 'POST',
      data: finalPostbackData,
      timeout: 30000
    });

    const responseTime = Date.now() - startTime;

    // Log the attempt to database
    await dbService.logPostbackAttempt({
      campaign_id,
      tracking_id,
      webhook_url: processedUrl,
      success: result.success,
      response_time: result.responseTime,
      response_status: result.statusCode,
      error_message: result.error
    });

    // Update campaign status in database
    const campaignStatus = result.success ? 1 : 2; // 1 = success, 2 = failed
    await dbService.updateCampaignPostbackStatus(
      campaign_id, 
      campaignStatus, 
      result.error
    );

    // If failed and retries enabled, schedule retry
    let retryScheduled = false;
    let nextRetry;
    
    if (!result.success && priority !== 'low') {
      const retryDelay = PostbackProcessor.calculateRetryDelay(1);
      
      const retryData = {
        ...postbackRequest,
        attempt_count: 1,
        last_error: result.error,
        original_url: webhook_url,
        processed_url: processedUrl,
        method,
        postback_data: finalPostbackData
      };

      retryScheduled = await redisService.addToRetryQueue(retryData, retryDelay);
      if (retryScheduled) {
        nextRetry = new Date(Date.now() + retryDelay).toISOString();
      }
    }

    // Cache result for quick access
    await redisService.cachePostbackResult(campaign_id, {
      success: result.success,
      timestamp: new Date().toISOString(),
      response_time: result.responseTime,
      status_code: result.statusCode
    });

    // Prepare response
    const response: PostbackResponse = {
      success: result.success,
      data: {
        campaign_id,
        tracking_id,
        conversion_id,
        webhook_url: PostbackProcessor.maskUrl(processedUrl),
        response_time: result.responseTime,
        response_status: result.statusCode,
        timestamp: new Date().toISOString(),
        ...(result.error ? { error_message: result.error } : {}),
        ...(retryScheduled ? { 
          retry_scheduled: true,
          next_retry: nextRetry
        } : {})
      }
    };

    console.log(`${result.success ? '✅' : '❌'} Postback ${result.success ? 'sent successfully' : 'failed'} for campaign ${campaign_id}`);

    res.json(response);

  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.error('❌ Postback processing failed:', error);

    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'POSTBACK_PROCESSING_ERROR',
      response_time: responseTime,
      timestamp: new Date().toISOString()
    });
  }
});

// Validate postback request
function validatePostbackRequest(request: any): { valid: boolean; error?: string } {
  if (!request) {
    return { valid: false, error: 'Request body is required' };
  }

  const required = ['campaign_id', 'tracking_id', 'webhook_url', 'postback_parameters'];
  
  for (const field of required) {
    if (!request[field]) {
      return { valid: false, error: `Missing required field: ${field}` };
    }
  }

  if (typeof request.campaign_id !== 'number') {
    return { valid: false, error: 'campaign_id must be a number' };
  }

  if (typeof request.tracking_id !== 'string') {
    return { valid: false, error: 'tracking_id must be a string' };
  }

  if (typeof request.webhook_url !== 'string') {
    return { valid: false, error: 'webhook_url must be a string' };
  }

  if (!request.postback_parameters || typeof request.postback_parameters !== 'object') {
    return { valid: false, error: 'postback_parameters must be an object' };
  }

  return { valid: true };
}

// Get postback status by tracking ID - SIMPLIFIED
router.get('/status/:tracking_id', async (req: Request, res: Response) => {
  const { tracking_id } = req.params;

  try {
    // Get cached result first
    const campaignsRaw = await dbService.executeQuery(`
      SELECT 
        c.id as campaign_id,
        c.tracking,
        c.status_post_back,
        c.date_post_back,
        p.url_redirect_postback
      FROM {schema}.campaign c
      LEFT JOIN {schema}.products p ON c.id_product = p.id_product
      WHERE c.tracking = $1
      ORDER BY c.creation_date DESC
      LIMIT 5
    `, [tracking_id]) as any[];

    const campaigns = convertBigIntToNumber(campaignsRaw);

    if (!campaigns || campaigns.length === 0) {
      res.status(404).json({
        success: false,
        error: 'No campaigns found for tracking ID',
        code: 'TRACKING_NOT_FOUND'
      });
      return;
    }

    const latestCampaign = campaigns[0];
    
    res.json({
      success: true,
      data: {
        tracking_id,
        campaign_id: latestCampaign.campaign_id,
        current_status: latestCampaign.status_post_back === 1 ? 'delivered' : 
                       latestCampaign.status_post_back === 2 ? 'failed' : 'pending',
        last_attempt: latestCampaign.date_post_back,
        webhook_url: PostbackProcessor.maskUrl(latestCampaign.url_redirect_postback || ''),
        total_campaigns: campaigns.length
      }
    });

  } catch (error) {
    console.error('Failed to get postback status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve postback status',
      code: 'STATUS_RETRIEVAL_ERROR'
    });
  }
});

export default router;