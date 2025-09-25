# 📋 GUÍA CORREGIDA - IMPLEMENTACIÓN FASE 1 PRODUCCIÓN
## Comandos y Pasos Específicos para Configurar Ambiente Production (VERSIÓN CORREGIDA)

---

## 🎯 **OBJETIVO FASE 1 (CORREGIDO)**
Configurar ambiente production usando la **MISMA infraestructura PostgreSQL** existente pero con **separación por esquemas**, y crear infraestructura adicional solo donde sea necesario.

---

## ✅ **ESTRATEGIA MULTI-AMBIENTE CORRECTA**

### **Base de Datos: 1 Instancia, Múltiples Esquemas**
```yaml
PostgreSQL Instance: xafra-ads-postgres (EXISTENTE - 34.28.245.62)
├── public schema     (datos compartidos/configuración)
├── staging schema    (ambiente staging - EXISTENTE)
└── production schema (ambiente production - CREAR)
```

### **Redis: Instancias Separadas por Ambiente**
```yaml
Staging:    xafra-redis-staging (EXISTENTE - 10.147.230.83)
Production: xafra-redis-production (CREAR)
```

### **Cloud Run: Servicios Separados por Ambiente**
```yaml
Staging:    *-service-stg (EXISTENTE)
Production: *-service-prod (CREAR)
```

---

## 🗃️ **1. CONFIGURAR POSTGRESQL PRODUCTION SCHEMA**

### **NO crear nueva instancia - Usar la existente**
```bash
# ❌ NO HACER: gcloud sql instances create xafra-ads-postgres-prod
# ✅ USAR LA EXISTENTE: xafra-ads-postgres (34.28.245.62)

# Verificar instancia actual
gcloud sql instances describe xafra-ads-postgres --format="value(ipAddresses[0].ipAddress)"
```

### **Crear Schema Production**
```bash
# Conectar a la instancia existente
gcloud sql connect xafra-ads-postgres --user=postgres

# En el prompt SQL, crear schema production:
CREATE SCHEMA IF NOT EXISTS production;

# Crear usuario específico para production
CREATE USER xafra_app_prod WITH PASSWORD '[SECURE_PASSWORD]';

# Dar permisos al usuario sobre schema production
GRANT ALL PRIVILEGES ON SCHEMA production TO xafra_app_prod;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA production TO xafra_app_prod;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA production TO xafra_app_prod;

# Dar permisos de lectura sobre public schema (datos compartidos)
GRANT USAGE ON SCHEMA public TO xafra_app_prod;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO xafra_app_prod;

# Salir
\q
```

### **Configurar Connection Strings**
```yaml
# Staging Connection (EXISTENTE)
DATABASE_URL_STAGING: "postgresql://postgres:[PASSWORD]@34.28.245.62:5432/xafra_ads?schema=staging"

# Production Connection (NUEVO)
DATABASE_URL_PRODUCTION: "postgresql://xafra_app_prod:[PASSWORD]@34.28.245.62:5432/xafra_ads?schema=production"

# Public/Shared Connection
DATABASE_URL_SHARED: "postgresql://postgres:[PASSWORD]@34.28.245.62:5432/xafra_ads?schema=public"
```

---

## 🔴 **2. CREAR REDIS PRODUCTION (Nueva Instancia)**

### **Comando de Creación**
```bash
# Crear instancia Redis production (separada de staging)
gcloud redis instances create xafra-redis-production \
    --size=1 \
    --region=us-central1 \
    --redis-version=redis_6_x \
    --tier=standard \
    --network=default \
    --connect-mode=PRIVATE_SERVICE_ACCESS
```

### **Verificar Redis Instances**
```bash
# Listar todas las instancias Redis
gcloud redis instances list --region=us-central1

# Debe mostrar:
# - xafra-redis-staging (EXISTENTE)
# - xafra-redis-production (NUEVA)
```

### **Configurar VPC Connector Production (Opcional - Evaluar si necesario)**
```bash
# Evaluar si crear nuevo VPC connector o usar el existente
# OPCIÓN 1: Usar VPC connector existente (más económico)
VPC_CONNECTOR=xafra-vpc-connector

# OPCIÓN 2: Crear VPC connector específico para production (más aislamiento)
gcloud compute networks vpc-access connectors create xafra-vpc-connector-prod \
    --region=us-central1 \
    --subnet-project=xafra-ads \
    --subnet=default \
    --min-instances=2 \
    --max-instances=6 \
    --machine-type=e2-micro
```

---

## 🌐 **3. CONFIGURAR DOMINIOS PRODUCTION**

### **Crear Load Balancer Production**
```bash
# Reservar IP estática para production
gcloud compute addresses create xafra-ads-production-ip \
    --global

# Obtener IP asignada
gcloud compute addresses describe xafra-ads-production-ip \
    --global \
    --format="value(address)"
```

### **Crear SSL Certificates**
```bash
# Crear certificado SSL para dominios production
gcloud compute ssl-certificates create xafra-ads-ssl-prod \
    --domains=ads.xafra-ads.com,api.xafra-ads.com,admin.xafra-ads.com
```

### **Configurar DNS (Manual en proveedor DNS)**
```yaml
# Agregar estos registros DNS:
ads.xafra-ads.com     A     [IP_PRODUCTION_ESTATICA]
api.xafra-ads.com     A     [IP_PRODUCTION_ESTATICA]
admin.xafra-ads.com   A     [IP_PRODUCTION_ESTATICA]
```

---

## 🏗️ **4. SERVICIOS CLOUD RUN PRODUCTION**

### **Naming Convention Production**
```yaml
Staging Services (EXISTENTES):
  - core-service-stg
  - auth-service-stg
  - campaign-service-stg
  - tracking-service-stg
  - postback-service-stg
  - gateway-stg

Production Services (CREAR):
  - core-service-prod
  - auth-service-prod
  - campaign-service-prod
  - tracking-service-prod
  - postback-service-prod
  - gateway-prod
```

### **Variables de Entorno Production**
```yaml
_PROJECT_ID: xafra-ads
_ENVIRONMENT: production
_DATABASE_URL: postgresql://xafra_app_prod:[PASSWORD]@34.28.245.62:5432/xafra_ads?schema=production
_REDIS_URL: redis://[PROD_REDIS_IP]:6379
_REGION: us-central1
_VPC_CONNECTOR: xafra-vpc-connector  # o xafra-vpc-connector-prod si se crea nuevo
_LOG_LEVEL: info
_RATE_LIMIT: strict
```

---

## 📁 **5. CLOUD BUILD FILES PRODUCTION**

### **Archivos a Crear (Basados en staging)**
```bash
# Copiar archivos staging como base para production
cp cloudbuild-gateway-stg-homepage.yaml cloudbuild-gateway-prod.yaml
cp cloudbuild-core-stg.yaml cloudbuild-core-prod.yaml
cp cloudbuild-auth-stg.yaml cloudbuild-auth-prod.yaml
cp cloudbuild-campaign-stg.yaml cloudbuild-campaign-prod.yaml
cp cloudbuild-postback-stg.yaml cloudbuild-postback-prod.yaml

# Crear archivo maestro production
touch cloudbuild-production-master.yaml
```

### **Modificaciones en Cloud Build Files**
```yaml
# En cada archivo production, cambiar:
substitutions:
  _SERVICE_NAME: [service]-prod    # Cambiar de -stg a -prod
  _ENVIRONMENT: production         # Cambiar de staging a production
  _DATABASE_SCHEMA: production     # Especificar schema production
  _REDIS_INSTANCE: xafra-redis-production

env:
- name: DATABASE_URL
  value: postgresql://xafra_app_prod:[PASSWORD]@34.28.245.62:5432/xafra_ads?schema=production
- name: ENVIRONMENT
  value: production
```

---

## 🔐 **6. SECURITY PRODUCTION**

### **Service Account Production**
```bash
# Crear service account específico para production
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

### **Secret Management Production**
```bash
# Crear secrets específicos para production
echo -n "[PROD_DATABASE_PASSWORD]" | \
    gcloud secrets create db-password-prod --data-file=-

echo -n "[PROD_API_ENCRYPTION_KEY]" | \
    gcloud secrets create api-key-prod --data-file=-

echo -n "[PROD_JWT_SECRET]" | \
    gcloud secrets create jwt-secret-prod --data-file=-
```

---

## 📊 **7. MONITOREO PRODUCTION**

### **Configurar Alertas Production**
```bash
# Crear notification channels
gcloud alpha monitoring channels create \
    --display-name="Xafra Production Critical" \
    --type=email \
    --channel-labels=email_address=[EMAIL]

# Crear alerting policies específicas para production
gcloud alpha monitoring policies create \
    --policy-from-file=monitoring/production-critical-alerts.yaml
```

---

## ✅ **8. CHECKLIST FASE 1 CORREGIDO**

### **Base de Datos**
- [ ] Schema `production` creado en instancia existente (xafra-ads-postgres)
- [ ] Usuario `xafra_app_prod` creado con permisos correctos
- [ ] Connection string production configurada
- [ ] Prueba de conectividad desde Cloud Shell

### **Redis**
- [ ] Instancia Redis production creada (xafra-redis-production)  
- [ ] Conectividad verificada desde VPC
- [ ] Connection string production configurada

### **Dominios e Infraestructura**
- [ ] IP estática production reservada
- [ ] SSL certificates creados para dominios production
- [ ] DNS records configurados (manual)
- [ ] Load balancer básico configurado

### **Security**
- [ ] Service account production creado
- [ ] Secrets management configurado
- [ ] IAM roles asignados correctamente

### **Preparación CI/CD**
- [ ] Cloud Build files production creados (basados en staging)
- [ ] Variables de entorno production configuradas
- [ ] Service names production definidos

---

## 🚨 **COMANDOS DE VALIDACIÓN**

### **Verificar Configuración Actual**
```bash
# Verificar PostgreSQL existente
gcloud sql instances describe xafra-ads-postgres --format="value(ipAddresses[0].ipAddress)"

# Verificar Redis staging
gcloud redis instances list --region=us-central1

# Verificar servicios Cloud Run actuales
gcloud run services list --region=us-central1
```

### **Test de Conectividad**
```bash
# Test PostgreSQL connection al schema production
gcloud sql connect xafra-ads-postgres --user=xafra_app_prod

# En SQL prompt:
SELECT current_schema();
\dt production.*;
```

---

## 📞 **RECURSOS E INFORMACIÓN**

### **Infraestructura Existente (NO MODIFICAR)**
```yaml
PostgreSQL: xafra-ads-postgres (34.28.245.62)
Redis Staging: xafra-redis-staging (10.147.230.83)
VPC Connector: xafra-vpc-connector
```

### **Infraestructura Nueva (CREAR)**
```yaml
Redis Production: xafra-redis-production (IP a determinar)
IP Production: xafra-ads-production-ip (IP a determinar)
SSL Cert: xafra-ads-ssl-prod
Service Account: xafra-production-sa
```

---

## 🎯 **ESTRATEGIA RESUMIDA**

### **✅ LO QUE VAMOS A HACER:**
1. **Reutilizar PostgreSQL existente** con nuevo schema `production`
2. **Crear Redis production separado** para aislamiento de cache
3. **Configurar dominios production** con nueva IP estática
4. **Crear servicios Cloud Run production** (*-prod)
5. **Configurar CI/CD production** basado en archivos staging

### **❌ LO QUE NO VAMOS A HACER:**
1. ~~Crear nueva instancia PostgreSQL~~ (innecesario y costoso)
2. ~~Modificar configuración staging~~ (mantener funcionando)
3. ~~Cambiar VPC connector existente~~ (evaluar si crear nuevo)

---

**📅 Guía corregida**: 25 de Septiembre 2025  
**🎯 Objetivo**: Configurar production con esquemas separados  
**💰 Costo adicional**: ~$50-80/mes (Redis + IP + certificados)  
**✅ Estado**: CORREGIDO Y LISTO PARA NUEVO CONTEXTO