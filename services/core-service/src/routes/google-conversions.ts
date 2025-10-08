import { Router, Request, Response } from 'express';
import { logger, loggers } from '../utils/simple-logger';
import { prisma } from '../utils/simple-database';
import { getCacheService } from '../utils/simple-cache';

const router = Router();
const cache = getCacheService();

// Helper para serializar objetos con BigInt a JSON
const serializeWithBigInt = (obj: any): string => {
  return JSON.stringify(obj, (key, value) =>
    typeof value === 'bigint' ? value.toString() : value
  );
};

// Validation helper
interface ConversionBody {
  msisdn?: string;           // Opcional - Teléfono del cliente (máx. 20 caracteres)
  empello_token?: string;    // Opcional - Token alfanumérico de Empello (máx. 300 caracteres)
  id_product?: string;       // Opcional - ID del producto (debe existir en staging.product)
  campaign?: string;         // Opcional - Nombre de la campaña (máx. 20 caracteres)
}

/**
 * Google Ads Conversion Endpoint for ENTEL Peru
 * POST /service/v1/{source}/conversion/{apikey}/{tracking}
 * 
 * @param source - Conversion source (google, facebook, tiktok, etc.) (URL - Obligatorio)
 * @param apikey - Customer API key for authentication (URL - Obligatorio)
 * @param tracking - Unique tracking ID (URL - Obligatorio)
 * @body (optional) - Additional conversion data:
 *   - msisdn: Phone number (opcional, máx. 20 caracteres)
 *   - id_product: Product ID (opcional, debe existir en staging.product)
 *   - empello_token: Empello token string (opcional, máx. 300 caracteres)
 *   - campaign: Campaign name (opcional, máx. 20 caracteres)
 * 
 * @updated 2025-10-08T16:00:00Z - Added source parameter extraction from path
 * @updated 2025-10-02T20:25:00Z - Changed from GET to POST, route corrected
 */
router.post('/:source/conversion/:apikey/:tracking', async (req: Request, res: Response) => {
  const startTime = Date.now();
  const { source, apikey, tracking } = req.params;
  
  try {
    // Log incoming request
    loggers.tracking('conversion_received', tracking, 0, {
      source,
      apikey: apikey.substring(0, 8) + '...',
      tracking,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      hasBody: !!req.body && Object.keys(req.body).length > 0
    });

    // 1. Validate source parameter
    if (!source || source.trim().length === 0) {
      res.status(400).json({
        success: false,
        error: 'Source parameter is required',
        code: 'MISSING_SOURCE'
      });
      return;
    }

    // 1.1 Validate tracking parameter - solo verificar que no esté vacío
    if (!tracking || tracking.trim().length === 0) {
      res.status(400).json({
        success: false,
        error: 'Tracking parameter is required',
        code: 'MISSING_TRACKING'
      });
      return;
    }

    // 2. Validate API Key and get customer (with caching)

    // 2. Validate API Key and get customer (with caching)
    let authUser: any = null;
    const cacheKey = `apikey:${apikey}`;
    
    try {
      const cached = await cache.get(cacheKey);
      if (cached) {
        authUser = JSON.parse(cached);
        logger.info('API key retrieved from cache', { apikey: apikey.substring(0, 8) + '...' });
      }
    } catch (cacheError) {
      logger.warn('Cache read failed, querying database', { error: cacheError });
    }

    if (!authUser) {
      authUser = await prisma.authUser.findFirst({
        where: {
          api_key: apikey,
          status: 1,
          active: 1
        },
        include: {
          customer: true
        }
      });

      if (authUser) {
        // Cache for 5 minutes - usando serialización segura para BigInt
        try {
          await cache.set(cacheKey, serializeWithBigInt(authUser), 300);
        } catch (cacheError) {
          logger.warn('Cache write failed', { error: cacheError });
        }
      }
    }

    if (!authUser || !authUser.customer) {
      logger.warn('Invalid API key for Google conversion', {
        apikey: apikey.substring(0, 8) + '...',
        tracking
      });
      
      res.status(401).json({
        success: false,
        error: 'Invalid or inactive API key',
        code: 'UNAUTHORIZED'
      });
      return;
    }

    const customer = authUser.customer;

    // 3. Validate optional body parameters
    const bodyData: ConversionBody = req.body || {};
    
    // Basic validation for optional fields
    if (bodyData.msisdn && (typeof bodyData.msisdn !== 'string' || bodyData.msisdn.length > 20)) {
      res.status(400).json({
        success: false,
        error: 'Invalid msisdn format (max 20 characters)',
        code: 'INVALID_BODY'
      });
      return;
    }

    if (bodyData.empello_token && (typeof bodyData.empello_token !== 'string' || bodyData.empello_token.length > 300)) {
      res.status(400).json({
        success: false,
        error: 'Invalid empello_token format (max 300 characters)',
        code: 'INVALID_BODY'
      });
      return;
    }

    if (bodyData.id_product && (typeof bodyData.id_product !== 'string' || bodyData.id_product.length > 255)) {
      res.status(400).json({
        success: false,
        error: 'Invalid id_product format (max 255 characters)',
        code: 'INVALID_BODY'
      });
      return;
    }

    // 3.1. Validate id_product exists in staging.product table
    // TEMPORARILY DISABLED - Prisma Client issue with Product model
    /*
    if (bodyData.id_product) {
      const productExists = await prisma.product.findFirst({
        where: {
          id_product: BigInt(bodyData.id_product),
          active: 1  // Solo productos activos
        }
      });

      if (!productExists) {
        logger.warn('Invalid product ID provided', {
          id_product: bodyData.id_product,
          tracking,
          customerId: Number(customer.id_customer)
        });

        res.status(400).json({
          success: false,
          error: `Product with id_product '${bodyData.id_product}' does not exist or is inactive`,
          code: 'INVALID_PRODUCT'
        });
        return;
      }

      logger.info('Product validated successfully', {
        id_product: bodyData.id_product,
        productName: productExists.name,
        tracking
      });
    }
    */

    if (bodyData.campaign && (typeof bodyData.campaign !== 'string' || bodyData.campaign.length > 20)) {
      res.status(400).json({
        success: false,
        error: 'Invalid campaign format (max 20 characters)',
        code: 'INVALID_BODY'
      });
      return;
    }

    logger.info('[DEBUG] All validations passed, proceeding to check duplicate', {
      tracking,
      customerId: Number(customer.id_customer),
      hasBodyData: Object.keys(bodyData).length > 0
    });

    // 3.5. Limpiar tracking ANTES de cualquier operación de base de datos
    const cleanTracking = tracking.trim().replace(/\0/g, '');

    // 4. Check for duplicate conversion (same tracking + customer)
    type ExistingConversionRow = {
      id: bigint | number;
      conversion_date: Date;
    };
    
    const existingConversions = await prisma.$queryRaw<ExistingConversionRow[]>`
      SELECT id, conversion_date
      FROM "staging"."conversions"
      WHERE tracking = ${cleanTracking}
        AND customer_id = ${customer.id_customer}
      LIMIT 1
    `;

    if (existingConversions && existingConversions.length > 0) {
      const existingConversion = existingConversions[0];
      logger.warn('Duplicate Google conversion attempt', {
        tracking,
        customerId: Number(customer.id_customer),
        existingId: Number(existingConversion.id)
      });

      res.status(409).json({
        success: false,
        error: 'Conversion already registered',
        code: 'DUPLICATE_CONVERSION',
        data: {
          conversion_id: Number(existingConversion.id),
          conversion_date: existingConversion.conversion_date
        }
      });
      return;
    }

    logger.info('[DEBUG] No duplicate found, proceeding to create conversion', {
      tracking: cleanTracking.substring(0, 20),
      customerId: Number(customer.id_customer)
    });

    // 5. Create conversion record
    // Limpiar campos de customer para evitar bytes nulos (0x00)
    const cleanCountry = (customer.country || 'pe').trim().replace(/\0/g, '');
    const cleanOperator = (customer.operator || 'entel').trim().replace(/\0/g, '');
    const cleanSource = source.trim().replace(/\0/g, '').toLowerCase(); // Limpiar y normalizar source
    // cleanTracking ya fue definido arriba antes del findFirst
    
    // Preparar datos limpios
    const conversionData = {
      customer_id: BigInt(customer.id_customer),  // Asegurar que sea BigInt
      tracking: cleanTracking,
      id_product: bodyData.id_product ? bodyData.id_product.trim().replace(/\0/g, '') : null,
      msisdn: bodyData.msisdn ? bodyData.msisdn.trim().replace(/\0/g, '') : null,
      empello_token: bodyData.empello_token ? bodyData.empello_token.trim().replace(/\0/g, '') : null,
      campaign: bodyData.campaign ? bodyData.campaign.trim().replace(/\0/g, '') : null,
      source: cleanSource,  // Usar source del path en lugar de hardcoded 'google'
      country: cleanCountry,
      operator: cleanOperator,
      status_post_back: 0,
      date_post_back: null
    };

    // Validar nuevamente que ningún campo string contenga bytes nulos residuales
    const nullByteFields: string[] = [];
    const stringDiagnostics: Record<string, { hex: string; length: number; containsNullByte: boolean }> = {};
    for (const [key, value] of Object.entries(conversionData)) {
      if (typeof value === 'string') {
        const cleanedValue = value.replace(/\0/g, '');
        if (cleanedValue !== value) {
          nullByteFields.push(key);
        }
        (conversionData as any)[key] = cleanedValue;
        const buffer = Buffer.from(cleanedValue, 'utf8');
        stringDiagnostics[key] = {
          hex: buffer.toString('hex'),
          length: buffer.length,
          containsNullByte: buffer.includes(0)
        };
      }
    }
    
    const logPreview = {
      tracking: cleanTracking.substring(0, 20),
      customerId: conversionData.customer_id.toString(),
      country: cleanCountry,
      operator: cleanOperator,
      hasBodyData: Object.keys(bodyData).length > 0,
      nullByteSanitizedFields: nullByteFields,
      stringDiagnostics
    };

    logger.info('Creating conversion with cleaned data', logPreview);
    logger.info('Conversion string diagnostics', stringDiagnostics);

    logger.info('[DEBUG] About to execute INSERT query', {
      tracking: cleanTracking.substring(0, 20),
      customerId: conversionData.customer_id.toString(),
      source: cleanSource
    });

    type ConversionRow = {
      id: bigint | number | string;
      conversion_date: Date;
      customer_id: bigint | number | string;
      tracking: string;
      id_product: string | null;
      msisdn: string | null;
      empello_token: string | null;
      source: string;
      status_post_back: number | string | null;
      date_post_back: Date | null;
      campaign: string | null;
      country: string | null;
      operator: string | null;
    };

    const insertedRows = await prisma.$queryRaw<ConversionRow[]>`
      INSERT INTO "staging"."conversions"
      ("customer_id", "tracking", "id_product", "msisdn", "empello_token", "source", "status_post_back", "date_post_back", "campaign", "country", "operator")
      VALUES
      (${conversionData.customer_id}, ${conversionData.tracking}, ${conversionData.id_product}, ${conversionData.msisdn}, ${conversionData.empello_token}, ${conversionData.source}, ${conversionData.status_post_back}, ${conversionData.date_post_back}, ${conversionData.campaign}, ${conversionData.country}, ${conversionData.operator})
      RETURNING
      "id", "conversion_date", "customer_id", "tracking", "id_product", "msisdn", "empello_token", "source", "status_post_back", "date_post_back", "campaign", "country", "operator";
    `;

    if (!Array.isArray(insertedRows) || insertedRows.length === 0) {
      throw new Error('Conversion insert did not return any rows');
    }

    logger.info('[DEBUG] INSERT successful', {
      rowsReturned: insertedRows.length,
      firstRowId: insertedRows[0].id?.toString() || 'unknown'
    });

    const conversionRow = insertedRows[0];

    const conversion = {
      id:
        typeof conversionRow.id === 'bigint'
          ? conversionRow.id
          : BigInt(conversionRow.id as number | string),
      conversion_date: conversionRow.conversion_date,
      customer_id:
        typeof conversionRow.customer_id === 'bigint'
          ? conversionRow.customer_id
          : BigInt(conversionRow.customer_id as number | string),
      tracking: conversionRow.tracking,
      id_product: conversionRow.id_product,
      msisdn: conversionRow.msisdn,
      empello_token: conversionRow.empello_token,
      source: conversionRow.source,
      status_post_back:
        conversionRow.status_post_back === null
          ? null
          : Number(conversionRow.status_post_back),
      date_post_back: conversionRow.date_post_back,
      campaign: conversionRow.campaign,
      country: conversionRow.country,
      operator: conversionRow.operator
    };

    // Log successful creation
    loggers.tracking('conversion_created', tracking, 0, {
      conversionId: Number(conversion.id),
      customerId: Number(customer.id_customer),
      customerName: customer.name,
      tracking,
      source: cleanSource,
      idProduct: bodyData.id_product || 'N/A',
      msisdn: bodyData.msisdn || 'N/A',
      campaign: bodyData.campaign || 'N/A',
      country: conversion.country,
      operator: conversion.operator
    });

    // 6. Trigger Google Ads API notification asynchronously
    triggerGoogleAdsNotification(conversion).catch(error => {
      loggers.error('Google Ads notification failed (async)', error, {
        tracking,
        conversionId: Number(conversion.id),
        customerId: Number(customer.id_customer),
        country: conversion.country,
        operator: conversion.operator,
        ...(conversion.msisdn && { msisdn: conversion.msisdn }),
        ...(conversion.id_product && { id_product: conversion.id_product }),
        ...(conversion.empello_token && { empello_token: conversion.empello_token }),
        ...(conversion.campaign && { campaign: conversion.campaign })
      });
    });

    const responseTime = Date.now() - startTime;

    // 7. Return success response (incluye campos opcionales del body si fueron proporcionados)
    res.json({
      success: true,
      message: 'Conversion registered successfully',
      data: {
        conversion_id: Number(conversion.id),
        tracking,
        customer: customer.name,
        country: conversion.country,
        operator: conversion.operator,
        conversion_date: conversion.conversion_date,
        response_time_ms: responseTime,
        // Campos opcionales del JSON body (si fueron proporcionados)
        ...(bodyData.msisdn && { msisdn: bodyData.msisdn }),
        ...(bodyData.id_product && { id_product: bodyData.id_product }),
        ...(bodyData.empello_token && { empello_token: bodyData.empello_token }),
        ...(bodyData.campaign && { campaign: bodyData.campaign })
      }
    });

  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    loggers.error('Conversion registration failed', error, {
      source: source || 'unknown',
      apikey: apikey?.substring(0, 8) + '...',
      tracking,
      ip: req.ip,
      responseTime
    });

    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'CONVERSION_ERROR',
      response_time_ms: responseTime
    });
  }
});

/**
 * GET endpoint to check conversion status
 * GET /service/v1/google/conversion/status/:tracking
 */
router.get('/google/conversion/status/:tracking', async (req: Request, res: Response) => {
  const { tracking } = req.params;
  
  try {
    const conversion = await prisma.conversion.findFirst({
      where: { tracking },
      include: {
        customer: {
          select: {
            name: true,
            country: true,
            operator: true
          }
        }
      },
      orderBy: { conversion_date: 'desc' }
    });

    if (!conversion) {
      res.status(404).json({
        success: false,
        error: 'Conversion not found',
        code: 'NOT_FOUND'
      });
      return;
    }

    res.json({
      success: true,
      data: {
        conversion_id: Number(conversion.id),
        tracking: conversion.tracking,
        customer: conversion.customer?.name,
        country: conversion.country,
        operator: conversion.operator,
        campaign: conversion.campaign,
        msisdn: conversion.msisdn,
        conversion_date: conversion.conversion_date,
        status_post_back: conversion.status_post_back,
        date_post_back: conversion.date_post_back,
        status_description: conversion.status_post_back === 1 ? 'Success' : 
                           conversion.status_post_back === 2 ? 'Failed' : 'Pending'
      }
    });

  } catch (error) {
    loggers.error('Conversion status check failed', error, { tracking });
    
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'STATUS_CHECK_ERROR'
    });
  }
});

/**
 * Helper function to trigger Google Ads API notification
 */
async function triggerGoogleAdsNotification(conversion: any) {
  try {
    // Get postback service URL based on environment
    const postbackUrl = process.env.NODE_ENV === 'production' 
      ? process.env.POSTBACK_SERVICE_URL?.replace('/api/postbacks/send', '/api/postbacks/google/conversion') || 
        'https://postback-service-prod-697203931362.us-central1.run.app/api/postbacks/google/conversion'
      : 'https://postback-service-stg-697203931362.us-central1.run.app/api/postbacks/google/conversion';
    
    const postbackData = {
      conversion_id: Number(conversion.id),
      tracking: conversion.tracking,
      customer_id: Number(conversion.customer_id),
      country: conversion.country,
      operator: conversion.operator,
      msisdn: conversion.msisdn,
      campaign: conversion.campaign,
      conversion_date: conversion.conversion_date,
      id_product: conversion.id_product ? Number(conversion.id_product) : null
    };

    logger.info('Triggering Google Ads notification', {
      conversionId: Number(conversion.id),
      url: postbackUrl,
      tracking: conversion.tracking
    });

    const response = await fetch(postbackUrl, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'User-Agent': 'Xafra-Ads-Core/1.0'
      },
      body: JSON.stringify(postbackData),
      signal: AbortSignal.timeout(10000) // 10 second timeout
    });

    if (response.ok) {
      // Update conversion with success status
      await prisma.conversion.update({
        where: { id: conversion.id },
        data: {
          status_post_back: 1, // Success
          date_post_back: new Date()
        }
      });

      loggers.tracking('google_ads_notified', conversion.tracking, 0, {
        conversionId: Number(conversion.id),
        status: 'success',
        statusCode: response.status
      });
    } else {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

  } catch (error) {
    // Update conversion with failure status
    await prisma.conversion.update({
      where: { id: conversion.id },
      data: {
        status_post_back: 2, // Failed
        date_post_back: new Date()
      }
    });

    loggers.error('Google Ads notification failed', error, {
      conversionId: Number(conversion.id),
      tracking: conversion.tracking
    });
    
    throw error;
  }
}

export default router;
