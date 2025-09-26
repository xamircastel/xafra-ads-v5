import winston from 'winston';
export declare const logger: winston.Logger;
export declare const performanceLogger: {
    track: (operation: string, startTime: number, metadata?: Record<string, any>) => number;
};
export declare const loggers: {
    request: (method: string, url: string, statusCode: number, duration: number, metadata?: Record<string, any>) => void;
    database: (operation: string, table: string, duration: number, metadata?: Record<string, any>) => void;
    tracking: (action: string, trackingId: string, productId?: number, metadata?: Record<string, any>) => void;
    auth: (event: string, apikey: string | null, customerId: number | null, metadata?: Record<string, any>) => void;
    security: (event: string, ip: string, metadata?: Record<string, any>) => void;
    error: (message: string, error: Error, metadata?: Record<string, any>) => void;
};
//# sourceMappingURL=index.d.ts.map