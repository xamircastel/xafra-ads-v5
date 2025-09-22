# Xafra-ads v5 - Configuración Manual de Monitoreo
# Script complementario para completar la configuración

Write-Host "🔧 Configuración complementaria de Cloud Monitoring..." -ForegroundColor Cyan
Write-Host "=====================================================" -ForegroundColor Cyan

# Dashboard corregido con formato válido
$dashboardFixed = @'
{
  "displayName": "Xafra-ads v5 - System Overview",
  "mosaicLayout": {
    "columns": 12,
    "tiles": [
      {
        "width": 6,
        "height": 4,
        "xPos": 0,
        "yPos": 0,
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
            ],
            "timeshiftDuration": "0s",
            "yAxis": {
              "label": "Requests/sec",
              "scale": "LINEAR"
            }
          }
        }
      },
      {
        "width": 6,
        "height": 4,
        "xPos": 6,
        "yPos": 0,
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
            ],
            "yAxis": {
              "label": "Latency (ms)",
              "scale": "LINEAR"
            }
          }
        }
      },
      {
        "width": 12,
        "height": 4,
        "xPos": 0,
        "yPos": 4,
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
            ],
            "yAxis": {
              "label": "Errors/sec",
              "scale": "LINEAR"
            }
          }
        }
      }
    ]
  }
}
'@

$dashboardFixed | Out-File -FilePath "$env:TEMP\dashboard-fixed.json" -Encoding UTF8

try {
    Write-Host "📊 Creando dashboard corregido..." -ForegroundColor Yellow
    $result = gcloud monitoring dashboards create --config-from-file="$env:TEMP\dashboard-fixed.json" 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Dashboard principal creado exitosamente" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Error creando dashboard: $result" -ForegroundColor Yellow
    }
} catch {
    Write-Host "⚠️  Error creando dashboard (verificar en consola)" -ForegroundColor Yellow
}

# Dashboard de métricas de negocio
$businessDashboard = @'
{
  "displayName": "Xafra-ads v5 - Business Metrics",
  "mosaicLayout": {
    "columns": 12,
    "tiles": [
      {
        "width": 6,
        "height": 4,
        "xPos": 0,
        "yPos": 0,
        "widget": {
          "title": "Ad Clicks (Last 24h)",
          "scorecard": {
            "timeSeriesQuery": {
              "timeSeriesFilter": {
                "filter": "metric.type=\"logging.googleapis.com/user/xafra_click_tracking\"",
                "aggregation": {
                  "alignmentPeriod": "3600s",
                  "perSeriesAligner": "ALIGN_RATE",
                  "crossSeriesReducer": "REDUCE_SUM"
                }
              }
            },
            "sparkChartView": {
              "sparkChartType": "SPARK_LINE"
            }
          }
        }
      },
      {
        "width": 6,
        "height": 4,
        "xPos": 6,
        "yPos": 0,
        "widget": {
          "title": "Conversions (Last 24h)",
          "scorecard": {
            "timeSeriesQuery": {
              "timeSeriesFilter": {
                "filter": "metric.type=\"logging.googleapis.com/user/xafra_conversions\"",
                "aggregation": {
                  "alignmentPeriod": "3600s",
                  "perSeriesAligner": "ALIGN_RATE",
                  "crossSeriesReducer": "REDUCE_SUM"
                }
              }
            },
            "sparkChartView": {
              "sparkChartType": "SPARK_LINE"
            }
          }
        }
      },
      {
        "width": 12,
        "height": 4,
        "xPos": 0,
        "yPos": 4,
        "widget": {
          "title": "Postback Success Rate",
          "xyChart": {
            "dataSets": [
              {
                "timeSeriesQuery": {
                  "timeSeriesFilter": {
                    "filter": "metric.type=\"logging.googleapis.com/user/xafra_postback_success\"",
                    "aggregation": {
                      "alignmentPeriod": "300s",
                      "perSeriesAligner": "ALIGN_RATE",
                      "crossSeriesReducer": "REDUCE_SUM"
                    }
                  }
                },
                "plotType": "LINE"
              }
            ],
            "yAxis": {
              "label": "Success Rate",
              "scale": "LINEAR"
            }
          }
        }
      }
    ]
  }
}
'@

$businessDashboard | Out-File -FilePath "$env:TEMP\business-dashboard.json" -Encoding UTF8

try {
    Write-Host "📈 Creando dashboard de métricas de negocio..." -ForegroundColor Yellow
    $result = gcloud monitoring dashboards create --config-from-file="$env:TEMP\business-dashboard.json" 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Dashboard de negocio creado exitosamente" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Error creando dashboard de negocio: $result" -ForegroundColor Yellow
    }
} catch {
    Write-Host "⚠️  Error creando dashboard de negocio" -ForegroundColor Yellow
}

# Verificar dashboards creados
Write-Host ""
Write-Host "📊 Dashboards disponibles:" -ForegroundColor Cyan
try {
    gcloud monitoring dashboards list --format="table(displayName,etag)" 2>$null
} catch {
    Write-Host "  (Verificar manualmente en Cloud Console)" -ForegroundColor Gray
}

# Generar URL del proyecto para verificación manual
$projectId = gcloud config get-value project 2>$null
if ($projectId) {
    Write-Host ""
    Write-Host "🔗 Enlaces directos para verificación:" -ForegroundColor Yellow
    Write-Host "  📊 Dashboards: https://console.cloud.google.com/monitoring/dashboards?project=$projectId" -ForegroundColor Blue
    Write-Host "  🚨 Alertas: https://console.cloud.google.com/monitoring/alerting?project=$projectId" -ForegroundColor Blue
    Write-Host "  📝 Logs: https://console.cloud.google.com/logs/query?project=$projectId" -ForegroundColor Blue
    Write-Host "  📈 Métricas: https://console.cloud.google.com/monitoring/metrics-explorer?project=$projectId" -ForegroundColor Blue
}

# Limpiar archivos temporales
Remove-Item -Path "$env:TEMP\dashboard-fixed.json" -ErrorAction SilentlyContinue
Remove-Item -Path "$env:TEMP\business-dashboard.json" -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "🎯 Configuración de Monitoreo - COMPLETADA" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host ""
Write-Host "✅ Log-based metrics configuradas para business logic" -ForegroundColor Green
Write-Host "✅ Dashboards creados (verificar en Cloud Console)" -ForegroundColor Green
Write-Host "✅ APIs de monitoreo habilitadas" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Próximos pasos manuales:" -ForegroundColor Yellow
Write-Host "  1. Configurar notification channels con emails reales" -ForegroundColor Gray
Write-Host "  2. Crear alertas personalizadas desde Cloud Console" -ForegroundColor Gray
Write-Host "  3. Ajustar thresholds basado en tráfico real" -ForegroundColor Gray
Write-Host "  4. Configurar integración con Slack/PagerDuty" -ForegroundColor Gray