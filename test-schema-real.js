// Test simple para verificar schema real
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkSchema() {
  try {
    // Query que muestra exactamente qué schema está usando
    const result = await prisma.$queryRaw`
      SELECT 
        current_schema() as current_schema,
        current_schemas(true) as search_path
    `;
    
    console.log('🔍 Schema actual de Prisma:', result);
    
    // Verificar si puede encontrar la tabla campaign
    const testQuery = await prisma.$queryRaw`
      SELECT schemaname, tablename 
      FROM pg_tables 
      WHERE tablename = 'campaign'
    `;
    
    console.log('📋 Tablas "campaign" encontradas:', testQuery);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkSchema();