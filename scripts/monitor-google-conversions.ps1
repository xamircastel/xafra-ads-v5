# ============================================
# Monitor Google Ads Conversions
# Real-time monitoring and statistics
# ============================================

param(
    [int]$Days = 7,
    [string]$Environment = "staging"  # staging or production
)

Write-Host "📊 Google Ads Conversions Monitor" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

# Configuration
$POSTBACK_URL_STG = "https://postback-service-stg-697203931362.us-central1.run.app"
$POSTBACK_URL_PROD = "https://postback-service-prod-697203931362.us-central1.run.app"  # Update with actual prod URL

$POSTBACK_URL = if ($Environment -eq "production") { $POSTBACK_URL_PROD } else { $POSTBACK_URL_STG }

Write-Host "Environment: $Environment" -ForegroundColor Yellow
Write-Host "Period: Last $Days days" -ForegroundColor Yellow
Write-Host ""

# ============================================
# Get Statistics
# ============================================
Write-Host "🔍 Fetching conversion statistics..." -ForegroundColor Cyan

$statsUrl = "$POSTBACK_URL/api/postbacks/google/stats?days=$Days"

try {
    $stats = Invoke-RestMethod -Uri $statsUrl -Method GET -TimeoutSec 30
    
    if ($stats.success) {
        Write-Host "✅ Statistics Retrieved" -ForegroundColor Green
        Write-Host ""
        
        # Summary
        Write-Host "📈 SUMMARY (Last $Days days)" -ForegroundColor Yellow
        Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
        
        $summary = $stats.data.summary
        $total = [int]$summary.total_conversions
        $successful = [int]$summary.successful
        $failed = [int]$summary.failed
        $pending = [int]$summary.pending
        
        Write-Host "Total Conversions:    $total" -ForegroundColor White
        Write-Host "✅ Successful:        $successful" -ForegroundColor Green
        Write-Host "❌ Failed:            $failed" -ForegroundColor Red
        Write-Host "⏳ Pending:           $pending" -ForegroundColor Yellow
        Write-Host "👥 Unique Customers:  $($summary.unique_customers)" -ForegroundColor White
        Write-Host "📢 Unique Campaigns:  $($summary.unique_campaigns)" -ForegroundColor White
        
        # Calculate success rate
        if ($total -gt 0) {
            $successRate = [math]::Round(($successful / $total) * 100, 2)
            Write-Host ""
            Write-Host "Success Rate:         $successRate%" -ForegroundColor $(if($successRate -ge 95){'Green'}elseif($successRate -ge 90){'Yellow'}else{'Red'})
        }
        
        Write-Host ""
        Write-Host ""
        
        # Daily breakdown
        if ($stats.data.daily_stats -and $stats.data.daily_stats.Count -gt 0) {
            Write-Host "📅 DAILY BREAKDOWN" -ForegroundColor Yellow
            Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
            Write-Host ""
            
            # Table header
            Write-Host $("{0,-12} {1,8} {2,8} {3,8} {4,8}" -f "Date", "Total", "Success", "Failed", "Pending") -ForegroundColor Cyan
            Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
            
            foreach ($day in $stats.data.daily_stats) {
                $date = ([DateTime]$day.date).ToString("yyyy-MM-dd")
                $dayTotal = [int]$day.total_conversions
                $daySuccess = [int]$day.successful
                $dayFailed = [int]$day.failed
                $dayPending = [int]$day.pending
                
                $color = if ($daySuccess -eq $dayTotal) { 'Green' } elseif ($dayFailed -gt 0) { 'Yellow' } else { 'White' }
                
                Write-Host $("{0,-12} {1,8} {2,8} {3,8} {4,8}" -f $date, $dayTotal, $daySuccess, $dayFailed, $dayPending) -ForegroundColor $color
            }
            
            Write-Host ""
        }
        
        Write-Host ""
        Write-Host "Last updated: $($stats.data.generated_at)" -ForegroundColor Gray
        
    } else {
        Write-Host "❌ Failed to retrieve statistics: $($stats.error)" -ForegroundColor Red
    }
    
} catch {
    Write-Host "❌ Error connecting to monitoring service" -ForegroundColor Red
    Write-Host "   $($_.Exception.Message)" -ForegroundColor Red
    
    if ($_.Exception.Response) {
        Write-Host "   Status Code: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
    }
}

Write-Host ""

# ============================================
# Service Health Check
# ============================================
Write-Host "🏥 Service Health Check" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray

$healthUrl = "$POSTBACK_URL/api/postbacks/google/health"

try {
    $health = Invoke-RestMethod -Uri $healthUrl -Method GET -TimeoutSec 10
    
    if ($health.success) {
        Write-Host "✅ Google Ads Postback Service: Healthy" -ForegroundColor Green
        Write-Host "   Service: $($health.service)" -ForegroundColor Gray
        Write-Host "   Status: $($health.status)" -ForegroundColor Gray
        Write-Host "   Timestamp: $($health.timestamp)" -ForegroundColor Gray
    } else {
        Write-Host "⚠️ Service Health: Unknown" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Service: Unavailable" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host "✅ Monitoring Complete" -ForegroundColor Green
Write-Host ""

# ============================================
# Optional: Auto-refresh mode
# ============================================
if ($args -contains "-watch") {
    Write-Host "Press Ctrl+C to stop monitoring..." -ForegroundColor Yellow
    Write-Host ""
    
    while ($true) {
        Start-Sleep -Seconds 30
        Clear-Host
        & $MyInvocation.MyCommand.Path -Days $Days -Environment $Environment
    }
}
