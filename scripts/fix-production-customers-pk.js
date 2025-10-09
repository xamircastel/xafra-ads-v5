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
    console.log('✅ Conectado a la base de datos xafra-ads');
    console.log('');
    console.log('🔧 PREPARANDO production.customers PARA CONVERSIONS');
    console.log('====================================================');
    console.log('');
    
    // Verificar datos actuales
    const currentData = await client.query('SELECT * FROM production.customers ORDER BY id_customer');
    console.log('📊 Datos actuales en production.customers:');
    console.log('');
    currentData.rows.forEach(row => {
      console.log(`   ID: ${row.id_customer}, Nombre: ${row.name}, País: ${row.country}`);
    });
    console.log('');
    
    // PASO 1: Verificar si hay valores NULL en id_customer
    const nullCheck = await client.query(`
      SELECT COUNT(*) as count 
      FROM production.customers 
      WHERE id_customer IS NULL
    `);
    
    if (parseInt(nullCheck.rows[0].count) > 0) {
      console.log(`⚠️  ADVERTENCIA: Hay ${nullCheck.rows[0].count} registros con id_customer NULL`);
      console.log('   Estos registros deben tener un ID antes de crear el PRIMARY KEY');
      console.log('');
      
      // Asignar IDs a registros NULL
      console.log('🔧 Asignando IDs a registros NULL...');
      
      // Obtener el máximo ID actual
      const maxId = await client.query('SELECT COALESCE(MAX(id_customer), 0) as max_id FROM production.customers WHERE id_customer IS NOT NULL');
      let nextId = parseInt(maxId.rows[0].max_id) + 1;
      
      // Actualizar registros NULL
      await client.query(`
        UPDATE production.customers 
        SET id_customer = ${nextId}
        WHERE id_customer IS NULL
      `);
      
      console.log(`   ✅ Registros actualizados con ID ${nextId}`);
      console.log('');
    } else {
      console.log('✅ No hay registros con id_customer NULL');
      console.log('');
    }
    
    // PASO 2: Verificar si hay duplicados en id_customer
    const duplicateCheck = await client.query(`
      SELECT id_customer, COUNT(*) as count
      FROM production.customers
      WHERE id_customer IS NOT NULL
      GROUP BY id_customer
      HAVING COUNT(*) > 1
    `);
    
    if (duplicateCheck.rows.length > 0) {
      console.log('❌ ERROR: Hay IDs duplicados en production.customers:');
      duplicateCheck.rows.forEach(row => {
        console.log(`   ID ${row.id_customer}: ${row.count} registros`);
      });
      console.log('');
      console.log('⚠️  Debe resolver los duplicados manualmente antes de continuar');
      await client.end();
      process.exit(1);
    } else {
      console.log('✅ No hay IDs duplicados');
      console.log('');
    }
    
    // PASO 3: Alterar columna para ser NOT NULL
    console.log('🔧 [1/3] Configurando id_customer como NOT NULL...');
    await client.query(`
      ALTER TABLE production.customers 
      ALTER COLUMN id_customer SET NOT NULL
    `);
    console.log('   ✅ Columna configurada como NOT NULL');
    console.log('');
    
    // PASO 4: Crear secuencia si no existe
    console.log('🔧 [2/3] Creando secuencia customers_id_customer_seq...');
    try {
      await client.query(`
        CREATE SEQUENCE IF NOT EXISTS production.customers_id_customer_seq
        OWNED BY production.customers.id_customer
      `);
      console.log('   ✅ Secuencia creada');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('   ⚠️  Secuencia ya existe');
      } else {
        throw error;
      }
    }
    
    // Sincronizar secuencia con el máximo valor actual
    const maxIdValue = await client.query('SELECT COALESCE(MAX(id_customer), 0) as max_id FROM production.customers');
    const maxIdNum = parseInt(maxIdValue.rows[0].max_id);
    
    await client.query(`
      SELECT setval('production.customers_id_customer_seq', ${maxIdNum}, true)
    `);
    console.log(`   ✅ Secuencia sincronizada al valor ${maxIdNum}`);
    console.log('');
    
    // PASO 5: Crear PRIMARY KEY
    console.log('🔧 [3/3] Creando PRIMARY KEY en id_customer...');
    try {
      await client.query(`
        ALTER TABLE production.customers 
        ADD CONSTRAINT customers_pkey PRIMARY KEY (id_customer)
      `);
      console.log('   ✅ PRIMARY KEY creado exitosamente');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('   ⚠️  PRIMARY KEY ya existe');
      } else {
        throw error;
      }
    }
    
    // PASO 6: Configurar DEFAULT para la columna
    console.log('');
    console.log('🔧 Configurando DEFAULT para id_customer...');
    await client.query(`
      ALTER TABLE production.customers 
      ALTER COLUMN id_customer SET DEFAULT nextval('production.customers_id_customer_seq'::regclass)
    `);
    console.log('   ✅ DEFAULT configurado');
    
    // Verificación final
    console.log('');
    console.log('🔍 Verificación final...');
    const finalCheck = await client.query(`
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
        AND tc.constraint_type = 'PRIMARY KEY'
    `);
    
    if (finalCheck.rows.length > 0) {
      console.log('');
      console.log('========================================');
      console.log('✅ ¡PREPARACIÓN COMPLETADA EXITOSAMENTE!');
      console.log('========================================');
      console.log('');
      console.log('📋 RESUMEN:');
      console.log(`   • PRIMARY KEY creado en id_customer`);
      console.log(`   • Secuencia sincronizada`);
      console.log(`   • Columna configurada como NOT NULL`);
      console.log(`   • DEFAULT configurado para auto-incremento`);
      console.log('');
      console.log('🚀 Ahora puede ejecutar migrate-production-conversions.js');
    } else {
      console.log('');
      console.log('❌ No se pudo verificar el PRIMARY KEY');
    }
    
    await client.end();
    
  } catch (error) {
    console.error('');
    console.error('❌ ERROR:', error.message);
    if (error.code) {
      console.error('   Código:', error.code);
    }
    console.error('');
    await client.end();
    process.exit(1);
  }
})();
