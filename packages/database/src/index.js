"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = exports.executeRawQuery = exports.withTransaction = exports.getDatabaseStats = exports.checkDatabaseHealth = exports.disconnectDatabase = exports.connectDatabase = void 0;
const client_1 = require("@prisma/client");
// Initialize Prisma Client with configuration
const prisma = new client_1.PrismaClient({
    log: process.env.NODE_ENV === 'development'
        ? ['query', 'info', 'warn', 'error']
        : ['warn', 'error'],
    errorFormat: 'pretty',
});
exports.prisma = prisma;
// Connection management
const connectDatabase = async () => {
    try {
        await prisma.$connect();
        console.log('Database connected successfully');
    }
    catch (error) {
        console.error('Database connection failed:', error);
        throw error;
    }
};
exports.connectDatabase = connectDatabase;
const disconnectDatabase = async () => {
    try {
        await prisma.$disconnect();
        console.log('Database disconnected successfully');
    }
    catch (error) {
        console.error('Database disconnection failed:', error);
        throw error;
    }
};
exports.disconnectDatabase = disconnectDatabase;
// Health check
const checkDatabaseHealth = async () => {
    try {
        await prisma.$queryRaw `SELECT 1`;
        return true;
    }
    catch (error) {
        console.error('Database health check failed:', error);
        return false;
    }
};
exports.checkDatabaseHealth = checkDatabaseHealth;
// Database utilities
const getDatabaseStats = async () => {
    try {
        const [customers, products, campaigns, activeApiKeys] = await Promise.all([
            prisma.customer.count(),
            prisma.product.count(),
            prisma.campaign.count(),
            prisma.authUser.count({ where: { status: 1 } })
        ]);
        return {
            customers,
            products,
            campaigns,
            activeApiKeys,
            timestamp: Date.now()
        };
    }
    catch (error) {
        console.error('Failed to get database stats:', error);
        throw error;
    }
};
exports.getDatabaseStats = getDatabaseStats;
// Transaction helper
const withTransaction = async (callback) => {
    return prisma.$transaction(callback);
};
exports.withTransaction = withTransaction;
// Raw query helper with performance tracking
const executeRawQuery = async (query, params) => {
    const start = Date.now();
    try {
        const result = params
            ? await prisma.$queryRawUnsafe(query, ...params)
            : await prisma.$queryRawUnsafe(query);
        const duration = Date.now() - start;
        if (duration > 1000) {
            console.warn(`Slow query detected: ${duration}ms`, { query });
        }
        return result;
    }
    catch (error) {
        console.error('Raw query execution failed:', error, { query, params });
        throw error;
    }
};
exports.executeRawQuery = executeRawQuery;
exports.default = prisma;
// Export Prisma types
// export type { 
//   Customer, 
//   Product, 
//   Campaign, 
//   AuthUser, 
//   Analytics,
//   PostbackLog,
//   RateLimit,
//   Config 
// } from '@prisma/client';
// Process cleanup
process.on('beforeExit', async () => {
    await (0, exports.disconnectDatabase)();
});
process.on('SIGINT', async () => {
    await (0, exports.disconnectDatabase)();
    process.exit(0);
});
process.on('SIGTERM', async () => {
    await (0, exports.disconnectDatabase)();
    process.exit(0);
});
//# sourceMappingURL=index.js.map