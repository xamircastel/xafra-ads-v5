"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatValidationErrors = exports.validateSchema = exports.TrackingUrlSchema = exports.BatchEncryptSchema = exports.DecryptSchema = exports.UtilitySchema = exports.SuccessResponseSchema = exports.ErrorResponseSchema = exports.ConversionRateResponseSchema = exports.AnalyticsRequestSchema = exports.KolbiConfirmSchema = exports.KolbiRequestSchema = exports.TrafficOptimizationRequestSchema = exports.ShortTrackingRequestSchema = exports.ConfirmSaleRequestSchema = exports.DecryptProductRequestSchema = exports.EncryptProductRequestSchema = exports.CreateAuthUserSchema = exports.AuthUserSchema = exports.CreateCustomerSchema = exports.CustomerSchema = exports.UpdateCampaignSchema = exports.CreateCampaignSchema = exports.CampaignSchema = exports.UpdateProductSchema = exports.CreateProductSchema = exports.ProductSchema = exports.OperatorCodeSchema = exports.CountryCodeSchema = exports.ApiKeySchema = exports.TrackingIdSchema = exports.TimestampSchema = exports.IdSchema = void 0;
const zod_1 = require("zod");
// Common validation schemas
exports.IdSchema = zod_1.z.number().int().positive();
exports.TimestampSchema = zod_1.z.number().int().positive();
exports.TrackingIdSchema = zod_1.z.string().min(1).max(255);
exports.ApiKeySchema = zod_1.z.string().min(30).max(50); // Updated to support new format: xafra_xxxxxxxx_hash (47 chars)
exports.CountryCodeSchema = zod_1.z.string().length(2).toUpperCase().optional();
exports.OperatorCodeSchema = zod_1.z.string().min(1).max(50).optional();
// Product validation schemas
exports.ProductSchema = zod_1.z.object({
    id: exports.IdSchema,
    customer_id: exports.IdSchema,
    name: zod_1.z.string().min(1).max(255),
    url_redirect_success: zod_1.z.string().url(),
    url_redirect_postback: zod_1.z.string().url().optional(),
    method_postback: zod_1.z.enum(['GET', 'POST']).default('POST'),
    country: exports.CountryCodeSchema,
    operator: exports.OperatorCodeSchema,
    random: zod_1.z.number().int().min(0).max(1).default(0),
    status: zod_1.z.number().int().min(0).max(1).default(1),
    creation_date: exports.TimestampSchema,
    modification_date: exports.TimestampSchema.optional()
});
exports.CreateProductSchema = exports.ProductSchema.omit({
    id: true,
    creation_date: true,
    modification_date: true
});
exports.UpdateProductSchema = exports.ProductSchema.partial().omit({
    id: true,
    creation_date: true
});
// Campaign validation schemas
exports.CampaignSchema = zod_1.z.object({
    id: exports.IdSchema,
    creation_date: exports.TimestampSchema,
    modification_date: exports.TimestampSchema.optional(),
    id_product: exports.IdSchema,
    tracking: exports.TrackingIdSchema,
    status: zod_1.z.number().int().min(1).max(2).default(2),
    uuid: zod_1.z.string().uuid(),
    status_post_back: zod_1.z.number().int().min(0).max(1).default(0),
    xafra_tracking_id: exports.TrackingIdSchema,
    short_tracking: zod_1.z.string().min(1).max(10).optional(),
    country: exports.CountryCodeSchema,
    operator: exports.OperatorCodeSchema,
    date_post_back: exports.TimestampSchema.optional()
});
exports.CreateCampaignSchema = exports.CampaignSchema.omit({
    id: true,
    creation_date: true,
    modification_date: true,
    uuid: true,
    xafra_tracking_id: true
});
exports.UpdateCampaignSchema = exports.CampaignSchema.partial().omit({
    id: true,
    creation_date: true,
    id_product: true,
    tracking: true,
    uuid: true,
    xafra_tracking_id: true
});
// Customer validation schemas
exports.CustomerSchema = zod_1.z.object({
    id: exports.IdSchema,
    name: zod_1.z.string().min(1).max(255),
    email: zod_1.z.string().email(),
    country: exports.CountryCodeSchema,
    operator: exports.OperatorCodeSchema,
    status: zod_1.z.number().int().min(0).max(1).default(1),
    creation_date: exports.TimestampSchema,
    modification_date: exports.TimestampSchema.optional()
});
exports.CreateCustomerSchema = exports.CustomerSchema.omit({
    id: true,
    creation_date: true,
    modification_date: true
});
// Auth validation schemas
exports.AuthUserSchema = zod_1.z.object({
    id: exports.IdSchema,
    customer_id: exports.IdSchema,
    apikey: exports.ApiKeySchema,
    status: zod_1.z.number().int().min(0).max(1).default(1),
    creation_date: exports.TimestampSchema,
    modification_date: exports.TimestampSchema.optional()
});
exports.CreateAuthUserSchema = exports.AuthUserSchema.omit({
    id: true,
    apikey: true,
    creation_date: true,
    modification_date: true
});
// API request/response schemas
exports.EncryptProductRequestSchema = zod_1.z.object({
    productId: exports.IdSchema,
    country: exports.CountryCodeSchema,
    operator: exports.OperatorCodeSchema
});
exports.DecryptProductRequestSchema = zod_1.z.object({
    encryptedId: zod_1.z.string().min(1)
});
exports.ConfirmSaleRequestSchema = zod_1.z.object({
    apikey: exports.ApiKeySchema,
    tracking: exports.TrackingIdSchema
});
exports.ShortTrackingRequestSchema = zod_1.z.object({
    apikey: exports.ApiKeySchema,
    original_tracking: exports.TrackingIdSchema,
    short_tracking: zod_1.z.string().min(1).max(10),
    enabled: zod_1.z.boolean().default(true)
});
exports.TrafficOptimizationRequestSchema = zod_1.z.object({
    encryptedId: zod_1.z.string().min(1),
    tracker: exports.TrackingIdSchema.optional()
});
// Costa Rica Kolbi specific schemas
exports.KolbiRequestSchema = zod_1.z.object({
    apikey: exports.ApiKeySchema,
    original_tracking: exports.TrackingIdSchema,
    short_tracking: zod_1.z.string().min(5).max(6), // Kolbi uses 5-6 char tracking
    enabled: zod_1.z.boolean().default(true)
});
exports.KolbiConfirmSchema = zod_1.z.object({
    apikey: exports.ApiKeySchema,
    shortTracking: zod_1.z.string().min(5).max(6)
});
// Analytics and reporting schemas
exports.AnalyticsRequestSchema = zod_1.z.object({
    startDate: zod_1.z.string().datetime().optional(),
    endDate: zod_1.z.string().datetime().optional(),
    productId: exports.IdSchema.optional(),
    customerId: exports.IdSchema.optional(),
    country: exports.CountryCodeSchema,
    operator: exports.OperatorCodeSchema,
    limit: zod_1.z.number().int().min(1).max(1000).default(100),
    offset: zod_1.z.number().int().min(0).default(0)
});
exports.ConversionRateResponseSchema = zod_1.z.object({
    productId: exports.IdSchema,
    totalClicks: zod_1.z.number().int().min(0),
    totalConversions: zod_1.z.number().int().min(0),
    conversionRate: zod_1.z.number().min(0).max(1),
    timeframe: zod_1.z.string(),
    lastUpdated: zod_1.z.string().datetime()
});
// Error response schema
exports.ErrorResponseSchema = zod_1.z.object({
    error: zod_1.z.string(),
    details: zod_1.z.any().optional(),
    code: zod_1.z.string().optional(),
    timestamp: zod_1.z.string().datetime()
});
// Success response schema
exports.SuccessResponseSchema = zod_1.z.object({
    success: zod_1.z.boolean().default(true),
    data: zod_1.z.any().optional(),
    message: zod_1.z.string().optional(),
    timestamp: zod_1.z.string().datetime()
});
// Utility schemas
exports.UtilitySchema = zod_1.z.object({
    apikey: exports.ApiKeySchema,
    product_id: exports.IdSchema,
    expire_hours: zod_1.z.number().int().min(0).max(168).default(24) // 0 = never expires, max 7 days
});
exports.DecryptSchema = zod_1.z.object({
    apikey: exports.ApiKeySchema,
    encrypted_id: zod_1.z.string().min(1)
});
exports.BatchEncryptSchema = zod_1.z.object({
    apikey: exports.ApiKeySchema,
    product_ids: zod_1.z.array(exports.IdSchema).min(1).max(100), // Max 100 products per batch
    expire_hours: zod_1.z.number().int().min(0).max(168).default(24) // 0 = never expires
});
exports.TrackingUrlSchema = zod_1.z.object({
    apikey: exports.ApiKeySchema,
    product_id: exports.IdSchema,
    tracking_type: zod_1.z.enum(['standard', 'auto', 'random']).default('standard'),
    custom_params: zod_1.z.record(zod_1.z.string(), zod_1.z.any()).default({}),
    expire_hours: zod_1.z.number().int().min(0).max(168).default(24) // 0 = never expires
});
// Validation helper functions
const validateSchema = (schema, data) => {
    const result = schema.safeParse(data);
    if (result.success) {
        return { success: true, data: result.data };
    }
    else {
        return { success: false, errors: result.error };
    }
};
exports.validateSchema = validateSchema;
const formatValidationErrors = (errors) => {
    return errors.errors.map(error => `${error.path.join('.')}: ${error.message}`);
};
exports.formatValidationErrors = formatValidationErrors;
//# sourceMappingURL=index.js.map