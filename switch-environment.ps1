# 🔧 Script de cambio de ambiente (PowerShell)
# ============================================

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("dev", "staging", "production")]
    [string]$Environment
)

$RootDir = Split-Path -Parent $MyInvocation.MyCommand.Path

switch ($Environment) {
    "dev" {
        Write-Host "🔧 Cambiando a ambiente DESARROLLO..." -ForegroundColor Yellow
        Copy-Item "$RootDir\environments\dev\.env.dev" "$RootDir\.env" -Force
        Write-Host "✅ Configuración DEV activada" -ForegroundColor Green
        Write-Host "🌐 URLs: localhost con puertos específicos" -ForegroundColor Cyan
        Write-Host "🗄️ BD: 34.28.245.62 (existente)" -ForegroundColor Cyan
    }
    "staging" {
        Write-Host "🧪 Cambiando a ambiente STAGING..." -ForegroundColor Yellow
        Copy-Item "$RootDir\environments\staging\.env.staging" "$RootDir\.env" -Force
        Write-Host "✅ Configuración STG activada" -ForegroundColor Green
        Write-Host "🌐 URLs: stg-api.xafra-ads.com" -ForegroundColor Cyan
        Write-Host "🗄️ BD: Cloud SQL STG" -ForegroundColor Cyan
    }
    "production" {
        Write-Host "🏭 Cambiando a ambiente PRODUCCIÓN..." -ForegroundColor Red
        Copy-Item "$RootDir\environments\production\.env.production" "$RootDir\.env" -Force
        Write-Host "✅ Configuración PROD activada" -ForegroundColor Green
        Write-Host "🌐 URLs: api.xafra-ads.com" -ForegroundColor Cyan
        Write-Host "🗄️ BD: Cloud SQL PROD" -ForegroundColor Cyan
    }
}

Write-Host ""
Write-Host "🎯 Ambiente actual: $Environment" -ForegroundColor White
Write-Host "📁 Archivo .env actualizado" -ForegroundColor White
Write-Host "🔄 Reinicia los servicios para aplicar cambios" -ForegroundColor White