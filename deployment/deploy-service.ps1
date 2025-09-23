#!/usr/bin/env pwsh
# 🚀 SCRIPT DE DEPLOY UNIFICADO PARA XAFRA-ADS V5
# Uso: .\deploy-service.ps1 -ServiceName "core-service" -Environment "staging"

param(
    [Parameter(Mandatory=$true)]
    [string]$ServiceName,
    
    [Parameter(Mandatory=$false)]
    [string]$Environment = "staging",
    
    [Parameter(Mandatory=$false)]
    [string]$Region = "us-central1",
    
    [Parameter(Mandatory=$false)]
    [string]$Port = "8080"
)

# Validar que el servicio existe
$servicePath = "services/$ServiceName"
if (!(Test-Path $servicePath)) {
    Write-Error "❌ El servicio '$ServiceName' no existe en '$servicePath'"
    exit 1
}

Write-Host "🚀 Iniciando deploy de $ServiceName en ambiente $Environment..." -ForegroundColor Green

# Crear archivo de Cloud Build específico para este deploy
$buildConfig = Get-Content "deployment/cloudbuild.template.yaml" -Raw
$buildConfig = $buildConfig -replace '_SERVICE_NAME: ''replace-with-service-name''', "_SERVICE_NAME: '$ServiceName'"
$buildConfig = $buildConfig -replace '_SERVICE_PORT: ''8080''', "_SERVICE_PORT: '$Port'"
$buildConfig = $buildConfig -replace '_ENV: ''staging''', "_ENV: '$Environment'"
$buildConfig = $buildConfig -replace '_REGION: ''us-central1''', "_REGION: '$Region'"

$tempBuildFile = "deployment/cloudbuild-$ServiceName-$Environment.yaml"
$buildConfig | Out-File -FilePath $tempBuildFile -Encoding UTF8

Write-Host "📋 Configuración de build creada: $tempBuildFile" -ForegroundColor Yellow

# Ejecutar Cloud Build
Write-Host "🔨 Ejecutando Cloud Build..." -ForegroundColor Blue
$buildResult = gcloud builds submit --config=$tempBuildFile .

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Deploy exitoso de $ServiceName en $Environment" -ForegroundColor Green
    Write-Host "🌐 URL del servicio: https://$ServiceName-$Environment-shk2qzic2q-uc.a.run.app" -ForegroundColor Cyan
} else {
    Write-Host "❌ Deploy falló para $ServiceName" -ForegroundColor Red
    exit 1
}

# Limpiar archivo temporal
Remove-Item $tempBuildFile -Force

Write-Host "🎉 Deploy completado!" -ForegroundColor Green