// Simple database replacement for @xafra/database

import { PrismaClient } from '@prisma/client';

// Create a simple prisma instance
export const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || ''
    }
  }
});

// Simple database connection functions
export const connectDatabase = async () => {
  try {
    await prisma.$connect();
    console.log('[DATABASE] Connected to database');
    return true;
  } catch (error) {
    console.error('[DATABASE] Connection failed:', error);
    throw error;
  }
};

export const checkDatabaseHealth = async () => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { healthy: true, timestamp: new Date() };
  } catch (error) {
    return { healthy: false, error: error, timestamp: new Date() };
  }
};