export declare const generateUUID: () => string;
export declare const generateApiKey: () => string;
export declare const generateTrackingId: (prefix?: string) => string;
export declare const generateShortTracking: () => string;
export declare const isValidUrl: (url: string) => boolean;
export declare const buildTrackingUrl: (baseUrl: string, encryptedId: string, path?: "ads" | "ads/tr" | "ads/random", tracker?: string) => string;
export declare const buildConfirmUrl: (baseUrl: string, apiKey: string, tracking: string, isShort?: boolean) => string;
export declare const sanitizeString: (str: string) => string;
export declare const truncateString: (str: string, maxLength: number) => string;
export declare const normalizeCountryCode: (country: string) => string;
export declare const normalizeOperatorCode: (operator: string) => string;
export declare const isKolbiOperator: (country?: string, operator?: string) => boolean;
export declare const getCurrentTimestamp: () => number;
export declare const formatDate: (timestamp: number) => string;
export declare const isWithinTimeframe: (timestamp: number, hoursAgo: number) => boolean;
export declare const isValidProductId: (id: any) => id is number;
export declare const isValidApiKey: (key: any) => key is string;
export declare const isValidTrackingId: (tracking: any) => tracking is string;
export declare const measureTime: <T>(fn: () => T) => {
    result: T;
    duration: number;
};
export declare const measureTimeAsync: <T>(fn: () => Promise<T>) => Promise<{
    result: T;
    duration: number;
}>;
export declare const getClientIP: (req: any) => string;
export declare const getUserAgent: (req: any) => string;
export declare class XafraError extends Error {
    code: string;
    statusCode: number;
    details?: any;
    constructor(message: string, code: string, statusCode?: number, details?: any);
}
export declare const createError: (message: string, code: string, statusCode?: number, details?: any) => XafraError;
export declare const retry: <T>(fn: () => Promise<T>, maxAttempts?: number, delay?: number) => Promise<T>;
export declare const createRateLimiter: (maxRequests: number, windowMs: number) => (identifier: string) => {
    allowed: boolean;
    remaining: number;
    resetTime: number;
};
export declare const calculateConversionRate: (conversions: number, totalClicks: number) => number;
export declare const calculateWeightedDistribution: (conversionRates: number[]) => number[];
export declare const getEnvVar: (name: string, defaultValue?: string) => string;
export declare const getEnvVarAsNumber: (name: string, defaultValue?: number) => number;
export declare const getEnvVarAsBoolean: (name: string, defaultValue?: boolean) => boolean;
//# sourceMappingURL=index.d.ts.map