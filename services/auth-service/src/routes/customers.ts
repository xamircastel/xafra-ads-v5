import { Router, Request, Response } from 'express';
import { loggers } from '../utils/simple-logger';
import { cache } from '../utils/simple-cache';
import { prisma } from '../utils/simple-database';

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
            select: {
              id_product: true,
              name: true,
              country: true,
              operator: true,
              reference: true
            }
          }
        } : {}),
        ...(include_stats === 'true' ? {
          authUsers: {
            select: {
              id_auth: true,
              user_name: true,
              status: true,
              creation_date: true
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
      id: customer.id_customer,
      name: customer.name,
      short_name: customer.short_name,
      mail: customer.mail,
      phone: customer.phone,
      country: customer.country,
      operator: customer.operator
    };

    if (include_products === 'true' && customer.products) {
      customerData.products = customer.products.map(product => ({
        id: product.id_product,
        name: product.name,
        country: product.country,
        operator: product.operator,
        reference: product.reference
      }));
      customerData.totalProducts = customer.products.length;
    }

    if (include_stats === 'true' && customer.authUsers) {
      customerData.authUsers = customer.authUsers.map(user => ({
        id: user.id_auth,
        username: user.user_name,
        status: user.status,
        createdAt: new Date(user.creation_date).toISOString()
      }));
      customerData.totalApiKeys = customer.authUsers.length;
      customerData.activeApiKeys = customer.authUsers.filter(u => u.status === 1).length;
    }

    loggers.auth('customer_details_retrieved', null, Number(customer.id_customer), {
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

// List customers with pagination
router.get('/', async (req: Request, res: Response) => {
  const { 
    limit = '20', 
    offset = '0', 
    country, 
    operator, 
    name,
    sort_by = 'name',
    sort_order = 'ASC' 
  } = req.query;

  try {
    let whereClause: any = {};

    if (country) whereClause.country = country;
    if (operator) whereClause.operator = operator;
    if (name) {
      whereClause.name = {
        contains: name as string,
        mode: 'insensitive'
      };
    }

    const orderBy: any = {};
    orderBy[sort_by as string] = sort_order.toString().toLowerCase();

    const [customers, totalCount] = await Promise.all([
      prisma.customer.findMany({
        where: whereClause,
        orderBy,
        take: parseInt(limit as string),
        skip: parseInt(offset as string)
      }),
      prisma.customer.count({ where: whereClause })
    ]);

    const customerList = customers.map(customer => ({
      id: customer.id_customer,
      name: customer.name,
      short_name: customer.short_name,
      mail: customer.mail,
      phone: customer.phone,
      country: customer.country,
      operator: customer.operator
    }));

    res.json({
      success: true,
      data: {
        customers: customerList,
        pagination: {
          total: totalCount,
          limit: parseInt(limit as string),
          offset: parseInt(offset as string),
          pages: Math.ceil(totalCount / parseInt(limit as string))
        }
      }
    });

  } catch (error) {
    loggers.error('Customer list retrieval failed', error as Error, {
      limit,
      offset,
      country,
      operator,
      ip: req.ip
    });

    res.status(500).json({
      error: 'Failed to retrieve customers',
      code: 'CUSTOMER_LIST_ERROR'
    });
  }
});

// Update customer status (simplified - schema doesn't have status field)
router.put('/:customerId/status', async (req: Request, res: Response) => {
  const { customerId } = req.params;
  const { status, reason } = req.body;

  try {
    const customer = await prisma.customer.findFirst({
      where: {
        id_customer: parseInt(customerId as string)
      }
    });

    if (!customer) {
      res.status(404).json({
        error: 'Customer not found',
        code: 'CUSTOMER_NOT_FOUND'
      });
      return;
    }

    // Note: Current schema doesn't have status field for customers
    // This would need schema migration to implement properly
    res.json({
      success: true,
      message: 'Status update not implemented - schema does not support customer status',
      data: {
        customerId: customer.id_customer,
        customerName: customer.name
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

// Update customer plan (simplified - schema doesn't have plan field)
router.put('/:customerId/plan', async (req: Request, res: Response) => {
  const { customerId } = req.params;
  const { plan, reason } = req.body;

  try {
    const customer = await prisma.customer.findFirst({
      where: {
        id_customer: parseInt(customerId as string)
      }
    });

    if (!customer) {
      res.status(404).json({
        error: 'Customer not found',
        code: 'CUSTOMER_NOT_FOUND'
      });
      return;
    }

    // Note: Current schema doesn't have plan field for customers
    res.json({
      success: true,
      message: 'Plan update not implemented - schema does not support customer plans',
      data: {
        customerId: customer.id_customer,
        customerName: customer.name
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

// Get customer statistics (simplified)
router.get('/:customerId/stats', async (req: Request, res: Response) => {
  const { customerId } = req.params;

  try {
    const customer = await prisma.customer.findFirst({
      where: {
        id_customer: parseInt(customerId as string)
      }
    });

    if (!customer) {
      res.status(404).json({
        error: 'Customer not found',
        code: 'CUSTOMER_NOT_FOUND'
      });
      return;
    }

    // Get basic counts
    const [totalProducts, activeProducts, totalCampaigns, totalAuthUsers] = await Promise.all([
      prisma.product.count({
        where: { 
          customer: {
            id_customer: customer.id_customer
          }
        }
      }),
      prisma.product.count({
        where: { 
          customer: {
            id_customer: customer.id_customer
          },
          active: 1
        }
      }),
      prisma.campaign.count({
        where: {
          product: {
            customer: {
              id_customer: customer.id_customer
            }
          }
        }
      }),
      prisma.authUser.count({
        where: { customer_id: customer.id_customer }
      })
    ]);

    loggers.auth('customer_stats_retrieved', null, Number(customer.id_customer), {
      customerId: customer.id_customer,
      ip: req.ip
    });

    res.json({
      success: true,
      data: {
        customerId: customer.id_customer,
        customerName: customer.name,
        totalProducts,
        activeProducts,
        totalCampaigns,
        totalAuthUsers
      }
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

export default router;