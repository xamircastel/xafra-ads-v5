import { PrismaClient } from '@prisma/client';

// Database utility for multi-schema support
class DatabaseService {
  private prisma: PrismaClient;
  private currentSchema: string;

  constructor() {
    this.currentSchema = this.getSchemaForEnvironment();
    this.prisma = new PrismaClient();
  }

  private getSchemaForEnvironment(): string {
    switch (process.env.NODE_ENV) {
      case 'production':
        return 'production';
      case 'staging':
        return 'staging';
      default:
        return 'public';
    }
  }

  // Execute raw query with current schema
  async executeQuery(query: string, params: any[] = []) {
    const schemaQuery = query.replace(/\{schema\}/g, this.currentSchema);
    return await this.prisma.$queryRawUnsafe(schemaQuery, ...params);
  }

  // Get campaign with related data
  async getCampaignWithProduct(campaignId: number) {
    return await this.executeQuery(`
      SELECT 
        c.*,
        p.url_redirect_postback,
        p.method_postback,
        p.body_postback,
        p.name as product_name,
        cu.name as customer_name,
        cu.id_customer
      FROM {schema}.campaign c
      LEFT JOIN {schema}.products p ON c.id_product = p.id_product
      LEFT JOIN {schema}.customers cu ON p.id_customer = cu.id_customer
      WHERE c.id = $1
    `, [campaignId]);
  }

  // Update campaign postback status
  async updateCampaignPostbackStatus(campaignId: number, status: number, error?: string) {
    return await this.executeQuery(`
      UPDATE {schema}.campaign 
      SET 
        status_post_back = $1,
        date_post_back = NOW(),
        modification_date = NOW()
      WHERE id = $2
    `, [status, campaignId]);
  }

  // Log postback attempt
  async logPostbackAttempt(data: {
    campaign_id: number;
    tracking_id: string;
    webhook_url: string;
    success: boolean;
    response_time: number;
    response_status?: number;
    error_message?: string;
  }) {
    try {
      return await this.executeQuery(`
        INSERT INTO {schema}.postback_logs (
          campaign_id,
          tracking_id,
          webhook_url,
          success,
          response_time,
          response_status,
          error_message,
          created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      `, [
        data.campaign_id,
        data.tracking_id,
        data.webhook_url.substring(0, 500), // Truncate long URLs
        data.success,
        data.response_time,
        data.response_status || null,
        data.error_message || null
      ]);
    } catch (error) {
      // If postback_logs table doesn't exist, just log to console
      console.log('Postback attempt (table not found):', data);
    }
  }

  // Health check
  async healthCheck() {
    try {
      const result = await this.prisma.$queryRaw`SELECT 1 as health`;
      return {
        status: 'healthy',
        schema: this.currentSchema,
        connection: 'active'
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        schema: this.currentSchema,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async disconnect() {
    await this.prisma.$disconnect();
  }
}

export const dbService = new DatabaseService();