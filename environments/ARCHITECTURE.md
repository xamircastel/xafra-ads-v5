# 🏗️ ARQUITECTURA MULTI-AMBIENTE XAFRA-ADS V5
# =============================================

## 📋 RESUMEN DE AMBIENTES

| Ambiente | Propósito | Base de Datos | Dominio | Estado |
|----------|-----------|---------------|---------|--------|
| **DEV** | Desarrollo local | Existente (34.28.245.62) | localhost:puertos | ✅ Activo |
| **STG** | Pre-producción | Cloud SQL STG | stg-api.xafra-ads.com | 📋 Planificado |
| **PROD** | Producción | Cloud SQL PROD | api.xafra-ads.com | 📋 Planificado |

## 🗄️ ESTRATEGIA DE BASES DE DATOS

### DEV (Actual - MANTENER)
- **Host**: 34.28.245.62 (IP fija existente)
- **Base**: xafra-ads 
- **Usuario**: postgres
- **Propósito**: Desarrollo y testing

### STAGING (Nueva)
- **Tipo**: Cloud SQL PostgreSQL (db-f1-micro)
- **Base**: xafra-ads-stg
- **Usuario**: xafra-user
- **Backup**: Automático diario
- **Propósito**: Testing de pre-producción

### PRODUCCIÓN (Nueva)
- **Tipo**: Cloud SQL PostgreSQL (db-custom-2-4096)
- **Base**: xafra-ads-prod  
- **Usuario**: xafra-user
- **Backup**: Automático cada 6 horas
- **HA**: Alta disponibilidad habilitada
- **Propósito**: Ambiente de producción

## 🚀 ESTRATEGIA CLOUD RUN

### Microservicios por Ambiente

#### STAGING
```
core-service-stg      -> https://core-service-stg-[hash]-uc.a.run.app
tracking-service-stg  -> https://tracking-service-stg-[hash]-uc.a.run.app  
auth-service-stg      -> https://auth-service-stg-[hash]-uc.a.run.app
campaign-service-stg  -> https://campaign-service-stg-[hash]-uc.a.run.app
postback-service-stg  -> https://postback-service-stg-[hash]-uc.a.run.app
```

#### PRODUCCIÓN
```
core-service-prod     -> https://api.xafra-ads.com
tracking-service-prod -> https://api.xafra-ads.com/tracking
auth-service-prod     -> https://api.xafra-ads.com/auth  
campaign-service-prod -> https://api.xafra-ads.com/campaign
postback-service-prod -> https://api.xafra-ads.com/postback
```

## 🌐 ESTRATEGIA DE DOMINIOS

### Dominio Principal: xafra-ads.com
- **DEV**: localhost:puertos (sin dominio)
- **STG**: stg-api.xafra-ads.com
- **PROD**: api.xafra-ads.com

### SSL/TLS
- **STG**: Certificado automático de Google Cloud
- **PROD**: Certificado automático de Google Cloud

## 🔒 ESTRATEGIA DE SEGURIDAD

### Segregación por Ambiente
- **DEV**: Claves de desarrollo (públicas en código)
- **STG**: Claves de staging (Google Secret Manager)
- **PROD**: Claves de producción (Google Secret Manager)

### API Keys
- **DEV**: Formato existente de 47 caracteres
- **STG**: Mismo formato, diferentes valores
- **PROD**: Mismo formato, máxima seguridad

## 📊 ESTRATEGIA DE DATOS

### Migración de Datos
1. **DEV -> STG**: Copia completa inicial para testing
2. **STG -> PROD**: Migración final con datos validados

### Backup Strategy
- **DEV**: Manual (ya implementado)
- **STG**: Automático diario
- **PROD**: Automático cada 6 horas + replicación

## 🚀 PLAN DE DEPLOYMENT

### Secuencia de Implementación
1. **Fase 3.1**: Crear Cloud SQL STG
2. **Fase 3.2**: Configurar Cloud Run STG  
3. **Fase 3.3**: Setup dominio STG
4. **Fase 3.4**: Testing completo STG
5. **Fase 3.5**: Crear Cloud SQL PROD
6. **Fase 3.6**: Configurar Cloud Run PROD
7. **Fase 3.7**: Setup dominio PROD
8. **Fase 3.8**: Migración final

## 💰 ESTIMACIÓN DE COSTOS MENSUAL

### STAGING
- Cloud SQL (db-f1-micro): ~$9 USD
- Cloud Run (5 servicios): ~$5 USD
- **Total STG**: ~$14 USD/mes

### PRODUCCIÓN  
- Cloud SQL (db-custom-2-4096): ~$45 USD
- Cloud Run (5 servicios): ~$15 USD
- **Total PROD**: ~$60 USD/mes

### **TOTAL ESTIMADO: ~$74 USD/mes**

---
*Arquitectura diseñada para escalabilidad, seguridad y costos optimizados*