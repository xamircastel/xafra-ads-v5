const { Client } = require('pg');
const fs = require('fs');

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
    console.log('✅ Conectado a la base de datos xafra-ads');
    console.log('');
    
    // Verificar schema production
    const schemaCheck = await client.query(`
      SELECT schema_name 
      FROM information_schema.schemata 
      WHERE schema_name = 'production'
    `);
    
    if (schemaCheck.rows.length === 0) {
      console.log('❌ ERROR: Schema production no existe');
      await client.end();
      process.exit(1);
    }
    console.log('✅ Schema production existe');
    
    // Verificar production.customers
    const customersCheck = await client.query(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = 'production' 
        AND table_name = 'customers'
    `);
    
    if (customersCheck.rows[0].count === '0') {
      console.log('❌ ERROR: Tabla production.customers no existe');
      await client.end();
      process.exit(1);
    }
    
    const customerCount = await client.query('SELECT COUNT(*) as total FROM production.customers');
    console.log(`✅ Tabla production.customers existe con ${customerCount.rows[0].total} registros`);
    
    // Verificar si production.conversions ya existe
    const conversionsCheck = await client.query(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = 'production' 
        AND table_name = 'conversions'
    `);
    
    if (conversionsCheck.rows[0].count === '1') {
      console.log('⚠️  ADVERTENCIA: La tabla production.conversions YA EXISTE');
      const conversionCount = await client.query('SELECT COUNT(*) as total FROM production.conversions');
      console.log(`   Registros actuales: ${conversionCount.rows[0].total}`);
      console.log('');
      console.log('❓ ¿Desea continuar de todos modos? La migración usará CREATE IF NOT EXISTS');
    } else {
      console.log('✅ La tabla production.conversions NO EXISTE, procederemos a crearla');
    }
    
    console.log('');
    console.log('🔧 Ejecutando SQL de migración...');
    console.log('');
    
    // PASO 1: Crear schema (si no existe)
    console.log('   [1/7] Verificando schema production...');
    try {
      await client.query('CREATE SCHEMA IF NOT EXISTS production');
      console.log('      ✅ Schema production OK');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('      ⚠️  Schema ya existe, continuando...');
      } else {
        throw error;
      }
    }
    
    // PASO 2: Crear tabla conversions
    console.log('   [2/7] Creando tabla production.conversions...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS production.conversions (
        id BIGSERIAL PRIMARY KEY,
        customer_id BIGINT NOT NULL,
        tracking VARCHAR(255) NOT NULL,
        id_product VARCHAR(50),
        msisdn VARCHAR(20),
        empello_token VARCHAR(300),
        source VARCHAR(50) NOT NULL,
        status_post_back SMALLINT,
        date_post_back TIMESTAMP,
        campaign VARCHAR(20),
        country VARCHAR(10),
        operator VARCHAR(50),
        conversion_date TIMESTAMP DEFAULT NOW(),
        
        CONSTRAINT fk_conversions_customer 
          FOREIGN KEY (customer_id) 
          REFERENCES production.customers(id_customer)
          ON DELETE CASCADE
      )
    `);
    console.log('      ✅ Tabla creada exitosamente');
    
    // PASO 3-7: Crear índices
    const indices = [
      { name: 'idx_conversions_tracking', sql: 'CREATE INDEX IF NOT EXISTS idx_conversions_tracking ON production.conversions(tracking)' },
      { name: 'idx_conversions_customer_id', sql: 'CREATE INDEX IF NOT EXISTS idx_conversions_customer_id ON production.conversions(customer_id)' },
      { name: 'idx_conversions_conversion_date', sql: 'CREATE INDEX IF NOT EXISTS idx_conversions_conversion_date ON production.conversions(conversion_date)' },
      { name: 'idx_conversions_source', sql: 'CREATE INDEX IF NOT EXISTS idx_conversions_source ON production.conversions(source)' },
      { name: 'idx_conversions_customer_tracking', sql: 'CREATE INDEX IF NOT EXISTS idx_conversions_customer_tracking ON production.conversions(customer_id, tracking)' }
    ];
    
    for (let i = 0; i < indices.length; i++) {
      const idx = indices[i];
      console.log(`   [${i+3}/7] Creando índice ${idx.name}...`);
      await client.query(idx.sql);
      console.log(`      ✅ Índice ${idx.name} creado`);
    }
    
    console.log('');
    console.log('✅ Todos los statements ejecutados exitosamente');
    console.log('');
    
    // Verificación final
    const finalCheck = await client.query(`
      SELECT 
        COUNT(*) as total_registros
      FROM production.conversions
    `);
    
    const indicesCheck = await client.query(`
      SELECT COUNT(*) as total_indices
      FROM pg_indexes 
      WHERE schemaname = 'production' 
        AND tablename = 'conversions'
    `);
    
    const columnsCheck = await client.query(`
      SELECT column_name, data_type, character_maximum_length
      FROM information_schema.columns
      WHERE table_schema = 'production'
        AND table_name = 'conversions'
      ORDER BY ordinal_position
    `);
    
    console.log('========================================');
    console.log('✅ ¡MIGRACIÓN COMPLETADA EXITOSAMENTE!');
    console.log('========================================');
    console.log('');
    console.log('📊 RESUMEN:');
    console.log(`   • Tabla: production.conversions`);
    console.log(`   • Columnas: ${columnsCheck.rows.length}`);
    console.log(`   • Índices: ${indicesCheck.rows[0].total_indices}`);
    console.log(`   • Registros: ${finalCheck.rows[0].total_registros}`);
    console.log('');
    console.log('📋 ESTRUCTURA DE COLUMNAS:');
    columnsCheck.rows.forEach(col => {
      const maxLength = col.character_maximum_length ? `(${col.character_maximum_length})` : '';
      console.log(`   • ${col.column_name}: ${col.data_type}${maxLength}`);
    });
    
    await client.end();
    console.log('');
    console.log('✅ Conexión cerrada');
    console.log('');
    console.log('🚀 Siguiente paso: Actualizar código para usar schema dinámico');
    
  } catch (error) {
    console.error('');
    console.error('❌ ERROR durante la migración:');
    console.error(`   Mensaje: ${error.message}`);
    if (error.code) {
      console.error(`   Código: ${error.code}`);
    }
    console.error('');
    await client.end();
    process.exit(1);
  }
})();
