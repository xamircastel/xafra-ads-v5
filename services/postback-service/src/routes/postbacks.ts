import { Router, Request, Response } from 'express';
import axios from 'axios';
import { createHash, createHmac } from 'crypto';

const router = Router();

// Send postback notification
router.post('/send', async (req: Request, res: Response) => {
  const { 
    campaign_id,
    tracking_id,
    conversion_id,
    webhook_url,
    postback_parameters,
    authentication,
    retry_config,
    priority = 'normal'
  } = req.body;

  try {
    // Validate required parameters
    if (!campaign_id || !tracking_id || !webhook_url) {
      res.status(400).json({
        error: 'Missing required parameters: campaign_id, tracking_id, webhook_url',
        code: 'MISSING_REQUIRED_PARAMETERS'
      });
      return;
    }

    // Validate webhook URL
    try {
      new URL(webhook_url);
    } catch (urlError) {
      res.status(400).json({
        error: 'Invalid webhook URL format',
        code: 'INVALID_WEBHOOK_URL'
      });
      return;
    }

    // Build postback payload
    const postbackData = buildPostbackPayload({
      campaign_id,
      tracking_id,
      conversion_id,
      postback_parameters,
      timestamp: Date.now()
    });

    // Add authentication if provided
    const headers: any = {
      'Content-Type': 'application/json',
      'User-Agent': 'Xafra-Postback-Service/1.0'
    };

    if (authentication) {
      if (authentication.type === 'bearer') {
        headers['Authorization'] = `Bearer ${authentication.token}`;
      } else if (authentication.type === 'api_key') {
        headers['X-API-Key'] = authentication.key;
      } else if (authentication.type === 'hmac') {
        const signature = generateHmacSignature(postbackData, authentication.secret);
        headers['X-Signature'] = signature;
      }
    }

    // Send postback
    const startTime = Date.now();
    let response;
    let success = false;
    let error_message = null;

    try {
      response = await axios.post(webhook_url, postbackData, {
        headers,
        timeout: 30000, // 30 seconds timeout
        validateStatus: (status) => status >= 200 && status < 400
      });
      success = true;
    } catch (httpError: any) {
      error_message = httpError.response ? 
        `HTTP ${httpError.response.status}: ${httpError.response.statusText}` :
        httpError.message;
      success = false;
    }

    const responseTime = Date.now() - startTime;

    // Log the postback attempt
    const logData = {
      campaign_id,
      tracking_id,
      conversion_id,
      webhook_url,
      success,
      response_time: responseTime,
      response_status: response?.status || null,
      error_message,
      timestamp: new Date().toISOString(),
      priority
    };

    console.log('Postback attempt:', logData);

    // Schedule retry if failed and retry config provided
    if (!success && retry_config && retry_config.enabled) {
      await scheduleRetry({
        ...req.body,
        attempt_count: 1,
        last_error: error_message,
        next_retry: calculateNextRetry(1, retry_config)
      });
    }

    res.json({
      success,
      data: {
        campaign_id,
        tracking_id,
        conversion_id,
        webhook_url: maskUrl(webhook_url),
        response_time: responseTime,
        response_status: response?.status || null,
        timestamp: new Date().toISOString(),
        ...(error_message ? { error_message } : {}),
        ...(retry_config && !success ? { 
          retry_scheduled: true,
          next_retry: calculateNextRetry(1, retry_config)
        } : {})
      }
    });

  } catch (error) {
    console.error('Postback sending failed:', error);

    res.status(500).json({
      error: 'Failed to send postback',
      code: 'POSTBACK_SEND_ERROR',
      timestamp: new Date().toISOString()
    });
  }
});

// Bulk postback sending
router.post('/send-bulk', async (req: Request, res: Response) => {
  const { postbacks, max_concurrent = 5 } = req.body;

  try {
    if (!Array.isArray(postbacks) || postbacks.length === 0) {
      res.status(400).json({
        error: 'Postbacks array is required and must not be empty',
        code: 'INVALID_POSTBACKS_ARRAY'
      });
      return;
    }

    const results = [];
    const batches = chunkArray(postbacks, max_concurrent);

    for (const batch of batches) {
      const batchPromises = batch.map(async (postback: any) => {
        try {
          // Create a mock request for the single postback endpoint
          const mockReq = {
            body: postback
          };
          
          const mockRes = {
            status: (code: number) => mockRes,
            json: (data: any) => data
          };

          // Process each postback (simplified version)
          const result = await processSinglePostback(postback);
          return {
            campaign_id: postback.campaign_id,
            tracking_id: postback.tracking_id,
            success: result.success,
            response_time: result.response_time,
            error_message: result.error_message || null
          };
        } catch (error) {
          return {
            campaign_id: postback.campaign_id,
            tracking_id: postback.tracking_id,
            success: false,
            error_message: error instanceof Error ? error.message : 'Unknown error'
          };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.length - successCount;

    res.json({
      success: true,
      data: {
        total_postbacks: postbacks.length,
        successful: successCount,
        failed: failureCount,
        success_rate: Math.round((successCount / postbacks.length) * 10000) / 100,
        results,
        processed_at: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Bulk postback sending failed:', error);

    res.status(500).json({
      error: 'Failed to send bulk postbacks',
      code: 'BULK_POSTBACK_ERROR'
    });
  }
});

// Get postback status/history
router.get('/status/:tracking_id', async (req: Request, res: Response) => {
  const { tracking_id } = req.params;
  const { limit = '10', offset = '0' } = req.query;

  try {
    // In a real implementation, this would query a postback_logs table
    // For now, return mock status data
    const mockStatus = {
      tracking_id,
      campaign_id: 123,
      conversion_id: 456,
      postback_attempts: [
        {
          attempt: 1,
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          success: false,
          error_message: 'Connection timeout',
          response_time: 30000
        },
        {
          attempt: 2,
          timestamp: new Date(Date.now() - 1800000).toISOString(),
          success: true,
          response_status: 200,
          response_time: 1250
        }
      ],
      current_status: 'delivered',
      total_attempts: 2,
      last_attempt: new Date(Date.now() - 1800000).toISOString(),
      webhook_url: 'https://example.com/postback'
    };

    res.json({
      success: true,
      data: mockStatus
    });

  } catch (error) {
    console.error('Postback status retrieval failed:', error);

    res.status(500).json({
      error: 'Failed to retrieve postback status',
      code: 'POSTBACK_STATUS_ERROR'
    });
  }
});

// Test webhook endpoint
router.post('/test-webhook', async (req: Request, res: Response) => {
  const { webhook_url, authentication, test_data } = req.body;

  try {
    if (!webhook_url) {
      res.status(400).json({
        error: 'Webhook URL is required',
        code: 'MISSING_WEBHOOK_URL'
      });
      return;
    }

    // Build test payload
    const testPayload = test_data || {
      test: true,
      campaign_id: 'test_campaign',
      tracking_id: 'test_tracking',
      conversion_id: 'test_conversion',
      timestamp: Date.now(),
      message: 'This is a test postback from Xafra Ads'
    };

    // Setup headers
    const headers: any = {
      'Content-Type': 'application/json',
      'User-Agent': 'Xafra-Postback-Service/1.0 (Test)'
    };

    if (authentication) {
      if (authentication.type === 'bearer') {
        headers['Authorization'] = `Bearer ${authentication.token}`;
      } else if (authentication.type === 'api_key') {
        headers['X-API-Key'] = authentication.key;
      }
    }

    // Send test request
    const startTime = Date.now();
    let testResult;

    try {
      const response = await axios.post(webhook_url, testPayload, {
        headers,
        timeout: 15000,
        validateStatus: () => true // Accept any status for testing
      });

      testResult = {
        success: response.status >= 200 && response.status < 400,
        status_code: response.status,
        response_time: Date.now() - startTime,
        response_headers: response.headers,
        response_data: response.data,
        error_message: response.status >= 400 ? `HTTP ${response.status}` : null
      };
    } catch (error: any) {
      testResult = {
        success: false,
        response_time: Date.now() - startTime,
        error_message: error.code === 'ECONNABORTED' ? 'Request timeout' : error.message
      };
    }

    res.json({
      success: true,
      data: {
        webhook_url: maskUrl(webhook_url),
        test_payload: testPayload,
        test_result: testResult,
        tested_at: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Webhook test failed:', error);

    res.status(500).json({
      error: 'Failed to test webhook',
      code: 'WEBHOOK_TEST_ERROR'
    });
  }
});

// Helper functions
function buildPostbackPayload(data: any) {
  const basePayload = {
    campaign_id: data.campaign_id,
    tracking_id: data.tracking_id,
    conversion_id: data.conversion_id,
    timestamp: data.timestamp,
    source: 'xafra_ads_v5'
  };

  // Merge custom parameters
  if (data.postback_parameters) {
    Object.assign(basePayload, data.postback_parameters);
  }

  return basePayload;
}

function generateHmacSignature(data: any, secret: string): string {
  const payload = typeof data === 'string' ? data : JSON.stringify(data);
  return createHmac('sha256', secret).update(payload).digest('hex');
}

function maskUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    return `${urlObj.protocol}//${urlObj.hostname}${urlObj.pathname}***`;
  } catch {
    return 'invalid_url';
  }
}

function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

async function processSinglePostback(postback: any) {
  const startTime = Date.now();
  
  try {
    const headers: any = {
      'Content-Type': 'application/json',
      'User-Agent': 'Xafra-Postback-Service/1.0'
    };

    const postbackData = buildPostbackPayload(postback);
    
    const response = await axios.post(postback.webhook_url, postbackData, {
      headers,
      timeout: 30000,
      validateStatus: (status) => status >= 200 && status < 400
    });

    return {
      success: true,
      response_time: Date.now() - startTime,
      response_status: response.status
    };
  } catch (error: any) {
    return {
      success: false,
      response_time: Date.now() - startTime,
      error_message: error.response ? 
        `HTTP ${error.response.status}` : 
        error.message
    };
  }
}

function calculateNextRetry(attemptCount: number, retryConfig: any): string {
  const baseDelay = retryConfig.initial_delay || 60000; // 1 minute default
  const backoffMultiplier = retryConfig.backoff_multiplier || 2;
  const maxDelay = retryConfig.max_delay || 3600000; // 1 hour max

  const delay = Math.min(baseDelay * Math.pow(backoffMultiplier, attemptCount - 1), maxDelay);
  return new Date(Date.now() + delay).toISOString();
}

async function scheduleRetry(retryData: any) {
  // In a real implementation, this would add to a retry queue
  console.log('Retry scheduled:', {
    campaign_id: retryData.campaign_id,
    tracking_id: retryData.tracking_id,
    attempt_count: retryData.attempt_count,
    next_retry: retryData.next_retry
  });
}

export default router;