# Script para revisar logs de GCP de manera más eficiente
# Uso: .\check-logs-gcp.ps1 -Tracking "test1202510081015"

param(
    [Parameter(Mandatory=$false)]
    [string]$Tracking = "",
    
    [Parameter(Mandatory=$false)]
    [int]$Limit = 100,
    
    [Parameter(Mandatory=$false)]
    [int]$MinutesAgo = 5
)

$project = "xafra-ads"
$service = "core-service-stg"

# Calcular timestamp
$timestamp = (Get-Date).AddMinutes(-$MinutesAgo).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")

Write-Host "🔍 Consultando logs de GCP..." -ForegroundColor Cyan
Write-Host "   Service: $service" -ForegroundColor Gray
Write-Host "   Desde: $timestamp" -ForegroundColor Gray
Write-Host "   Tracking: $Tracking" -ForegroundColor Gray
Write-Host ""

if ($Tracking -ne "") {
    # Buscar logs específicos de un tracking
    Write-Host "📋 Buscando logs para tracking: $Tracking" -ForegroundColor Yellow
    
    gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=$service AND textPayload:$Tracking" `
        --limit=$Limit `
        --format="table(timestamp,textPayload)" `
        --project=$project `
        2>$null
} else {
    # Mostrar logs generales recientes
    Write-Host "📋 Mostrando logs recientes del servicio" -ForegroundColor Yellow
    
    gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=$service" `
        --limit=$Limit `
        --format="table(timestamp,severity,textPayload)" `
        --project=$project `
        2>$null
}

Write-Host ""
Write-Host "✅ Consulta completada" -ForegroundColor Green
