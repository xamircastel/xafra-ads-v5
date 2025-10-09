import { Request, Response, NextFunction } from 'express';
import cors from 'cors';
export declare const securityMiddleware: (((req: cors.CorsRequest, res: {
    statusCode?: number | undefined;
    setHeader(key: string, value: string): any;
    end(): any;
}, next: (err?: any) => any) => void) | ((req: import("http").IncomingMessage, res: import("http").ServerResponse, next: (err?: unknown) => void) => void))[];
export declare const rateLimitByIP: (windowMs: number, max: number) => (req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=security.d.ts.map