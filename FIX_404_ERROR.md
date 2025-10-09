# 🚨 SOLUCIÓN AL ERROR 404 - Endpoint POST

## Diagnóstico
El error **404 Not Found** ocurre porque:
- ✅ El código fue modificado localmente (GET → POST)
- ✅ La compilación fue exitosa
- ❌ **Los cambios NO están desplegados en staging**
- ❌ El servidor de staging todavía tiene la versión antigua con endpoint GET

---

## 📋 Pasos para Resolver (EN ORDEN)

### ✅ Paso 1: Aplicar Migración de Base de Datos (OBLIGATORIO)

La migración cambia el tipo de columna `id_product` de `BIGINT` a `VARCHAR(255)`.

**SQL a ejecutar:**
```sql
ALTER TABLE staging.conversions 
ALTER COLUMN id_product TYPE VARCHAR(255) USING id_product::VARCHAR;
```

**Opciones para ejecutar:**

#### Opción A: Desde Google Cloud Console
1. Ve a: https://console.cloud.google.com/sql/instances
2. Selecciona tu instancia SQL
3. Click en "Open Cloud Shell"
4. Ejecuta:
```bash
gcloud sql connect xafra-ads --user=staging_user
# Ingresa password cuando lo pida
\c xafra-ads
SET search_path TO staging;
ALTER TABLE conversions ALTER COLUMN id_product TYPE VARCHAR(255) USING id_product::VARCHAR;
\q
```

#### Opción B: Con psql local (si lo tienes instalado)
```powershell
$env:PGPASSWORD="TU_PASSWORD"
psql -h 34.28.245.62 -p 5432 -U staging_user -d xafra-ads -c "ALTER TABLE staging.conversions ALTER COLUMN id_product TYPE VARCHAR(255) USING id_product::VARCHAR;"
```

#### Opción C: Con DBeaver, pgAdmin u otro cliente SQL
1. Conecta a: `34.28.245.62:5432`
2. Database: `xafra-ads`
3. Schema: `staging`
4. Ejecuta el SQL de arriba

**Verificar que se aplicó correctamente:**
```sql
SELECT column_name, data_type, character_maximum_length, is_nullable
FROM information_schema.columns 
WHERE table_schema = 'staging' 
  AND table_name = 'conversions'
  AND column_name = 'id_product';

-- Debe mostrar:
-- column_name | data_type          | character_maximum_length | is_nullable
-- id_product  | character varying  | 255                      | YES
```

---

### ✅ Paso 2: Desplegar a Staging

Una vez aplicada la migración, despliega el servicio:

```powershell
cd c:\Users\XCAST\Desktop\xafra-ads-v5\dev
.\deploy-core-service-post.ps1
```

**O manualmente:**
```powershell
cd c:\Users\XCAST\Desktop\xafra-ads-v5\dev
gcloud builds submit --config=cloudbuild-core-stg.yaml .
```

**Tiempo estimado:** 5-8 minutos

---

### ✅ Paso 3: Verificar el Despliegue

Después del despliegue, verifica que el endpoint POST esté disponible:

**Test simple (sin body):**
```powershell
$url = "https://core-service-stg-697203931362.us-central1.run.app/service/v1/google/conversion/xafra_mfpqcyvr_f9ab4fd209a828dcd1bce8005f660fae/test-$(Get-Date -Format 'yyyyMMddHHmmss')"

Invoke-RestMethod -Uri $url -Method POST -ContentType "application/json"
```

**Test con body completo:**
```powershell
$url = "https://core-service-stg-697203931362.us-central1.run.app/service/v1/google/conversion/xafra_mfpqcyvr_f9ab4fd209a828dcd1bce8005f660fae/test-$(Get-Date -Format 'yyyyMMddHHmmss')"

$body = @{
    msisdn = "51987654321"
    id_product = "PROD-TEST-123"
    campaign = "TestCampaign"
} | ConvertTo-Json

Invoke-RestMethod -Uri $url -Method POST -Body $body -ContentType "application/json"
```

**Respuesta esperada (200 OK):**
```json
{
  "success": true,
  "message": "Conversion registered successfully",
  "data": {
    "conversion_id": 12345,
    "tracking": "test-20251002195424",
    "customer": "XAFRA TECH - CAMPAÑAS DE AFILIACION",
    "country": "pe",
    "operator": "entel",
    "conversion_date": "2025-10-02T19:54:24.000Z",
    "response_time_ms": 145,
    "msisdn": "51987654321",
    "id_product": "PROD-TEST-123",
    "campaign": "TestCampaign"
  }
}
```

---

### ✅ Paso 4: Ejecutar Suite de Tests

```powershell
.\test-google-conversions-post.ps1
```

---

## 🔍 Troubleshooting

### Si sigues obteniendo 404 después del despliegue:

1. **Verifica que el despliegue fue exitoso:**
```powershell
gcloud run services describe core-service-stg --region=us-central1 --format="get(status.latestCreatedRevisionName)"
```

2. **Verifica los logs del servicio:**
```powershell
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=core-service-stg" --limit=50 --format=json
```

3. **Prueba el health check:**
```powershell
Invoke-RestMethod -Uri "https://core-service-stg-697203931362.us-central1.run.app/health"
```

### Si obtienes error 500 después del despliegue:

Probablemente la migración no se aplicó. Verifica con:
```sql
SELECT id_product FROM staging.conversions LIMIT 1;
```

---

## 📊 Checklist de Verificación

Antes de probar el endpoint, asegúrate de:

- [ ] ✅ Migración SQL aplicada (`id_product` es `VARCHAR(255)`)
- [ ] ✅ Código compilado sin errores (`npm run build`)
- [ ] ✅ Despliegue a staging completado (`gcloud builds submit`)
- [ ] ✅ Nuevo revision de Cloud Run activo (verifica en consola)
- [ ] ✅ Health check responde OK (`/health`)

---

## 🎯 Resumen Ejecutivo

**Problema:** 404 porque el servidor tiene la versión GET, no POST  
**Causa:** Cambios no desplegados  
**Solución:** Aplicar migración + Desplegar a staging  
**Tiempo:** ~10-15 minutos  

**Comandos en orden:**
1. Aplicar migración SQL (en Cloud Shell o cliente SQL)
2. `.\deploy-core-service-post.ps1`
3. `.\test-google-conversions-post.ps1`

---

## 📞 Ayuda Adicional

Si necesitas ayuda con algún paso:
- Migración SQL: Revisa `show-migration-sql.ps1`
- Despliegue: Revisa `deploy-core-service-post.ps1`
- Testing: Revisa `test-google-conversions-post.ps1`
- Documentación: `GOOGLE_ADS_CONVERSIONS_API.md`

---

**Última actualización:** 2025-10-02  
**Estado:** Listo para desplegar
