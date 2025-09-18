import { Router, Request, Response } from 'express';
import { loggers } from '@xafra/shared/logger';
import { cache } from '@xafra/shared/cache';
import { prisma } from '@xafra/database';

const router = Router();

// Get customer details
router.get('/:customerId', async (req: Request, res: Response) => {
  const { customerId } = req.params;
  const { include_products = 'false', include_stats = 'false' } = req.query;

  try {
    const customer = await prisma.customer.findFirst({
      where: {
        id_customer: parseInt(customerId as string)
      },
      include: {
        ...(include_products === 'true' ? {
          products: {
            where: { status: 1 },
            select: {
              id: true,
              name: true,
              country: true,
              operator: true,
              url: true,
              status: true,
              creation_date: true
            }
          }
        } : {}),
        ...(include_stats === 'true' ? {
          authUsers: {
            select: {
              id: true,
              username: true,
              status: true,
              login_count: true,
              last_login: true
            }
          }
        } : {})
      }
    });

    if (!customer) {
      res.status(404).json({
        error: 'Customer not found',
        code: 'CUSTOMER_NOT_FOUND'
      });
      return;
    }

    const customerData: any = {
      id: customer.id,
      name: customer.name,
      status: customer.status,
      statusText: getCustomerStatusText(customer.status),
      plan: customer.plan || 'basic',
      createdAt: new Date(Number(customer.creation_date)).toISOString(),
      ...(customer.modification_date ? {
        modifiedAt: new Date(Number(customer.modification_date)).toISOString()
      } : {})
    };

    if (include_products === 'true' && customer.products) {
      customerData.products = customer.products.map(product => ({
        ...product,
        createdAt: new Date(Number(product.creation_date)).toISOString()
      }));
      customerData.totalProducts = customer.products.length;
    }

    if (include_stats === 'true' && customer.authUsers) {
      customerData.authUsers = customer.authUsers.map(user => ({
        ...user,
        lastLogin: user.last_login ? new Date(Number(user.last_login)).toISOString() : null
      }));
      customerData.totalApiKeys = customer.authUsers.length;
      customerData.activeApiKeys = customer.authUsers.filter(u => u.status === 1).length;
    }

    loggers.auth('customer_details_retrieved', null, customer.id, {
      includeProducts: include_products,
      includeStats: include_stats,
      ip: req.ip
    });

    res.json({
      success: true,
      data: customerData
    });

  } catch (error) {
    loggers.error('Customer details retrieval failed', error as Error, {
      customerId,
      ip: req.ip
    });

    res.status(500).json({
      error: 'Failed to retrieve customer details',
      code: 'CUSTOMER_DETAILS_ERROR'
    });
  }
});

// List all customers
router.get('/', async (req: Request, res: Response) => {
  const { 
    status,
    plan,
    limit = '50',
    offset = '0',
    sortBy = 'created_desc'
  } = req.query;

  try {
    // Build where clause
    const whereClause: any = {};
    
    if (status !== undefined) {
      whereClause.status = parseInt(status as string);
    }
    
    if (plan) {
      whereClause.plan = plan as string;
    }

    // Build order clause
    const orderBy: any = {};
    switch (sortBy) {
      case 'created_asc':
        orderBy.creation_date = 'asc';
        break;
      case 'created_desc':
        orderBy.creation_date = 'desc';
        break;
      case 'name_asc':
        orderBy.name = 'asc';
        break;
      case 'name_desc':
        orderBy.name = 'desc';
        break;
      default:
        orderBy.creation_date = 'desc';
    }

    const [customers, totalCount] = await Promise.all([
      prisma.customer.findMany({
        where: whereClause,
        include: {
          _count: {
            select: {
              products: { where: { status: 1 } },
              authUsers: { where: { status: 1 } }
            }
          }
        },
        orderBy,
        take: parseInt(limit as string),
        skip: parseInt(offset as string)
      }),
      prisma.customer.count({ where: whereClause })
    ]);

    const customerList = customers.map(customer => ({
      id: customer.id,
      name: customer.name,
      status: customer.status,
      statusText: getCustomerStatusText(customer.status),
      plan: customer.plan || 'basic',
      createdAt: new Date(Number(customer.creation_date)).toISOString(),
      stats: {
        totalProducts: customer._count.products,
        totalApiKeys: customer._count.authUsers
      }
    }));

    res.json({
      success: true,
      data: {
        totalCount,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        customers: customerList
      }
    });

  } catch (error) {
    loggers.error('Customer list retrieval failed', error as Error, {
      ip: req.ip
    });

    res.status(500).json({
      error: 'Failed to retrieve customers',
      code: 'CUSTOMER_LIST_ERROR'
    });
  }
});

// Update customer status
router.put('/:customerId/status', async (req: Request, res: Response) => {
  const { customerId } = req.params;
  const { status, reason } = req.body;

  try {
    // Validate status
    const validStatuses = [0, 1, 2]; // deleted, active, suspended
    if (!validStatuses.includes(status)) {
      res.status(400).json({
        error: 'Invalid status. Must be 0 (deleted), 1 (active), or 2 (suspended)',
        code: 'INVALID_STATUS'
      });
      return;
    }

    const customer = await prisma.customer.findFirst({
      where: {
        id: parseInt(customerId as string)
      }
    });

    if (!customer) {
      res.status(404).json({
        error: 'Customer not found',
        code: 'CUSTOMER_NOT_FOUND'
      });
      return;
    }

    const updatedCustomer = await prisma.customer.update({
      where: {
        id: customer.id
      },
      data: {
        status: status,
        modification_date: BigInt(Date.now())
      }
    });

    // If customer is deactivated, also deactivate their API keys
    if (status === 0 || status === 2) {
      await prisma.authUser.updateMany({
        where: {
          customer_id: customer.id
        },
        data: {
          status: status,
          modification_date: BigInt(Date.now())
        }
      });

      // Clear auth caches for this customer
      const authUsers = await prisma.authUser.findMany({
        where: { customer_id: customer.id },
        select: { apikey: true }
      });

      for (const authUser of authUsers) {
        await cache.del(`auth:login:${authUser.apikey}`);
      }
    }

    loggers.auth('customer_status_updated', null, customer.id, {
      oldStatus: customer.status,
      newStatus: status,
      reason: reason || null,
      affectedApiKeys: status === 0 || status === 2,
      ip: req.ip
    });

    res.json({
      success: true,
      data: {
        customerId: customer.id,
        customerName: customer.name,
        oldStatus: customer.status,
        newStatus: status,
        statusText: getCustomerStatusText(status),
        updatedAt: new Date(Number(updatedCustomer.modification_date || updatedCustomer.creation_date)).toISOString()
      }
    });

  } catch (error) {
    loggers.error('Customer status update failed', error as Error, {
      customerId,
      status,
      ip: req.ip
    });

    res.status(500).json({
      error: 'Failed to update customer status',
      code: 'CUSTOMER_STATUS_UPDATE_ERROR'
    });
  }
});

// Update customer plan
router.put('/:customerId/plan', async (req: Request, res: Response) => {
  const { customerId } = req.params;
  const { plan, reason } = req.body;

  try {
    const validPlans = ['basic', 'premium', 'enterprise'];
    if (!validPlans.includes(plan)) {
      res.status(400).json({
        error: 'Invalid plan. Must be basic, premium, or enterprise',
        code: 'INVALID_PLAN'
      });
      return;
    }

    const customer = await prisma.customer.findFirst({
      where: {
        id: parseInt(customerId as string)
      }
    });

    if (!customer) {
      res.status(404).json({
        error: 'Customer not found',
        code: 'CUSTOMER_NOT_FOUND'
      });
      return;
    }

    const updatedCustomer = await prisma.customer.update({
      where: {
        id: customer.id
      },
      data: {
        plan: plan,
        modification_date: BigInt(Date.now())
      }
    });

    loggers.auth('customer_plan_updated', null, customer.id, {
      oldPlan: customer.plan,
      newPlan: plan,
      reason: reason || null,
      ip: req.ip
    });

    res.json({
      success: true,
      data: {
        customerId: customer.id,
        customerName: customer.name,
        oldPlan: customer.plan,
        newPlan: plan,
        updatedAt: new Date(Number(updatedCustomer.modification_date || updatedCustomer.creation_date)).toISOString()
      }
    });

  } catch (error) {
    loggers.error('Customer plan update failed', error as Error, {
      customerId,
      plan,
      ip: req.ip
    });

    res.status(500).json({
      error: 'Failed to update customer plan',
      code: 'CUSTOMER_PLAN_UPDATE_ERROR'
    });
  }
});

// Get customer statistics
router.get('/:customerId/stats', async (req: Request, res: Response) => {
  const { customerId } = req.params;
  const { days = '30' } = req.query;

  try {
    const customer = await prisma.customer.findFirst({
      where: {
        id: parseInt(customerId as string)
      }
    });

    if (!customer) {
      res.status(404).json({
        error: 'Customer not found',
        code: 'CUSTOMER_NOT_FOUND'
      });
      return;
    }

    const daysAgo = parseInt(days as string);
    const startDate = BigInt(Date.now() - (daysAgo * 24 * 60 * 60 * 1000));

    // Get comprehensive stats
    const [
      totalProducts,
      activeProducts,
      totalApiKeys,
      activeApiKeys,
      totalCampaigns,
      activeCampaigns,
      recentTrackingCount,
      recentConversions
    ] = await Promise.all([
      prisma.product.count({
        where: { customer_id: customer.id }
      }),
      prisma.product.count({
        where: { customer_id: customer.id, status: 1 }
      }),
      prisma.authUser.count({
        where: { customer_id: customer.id }
      }),
      prisma.authUser.count({
        where: { customer_id: customer.id, status: 1 }
      }),
      prisma.campaign.count({
        where: { product: { customer_id: customer.id } }
      }),
      prisma.campaign.count({
        where: { product: { customer_id: customer.id }, status: 1 }
      }),
      prisma.tracking.count({
        where: {
          campaign: { product: { customer_id: customer.id } },
          creation_date: { gte: startDate }
        }
      }),
      prisma.confirm.count({
        where: {
          campaign: { product: { customer_id: customer.id } },
          creation_date: { gte: startDate },
          status: 1
        }
      })
    ]);

    const conversionRate = recentTrackingCount > 0 
      ? Math.round((recentConversions / recentTrackingCount) * 10000) / 100 
      : 0;

    const stats = {
      customerId: customer.id,
      customerName: customer.name,
      period: `${daysAgo} days`,
      products: {
        total: totalProducts,
        active: activeProducts,
        inactive: totalProducts - activeProducts
      },
      apiKeys: {
        total: totalApiKeys,
        active: activeApiKeys,
        inactive: totalApiKeys - activeApiKeys
      },
      campaigns: {
        total: totalCampaigns,
        active: activeCampaigns,
        inactive: totalCampaigns - activeCampaigns
      },
      performance: {
        totalClicks: recentTrackingCount,
        totalConversions: recentConversions,
        conversionRate: conversionRate,
        avgClicksPerDay: Math.round(recentTrackingCount / daysAgo),
        avgConversionsPerDay: Math.round(recentConversions / daysAgo)
      }
    };

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    loggers.error('Customer stats retrieval failed', error as Error, {
      customerId,
      ip: req.ip
    });

    res.status(500).json({
      error: 'Failed to retrieve customer statistics',
      code: 'CUSTOMER_STATS_ERROR'
    });
  }
});

// Helper function
function getCustomerStatusText(status: number): string {
  switch (status) {
    case 0: return 'deleted';
    case 1: return 'active';
    case 2: return 'suspended';
    default: return 'unknown';
  }
}

export default router;