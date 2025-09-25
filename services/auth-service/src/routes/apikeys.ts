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
        shared_key: `cust_${customer_id}`,
        active: 1,
        creation_date: new Date(),
        customer_id: customer_id,
        password: hashedPassword,
        status: 1,
        expiration_date: expires_in_days === 0 ? null : new Date(Date.now() + (expires_in_days * 24 * 60 * 60 * 1000)),
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
      authUserId: user.id_auth,
      username: user.user_name,
      apikey: user.api_key.substring(0, 8) + '...' + user.api_key.substring(-4), // Masked
      status: user.status,
      statusText: getStatusText(user.status),
      description: user.description,
      permissions: user.permissions ? user.permissions.split(',') : [],
      createdAt: new Date(Number(user.creation_date)).toISOString(),
      expirationDate: user.expiration_date ? new Date(Number(user.expiration_date)).toISOString() : null,
      lastLogin: user.last_login ? new Date(Number(user.last_login)).toISOString() : null,
      loginCount: user.login_count || 0
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
      error: 'API keys list failed',
      code: 'LIST_ERROR'
    });
  }
});

// Get details of a specific API key
router.get('/details/:apikey', async (req: Request, res: Response) => {
  const { apikey } = req.params;

  try {
    const authUser = await prisma.authUser.findFirst({
      where: {
        api_key: apikey
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
      authUserId: authUser.id_auth,
      username: authUser.user_name,
      apikey: apikey, // Full key since this is an authorized request
      status: authUser.status,
      statusText: getStatusText(authUser.status),
      description: authUser.description,
      permissions: authUser.permissions ? authUser.permissions.split(',') : [],
      createdAt: new Date(Number(authUser.creation_date)).toISOString(),
      expirationDate: authUser.expiration_date ? new Date(Number(authUser.expiration_date)).toISOString() : null,
      lastLogin: authUser.last_login ? new Date(Number(authUser.last_login)).toISOString() : null,
      loginCount: authUser.login_count || 0,
      isExpired: authUser.expiration_date ? new Date() > authUser.expiration_date : false
    };

    loggers.auth('apikey_details_retrieved', apikey.substring(0, 8) + '...', Number(authUser.customer_id), {
      authUserId: authUser.id_auth,
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
      error: 'API key details retrieval failed',
      code: 'DETAILS_ERROR'
    });
  }
});

// Update API key status (enable/disable)
router.patch('/status/:apikey', async (req: Request, res: Response) => {
  const { apikey } = req.params;
  const { status } = req.body;

  try {
    if (status === undefined) {
      res.status(400).json({
        error: 'Status is required',
        code: 'MISSING_STATUS'
      });
      return;
    }

    const authUser = await prisma.authUser.findFirst({
      where: {
        api_key: apikey
      }
    });

    if (!authUser) {
      res.status(404).json({
        error: 'API key not found',
        code: 'APIKEY_NOT_FOUND'
      });
      return;
    }

    await prisma.authUser.update({
      where: {
        id_auth: authUser.id_auth
      },
      data: {
        status: parseInt(status as string),
        modification_date: new Date()
      }
    });

    loggers.auth('apikey_status_updated', apikey.substring(0, 8) + '...', Number(authUser.customer_id), {
      authUserId: authUser.id_auth,
      oldStatus: authUser.status,
      newStatus: parseInt(status as string),
      ip: req.ip
    });

    res.json({
      success: true,
      data: {
        authUserId: authUser.id_auth,
        apikey: apikey.substring(0, 8) + '...',
        oldStatus: authUser.status,
        newStatus: parseInt(status as string),
        statusText: getStatusText(parseInt(status as string))
      }
    });

  } catch (error) {
    loggers.error('API key status update failed', error as Error, {
      apikey: apikey?.substring(0, 8) + '...',
      status,
      ip: req.ip
    });

    res.status(500).json({
      error: 'API key status update failed',
      code: 'STATUS_UPDATE_ERROR'
    });
  }
});

// Regenerate API key
router.post('/regenerate/:apikey', async (req: Request, res: Response) => {
  const { apikey } = req.params;

  try {
    const authUser = await prisma.authUser.findFirst({
      where: {
        api_key: apikey
      }
    });

    if (!authUser) {
      res.status(404).json({
        error: 'API key not found',
        code: 'APIKEY_NOT_FOUND'
      });
      return;
    }

    const newApikey = generateApiKey();

    await prisma.authUser.update({
      where: {
        id_auth: authUser.id_auth
      },
      data: {
        api_key: newApikey,
        modification_date: new Date()
      }
    });

    loggers.auth('apikey_regenerated', newApikey.substring(0, 8) + '...', Number(authUser.customer_id), {
      authUserId: authUser.id_auth,
      oldApikey: apikey.substring(0, 8) + '...',
      ip: req.ip
    });

    res.json({
      success: true,
      data: {
        authUserId: authUser.id_auth,
        oldApikey: apikey.substring(0, 8) + '...',
        newApikey: newApikey
      }
    });

  } catch (error) {
    loggers.error('API key regeneration failed', error as Error, {
      apikey: apikey?.substring(0, 8) + '...',
      ip: req.ip
    });

    res.status(500).json({
      error: 'API key regeneration failed',
      code: 'REGENERATION_ERROR'
    });
  }
});

// Helper functions
function generateApiKey(): string {
  return crypto.randomBytes(32).toString('hex');
}

async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16).toString('hex');
  return new Promise((resolve, reject) => {
    crypto.pbkdf2(password, salt, 1000, 64, 'sha512', (err, derivedKey) => {
      if (err) reject(err);
      resolve(salt + ':' + derivedKey.toString('hex'));
    });
  });
}

function getStatusText(status: number): string {
  switch (status) {
    case 0: return 'inactive';
    case 1: return 'active';
    case 2: return 'suspended';
    default: return 'unknown';
  }
}

export default router;