#!/usr/bin/env pwsh
# Script para probar el postback-service desplegado

$SERVICE_URL = "https://postback-service-stg-697203931362.us-central1.run.app"

Write-Host "🚀 Probando postback-service en staging..." -ForegroundColor Green

# Test 1: Endpoint raíz
Write-Host "`n📋 Test 1: Información del servicio" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$SERVICE_URL/" -Method GET
    $response | ConvertTo-Json -Depth 3
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 2: Health check
Write-Host "`n🔍 Test 2: Health check" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$SERVICE_URL/api/health" -Method GET -TimeoutSec 30
    $response | ConvertTo-Json -Depth 3
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 3: Postback endpoint (sin datos para verificar que responde)
Write-Host "`n📤 Test 3: Endpoint de postback (prueba básica)" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$SERVICE_URL/api/postbacks/send" -Method POST -ContentType "application/json" -Body "{}" -TimeoutSec 30
    $response | ConvertTo-Json -Depth 3
} catch {
    Write-Host "⚠️  Respuesta esperada (datos incompletos): $($_.Exception.Message)" -ForegroundColor Yellow
}

Write-Host "`n✅ Pruebas completadas" -ForegroundColor Green