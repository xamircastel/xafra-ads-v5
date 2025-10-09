import { z } from 'zod';
export declare const IdSchema: z.ZodNumber;
export declare const TimestampSchema: z.ZodNumber;
export declare const TrackingIdSchema: z.ZodString;
export declare const ApiKeySchema: z.ZodString;
export declare const CountryCodeSchema: z.ZodOptional<z.ZodString>;
export declare const OperatorCodeSchema: z.ZodOptional<z.ZodString>;
export declare const ProductSchema: z.ZodObject<{
    id: z.ZodNumber;
    customer_id: z.ZodNumber;
    name: z.ZodString;
    url_redirect_success: z.ZodString;
    url_redirect_postback: z.ZodOptional<z.ZodString>;
    method_postback: z.ZodDefault<z.ZodEnum<["GET", "POST"]>>;
    country: z.ZodOptional<z.ZodString>;
    operator: z.ZodOptional<z.ZodString>;
    random: z.ZodDefault<z.ZodNumber>;
    status: z.ZodDefault<z.ZodNumber>;
    creation_date: z.ZodNumber;
    modification_date: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    creation_date?: number;
    customer_id?: number;
    status?: number;
    modification_date?: number;
    name?: string;
    country?: string;
    operator?: string;
    id?: number;
    url_redirect_success?: string;
    url_redirect_postback?: string;
    method_postback?: "GET" | "POST";
    random?: number;
}, {
    creation_date?: number;
    customer_id?: number;
    status?: number;
    modification_date?: number;
    name?: string;
    country?: string;
    operator?: string;
    id?: number;
    url_redirect_success?: string;
    url_redirect_postback?: string;
    method_postback?: "GET" | "POST";
    random?: number;
}>;
export declare const CreateProductSchema: z.ZodObject<Omit<{
    id: z.ZodNumber;
    customer_id: z.ZodNumber;
    name: z.ZodString;
    url_redirect_success: z.ZodString;
    url_redirect_postback: z.ZodOptional<z.ZodString>;
    method_postback: z.ZodDefault<z.ZodEnum<["GET", "POST"]>>;
    country: z.ZodOptional<z.ZodString>;
    operator: z.ZodOptional<z.ZodString>;
    random: z.ZodDefault<z.ZodNumber>;
    status: z.ZodDefault<z.ZodNumber>;
    creation_date: z.ZodNumber;
    modification_date: z.ZodOptional<z.ZodNumber>;
}, "creation_date" | "modification_date" | "id">, "strip", z.ZodTypeAny, {
    customer_id?: number;
    status?: number;
    name?: string;
    country?: string;
    operator?: string;
    url_redirect_success?: string;
    url_redirect_postback?: string;
    method_postback?: "GET" | "POST";
    random?: number;
}, {
    customer_id?: number;
    status?: number;
    name?: string;
    country?: string;
    operator?: string;
    url_redirect_success?: string;
    url_redirect_postback?: string;
    method_postback?: "GET" | "POST";
    random?: number;
}>;
export declare const UpdateProductSchema: z.ZodObject<Omit<{
    id: z.ZodOptional<z.ZodNumber>;
    customer_id: z.ZodOptional<z.ZodNumber>;
    name: z.ZodOptional<z.ZodString>;
    url_redirect_success: z.ZodOptional<z.ZodString>;
    url_redirect_postback: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    method_postback: z.ZodOptional<z.ZodDefault<z.ZodEnum<["GET", "POST"]>>>;
    country: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    operator: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    random: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
    status: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
    creation_date: z.ZodOptional<z.ZodNumber>;
    modification_date: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
}, "creation_date" | "id">, "strip", z.ZodTypeAny, {
    customer_id?: number;
    status?: number;
    modification_date?: number;
    name?: string;
    country?: string;
    operator?: string;
    url_redirect_success?: string;
    url_redirect_postback?: string;
    method_postback?: "GET" | "POST";
    random?: number;
}, {
    customer_id?: number;
    status?: number;
    modification_date?: number;
    name?: string;
    country?: string;
    operator?: string;
    url_redirect_success?: string;
    url_redirect_postback?: string;
    method_postback?: "GET" | "POST";
    random?: number;
}>;
export declare const CampaignSchema: z.ZodObject<{
    id: z.ZodNumber;
    creation_date: z.ZodNumber;
    modification_date: z.ZodOptional<z.ZodNumber>;
    id_product: z.ZodNumber;
    tracking: z.ZodString;
    status: z.ZodDefault<z.ZodNumber>;
    uuid: z.ZodString;
    status_post_back: z.ZodDefault<z.ZodNumber>;
    xafra_tracking_id: z.ZodString;
    short_tracking: z.ZodOptional<z.ZodString>;
    country: z.ZodOptional<z.ZodString>;
    operator: z.ZodOptional<z.ZodString>;
    date_post_back: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    creation_date?: number;
    status?: number;
    modification_date?: number;
    country?: string;
    operator?: string;
    id?: number;
    id_product?: number;
    tracking?: string;
    uuid?: string;
    status_post_back?: number;
    xafra_tracking_id?: string;
    short_tracking?: string;
    date_post_back?: number;
}, {
    creation_date?: number;
    status?: number;
    modification_date?: number;
    country?: string;
    operator?: string;
    id?: number;
    id_product?: number;
    tracking?: string;
    uuid?: string;
    status_post_back?: number;
    xafra_tracking_id?: string;
    short_tracking?: string;
    date_post_back?: number;
}>;
export declare const CreateCampaignSchema: z.ZodObject<Omit<{
    id: z.ZodNumber;
    creation_date: z.ZodNumber;
    modification_date: z.ZodOptional<z.ZodNumber>;
    id_product: z.ZodNumber;
    tracking: z.ZodString;
    status: z.ZodDefault<z.ZodNumber>;
    uuid: z.ZodString;
    status_post_back: z.ZodDefault<z.ZodNumber>;
    xafra_tracking_id: z.ZodString;
    short_tracking: z.ZodOptional<z.ZodString>;
    country: z.ZodOptional<z.ZodString>;
    operator: z.ZodOptional<z.ZodString>;
    date_post_back: z.ZodOptional<z.ZodNumber>;
}, "creation_date" | "modification_date" | "id" | "uuid" | "xafra_tracking_id">, "strip", z.ZodTypeAny, {
    status?: number;
    country?: string;
    operator?: string;
    id_product?: number;
    tracking?: string;
    status_post_back?: number;
    short_tracking?: string;
    date_post_back?: number;
}, {
    status?: number;
    country?: string;
    operator?: string;
    id_product?: number;
    tracking?: string;
    status_post_back?: number;
    short_tracking?: string;
    date_post_back?: number;
}>;
export declare const UpdateCampaignSchema: z.ZodObject<Omit<{
    id: z.ZodOptional<z.ZodNumber>;
    creation_date: z.ZodOptional<z.ZodNumber>;
    modification_date: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
    id_product: z.ZodOptional<z.ZodNumber>;
    tracking: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
    uuid: z.ZodOptional<z.ZodString>;
    status_post_back: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
    xafra_tracking_id: z.ZodOptional<z.ZodString>;
    short_tracking: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    country: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    operator: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    date_post_back: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
}, "creation_date" | "id" | "id_product" | "tracking" | "uuid" | "xafra_tracking_id">, "strip", z.ZodTypeAny, {
    status?: number;
    modification_date?: number;
    country?: string;
    operator?: string;
    status_post_back?: number;
    short_tracking?: string;
    date_post_back?: number;
}, {
    status?: number;
    modification_date?: number;
    country?: string;
    operator?: string;
    status_post_back?: number;
    short_tracking?: string;
    date_post_back?: number;
}>;
export declare const CustomerSchema: z.ZodObject<{
    id: z.ZodNumber;
    name: z.ZodString;
    email: z.ZodString;
    country: z.ZodOptional<z.ZodString>;
    operator: z.ZodOptional<z.ZodString>;
    status: z.ZodDefault<z.ZodNumber>;
    creation_date: z.ZodNumber;
    modification_date: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    creation_date?: number;
    status?: number;
    modification_date?: number;
    name?: string;
    country?: string;
    operator?: string;
    id?: number;
    email?: string;
}, {
    creation_date?: number;
    status?: number;
    modification_date?: number;
    name?: string;
    country?: string;
    operator?: string;
    id?: number;
    email?: string;
}>;
export declare const CreateCustomerSchema: z.ZodObject<Omit<{
    id: z.ZodNumber;
    name: z.ZodString;
    email: z.ZodString;
    country: z.ZodOptional<z.ZodString>;
    operator: z.ZodOptional<z.ZodString>;
    status: z.ZodDefault<z.ZodNumber>;
    creation_date: z.ZodNumber;
    modification_date: z.ZodOptional<z.ZodNumber>;
}, "creation_date" | "modification_date" | "id">, "strip", z.ZodTypeAny, {
    status?: number;
    name?: string;
    country?: string;
    operator?: string;
    email?: string;
}, {
    status?: number;
    name?: string;
    country?: string;
    operator?: string;
    email?: string;
}>;
export declare const AuthUserSchema: z.ZodObject<{
    id: z.ZodNumber;
    customer_id: z.ZodNumber;
    apikey: z.ZodString;
    status: z.ZodDefault<z.ZodNumber>;
    creation_date: z.ZodNumber;
    modification_date: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    apikey?: string;
    creation_date?: number;
    customer_id?: number;
    status?: number;
    modification_date?: number;
    id?: number;
}, {
    apikey?: string;
    creation_date?: number;
    customer_id?: number;
    status?: number;
    modification_date?: number;
    id?: number;
}>;
export declare const CreateAuthUserSchema: z.ZodObject<Omit<{
    id: z.ZodNumber;
    customer_id: z.ZodNumber;
    apikey: z.ZodString;
    status: z.ZodDefault<z.ZodNumber>;
    creation_date: z.ZodNumber;
    modification_date: z.ZodOptional<z.ZodNumber>;
}, "apikey" | "creation_date" | "modification_date" | "id">, "strip", z.ZodTypeAny, {
    customer_id?: number;
    status?: number;
}, {
    customer_id?: number;
    status?: number;
}>;
export declare const EncryptProductRequestSchema: z.ZodObject<{
    productId: z.ZodNumber;
    country: z.ZodOptional<z.ZodString>;
    operator: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    country?: string;
    operator?: string;
    productId?: number;
}, {
    country?: string;
    operator?: string;
    productId?: number;
}>;
export declare const DecryptProductRequestSchema: z.ZodObject<{
    encryptedId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    encryptedId?: string;
}, {
    encryptedId?: string;
}>;
export declare const ConfirmSaleRequestSchema: z.ZodObject<{
    apikey: z.ZodString;
    tracking: z.ZodString;
}, "strip", z.ZodTypeAny, {
    apikey?: string;
    tracking?: string;
}, {
    apikey?: string;
    tracking?: string;
}>;
export declare const ShortTrackingRequestSchema: z.ZodObject<{
    apikey: z.ZodString;
    original_tracking: z.ZodString;
    short_tracking: z.ZodString;
    enabled: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    apikey?: string;
    short_tracking?: string;
    original_tracking?: string;
    enabled?: boolean;
}, {
    apikey?: string;
    short_tracking?: string;
    original_tracking?: string;
    enabled?: boolean;
}>;
export declare const TrafficOptimizationRequestSchema: z.ZodObject<{
    encryptedId: z.ZodString;
    tracker: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    tracker?: string;
    encryptedId?: string;
}, {
    tracker?: string;
    encryptedId?: string;
}>;
export declare const KolbiRequestSchema: z.ZodObject<{
    apikey: z.ZodString;
    original_tracking: z.ZodString;
    short_tracking: z.ZodString;
    enabled: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    apikey?: string;
    short_tracking?: string;
    original_tracking?: string;
    enabled?: boolean;
}, {
    apikey?: string;
    short_tracking?: string;
    original_tracking?: string;
    enabled?: boolean;
}>;
export declare const KolbiConfirmSchema: z.ZodObject<{
    apikey: z.ZodString;
    shortTracking: z.ZodString;
}, "strip", z.ZodTypeAny, {
    apikey?: string;
    shortTracking?: string;
}, {
    apikey?: string;
    shortTracking?: string;
}>;
export declare const AnalyticsRequestSchema: z.ZodObject<{
    startDate: z.ZodOptional<z.ZodString>;
    endDate: z.ZodOptional<z.ZodString>;
    productId: z.ZodOptional<z.ZodNumber>;
    customerId: z.ZodOptional<z.ZodNumber>;
    country: z.ZodOptional<z.ZodString>;
    operator: z.ZodOptional<z.ZodString>;
    limit: z.ZodDefault<z.ZodNumber>;
    offset: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    customerId?: number;
    country?: string;
    operator?: string;
    productId?: number;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
}, {
    customerId?: number;
    country?: string;
    operator?: string;
    productId?: number;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
}>;
export declare const ConversionRateResponseSchema: z.ZodObject<{
    productId: z.ZodNumber;
    totalClicks: z.ZodNumber;
    totalConversions: z.ZodNumber;
    conversionRate: z.ZodNumber;
    timeframe: z.ZodString;
    lastUpdated: z.ZodString;
}, "strip", z.ZodTypeAny, {
    productId?: number;
    totalClicks?: number;
    totalConversions?: number;
    conversionRate?: number;
    timeframe?: string;
    lastUpdated?: string;
}, {
    productId?: number;
    totalClicks?: number;
    totalConversions?: number;
    conversionRate?: number;
    timeframe?: string;
    lastUpdated?: string;
}>;
export declare const ErrorResponseSchema: z.ZodObject<{
    error: z.ZodString;
    details: z.ZodOptional<z.ZodAny>;
    code: z.ZodOptional<z.ZodString>;
    timestamp: z.ZodString;
}, "strip", z.ZodTypeAny, {
    error?: string;
    timestamp?: string;
    code?: string;
    details?: any;
}, {
    error?: string;
    timestamp?: string;
    code?: string;
    details?: any;
}>;
export declare const SuccessResponseSchema: z.ZodObject<{
    success: z.ZodDefault<z.ZodBoolean>;
    data: z.ZodOptional<z.ZodAny>;
    message: z.ZodOptional<z.ZodString>;
    timestamp: z.ZodString;
}, "strip", z.ZodTypeAny, {
    data?: any;
    timestamp?: string;
    message?: string;
    success?: boolean;
}, {
    data?: any;
    timestamp?: string;
    message?: string;
    success?: boolean;
}>;
export declare const UtilitySchema: z.ZodObject<{
    apikey: z.ZodString;
    product_id: z.ZodNumber;
    expire_hours: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    apikey?: string;
    product_id?: number;
    expire_hours?: number;
}, {
    apikey?: string;
    product_id?: number;
    expire_hours?: number;
}>;
export declare const DecryptSchema: z.ZodObject<{
    apikey: z.ZodString;
    encrypted_id: z.ZodString;
}, "strip", z.ZodTypeAny, {
    apikey?: string;
    encrypted_id?: string;
}, {
    apikey?: string;
    encrypted_id?: string;
}>;
export declare const BatchEncryptSchema: z.ZodObject<{
    apikey: z.ZodString;
    product_ids: z.ZodArray<z.ZodNumber, "many">;
    expire_hours: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    apikey?: string;
    expire_hours?: number;
    product_ids?: number[];
}, {
    apikey?: string;
    expire_hours?: number;
    product_ids?: number[];
}>;
export declare const TrackingUrlSchema: z.ZodObject<{
    apikey: z.ZodString;
    product_id: z.ZodNumber;
    tracking_type: z.ZodDefault<z.ZodEnum<["standard", "auto", "random"]>>;
    custom_params: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodAny>>;
    expire_hours: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    apikey?: string;
    product_id?: number;
    expire_hours?: number;
    tracking_type?: "random" | "standard" | "auto";
    custom_params?: Record<string, any>;
}, {
    apikey?: string;
    product_id?: number;
    expire_hours?: number;
    tracking_type?: "random" | "standard" | "auto";
    custom_params?: Record<string, any>;
}>;
export declare const validateSchema: <T>(schema: z.ZodSchema<T>, data: unknown) => {
    success: true;
    data: T;
} | {
    success: false;
    errors: z.ZodError;
};
export declare const formatValidationErrors: (errors: z.ZodError) => string[];
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
//# sourceMappingURL=index.d.ts.map