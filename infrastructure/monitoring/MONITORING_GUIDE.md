# 🔍 Xafra-ads v5 - Guía de Monitoreo

## Descripción General
Sistema de monitoreo completo para la arquitectura de microservicios Xafra-ads v5, diseñado específicamente para optimizar el rendimiento de publicidad digital y detectar problemas críticos de manera proactiva.

## 🎯 Métricas Críticas del Negocio

### 1. **Performance de Redirects (< 50ms)**
```
Métrica: run.googleapis.com/request_latencies
Filtro: resource.type="cloud_run_revision" AND resource.label.service_name="core-service-stg"
Threshold Crítico: > 50ms (impacta conversiones)
Threshold Warning: > 30ms
```

### 2. **Disponibilidad de Servicios (99.9%)**
```
Métrica: run.googleapis.com/request_count
Filtro: response_code_class="2xx"
SLA Target: 99.9% uptime
Alert: Si availability < 99.5% en 5 minutos
```

### 3. **Tasa de Conversión**
```
Métrica Custom: xafra_conversions / xafra_click_tracking
Filtro: tracking-service-stg logs
Alert: Si conversion rate cae > 20% del promedio
```

### 4. **Entrega de Postbacks (99.5%)**
```
Métrica Custom: xafra_postback_success
Filtro: postback-service-stg success responses
Alert: Si success rate < 95% en 10 minutos
```

## 🚨 Alertas Configuradas

### Nivel CRÍTICO 🔴
1. **Service Down**: Cualquier servicio no responde > 5 minutos
2. **Database Disconnect**: Conexión a PostgreSQL falla
3. **Error Rate > 5%**: Errores 5xx exceden 5% del tráfico
4. **Redirect Latency > 2s**: Core service response time crítico

### Nivel WARNING 🟡
1. **High Memory Usage**: > 80% memoria utilizada
2. **Slow Response**: Response time > 1s (pero < 2s)
3. **Conversion Drop**: Conversiones bajan > 15% vs promedio
4. **Postback Retries**: Intentos fallidos > 10% del total

### Nivel INFO 🔵
1. **High Traffic**: Picos de tráfico > 150% del promedio
2. **New Deployment**: Cambios en servicios detectados
3. **Cache Miss Rate**: Redis fallback mode activo

## 📊 Dashboards Principales

### 1. **System Overview** (Principal)
```
Ubicación: Cloud Monitoring > Dashboards > "Xafra-ads v5 - System Overview"
Métricas:
- Request Rate por servicio (línea de tiempo)
- Error Rate por servicio (línea de tiempo) 
- Response Time 95th percentile (línea de tiempo)
- Memory Usage por servicio (área apilada)
```

### 2. **Business Metrics** (KPIs)
```
Ubicación: Cloud Monitoring > Dashboards > "Xafra-ads v5 - Business Metrics"
Métricas:
- Clicks por hora (barras)
- Conversiones por hora (línea)
- Conversion Rate % (gauge)
- Postback Success Rate % (gauge)
```

### 3. **Infrastructure Health** (Técnico)
```
Ubicación: Cloud Monitoring > Dashboards > "Xafra-ads v5 - Infrastructure"
Métricas:
- CPU Usage por servicio
- Database Connections
- Network I/O
- Container Instance Count
```

## 🔗 Log-based Metrics

### Configuradas Automáticamente:
```bash
# Clicks de publicidad
xafra_click_tracking: jsonPayload.event_type="click"

# Conversiones exitosas  
xafra_conversions: jsonPayload.event_type="conversion"

# Postbacks entregados
xafra_postback_success: jsonPayload.status="success"
```

### Queries Útiles para Debugging:
```bash
# Ver errores críticos últimas 24h
resource.type="cloud_run_revision" 
severity>=ERROR 
timestamp>="2024-09-18T00:00:00Z"

# Tracking de clicks por país
resource.labels.service_name="tracking-service-stg"
jsonPayload.country_code!=""

# Performance issues Core Service
resource.labels.service_name="core-service-stg"
jsonPayload.response_time>50
```

## 🎛️ Configuración de Notificaciones

### Canales Recomendados:
1. **Email**: Alertas críticas → engineering@xafra.com
2. **Slack**: Alertas warning → #engineering-alerts
3. **SMS**: Solo service down → on-call engineer
4. **PagerDuty**: Escalation después de 15 min sin respuesta

### Configuración de Horarios:
```yaml
Critical Alerts: 24/7 immediate
Warning Alerts: Business hours (8 AM - 8 PM Costa Rica)
Info Alerts: Daily digest email
```

## 🚀 Comandos de Respuesta Rápida

### Verificar Estado General:
```bash
# Health check todos los servicios
curl -s https://core-service-stg-697203931362.us-central1.run.app/health
curl -s https://auth-service-stg-697203931362.us-central1.run.app/health
curl -s https://tracking-service-stg-697203931362.us-central1.run.app/health
curl -s https://campaign-service-stg-697203931362.us-central1.run.app/health
curl -s https://postback-service-stg-697203931362.us-central1.run.app/api/health
```

### Ver Logs en Tiempo Real:
```bash
# Errores críticos últimos 10 min
gcloud logging read "severity>=ERROR AND timestamp>='-PT10M'" --format=json

# Performance tracking
gcloud logging read "jsonPayload.response_time>100" --limit=20
```

### Escalabilidad de Emergencia:
```bash
# Aumentar instancias si high traffic
gcloud run services update core-service-stg --max-instances=20 --region=us-central1
gcloud run services update tracking-service-stg --max-instances=15 --region=us-central1
```

## 📋 Checklist de Monitoreo Diario

### Durante la Primera Semana (Staging):
- [ ] Revisar dashboard principal cada mañana
- [ ] Verificar alertas falsas y ajustar thresholds
- [ ] Analizar patrones de tráfico y performance
- [ ] Documentar incidentes y resoluciones
- [ ] Optimizar configuración basada en datos reales

### Operación Normal:
- [ ] Verificar alertas activas (diario)
- [ ] Revisar métricas de negocio (semanal)
- [ ] Análisis de tendencias (mensual)
- [ ] Ajuste de capacidad (según demanda)

## 🎯 KPIs Objetivo para Xafra-ads v5

```
🚀 Performance:
- Redirect time: < 50ms (p95)
- API response: < 200ms (p95)
- Database queries: < 100ms (p95)

📈 Reliability:
- Service uptime: 99.9%
- Error rate: < 0.1%
- Postback delivery: 99.5%

💰 Business:
- Conversion rate: Mantener baseline
- Revenue tracking: 100% accuracy
- Customer satisfaction: > 95%
```

## 🔧 Troubleshooting Rápido

| Síntoma | Posible Causa | Acción Inmediata |
|---------|---------------|------------------|
| High latency | DB overload | Check DB connections, scale if needed |
| 5xx errors | Service crash | Check logs, restart service |
| Low conversions | Tracking issues | Verify tracking-service health |
| Postback fails | External API down | Check webhook endpoints, enable retries |
| Memory alerts | Memory leak | Restart affected service, investigate |

## 📞 Contactos de Escalación

```
L1 Support: engineering@xafra.com
L2 DevOps: devops@xafra.com  
L3 Architecture: architecture@xafra.com
Emergency: +506-xxxx-xxxx (WhatsApp)
```

---

**Última actualización**: Sep 19, 2025  
**Versión**: 1.0  
**Responsable**: Engineering Team Xafra-ads v5