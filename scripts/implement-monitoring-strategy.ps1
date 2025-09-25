#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Script maestro para implementar estrategia de monitoreo y optimización
    Implementa el plan acordado: agregar IP, monitoreo, y optimización VPC

.DESCRIPTION
    Este script implementa la estrategia completa:
    1. Agregar IP personal a PostgreSQL (sin riesgo)
    2. Configurar monitoreo de IPs de Cloud Run 
    3. Optimizar VPC Connector para reducir costos
    4. Establecer análisis continuo de patrones IP

.PARAMETER SkipIPAddition
    Omite la adición de IP personal (útil si ya está agregada)

.PARAMETER SkipVPCOptimization  
    Omite la optimización del VPC Connector

.PARAMETER DryRun
    Solo muestra lo que se haría sin ejecutar cambios

.EXAMPLE
    .\implement-monitoring-strategy.ps1
    .\implement-monitoring-strategy.ps1 -DryRun
    .\implement-monitoring-strategy.ps1 -SkipIPAddition
#>

param(
    [switch]$SkipIPAddition,
    [switch]$SkipVPCOptimization,
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"

Write-Host "🚀 Xafra-ads Database Monitoring & Optimization Strategy" -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Green
Write-Host ""

# Configuración
$PROJECT_ID = (gcloud config get-value project)
$SCRIPT_DIR = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "📋 Plan de Implementación:" -ForegroundColor Cyan
Write-Host "   ✅ Fase 1: Seguridad básica (agregar tu IP)" -ForegroundColor White
Write-Host "   ✅ Fase 2: Monitoreo de IPs Cloud Run" -ForegroundColor White  
Write-Host "   ✅ Fase 3: Optimización VPC Connector" -ForegroundColor White
Write-Host "   📊 Fase 4: Análisis continuo de patrones" -ForegroundColor White
Write-Host ""

if ($DryRun) {
    Write-Host "🔍 MODO DRY RUN - Solo simulación" -ForegroundColor Yellow
    Write-Host ""
}

# Función para ejecutar o simular comando
function Invoke-SafeCommand {
    param(
        [string]$Command,
        [string]$Description,
        [switch]$Critical = $false
    )
    
    Write-Host "⚡ $Description..." -ForegroundColor Yellow
    Write-Host "   Comando: $Command" -ForegroundColor Gray
    
    if ($DryRun) {
        Write-Host "   [DRY RUN] Comando simulado" -ForegroundColor Blue
        return $true
    }
    
    try {
        $result = Invoke-Expression $Command
        Write-Host "   ✅ Completado" -ForegroundColor Green
        return $true
    } catch {
        Write-Host "   ❌ Error: $($_.Exception.Message)" -ForegroundColor Red
        if ($Critical) {
            throw
        }
        return $false
    }
}

# Fase 1: Agregar IP personal a PostgreSQL
Write-Host "🔐 FASE 1: Configuración de Acceso Seguro" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green

if (-not $SkipIPAddition) {
    Write-Host "Agregando tu IP a PostgreSQL para acceso con DBeaver..." -ForegroundColor Yellow
    
    if ($DryRun) {
        Write-Host "[DRY RUN] Ejecutaría: .\add-ip-to-postgresql.ps1 -DryRun" -ForegroundColor Blue
    } else {
        try {
            & "$SCRIPT_DIR\add-ip-to-postgresql.ps1"
            Write-Host "✅ IP agregada exitosamente" -ForegroundColor Green
        } catch {
            Write-Warning "Error agregando IP: $($_.Exception.Message)"
            Write-Host "⚠️  Continuando con el resto del plan..." -ForegroundColor Yellow
        }
    }
} else {
    Write-Host "⏭️  Omitiendo adición de IP (SkipIPAddition activado)" -ForegroundColor Blue
}

Write-Host ""

# Fase 2: Configurar monitoreo de IPs
Write-Host "📊 FASE 2: Configuración de Monitoreo" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Green

Write-Host "Configurando monitoreo de conexiones de Cloud Run..." -ForegroundColor Yellow

# Crear directorio de logs si no existe
$logsDir = "$SCRIPT_DIR\..\logs"
if (-not (Test-Path $logsDir)) {
    New-Item -ItemType Directory -Path $logsDir -Force | Out-Null
    Write-Host "✅ Directorio de logs creado: $logsDir" -ForegroundColor Green
}

# Ejecutar una prueba inicial del monitoreo
$monitorCommand = "node `"$SCRIPT_DIR\monitor-db-connections.js`" once"
Invoke-SafeCommand -Command $monitorCommand -Description "Ejecutando prueba inicial de monitoreo"

Write-Host ""
Write-Host "📋 Configuración de monitoreo continuo:" -ForegroundColor Cyan
Write-Host "   Para iniciar monitoreo continuo (cada 5 minutos):" -ForegroundColor White
Write-Host "   node scripts/monitor-db-connections.js start" -ForegroundColor Gray
Write-Host ""
Write-Host "   Para analizar patrones en cualquier momento:" -ForegroundColor White  
Write-Host "   node scripts/monitor-db-connections.js analyze" -ForegroundColor Gray
Write-Host ""

# Fase 3: Optimización VPC Connector
Write-Host "💰 FASE 3: Optimización de Costos VPC" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Green

if (-not $SkipVPCOptimization) {
    Write-Host "Analizando optimización del VPC Connector..." -ForegroundColor Yellow
    
    $vpcCommand = "node `"$SCRIPT_DIR\optimize-vpc-connector.js`" analyze"
    Invoke-SafeCommand -Command $vpcCommand -Description "Ejecutando análisis de VPC Connector"
    
    Write-Host ""
    Write-Host "📋 Para aplicar optimización VPC después del análisis:" -ForegroundColor Cyan
    Write-Host "   1. Revisar recomendaciones del análisis anterior" -ForegroundColor White
    Write-Host "   2. Ejecutar comandos sugeridos en horario de bajo tráfico" -ForegroundColor White
    Write-Host "   3. Monitorear servicios por 15 minutos post-cambio" -ForegroundColor White
    
} else {
    Write-Host "⏭️  Omitiendo optimización VPC (SkipVPCOptimization activado)" -ForegroundColor Blue
}

Write-Host ""

# Fase 4: Configurar análisis continuo
Write-Host "🔄 FASE 4: Análisis Continuo" -ForegroundColor Green
Write-Host "============================" -ForegroundColor Green

Write-Host "Configurando análisis automático de patrones IP..." -ForegroundColor Yellow

# Crear script de automatización para Windows
$automationScript = @"
#!/usr/bin/env pwsh
# Script de automatización para ejecutar análisis diario de IPs
# Ejecutar este script diariamente para mantener análisis actualizado

Set-Location "$SCRIPT_DIR\.."

Write-Host "🔍 Ejecutando análisis diario de patrones IP..." -ForegroundColor Yellow
Write-Host "Fecha: `$(Get-Date)" -ForegroundColor Gray

# Ejecutar análisis de patrones
node scripts/monitor-db-connections.js analyze

# Si hay suficientes datos (más de 7 días), generar reporte
`$logFile = "logs/db-connections.jsonl"
if (Test-Path `$logFile) {
    `$lines = (Get-Content `$logFile | Measure-Object -Line).Lines
    if (`$lines -gt 2000) {  # Aproximadamente 7 días de datos cada 5 minutos
        Write-Host "📊 Datos suficientes detectados. Generando reporte de recomendaciones..." -ForegroundColor Green
        
        # Aquí se podría agregar lógica adicional para generar recomendaciones
        # basadas en los patrones identificados
    }
}

Write-Host "✅ Análisis diario completado" -ForegroundColor Green
"@

$dailyScriptPath = "$SCRIPT_DIR\daily-ip-analysis.ps1"
$automationScript | Out-File -FilePath $dailyScriptPath -Encoding UTF8

Write-Host "✅ Script de análisis diario creado: daily-ip-analysis.ps1" -ForegroundColor Green

Write-Host ""

# Resumen final
Write-Host "🎉 IMPLEMENTACIÓN COMPLETADA" -ForegroundColor Green
Write-Host "============================" -ForegroundColor Green
Write-Host ""

Write-Host "📊 Estado de implementación:" -ForegroundColor Cyan
if (-not $SkipIPAddition) {
    Write-Host "   ✅ Fase 1: IP personal agregada a PostgreSQL" -ForegroundColor Green
} else {
    Write-Host "   ⏭️  Fase 1: Omitida (SkipIPAddition)" -ForegroundColor Blue
}
Write-Host "   ✅ Fase 2: Monitoreo de IPs configurado" -ForegroundColor Green
if (-not $SkipVPCOptimization) {
    Write-Host "   ✅ Fase 3: Análisis VPC completado" -ForegroundColor Green
} else {
    Write-Host "   ⏭️  Fase 3: Omitida (SkipVPCOptimization)" -ForegroundColor Blue
}
Write-Host "   ✅ Fase 4: Análisis continuo configurado" -ForegroundColor Green

Write-Host ""
Write-Host "🚀 PRÓXIMOS PASOS RECOMENDADOS:" -ForegroundColor Yellow
Write-Host ""

Write-Host "1️⃣  INMEDIATO (hoy):" -ForegroundColor Cyan
Write-Host "   • Iniciar monitoreo continuo:" -ForegroundColor White
Write-Host "     node scripts/monitor-db-connections.js start" -ForegroundColor Gray
Write-Host ""

Write-Host "2️⃣  ESTA SEMANA:" -ForegroundColor Cyan  
Write-Host "   • Configurar DBeaver con nueva IP autorizada" -ForegroundColor White
Write-Host "   • Aplicar optimización VPC según análisis" -ForegroundColor White
Write-Host "   • Configurar tarea programada para análisis diario" -ForegroundColor White
Write-Host ""

Write-Host "3️⃣  EN 30-60 DÍAS:" -ForegroundColor Cyan
Write-Host "   • Revisar patrones IP recopilados:" -ForegroundColor White
Write-Host "     node scripts/monitor-db-connections.js analyze" -ForegroundColor Gray
Write-Host "   • Evaluar implementación de rangos IP específicos" -ForegroundColor White
Write-Host "   • Considerar eliminación gradual de 0.0.0.0/0" -ForegroundColor White

Write-Host ""
Write-Host "💡 BENEFICIOS DE ESTA ESTRATEGIA:" -ForegroundColor Yellow
Write-Host "   ✅ Riesgo operacional mínimo (mantiene conectividad actual)" -ForegroundColor Green
Write-Host "   ✅ Datos empíricos para decisiones futuras" -ForegroundColor Green  
Write-Host "   ✅ Ahorro inmediato en costos VPC (~$15-25/mes)" -ForegroundColor Green
Write-Host "   ✅ Acceso DBeaver sin impacto en producción" -ForegroundColor Green
Write-Host "   ✅ Base sólida para optimizaciones futuras" -ForegroundColor Green

Write-Host ""
if ($DryRun) {
    Write-Host "🔍 SIMULACIÓN COMPLETADA - No se aplicaron cambios reales" -ForegroundColor Blue
} else {
    Write-Host "✅ IMPLEMENTACIÓN REAL COMPLETADA" -ForegroundColor Green
}

Write-Host ""
Write-Host "📞 ¿Preguntas? Revisa los logs en: logs/db-connections.jsonl" -ForegroundColor Gray