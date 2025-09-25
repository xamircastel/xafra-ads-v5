#!/usr/bin/env pwsh
# Script de prueba completa del postback-service tras correcciones

$SERVICE_URL = "https://postback-service-stg-697203931362.us-central1.run.app"

Write-Host "`n🔧 PRUEBA POST-CORRECCIÓN DEL POSTBACK-SERVICE" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

# Test 1: Health check
Write-Host "`n🏥 Test 1: Health Check" -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "$SERVICE_URL/api/health" -Method GET -TimeoutSec 30
    if ($health.status -eq "healthy") {
        Write-Host "✅ Health check exitoso" -ForegroundColor Green
        Write-Host "   - Database: $($health.checks.dependencies.database.status)" -ForegroundColor Gray
        Write-Host "   - Redis: $($health.checks.dependencies.cache.status)" -ForegroundColor Gray
        Write-Host "   - Schema: $($health.checks.dependencies.database.schema)" -ForegroundColor Gray
    }
} catch {
    Write-Host "❌ Health check falló: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 2: Postback con tracking real
Write-Host "`n📤 Test 2: Postback con tracking testxamir230920251721" -ForegroundColor Yellow

$postbackData = @{
    campaign_id = 18
    tracking_id = "testxamir230920251721"
    conversion_id = "test_conv_corrected_$(Get-Date -Format 'yyyyMMddHHmmss')"
    webhook_url = "https://httpbin.org/post"
    postback_parameters = @{
        customer_id = 3
        customer_name = "Cliente Test"
        product_id = 3
        product_name = "Producto Test"
        original_tracking = "testxamir230920251721"
        short_tracking = "testxamir230920251721"
        tracking_used = "testxamir230920251721"
        is_kolbi_confirmation = $true
        confirmed_at = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
        country = "CR"
        operator = "KOLBI"
        method = "POST"
    }
    priority = "high"
} | ConvertTo-Json -Depth 3

try {
    $result = Invoke-RestMethod -Uri "$SERVICE_URL/api/postbacks/send" -Method POST -ContentType "application/json" -Body $postbackData -TimeoutSec 60
    
    if ($result.success) {
        Write-Host "✅ Postback exitoso!" -ForegroundColor Green
        Write-Host "   - Campaign ID: $($result.data.campaign_id)" -ForegroundColor Gray
        Write-Host "   - Tracking: $($result.data.tracking_id)" -ForegroundColor Gray
        Write-Host "   - Response Time: $($result.data.response_time)" -ForegroundColor Gray
        Write-Host "   - Status: $($result.data.postback_result.success)" -ForegroundColor Gray
    } else {
        Write-Host "⚠️ Postback falló pero servicio respondió:" -ForegroundColor Yellow
        Write-Host "   - Error: $($result.error)" -ForegroundColor Gray
    }
} catch {
    Write-Host "❌ Error en postback: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 3: Verificar estado del tracking
Write-Host "`n🔍 Test 3: Verificar estado del tracking" -ForegroundColor Yellow
try {
    $status = Invoke-RestMethod -Uri "$SERVICE_URL/api/postbacks/status/testxamir230920251721" -Method GET -TimeoutSec 30
    Write-Host "✅ Estado obtenido:" -ForegroundColor Green
    Write-Host "   - Estado actual: $($status.data.current_status)" -ForegroundColor Gray
    Write-Host "   - Último intento: $($status.data.last_attempt)" -ForegroundColor Gray
    Write-Host "   - Total campaigns: $($status.data.total_campaigns)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Error obteniendo estado: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n🏁 Pruebas completadas" -ForegroundColor Cyan