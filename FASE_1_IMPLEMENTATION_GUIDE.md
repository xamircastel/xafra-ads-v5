# 📋 GUÍA RÁPIDA - IMPLEMENTACIÓN FASE 1 PRODUCCIÓN
## Comandos y Pasos Específicos para Configurar Ambiente Production

---

## 🎯 **OBJETIVO FASE 1**
Configurar infraestructura production completamente separada de staging, preparada para CI/CD automático.

---

## 🗃️ **1. CREAR POSTGRESQL PRODUCTION**

### **Comando de Creación**
```bash
# Crear instancia PostgreSQL production
gcloud sql instances create xafra-ads-postgres-prod \
    --database-version=POSTGRES_13 \
    --tier=db-custom-2-4096 \
    --region=us-central1 \
    --storage-size=50GB \
    --storage-type=SSD \
    --storage-auto-increase \
    --backup-start-time=02:00 \
    --enable-bin-log \
    --maintenance-release-channel=production \
    --maintenance-window-day=SUN \
    --maintenance-window-hour=03 \
    --deletion-protection
```

### **Configurar Acceso**
```bash
# Configurar IPs autorizadas (solo necesarias)
gcloud sql instances patch xafra-ads-postgres-prod \
    --authorized-networks="186.86.34.48/32"

# Crear base de datos
gcloud sql databases create xafra_ads_production \
    --instance=xafra-ads-postgres-prod

# Crear usuario aplicación
gcloud sql users create xafra_app_prod \
    --instance=xafra-ads-postgres-prod \
    --password=[SECURE_PASSWORD]
```

### **Migrar Schema**
```bash
# Exportar schema desde staging
gcloud sql export sql xafra-ads-postgres \
    gs://xafra-staging-backups/schema-export-$(date +%Y%m%d).sql \
    --database=xafra_ads

# Importar a production (solo schema, no data)
gcloud sql import sql xafra-ads-postgres-prod \
    gs://xafra-staging-backups/schema-export-$(date +%Y%m%d).sql \
    --database=xafra_ads_production
```

---

## 🔴 **2. CREAR REDIS PRODUCTION**

### **Comando de Creación**
```bash
# Crear instancia Redis production
gcloud redis instances create xafra-redis-production \
    --size=1 \
    --region=us-central1 \
    --redis-version=redis_6_x \
    --tier=standard \
    --network=default \
    --connect-mode=PRIVATE_SERVICE_ACCESS
```

### **Configurar VPC Connector Production**
```bash
# Crear VPC connector para production
gcloud compute networks vpc-access connectors create xafra-vpc-connector-prod \
    --region=us-central1 \
    --subnet-project=xafra-ads \
    --subnet=default \
    --min-instances=2 \
    --max-instances=6 \
    --machine-type=e2-micro
```

---

## 🌐 **3. CONFIGURAR DOMINIOS**

### **Crear Load Balancer**
```bash
# Reservar IP estática
gcloud compute addresses create xafra-ads-production-ip \
    --global

# Crear certificado SSL
gcloud compute ssl-certificates create xafra-ads-ssl-prod \
    --domains=ads.xafra-ads.com,api.xafra-ads.com
```

### **Configurar DNS (Manual)**
```yaml
# Configurar en tu proveedor DNS:
ads.xafra-ads.com     A     [IP_ESTATICA]
api.xafra-ads.com     A     [IP_ESTATICA]
admin.xafra-ads.com   A     [IP_ESTATICA]
*.xafra-ads.com       A     [IP_ESTATICA]
```

---

## 🏗️ **4. CLOUD BUILD PRODUCTION FILES**

### **Archivos a Crear**
```bash
# Crear directorio para archivos production
mkdir -p deployment/production

# Lista de archivos que necesitamos crear:
touch cloudbuild-production.yaml
touch cloudbuild-gateway-prod.yaml  
touch cloudbuild-core-prod.yaml
touch cloudbuild-auth-prod.yaml
touch cloudbuild-campaign-prod.yaml
touch cloudbuild-tracking-prod.yaml
touch cloudbuild-postback-prod.yaml
```

### **Variables de Entorno Production**
```yaml
# Agregar a Cloud Build settings
_PROJECT_ID: xafra-ads
_ENVIRONMENT: production
_DATABASE_URL: postgresql://xafra_app_prod:[PASSWORD]@[PROD_IP]:5432/xafra_ads_production
_REDIS_URL: redis://[PROD_REDIS_IP]:6379
_REGION: us-central1
_VPC_CONNECTOR: xafra-vpc-connector-prod
```

---

## 🧪 **5. TESTING PRODUCTION SETUP**

### **Verificar Conectividad**
```bash
# Test PostgreSQL connection
gcloud sql connect xafra-ads-postgres-prod --user=xafra_app_prod

# Test Redis (desde Cloud Shell)
redis-cli -h [REDIS_IP] ping

# Test VPC Connector
gcloud compute networks vpc-access connectors describe xafra-vpc-connector-prod \
    --region=us-central1
```

### **Deploy Test Service**
```bash
# Deploy simple health check service to test infrastructure
gcloud run deploy health-check-prod \
    --image=gcr.io/cloudrun/hello \
    --region=us-central1 \
    --vpc-connector=xafra-vpc-connector-prod \
    --allow-unauthenticated
```

---

## 📊 **6. MONITOREO PRODUCTION**

### **Configurar Alertas**
```bash
# Crear notification channel (Slack/Email)
gcloud alpha monitoring channels create \
    --display-name="Xafra Production Alerts" \
    --type=slack \
    --channel-labels=url=[SLACK_WEBHOOK]

# Crear alerting policies
gcloud alpha monitoring policies create \
    --policy-from-file=monitoring/production-alerts.yaml
```

### **Dashboard Setup**
```bash
# Crear dashboard personalizado
gcloud monitoring dashboards create \
    --config-from-file=monitoring/production-dashboard.json
```

---

## 🔐 **7. SECURITY PRODUCTION**

### **IAM Roles**
```bash
# Crear service account para production
gcloud iam service-accounts create xafra-production-sa \
    --description="Service account for Xafra production services" \
    --display-name="Xafra Production SA"

# Asignar roles mínimos necesarios
gcloud projects add-iam-policy-binding xafra-ads \
    --member="serviceAccount:xafra-production-sa@xafra-ads.iam.gserviceaccount.com" \
    --role="roles/cloudsql.client"

gcloud projects add-iam-policy-binding xafra-ads \
    --member="serviceAccount:xafra-production-sa@xafra-ads.iam.gserviceaccount.com" \
    --role="roles/redis.editor"
```

### **Secret Management**
```bash
# Crear secrets en Secret Manager
echo -n "[DATABASE_PASSWORD]" | \
    gcloud secrets create db-password-prod --data-file=-

echo -n "[REDIS_AUTH_TOKEN]" | \
    gcloud secrets create redis-auth-prod --data-file=-

echo -n "[API_ENCRYPTION_KEY]" | \
    gcloud secrets create api-key-prod --data-file=-
```

---

## ✅ **8. CHECKLIST FASE 1**

### **Pre-requisitos**
- [ ] PostgreSQL production instance creada
- [ ] Redis production instance creada  
- [ ] VPC Connector production configurado
- [ ] Dominios reservados y DNS configurado
- [ ] SSL certificates creados
- [ ] Load balancer configurado
- [ ] Service accounts y permisos configurados
- [ ] Secrets management setup
- [ ] Monitoring y alertas básicas

### **Validación**
- [ ] Conectividad PostgreSQL desde Cloud Run
- [ ] Conectividad Redis desde VPC
- [ ] Dominios resuelven correctamente
- [ ] SSL certificates válidos
- [ ] Health checks responding
- [ ] Monitoreo collecting metrics
- [ ] Alertas funcionando

---

## 🚀 **COMANDOS DE EMERGENCIA**

### **Rollback Database**
```bash
# Si algo sale mal, rollback a backup
gcloud sql backups list --instance=xafra-ads-postgres-prod
gcloud sql backups restore [BACKUP_ID] \
    --restore-instance=xafra-ads-postgres-prod
```

### **Rollback Infrastructure**
```bash
# Eliminar recursos si necesario empezar de nuevo
gcloud sql instances delete xafra-ads-postgres-prod
gcloud redis instances delete xafra-redis-production --region=us-central1
gcloud compute networks vpc-access connectors delete xafra-vpc-connector-prod \
    --region=us-central1
```

---

## 📞 **INFORMACIÓN DE CONTACTO**

### **IPs y Endpoints (Rellenar después de creación)**
```yaml
PostgreSQL Production: [IP_A_DETERMINAR]
Redis Production: [IP_A_DETERMINAR]  
Load Balancer IP: [IP_A_DETERMINAR]
```

### **Credenciales (Gestionar en Secret Manager)**
```yaml
DB User: xafra_app_prod
DB Password: [STORED_IN_SECRET_MANAGER]
Redis Auth: [STORED_IN_SECRET_MANAGER]
```

---

**📅 Guía creada**: 25 de Septiembre 2025  
**🎯 Objetivo**: Configurar infraestructura production  
**⏱️ Tiempo estimado**: 4-6 horas  
**✅ Estado**: LISTO PARA EJECUTAR