// Simple utilities to replace @xafra/shared dependencies

export function generateTrackingId(prefix?: string): string {
  const randomPart = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  return prefix ? `${prefix}_${randomPart}` : randomPart;
}

export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export function getServiceUrls() {
  return {
    coreService: process.env.CORE_SERVICE_URL || 'http://localhost:8080',
    authService: process.env.AUTH_SERVICE_URL || 'http://localhost:8081',
    trackingService: process.env.TRACKING_SERVICE_URL || 'http://localhost:8082',
    campaignService: process.env.CAMPAIGN_SERVICE_URL || 'http://localhost:8083',
    postbackService: process.env.POSTBACK_SERVICE_URL || 'http://localhost:8084'
  };
}