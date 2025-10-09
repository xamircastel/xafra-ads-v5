# Script Simple: Aplicar Migración id_product
# Copia y pega el siguiente comando SQL en tu cliente de PostgreSQL

Write-Host "===============================================" -ForegroundColor Cyan
Write-Host "  MIGRACIÓN: id_product BIGINT → VARCHAR(255)" -ForegroundColor Cyan
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "📋 Ejecuta el siguiente SQL en tu base de datos:" -ForegroundColor Yellow
Write-Host ""

$sql = @"
-- Conectar a: 34.28.245.62:5432
-- Database: xafra-ads
-- Schema: staging

ALTER TABLE staging.conversions 
ALTER COLUMN id_product TYPE VARCHAR(255) USING id_product::VARCHAR;

-- Verificar:
SELECT column_name, data_type, character_maximum_length, is_nullable
FROM information_schema.columns 
WHERE table_schema = 'staging' 
  AND table_name = 'conversions'
  AND column_name = 'id_product';
"@

Write-Host $sql -ForegroundColor White
Write-Host ""

Write-Host "===============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Opciones para ejecutar:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Usar psql (si lo tienes instalado):" -ForegroundColor Green
Write-Host '   $env:PGPASSWORD="TU_PASSWORD"' -ForegroundColor White
Write-Host '   psql -h 34.28.245.62 -p 5432 -U staging_user -d xafra-ads -c "ALTER TABLE staging.conversions ALTER COLUMN id_product TYPE VARCHAR(255) USING id_product::VARCHAR;"' -ForegroundColor White
Write-Host ""

Write-Host "2. Usar Cloud SQL Proxy + psql:" -ForegroundColor Green
Write-Host "   gcloud sql connect xafra-ads --user=staging_user" -ForegroundColor White
Write-Host ""

Write-Host "3. Usar Google Cloud Console:" -ForegroundColor Green
Write-Host "   https://console.cloud.google.com/sql/instances" -ForegroundColor White
Write-Host "   → Selecciona tu instancia" -ForegroundColor White
Write-Host "   → Cloud Shell → Ejecuta el SQL" -ForegroundColor White
Write-Host ""

Write-Host "4. Usar DBeaver, pgAdmin, o cualquier cliente SQL" -ForegroundColor Green
Write-Host ""
