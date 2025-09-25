// Simple database connection for auth-service
// Replaces @xafra/database dependencies

import { PrismaClient } from '@prisma/client';

// Create Prisma client with optimized configuration
export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
  errorFormat: 'pretty',
});

// Connect to database
export async function connectDatabase(): Promise<void> {
  try {
    await prisma.$connect();
    console.log('[AUTH-SERVICE] Database connected successfully');
  } catch (error) {
    console.error('[AUTH-SERVICE] Database connection failed:', error);
    throw error;
  }
}

// Check database health
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    console.error('[AUTH-SERVICE] Database health check failed:', error);
    return false;
  }
}

// Graceful disconnect
export async function disconnectDatabase(): Promise<void> {
  try {
    await prisma.$disconnect();
    console.log('[AUTH-SERVICE] Database disconnected');
  } catch (error) {
    console.error('[AUTH-SERVICE] Database disconnect failed:', error);
  }
}