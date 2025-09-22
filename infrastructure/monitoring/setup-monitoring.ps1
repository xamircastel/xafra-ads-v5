# Xafra-ads v5 - Cloud Monitoring Setup Script (PowerShell)
# Configura monitoreo completo para los 5 microservicios

Write-Host "🔍 Configurando Cloud Monitoring para Xafra-ads v5..." -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

# Variables
$PROJECT_ID = "xafra-ads"
$REGION = "us-central1"
$SERVICES = @("core-service-stg", "auth-service-stg", "tracking-service-stg", "campaign-service-stg", "postback-service-stg")

# Verificar que gcloud esté configurado
try {
    $currentProject = gcloud config get-value project 2>$null
    if (-not $currentProject) {
        throw "No project configured"
    }
    Write-Host "✅ Proyecto actual: $currentProject" -ForegroundColor Green
} catch {
    Write-Host "❌ Error: No hay sesión activa de gcloud" -ForegroundColor Red
    Write-Host "Ejecuta: gcloud auth login" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Región: $REGION" -ForegroundColor Green
Write-Host ""

# 1. Habilitar APIs necesarias
Write-Host "📡 Habilitando APIs necesarias..." -ForegroundColor Yellow
$apis = @(
    "monitoring.googleapis.com",
    "logging.googleapis.com", 
    "clouderrorreporting.googleapis.com",
    "cloudtrace.googleapis.com",
    "cloudprofiler.googleapis.com"
)

foreach ($api in $apis) {
    Write-Host "  Habilitando $api..." -ForegroundColor Gray
    gcloud services enable $api
}

# 2. Verificar Monitoring Workspace
Write-Host "🏗️  Verificando Monitoring Workspace..." -ForegroundColor Yellow
try {
    $workspace = gcloud alpha monitoring workspaces list --filter="name:projects/$PROJECT_ID" --format="value(name)" 2>$null
    if ($workspace) {
        Write-Host "✅ Monitoring Workspace ya existe" -ForegroundColor Green
    } else {
        Write-Host "Creando nuevo Monitoring Workspace..." -ForegroundColor Yellow
        gcloud alpha monitoring workspaces create --display-name="Xafra-ads v5 Monitoring"
    }
} catch {
    Write-Host "⚠️  No se pudo verificar workspace, continuando..." -ForegroundColor Yellow
}

# 3. Crear notification channels
Write-Host "📧 Configurando canales de notificación..." -ForegroundColor Yellow

# Note: Email configuration would need actual email address
Write-Host "  📧 Canales de notificación pendientes de configuración manual" -ForegroundColor Gray
Write-Host "     - Agregar emails del equipo en Cloud Console" -ForegroundColor Gray

# 4. Crear alertas críticas usando archivos JSON temporales
Write-Host "🚨 Configurando alertas críticas..." -ForegroundColor Yellow

# Service Health Alert
$healthAlertPolicy = @'
{
  "displayName": "Xafra-ads v5 - Service Health Critical",
  "documentation": {
    "content": "Alert when any service health check fails consistently"
  },
  "conditions": [
    {
      "displayName": "Health Check Failure",
      "conditionThreshold": {
        "filter": "resource.type=\"cloud_run_revision\" AND metric.type=\"run.googleapis.com/request_count\" AND metric.label.response_code_class=\"4xx OR 5xx\"",
        "comparison": "COMPARISON_GREATER_THAN",
        "thresholdValue": 5,
        "duration": "300s",
        "aggregations": [
          {
            "alignmentPeriod": "60s",
            "perSeriesAligner": "ALIGN_RATE",
            "crossSeriesReducer": "REDUCE_SUM",
            "groupByFields": ["resource.label.service_name"]
          }
        ]
      }
    }
  ],
  "combiner": "OR",
  "enabled": true,
  "alertStrategy": {
    "autoClose": "86400s"
  }
}
'@

$healthAlertPolicy | Out-File -FilePath "$env:TEMP\health-alert-policy.json" -Encoding UTF8

try {
    Write-Host "  🚨 Creando alerta de health checks..." -ForegroundColor Gray
    gcloud alpha monitoring policies create --policy-from-file="$env:TEMP\health-alert-policy.json"
    Write-Host "  ✅ Alerta de health checks creada" -ForegroundColor Green
} catch {
    Write-Host "  ⚠️  Error creando alerta de health checks (puede que ya exista)" -ForegroundColor Yellow
}

# High Error Rate Alert
$errorRateAlertPolicy = @'
{
  "displayName": "Xafra-ads v5 - High Error Rate",
  "documentation": {
    "content": "Alert when error rate exceeds 5% for any service"
  },
  "conditions": [
    {
      "displayName": "Error Rate > 5%",
      "conditionThreshold": {
        "filter": "resource.type=\"cloud_run_revision\" AND metric.type=\"run.googleapis.com/request_count\" AND metric.label.response_code_class=\"5xx\"",
        "comparison": "COMPARISON_GREATER_THAN", 
        "thresholdValue": 0.05,
        "duration": "180s",
        "aggregations": [
          {
            "alignmentPeriod": "60s",
            "perSeriesAligner": "ALIGN_RATE",
            "crossSeriesReducer": "REDUCE_MEAN",
            "groupByFields": ["resource.label.service_name"]
          }
        ]
      }
    }
  ],
  "combiner": "OR",
  "enabled": true
}
'@

$errorRateAlertPolicy | Out-File -FilePath "$env:TEMP\error-rate-alert-policy.json" -Encoding UTF8

try {
    Write-Host "  🚨 Creando alerta de error rate..." -ForegroundColor Gray
    gcloud alpha monitoring policies create --policy-from-file="$env:TEMP\error-rate-alert-policy.json"
    Write-Host "  ✅ Alerta de error rate creada" -ForegroundColor Green
} catch {
    Write-Host "  ⚠️  Error creando alerta de error rate (puede que ya exista)" -ForegroundColor Yellow
}

# High Latency Alert (crítico para redirects de ads)
$latencyAlertPolicy = @'
{
  "displayName": "Xafra-ads v5 - High Latency Warning",
  "documentation": {
    "content": "Alert when response time exceeds 2 seconds (critical for ad performance)"
  },
  "conditions": [
    {
      "displayName": "Response Time > 2s",
      "conditionThreshold": {
        "filter": "resource.type=\"cloud_run_revision\" AND metric.type=\"run.googleapis.com/request_latencies\"",
        "comparison": "COMPARISON_GREATER_THAN",
        "thresholdValue": 2000,
        "duration": "300s",
        "aggregations": [
          {
            "alignmentPeriod": "60s",
            "perSeriesAligner": "ALIGN_PERCENTILE_95",
            "crossSeriesReducer": "REDUCE_MAX",
            "groupByFields": ["resource.label.service_name"]
          }
        ]
      }
    }
  ],
  "combiner": "OR",
  "enabled": true
}
'@

$latencyAlertPolicy | Out-File -FilePath "$env:TEMP\latency-alert-policy.json" -Encoding UTF8

try {
    Write-Host "  🚨 Creando alerta de latency..." -ForegroundColor Gray
    gcloud alpha monitoring policies create --policy-from-file="$env:TEMP\latency-alert-policy.json"
    Write-Host "  ✅ Alerta de latency creada" -ForegroundColor Green
} catch {
    Write-Host "  ⚠️  Error creando alerta de latency (puede que ya exista)" -ForegroundColor Yellow
}

# 5. Crear dashboard personalizado
Write-Host "📊 Creando dashboard personalizado..." -ForegroundColor Yellow

$dashboard = @'
{
  "displayName": "Xafra-ads v5 - System Overview",
  "mosaicLayout": {
    "tiles": [
      {
        "width": 6,
        "height": 4,
        "widget": {
          "title": "Request Rate by Service",
          "xyChart": {
            "dataSets": [
              {
                "timeSeriesQuery": {
                  "timeSeriesFilter": {
                    "filter": "resource.type=\"cloud_run_revision\" AND metric.type=\"run.googleapis.com/request_count\"",
                    "aggregation": {
                      "alignmentPeriod": "60s",
                      "perSeriesAligner": "ALIGN_RATE",
                      "crossSeriesReducer": "REDUCE_SUM",
                      "groupByFields": ["resource.label.service_name"]
                    }
                  }
                },
                "plotType": "LINE"
              }
            ]
          }
        }
      },
      {
        "width": 6,
        "height": 4,
        "widget": {
          "title": "Error Rate by Service",
          "xyChart": {
            "dataSets": [
              {
                "timeSeriesQuery": {
                  "timeSeriesFilter": {
                    "filter": "resource.type=\"cloud_run_revision\" AND metric.type=\"run.googleapis.com/request_count\" AND metric.label.response_code_class=\"5xx\"",
                    "aggregation": {
                      "alignmentPeriod": "60s",
                      "perSeriesAligner": "ALIGN_RATE",
                      "crossSeriesReducer": "REDUCE_SUM",
                      "groupByFields": ["resource.label.service_name"]
                    }
                  }
                },
                "plotType": "LINE"
              }
            ]
          }
        }
      },
      {
        "width": 12,
        "height": 4,
        "widget": {
          "title": "Response Time (95th percentile)",
          "xyChart": {
            "dataSets": [
              {
                "timeSeriesQuery": {
                  "timeSeriesFilter": {
                    "filter": "resource.type=\"cloud_run_revision\" AND metric.type=\"run.googleapis.com/request_latencies\"",
                    "aggregation": {
                      "alignmentPeriod": "60s",
                      "perSeriesAligner": "ALIGN_PERCENTILE_95",
                      "crossSeriesReducer": "REDUCE_MEAN",
                      "groupByFields": ["resource.label.service_name"]
                    }
                  }
                },
                "plotType": "LINE"
              }
            ]
          }
        }
      }
    ]
  }
}
'@

$dashboard | Out-File -FilePath "$env:TEMP\dashboard.json" -Encoding UTF8

try {
    Write-Host "  📊 Creando dashboard principal..." -ForegroundColor Gray
    gcloud monitoring dashboards create --config-from-file="$env:TEMP\dashboard.json"
    Write-Host "  ✅ Dashboard creado exitosamente" -ForegroundColor Green
} catch {
    Write-Host "  ⚠️  Error creando dashboard (puede que ya exista)" -ForegroundColor Yellow
}

# 6. Configurar log-based metrics para business logic
Write-Host "📝 Configurando métricas de negocio..." -ForegroundColor Yellow

$businessMetrics = @(
    @{name="xafra_click_tracking"; description="Count of ad clicks tracked"; filter='resource.type="cloud_run_revision" AND resource.labels.service_name="tracking-service-stg" AND jsonPayload.event_type="click"'},
    @{name="xafra_conversions"; description="Count of conversions tracked"; filter='resource.type="cloud_run_revision" AND resource.labels.service_name="tracking-service-stg" AND jsonPayload.event_type="conversion"'},
    @{name="xafra_postback_success"; description="Count of successful postback deliveries"; filter='resource.type="cloud_run_revision" AND resource.labels.service_name="postback-service-stg" AND jsonPayload.status="success"'}
)

foreach ($metric in $businessMetrics) {
    try {
        Write-Host "  📈 Creando métrica: $($metric.name)..." -ForegroundColor Gray
        gcloud logging metrics create $metric.name --description="$($metric.description)" --log-filter="$($metric.filter)"
        Write-Host "  ✅ Métrica $($metric.name) creada" -ForegroundColor Green
    } catch {
        Write-Host "  ⚠️  Métrica $($metric.name) ya existe o error creando" -ForegroundColor Yellow
    }
}

# 7. Verificación final
Write-Host ""
Write-Host "🔍 Verificando configuración..." -ForegroundColor Cyan

Write-Host "✅ Policies de alertas:" -ForegroundColor Green
try {
    gcloud alpha monitoring policies list --format="table(displayName,enabled)" --filter="displayName:Xafra-ads" 2>$null
} catch {
    Write-Host "  (Verificación manual requerida en Cloud Console)" -ForegroundColor Gray
}

Write-Host ""
Write-Host "✅ Dashboards:" -ForegroundColor Green
try {
    gcloud monitoring dashboards list --format="table(displayName)" --filter="displayName:Xafra-ads" 2>$null
} catch {
    Write-Host "  (Verificación manual requerida en Cloud Console)" -ForegroundColor Gray
}

Write-Host ""
Write-Host "✅ Log-based metrics:" -ForegroundColor Green
try {
    gcloud logging metrics list --format="table(name)" --filter="name:xafra_*" 2>$null
} catch {
    Write-Host "  (Verificación manual requerida en Cloud Console)" -ForegroundColor Gray
}

# Limpiar archivos temporales
Remove-Item -Path "$env:TEMP\*alert-policy.json" -ErrorAction SilentlyContinue
Remove-Item -Path "$env:TEMP\dashboard.json" -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "🎉 ¡Cloud Monitoring configurado exitosamente!" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "📊 Dashboard: https://console.cloud.google.com/monitoring/dashboards" -ForegroundColor Blue
Write-Host "🚨 Alertas: https://console.cloud.google.com/monitoring/alerting" -ForegroundColor Blue
Write-Host "📝 Logs: https://console.cloud.google.com/logs/query" -ForegroundColor Blue
Write-Host ""
Write-Host "💡 Próximos pasos recomendados:" -ForegroundColor Yellow
Write-Host "  1. Configurar emails en notification channels" -ForegroundColor Gray
Write-Host "  2. Ajustar thresholds según tráfico real" -ForegroundColor Gray
Write-Host "  3. Revisar alertas diariamente durante la primera semana" -ForegroundColor Gray
Write-Host "  4. Considerar agregar métricas de negocio personalizadas" -ForegroundColor Gray
Write-Host ""
Write-Host "🔗 Links directos:" -ForegroundColor Yellow
Write-Host "  - Monitoring Overview: https://console.cloud.google.com/monitoring" -ForegroundColor Blue
Write-Host "  - Service Health: https://console.cloud.google.com/run" -ForegroundColor Blue
Write-Host "  - Error Reporting: https://console.cloud.google.com/errors" -ForegroundColor Blue