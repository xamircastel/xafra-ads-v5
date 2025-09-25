const { Client } = require('pg');

async function simpleDatabaseAnalysis() {
  const client = new Client({
    host: '34.28.245.62',
    port: 5432,
    database: 'xafra-ads',
    user: 'postgres',
    password: 'XafraTech2025!'
  });

  try {
    console.log('🔌 Conectando a la base de datos...');
    await client.connect();
    console.log('✅ Conexión exitosa\n');

    // Obtener todas las tablas del schema production y public
    const tablesQuery = `
      SELECT 
        schemaname,
        tablename
      FROM pg_tables 
      WHERE schemaname IN ('production', 'public')
      ORDER BY schemaname, tablename;
    `;

    const tablesResult = await client.query(tablesQuery);
    
    console.log('📋 TABLAS ENCONTRADAS:');
    tablesResult.rows.forEach((table, index) => {
      console.log(`${index + 1}. ${table.schemaname}.${table.tablename}`);
    });
    console.log('\n');

    // Para cada tabla, obtener estructura de columnas
    console.log('🔍 ESTRUCTURA DETALLADA DE TABLAS:\n');
    
    for (const table of tablesResult.rows) {
      console.log(`🏷️  TABLA: ${table.schemaname}.${table.tablename}`);
      
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
        WHERE table_schema = $1 AND table_name = $2
        ORDER BY ordinal_position;
      `;

      const columnsResult = await client.query(columnsQuery, [table.schemaname, table.tablename]);
      
      columnsResult.rows.forEach((col, index) => {
        let typeInfo = col.data_type;
        if (col.character_maximum_length) typeInfo += `(${col.character_maximum_length})`;
        if (col.numeric_precision) typeInfo += `(${col.numeric_precision}${col.numeric_scale ? ',' + col.numeric_scale : ''})`;
        
        const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
        const defaultVal = col.column_default ? ` DEFAULT ${col.column_default}` : '';
        
        console.log(`    ${index + 1}. ${col.column_name} (${typeInfo}) ${nullable}${defaultVal}`);
      });

      // Obtener claves primarias
      const pkQuery = `
        SELECT kcu.column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu 
          ON tc.constraint_name = kcu.constraint_name
        WHERE tc.table_schema = $1 
          AND tc.table_name = $2 
          AND tc.constraint_type = 'PRIMARY KEY'
        ORDER BY kcu.ordinal_position;
      `;

      const pkResult = await client.query(pkQuery, [table.schemaname, table.tablename]);
      if (pkResult.rows.length > 0) {
        const pkColumns = pkResult.rows.map(row => row.column_name).join(', ');
        console.log(`    🔑 PRIMARY KEY: ${pkColumns}`);
      }

      // Obtener foreign keys
      const fkQuery = `
        SELECT 
          kcu.column_name,
          ccu.table_schema AS foreign_table_schema,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu 
          ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage ccu 
          ON ccu.constraint_name = tc.constraint_name
        WHERE tc.table_schema = $1 
          AND tc.table_name = $2 
          AND tc.constraint_type = 'FOREIGN KEY';
      `;

      const fkResult = await client.query(fkQuery, [table.schemaname, table.tablename]);
      if (fkResult.rows.length > 0) {
        console.log('    🔗 FOREIGN KEYS:');
        fkResult.rows.forEach(fk => {
          console.log(`      ${fk.column_name} → ${fk.foreign_table_schema}.${fk.foreign_table_name}.${fk.foreign_column_name}`);
        });
      }

      // Contar registros
      try {
        const countQuery = `SELECT COUNT(*) as total FROM ${table.schemaname}.${table.tablename}`;
        const countResult = await client.query(countQuery);
        console.log(`    📊 REGISTROS: ${countResult.rows[0].total}`);
      } catch (e) {
        console.log(`    📊 REGISTROS: Error al contar`);
      }

      console.log('');
    }

    // Generar reporte Prisma
    console.log('\n🚀 GENERANDO ESTRUCTURA PARA PRISMA...\n');
    
    const reportLines = [];
    reportLines.push('// ESTRUCTURA ACTUAL DE LA BASE DE DATOS');
    reportLines.push('// Generado: ' + new Date().toISOString());
    reportLines.push('');
    reportLines.push('generator client {');
    reportLines.push('  provider = "prisma-client-js"');
    reportLines.push('}');
    reportLines.push('');
    reportLines.push('datasource db {');
    reportLines.push('  provider = "postgresql"');
    reportLines.push('  url      = env("DATABASE_URL")');
    reportLines.push('}');
    reportLines.push('');

    for (const table of tablesResult.rows) {
      if (table.schemaname === 'production') {
        const columnsResult = await client.query(`
          SELECT 
            column_name,
            data_type,
            is_nullable,
            column_default
          FROM information_schema.columns 
          WHERE table_schema = $1 AND table_name = $2
          ORDER BY ordinal_position;
        `, [table.schemaname, table.tablename]);

        const pkResult = await client.query(`
          SELECT kcu.column_name
          FROM information_schema.table_constraints tc
          JOIN information_schema.key_column_usage kcu 
            ON tc.constraint_name = kcu.constraint_name
          WHERE tc.table_schema = $1 
            AND tc.table_name = $2 
            AND tc.constraint_type = 'PRIMARY KEY'
          ORDER BY kcu.ordinal_position;
        `, [table.schemaname, table.tablename]);

        reportLines.push(`model ${toPascalCase(table.tablename)} {`);
        
        columnsResult.rows.forEach(col => {
          const isPrimaryKey = pkResult.rows.some(pk => pk.column_name === col.column_name);
          const prismaType = mapPostgresToPrisma(col.data_type, col.is_nullable === 'YES');
          const pkAnnotation = isPrimaryKey ? ' @id @default(autoincrement())' : '';
          const mapAnnotation = col.column_name !== toCamelCase(col.column_name) ? ` @map("${col.column_name}")` : '';
          
          reportLines.push(`  ${toCamelCase(col.column_name)} ${prismaType}${pkAnnotation}${mapAnnotation}`);
        });

        reportLines.push('');
        reportLines.push(`  @@map("${table.tablename}")`);
        reportLines.push(`  @@schema("${table.schemaname}")`);
        reportLines.push('}');
        reportLines.push('');
      }
    }

    console.log(reportLines.join('\n'));

  } catch (error) {
    console.error('❌ Error durante el análisis:', error.message);
  } finally {
    await client.end();
  }
}

function toPascalCase(str) {
  return str.split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('');
}

function toCamelCase(str) {
  const pascal = toPascalCase(str);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

function mapPostgresToPrisma(pgType, nullable) {
  let prismaType;
  
  switch (pgType) {
    case 'bigint':
      prismaType = 'BigInt';
      break;
    case 'integer':
      prismaType = 'Int';
      break;
    case 'smallint':
      prismaType = 'Int';
      break;
    case 'character varying':
    case 'varchar':
    case 'text':
      prismaType = 'String';
      break;
    case 'timestamp without time zone':
    case 'timestamp':
      prismaType = 'DateTime';
      break;
    case 'boolean':
      prismaType = 'Boolean';
      break;
    default:
      prismaType = 'String'; // fallback
  }
  
  return nullable ? `${prismaType}?` : prismaType;
}

// Ejecutar análisis
simpleDatabaseAnalysis().catch(console.error);