import { z } from 'zod';

// Common validation schemas
export const IdSchema = z.number().int().positive();
export const TimestampSchema = z.number().int().positive();
export const TrackingIdSchema = z.string().min(1).max(255);
export const ApiKeySchema = z.string().min(30).max(50); // Updated to support new format: xafra_xxxxxxxx_hash (47 chars)
export const CountryCodeSchema = z.string().length(2).toUpperCase().optional();
export const OperatorCodeSchema = z.string().min(1).max(50).optional();

// Product validation schemas
export const ProductSchema = z.object({
  id: IdSchema,
  customer_id: IdSchema,
  name: z.string().min(1).max(255),
  url_redirect_success: z.string().url(),
  url_redirect_postback: z.string().url().optional(),
  method_postback: z.enum(['GET', 'POST']).default('POST'),
  country: CountryCodeSchema,
  operator: OperatorCodeSchema,
  random: z.number().int().min(0).max(1).default(0),
  status: z.number().int().min(0).max(1).default(1),
  creation_date: TimestampSchema,
  modification_date: TimestampSchema.optional()
});

export const CreateProductSchema = ProductSchema.omit({
  id: true,
  creation_date: true,
  modification_date: true
});

export const UpdateProductSchema = ProductSchema.partial().omit({
  id: true,
  creation_date: true
});

// Campaign validation schemas
export const CampaignSchema = z.object({
  id: IdSchema,
  creation_date: TimestampSchema,
  modification_date: TimestampSchema.optional(),
  id_product: IdSchema,
  tracking: TrackingIdSchema,
  status: z.number().int().min(1).max(2).default(2),
  uuid: z.string().uuid(),
  status_post_back: z.number().int().min(0).max(1).default(0),
  xafra_tracking_id: TrackingIdSchema,
  short_tracking: z.string().min(1).max(10).optional(),
  country: CountryCodeSchema,
  operator: OperatorCodeSchema,
  date_post_back: TimestampSchema.optional()
});

export const CreateCampaignSchema = CampaignSchema.omit({
  id: true,
  creation_date: true,
  modification_date: true,
  uuid: true,
  xafra_tracking_id: true
});

export const UpdateCampaignSchema = CampaignSchema.partial().omit({
  id: true,
  creation_date: true,
  id_product: true,
  tracking: true,
  uuid: true,
  xafra_tracking_id: true
});

// Customer validation schemas
export const CustomerSchema = z.object({
  id: IdSchema,
  name: z.string().min(1).max(255),
  email: z.string().email(),
  country: CountryCodeSchema,
  operator: OperatorCodeSchema,
  status: z.number().int().min(0).max(1).default(1),
  creation_date: TimestampSchema,
  modification_date: TimestampSchema.optional()
});

export const CreateCustomerSchema = CustomerSchema.omit({
  id: true,
  creation_date: true,
  modification_date: true
});

// Auth validation schemas
export const AuthUserSchema = z.object({
  id: IdSchema,
  customer_id: IdSchema,
  apikey: ApiKeySchema,
  status: z.number().int().min(0).max(1).default(1),
  creation_date: TimestampSchema,
  modification_date: TimestampSchema.optional()
});

export const CreateAuthUserSchema = AuthUserSchema.omit({
  id: true,
  apikey: true,
  creation_date: true,
  modification_date: true
});

// API request/response schemas
export const EncryptProductRequestSchema = z.object({
  productId: IdSchema,
  country: CountryCodeSchema,
  operator: OperatorCodeSchema
});

export const DecryptProductRequestSchema = z.object({
  encryptedId: z.string().min(1)
});

export const ConfirmSaleRequestSchema = z.object({
  apikey: ApiKeySchema,
  tracking: TrackingIdSchema
});

export const ShortTrackingRequestSchema = z.object({
  apikey: ApiKeySchema,
  original_tracking: TrackingIdSchema,
  short_tracking: z.string().min(1).max(10),
  enabled: z.boolean().default(true)
});

export const TrafficOptimizationRequestSchema = z.object({
  encryptedId: z.string().min(1),
  tracker: TrackingIdSchema.optional()
});

// Costa Rica Kolbi specific schemas
export const KolbiRequestSchema = z.object({
  apikey: ApiKeySchema,
  original_tracking: TrackingIdSchema,
  short_tracking: z.string().min(5).max(6), // Kolbi uses 5-6 char tracking
  enabled: z.boolean().default(true)
});

export const KolbiConfirmSchema = z.object({
  apikey: ApiKeySchema,
  shortTracking: z.string().min(5).max(6)
});

// Analytics and reporting schemas
export const AnalyticsRequestSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  productId: IdSchema.optional(),
  customerId: IdSchema.optional(),
  country: CountryCodeSchema,
  operator: OperatorCodeSchema,
  limit: z.number().int().min(1).max(1000).default(100),
  offset: z.number().int().min(0).default(0)
});

export const ConversionRateResponseSchema = z.object({
  productId: IdSchema,
  totalClicks: z.number().int().min(0),
  totalConversions: z.number().int().min(0),
  conversionRate: z.number().min(0).max(1),
  timeframe: z.string(),
  lastUpdated: z.string().datetime()
});

// Error response schema
export const ErrorResponseSchema = z.object({
  error: z.string(),
  details: z.any().optional(),
  code: z.string().optional(),
  timestamp: z.string().datetime()
});

// Success response schema
export const SuccessResponseSchema = z.object({
  success: z.boolean().default(true),
  data: z.any().optional(),
  message: z.string().optional(),
  timestamp: z.string().datetime()
});

// Utility schemas
export const UtilitySchema = z.object({
  apikey: ApiKeySchema,
  product_id: IdSchema,
  expire_hours: z.number().int().min(0).max(168).default(24) // 0 = never expires, max 7 days
});

export const DecryptSchema = z.object({
  apikey: ApiKeySchema,
  encrypted_id: z.string().min(1)
});

export const BatchEncryptSchema = z.object({
  apikey: ApiKeySchema,
  product_ids: z.array(IdSchema).min(1).max(100), // Max 100 products per batch
  expire_hours: z.number().int().min(0).max(168).default(24) // 0 = never expires
});

export const TrackingUrlSchema = z.object({
  apikey: ApiKeySchema,
  product_id: IdSchema,
  tracking_type: z.enum(['standard', 'auto', 'random']).default('standard'),
  custom_params: z.record(z.string(), z.any()).default({}),
  expire_hours: z.number().int().min(0).max(168).default(24) // 0 = never expires
});

// Validation helper functions
export const validateSchema = <T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; errors: z.ZodError } => {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  } else {
    return { success: false, errors: result.error };
  }
};

export const formatValidationErrors = (errors: z.ZodError): string[] => {
  return errors.errors.map(error => `${error.path.join('.')}: ${error.message}`);
};

// Type exports for use in services
export type Product = z.infer<typeof ProductSchema>;
export type CreateProduct = z.infer<typeof CreateProductSchema>;
export type UpdateProduct = z.infer<typeof UpdateProductSchema>;

export type Campaign = z.infer<typeof CampaignSchema>;
export type CreateCampaign = z.infer<typeof CreateCampaignSchema>;
export type UpdateCampaign = z.infer<typeof UpdateCampaignSchema>;

export type Customer = z.infer<typeof CustomerSchema>;
export type CreateCustomer = z.infer<typeof CreateCustomerSchema>;

export type AuthUser = z.infer<typeof AuthUserSchema>;
export type CreateAuthUser = z.infer<typeof CreateAuthUserSchema>;

export type AnalyticsRequest = z.infer<typeof AnalyticsRequestSchema>;
export type ConversionRateResponse = z.infer<typeof ConversionRateResponseSchema>;
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;
export type SuccessResponse = z.infer<typeof SuccessResponseSchema>;

export type KolbiRequest = z.infer<typeof KolbiRequestSchema>;
export type Utility = z.infer<typeof UtilitySchema>;
export type Decrypt = z.infer<typeof DecryptSchema>;
export type BatchEncrypt = z.infer<typeof BatchEncryptSchema>;
export type TrackingUrl = z.infer<typeof TrackingUrlSchema>;