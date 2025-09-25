#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Script para agregar IP específica a PostgreSQL de forma segura
    manteniendo acceso completo de Cloud Run

.DESCRIPTION
    Este script agrega tu IP personal a la whitelist de PostgreSQL
    para acceso con DBeaver sin afectar la conectividad de Cloud Run.
    Mantiene el acceso 0.0.0.0/0 existente para evitar interrupciones.

.PARAMETER UserIP
    La IP que se desea agregar (se detecta automáticamente si no se especifica)

.PARAMETER DryRun
    Solo muestra los comandos que se ejecutarían sin aplicar cambios

.EXAMPLE
    .\add-ip-to-postgresql.ps1
    .\add-ip-to-postgresql.ps1 -UserIP "192.168.1.100"
    .\add-ip-to-postgresql.ps1 -DryRun
#>

param(
    [string]$UserIP,
    [switch]$DryRun
)

# Configuración
$INSTANCE_NAME = "xafra-ads-postgres"
$REGION = "us-central1"
$PROJECT_ID = (gcloud config get-value project)

Write-Host "🔐 PostgreSQL IP Management Script" -ForegroundColor Green
Write-Host "=================================" -ForegroundColor Green
Write-Host ""

# Función para obtener IP pública actual
function Get-PublicIP {
    try {
        $ip = (Invoke-RestMethod -Uri "https://api.ipify.org?format=text" -TimeoutSec 10).Trim()
        if ($ip -match '^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$') {
            return $ip
        }
    } catch {
        Write-Warning "No se pudo obtener IP automáticamente: $($_.Exception.Message)"
    }
    
    # Método alternativo
    try {
        $ip = (Invoke-RestMethod -Uri "https://ifconfig.me/ip" -TimeoutSec 10).Trim()
        if ($ip -match '^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$') {
            return $ip
        }
    } catch {
        Write-Warning "Método alternativo también falló: $($_.Exception.Message)"
    }
    
    return $null
}

# Función para obtener configuración actual
function Get-CurrentAuthorizedNetworks {
    try {
        $config = gcloud sql instances describe $INSTANCE_NAME --format="json" | ConvertFrom-Json
        return $config.settings.ipConfiguration.authorizedNetworks
    } catch {
        Write-Error "Error obteniendo configuración actual: $($_.Exception.Message)"
        exit 1
    }
}

# Función para validar IP
function Test-IPAddress {
    param([string]$IP)
    
    if ([string]::IsNullOrEmpty($IP)) {
        return $false
    }
    
    return $IP -match '^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$'
}

# 1. Determinar IP a agregar
if ([string]::IsNullOrEmpty($UserIP)) {
    Write-Host "🔍 Detectando tu IP pública..." -ForegroundColor Yellow
    $UserIP = Get-PublicIP
    
    if (-not $UserIP) {
        Write-Host "❌ No se pudo detectar tu IP automáticamente." -ForegroundColor Red
        $UserIP = Read-Host "Por favor ingresa tu IP manualmente"
    } else {
        Write-Host "✅ IP detectada: $UserIP" -ForegroundColor Green
    }
}

# Validar IP
if (-not (Test-IPAddress -IP $UserIP)) {
    Write-Error "❌ IP inválida: $UserIP"
    exit 1
}

Write-Host "📋 Configuración:" -ForegroundColor Cyan
Write-Host "   Proyecto: $PROJECT_ID" -ForegroundColor White
Write-Host "   Instancia: $INSTANCE_NAME" -ForegroundColor White
Write-Host "   IP a agregar: $UserIP" -ForegroundColor White
if ($DryRun) {
    Write-Host "   Modo: DRY RUN (solo simulación)" -ForegroundColor Yellow
}
Write-Host ""

# 2. Obtener configuración actual
Write-Host "🔍 Obteniendo configuración actual..." -ForegroundColor Yellow
$currentNetworks = Get-CurrentAuthorizedNetworks

Write-Host "✅ Redes autorizadas actuales:" -ForegroundColor Green
foreach ($network in $currentNetworks) {
    $name = if ($network.name) { $network.name } else { "(sin nombre)" }
    Write-Host "   $($network.value) - $name" -ForegroundColor White
}
Write-Host ""

# 3. Verificar si la IP ya existe
$ipExists = $currentNetworks | Where-Object { $_.value -eq $UserIP }
if ($ipExists) {
    Write-Host "ℹ️  La IP $UserIP ya está autorizada." -ForegroundColor Blue
    Write-Host "✅ No se requieren cambios." -ForegroundColor Green
    exit 0
}

# 4. Preparar comando para agregar IP
$newNetworkEntry = @{
    name = "DBeaver-Access-$(Get-Date -Format 'yyyyMMdd')"
    value = $UserIP
}

Write-Host "➕ Agregando nueva entrada:" -ForegroundColor Yellow
Write-Host "   Nombre: $($newNetworkEntry.name)" -ForegroundColor White
Write-Host "   IP: $($newNetworkEntry.value)" -ForegroundColor White
Write-Host ""

# 5. Construir comando gcloud
$networkParams = @()
foreach ($network in $currentNetworks) {
    $name = if ($network.name) { $network.name } else { "existing-$(Get-Random)" }
    $networkParams += "--authorized-networks"
    $networkParams += "$($network.value)/$name"
}

# Agregar nueva IP
$networkParams += "--authorized-networks"
$networkParams += "$($newNetworkEntry.value)/$($newNetworkEntry.name)"

$command = "gcloud sql instances patch $INSTANCE_NAME --authorized-networks=$(($networkParams | Where-Object { $_ -notmatch '^--authorized-networks$' }) -join ',')"

Write-Host "🔧 Comando a ejecutar:" -ForegroundColor Cyan
Write-Host $command -ForegroundColor White
Write-Host ""

# 6. Ejecutar cambios o mostrar simulación
if ($DryRun) {
    Write-Host "🔍 DRY RUN - No se ejecutarán cambios reales" -ForegroundColor Yellow
    Write-Host "✅ El comando anterior se ejecutaría normalmente" -ForegroundColor Green
    exit 0
}

# Confirmación del usuario
$confirmation = Read-Host "¿Deseas continuar con la configuración? (y/N)"
if ($confirmation -ne 'y' -and $confirmation -ne 'Y' -and $confirmation -ne 'yes') {
    Write-Host "❌ Operación cancelada por el usuario" -ForegroundColor Red
    exit 0
}

Write-Host "⚡ Aplicando cambios..." -ForegroundColor Yellow

try {
    # Ejecutar comando
    $result = Invoke-Expression $command
    
    Write-Host "✅ Cambios aplicados exitosamente!" -ForegroundColor Green
    Write-Host ""
    
    # 7. Verificar cambios
    Write-Host "🔍 Verificando configuración actualizada..." -ForegroundColor Yellow
    Start-Sleep -Seconds 3
    
    $updatedNetworks = Get-CurrentAuthorizedNetworks
    
    Write-Host "✅ Configuración actualizada:" -ForegroundColor Green
    foreach ($network in $updatedNetworks) {
        $name = if ($network.name) { $network.name } else { "(sin nombre)" }
        $highlight = if ($network.value -eq $UserIP) { "Green" } else { "White" }
        Write-Host "   $($network.value) - $name" -ForegroundColor $highlight
    }
    
    Write-Host ""
    Write-Host "🎉 IP agregada exitosamente!" -ForegroundColor Green
    Write-Host "💡 Ya puedes usar DBeaver con la IP: $UserIP" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "📋 Próximos pasos:" -ForegroundColor Yellow
    Write-Host "   1. Configurar DBeaver con los nuevos permisos" -ForegroundColor White
    Write-Host "   2. Ejecutar monitoreo de IPs: node scripts/monitor-db-connections.js start" -ForegroundColor White
    Write-Host "   3. Optimizar VPC Connector: node scripts/optimize-vpc-connector.js analyze" -ForegroundColor White
    
} catch {
    Write-Error "❌ Error aplicando cambios: $($_.Exception.Message)"
    Write-Host ""
    Write-Host "🔄 Para revertir cambios si es necesario:" -ForegroundColor Yellow
    Write-Host "gcloud sql instances patch $INSTANCE_NAME --clear-authorized-networks" -ForegroundColor White
    Write-Host "gcloud sql instances patch $INSTANCE_NAME --authorized-networks=0.0.0.0/0/allow-all" -ForegroundColor White
    exit 1
}

Write-Host ""
Write-Host "✅ Script completado exitosamente" -ForegroundColor Green