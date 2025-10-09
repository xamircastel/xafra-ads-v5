import { Request, Response, NextFunction } from 'express';
export interface AuthenticatedRequest extends Request {
    apiKey?: string;
    customerId?: number;
}
export declare const authenticate: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const validateRequest: (schema: any) => (req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=auth.d.ts.map