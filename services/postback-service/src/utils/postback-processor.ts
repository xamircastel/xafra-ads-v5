import axios from 'axios';

// Postback processing utilities
export class PostbackProcessor {
  
  // Process dynamic URL with placeholders
  static processWebhookUrl(url: string, trackingId: string): string {
    if (!url) return '';
    
    // Replace tracking placeholders (handle typo variant too)
    let processedUrl = url.replace(/<TRAKING>/g, trackingId);
    processedUrl = processedUrl.replace(/<TRACKING>/g, trackingId);
    
    return processedUrl;
  }

  // Process body template with placeholders
  static processBodyTemplate(template: string | null, trackingId: string, parameters: any = {}): any {
    if (!template) return parameters;

    try {
      // Replace tracking placeholders in template
      let processedTemplate = template.replace(/<TRAKING>/g, trackingId);
      processedTemplate = processedTemplate.replace(/<TRACKING>/g, trackingId);
      
      // Parse JSON template
      const templateData = JSON.parse(processedTemplate);
      
      // Merge with additional parameters
      return { ...templateData, ...parameters };
    } catch (error) {
      console.error('Failed to process body template:', error);
      return parameters;
    }
  }

  // Send HTTP postback
  static async sendPostback(config: {
    url: string;
    method: 'GET' | 'POST';
    data?: any;
    timeout?: number;
  }): Promise<{
    success: boolean;
    responseTime: number;
    statusCode?: number;
    error?: string;
  }> {
    const startTime = Date.now();
    
    try {
      const { url, method, data, timeout = 30000 } = config;
      
      const headers: any = {
        'User-Agent': 'Xafra-Postback-Service/1.0',
        'Accept': '*/*'
      };

      // Log the outgoing request details
      console.log(`🔄 Preparing ${method} request to: ${PostbackProcessor.maskUrl(url)}`);
      console.log(`📤 Request method: ${method}`);
      console.log(`⏱️  Request timeout: ${timeout}ms`);

      let response;
      let finalUrl = url;
      
      if (method.toUpperCase() === 'GET') {
        // For GET requests, append data as query parameters
        if (data && typeof data === 'object') {
          const params = new URLSearchParams();
          Object.entries(data).forEach(([key, value]) => {
            if (value !== null && value !== undefined) {
              params.append(key, String(value));
            }
          });
          
          const separator = url.includes('?') ? '&' : '?';
          finalUrl = `${url}${separator}${params.toString()}`;
        }
        
        console.log(`🌐 Final GET URL: ${PostbackProcessor.maskUrl(finalUrl)}`);
        console.log(`📋 Query parameters: ${data ? JSON.stringify(data, null, 2) : 'none'}`);
        console.log(`📨 Request headers:`, headers);
        
        response = await axios.get(finalUrl, {
          headers,
          timeout,
          validateStatus: () => true // Accept any status for analysis
        });
      } else {
        // For POST requests, send data in body
        headers['Content-Type'] = 'application/json';
        
        console.log(`🌐 POST URL: ${PostbackProcessor.maskUrl(finalUrl)}`);
        console.log(`📋 POST body: ${JSON.stringify(data || {}, null, 2)}`);
        console.log(`📨 Request headers:`, headers);
        
        response = await axios.post(url, data || {}, {
          headers,
          timeout,
          validateStatus: () => true // Accept any status for analysis
        });
      }

      const responseTime = Date.now() - startTime;
      const success = response.status >= 200 && response.status < 400;

      // Log the response details
      console.log(`📥 Response received:`, {
        status: response.status,
        statusText: response.statusText,
        success,
        responseTime: `${responseTime}ms`,
        headers: response.headers,
        dataSize: response.data ? JSON.stringify(response.data).length : 0
      });

      if (success) {
        console.log(`✅ Postback request successful: HTTP ${response.status} in ${responseTime}ms`);
      } else {
        console.log(`❌ Postback request failed: HTTP ${response.status} ${response.statusText} in ${responseTime}ms`);
        if (response.data) {
          console.log(`📄 Error response body:`, response.data);
        }
      }

      return {
        success,
        responseTime,
        statusCode: response.status,
        error: success ? undefined : `HTTP ${response.status}: ${response.statusText}`
      };

    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      
      let errorMessage = 'Unknown error';
      let errorDetails = {};
      
      if (error.code === 'ECONNABORTED') {
        errorMessage = 'Request timeout';
        errorDetails = { code: error.code, timeout: `${config.timeout || 30000}ms` };
      } else if (error.code === 'ECONNREFUSED') {
        errorMessage = 'Connection refused';
        errorDetails = { code: error.code, address: error.address, port: error.port };
      } else if (error.code === 'ENOTFOUND') {
        errorMessage = 'Domain not found';
        errorDetails = { code: error.code, hostname: error.hostname };
      } else if (error.response) {
        errorMessage = `HTTP ${error.response.status}: ${error.response.statusText}`;
        errorDetails = {
          status: error.response.status,
          statusText: error.response.statusText,
          headers: error.response.headers,
          data: error.response.data
        };
      } else if (error.message) {
        errorMessage = error.message;
        errorDetails = { message: error.message, stack: error.stack };
      }

      // Log the error details
      console.log(`💥 Postback request failed with error:`, {
        error: errorMessage,
        responseTime: `${responseTime}ms`,
        details: errorDetails
      });

      return {
        success: false,
        responseTime,
        error: errorMessage
      };
    }
  }

  // Calculate retry delay with exponential backoff
  static calculateRetryDelay(attemptCount: number, baseDelay: number = 60000): number {
    const maxDelay = 3600000; // 1 hour max
    const backoffMultiplier = 2;
    
    const delay = Math.min(
      baseDelay * Math.pow(backoffMultiplier, attemptCount - 1),
      maxDelay
    );
    
    // Add some jitter to prevent thundering herd
    const jitter = Math.random() * 0.1 * delay;
    return Math.floor(delay + jitter);
  }

  // Validate webhook URL
  static validateWebhookUrl(url: string): { valid: boolean; error?: string } {
    if (!url || typeof url !== 'string') {
      return { valid: false, error: 'URL is required' };
    }

    try {
      const urlObj = new URL(url);
      
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        return { valid: false, error: 'URL must use HTTP or HTTPS protocol' };
      }

      if (!urlObj.hostname) {
        return { valid: false, error: 'URL must have a valid hostname' };
      }

      return { valid: true };
    } catch (error) {
      return { valid: false, error: 'Invalid URL format' };
    }
  }

  // Mask sensitive URL for logging
  static maskUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      return `${urlObj.protocol}//${urlObj.hostname}${urlObj.pathname}***`;
    } catch {
      return url.substring(0, 50) + '***';
    }
  }

  // Generate unique conversion ID
  static generateConversionId(campaignId: number, trackingId: string): string {
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    return `conv_${timestamp}_${campaignId}_${randomSuffix}`;
  }
}

// Interface definitions
export interface PostbackRequest {
  campaign_id: number;
  tracking_id: string;
  conversion_id?: string;
  webhook_url: string;
  postback_parameters: {
    customer_id: number;
    customer_name: string;
    product_id: number;
    product_name: string;
    original_tracking: string;
    short_tracking?: string;
    tracking_used: string;
    is_kolbi_confirmation: boolean;
    confirmed_at: string;
    country?: string;
    operator?: string;
    method?: string;
    body_template?: string;
  };
  priority?: 'low' | 'normal' | 'high';
}

export interface PostbackResponse {
  success: boolean;
  data: {
    campaign_id: number;
    tracking_id: string;
    conversion_id: string;
    webhook_url: string;
    response_time: number;
    response_status?: number;
    timestamp: string;
    error_message?: string;
    retry_scheduled?: boolean;
    next_retry?: string;
  };
}