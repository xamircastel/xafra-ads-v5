# Test specific tracking postback
$tracking = "ATR_CR_KOLBI_e008egqlrna0yyt16n1hev"
$url = "https://postback-service-stg-697203931362.us-central1.run.app"

Write-Host "Testing postback for tracking: $tracking" -ForegroundColor Yellow

# Test postback processing
Write-Host "`nTesting postback processing..." -ForegroundColor Cyan
$body = @{
    tracking_id = $tracking
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$url/api/postbacks/send" -Method POST -Body $body -ContentType "application/json"
    Write-Host "✅ Postback processing response:" -ForegroundColor Green
    $response | ConvertTo-Json -Depth 5
} catch {
    Write-Host "❌ Postback processing failed:" -ForegroundColor Red
    Write-Host "Status Code: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    
    # Try to get response content
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseContent = $reader.ReadToEnd()
        Write-Host "Response Content: $responseContent" -ForegroundColor Red
    }
}

# Check status after attempt
Write-Host "`nChecking status after attempt..." -ForegroundColor Cyan
try {
    $statusResponse = Invoke-RestMethod -Uri "$url/api/postbacks/status/$tracking" -Method GET
    Write-Host "✅ Status check response:" -ForegroundColor Green
    $statusResponse | ConvertTo-Json -Depth 5
} catch {
    Write-Host "❌ Status check failed:" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}