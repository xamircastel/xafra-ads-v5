# Script: Deploy Core Service con Endpoint POST
# Descripción: Despliega los cambios del endpoint GET → POST a staging

Write-Host "===============================================" -ForegroundColor Cyan
Write-Host "  DEPLOY: Core Service - Endpoint POST" -ForegroundColor Cyan
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host ""

# Verificar ubicación
$currentPath = Get-Location
if ($currentPath.Path -notlike "*xafra-ads-v5\dev*") {
    Write-Host "❌ Error: Debes ejecutar este script desde la carpeta dev/" -ForegroundColor Red
    exit 1
}

Write-Host "📋 Verificaciones previas:" -ForegroundColor Yellow
Write-Host ""

# 1. Verificar que la compilación local esté OK
Write-Host "1. Verificando compilación local..." -ForegroundColor Cyan
cd services\core-service
$buildResult = npm run build 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "   ❌ Error en compilación" -ForegroundColor Red
    Write-Host $buildResult
    exit 1
}
Write-Host "   ✅ Compilación exitosa" -ForegroundColor Green
cd ..\..

Write-Host ""

# 2. Confirmar migración de BD
Write-Host "2. ¿Has aplicado la migración de base de datos?" -ForegroundColor Cyan
Write-Host "   SQL: ALTER TABLE staging.conversions ALTER COLUMN id_product TYPE VARCHAR(255)" -ForegroundColor White
Write-Host ""
$migrationConfirm = Read-Host "   ¿Migración aplicada? (s/n)"
if ($migrationConfirm -ne 's' -and $migrationConfirm -ne 'S') {
    Write-Host "   ⚠️  Aplica primero la migración con:" -ForegroundColor Yellow
    Write-Host "   .\show-migration-sql.ps1" -ForegroundColor White
    Write-Host ""
    $forceDeploy = Read-Host "   ¿Desplegar de todas formas? (NO RECOMENDADO) (s/n)"
    if ($forceDeploy -ne 's' -and $forceDeploy -ne 'S') {
        Write-Host "   ❌ Despliegue cancelado" -ForegroundColor Red
        exit 1
    }
    Write-Host "   ⚠️  Desplegando sin migración (puede causar errores)..." -ForegroundColor Yellow
} else {
    Write-Host "   ✅ Migración confirmada" -ForegroundColor Green
}

Write-Host ""
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host "  INICIANDO DESPLIEGUE A STAGING" -ForegroundColor Cyan
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "📦 Configuración:" -ForegroundColor Yellow
Write-Host "   Servicio: core-service-stg" -ForegroundColor White
Write-Host "   Región: us-central1" -ForegroundColor White
Write-Host "   Cambios: GET → POST endpoint" -ForegroundColor White
Write-Host "   URL: /service/v1/google/conversion/:apikey/:tracking" -ForegroundColor White
Write-Host ""

# Confirmar despliegue
$deployConfirm = Read-Host "¿Continuar con el despliegue? (s/n)"
if ($deployConfirm -ne 's' -and $deployConfirm -ne 'S') {
    Write-Host "❌ Despliegue cancelado" -ForegroundColor Red
    exit 0
}

Write-Host ""
Write-Host "🚀 Iniciando Cloud Build..." -ForegroundColor Cyan
Write-Host ""

# Ejecutar gcloud builds submit
try {
    gcloud builds submit --config=cloudbuild-core-stg.yaml .
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "===============================================" -ForegroundColor Green
        Write-Host "  ✅ DESPLIEGUE EXITOSO" -ForegroundColor Green
        Write-Host "===============================================" -ForegroundColor Green
        Write-Host ""
        
        Write-Host "📊 Información del servicio:" -ForegroundColor Yellow
        Write-Host "   URL: https://core-service-stg-697203931362.us-central1.run.app" -ForegroundColor White
        Write-Host "   Endpoint: POST /service/v1/google/conversion/:apikey/:tracking" -ForegroundColor White
        Write-Host ""
        
        Write-Host "🧪 Próximos pasos:" -ForegroundColor Yellow
        Write-Host "1. Ejecutar tests:" -ForegroundColor White
        Write-Host "   .\test-google-conversions-post.ps1" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "2. Probar manualmente:" -ForegroundColor White
        Write-Host '   $body = @{msisdn="51987654321";campaign="Test"} | ConvertTo-Json' -ForegroundColor Cyan
        Write-Host '   Invoke-RestMethod -Uri "https://core-service-stg-697203931362.us-central1.run.app/service/v1/google/conversion/APIKEY/TRACKING" -Method POST -Body $body -ContentType "application/json"' -ForegroundColor Cyan
        Write-Host ""
        Write-Host "3. Verificar logs:" -ForegroundColor White
        Write-Host "   https://console.cloud.google.com/logs" -ForegroundColor Cyan
        Write-Host ""
        
    } else {
        Write-Host ""
        Write-Host "===============================================" -ForegroundColor Red
        Write-Host "  ❌ ERROR EN EL DESPLIEGUE" -ForegroundColor Red
        Write-Host "===============================================" -ForegroundColor Red
        Write-Host ""
        Write-Host "📋 Verifica:" -ForegroundColor Yellow
        Write-Host "1. Logs de Cloud Build en la consola" -ForegroundColor White
        Write-Host "2. Permisos de gcloud: gcloud auth list" -ForegroundColor White
        Write-Host "3. Proyecto configurado: gcloud config get-value project" -ForegroundColor White
        Write-Host ""
    }
} catch {
    Write-Host ""
    Write-Host "❌ Error al ejecutar gcloud builds submit:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host ""
    exit 1
}
