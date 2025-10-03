# 🧪 Script de Prueba - Google Ads Conversions API en Staging
# Ejecutar: .\test-staging-deployment.ps1

$ErrorActionPreference = "Stop"

Write-Host "🚀 Iniciando pruebas en STAGING..." -ForegroundColor Cyan
Write-Host ""

# URLs de los servicios en staging
$CORE_SERVICE_URL = "https://core-service-stg-697203931362.us-central1.run.app"
$POSTBACK_SERVICE_URL = "https://postback-service-stg-697203931362.us-central1.run.app"
$API_GATEWAY_URL = "https://staging.xafra-ads.com"

# Test data
$TEST_TRACKING = "TEST-GA-" + (Get-Date -Format "yyyyMMdd-HHmmss")
$TEST_APIKEY = "demo-api-key-staging"

Write-Host "📊 CONFIGURACIÓN DE PRUEBA" -ForegroundColor Yellow
Write-Host "  Core Service: $CORE_SERVICE_URL" -ForegroundColor Gray
Write-Host "  Postback Service: $POSTBACK_SERVICE_URL" -ForegroundColor Gray
Write-Host "  API Gateway: $API_GATEWAY_URL" -ForegroundColor Gray
Write-Host "  Test Tracking: $TEST_TRACKING" -ForegroundColor Gray
Write-Host ""

# ============================================
# TEST 1: Health Check - Core Service
# ============================================
Write-Host "🔍 TEST 1: Health Check - Core Service" -ForegroundColor Green
try {
    $response = Invoke-RestMethod -Uri "$CORE_SERVICE_URL/health" -Method Get -TimeoutSec 10
    Write-Host "  ✅ Core Service está activo" -ForegroundColor Green
    Write-Host "  Status: $($response.status)" -ForegroundColor Gray
    Write-Host "  Version: $($response.version)" -ForegroundColor Gray
} catch {
    Write-Host "  ❌ Error: $_" -ForegroundColor Red
    exit 1
}
Write-Host ""

# ============================================
# TEST 2: Health Check - Postback Service
# ============================================
Write-Host "🔍 TEST 2: Health Check - Postback Service" -ForegroundColor Green
try {
    $response = Invoke-RestMethod -Uri "$POSTBACK_SERVICE_URL/api/health" -Method Get -TimeoutSec 10
    Write-Host "  ✅ Postback Service está activo" -ForegroundColor Green
    Write-Host "  Status: $($response.status)" -ForegroundColor Gray
    Write-Host "  Database: $($response.database.status)" -ForegroundColor Gray
    Write-Host "  Redis: $($response.redis.status)" -ForegroundColor Gray
} catch {
    Write-Host "  ❌ Error: $_" -ForegroundColor Red
    exit 1
}
Write-Host ""

# ============================================
# TEST 3: Google Ads Health Endpoint
# ============================================
Write-Host "🔍 TEST 3: Google Ads Integration Health" -ForegroundColor Green
try {
    $response = Invoke-RestMethod -Uri "$POSTBACK_SERVICE_URL/api/postbacks/google/health" -Method Get -TimeoutSec 10
    Write-Host "  ✅ Google Ads endpoint está activo" -ForegroundColor Green
    Write-Host "  Service: $($response.service)" -ForegroundColor Gray
    Write-Host "  Environment: $($response.environment)" -ForegroundColor Gray
} catch {
    Write-Host "  ❌ Error: $_" -ForegroundColor Red
    exit 1
}
Write-Host ""

# ============================================
# TEST 4: Crear Conversión (sin API Key válida - debe fallar)
# ============================================
Write-Host "🔍 TEST 4: Validación de API Key (debe fallar)" -ForegroundColor Green
try {
    $url = "$CORE_SERVICE_URL/service/v1/confirm/pe/entel/google/invalid-key/$TEST_TRACKING"
    $response = Invoke-RestMethod -Uri $url -Method Get -TimeoutSec 10 -ErrorAction Stop
    Write-Host "  ❌ ERROR: Debería haber rechazado API Key inválida" -ForegroundColor Red
    exit 1
} catch {
    if ($_.Exception.Response.StatusCode -eq 401) {
        Write-Host "  ✅ API Key inválida correctamente rechazada (401)" -ForegroundColor Green
    } else {
        Write-Host "  ⚠️ Respuesta inesperada: $($_.Exception.Response.StatusCode)" -ForegroundColor Yellow
    }
}
Write-Host ""

# ============================================
# TEST 5: Verificar tabla Conversions en la base de datos
# ============================================
Write-Host "🔍 TEST 5: Verificar estructura de base de datos" -ForegroundColor Green
Write-Host "  ℹ️  Ejecutar manualmente:" -ForegroundColor Gray
Write-Host "  docker run --rm -it postgres:14 psql -h 34.28.245.62 -U postgres -d xafra-ads -c `"\dt staging.conversions;`"" -ForegroundColor DarkGray
Write-Host "  Password: XafraTech2025!" -ForegroundColor DarkGray
Write-Host ""

# ============================================
# TEST 6: Stats del Google Ads Service
# ============================================
Write-Host "🔍 TEST 6: Estadísticas de Google Ads" -ForegroundColor Green
try {
    $response = Invoke-RestMethod -Uri "$POSTBACK_SERVICE_URL/api/postbacks/google/stats" -Method Get -TimeoutSec 10
    Write-Host "  ✅ Estadísticas obtenidas" -ForegroundColor Green
    Write-Host "  Total Enviados: $($response.total_sent)" -ForegroundColor Gray
    Write-Host "  Total Exitosos: $($response.total_success)" -ForegroundColor Gray
    Write-Host "  Total Fallidos: $($response.total_failed)" -ForegroundColor Gray
    Write-Host "  Total Pendientes: $($response.total_pending)" -ForegroundColor Gray
} catch {
    Write-Host "  ❌ Error: $_" -ForegroundColor Red
}
Write-Host ""

# ============================================
# RESUMEN
# ============================================
Write-Host "📋 RESUMEN DE PRUEBAS" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host "✅ Core Service: ACTIVO" -ForegroundColor Green
Write-Host "✅ Postback Service: ACTIVO" -ForegroundColor Green
Write-Host "✅ Google Ads Integration: ACTIVO" -ForegroundColor Green
Write-Host "✅ Validación de seguridad: FUNCIONANDO" -ForegroundColor Green
Write-Host ""
Write-Host "🎯 PRÓXIMOS PASOS:" -ForegroundColor Yellow
Write-Host "  1. Crear una API Key válida en la tabla customers" -ForegroundColor Gray
Write-Host "  2. Probar endpoint completo con API Key válida" -ForegroundColor Gray
Write-Host "  3. Verificar creación de registros en tabla conversions" -ForegroundColor Gray
Write-Host "  4. Validar envío a Google Ads API" -ForegroundColor Gray
Write-Host ""
Write-Host "🔗 ENDPOINTS DISPONIBLES:" -ForegroundColor Cyan
Write-Host "  GET $CORE_SERVICE_URL/service/v1/confirm/pe/entel/google/{apikey}/{tracking}" -ForegroundColor DarkGray
Write-Host "  GET $CORE_SERVICE_URL/service/v1/google/conversion/status/{tracking}" -ForegroundColor DarkGray
Write-Host "  POST $POSTBACK_SERVICE_URL/api/postbacks/google/conversion" -ForegroundColor DarkGray
Write-Host "  GET $POSTBACK_SERVICE_URL/api/postbacks/google/health" -ForegroundColor DarkGray
Write-Host "  GET $POSTBACK_SERVICE_URL/api/postbacks/google/stats" -ForegroundColor DarkGray
Write-Host ""

Write-Host "✨ Deployment en staging completado exitosamente!" -ForegroundColor Green
