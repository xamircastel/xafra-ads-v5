import { Router, Request, Response } from 'express';
import cron from 'node-cron';
import axios from 'axios';

const router = Router();

// Mock retry queue - in real implementation, use Redis or database
const retryQueue: any[] = [];
const retryHistory: any[] = [];

// Add item to retry queue
router.post('/add', async (req: Request, res: Response) => {
  const {
    postback_id,
    campaign_id,
    tracking_id,
    webhook_url,
    payload,
    authentication,
    retry_config,
    priority = 'normal',
    max_attempts = 5
  } = req.body;

  try {
    if (!postback_id || !webhook_url || !payload) {
      res.status(400).json({
        error: 'Missing required fields: postback_id, webhook_url, payload',
        code: 'MISSING_REQUIRED_FIELDS'
      });
      return;
    }

    const retryItem = {
      id: generateRetryId(),
      postback_id,
      campaign_id,
      tracking_id,
      webhook_url,
      payload,
      authentication,
      retry_config: {
        initial_delay: 60000, // 1 minute
        backoff_multiplier: 2,
        max_delay: 3600000, // 1 hour
        max_attempts,
        ...retry_config
      },
      priority,
      attempt_count: 0,
      status: 'pending',
      created_at: new Date().toISOString(),
      next_retry_at: new Date(Date.now() + (retry_config?.initial_delay || 60000)).toISOString(),
      last_error: null,
      last_attempt_at: null
    };

    retryQueue.push(retryItem);

    console.log('Retry item added to queue:', {
      retry_id: retryItem.id,
      postback_id,
      webhook_url: maskUrl(webhook_url),
      next_retry_at: retryItem.next_retry_at,
      max_attempts
    });

    res.status(201).json({
      success: true,
      data: {
        retry_id: retryItem.id,
        postback_id,
        status: 'queued',
        next_retry_at: retryItem.next_retry_at,
        max_attempts,
        created_at: retryItem.created_at
      }
    });

  } catch (error) {
    console.error('Failed to add retry item:', error);

    res.status(500).json({
      error: 'Failed to add item to retry queue',
      code: 'RETRY_QUEUE_ADD_ERROR'
    });
  }
});

// Get retry queue status
router.get('/queue', async (req: Request, res: Response) => {
  const {
    status = 'all',
    priority,
    limit = '50',
    offset = '0'
  } = req.query;

  try {
    let filteredQueue = [...retryQueue];

    if (status !== 'all') {
      filteredQueue = filteredQueue.filter(item => item.status === status);
    }

    if (priority) {
      filteredQueue = filteredQueue.filter(item => item.priority === priority);
    }

    // Sort by next retry time
    filteredQueue.sort((a, b) => 
      new Date(a.next_retry_at).getTime() - new Date(b.next_retry_at).getTime()
    );

    // Apply pagination
    const startIndex = parseInt(offset as string);
    const endIndex = startIndex + parseInt(limit as string);
    const paginatedQueue = filteredQueue.slice(startIndex, endIndex);

    // Mask sensitive data
    const safeQueue = paginatedQueue.map(item => ({
      retry_id: item.id,
      postback_id: item.postback_id,
      campaign_id: item.campaign_id,
      tracking_id: item.tracking_id,
      webhook_url: maskUrl(item.webhook_url),
      status: item.status,
      priority: item.priority,
      attempt_count: item.attempt_count,
      max_attempts: item.retry_config.max_attempts,
      next_retry_at: item.next_retry_at,
      created_at: item.created_at,
      last_error: item.last_error,
      last_attempt_at: item.last_attempt_at
    }));

    const queueStats = {
      total_items: retryQueue.length,
      pending: retryQueue.filter(item => item.status === 'pending').length,
      processing: retryQueue.filter(item => item.status === 'processing').length,
      failed: retryQueue.filter(item => item.status === 'failed').length,
      completed: retryQueue.filter(item => item.status === 'completed').length
    };

    res.json({
      success: true,
      data: {
        queue_stats: queueStats,
        total_filtered: filteredQueue.length,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        queue_items: safeQueue
      }
    });

  } catch (error) {
    console.error('Failed to get retry queue:', error);

    res.status(500).json({
      error: 'Failed to retrieve retry queue',
      code: 'RETRY_QUEUE_GET_ERROR'
    });
  }
});

// Get retry item details
router.get('/item/:retry_id', async (req: Request, res: Response) => {
  const { retry_id } = req.params;

  try {
    const retryItem = retryQueue.find(item => item.id === retry_id);
    
    if (!retryItem) {
      res.status(404).json({
        error: 'Retry item not found',
        code: 'RETRY_ITEM_NOT_FOUND'
      });
      return;
    }

    // Get retry history for this item
    const itemHistory = retryHistory.filter(h => h.retry_id === retry_id);

    const itemDetails = {
      retry_id: retryItem.id,
      postback_id: retryItem.postback_id,
      campaign_id: retryItem.campaign_id,
      tracking_id: retryItem.tracking_id,
      webhook_url: maskUrl(retryItem.webhook_url),
      status: retryItem.status,
      priority: retryItem.priority,
      attempt_count: retryItem.attempt_count,
      max_attempts: retryItem.retry_config.max_attempts,
      next_retry_at: retryItem.next_retry_at,
      created_at: retryItem.created_at,
      last_error: retryItem.last_error,
      last_attempt_at: retryItem.last_attempt_at,
      retry_config: {
        initial_delay: retryItem.retry_config.initial_delay,
        backoff_multiplier: retryItem.retry_config.backoff_multiplier,
        max_delay: retryItem.retry_config.max_delay,
        max_attempts: retryItem.retry_config.max_attempts
      },
      history: itemHistory.map(h => ({
        attempt: h.attempt,
        timestamp: h.timestamp,
        success: h.success,
        response_status: h.response_status,
        response_time: h.response_time,
        error_message: h.error_message
      }))
    };

    res.json({
      success: true,
      data: itemDetails
    });

  } catch (error) {
    console.error('Failed to get retry item:', error);

    res.status(500).json({
      error: 'Failed to retrieve retry item',
      code: 'RETRY_ITEM_GET_ERROR'
    });
  }
});

// Cancel retry item
router.delete('/cancel/:retry_id', async (req: Request, res: Response) => {
  const { retry_id } = req.params;
  const { reason } = req.body;

  try {
    const itemIndex = retryQueue.findIndex(item => item.id === retry_id);
    
    if (itemIndex === -1) {
      res.status(404).json({
        error: 'Retry item not found',
        code: 'RETRY_ITEM_NOT_FOUND'
      });
      return;
    }

    const retryItem = retryQueue[itemIndex];
    
    // Remove from queue
    retryQueue.splice(itemIndex, 1);

    // Add to history
    retryHistory.push({
      retry_id,
      action: 'cancelled',
      reason: reason || 'Manual cancellation',
      cancelled_at: new Date().toISOString(),
      cancelled_after_attempts: retryItem.attempt_count
    });

    console.log('Retry item cancelled:', {
      retry_id,
      postback_id: retryItem.postback_id,
      attempt_count: retryItem.attempt_count,
      reason
    });

    res.json({
      success: true,
      data: {
        retry_id,
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        attempt_count: retryItem.attempt_count,
        reason: reason || 'Manual cancellation'
      }
    });

  } catch (error) {
    console.error('Failed to cancel retry item:', error);

    res.status(500).json({
      error: 'Failed to cancel retry item',
      code: 'RETRY_CANCEL_ERROR'
    });
  }
});

// Process retry queue manually
router.post('/process', async (req: Request, res: Response) => {
  const { 
    retry_id,
    force = false,
    max_items = 10
  } = req.body;

  try {
    let processedItems = [];

    if (retry_id) {
      // Process specific item
      const result = await processRetryItem(retry_id, force);
      processedItems.push(result);
    } else {
      // Process queue items that are ready
      const readyItems = retryQueue
        .filter(item => 
          item.status === 'pending' && 
          (force || new Date(item.next_retry_at) <= new Date())
        )
        .slice(0, max_items);

      for (const item of readyItems) {
        const result = await processRetryItem(item.id, force);
        processedItems.push(result);
      }
    }

    const successCount = processedItems.filter(item => item.success).length;
    const failureCount = processedItems.length - successCount;

    res.json({
      success: true,
      data: {
        processed_count: processedItems.length,
        successful: successCount,
        failed: failureCount,
        items: processedItems,
        processed_at: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Failed to process retry queue:', error);

    res.status(500).json({
      error: 'Failed to process retry queue',
      code: 'RETRY_PROCESS_ERROR'
    });
  }
});

// Get retry statistics
router.get('/stats', async (req: Request, res: Response) => {
  const { 
    period = '24h',
    group_by = 'status'
  } = req.query;

  try {
    const now = new Date();
    let startTime: Date;

    switch (period) {
      case '1h':
        startTime = new Date(now.getTime() - 3600000);
        break;
      case '24h':
        startTime = new Date(now.getTime() - 86400000);
        break;
      case '7d':
        startTime = new Date(now.getTime() - 604800000);
        break;
      default:
        startTime = new Date(now.getTime() - 86400000);
    }

    // Calculate stats from queue and history
    const queueStats = {
      current_queue_size: retryQueue.length,
      pending_items: retryQueue.filter(item => item.status === 'pending').length,
      processing_items: retryQueue.filter(item => item.status === 'processing').length,
      failed_items: retryQueue.filter(item => item.status === 'failed').length,
      completed_items: retryQueue.filter(item => item.status === 'completed').length
    };

    const priorityDistribution = {
      high: retryQueue.filter(item => item.priority === 'high').length,
      normal: retryQueue.filter(item => item.priority === 'normal').length,
      low: retryQueue.filter(item => item.priority === 'low').length
    };

    const attemptDistribution = {};
    retryQueue.forEach(item => {
      const attempts = item.attempt_count;
      attemptDistribution[`${attempts}_attempts`] = 
        (attemptDistribution[`${attempts}_attempts`] || 0) + 1;
    });

    res.json({
      success: true,
      data: {
        period,
        start_time: startTime.toISOString(),
        end_time: now.toISOString(),
        queue_stats: queueStats,
        priority_distribution: priorityDistribution,
        attempt_distribution: attemptDistribution,
        avg_retry_delay: calculateAverageRetryDelay(),
        success_rate: calculateRetrySuccessRate()
      }
    });

  } catch (error) {
    console.error('Failed to get retry stats:', error);

    res.status(500).json({
      error: 'Failed to retrieve retry statistics',
      code: 'RETRY_STATS_ERROR'
    });
  }
});

// Helper functions
function generateRetryId(): string {
  return 'retry_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function maskUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    return `${urlObj.protocol}//${urlObj.hostname}${urlObj.pathname}***`;
  } catch {
    return 'invalid_url';
  }
}

async function processRetryItem(retryId: string, force: boolean = false): Promise<any> {
  const itemIndex = retryQueue.findIndex(item => item.id === retryId);
  
  if (itemIndex === -1) {
    return {
      retry_id: retryId,
      success: false,
      error: 'Retry item not found'
    };
  }

  const retryItem = retryQueue[itemIndex];
  
  // Check if item is ready for retry
  if (!force && new Date(retryItem.next_retry_at) > new Date()) {
    return {
      retry_id: retryId,
      success: false,
      error: 'Item not ready for retry yet',
      next_retry_at: retryItem.next_retry_at
    };
  }

  // Check max attempts
  if (retryItem.attempt_count >= retryItem.retry_config.max_attempts) {
    retryItem.status = 'failed';
    return {
      retry_id: retryId,
      success: false,
      error: 'Maximum attempts exceeded',
      attempt_count: retryItem.attempt_count
    };
  }

  // Update status to processing
  retryItem.status = 'processing';
  retryItem.attempt_count++;
  retryItem.last_attempt_at = new Date().toISOString();

  try {
    // Attempt to send postback
    const startTime = Date.now();
    
    const headers: any = {
      'Content-Type': 'application/json',
      'User-Agent': 'Xafra-Postback-Service/1.0 (Retry)'
    };

    // Add authentication if provided
    if (retryItem.authentication) {
      if (retryItem.authentication.type === 'bearer') {
        headers['Authorization'] = `Bearer ${retryItem.authentication.token}`;
      } else if (retryItem.authentication.type === 'api_key') {
        headers['X-API-Key'] = retryItem.authentication.key;
      }
    }

    const response = await axios.post(retryItem.webhook_url, retryItem.payload, {
      headers,
      timeout: 30000,
      validateStatus: (status) => status >= 200 && status < 400
    });

    const responseTime = Date.now() - startTime;

    // Success - remove from queue
    retryQueue.splice(itemIndex, 1);
    
    // Add to history
    retryHistory.push({
      retry_id: retryId,
      attempt: retryItem.attempt_count,
      timestamp: new Date().toISOString(),
      success: true,
      response_status: response.status,
      response_time: responseTime,
      error_message: null
    });

    console.log('Retry item processed successfully:', {
      retry_id: retryId,
      attempt: retryItem.attempt_count,
      response_status: response.status,
      response_time: responseTime
    });

    return {
      retry_id: retryId,
      success: true,
      attempt_count: retryItem.attempt_count,
      response_status: response.status,
      response_time: responseTime
    };

  } catch (error: any) {
    const responseTime = Date.now() - Date.now();
    const errorMessage = error.response ? 
      `HTTP ${error.response.status}: ${error.response.statusText}` :
      error.message;

    // Update item with error
    retryItem.last_error = errorMessage;
    retryItem.status = 'pending';

    // Calculate next retry time
    const delay = Math.min(
      retryItem.retry_config.initial_delay * 
      Math.pow(retryItem.retry_config.backoff_multiplier, retryItem.attempt_count - 1),
      retryItem.retry_config.max_delay
    );
    
    retryItem.next_retry_at = new Date(Date.now() + delay).toISOString();

    // Add to history
    retryHistory.push({
      retry_id: retryId,
      attempt: retryItem.attempt_count,
      timestamp: new Date().toISOString(),
      success: false,
      response_status: error.response?.status || null,
      response_time: responseTime,
      error_message: errorMessage
    });

    console.log('Retry item failed:', {
      retry_id: retryId,
      attempt: retryItem.attempt_count,
      error: errorMessage,
      next_retry_at: retryItem.next_retry_at
    });

    return {
      retry_id: retryId,
      success: false,
      attempt_count: retryItem.attempt_count,
      error_message: errorMessage,
      next_retry_at: retryItem.next_retry_at
    };
  }
}

function calculateAverageRetryDelay(): number {
  if (retryQueue.length === 0) return 0;
  
  const totalDelay = retryQueue.reduce((sum, item) => {
    const delay = new Date(item.next_retry_at).getTime() - new Date(item.created_at).getTime();
    return sum + delay;
  }, 0);
  
  return Math.round(totalDelay / retryQueue.length / 1000); // Convert to seconds
}

function calculateRetrySuccessRate(): number {
  const totalAttempts = retryHistory.length;
  if (totalAttempts === 0) return 0;
  
  const successfulAttempts = retryHistory.filter(h => h.success).length;
  return Math.round((successfulAttempts / totalAttempts) * 10000) / 100;
}

// Start cron job for automatic retry processing
cron.schedule('*/1 * * * *', async () => {
  try {
    const readyItems = retryQueue.filter(item => 
      item.status === 'pending' && 
      new Date(item.next_retry_at) <= new Date()
    );

    if (readyItems.length > 0) {
      console.log(`Processing ${readyItems.length} ready retry items`);
      
      for (const item of readyItems.slice(0, 5)) { // Process max 5 items per minute
        await processRetryItem(item.id, false);
      }
    }
  } catch (error) {
    console.error('Cron retry processing failed:', error);
  }
});

export default router;