# ============================================
# Script de Testing - Google Ads Conversions API
# Entorno: PRODUCCIÓN
# ============================================

Write-Host ""
Write-Host "🧪 TESTING: Google Ads Conversions API - PRODUCCIÓN" -ForegroundColor Cyan
Write-Host "====================================================" -ForegroundColor Cyan
Write-Host ""

# Configuración
$BASE_URL = "https://core-service-prod-697203931362.us-central1.run.app"
$ENDPOINT = "/service/v1/google/conversion"

# ⚠️ IMPORTANTE: Reemplaza estos valores con datos reales de producción
$API_KEY = "YOUR_PRODUCTION_API_KEY_HERE"  # API Key de Digital-X o Gomovil
$TRACKING_BASE = "test-prod-$(Get-Date -Format 'yyyyMMddHHmmss')"

Write-Host "📋 Configuración:" -ForegroundColor Yellow
Write-Host "   Base URL: $BASE_URL" -ForegroundColor Gray
Write-Host "   API Key: $($API_KEY.Substring(0, [Math]::Min(10, $API_KEY.Length)))..." -ForegroundColor Gray
Write-Host "   Tracking base: $TRACKING_BASE" -ForegroundColor Gray
Write-Host ""

# Función para hacer request y mostrar resultado
function Test-Conversion {
    param(
        [string]$TestName,
        [string]$Tracking,
        [string]$Body = $null,
        [int]$ExpectedStatus = 200
    )
    
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
    Write-Host "🔍 Test: $TestName" -ForegroundColor White
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
    
    $url = "$BASE_URL$ENDPOINT/$API_KEY/$Tracking"
    
    Write-Host "📤 Request:" -ForegroundColor Yellow
    Write-Host "   URL: $url" -ForegroundColor Gray
    
    if ($Body) {
        Write-Host "   Body: $Body" -ForegroundColor Gray
    } else {
        Write-Host "   Body: (ninguno)" -ForegroundColor Gray
    }
    
    try {
        if ($Body) {
            $response = Invoke-WebRequest -Uri $url -Method POST -Body $Body -ContentType "application/json" -UseBasicParsing
        } else {
            $response = Invoke-WebRequest -Uri $url -Method POST -UseBasicParsing
        }
        
        $statusCode = $response.StatusCode
        $content = $response.Content | ConvertFrom-Json
        
        Write-Host ""
        Write-Host "📥 Response:" -ForegroundColor Green
        Write-Host "   Status: $statusCode" -ForegroundColor $(if ($statusCode -eq $ExpectedStatus) { "Green" } else { "Red" })
        Write-Host "   Body: $($response.Content)" -ForegroundColor Gray
        
        if ($statusCode -eq $ExpectedStatus) {
            Write-Host "   ✅ PASS: Estado esperado $ExpectedStatus" -ForegroundColor Green
            return $true
        } else {
            Write-Host "   ❌ FAIL: Esperado $ExpectedStatus, recibido $statusCode" -ForegroundColor Red
            return $false
        }
        
    } catch {
        $statusCode = $_.Exception.Response.StatusCode.Value__
        $errorBody = $null
        
        try {
            $stream = $_.Exception.Response.GetResponseStream()
            $reader = New-Object System.IO.StreamReader($stream)
            $errorBody = $reader.ReadToEnd()
        } catch {
            $errorBody = $_.Exception.Message
        }
        
        Write-Host ""
        Write-Host "📥 Response:" -ForegroundColor Yellow
        Write-Host "   Status: $statusCode" -ForegroundColor $(if ($statusCode -eq $ExpectedStatus) { "Green" } else { "Yellow" })
        Write-Host "   Body: $errorBody" -ForegroundColor Gray
        
        if ($statusCode -eq $ExpectedStatus) {
            Write-Host "   ✅ PASS: Estado esperado $ExpectedStatus" -ForegroundColor Green
            return $true
        } else {
            Write-Host "   ⚠️  Resultado inesperado: Esperado $ExpectedStatus, recibido $statusCode" -ForegroundColor Yellow
            return $false
        }
    }
    
    Write-Host ""
}

# Verificar que se haya configurado el API key
if ($API_KEY -eq "YOUR_PRODUCTION_API_KEY_HERE") {
    Write-Host "❌ ERROR: Debes configurar el API_KEY en el script" -ForegroundColor Red
    Write-Host ""
    Write-Host "📝 Pasos:" -ForegroundColor Yellow
    Write-Host "   1. Obtén un API key válido de production.auth_users" -ForegroundColor Gray
    Write-Host "   2. Abre este script en un editor" -ForegroundColor Gray
    Write-Host "   3. Reemplaza 'YOUR_PRODUCTION_API_KEY_HERE' con el API key real" -ForegroundColor Gray
    Write-Host "   4. Guarda y ejecuta de nuevo" -ForegroundColor Gray
    Write-Host ""
    exit 1
}

# ============================================
# SUITE DE TESTS
# ============================================

$results = @()
$testNumber = 0

Write-Host "🚀 Iniciando suite de tests..." -ForegroundColor Cyan
Write-Host ""
Start-Sleep -Seconds 1

# TEST 1: Conversión simple (sin JSON body)
$testNumber++
Write-Host "═══════════════════════════════════════════" -ForegroundColor Cyan
Write-Host " TEST $testNumber: Conversión Simple" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════" -ForegroundColor Cyan
$tracking1 = "$TRACKING_BASE-simple"
$result1 = Test-Conversion -TestName "Conversión simple sin JSON" -Tracking $tracking1 -ExpectedStatus 200
$results += @{ Test = "TEST $testNumber"; Result = $result1 }
Start-Sleep -Seconds 2

# TEST 2: Conversión completa (con JSON body)
$testNumber++
Write-Host "═══════════════════════════════════════════" -ForegroundColor Cyan
Write-Host " TEST $testNumber: Conversión Completa" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════" -ForegroundColor Cyan
$tracking2 = "$TRACKING_BASE-complete"
$jsonBody2 = @{
    msisdn = "50612345678"
    empello_token = "token_test_prod_$(Get-Date -Format 'HHmmss')"
    id_product = "PROD_CR_001"
    campaign = "CR_OCT_2025"
} | ConvertTo-Json -Compress
$result2 = Test-Conversion -TestName "Conversión completa con JSON" -Tracking $tracking2 -Body $jsonBody2 -ExpectedStatus 200
$results += @{ Test = "TEST $testNumber"; Result = $result2 }
Start-Sleep -Seconds 2

# TEST 3: Duplicado (mismo tracking que TEST 1)
$testNumber++
Write-Host "═══════════════════════════════════════════" -ForegroundColor Cyan
Write-Host " TEST $testNumber: Detección de Duplicados" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════" -ForegroundColor Cyan
$result3 = Test-Conversion -TestName "Duplicado (mismo tracking que TEST 1)" -Tracking $tracking1 -ExpectedStatus 409
$results += @{ Test = "TEST $testNumber"; Result = $result3 }
Start-Sleep -Seconds 2

# TEST 4: API Key inválido
$testNumber++
Write-Host "═══════════════════════════════════════════" -ForegroundColor Cyan
Write-Host " TEST $testNumber: Validación API Key" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════" -ForegroundColor Cyan
$tracking4 = "$TRACKING_BASE-invalid-key"
$originalKey = $API_KEY
$API_KEY = "INVALID_API_KEY_12345"
$result4 = Test-Conversion -TestName "API Key inválido" -Tracking $tracking4 -ExpectedStatus 401
$API_KEY = $originalKey
$results += @{ Test = "TEST $testNumber"; Result = $result4 }
Start-Sleep -Seconds 2

# TEST 5: Validación de longitud (msisdn muy largo)
$testNumber++
Write-Host "═══════════════════════════════════════════" -ForegroundColor Cyan
Write-Host " TEST $testNumber: Validación de Longitud" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════" -ForegroundColor Cyan
$tracking5 = "$TRACKING_BASE-validation"
$jsonBody5 = @{
    msisdn = "123456789012345678901234567890"  # > 20 caracteres
    campaign = "TEST"
} | ConvertTo-Json -Compress
$result5 = Test-Conversion -TestName "Campo msisdn excede longitud máxima" -Tracking $tracking5 -Body $jsonBody5 -ExpectedStatus 400
$results += @{ Test = "TEST $testNumber"; Result = $result5 }

# ============================================
# RESUMEN DE RESULTADOS
# ============================================

Write-Host ""
Write-Host ""
Write-Host "╔═══════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║     RESUMEN DE RESULTADOS DE TESTS        ║" -ForegroundColor Cyan
Write-Host "╚═══════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

$passed = 0
$failed = 0

foreach ($result in $results) {
    $icon = if ($result.Result) { "✅" } else { "❌" }
    $color = if ($result.Result) { "Green" } else { "Red" }
    $status = if ($result.Result) { "PASS" } else { "FAIL" }
    
    Write-Host "   $icon $($result.Test): $status" -ForegroundColor $color
    
    if ($result.Result) { $passed++ } else { $failed++ }
}

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
Write-Host "   Total: $($results.Count) tests" -ForegroundColor White
Write-Host "   ✅ Passed: $passed" -ForegroundColor Green
Write-Host "   ❌ Failed: $failed" -ForegroundColor $(if ($failed -gt 0) { "Red" } else { "Green" })
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
Write-Host ""

if ($failed -eq 0) {
    Write-Host "🎉 ¡TODOS LOS TESTS PASARON!" -ForegroundColor Green
    Write-Host ""
    Write-Host "✅ El endpoint está funcionando correctamente en PRODUCCIÓN" -ForegroundColor Green
} else {
    Write-Host "⚠️  Algunos tests fallaron. Revisa los logs arriba." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "💡 Sugerencias:" -ForegroundColor Yellow
    Write-Host "   - Verifica que el API key sea válido en production.auth_users" -ForegroundColor Gray
    Write-Host "   - Revisa los logs de Cloud Run para más detalles" -ForegroundColor Gray
    Write-Host "   - Asegúrate de que el servicio esté completamente desplegado" -ForegroundColor Gray
}

Write-Host ""
Write-Host "📊 Para verificar los datos insertados en la base de datos:" -ForegroundColor Cyan
Write-Host ""
Write-Host "   SELECT * FROM production.conversions" -ForegroundColor Gray
Write-Host "   WHERE tracking LIKE '$TRACKING_BASE%'" -ForegroundColor Gray
Write-Host "   ORDER BY conversion_date DESC;" -ForegroundColor Gray
Write-Host ""
