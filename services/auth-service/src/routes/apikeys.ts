import { Router, Request, Response } from 'express';
import { loggers } from '@xafra/shared/logger';
import { cache } from '@xafra/shared/cache';
import { prisma } from '@xafra/database';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

const router = Router();

// Helper function to handle BigInt serialization
function serializeBigInt(obj: any): any {
  return JSON.parse(JSON.stringify(obj, (key, value) =>
    typeof value === 'bigint' ? value.toString() : value
  ));
}

// Generate new API key for a customer
router.post('/generate', async (req: Request, res: Response) => {
  const { 
    customer_id, 
    username, 
    password, 
    description = '',
    expires_in_days = 365,
    permissions = []
  } = req.body;

  try {
    if (!customer_id) {
      res.status(400).json({
        error: 'customer_id is required',
        code: 'MISSING_CUSTOMER_ID'
      });
      return;
    }

    // Verify customer exists
    const customer = await prisma.customer.findFirst({
      where: {
        id_customer: customer_id
      }
    });

    if (!customer) {
      res.status(404).json({
        error: 'Customer not found',
        code: 'CUSTOMER_NOT_FOUND'
      });
      return;
    }

    // Generate API key
    const apikey = generateApiKey();
    const hashedPassword = password ? await hashPassword(password) : null;
    
    const expirationDate = expires_in_days > 0 
      ? BigInt(Date.now() + (expires_in_days * 24 * 60 * 60 * 1000))
      : null;

    // Create auth user with all fields including customer_id
    const authUser = await prisma.authUser.create({
      data: {
        user_name: customer.name?.substring(0, 50) || `customer_${customer_id}`,
        api_key: apikey,
        shared_key: `cust_${customer_id}`, // Store customer_id reference here temporarily
        active: 1,
        creation_date: new Date(),
        customer_id: customer_id, // ¡CAMPO CRÍTICO! - Asociar con el customer
        password: hashedPassword,
        status: 1,
        expiration_date: expires_in_days === 0 ? null : BigInt(Date.now() + (expires_in_days * 24 * 60 * 60 * 1000)),
        description: description || null,
        permissions: Array.isArray(permissions) ? JSON.stringify(permissions) : (permissions || null),
        login_count: 0,
        last_login: null,
        modification_date: new Date()
      }
    });

    loggers.auth('apikey_generated', apikey.substring(0, 8) + '...', customer_id, {
      authUserId: authUser.id_auth,
      username: authUser.user_name,
      customerName: customer.name,
      ip: req.ip
    });

    const responseData = {
      success: true,
      data: {
        authUserId: authUser.id_auth,
        apikey: apikey,
        username: authUser.user_name,
        customerId: customer_id,
        customerName: customer.name,
        status: 'active',
        expirationDate: expires_in_days === 0 ? null : `${expires_in_days} days from creation`,
        description: description,
        permissions: permissions,
        createdAt: authUser.creation_date?.toISOString() || new Date().toISOString(),
        note: "Using simplified schema - some fields stored separately"
      }
    };

    res.status(201).json(serializeBigInt(responseData));

  } catch (error) {
    loggers.error('API key generation failed', error as Error, {
      customerId: customer_id,
      username,
      ip: req.ip
    });

    res.status(500).json({
      error: 'API key generation failed',
      code: 'GENERATION_ERROR'
    });
  }
});

// List API keys for a customer
router.get('/customer/:customerId', async (req: Request, res: Response) => {
  const { customerId } = req.params;
  const { 
    status,
    include_expired = 'false',
    limit = '50',
    offset = '0'
  } = req.query;

  try {
    // Build where clause
    const whereClause: any = {
      customer_id: parseInt(customerId as string)
    };

    if (status !== undefined) {
      whereClause.status = parseInt(status as string);
    }

    if (include_expired === 'false') {
      whereClause.OR = [
        { expiration_date: null },
        { expiration_date: { gte: BigInt(Date.now()) } }
      ];
    }

    // Get API keys
    const authUsers = await prisma.authUser.findMany({
      where: whereClause,
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            status: true
          }
        }
      },
      orderBy: {
        creation_date: 'desc'
      },
      take: parseInt(limit as string),
      skip: parseInt(offset as string)
    });

    // Get total count
    const totalCount = await prisma.authUser.count({
      where: whereClause
    });

    const apiKeys = authUsers.map(user => ({
      authUserId: user.id,
      username: user.username,
      apikey: user.apikey.substring(0, 8) + '...' + user.apikey.substring(-4), // Masked
      status: user.status,
      statusText: getStatusText(user.status),
      description: user.description,
      permissions: user.permissions ? user.permissions.split(',') : [],
      createdAt: new Date(Number(user.creation_date)).toISOString(),
      expirationDate: user.expiration_date ? new Date(Number(user.expiration_date)).toISOString() : null,
      lastLogin: user.last_login ? new Date(Number(user.last_login)).toISOString() : null,
      loginCount: user.login_count || 0,
      customer: user.customer
    }));

    res.json({
      success: true,
      data: {
        customerId: parseInt(customerId as string),
        totalCount,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        apiKeys
      }
    });

  } catch (error) {
    loggers.error('API keys list failed', error as Error, {
      customerId,
      ip: req.ip
    });

    res.status(500).json({
      error: 'Failed to retrieve API keys',
      code: 'LIST_ERROR'
    });
  }
});

// Get API key details
router.get('/:apikey', async (req: Request, res: Response) => {
  const { apikey } = req.params;
  const { include_customer = 'true' } = req.query;

  try {
    const authUser = await prisma.authUser.findFirst({
      where: {
        apikey: apikey
      },
      include: {
        customer: include_customer === 'true' ? {
          select: {
            id: true,
            name: true,
            status: true,
            plan: true,
            creation_date: true
          }
        } : false
      }
    });

    if (!authUser) {
      res.status(404).json({
        error: 'API key not found',
        code: 'APIKEY_NOT_FOUND'
      });
      return;
    }

    const apiKeyDetails = {
      authUserId: authUser.id,
      username: authUser.username,
      apikey: apikey, // Full key since this is an authorized request
      status: authUser.status,
      statusText: getStatusText(authUser.status),
      description: authUser.description,
      permissions: authUser.permissions ? authUser.permissions.split(',') : [],
      createdAt: new Date(Number(authUser.creation_date)).toISOString(),
      expirationDate: authUser.expiration_date ? new Date(Number(authUser.expiration_date)).toISOString() : null,
      lastLogin: authUser.last_login ? new Date(Number(authUser.last_login)).toISOString() : null,
      loginCount: authUser.login_count || 0,
      isExpired: authUser.expiration_date ? BigInt(Date.now()) > authUser.expiration_date : false,
      ...(include_customer === 'true' && authUser.customer ? {
        customer: authUser.customer
      } : {})
    };

    loggers.auth('apikey_details_retrieved', apikey.substring(0, 8) + '...', authUser.customer_id, {
      authUserId: authUser.id,
      ip: req.ip
    });

    res.json({
      success: true,
      data: apiKeyDetails
    });

  } catch (error) {
    loggers.error('API key details retrieval failed', error as Error, {
      apikey: apikey?.substring(0, 8) + '...',
      ip: req.ip
    });

    res.status(500).json({
      error: 'Failed to retrieve API key details',
      code: 'DETAILS_ERROR'
    });
  }
});

// Update API key status
router.put('/:apikey/status', async (req: Request, res: Response) => {
  const { apikey } = req.params;
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

    const authUser = await prisma.authUser.findFirst({
      where: {
        apikey: apikey
      }
    });

    if (!authUser) {
      res.status(404).json({
        error: 'API key not found',
        code: 'APIKEY_NOT_FOUND'
      });
      return;
    }

    const updatedAuthUser = await prisma.authUser.update({
      where: {
        id: authUser.id
      },
      data: {
        status: status,
        modification_date: BigInt(Date.now())
      }
    });

    // Clear cache
    const cacheKey = `auth:login:${apikey}`;
    await cache.del(cacheKey);

    loggers.auth('apikey_status_updated', apikey.substring(0, 8) + '...', authUser.customer_id, {
      authUserId: authUser.id,
      oldStatus: authUser.status,
      newStatus: status,
      reason: reason || null,
      ip: req.ip
    });

    res.json({
      success: true,
      data: {
        authUserId: authUser.id,
        apikey: apikey.substring(0, 8) + '...' + apikey.substring(-4),
        oldStatus: authUser.status,
        newStatus: status,
        statusText: getStatusText(status),
        updatedAt: new Date(Number(updatedAuthUser.modification_date || updatedAuthUser.creation_date)).toISOString()
      }
    });

  } catch (error) {
    loggers.error('API key status update failed', error as Error, {
      apikey: apikey?.substring(0, 8) + '...',
      status,
      ip: req.ip
    });

    res.status(500).json({
      error: 'Failed to update API key status',
      code: 'STATUS_UPDATE_ERROR'
    });
  }
});

// Regenerate API key
router.post('/:apikey/regenerate', async (req: Request, res: Response) => {
  const { apikey } = req.params;
  const { keep_old_key_hours = 0 } = req.body;

  try {
    const authUser = await prisma.authUser.findFirst({
      where: {
        apikey: apikey
      },
      include: {
        customer: true
      }
    });

    if (!authUser) {
      res.status(404).json({
        error: 'API key not found',
        code: 'APIKEY_NOT_FOUND'
      });
      return;
    }

    // Generate new API key
    const newApikey = generateApiKey();

    const updatedAuthUser = await prisma.authUser.update({
      where: {
        id: authUser.id
      },
      data: {
        apikey: newApikey,
        modification_date: BigInt(Date.now())
      }
    });

    // Clear old cache
    await cache.del(`auth:login:${apikey}`);

    loggers.auth('apikey_regenerated', newApikey.substring(0, 8) + '...', authUser.customer_id, {
      authUserId: authUser.id,
      oldApikey: apikey.substring(0, 8) + '...',
      newApikey: newApikey.substring(0, 8) + '...',
      ip: req.ip
    });

    res.json({
      success: true,
      data: {
        authUserId: authUser.id,
        newApikey: newApikey,
        oldApikey: apikey.substring(0, 8) + '...' + apikey.substring(-4),
        regeneratedAt: new Date(Number(updatedAuthUser.modification_date || updatedAuthUser.creation_date)).toISOString(),
        message: 'API key regenerated successfully. Update your applications to use the new key.'
      }
    });

  } catch (error) {
    loggers.error('API key regeneration failed', error as Error, {
      apikey: apikey?.substring(0, 8) + '...',
      ip: req.ip
    });

    res.status(500).json({
      error: 'Failed to regenerate API key',
      code: 'REGENERATION_ERROR'
    });
  }
});

// Helper functions
function generateApiKey(): string {
  const prefix = 'xafra_';
  const timestamp = Date.now().toString(36);
  const randomBytes = crypto.randomBytes(16).toString('hex');
  return prefix + timestamp + '_' + randomBytes;
}

async function hashPassword(password: string): Promise<string> {
  const bcrypt = require('bcryptjs');
  return await bcrypt.hash(password, 12);
}

function getStatusText(status: number): string {
  switch (status) {
    case 0: return 'deleted';
    case 1: return 'active';
    case 2: return 'suspended';
    default: return 'unknown';
  }
}

export default router;