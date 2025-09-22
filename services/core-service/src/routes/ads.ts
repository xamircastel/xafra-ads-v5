import { Router, Request, Response } from "express";
import { logger } from "../utils/simple-logger";
import { prisma } from "../utils/simple-database";
import { generateTrackingId, generateUUID } from "../utils/simple-utils";

const router = Router();

// Random traffic distribution route - selects random product from pool
router.get("/random/:encryptedId", async (req: Request, res: Response) => {
  const startTime = Date.now();
  const { encryptedId } = req.params;
  const tracker = req.query.tracker as string;

  try {
    // Log incoming random request
    logger.info('Random Traffic Ad Request', {
      encryptedId: encryptedId.substring(0, 10) + '...',
      tracker: tracker || 'auto-generated',
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      route: '/ads/random/'
    });

    // Call our decrypt endpoint
    const baseUrl = process.env.NODE_ENV === 'staging' 
      ? 'https://core-service-stg-shk2qzic2q-uc.a.run.app'
      : 'http://localhost:8080';
    const decryptResponse = await fetch(`${baseUrl}/api/util/decrypt`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'x-api-key': 'xafra_mfs9yf3g_e8c39158306ce0759b573cf36c56218b'
      },
      body: JSON.stringify({ encrypted_id: encryptedId })
    });

    if (!decryptResponse.ok) {
      logger.warn('Random traffic decryption failed', { encryptedId, status: decryptResponse.status });
      res.status(404).json({ error: 'Invalid or expired encrypted ID' });
      return;
    }

    const decryptResult = await decryptResponse.json();
    const { product_id, customer_id } = (decryptResult as any).data;

    // Get original product to verify access
    const originalProduct = await prisma.product.findUnique({
      where: { id_product: product_id },
      include: { customer: true }
    });

    if (!originalProduct || originalProduct.active !== 1) {
      logger.warn('Original product not found or inactive (random)', { product_id, customer_id });
      res.status(404).json({ error: 'Product not found or inactive' });
      return;
    }

    // Get random products from same customer with random=1
    const randomProducts = await prisma.product.findMany({
      where: {
        id_customer: customer_id,
        active: 1,
        random: 1
      },
      include: { customer: true }
    });

    if (randomProducts.length === 0) {
      logger.warn('No random products available', { customer_id });
      res.status(404).json({ error: 'No random products available for this customer' });
      return;
    }

    // Calculate performance-based distribution for last 24 hours (OPTIMIZED)
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const productIds = randomProducts.map(p => p.id_product);
    
    // Single optimized query for all products
    const [campaignStats, confirmationStats] = await Promise.all([
      // Get campaign counts for all products in one query
      prisma.campaign.groupBy({
        by: ['id_product'],
        where: {
          id_product: { in: productIds },
          creation_date: { gte: twentyFourHoursAgo }
        },
        _count: { id: true }
      }),
      
      // Get confirmation counts for all products in one query
      prisma.campaign.groupBy({
        by: ['id_product'],
        where: {
          id_product: { in: productIds },
          creation_date: { gte: twentyFourHoursAgo },
          status_post_back: 1
        },
        _count: { id: true }
      })
    ]);

    // Build performance map from aggregated results
    const campaignMap = new Map(campaignStats.map(s => [s.id_product, s._count.id]));
    const confirmationMap = new Map(confirmationStats.map(s => [s.id_product, s._count.id]));
    
    const productPerformance = randomProducts.map(product => {
      const campaignCount = campaignMap.get(product.id_product) || 0;
      const confirmations = confirmationMap.get(product.id_product) || 0;
      const conversionRate = (campaignCount as number) > 0 ? (confirmations as number) / (campaignCount as number) : 0;

      return {
        product,
        campaignCount: campaignCount as number,
        confirmations: confirmations as number,
        conversionRate,
        hasEnoughData: (campaignCount as number) >= 10 // Minimum threshold for reliable data
      };
    });

    // Check if we have enough data for performance-based distribution
    const productsWithData = productPerformance.filter(p => p.hasEnoughData);
    const totalCampaigns = productPerformance.reduce((sum, p) => sum + p.campaignCount, 0);
    
    let selectedProduct;
    let selectionMethod;

    if (productsWithData.length >= 2 && totalCampaigns >= 20) {
      // PERFORMANCE-BASED DISTRIBUTION
      // Calculate weights based on conversion rates
      const maxConversionRate = Math.max(...productsWithData.map(p => p.conversionRate));
      const weights = productsWithData.map(p => {
        // Give higher weight to better performing products
        // Add base weight to ensure even poor performers get some traffic
        const baseWeight = 0.1;
        const performanceWeight = maxConversionRate > 0 ? (p.conversionRate / maxConversionRate) * 0.9 : 0;
        return baseWeight + performanceWeight;
      });

      // Weighted random selection
      const totalWeight = weights.reduce((sum, w) => sum + w, 0);
      const randomValue = Math.random() * totalWeight;
      
      let cumulativeWeight = 0;
      for (let i = 0; i < productsWithData.length; i++) {
        cumulativeWeight += weights[i];
        if (randomValue <= cumulativeWeight) {
          selectedProduct = productsWithData[i].product;
          selectionMethod = 'performance-weighted';
          break;
        }
      }
      
      // Fallback to best performer if something goes wrong
      if (!selectedProduct) {
        const bestPerformer = productsWithData.reduce((best, current) => 
          current.conversionRate > best.conversionRate ? current : best
        );
        selectedProduct = bestPerformer.product;
        selectionMethod = 'best-performer-fallback';
      }
    } else {
      // RANDOM DISTRIBUTION (insufficient data)
      selectedProduct = randomProducts[Math.floor(Math.random() * randomProducts.length)];
      selectionMethod = 'random-insufficient-data';
    }

    // Log distribution decision
    logger.info('Traffic distribution decision', {
      selectionMethod,
      totalProducts: randomProducts.length,
      productsWithData: productsWithData.length,
      totalCampaigns24h: totalCampaigns,
      selectedProductId: selectedProduct.id_product,
      performanceData: productPerformance.map(p => ({
        productId: p.product.id_product,
        campaignCount: p.campaignCount,
        confirmations: p.confirmations,
        conversionRate: Math.round(p.conversionRate * 10000) / 100, // Percentage with 2 decimals
        hasEnoughData: p.hasEnoughData
      }))
    });

    // Generate random tracking IDs
    const country = selectedProduct.country || originalProduct.country || 'CR';
    const operator = selectedProduct.operator || originalProduct.operator || 'KOLBI';
    
    const randomTrackingId = tracker || generateTrackingId(`RND_${country}_${operator}`);
    const xafraTrackingId = generateTrackingId('XAFRA_RANDOM');
    const uuid = generateUUID();

    // Create campaign record with random distribution flag
    const campaign = await prisma.campaign.create({
      data: {
        id_product: selectedProduct.id_product, // Use selected random product
        tracking: randomTrackingId,
        status: 2, // Pending conversion
        uuid: uuid,
        xafra_tracking_id: xafraTrackingId,
        country: country,
        operator: operator,
        creation_date: new Date(),
        params: JSON.stringify({ 
          randomDistribution: true,
          sourceRoute: '/ads/random/',
          originalProductId: product_id,
          selectedProductId: selectedProduct.id_product,
          availableProducts: randomProducts.length,
          selectionMethod: selectionMethod,
          distributionData: {
            totalCampaigns24h: totalCampaigns,
            productsWithData: productsWithData.length,
            performanceBased: selectionMethod === 'performance-weighted'
          },
          generatedAt: new Date().toISOString()
        }, (key, value) => typeof value === 'bigint' ? value.toString() : value)
      }
    });

    // Prepare redirect URL from selected product
    let redirectUrl = selectedProduct.url_redirect_success || 'https://example.com';
    
    // Replace tracking placeholder in the selected product URL
    redirectUrl = redirectUrl.replace(/<TRAKING>/g, randomTrackingId);
    redirectUrl = redirectUrl.replace(/<TRACKING>/g, randomTrackingId);
    
    // Only add xafra_tracking if not already present
    if (!redirectUrl.includes('xafra_tracking=')) {
      if (redirectUrl.includes('?')) {
        redirectUrl += `&xafra_tracking=${xafraTrackingId}`;
      } else {
        redirectUrl += `?xafra_tracking=${xafraTrackingId}`;
      }
    }

    // Log successful random redirect
    const duration = Date.now() - startTime;
    logger.info('Successful performance-based traffic redirect', {
      originalProductId: product_id,
      selectedProductId: selectedProduct.id_product,
      selectedProductName: selectedProduct.name,
      customerId: customer_id,
      randomTrackingId,
      xafraTrackingId,
      campaignId: campaign.id,
      availableProducts: randomProducts.length,
      selectionMethod: selectionMethod,
      country,
      operator,
      redirectUrl: redirectUrl.substring(0, 100) + '...',
      duration
    });

    // Redirect to selected random product URL
    res.redirect(302, redirectUrl);

  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Random traffic ad request failed', error as Error, { encryptedId, tracker, duration });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Auto-tracking route - generates intelligent tracking IDs
router.get("/tr/:encryptedId", async (req: Request, res: Response) => {
  const startTime = Date.now();
  const { encryptedId } = req.params;
  const tracker = req.query.tracker as string;

  try {
    // Log incoming auto-tracking request
    logger.info('Auto-Tracking Ad Request', {
      encryptedId: encryptedId.substring(0, 10) + '...',
      tracker: tracker || 'auto-generated',
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      route: '/ads/tr/'
    });

    // Call our decrypt endpoint
    const baseUrl = process.env.NODE_ENV === 'staging' 
      ? 'https://core-service-stg-shk2qzic2q-uc.a.run.app'
      : 'http://localhost:8080';
    const decryptResponse = await fetch(`${baseUrl}/api/util/decrypt`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'x-api-key': 'xafra_mfs9yf3g_e8c39158306ce0759b573cf36c56218b'
      },
      body: JSON.stringify({ encrypted_id: encryptedId })
    });

    if (!decryptResponse.ok) {
      logger.warn('Auto-tracking decryption failed', { encryptedId, status: decryptResponse.status });
      res.status(404).json({ error: 'Invalid or expired encrypted ID' });
      return;
    }

    const decryptResult = await decryptResponse.json();
    const { product_id, customer_id } = (decryptResult as any).data;

    // Get product details from database
    const product = await prisma.product.findUnique({
      where: { id_product: product_id },
      include: { customer: true }
    });

    if (!product || product.active !== 1) {
      logger.warn('Product not found or inactive (auto-tracking)', { product_id, customer_id });
      res.status(404).json({ error: 'Product not found or inactive' });
      return;
    }

    // Generate intelligent auto-tracking IDs based on location and context
    const country = product.country || 'CR';
    const operator = product.operator || 'KOLBI';
    
    // Auto-generate tracking ID with location prefix
    const autoTrackingId = tracker || generateTrackingId(`ATR_${country}_${operator}`);
    const xafraTrackingId = generateTrackingId('XAFRA_AUTO');
    const uuid = generateUUID();

    // Create campaign record with auto-tracking flag
    const campaign = await prisma.campaign.create({
      data: {
        id_product: product_id,
        tracking: autoTrackingId,
        status: 2, // Pending conversion
        uuid: uuid,
        xafra_tracking_id: xafraTrackingId,
        country: country,
        operator: operator,
        creation_date: new Date(),
        params: JSON.stringify({ 
          autoTracking: true, 
          sourceRoute: '/ads/tr/',
          generatedAt: new Date().toISOString()
        })
      }
    });

    // Prepare redirect URL - Replace placeholders instead of adding parameters
    let redirectUrl = product.url_redirect_success || 'https://example.com';
    
    // Replace tracking placeholder in the original URL
    redirectUrl = redirectUrl.replace(/<TRAKING>/g, autoTrackingId);
    redirectUrl = redirectUrl.replace(/<TRACKING>/g, autoTrackingId);
    
    // Only add xafra_tracking if not already present
    if (!redirectUrl.includes('xafra_tracking=')) {
      if (redirectUrl.includes('?')) {
        redirectUrl += `&xafra_tracking=${xafraTrackingId}`;
      } else {
        redirectUrl += `?xafra_tracking=${xafraTrackingId}`;
      }
    }

    // Log successful auto-tracking redirect
    const duration = Date.now() - startTime;
    logger.info('Successful auto-tracking redirect', {
      productId: product_id,
      productName: product.name,
      customerId: customer_id,
      autoTrackingId,
      xafraTrackingId,
      campaignId: campaign.id,
      country,
      operator,
      redirectUrl: redirectUrl.substring(0, 100) + '...',
      duration
    });

    // Redirect to product URL
    res.redirect(302, redirectUrl);

  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Auto-tracking ad request failed', error as Error, { encryptedId, tracker, duration });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get("/:encryptedId", async (req: Request, res: Response) => {
  const startTime = Date.now();
  const { encryptedId } = req.params;
  const tracker = req.query.tracker as string;

  try {
    // Log incoming request
    logger.info('Ad Request', {
      encryptedId: encryptedId.substring(0, 10) + '...',
      tracker: tracker || 'auto-generated',
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    // Call our decrypt endpoint
    const baseUrl = process.env.NODE_ENV === 'staging' 
      ? 'https://core-service-stg-shk2qzic2q-uc.a.run.app'
      : 'http://localhost:8080';
    const decryptResponse = await fetch(`${baseUrl}/api/util/decrypt`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'x-api-key': 'xafra_mfs9yf3g_e8c39158306ce0759b573cf36c56218b'
      },
      body: JSON.stringify({ encrypted_id: encryptedId }) // ✅ Campo correcto
    });

    if (!decryptResponse.ok) {
      logger.warn('Decryption failed', { encryptedId, status: decryptResponse.status });
      res.status(404).json({ error: 'Invalid or expired encrypted ID' });
      return;
    }

    const decryptResult = await decryptResponse.json();
    const { product_id, customer_id } = (decryptResult as any).data;

    // Get product details from database
    const product = await prisma.product.findUnique({
      where: { id_product: product_id },
      include: { customer: true }
    });

    if (!product || product.active !== 1) {
      logger.warn('Product not found or inactive', { product_id, customer_id });
      res.status(404).json({ error: 'Product not found or inactive' });
      return;
    }

    // Generate tracking IDs
    const trackingId = tracker || generateTrackingId('XTR');
    const xafraTrackingId = generateTrackingId('XAFRA');
    const uuid = generateUUID();

    // Create campaign record
    const campaign = await prisma.campaign.create({
      data: {
        id_product: product_id,
        tracking: trackingId,
        status: 2, // Pending conversion
        uuid: uuid,
        xafra_tracking_id: xafraTrackingId,
        country: product.country,
        operator: product.operator,
        creation_date: new Date()
      }
    });

    // Prepare redirect URL - Replace placeholders instead of adding parameters
    let redirectUrl = product.url_redirect_success || 'https://example.com';
    
    // Replace tracking placeholder in the original URL
    redirectUrl = redirectUrl.replace(/<TRAKING>/g, trackingId);
    redirectUrl = redirectUrl.replace(/<TRACKING>/g, trackingId);
    
    // Only add xafra_tracking if not already present
    if (!redirectUrl.includes('xafra_tracking=')) {
      if (redirectUrl.includes('?')) {
        redirectUrl += `&xafra_tracking=${xafraTrackingId}`;
      } else {
        redirectUrl += `?xafra_tracking=${xafraTrackingId}`;
      }
    }

    // Log successful redirect
    const duration = Date.now() - startTime;
    logger.info('Successful redirect', {
      productId: product_id,
      productName: product.name,
      customerId: customer_id,
      trackingId,
      xafraTrackingId,
      campaignId: campaign.id,
      redirectUrl: redirectUrl.substring(0, 100) + '...',
      duration
    });

    // Redirect to product URL
    res.redirect(302, redirectUrl);

  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Ad request failed', error as Error, { encryptedId, tracker, duration });
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
