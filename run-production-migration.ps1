# =====================================================
# Script: Ejecutar migración de production.conversions
# Fecha: 2025-10-08
# =====================================================

Write-Host "🚀 MIGRACIÓN: Creando tabla production.conversions" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host ""

# Variables de conexión
$DB_HOST = "34.28.245.62"
$DB_PORT = "5432"
$DB_NAME = "xafra-ads"
$DB_USER = "postgres"
$DB_PASSWORD = "XafraTech2025!"

# Construir connection string
$CONNECTION_STRING = "postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}"

Write-Host "📋 Verificando pre-requisitos..." -ForegroundColor Yellow

# Verificar que existe el archivo SQL
if (-not (Test-Path "migrations\create-production-conversions-table.sql")) {
    Write-Host "❌ ERROR: No se encuentra el archivo SQL de migración" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Archivo SQL encontrado" -ForegroundColor Green
Write-Host ""

# Verificar que Node.js puede conectarse (usando node con pg)
Write-Host "🔍 Verificando conexión a base de datos..." -ForegroundColor Yellow

$testScript = @"
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
    const res = await client.query('SELECT current_schema(), current_database()');
    console.log('✅ Conexión exitosa:', res.rows[0]);
    
    // Verificar que existe production.customers
    const checkCustomers = await client.query(\"SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = 'production' AND table_name = 'customers'\");
    if (checkCustomers.rows[0].count === '0') {
      console.log('❌ ERROR: No existe la tabla production.customers');
      process.exit(1);
    }
    console.log('✅ Tabla production.customers existe');
    
    // Verificar si ya existe production.conversions
    const checkConversions = await client.query(\"SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = 'production' AND table_name = 'conversions'\");
    if (checkConversions.rows[0].count === '1') {
      console.log('⚠️  ADVERTENCIA: La tabla production.conversions ya existe');
    } else {
      console.log('✅ La tabla production.conversions no existe, procederemos a crearla');
    }
    
    await client.end();
  } catch (error) {
    console.error('❌ Error de conexión:', error.message);
    process.exit(1);
  }
})();
"@

$testScript | Out-File -FilePath "temp-db-test.js" -Encoding UTF8

Write-Host "Ejecutando test de conexión..." -ForegroundColor Yellow
node temp-db-test.js

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Falló la verificación de conexión" -ForegroundColor Red
    Remove-Item "temp-db-test.js" -Force
    exit 1
}

Remove-Item "temp-db-test.js" -Force
Write-Host ""

# Ejecutar migración
Write-Host "🔧 Ejecutando migración SQL..." -ForegroundColor Yellow

$migrationScript = @"
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
    console.log('✅ Conectado a la base de datos');
    
    const sql = fs.readFileSync('migrations/create-production-conversions-table.sql', 'utf8');
    
    // Eliminar comandos que no funcionan con node-pg
    const cleanedSql = sql
      .replace(/\\\\d production\.conversions/g, '')
      .split(';')
      .filter(statement => {
        const trimmed = statement.trim();
        return trimmed.length > 0 && 
               !trimmed.startsWith('--') && 
               !trimmed.startsWith('COMMENT') &&
               !trimmed.startsWith('SELECT indexname');
      })
      .join(';');
    
    console.log('📝 Ejecutando statements SQL...');
    await client.query(cleanedSql);
    
    // Verificación final
    const verification = await client.query(\`
      SELECT 
        COUNT(*) as total_registros,
        (SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'production' AND tablename = 'conversions') as total_indices
      FROM production.conversions
    \`);
    
    console.log('');
    console.log('✅ ¡MIGRACIÓN COMPLETADA EXITOSAMENTE!');
    console.log('📊 Resultado:');
    console.log('   - Tabla: production.conversions creada');
    console.log('   - Registros actuales:', verification.rows[0].total_registros);
    console.log('   - Índices creados:', verification.rows[0].total_indices);
    
    await client.end();
  } catch (error) {
    console.error('❌ Error durante la migración:', error.message);
    console.error('Detalle:', error);
    process.exit(1);
  }
})();
"@

$migrationScript | Out-File -FilePath "temp-migrate.js" -Encoding UTF8

node temp-migrate.js

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Falló la migración" -ForegroundColor Red
    Remove-Item "temp-migrate.js" -Force
    exit 1
}

Remove-Item "temp-migrate.js" -Force

Write-Host ""
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "✅ MIGRACIÓN DE BASE DE DATOS COMPLETADA" -ForegroundColor Green
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Siguiente paso: Actualizar código para usar schema dinámico" -ForegroundColor Yellow
