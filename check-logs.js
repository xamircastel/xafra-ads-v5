const { prisma } = require('./packages/database/src/index.js');

async function checkPostgreSQLLogs() {
  try {
    console.log('🔍 Verificando información de la base de datos...\n');
    
    // Ver configuración de logging
    const logSettings = await prisma.$queryRaw`
      SELECT name, setting, unit, context 
      FROM pg_settings 
      WHERE name IN ('log_statement', 'log_min_duration_statement', 'logging_collector', 'wal_level')
    `;
    
    console.log('📋 Configuración de logs:');
    console.table(logSettings);
    
    // Ver actividad reciente
    const activity = await prisma.$queryRaw`
      SELECT 
        query_start,
        state,
        left(query, 100) as query_preview
      FROM pg_stat_activity 
      WHERE datname = 'xafra-ads' 
        AND query_start > NOW() - INTERVAL '24 hours'
        AND query NOT LIKE '%pg_stat_activity%'
      ORDER BY query_start DESC
      LIMIT 10
    `;
    
    console.log('\n📊 Actividad reciente (últimas 24h):');
    console.table(activity);
    
    // Ver información del servidor
    const serverInfo = await prisma.$queryRaw`
      SELECT version() as postgresql_version
    `;
    
    console.log('\n🛠️ Información del servidor:');
    console.table(serverInfo);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkPostgreSQLLogs();