import { Router, Request, Response } from 'express';
import { prisma } from '../utils/simple-database';
import { loggers } from '../utils/simple-logger';
import { authenticate } from '../utils/simple-auth';
import { z } from 'zod';

const router = Router();

// Validation schemas
const SingleKolbiConfigSchema = z.object({
  original_tracking: z.string().min(1),
  short_tracking: z.string().min(4).max(10),
  enabled: z.boolean().default(true)
});

const BulkKolbiConfigSchema = z.object({
  configurations: z.array(SingleKolbiConfigSchema).min(1).max(100)
});

// Basic endpoint info
router.get('/', async (req: Request, res: Response) => {
  res.json({
    message: 'Kolbi Configuration endpoints for Costa Rica customers',
    service: 'core-service',
    endpoints: {
      'POST /config/xafra': 'Update short_tracking for single or multiple campaigns',
      'GET /config/tracking/:originalTracking': 'Get current short_tracking configuration'
    }
  });
});

// Get current configuration for a tracking ID
router.get('/tracking/:originalTracking', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const { originalTracking } = req.params;
    const apikey = req.headers['x-api-key'] as string;

    // Find campaign with correct Prisma syntax
    const campaign = await prisma.campaign.findFirst({
      where: {
        AND: [
          { tracking: originalTracking },
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
      return res.status(404).json({
        success: false,
        error: 'Campaign not found or access denied'
      });
    }

    res.json({
      success: true,
      data: {
        originalTracking: campaign.tracking,
        shortTracking: campaign.short_tracking,
        campaignId: Number(campaign.id),
        productId: campaign.id_product,
        enabled: campaign.short_tracking !== null
      }
    });

  } catch (error) {
    loggers.error('Get Kolbi configuration failed', error, {
      originalTracking: req.params.originalTracking,
      apikey: (req.headers['x-api-key'] as string)?.substring(0, 8) + '...',
      ip: req.ip
    });

    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

// Update short_tracking configuration (single or bulk)
router.post('/xafra', authenticate, async (req: Request, res: Response) => {
  try {
    const apikey = req.headers['x-api-key'] as string;

    // Check if it's a single configuration or bulk
    const isBulk = Array.isArray(req.body.configurations);
    
    if (isBulk) {
      // Bulk configuration
      const validation = BulkKolbiConfigSchema.safeParse(req.body);
      
      if (!validation.success) {
        return res.status(400).json({
          error: 'Invalid bulk configuration format',
          details: validation.error.errors
        });
      }

      const { configurations } = validation.data;
      const results = [];

      for (const config of configurations) {
        const { original_tracking, short_tracking, enabled } = config;

        try {
          // Find campaign with correct Prisma syntax
          const campaign = await prisma.campaign.findFirst({
            where: {
              AND: [
                { tracking: original_tracking },
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
            }
          });

          if (!campaign) {
            results.push({
              originalTracking: original_tracking,
              success: false,
              error: 'Campaign not found or access denied'
            });
            continue;
          }

          // Update campaign with DateTime instead of BigInt
          await prisma.campaign.update({
            where: { id: campaign.id },
            data: {
              short_tracking: enabled ? short_tracking : null,
              modification_date: new Date()
            }
          });

          results.push({
            originalTracking: original_tracking,
            shortTracking: enabled ? short_tracking : null,
            success: true,
            campaignId: Number(campaign.id)
          });

          loggers.tracking('bulk_kolbi_config', original_tracking, Number(campaign.id_product), {
            shortTracking: short_tracking,
            enabled
          });

        } catch (error) {
          results.push({
            originalTracking: config.original_tracking,
            success: false,
            error: 'Processing failed'
          });
        }
      }

      const successCount = results.filter(r => r.success).length;
      const totalCount = results.length;

      res.json({
        success: true,
        message: `Processed ${successCount}/${totalCount} configurations`,
        data: {
          results,
          summary: {
            total: totalCount,
            successful: successCount,
            failed: totalCount - successCount
          }
        }
      });

    } else {
      // Single configuration
      const validation = SingleKolbiConfigSchema.safeParse(req.body);
      
      if (!validation.success) {
        return res.status(400).json({
          error: 'Invalid configuration format',
          details: validation.error.errors
        });
      }

      const { original_tracking, short_tracking, enabled } = validation.data;

      // Find campaign with correct Prisma syntax
      const campaign = await prisma.campaign.findFirst({
        where: {
          AND: [
            { tracking: original_tracking },
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
        }
      });

      if (!campaign) {
        return res.status(404).json({
          success: false,
          error: 'Campaign not found or access denied'
        });
      }

      // Update campaign with DateTime instead of BigInt
      await prisma.campaign.update({
        where: { id: campaign.id },
        data: {
          short_tracking: enabled ? short_tracking : null,
          modification_date: new Date()
        }
      });

      loggers.tracking('kolbi_config', original_tracking, Number(campaign.id_product), {
        shortTracking: short_tracking,
        enabled
      });

      res.json({
        success: true,
        message: 'Configuration updated successfully',
        data: {
          originalTracking: original_tracking,
          shortTracking: enabled ? short_tracking : null,
          campaignId: Number(campaign.id),
          enabled
        }
      });
    }

  } catch (error) {
    loggers.error('Kolbi configuration failed', error, {
      apikey: (req.headers['x-api-key'] as string)?.substring(0, 8) + '...',
      body: req.body,
      ip: req.ip
    });

    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

export default router;
