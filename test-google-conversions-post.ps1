# Script de Testing - Google Ads Conversions API (POST)
# Date: 2025-01-02
# Description: Tests the POST endpoint with various scenarios

param(
    [switch]$OnlyUrlParams,
    [switch]$WithFullBody,
    [string]$Environment = "staging"
)

Write-Host "===============================================" -ForegroundColor Cyan
Write-Host "  GOOGLE ADS CONVERSIONS API - POST TESTS" -ForegroundColor Cyan
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host ""

# Configuration
$STAGING_URL = "https://core-service-stg-697203931362.us-central1.run.app"
$PROD_URL = "https://core-service-prod-697203931362.us-central1.run.app"

$BASE_URL = if ($Environment -eq "production") { $PROD_URL } else { $STAGING_URL }

# Test data
$APIKEY = "testing_api_key_2024"  # Replace with actual API key
$TIMESTAMP = Get-Date -Format "yyyyMMdd-HHmmss"
$TRACKING_BASE = "TEST-GOOGLE-$TIMESTAMP"

Write-Host "🔧 Configuration:" -ForegroundColor Yellow
Write-Host "   Environment: $Environment" -ForegroundColor White
Write-Host "   Base URL: $BASE_URL" -ForegroundColor White
Write-Host "   API Key: $APIKEY" -ForegroundColor White
Write-Host ""

# Test 1: POST with only URL parameters (no body)
Write-Host "📋 TEST 1: POST with only URL parameters" -ForegroundColor Cyan
Write-Host "   Description: Test obligatory parameters only" -ForegroundColor Gray
Write-Host ""

$tracking1 = "$TRACKING_BASE-001"
$url1 = "$BASE_URL/service/v1/google/conversion/$APIKEY/$tracking1"

Write-Host "   URL: $url1" -ForegroundColor White
Write-Host "   Method: POST" -ForegroundColor White
Write-Host "   Body: (empty)" -ForegroundColor White
Write-Host ""

try {
    $response1 = Invoke-RestMethod `
        -Uri $url1 `
        -Method POST `
        -ContentType "application/json" `
        -TimeoutSec 30

    Write-Host "   ✅ SUCCESS" -ForegroundColor Green
    Write-Host "   Response:" -ForegroundColor Yellow
    Write-Host ($response1 | ConvertTo-Json -Depth 10) -ForegroundColor White
} catch {
    Write-Host "   ❌ FAILED" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        Write-Host "   Details: $($_.ErrorDetails.Message)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "---" -ForegroundColor Gray
Write-Host ""

if (-not $OnlyUrlParams) {
    # Test 2: POST with partial body (only msisdn and campaign)
    Write-Host "📋 TEST 2: POST with partial body" -ForegroundColor Cyan
    Write-Host "   Description: Test with some optional parameters" -ForegroundColor Gray
    Write-Host ""

    $tracking2 = "$TRACKING_BASE-002"
    $url2 = "$BASE_URL/service/v1/google/conversion/$APIKEY/$tracking2"

    $body2 = @{
        msisdn = "51987654321"
        campaign = "Juegos1"
    } | ConvertTo-Json

    Write-Host "   URL: $url2" -ForegroundColor White
    Write-Host "   Method: POST" -ForegroundColor White
    Write-Host "   Body:" -ForegroundColor White
    Write-Host $body2 -ForegroundColor Gray
    Write-Host ""

    try {
        $response2 = Invoke-RestMethod `
            -Uri $url2 `
            -Method POST `
            -ContentType "application/json" `
            -Body $body2 `
            -TimeoutSec 30

        Write-Host "   ✅ SUCCESS" -ForegroundColor Green
        Write-Host "   Response:" -ForegroundColor Yellow
        Write-Host ($response2 | ConvertTo-Json -Depth 10) -ForegroundColor White
    } catch {
        Write-Host "   ❌ FAILED" -ForegroundColor Red
        Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
        if ($_.ErrorDetails.Message) {
            Write-Host "   Details: $($_.ErrorDetails.Message)" -ForegroundColor Red
        }
    }

    Write-Host ""
    Write-Host "---" -ForegroundColor Gray
    Write-Host ""
}

if ($WithFullBody -or (-not $OnlyUrlParams)) {
    # Test 3: POST with full body
    Write-Host "📋 TEST 3: POST with full body" -ForegroundColor Cyan
    Write-Host "   Description: Test with all optional parameters" -ForegroundColor Gray
    Write-Host ""

    $tracking3 = "$TRACKING_BASE-003"
    $url3 = "$BASE_URL/service/v1/google/conversion/$APIKEY/$tracking3"

    $body3 = @{
        msisdn = "51987654321"
        id_product = "PROD-ENTEL-123"
        empello_token = "uknfebhjcwtmvngwoubdszyycvltwuwicitgufabsaryejrgopelsyqzltlwtlnf"
        campaign = "Juegos1"
    } | ConvertTo-Json

    Write-Host "   URL: $url3" -ForegroundColor White
    Write-Host "   Method: POST" -ForegroundColor White
    Write-Host "   Body:" -ForegroundColor White
    Write-Host $body3 -ForegroundColor Gray
    Write-Host ""

    try {
        $response3 = Invoke-RestMethod `
            -Uri $url3 `
            -Method POST `
            -ContentType "application/json" `
            -Body $body3 `
            -TimeoutSec 30

        Write-Host "   ✅ SUCCESS" -ForegroundColor Green
        Write-Host "   Response:" -ForegroundColor Yellow
        Write-Host ($response3 | ConvertTo-Json -Depth 10) -ForegroundColor White
        
        # Store conversion_id for status check
        $conversionId = $response3.data.conversion_id
        $tracking3Value = $response3.data.tracking
        
        Write-Host ""
        Write-Host "   📊 Checking conversion status..." -ForegroundColor Cyan
        Start-Sleep -Seconds 2
        
        $statusUrl = "$BASE_URL/service/v1/google/conversion/status/$tracking3Value"
        Write-Host "   Status URL: $statusUrl" -ForegroundColor White
        
        try {
            $statusResponse = Invoke-RestMethod `
                -Uri $statusUrl `
                -Method GET `
                -TimeoutSec 30
            
            Write-Host "   ✅ Status check successful" -ForegroundColor Green
            Write-Host "   Status Response:" -ForegroundColor Yellow
            Write-Host ($statusResponse | ConvertTo-Json -Depth 10) -ForegroundColor White
        } catch {
            Write-Host "   ❌ Status check failed" -ForegroundColor Red
            Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
        }
        
    } catch {
        Write-Host "   ❌ FAILED" -ForegroundColor Red
        Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
        if ($_.ErrorDetails.Message) {
            Write-Host "   Details: $($_.ErrorDetails.Message)" -ForegroundColor Red
        }
    }

    Write-Host ""
    Write-Host "---" -ForegroundColor Gray
    Write-Host ""
}

# Test 4: Validation tests
Write-Host "📋 TEST 4: Validation tests" -ForegroundColor Cyan
Write-Host "   Description: Test validation of optional parameters" -ForegroundColor Gray
Write-Host ""

# Test 4a: Invalid msisdn (too long)
Write-Host "   Test 4a: Invalid msisdn (too long)" -ForegroundColor Yellow
$tracking4a = "$TRACKING_BASE-004a"
$url4a = "$BASE_URL/service/v1/google/conversion/$APIKEY/$tracking4a"

$body4a = @{
    msisdn = "519876543210123456789012345678901"  # 33 characters (max is 20)
} | ConvertTo-Json

try {
    $response4a = Invoke-RestMethod `
        -Uri $url4a `
        -Method POST `
        -ContentType "application/json" `
        -Body $body4a `
        -TimeoutSec 30
    
    Write-Host "   ❌ UNEXPECTED SUCCESS (should have failed)" -ForegroundColor Red
} catch {
    Write-Host "   ✅ EXPECTED FAILURE" -ForegroundColor Green
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Gray
}

Write-Host ""

# Test 4b: Invalid id_product (too long)
Write-Host "   Test 4b: Invalid id_product (too long)" -ForegroundColor Yellow
$tracking4b = "$TRACKING_BASE-004b"
$url4b = "$BASE_URL/service/v1/google/conversion/$APIKEY/$tracking4b"

$longString = "A" * 300  # 300 characters (max is 255)
$body4b = @{
    id_product = $longString
} | ConvertTo-Json

try {
    $response4b = Invoke-RestMethod `
        -Uri $url4b `
        -Method POST `
        -ContentType "application/json" `
        -Body $body4b `
        -TimeoutSec 30
    
    Write-Host "   ❌ UNEXPECTED SUCCESS (should have failed)" -ForegroundColor Red
} catch {
    Write-Host "   ✅ EXPECTED FAILURE" -ForegroundColor Green
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Gray
}

Write-Host ""

# Test 4c: Duplicate tracking
Write-Host "   Test 4c: Duplicate tracking" -ForegroundColor Yellow
$tracking4c = $tracking1  # Reuse tracking from Test 1
$url4c = "$BASE_URL/service/v1/google/conversion/$APIKEY/$tracking4c"

try {
    $response4c = Invoke-RestMethod `
        -Uri $url4c `
        -Method POST `
        -ContentType "application/json" `
        -TimeoutSec 30
    
    Write-Host "   ❌ UNEXPECTED SUCCESS (should have failed)" -ForegroundColor Red
} catch {
    Write-Host "   ✅ EXPECTED FAILURE" -ForegroundColor Green
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Gray
}

Write-Host ""
Write-Host "---" -ForegroundColor Gray
Write-Host ""

# Summary
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host "  TEST SUMMARY" -ForegroundColor Cyan
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Tests completed for Google Ads Conversions API (POST)" -ForegroundColor Green
Write-Host ""
Write-Host "Coverage:" -ForegroundColor Yellow
Write-Host "  ✅ POST with only URL parameters" -ForegroundColor White
if (-not $OnlyUrlParams) {
    Write-Host "  ✅ POST with partial body" -ForegroundColor White
}
if ($WithFullBody -or (-not $OnlyUrlParams)) {
    Write-Host "  ✅ POST with full body" -ForegroundColor White
    Write-Host "  ✅ GET status endpoint" -ForegroundColor White
}
Write-Host "  ✅ Validation tests" -ForegroundColor White
Write-Host ""
Write-Host "For more information, see: GOOGLE_ADS_CONVERSIONS_API.md" -ForegroundColor Cyan
Write-Host ""
