// Temporary script to check actual database schema
const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

async function checkSchema() {
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL
      }
    }
  });

  try {
    console.log('DATABASE_URL:', process.env.DATABASE_URL);
    
    // Query to get table structure for auth_users
    const schema = process.env.NODE_ENV === 'production' ? 'production' : 
                  process.env.NODE_ENV === 'staging' ? 'staging' : 'public';
    
    console.log(`Checking schema: ${schema}`);
    
    const tableInfo = await prisma.$queryRawUnsafe(`
      SELECT 
        column_name, 
        data_type, 
        is_nullable, 
        column_default,
        character_maximum_length
      FROM information_schema.columns 
      WHERE table_schema = $1 
        AND table_name = 'auth_users'
      ORDER BY ordinal_position;
    `, schema);
    
    console.log('Auth Users Table Structure:');
    console.table(tableInfo);

    // Also check if the table exists in staging schema
    const tableExists = await prisma.$queryRawUnsafe(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = $1 
        AND table_name = 'auth_users'
      );
    `, schema);
    
    console.log(`Table auth_users exists in ${schema} schema:`, tableExists[0].exists);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkSchema();