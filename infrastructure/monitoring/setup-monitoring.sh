#!/bin/bash

# Xafra-ads v5 - Cloud Monitoring Setup Script
# Configura monitoreo completo para los 5 microservicios

echo "🔍 Configurando Cloud Monitoring para Xafra-ads v5..."
echo "=================================================="

# Variables
PROJECT_ID="xafra-ads"
REGION="us-central1"
SERVICES=("core-service-stg" "auth-service-stg" "tracking-service-stg" "campaign-service-stg" "postback-service-stg")

# Verificar que gcloud esté configurado
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | head -n 1 > /dev/null; then
    echo "❌ Error: No hay sesión activa de gcloud"
    echo "Ejecuta: gcloud auth login"
    exit 1
fi

echo "✅ Proyecto: $(gcloud config get-value project)"
echo "✅ Región: $REGION"
echo ""

# 1. Habilitar APIs necesarias
echo "📡 Habilitando APIs necesarias..."
gcloud services enable monitoring.googleapis.com
gcloud services enable logging.googleapis.com
gcloud services enable clouderrorreporting.googleapis.com
gcloud services enable cloudtrace.googleapis.com
gcloud services enable cloudprofiler.googleapis.com

# 2. Crear workspace de monitoreo (si no existe)
echo "🏗️  Verificando Monitoring Workspace..."
if ! gcloud alpha monitoring workspaces list --filter="name:projects/$PROJECT_ID" --format="value(name)" | head -n 1 > /dev/null; then
    echo "Creando nuevo Monitoring Workspace..."
    gcloud alpha monitoring workspaces create --display-name="Xafra-ads v5 Monitoring"
else
    echo "✅ Monitoring Workspace ya existe"
fi

# 3. Crear notification channels
echo "📧 Configurando canales de notificación..."

# Email notification channel
EMAIL_CHANNEL=$(gcloud alpha monitoring channels create \
    --display-name="Engineering Team Email" \
    --type=email \
    --channel-labels=email_address=alerts@xafra.com \
    --description="Primary email alerts for critical issues" \
    --format="value(name)" 2>/dev/null || echo "existing")

if [ "$EMAIL_CHANNEL" != "existing" ]; then
    echo "✅ Canal de email creado: $EMAIL_CHANNEL"
else
    echo "✅ Canal de email ya existe"
fi

# 4. Crear alertas críticas
echo "🚨 Configurando alertas críticas..."

# Service Health Alert
cat << 'EOF' > /tmp/health-alert-policy.json
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
EOF

gcloud alpha monitoring policies create --policy-from-file=/tmp/health-alert-policy.json

# High Error Rate Alert
cat << 'EOF' > /tmp/error-rate-alert-policy.json
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
EOF

gcloud alpha monitoring policies create --policy-from-file=/tmp/error-rate-alert-policy.json

# High Latency Alert (crítico para redirects de ads)
cat << 'EOF' > /tmp/latency-alert-policy.json
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
EOF

gcloud alpha monitoring policies create --policy-from-file=/tmp/latency-alert-policy.json

# 5. Crear dashboard personalizado
echo "📊 Creando dashboard personalizado..."
cat << 'EOF' > /tmp/dashboard.json
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
EOF

gcloud monitoring dashboards create --config-from-file=/tmp/dashboard.json

# 6. Configurar logging structure
echo "📝 Configurando structured logging..."

# Log-based metrics para business logic
gcloud logging metrics create xafra_click_tracking \
    --description="Count of ad clicks tracked" \
    --log-filter='resource.type="cloud_run_revision" AND resource.labels.service_name="tracking-service-stg" AND jsonPayload.event_type="click"'

gcloud logging metrics create xafra_conversions \
    --description="Count of conversions tracked" \
    --log-filter='resource.type="cloud_run_revision" AND resource.labels.service_name="tracking-service-stg" AND jsonPayload.event_type="conversion"'

gcloud logging metrics create xafra_postback_success \
    --description="Count of successful postback deliveries" \
    --log-filter='resource.type="cloud_run_revision" AND resource.labels.service_name="postback-service-stg" AND jsonPayload.status="success"'

# 7. Verificación final
echo ""
echo "🔍 Verificando configuración..."
echo "✅ Policies de alertas creadas:"
gcloud alpha monitoring policies list --format="table(displayName,enabled)" --filter="displayName:Xafra-ads"

echo ""
echo "✅ Dashboards creados:"
gcloud monitoring dashboards list --format="table(displayName)" --filter="displayName:Xafra-ads"

echo ""
echo "✅ Log-based metrics creadas:"
gcloud logging metrics list --format="table(name)" --filter="name:xafra_*"

# Limpiar archivos temporales
rm -f /tmp/*alert-policy.json /tmp/dashboard.json

echo ""
echo "🎉 ¡Cloud Monitoring configurado exitosamente!"
echo "=================================================="
echo "📊 Dashboard: https://console.cloud.google.com/monitoring/dashboards"
echo "🚨 Alertas: https://console.cloud.google.com/monitoring/alerting"
echo "📝 Logs: https://console.cloud.google.com/logs/query"
echo ""
echo "💡 Recomendaciones:"
echo "  1. Configura emails en notification channels"
echo "  2. Ajusta thresholds según traffic real"
echo "  3. Revisa alertas diariamente durante la primera semana"
echo "  4. Considera agregar métricas de negocio personalizadas"