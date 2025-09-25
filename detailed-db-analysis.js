const { Client } = require('pg');
const fs = require('fs');

// Credenciales de la base de datos
const client = new Client({
  host: '34.28.245.62',
  port: 5432,
  database: 'xafra-ads',
  user: 'postgres',
  password: 'XafraTech2025!'
});

async function detailedDatabaseAnalysis() {
  try {
    console.log('🔌 Conectando a la base de datos...');
    await client.connect();
    console.log('✅ Conexión exitosa a la base de datos xafra-ads');
    
    const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
    let report = `# 🔍 ANÁLISIS DETALLADO DE BASE DE DATOS XAFRA-ADS\n`;
    report += `**Fecha de análisis:** ${new Date().toLocaleString()}\n`;
    report += `**Host:** 34.28.245.62:5432\n`;
    report += `**Base de datos:** xafra-ads\n\n`;

    // 1. OBTENER TODOS LOS SCHEMAS
    console.log('\n📋 1. ANALIZANDO SCHEMAS...');
    const schemasQuery = `
      SELECT schema_name 
      FROM information_schema.schemata 
      WHERE schema_name NOT IN ('information_schema', 'pg_catalog', 'pg_toast', 'pg_temp_1', 'pg_toast_temp_1')
      ORDER BY schema_name;
    `;
    
    const schemas = await client.query(schemasQuery);
    report += `## 📊 SCHEMAS ENCONTRADOS:\n`;
    schemas.rows.forEach((schema, index) => {
      console.log(`${index + 1}. ${schema.schema_name}`);
      report += `${index + 1}. **${schema.schema_name}**\n`;
    });
    report += `\n`;

    // Para cada schema, analizar las tablas
    for (const schema of schemas.rows) {
      const schemaName = schema.schema_name;
      console.log(`\n🔍 ANALIZANDO SCHEMA: ${schemaName.toUpperCase()}`);
      report += `## 🏗️ SCHEMA: ${schemaName.toUpperCase()}\n\n`;

      // 2. OBTENER TODAS LAS TABLAS DEL SCHEMA
      const tablesQuery = `
        SELECT table_name, table_type
        FROM information_schema.tables 
        WHERE table_schema = $1 
        ORDER BY table_name;
      `;
      
      const tables = await client.query(tablesQuery, [schemaName]);
      report += `### 📋 TABLAS Y VISTAS:\n`;
      tables.rows.forEach((table, index) => {
        console.log(`  ${index + 1}. ${table.table_name} (${table.table_type})`);
        report += `${index + 1}. **${table.table_name}** (${table.table_type})\n`;
      });
      report += `\n`;

      // 3. ANALIZAR CADA TABLA EN DETALLE
      for (const table of tables.rows) {
        if (table.table_type === 'BASE TABLE') {
          const tableName = table.table_name;
          console.log(`\n🔍 TABLA: ${tableName}`);
          report += `### 🗃️ TABLA: \`${tableName}\`\n\n`;

          // 3.1 ESTRUCTURA DE COLUMNAS
          const columnsQuery = `
            SELECT 
              c.column_name,
              c.data_type,
              c.is_nullable,
              c.column_default,
              c.character_maximum_length,
              c.numeric_precision,
              c.numeric_scale,
              c.ordinal_position,
              c.udt_name,
              CASE 
                WHEN c.column_default LIKE 'nextval%' THEN 'AUTO_INCREMENT'
                ELSE ''
              END as is_auto_increment
            FROM information_schema.columns c
            WHERE c.table_schema = $1 
              AND c.table_name = $2
            ORDER BY c.ordinal_position;
          `;
          
          const columns = await client.query(columnsQuery, [schemaName, tableName]);
          
          report += `**Columnas:**\n\n`;
          report += `| # | Columna | Tipo | Nulo | Default | Longitud | Precisión | Auto Inc |\n`;
          report += `|---|---------|------|------|---------|----------|-----------|----------|\n`;
          
          columns.rows.forEach((col) => {
            const length = col.character_maximum_length || '';
            const precision = col.numeric_precision ? 
              `${col.numeric_precision}${col.numeric_scale ? `,${col.numeric_scale}` : ''}` : '';
            const defaultVal = col.column_default ? 
              (col.column_default.length > 30 ? col.column_default.substring(0, 27) + '...' : col.column_default) : '';
            
            console.log(`    ${col.ordinal_position}. ${col.column_name} (${col.data_type}) ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
            
            report += `| ${col.ordinal_position} | \`${col.column_name}\` | ${col.data_type.toUpperCase()} | ${col.is_nullable} | ${defaultVal} | ${length} | ${precision} | ${col.is_auto_increment} |\n`;
          });
          report += `\n`;

          // 3.2 PRIMARY KEYS
          const primaryKeysQuery = `
            SELECT 
              kcu.column_name,
              kcu.ordinal_position
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu 
              ON tc.constraint_name = kcu.constraint_name
              AND tc.table_schema = kcu.table_schema
            WHERE tc.constraint_type = 'PRIMARY KEY'
              AND tc.table_schema = $1
              AND tc.table_name = $2
            ORDER BY kcu.ordinal_position;
          `;
          
          const primaryKeys = await client.query(primaryKeysQuery, [schemaName, tableName]);
          if (primaryKeys.rows.length > 0) {
            report += `**Primary Key:**\n`;
            primaryKeys.rows.forEach((pk) => {
              report += `- \`${pk.column_name}\`\n`;
            });
            report += `\n`;
          }

          // 3.3 FOREIGN KEYS
          const foreignKeysQuery = `
            SELECT 
              kcu.column_name as column_name,
              ccu.table_schema as foreign_table_schema,
              ccu.table_name as foreign_table_name,
              ccu.column_name as foreign_column_name,
              tc.constraint_name
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu 
              ON tc.constraint_name = kcu.constraint_name
              AND tc.table_schema = kcu.table_schema
            JOIN information_schema.constraint_column_usage ccu 
              ON ccu.constraint_name = tc.constraint_name
              AND ccu.table_schema = tc.table_schema
            WHERE tc.constraint_type = 'FOREIGN KEY'
              AND tc.table_schema = $1
              AND tc.table_name = $2;
          `;
          
          const foreignKeys = await client.query(foreignKeysQuery, [schemaName, tableName]);
          if (foreignKeys.rows.length > 0) {
            report += `**Foreign Keys:**\n`;
            foreignKeys.rows.forEach((fk) => {
              report += `- \`${fk.column_name}\` → \`${fk.foreign_table_schema}.${fk.foreign_table_name}.${fk.foreign_column_name}\`\n`;
            });
            report += `\n`;
          }

          // 3.4 ÍNDICES
          const indexesQuery = `
            SELECT 
              i.relname as index_name,
              ix.indisunique as is_unique,
              ix.indisprimary as is_primary,
              array_agg(a.attname ORDER BY c.ordinality) as columns
            FROM pg_class t
            JOIN pg_index ix ON t.oid = ix.indrelid
            JOIN pg_class i ON i.oid = ix.indexrelid
            JOIN pg_namespace n ON n.oid = t.relnamespace
            CROSS JOIN LATERAL unnest(ix.indkey) WITH ORDINALITY AS c(attnum, ordinality)
            JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = c.attnum
            WHERE n.nspname = $1 
              AND t.relname = $2
              AND t.relkind = 'r'
            GROUP BY i.relname, ix.indisunique, ix.indisprimary
            ORDER BY i.relname;
          `;
          
          const indexes = await client.query(indexesQuery, [schemaName, tableName]);
          if (indexes.rows.length > 0) {
            report += `**Índices:**\n`;
            indexes.rows.forEach((idx) => {
              const type = idx.is_primary ? 'PRIMARY' : (idx.is_unique ? 'UNIQUE' : 'INDEX');
              report += `- \`${idx.index_name}\` (${type}) en [\`${idx.columns.join('`, `')}\`]\n`;
            });
            report += `\n`;
          }

          // 3.5 CONSTRAINTS ÚNICOS
          const uniqueConstraintsQuery = `
            SELECT 
              tc.constraint_name,
              array_agg(kcu.column_name ORDER BY kcu.ordinal_position) as columns
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu 
              ON tc.constraint_name = kcu.constraint_name
              AND tc.table_schema = kcu.table_schema
            WHERE tc.constraint_type = 'UNIQUE'
              AND tc.table_schema = $1
              AND tc.table_name = $2
            GROUP BY tc.constraint_name;
          `;
          
          const uniqueConstraints = await client.query(uniqueConstraintsQuery, [schemaName, tableName]);
          if (uniqueConstraints.rows.length > 0) {
            report += `**Constraints Únicos:**\n`;
            uniqueConstraints.rows.forEach((uc) => {
              report += `- \`${uc.constraint_name}\` en [\`${uc.columns.join('`, `')}\`]\n`;
            });
            report += `\n`;
          }

          // 3.6 CHECK CONSTRAINTS
          const checkConstraintsQuery = `
            SELECT 
              tc.constraint_name,
              cc.check_clause
            FROM information_schema.table_constraints tc
            JOIN information_schema.check_constraints cc
              ON tc.constraint_name = cc.constraint_name
              AND tc.table_schema = cc.constraint_schema
            WHERE tc.constraint_type = 'CHECK'
              AND tc.table_schema = $1
              AND tc.table_name = $2;
          `;
          
          const checkConstraints = await client.query(checkConstraintsQuery, [schemaName, tableName]);
          if (checkConstraints.rows.length > 0) {
            report += `**Check Constraints:**\n`;
            checkConstraints.rows.forEach((cc) => {
              report += `- \`${cc.constraint_name}\`: ${cc.check_clause}\n`;
            });
            report += `\n`;
          }

          // 3.7 SECUENCIAS (para campos auto increment)
          const sequencesQuery = `
            SELECT 
              c.column_name,
              s.sequence_name,
              s.data_type as sequence_type,
              s.start_value,
              s.minimum_value,
              s.maximum_value,
              s.increment
            FROM information_schema.columns c
            JOIN information_schema.sequences s ON s.sequence_schema = c.table_schema
            WHERE c.table_schema = $1
              AND c.table_name = $2
              AND c.column_default LIKE '%' || s.sequence_name || '%';
          `;
          
          const sequences = await client.query(sequencesQuery, [schemaName, tableName]);
          if (sequences.rows.length > 0) {
            report += `**Secuencias:**\n`;
            sequences.rows.forEach((seq) => {
              report += `- \`${seq.column_name}\` usa \`${seq.sequence_name}\` (inicio: ${seq.start_value}, incremento: ${seq.increment})\n`;
            });
            report += `\n`;
          }

          // 3.8 CONTEO DE REGISTROS
          try {
            const countQuery = `SELECT COUNT(*) as total FROM "${schemaName}"."${tableName}";`;
            const count = await client.query(countQuery);
            report += `**Registros:** ${count.rows[0].total}\n\n`;
          } catch (error) {
            report += `**Registros:** Error al contar\n\n`;
          }

          report += `---\n\n`;
        }
      }
    }

    // 4. GENERAR RESUMEN PARA PRISMA
    report += `## 🎯 RESUMEN PARA PRISMA SCHEMA\n\n`;
    report += `### Tablas principales identificadas:\n`;
    
    // Listar todas las tablas base encontradas
    for (const schema of schemas.rows) {
      const tablesQuery = `
        SELECT table_name
        FROM information_schema.tables 
        WHERE table_schema = $1 
          AND table_type = 'BASE TABLE'
        ORDER BY table_name;
      `;
      
      const tables = await client.query(tablesQuery, [schema.schema_name]);
      if (tables.rows.length > 0) {
        report += `\n**Schema ${schema.schema_name}:**\n`;
        tables.rows.forEach((table) => {
          report += `- ${table.table_name}\n`;
        });
      }
    }

    // Guardar el reporte
    const filename = `DETAILED_DB_ANALYSIS_${timestamp}.md`;
    fs.writeFileSync(filename, report);
    
    console.log(`\n✅ Análisis completado!`);
    console.log(`📄 Reporte guardado en: ${filename}`);
    console.log(`📊 Total de schemas analizados: ${schemas.rows.length}`);

  } catch (error) {
    console.error('❌ Error durante el análisis:', error);
  } finally {
    await client.end();
  }
}

// Ejecutar el análisis
detailedDatabaseAnalysis().catch(console.error);