const { Client } = require('pg');

const client = new Client({
  host: '34.28.245.62',
  port: 5432,
  database: 'xafra-ads',
  user: 'postgres',
  password: 'XafraTech2025!'
});

(async () => {
  try {
    await client.connect();
    console.log('✅ Conectado a la base de datos');
    console.log('');
    
    // Verificar estructura de production.customers
    const columns = await client.query(`
      SELECT 
        column_name, 
        data_type, 
        character_maximum_length,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_schema = 'production'
        AND table_name = 'customers'
      ORDER BY ordinal_position
    `);
    
    console.log('📋 ESTRUCTURA DE production.customers:');
    console.log('');
    columns.rows.forEach(col => {
      const maxLen = col.character_maximum_length ? `(${col.character_maximum_length})` : '';
      const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
      const defVal = col.column_default ? ` DEFAULT ${col.column_default}` : '';
      console.log(`   ${col.column_name}: ${col.data_type}${maxLen} ${nullable}${defVal}`);
    });
    
    // Verificar constraints
    const constraints = await client.query(`
      SELECT
        tc.constraint_name,
        tc.constraint_type,
        kcu.column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      WHERE tc.table_schema = 'production'
        AND tc.table_name = 'customers'
      ORDER BY tc.constraint_type, tc.constraint_name
    `);
    
    console.log('');
    console.log('🔑 CONSTRAINTS DE production.customers:');
    console.log('');
    if (constraints.rows.length === 0) {
      console.log('   ❌ NO HAY CONSTRAINTS DEFINIDOS');
    } else {
      constraints.rows.forEach(c => {
        console.log(`   ${c.constraint_type}: ${c.constraint_name} en ${c.column_name}`);
      });
    }
    
    // Verificar índices
    const indices = await client.query(`
      SELECT
        indexname,
        indexdef
      FROM pg_indexes
      WHERE schemaname = 'production'
        AND tablename = 'customers'
    `);
    
    console.log('');
    console.log('📇 ÍNDICES DE production.customers:');
    console.log('');
    if (indices.rows.length === 0) {
      console.log('   ⚠️  NO HAY ÍNDICES');
    } else {
      indices.rows.forEach(idx => {
        console.log(`   ${idx.indexname}`);
        console.log(`      ${idx.indexdef}`);
      });
    }
    
    // Comparar con staging.customers
    console.log('');
    console.log('========================================');
    console.log('📋 COMPARACIÓN CON staging.customers:');
    console.log('========================================');
    console.log('');
    
    const stagingConstraints = await client.query(`
      SELECT
        tc.constraint_name,
        tc.constraint_type,
        kcu.column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      WHERE tc.table_schema = 'staging'
        AND tc.table_name = 'customers'
      ORDER BY tc.constraint_type, tc.constraint_name
    `);
    
    console.log('🔑 CONSTRAINTS DE staging.customers:');
    console.log('');
    stagingConstraints.rows.forEach(c => {
      console.log(`   ${c.constraint_type}: ${c.constraint_name} en ${c.column_name}`);
    });
    
    await client.end();
    
  } catch (error) {
    console.error('❌ ERROR:', error.message);
    await client.end();
    process.exit(1);
  }
})();
