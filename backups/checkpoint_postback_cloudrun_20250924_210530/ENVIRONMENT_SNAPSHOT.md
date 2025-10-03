# 🌐 Environment Snapshot — Core/Postback Production
**Checkpoint ID:** postback_cloudrun_20250924_210530  
**Generado:** 24/09/2025 21:05:30 UTC  
**Servicios auditados:** core-service-prod, postback-service-prod

---

## 1. Cloud Run — core-service-prod
- **Revisión activa:** `core-service-prod-postbackfix2`
- **Imagen:** `us-central1-docker.pkg.dev/xafra-ads/xafra-ads/core-service-prod:latest`
- **Tráfico:** 100 % asignado a `core-service-prod-postbackfix2`
- **VPC Connector:** `xafra-vpc-connector`
- **CPU/Memoria:** 2 vCPU / 1 GiB
- **Min Instances:** 1
- **Max Instances:** 10
- **Timeout:** 300 s
- **Puerto expuesto:** 8080

### Variables de entorno relevantes
| Variable | Valor |
|----------|-------|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | `postgresql://postgres:XafraTech2025!@34.28.245.62:5432/xafra-ads?schema=production` |
| `REDIS_URL` | `redis://10.147.230.83:6379` |
| `REDIS_PREFIX` | `production` |
| `ENCRYPTION_KEY` | `prod-256-bit-encryption-key-for-production-environment-secure` |
| `POSTBACK_SERVICE_URL` | `https://postback-service-prod-697203931362.us-central1.run.app/api/postbacks/send` |

> **Notas:**
> - La variable `POSTBACK_SERVICE_URL` se actualizó desde `postback.xafra-ads.com` para eliminar dependencia de DNS.
> - `DATABASE_URL` y `REDIS_URL` apuntan a recursos VPC internos (Cloud SQL y Redis administrado).

---

## 2. Cloud Run — postback-service-prod
*(Sin cambios en este checkpoint; valores referenciales al 24/09/2025)*
- **Revisión activa:** `postback-service-prod-00036-xxx` (ver confirmar en consola si cambia)
- **Imagen:** `us-central1-docker.pkg.dev/xafra-ads/xafra-ads/postback-service-prod:latest`
- **VPC Connector:** `xafra-vpc-connector`
- **Min Instances:** 0
- **Max Instances:** 10
- **Timeout:** 300 s
- **Puerto expuesto:** 8080

### Variables principales (referenciales)
| Variable | Valor |
|----------|-------|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | `postgresql://postgres:XafraTech2025!@34.28.245.62:5432/xafra-ads?schema=production` |
| `REDIS_URL` | `redis://10.147.230.83:6379` |
| `REDIS_PREFIX` | `production:postback` |
| `POSTBACK_AUTH_TOKEN` | `***` (token compartido con core-service) |

> **Pendiente:** Confirmar token vigente y vigilar rotación si se reintenta DNS.

---

## 3. Dependencias Compartidas
- **Cloud SQL (PostgreSQL):** `34.28.245.62` (`xafra-ads` / esquema `production`)
- **Redis (Memorystore):** IP interna `10.147.230.83`, puerto `6379`
- **VPC:** `default` + conector `xafra-vpc-connector`
- **Colas / Webhooks externos:** Level23 (postback destino)

---

## 4. Últimas Comprobaciones
- `gcloud run services describe core-service-prod --region us-central1 --format="value(spec.template.spec.containers[0].env)"`
- `gcloud run services update-traffic core-service-prod --to-revisions core-service-prod-postbackfix2=1`
- `gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=core-service-prod" --limit=20`

Todas las acciones anteriores completadas sin errores reportados.

---

## 5. Observaciones
- El fallback a Cloud Run debe mantenerse hasta que se valide el CNAME original.
- Recomendado programar monitoreo específico para verificar que `POSTBACK_SERVICE_URL` no sea revertido accidentalmente en futuros despliegues.
- Verificar periódicamente que Prisma Client permanezca alineado con la base de datos tras futuras migraciones.

---

**Archivo generado automáticamente como parte del checkpoint postback_cloudrun_20250924_210530.**
