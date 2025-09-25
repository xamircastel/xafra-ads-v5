# Database query script to investigate tracking
$tracking = "ATR_CR_KOLBI_e008egqlrna0yyt16n1hev"

Write-Host "Investigating tracking: $tracking" -ForegroundColor Yellow

# Check current database state
Write-Host "`nChecking database state..." -ForegroundColor Cyan
$url = "https://postback-service-stg-697203931362.us-central1.run.app"

try {
    $statusResponse = Invoke-RestMethod -Uri "$url/api/postbacks/status/$tracking" -Method GET
    Write-Host "✅ Current status:" -ForegroundColor Green
    $statusResponse | ConvertTo-Json -Depth 5
    
    $data = $statusResponse.data
    Write-Host "`n📊 Summary:" -ForegroundColor Cyan
    Write-Host "  - Campaign ID: $($data.campaign_id)" -ForegroundColor White
    Write-Host "  - Current Status: $($data.current_status)" -ForegroundColor $(if($data.current_status -eq 'failed'){'Red'}else{'Green'})
    Write-Host "  - Webhook URL: $($data.webhook_url)" -ForegroundColor White
    Write-Host "  - Total Campaigns: $($data.total_campaigns)" -ForegroundColor White
    
    if ($data.last_attempt -and $data.last_attempt.PSObject.Properties.Count -gt 0) {
        Write-Host "  - Last Attempt Details:" -ForegroundColor Yellow
        $data.last_attempt | ConvertTo-Json -Depth 3
    } else {
        Write-Host "  - Last Attempt: No details available" -ForegroundColor Yellow
    }
    
} catch {
    Write-Host "❌ Status check failed:" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Try to force a postback attempt to see the current error
Write-Host "`n🔄 Attempting to process postback (to see current error)..." -ForegroundColor Cyan
$body = @{
    tracking_id = $tracking
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$url/api/postbacks/send" -Method POST -Body $body -ContentType "application/json"
    Write-Host "✅ Postback processed successfully:" -ForegroundColor Green
    $response | ConvertTo-Json -Depth 5
} catch {
    Write-Host "❌ Postback processing failed (this shows us the current issue):" -ForegroundColor Red
    Write-Host "Status Code: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
    Write-Host "Error Message: $($_.Exception.Message)" -ForegroundColor Red
}

# Check status again to see if anything changed
Write-Host "`n🔍 Checking status after attempt..." -ForegroundColor Cyan
try {
    $statusResponse2 = Invoke-RestMethod -Uri "$url/api/postbacks/status/$tracking" -Method GET
    $newData = $statusResponse2.data
    
    Write-Host "✅ Updated status:" -ForegroundColor Green
    Write-Host "  - Current Status: $($newData.current_status)" -ForegroundColor $(if($newData.current_status -eq 'failed'){'Red'}else{'Green'})
    
    if ($newData.last_attempt -and $newData.last_attempt.PSObject.Properties.Count -gt 0) {
        Write-Host "  - Last Attempt Details:" -ForegroundColor Yellow
        $newData.last_attempt | ConvertTo-Json -Depth 3
    }
    
} catch {
    Write-Host "❌ Status check failed:" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}