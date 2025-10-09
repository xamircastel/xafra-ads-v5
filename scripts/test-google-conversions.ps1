# ============================================
# Test Google Ads Conversions - ENTEL Peru
# Xafra-ads v5
# ============================================

Write-Host "🧪 Testing Google Ads Conversions API" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# Configuration
$BASE_URL_STG = "https://core-service-stg-shk2qzic2q-uc.a.run.app"
$BASE_URL_LOCAL = "http://localhost:8080"
$BASE_URL = $BASE_URL_STG  # Change to $BASE_URL_LOCAL for local testing

# Test API Key (replace with actual API key)
$APIKEY = "xafra_mfs9yf3g_e8c39158306ce0759b573cf36c56218b"

# Test Google Click ID (mock gclid)
$GCLID = "EAIaIQobChMIp7vN9P_test_$(Get-Date -Format 'yyyyMMddHHmmss')"

Write-Host "📋 Configuration:" -ForegroundColor Yellow
Write-Host "   Base URL: $BASE_URL" -ForegroundColor Gray
Write-Host "   API Key: $($APIKEY.Substring(0,15))..." -ForegroundColor Gray
Write-Host "   Test gclid: $GCLID" -ForegroundColor Gray
Write-Host ""

# ============================================
# Test 1: Simple Conversion (Required Only)
# ============================================
Write-Host "📤 Test 1: Simple Conversion (Required Fields Only)" -ForegroundColor Yellow

$url1 = "$BASE_URL/service/v1/confirm/pe/entel/google/$APIKEY/$GCLID"

try {
    $response1 = Invoke-RestMethod -Uri $url1 -Method GET -ContentType "application/json" -TimeoutSec 30
    
    if ($response1.success) {
        Write-Host "✅ Test 1 PASSED" -ForegroundColor Green
        Write-Host "   Conversion ID: $($response1.data.conversion_id)" -ForegroundColor Gray
        Write-Host "   Tracking: $($response1.data.tracking)" -ForegroundColor Gray
        Write-Host "   Customer: $($response1.data.customer)" -ForegroundColor Gray
        Write-Host "   Country: $($response1.data.country)" -ForegroundColor Gray
        Write-Host "   Operator: $($response1.data.operator)" -ForegroundColor Gray
        Write-Host "   Response Time: $($response1.data.response_time_ms)ms" -ForegroundColor Gray
    } else {
        Write-Host "❌ Test 1 FAILED: $($response1.error)" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Test 1 FAILED: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $errorBody = $reader.ReadToEnd()
        Write-Host "   Error Details: $errorBody" -ForegroundColor Red
    }
}

Write-Host ""
Start-Sleep -Seconds 2

# ============================================
# Test 2: Full Conversion (With Optional Data)
# ============================================
Write-Host "📤 Test 2: Full Conversion (With Optional Data)" -ForegroundColor Yellow

$GCLID2 = "EAIaIQobChMIp7vN9P_test_full_$(Get-Date -Format 'yyyyMMddHHmmss')"
$url2 = "$BASE_URL/service/v1/confirm/pe/entel/google/$APIKEY/$GCLID2"

$body2 = @{
    msisdn = "51987654321"
    empello_token = "uknfebhjcwtmvngwoubdszyycvltwuwicitgufabsaryejrgopelsyqzltlwtlnf"
    id_product = 123
    campaign = "PromoOctubre2025"
} | ConvertTo-Json

try {
    $response2 = Invoke-RestMethod -Uri $url2 -Method GET -Body $body2 -ContentType "application/json" -TimeoutSec 30
    
    if ($response2.success) {
        Write-Host "✅ Test 2 PASSED" -ForegroundColor Green
        Write-Host "   Conversion ID: $($response2.data.conversion_id)" -ForegroundColor Gray
        Write-Host "   Response Time: $($response2.data.response_time_ms)ms" -ForegroundColor Gray
    } else {
        Write-Host "❌ Test 2 FAILED: $($response2.error)" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Test 2 FAILED: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Start-Sleep -Seconds 2

# ============================================
# Test 3: Duplicate Conversion (Should Fail)
# ============================================
Write-Host "📤 Test 3: Duplicate Conversion (Should Return 409)" -ForegroundColor Yellow

$url3 = "$BASE_URL/service/v1/confirm/pe/entel/google/$APIKEY/$GCLID"  # Using same gclid as Test 1

try {
    $response3 = Invoke-RestMethod -Uri $url3 -Method GET -ContentType "application/json" -TimeoutSec 30
    Write-Host "❌ Test 3 FAILED: Duplicate should have been rejected" -ForegroundColor Red
} catch {
    if ($_.Exception.Response.StatusCode -eq 409) {
        Write-Host "✅ Test 3 PASSED: Duplicate correctly rejected (409)" -ForegroundColor Green
    } else {
        Write-Host "❌ Test 3 FAILED: Wrong status code: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
    }
}

Write-Host ""
Start-Sleep -Seconds 2

# ============================================
# Test 4: Invalid API Key (Should Fail)
# ============================================
Write-Host "📤 Test 4: Invalid API Key (Should Return 401)" -ForegroundColor Yellow

$GCLID4 = "EAIaIQobChMIp7vN9P_test_invalid_$(Get-Date -Format 'yyyyMMddHHmmss')"
$url4 = "$BASE_URL/service/v1/confirm/pe/entel/google/invalid_apikey_123/$GCLID4"

try {
    $response4 = Invoke-RestMethod -Uri $url4 -Method GET -ContentType "application/json" -TimeoutSec 30
    Write-Host "❌ Test 4 FAILED: Invalid API key should have been rejected" -ForegroundColor Red
} catch {
    if ($_.Exception.Response.StatusCode -eq 401) {
        Write-Host "✅ Test 4 PASSED: Invalid API key correctly rejected (401)" -ForegroundColor Green
    } else {
        Write-Host "❌ Test 4 FAILED: Wrong status code: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
    }
}

Write-Host ""
Start-Sleep -Seconds 2

# ============================================
# Test 5: Invalid Tracking (Too Short)
# ============================================
Write-Host "📤 Test 5: Invalid Tracking (Should Return 400)" -ForegroundColor Yellow

$url5 = "$BASE_URL/service/v1/confirm/pe/entel/google/$APIKEY/short"

try {
    $response5 = Invoke-RestMethod -Uri $url5 -Method GET -ContentType "application/json" -TimeoutSec 30
    Write-Host "❌ Test 5 FAILED: Invalid tracking should have been rejected" -ForegroundColor Red
} catch {
    if ($_.Exception.Response.StatusCode -eq 400) {
        Write-Host "✅ Test 5 PASSED: Invalid tracking correctly rejected (400)" -ForegroundColor Green
    } else {
        Write-Host "❌ Test 5 FAILED: Wrong status code: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
    }
}

Write-Host ""
Start-Sleep -Seconds 3

# ============================================
# Test 6: Check Conversion Status
# ============================================
Write-Host "📤 Test 6: Check Conversion Status" -ForegroundColor Yellow

$url6 = "$BASE_URL/service/v1/google/conversion/status/$GCLID"

try {
    $response6 = Invoke-RestMethod -Uri $url6 -Method GET -ContentType "application/json" -TimeoutSec 30
    
    if ($response6.success) {
        Write-Host "✅ Test 6 PASSED" -ForegroundColor Green
        Write-Host "   Conversion ID: $($response6.data.conversion_id)" -ForegroundColor Gray
        Write-Host "   Status: $($response6.data.status_description)" -ForegroundColor Gray
        Write-Host "   Status Code: $($response6.data.status_post_back)" -ForegroundColor Gray
        Write-Host "   Conversion Date: $($response6.data.conversion_date)" -ForegroundColor Gray
        
        if ($response6.data.date_post_back) {
            Write-Host "   Postback Date: $($response6.data.date_post_back)" -ForegroundColor Gray
        }
    } else {
        Write-Host "❌ Test 6 FAILED: $($response6.error)" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Test 6 FAILED: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "✅ All tests completed!" -ForegroundColor Green
Write-Host ""

# ============================================
# Optional: Check Postback Service Health
# ============================================
Write-Host "🔍 Checking Postback Service Health..." -ForegroundColor Cyan

$POSTBACK_URL_STG = "https://postback-service-stg-697203931362.us-central1.run.app"
$healthUrl = "$POSTBACK_URL_STG/api/postbacks/google/health"

try {
    $health = Invoke-RestMethod -Uri $healthUrl -Method GET -TimeoutSec 10
    
    if ($health.success) {
        Write-Host "✅ Postback Service: Healthy" -ForegroundColor Green
        Write-Host "   Service: $($health.service)" -ForegroundColor Gray
        Write-Host "   Status: $($health.status)" -ForegroundColor Gray
    }
} catch {
    Write-Host "⚠️ Postback Service: Could not reach" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🎉 Testing Complete!" -ForegroundColor Green
