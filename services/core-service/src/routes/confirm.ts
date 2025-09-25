import { Router, Request, Response } from 'express';
import { prisma } from '../utils/simple-database';
import { loggers } from '../utils/simple-logger';
import axios from 'axios';

const router = Router();

// Simple confirmation endpoint: GET /confirm/{apikey}/{tracking_or_short_tracking}
router.get('/:apikey/:tracking', async (req: Request, res: Response): Promise<void> => {
  try {
    const { apikey, tracking } = req.params;
    
    // Log the confirmation attempt
    loggers.tracking('confirmation_attempt', tracking, 0, {
      apikey: apikey.substring(0, 8) + '...',
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    // Validate API key format
    if (!apikey || apikey.length < 20) {
      res.status(400).json({
        success: false,
        error: 'Invalid API key format',
        code: 'INVALID_API_KEY'
      });
      return;
    }

    // Find campaign by tracking ID or short_tracking (for Kolbi)
    const campaign = await prisma.campaign.findFirst({
      where: {
        AND: [
          {
            OR: [
              { tracking: tracking },           // Normal tracking
              { short_tracking: tracking }      // Kolbi short tracking
            ]
          },
          {
            product: {
              customer: {
                authUsers: {
                  some: {
                    api_key: apikey
                  }
                }
              }
            }
          }
        ]
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
      loggers.security('campaign_not_found', req.ip || '0.0.0.0', {
        apikey: apikey.substring(0, 8) + '...',
        tracking: tracking
      });

      res.status(404).json({
        success: false,
        error: 'Campaign not found or access denied',
        tracking_id: tracking,
        code: 'CAMPAIGN_NOT_FOUND'
      });
      return;
    }

    // Check if already confirmed (status: 1=confirmed)
    if (campaign.status === 1) {
      loggers.tracking('campaign_already_confirmed', tracking, Number(campaign.id_product), {
        campaignId: Number(campaign.id),
        apikey: apikey.substring(0, 8) + '...'
      });

      res.status(200).json({
        success: true,
        message: 'Campaign already confirmed',
        data: {
          campaign_id: Number(campaign.id),
          tracking_id: campaign.tracking,
          short_tracking: campaign.short_tracking,
          status: 'already_confirmed',
          confirmed_at: campaign.modification_date,
          customer: campaign.product?.customer?.name || 'Unknown'
        }
      });
      return;
    }

    // Update campaign status to confirmed (status: 1)
    const updatedCampaign = await prisma.campaign.update({
      where: { id: campaign.id },
      data: {
        status: 1, // 1 = confirmed
        modification_date: new Date(),
        // Store confirmation details
        params: JSON.stringify({
          ...((campaign.params as any) || {}),
          confirmation: {
            confirmed_at: new Date().toISOString(),
            confirmation_method: 'simple_get',
            tracking_used: tracking,
            is_kolbi_short: campaign.short_tracking === tracking,
            ip_address: req.ip,
            user_agent: req.get('User-Agent')
          }
        })
      }
    });

    // Log successful confirmation
    loggers.tracking('conversion_confirmed', campaign.tracking || 'N/A', Number(campaign.id_product), {
      campaignId: Number(campaign.id),
      customerId: Number(campaign.product?.customer?.id_customer || 0),
      customerName: campaign.product?.customer?.name || 'Unknown',
      productId: Number(campaign.id_product),
      isKolbiShort: campaign.short_tracking === tracking,
      trackingUsed: tracking,
      originalTracking: campaign.tracking,
      shortTracking: campaign.short_tracking
    });

    // Trigger postback notifications asynchronously (don't wait for response)
    triggerPostbackNotifications(campaign, tracking).catch(error => {
      loggers.error('Postback notification failed', error, {
        campaignId: Number(campaign.id),
        trackingId: campaign.tracking
      });
    });

    // Return success response
    res.json({
      success: true,
      message: 'Conversion confirmed successfully',
      data: {
        campaign_id: Number(campaign.id),
        tracking_id: campaign.tracking,
        short_tracking: campaign.short_tracking,
        tracking_used: tracking,
        status: 'confirmed',
        confirmed_at: new Date().toISOString(),
        customer: campaign.product?.customer?.name || 'Unknown',
        product_id: Number(campaign.id_product),
        is_kolbi_confirmation: campaign.short_tracking === tracking
      }
    });

  } catch (error) {
    loggers.error('Confirmation failed', error, {
      apikey: req.params.apikey?.substring(0, 8) + '...',
      tracking: req.params.tracking,
      ip: req.ip
    });

    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'CONFIRMATION_ERROR',
      timestamp: new Date().toISOString()
    });
  }
});

// Helper function to trigger postback notifications
async function triggerPostbackNotifications(campaign: any, trackingUsed: string) {
  try {
    // Check if product has postback configuration
    const customer = campaign.product?.customer;
    const product = campaign.product;
    
    if (!customer || !product?.url_redirect_postback) {
      loggers.tracking('no_postback_url', 'N/A', 0, {
        customerId: Number(customer?.id_customer || 0),
        customerName: customer?.name || 'Unknown',
        productId: Number(product?.id_product || 0),
        productName: product?.name || 'Unknown'
      });
      return;
    }

    // Get postback service URL based on environment
    const postbackUrl = process.env.NODE_ENV === 'production' 
      ? process.env.POSTBACK_SERVICE_URL || 'https://postback-service-prod-xxx.a.run.app/api/postbacks/send'
      : process.env.NODE_ENV === 'staging'
      ? process.env.POSTBACK_SERVICE_URL || 'https://postback-service-stg-697203931362.us-central1.run.app/api/postbacks/send'
      : process.env.POSTBACK_SERVICE_URL || 'http://localhost:8080/api/postbacks/send';
    
    const postbackData = {
      campaign_id: Number(campaign.id),
      tracking_id: campaign.tracking,
      conversion_id: `conv_${Date.now()}_${Number(campaign.id)}`,
      webhook_url: product.url_redirect_postback,
      postback_parameters: {
        customer_id: Number(customer.id_customer),
        customer_name: customer.name,
        product_id: Number(product.id_product),
        product_name: product.name,
        original_tracking: campaign.tracking,
        short_tracking: campaign.short_tracking,
        tracking_used: trackingUsed,
        is_kolbi_confirmation: campaign.short_tracking === trackingUsed,
        confirmed_at: new Date().toISOString(),
        country: campaign.country || 'CR',
        operator: campaign.operator || 'KOLBI',
        method: product.method_postback || 'GET',
        body_template: product.body_postback
      },
      priority: 'high'
    };

    await axios.post(postbackUrl, postbackData, {
      timeout: 5000
    });

    // Update campaign with postback status
    await prisma.campaign.update({
      where: { id: campaign.id },
      data: {
        status_post_back: 1, // 1 = postback sent successfully
        date_post_back: new Date()
      }
    });

    loggers.tracking('postback_sent', campaign.tracking, Number(campaign.id_product), {
      campaignId: Number(campaign.id),
      customerId: Number(customer.id_customer),
      webhookUrl: product.url_redirect_postback?.substring(0, 30) + '...'
    });

  } catch (error) {
    // Update campaign with postback failure status
    await prisma.campaign.update({
      where: { id: campaign.id },
      data: {
        status_post_back: 2, // 2 = postback failed
        date_post_back: new Date()
      }
    });

    loggers.error('Failed to send postback notification', error, {
      campaignId: Number(campaign.id),
      customerId: Number(campaign.product?.customer?.id_customer || 0)
    });
    throw error;
  }
}

export default router;
