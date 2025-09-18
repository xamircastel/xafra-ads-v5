const { prisma } = require('./packages/database/src/index.js');

async function checkMigrationHistory() {
  try {
    console.log('🔍 Verificando historial de migraciones...\n');
    
    // Verificar la tabla _prisma_migrations
    const migrations = await prisma.$queryRaw`
      SELECT migration_name, finished_at, applied_steps_count 
      FROM _prisma_migrations 
      ORDER BY finished_at DESC
    `;
    
    console.log('📋 Migraciones aplicadas:');
    console.table(migrations);
    
    // Verificar si hay alguna actividad reciente en las tablas
    console.log('\n🔍 Verificando actividad reciente en tablas...');
    
    // Verificar si las tablas tienen algún tipo de timestamp
    try {
      const tablesInfo = await prisma.$queryRaw`
        SELECT 
          schemaname,
          tablename,
          rowcount
        FROM (
          SELECT 
            schemaname,
            tablename,
            n_tup_ins - n_tup_del as rowcount
          FROM pg_stat_user_tables 
          WHERE schemaname = 'public'
        ) t
        ORDER BY tablename
      `;
      
      console.log('📊 Estadísticas de tablas:');
      console.table(tablesInfo);
      
    } catch (error) {
      console.log('No se pudieron obtener estadísticas de tablas');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkMigrationHistory();