import { PrismaClient } from '@prisma/client';
declare const prisma: any;
export declare const connectDatabase: () => Promise<void>;
export declare const disconnectDatabase: () => Promise<void>;
export declare const checkDatabaseHealth: () => Promise<boolean>;
export declare const getDatabaseStats: () => Promise<{
    customers: any;
    products: any;
    campaigns: any;
    activeApiKeys: any;
    timestamp: number;
}>;
export declare const withTransaction: <T>(callback: (tx: PrismaClient) => Promise<T>) => Promise<T>;
export declare const executeRawQuery: <T = any>(query: string, params?: any[]) => Promise<T>;
export { prisma };
export default prisma;
//# sourceMappingURL=index.d.ts.map