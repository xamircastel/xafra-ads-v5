import { PrismaClient } from '@prisma/client';

// Initialize Prisma Client with configuration
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' 
    ? ['query', 'info', 'warn', 'error']
    : ['warn', 'error'],
  errorFormat: 'pretty',
});

// Connection management
export const connectDatabase = async (): Promise<void> => {
  try {
    await prisma.$connect();
    console.log('Database connected successfully');
  } catch (error) {
    console.error('Database connection failed:', error);
    throw error;
  }
};

export const disconnectDatabase = async (): Promise<void> => {
  try {
    await prisma.$disconnect();
    console.log('Database disconnected successfully');
  } catch (error) {
    console.error('Database disconnection failed:', error);
    throw error;
  }
};

// Health check
export const checkDatabaseHealth = async (): Promise<boolean> => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    console.error('Database health check failed:', error);
    return false;
  }
};

// Database utilities
export const getDatabaseStats = async () => {
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
  } catch (error) {
    console.error('Failed to get database stats:', error);
    throw error;
  }
};

// Transaction helper
export const withTransaction = async <T>(
  callback: (tx: PrismaClient) => Promise<T>
): Promise<T> => {
  return prisma.$transaction(callback);
};

// Raw query helper with performance tracking
export const executeRawQuery = async <T = any>(
  query: string,
  params?: any[]
): Promise<T> => {
  const start = Date.now();
  try {
    const result = params 
      ? await (prisma.$queryRawUnsafe as any)(query, ...params)
      : await (prisma.$queryRawUnsafe as any)(query);
    
    const duration = Date.now() - start;
    if (duration > 1000) {
      console.warn(`Slow query detected: ${duration}ms`, { query });
    }
    
    return result;
  } catch (error) {
    console.error('Raw query execution failed:', error, { query, params });
    throw error;
  }
};

// Export the Prisma client instance
export { prisma };
export default prisma;

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
  await disconnectDatabase();
});

process.on('SIGINT', async () => {
  await disconnectDatabase();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await disconnectDatabase();
  process.exit(0);
});