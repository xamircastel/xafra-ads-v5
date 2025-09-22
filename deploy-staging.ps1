# 🧪 DEPLOYMENT OPTIMIZADO PARA STAGING (PowerShell)
# ==================================================
# Costo estimado: $4 USD/mes (2 servicios mínimos)

param(
    [string]$ProjectId = "xafra-ads",
    [string]$Region = "us-central1"
)

Write-Host "🧪 DEPLOYING XAFRA-ADS V5 TO STAGING" -ForegroundColor Yellow
Write-Host "====================================" -ForegroundColor Yellow
Write-Host "Proyecto: $ProjectId" -ForegroundColor Cyan
Write-Host "Región: $Region" -ForegroundColor Cyan
Write-Host "Costo estimado: `$4 USD/mes" -ForegroundColor Green
Write-Host ""

# 1. Configurar proyecto
gcloud config set project $ProjectId

# 2. Build y deploy Core Service
Write-Host "🔧 Building Core Service..." -ForegroundColor Yellow
gcloud builds submit --tag "gcr.io/$ProjectId/core-service-stg" --build-arg SERVICE_NAME=core-service -f infrastructure/docker/Dockerfile.service .

Write-Host "🚀 Deploying Core Service..." -ForegroundColor Yellow
gcloud run deploy core-service-stg `
  --image "gcr.io/$ProjectId/core-service-stg" `
  --platform managed `
  --region $Region `
  --allow-unauthenticated `
  --memory 512Mi `
  --cpu 1 `
  --min-instances 0 `
  --max-instances 3 `
  --port 8080 `
  --set-env-vars NODE_ENV=staging `
  --set-env-vars DATABASE_URL="postgresql://postgres:XafraTech2025!@34.28.245.62:5432/xafra-ads?schema=staging"

# 3. Build y deploy Tracking Service
Write-Host "🔧 Building Tracking Service..." -ForegroundColor Yellow
gcloud builds submit --tag "gcr.io/$ProjectId/tracking-service-stg" --build-arg SERVICE_NAME=tracking-service -f infrastructure/docker/Dockerfile.service .

Write-Host "🚀 Deploying Tracking Service..." -ForegroundColor Yellow
gcloud run deploy tracking-service-stg `
  --image "gcr.io/$ProjectId/tracking-service-stg" `
  --platform managed `
  --region $Region `
  --allow-unauthenticated `
  --memory 512Mi `
  --cpu 1 `
  --min-instances 0 `
  --max-instances 2 `
  --port 8080 `
  --set-env-vars NODE_ENV=staging `
  --set-env-vars DATABASE_URL="postgresql://postgres:XafraTech2025!@34.28.245.62:5432/xafra-ads?schema=staging"

Write-Host ""
Write-Host "🎉 STAGING DEPLOYMENT COMPLETADO" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Green
Write-Host "Core Service URL:" -ForegroundColor Cyan
gcloud run services describe core-service-stg --region=$Region --format="value(status.url)"
Write-Host ""
Write-Host "Tracking Service URL:" -ForegroundColor Cyan
gcloud run services describe tracking-service-stg --region=$Region --format="value(status.url)"
Write-Host ""
Write-Host "💰 Costo estimado: `$4 USD/mes" -ForegroundColor Green
Write-Host "🧪 Ambiente: STAGING (schema: staging)" -ForegroundColor Cyan