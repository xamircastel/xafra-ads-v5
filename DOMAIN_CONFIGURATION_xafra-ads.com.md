# 🌐 CONFIGURACIÓN DE DOMINIO - xafra-ads.com
# ============================================
# Documento de configuración para el ambiente de producción

## 📋 RESUMEN EJECUTIVO
- **Dominio Principal**: xafra-ads.com
- **Estado DNS**: ⏳ PENDIENTE DE CONFIGURACIÓN
- **Certificado SSL**: ✅ AUTOMÁTICO (Cloud Run)
- **CDN**: 🔄 CONFIGURACIÓN PENDIENTE

## 🏗️ ARQUITECTURA DE DOMINIOS

### Subdominios Propuestos:
```
🌐 xafra-ads.com (Gateway principal - Homepage/Landing)
├── 📡 api.xafra-ads.com (Core API)
├── 🔐 auth.xafra-ads.com (Authentication Service)
├── 📊 campaigns.xafra-ads.com (Campaign Management)
├── 📈 tracking.xafra-ads.com (Tracking Service - CRÍTICO)
├── 📤 postback.xafra-ads.com (Postback Service)
└── 📋 admin.xafra-ads.com (Admin Dashboard - Futuro)
```

## ⚡ MAPEO DE SERVICIOS CLOUD RUN

| Subdominio | Servicio Cloud Run | URL Actual (Temporal) |
|------------|--------------------|-----------------------|
| xafra-ads.com | gateway-prod | gateway-prod-697203931362.us-central1.run.app |
| api.xafra-ads.com | core-service-prod | core-service-prod-697203931362.us-central1.run.app |
| auth.xafra-ads.com | auth-service-prod | auth-service-prod-697203931362.us-central1.run.app |
| campaigns.xafra-ads.com | campaign-service-prod | campaign-service-prod-697203931362.us-central1.run.app |
| tracking.xafra-ads.com | tracking-service-prod | tracking-service-prod-697203931362.us-central1.run.app |
| postback.xafra-ads.com | postback-service-prod | postback-service-prod-697203931362.us-central1.run.app |

## 📋 CONFIGURACIÓN DNS REQUERIDA

### En el administrador de DNS de xafra-ads.com:

```dns
# 1. Registro A para dominio principal (apunta a Gateway)
xafra-ads.com.          A       <IP_GATEWAY_PROD>

# 2. Subdominios CNAME para servicios
api.xafra-ads.com.      CNAME   ghs.googlehosted.com.
auth.xafra-ads.com.     CNAME   ghs.googlehosted.com.
campaigns.xafra-ads.com. CNAME   ghs.googlehosted.com.
tracking.xafra-ads.com. CNAME   ghs.googlehosted.com.
postback.xafra-ads.com. CNAME   ghs.googlehosted.com.

# 3. Registro TXT para verificación de Google
xafra-ads.com.          TXT     "google-site-verification=XXXXXXXXX"
```

## 🔧 COMANDOS DE CONFIGURACIÓN

### 1. Mapear dominios personalizados:
```bash
# Mapear dominio principal
gcloud run domain-mappings create --service gateway-prod --domain xafra-ads.com --region us-central1

# Mapear subdominios
gcloud run domain-mappings create --service core-service-prod --domain api.xafra-ads.com --region us-central1
gcloud run domain-mappings create --service auth-service-prod --domain auth.xafra-ads.com --region us-central1
gcloud run domain-mappings create --service campaign-service-prod --domain campaigns.xafra-ads.com --region us-central1
gcloud run domain-mappings create --service tracking-service-prod --domain tracking.xafra-ads.com --region us-central1
gcloud run domain-mappings create --service postback-service-prod --domain postback.xafra-ads.com --region us-central1
```

### 2. Verificar configuración:
```bash
# Listar mapeos de dominio
gcloud run domain-mappings list --region us-central1

# Obtener detalles de DNS
gcloud run domain-mappings describe xafra-ads.com --region us-central1
```

## ⚠️ DEPENDENCIAS CRÍTICAS

### ✅ COMPLETADO:
- [x] Servicios Cloud Run desplegados
- [x] Variables de entorno configuradas
- [x] Bases de datos preparadas (schema production)
- [x] Archivos cloudbuild-*-prod.yaml creados
- [x] Dockerfiles específicos creados

### ⏳ PENDIENTE:
- [ ] **CRÍTICO**: Configurar DNS en el registrador del dominio
- [ ] Mapear dominios personalizados en Cloud Run
- [ ] Verificar certificados SSL
- [ ] Configurar Load Balancer (opcional, Cloud Run maneja automáticamente)
- [ ] Configurar CDN para assets estáticos (opcional)

## 🚨 PASOS INMEDIATOS REQUERIDOS

### PASO 1: Configuración DNS (CRÍTICO)
1. Acceder al panel de administración del dominio xafra-ads.com
2. Configurar los registros DNS mencionados arriba
3. **IMPORTANTE**: Esperar propagación DNS (24-48 horas máximo)

### PASO 2: Mapeo de dominios en GCP
1. Ejecutar comandos de mapeo después de configurar DNS
2. Verificar que los certificados SSL se generen automáticamente
3. Probar conectividad desde cada subdominio

### PASO 3: Actualizar configuraciones
1. Actualizar variables de entorno con URLs finales
2. Actualizar documentación y referencias
3. Ejecutar pruebas de integración completas

## 💰 IMPACTO EN COSTOS
- Mapeo de dominios: **GRATIS**
- Certificados SSL: **GRATIS** (automático con Cloud Run)
- Costo adicional: **$0 USD** (solo usa recursos ya aprovisionados)

## 📞 CONTACTO DE SOPORTE
En caso de problemas con la configuración DNS:
1. Verificar registros con `dig` o `nslookup`
2. Contactar soporte del registrador del dominio
3. Usar herramientas de Google Cloud Console para diagnóstico

---
**📋 Estado del documento**: READY TO EXECUTE
**🕒 Última actualización**: $(Get-Date)
**👤 Responsable**: DevOps Team