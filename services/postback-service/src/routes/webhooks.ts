import { Router, Request, Response } from 'express';
import { createHash, createHmac, timingSafeEqual } from 'crypto';

const router = Router();

// Receive incoming webhook from traffic sources
router.post('/receive/:source', async (req: Request, res: Response) => {
  const { source } = req.params;
  const { 
    signature_header = 'x-signature',
    timestamp_header = 'x-timestamp',
    verify_signature = 'true',
    max_age_seconds = '300'
  } = req.query;

  try {
    const payload = req.body;
    const headers = req.headers;
    
    // Log incoming webhook
    console.log('Incoming webhook:', {
      source,
      headers: Object.keys(headers),
      payload_size: JSON.stringify(payload).length,
      timestamp: new Date().toISOString(),
      ip: req.ip
    });

    // Verify timestamp if provided
    const timestampHeader = timestamp_header as string;
    if (timestampHeader && headers[timestampHeader]) {
      const timestamp = parseInt(headers[timestampHeader] as string);
      const now = Math.floor(Date.now() / 1000);
      
      if (now - timestamp > parseInt(max_age_seconds as string)) {
        res.status(400).json({
          error: 'Webhook timestamp too old',
          code: 'WEBHOOK_TIMESTAMP_EXPIRED',
          max_age: max_age_seconds
        });
        return;
      }
    }

    // Verify signature if enabled
    const signatureHeader = signature_header as string;
    if (verify_signature === 'true' && signatureHeader) {
      const signature = headers[signatureHeader] as string;
      
      if (!signature) {
        res.status(400).json({
          error: 'Missing webhook signature',
          code: 'MISSING_WEBHOOK_SIGNATURE'
        });
        return;
      }

      const isValid = await verifyWebhookSignature(source, payload, signature);
      
      if (!isValid) {
        res.status(401).json({
          error: 'Invalid webhook signature',
          code: 'INVALID_WEBHOOK_SIGNATURE'
        });
        return;
      }
    }

    // Process webhook based on source
    const processResult = await processIncomingWebhook(source, payload, headers);
    
    res.status(processResult.success ? 200 : 400).json({
      success: processResult.success,
      message: processResult.message,
      webhook_id: processResult.webhook_id,
      processed_at: new Date().toISOString(),
      ...(processResult.error ? { error: processResult.error } : {})
    });

  } catch (error) {
    console.error('Webhook processing failed:', error);

    res.status(500).json({
      error: 'Failed to process webhook',
      code: 'WEBHOOK_PROCESSING_ERROR',
      timestamp: new Date().toISOString()
    });
  }
});

// Register a new webhook endpoint
router.post('/register', async (req: Request, res: Response) => {
  const {
    source_name,
    webhook_url,
    secret_key,
    signature_method = 'hmac_sha256',
    content_type = 'application/json',
    events = ['conversion', 'click', 'impression'],
    active = true
  } = req.body;

  try {
    if (!source_name || !webhook_url) {
      res.status(400).json({
        error: 'source_name and webhook_url are required',
        code: 'MISSING_REQUIRED_FIELDS'
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

    // Create webhook configuration
    const webhookConfig = {
      id: generateWebhookId(),
      source_name,
      webhook_url,
      secret_key: secret_key || generateSecret(),
      signature_method,
      content_type,
      events,
      active,
      created_at: new Date().toISOString(),
      last_used: null,
      total_requests: 0,
      successful_requests: 0
    };

    // In a real implementation, save to database
    console.log('Webhook registered:', {
      id: webhookConfig.id,
      source_name,
      webhook_url: maskUrl(webhook_url),
      events
    });

    res.status(201).json({
      success: true,
      data: {
        webhook_id: webhookConfig.id,
        source_name,
        webhook_url: maskUrl(webhook_url),
        signature_method,
        events,
        active,
        secret_key: webhookConfig.secret_key,
        created_at: webhookConfig.created_at
      }
    });

  } catch (error) {
    console.error('Webhook registration failed:', error);

    res.status(500).json({
      error: 'Failed to register webhook',
      code: 'WEBHOOK_REGISTRATION_ERROR'
    });
  }
});

// List registered webhooks
router.get('/list', async (req: Request, res: Response) => {
  const { 
    source_name,
    active_only = 'false',
    limit = '20',
    offset = '0'
  } = req.query;

  try {
    // Mock webhook list - in real implementation, query from database
    const mockWebhooks = [
      {
        id: 'wh_001',
        source_name: 'traffic_source_1',
        webhook_url: 'https://partner1.com/webhook',
        signature_method: 'hmac_sha256',
        events: ['conversion', 'click'],
        active: true,
        created_at: new Date(Date.now() - 86400000).toISOString(),
        last_used: new Date(Date.now() - 3600000).toISOString(),
        total_requests: 1250,
        successful_requests: 1198
      },
      {
        id: 'wh_002',
        source_name: 'traffic_source_2',
        webhook_url: 'https://partner2.com/postback',
        signature_method: 'hmac_sha256',
        events: ['conversion'],
        active: true,
        created_at: new Date(Date.now() - 172800000).toISOString(),
        last_used: new Date(Date.now() - 7200000).toISOString(),
        total_requests: 890,
        successful_requests: 875
      }
    ];

    let filteredWebhooks = mockWebhooks;
    
    if (source_name) {
      filteredWebhooks = filteredWebhooks.filter(wh => 
        wh.source_name.toLowerCase().includes((source_name as string).toLowerCase())
      );
    }
    
    if (active_only === 'true') {
      filteredWebhooks = filteredWebhooks.filter(wh => wh.active);
    }

    // Apply pagination
    const startIndex = parseInt(offset as string);
    const endIndex = startIndex + parseInt(limit as string);
    const paginatedWebhooks = filteredWebhooks.slice(startIndex, endIndex);

    // Mask sensitive data
    const safeWebhooks = paginatedWebhooks.map(webhook => ({
      ...webhook,
      webhook_url: maskUrl(webhook.webhook_url),
      success_rate: webhook.total_requests > 0 
        ? Math.round((webhook.successful_requests / webhook.total_requests) * 10000) / 100
        : 0
    }));

    res.json({
      success: true,
      data: {
        total_webhooks: filteredWebhooks.length,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        webhooks: safeWebhooks
      }
    });

  } catch (error) {
    console.error('Webhook list retrieval failed:', error);

    res.status(500).json({
      error: 'Failed to retrieve webhooks',
      code: 'WEBHOOK_LIST_ERROR'
    });
  }
});

// Helper functions
async function verifyWebhookSignature(source: string, payload: any, signature: string): Promise<boolean> {
  try {
    // In a real implementation, get the secret from database based on source
    const secret = getWebhookSecret(source);
    
    const expectedSignature = createHmac('sha256', secret)
      .update(JSON.stringify(payload))
      .digest('hex');
    
    // Remove prefix if present (e.g., "sha256=")
    const cleanSignature = signature.replace(/^sha256=/, '');
    
    return timingSafeEqual(
      Buffer.from(expectedSignature, 'hex'),
      Buffer.from(cleanSignature, 'hex')
    );
  } catch (error) {
    console.error('Signature verification failed:', error);
    return false;
  }
}

function getWebhookSecret(source: string): string {
  // Mock secret retrieval - in real implementation, query from database
  const secrets: Record<string, string> = {
    'traffic_source_1': 'secret_key_123',
    'traffic_source_2': 'secret_key_456',
    'default': 'default_secret_key'
  };
  
  return secrets[source] || secrets['default'];
}

async function processIncomingWebhook(source: string, payload: any, headers: any) {
  try {
    const webhook_id = generateWebhookId();
    
    // Process based on source type
    let processResult;
    
    switch (source.toLowerCase()) {
      case 'conversion':
        processResult = await processConversionWebhook(payload);
        break;
      case 'click':
        processResult = await processClickWebhook(payload);
        break;
      case 'impression':
        processResult = await processImpressionWebhook(payload);
        break;
      default:
        processResult = await processGenericWebhook(payload);
    }
    
    // Log webhook processing
    console.log('Webhook processed:', {
      webhook_id,
      source,
      success: processResult.success,
      payload_keys: Object.keys(payload),
      timestamp: new Date().toISOString()
    });
    
    return {
      success: processResult.success,
      message: processResult.message,
      webhook_id,
      data: processResult.data
    };
    
  } catch (error) {
    return {
      success: false,
      message: 'Webhook processing failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      webhook_id: generateWebhookId()
    };
  }
}

async function processConversionWebhook(payload: any) {
  // Mock conversion processing
  if (!payload.tracking_id || !payload.conversion_value) {
    return {
      success: false,
      message: 'Missing required fields: tracking_id, conversion_value'
    };
  }
  
  return {
    success: true,
    message: 'Conversion webhook processed successfully',
    data: {
      tracking_id: payload.tracking_id,
      conversion_value: payload.conversion_value,
      processed_at: new Date().toISOString()
    }
  };
}

async function processClickWebhook(payload: any) {
  // Mock click processing
  return {
    success: true,
    message: 'Click webhook processed successfully',
    data: {
      click_id: payload.click_id || 'generated_click_id',
      processed_at: new Date().toISOString()
    }
  };
}

async function processImpressionWebhook(payload: any) {
  // Mock impression processing
  return {
    success: true,
    message: 'Impression webhook processed successfully',
    data: {
      impression_id: payload.impression_id || 'generated_impression_id',
      processed_at: new Date().toISOString()
    }
  };
}

async function processGenericWebhook(payload: any) {
  // Generic webhook processing
  return {
    success: true,
    message: 'Generic webhook processed successfully',
    data: {
      payload_size: JSON.stringify(payload).length,
      processed_at: new Date().toISOString()
    }
  };
}

function generateWebhookId(): string {
  return 'wh_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function generateSecret(): string {
  return createHash('sha256')
    .update(Date.now() + Math.random().toString())
    .digest('hex')
    .substr(0, 32);
}

function maskUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    return `${urlObj.protocol}//${urlObj.hostname}${urlObj.pathname}***`;
  } catch {
    return 'invalid_url';
  }
}

export default router;