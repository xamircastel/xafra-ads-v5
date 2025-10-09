# 🚀 Google Ads Conversions - ENTEL Peru
## Guía de Implementación y Deployment

---

## 📋 Checklist de Implementación

### ✅ FASE 1: Base de Datos (COMPLETADO)
- [x] Migration creada (`20251002000000_add_conversions_table`)
- [x] Prisma schema actualizado con model `Conversion`
- [x] Relación con `Customer` configurada
- [x] Índices de performance añadidos

### ✅ FASE 2: Core-Service (COMPLETADO)
- [x] Endpoint `/service/v1/confirm/pe/entel/google/{apikey}/{tracking}` creado
- [x] Validación de API Key implementada
- [x] Cache de API Keys configurado (5 min TTL)
- [x] Detección de duplicados implementada
- [x] Logging comprehensivo añadido
- [x] Integración con Postback-Service configurada

### ✅ FASE 3: Postback-Service (COMPLETADO)
- [x] Endpoint `/api/postbacks/google/conversion` creado
- [x] Endpoint `/api/postbacks/google/health` para health check
- [x] Endpoint `/api/postbacks/google/stats` para estadísticas
- [x] Placeholder para Google Ads API preparado
- [x] Logging y error handling implementados

### ✅ FASE 4: Documentación y Scripts (COMPLETADO)
- [x] Documentación completa de API
- [x] Script de testing (`test-google-conversions.ps1`)
- [x] Script de monitoreo (`monitor-google-conversions.ps1`)
- [x] Ejemplos de uso en múltiples lenguajes

---

## 🔧 Deployment a Staging

### 1. Ejecutar Migration en Base de Datos

```bash
cd dev/packages/database

# Staging
DATABASE_URL="postgresql://postgres:XafraTech2025!@34.28.245.62:5432/xafra-ads?schema=staging" npx prisma migrate deploy

# Verificar
DATABASE_URL="postgresql://postgres:XafraTech2025!@34.28.245.62:5432/xafra-ads?schema=staging" npx prisma migrate status
```

### 2. Generar Prisma Client

```bash
cd dev/packages/database
npx prisma generate
```

### 3. Build y Deploy Core-Service

```bash
cd dev

# Build
npm run build --workspace=core-service

# Deploy to staging
gcloud builds submit --config=cloudbuild-core-stg.yaml .
```

### 4. Build y Deploy Postback-Service

```bash
cd dev

# Build
npm run build --workspace=@xafra/postback-service

# Deploy to staging
gcloud builds submit --config=cloudbuild-postback-stg.yaml .
```

### 5. Verificar Deployment

```bash
# Check Core-Service
curl https://core-service-stg-shk2qzic2q-uc.a.run.app/health

# Check Postback-Service
curl https://postback-service-stg-697203931362.us-central1.run.app/api/postbacks/google/health
```

---

## 🧪 Testing en Staging

### Ejecutar Suite de Tests

```powershell
cd dev\scripts
.\test-google-conversions.ps1
```

### Tests Incluidos:
1. ✅ Conversión simple (solo campos requeridos)
2. ✅ Conversión completa (con datos opcionales)
3. ✅ Detección de duplicados (debe fallar con 409)
4. ✅ API Key inválido (debe fallar con 401)
5. ✅ Tracking inválido (debe fallar con 400)
6. ✅ Consulta de estado de conversión

### Resultado Esperado:
```
✅ Test 1 PASSED
✅ Test 2 PASSED
✅ Test 3 PASSED: Duplicate correctly rejected (409)
✅ Test 4 PASSED: Invalid API key correctly rejected (401)
✅ Test 5 PASSED: Invalid tracking correctly rejected (400)
✅ Test 6 PASSED
```

---

## 📊 Monitoreo

### Ver Estadísticas

```powershell
# Últimos 7 días (default)
.\monitor-google-conversions.ps1

# Últimos 30 días
.\monitor-google-conversions.ps1 -Days 30

# Production environment
.\monitor-google-conversions.ps1 -Environment production
```

### Monitoreo en Tiempo Real

```powershell
.\monitor-google-conversions.ps1 -watch
```

---

## 🔐 Configuración de Google Ads API

### Variables de Entorno Requeridas:

```bash
# Google Ads API Credentials
GOOGLE_ADS_DEVELOPER_TOKEN=your_developer_token
GOOGLE_ADS_CLIENT_ID=your_client_id
GOOGLE_ADS_CLIENT_SECRET=your_client_secret
GOOGLE_ADS_REFRESH_TOKEN=your_refresh_token
GOOGLE_ADS_CUSTOMER_ID=1234567890
GOOGLE_ADS_CONVERSION_ACTION_ID=123456789
```

### Obtener Credenciales:

1. **Developer Token:**
   - Ir a Google Ads API Center
   - Solicitar developer token
   - Esperar aprobación (puede tomar varios días)

2. **OAuth2 Credentials:**
   - Crear proyecto en Google Cloud Console
   - Habilitar Google Ads API
   - Crear OAuth2 credentials
   - Generar refresh token

3. **Customer ID y Conversion Action ID:**
   - Customer ID: ID de cuenta de Google Ads (sin guiones)
   - Conversion Action ID: Crear "Conversion Action" en Google Ads

### Documentación:
- [Google Ads API Setup](https://developers.google.com/google-ads/api/docs/first-call/overview)
- [Upload Click Conversions](https://developers.google.com/google-ads/api/docs/conversions/upload-clicks)

---

## 🚀 Deployment a Production

### Pre-requisitos:
- [ ] Testing completo en staging
- [ ] Validación con ENTEL
- [ ] Credenciales de Google Ads configuradas
- [ ] Monitoreo validado

### Steps:

1. **Ejecutar Migration en Production DB:**
   ```bash
   DATABASE_URL="postgresql://postgres:XafraTech2025!@34.28.245.62:5432/xafra-ads?schema=production" npx prisma migrate deploy
   ```

2. **Deploy Services:**
   ```bash
   gcloud builds submit --config=cloudbuild-core-prod.yaml .
   gcloud builds submit --config=cloudbuild-postback-prod.yaml .
   ```

3. **Verificar:**
   ```bash
   curl https://xafra-ads.com/health
   curl https://xafra-ads.com/api/postbacks/google/health
   ```

4. **Test Real:**
   ```powershell
   .\test-google-conversions.ps1
   ```

---

## 📈 Métricas y SLAs

### Performance Targets:
- **Response Time:** < 200ms
- **Success Rate:** > 99%
- **Google Ads Upload:** > 95%
- **Availability:** 99.9%

### Alerts Recomendados:
- Success rate < 95% (últimas 24h)
- Response time > 500ms (p95)
- Error rate > 1%
- Service downtime > 1 minute

---

## 🔧 Troubleshooting

### Conversión no aparece en Google Ads:

1. **Verificar status_post_back:**
   ```sql
   SELECT id, tracking, status_post_back, date_post_back 
   FROM conversions 
   WHERE tracking = 'gclid_here';
   ```

2. **Si status = NULL:**
   - Postback aún no se ha ejecutado
   - Esperar unos segundos

3. **Si status = 2 (Failed):**
   - Revisar logs de postback-service
   - Verificar credenciales de Google Ads
   - Verificar que el gclid sea válido

### Logs en GCP:

```bash
# Core-Service logs
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=core-service-stg" --limit=50

# Postback-Service logs
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=postback-service-stg" --limit=50
```

---

## 📚 Documentación Adicional

- **API Documentation:** [docs/GOOGLE_ADS_CONVERSIONS_API.md](../docs/GOOGLE_ADS_CONVERSIONS_API.md)
- **Google Ads API Docs:** https://developers.google.com/google-ads/api
- **Prisma Migrations:** https://www.prisma.io/docs/concepts/components/prisma-migrate

---

## ✅ Validación Final

Antes de considerar la implementación completa:

- [ ] Migration ejecutada en staging
- [ ] Todos los tests pasan
- [ ] Documentación revisada por ENTEL
- [ ] Monitoreo funcionando
- [ ] Logs verificados
- [ ] Performance validada
- [ ] Google Ads API configurada (opcional para staging)
- [ ] Credenciales de producción preparadas

---

**Última actualización:** 2 de Octubre 2025  
**Autor:** Xafra Development Team  
**Versión:** 1.0.0
