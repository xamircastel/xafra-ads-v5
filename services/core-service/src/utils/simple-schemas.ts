// Simple validation schema replacement for @xafra/shared/validation

export const UtilitySchema = {
  // Simple schema placeholder - in production use zod or joi
  body: {
    apikey: { required: true },
    product_id: { required: true },
    expire_hours: { required: false }
  }
};