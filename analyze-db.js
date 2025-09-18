const { Client } = require('pg');

const client = new Client({
  host: '34.28.245.62',
  port: 5432,
  database: 'xafra-ads',
  user: 'postgres',
  password: 'XafraTech2025!'
});

async function analyzeDatabase() {
  try {
    console.log('🔌 Conectando a la base de datos...');
    await client.connect();
    console.log('✅ Conexión exitosa a la base de datos xafra-ads');
    
    // Obtener lista de tablas
    console.log('\n📋 ANALIZANDO ESTRUCTURA DE LA BASE DE DATOS...\n');
    
    const tablesQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `;
    
    const tablesResult = await client.query(tablesQuery);
    console.log('📊 TABLAS ENCONTRADAS:');
    console.log('====================');
    tablesResult.rows.forEach((row, index) => {
      console.log(`${index + 1}. ${row.table_name}`);
    });
    
    console.log(`\n📈 Total de tablas: ${tablesResult.rows.length}\n`);
    
    // Analizar estructura de cada tabla
    for (const table of tablesResult.rows) {
      const tableName = table.table_name;
      console.log(`\n🔍 ESTRUCTURA DE LA TABLA: ${tableName.toUpperCase()}`);
      console.log('='.repeat(50));
      
      const columnsQuery = `
        SELECT 
          column_name,
          data_type,
          is_nullable,
          column_default,
          character_maximum_length,
          numeric_precision,
          numeric_scale
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = $1
        ORDER BY ordinal_position;
      `;
      
      const columnsResult = await client.query(columnsQuery, [tableName]);
      
      columnsResult.rows.forEach(col => {
        const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
        const length = col.character_maximum_length ? `(${col.character_maximum_length})` : '';
        const precision = col.numeric_precision ? `(${col.numeric_precision}${col.numeric_scale ? `,${col.numeric_scale}` : ''})` : '';
        const defaultVal = col.column_default ? ` DEFAULT ${col.column_default}` : '';
        
        console.log(`  ${col.column_name.padEnd(25)} ${col.data_type.toUpperCase()}${length}${precision} ${nullable}${defaultVal}`);
      });
      
      // Obtener claves primarias
      const pkQuery = `
        SELECT a.attname
        FROM pg_index i
        JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
        WHERE i.indrelid = $1::regclass AND i.indisprimary;
      `;
      
      try {
        const pkResult = await client.query(pkQuery, [tableName]);
        if (pkResult.rows.length > 0) {
          console.log(`  🔑 PRIMARY KEY: ${pkResult.rows.map(r => r.attname).join(', ')}`);
        }
      } catch (pkError) {
        // Ignorar si no se puede obtener la PK
      }
      
      // Obtener foreign keys
      const fkQuery = `
        SELECT
          kcu.column_name,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name
        FROM
          information_schema.table_constraints AS tc
          JOIN information_schema.key_column_usage AS kcu
            ON tc.constraint_name = kcu.constraint_name
            AND tc.table_schema = kcu.table_schema
          JOIN information_schema.constraint_column_usage AS ccu
            ON ccu.constraint_name = tc.constraint_name
            AND ccu.table_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name = $1;
      `;
      
      const fkResult = await client.query(fkQuery, [tableName]);
      if (fkResult.rows.length > 0) {
        console.log('  🔗 FOREIGN KEYS:');
        fkResult.rows.forEach(fk => {
          console.log(`    ${fk.column_name} -> ${fk.foreign_table_name}.${fk.foreign_column_name}`);
        });
      }
    }
    
    // Obtener algunos datos de ejemplo de las tablas principales
    console.log('\n💾 DATOS DE EJEMPLO (primeros 3 registros):');
    console.log('===========================================');
    
    const mainTables = tablesResult.rows
      .map(r => r.table_name)
      .filter(name => !name.includes('_') || ['auth_users'].includes(name))
      .slice(0, 5);
    
    for (const tableName of mainTables) {
      try {
        console.log(`\n📋 Tabla: ${tableName}`);
        const sampleQuery = `SELECT * FROM ${tableName} LIMIT 3`;
        const sampleResult = await client.query(sampleQuery);
        
        if (sampleResult.rows.length > 0) {
          console.log(`   Registros encontrados: ${sampleResult.rowCount}`);
          console.log('   Primeros 3 registros:');
          sampleResult.rows.forEach((row, index) => {
            console.log(`   ${index + 1}.`, JSON.stringify(row, null, 2));
          });
        } else {
          console.log('   ⚠️  Tabla vacía');
        }
      } catch (error) {
        console.log(`   ❌ Error al consultar ${tableName}: ${error.message}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error conectando a la base de datos:', error.message);
    console.error('💡 Verifica que:');
    console.error('   - La IP 34.28.245.62 sea accesible');
    console.error('   - El puerto 5432 esté abierto');
    console.error('   - Las credenciales sean correctas');
    console.error('   - La base de datos "xafra-ads" exista');
  } finally {
    await client.end();
    console.log('\n🔌 Conexión cerrada');
  }
}

analyzeDatabase();