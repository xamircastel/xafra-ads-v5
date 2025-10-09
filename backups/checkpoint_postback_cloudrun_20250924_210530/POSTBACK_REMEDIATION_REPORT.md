# 🧩 Postback Remediation Report
## Core Service Production – DNS Fallback + Runtime Fix

---
**Fecha de Inicio:** 24/09/2025 18:40 UTC  
**Fecha de Cierre:** 24/09/2025 21:00 UTC  
**Responsable:** Equipo DevOps + Backend Core  
**Estado:** Cerrado ✅

---

## 1. Contexto
- Los postbacks hacia Level23 se reportaban como fallidos (`status = 2`).
- Cloud Logging mostraba errores de resolución DNS contra `postback.xafra-ads.com`.
- La revisión activa del core-service incluía un preload `tsconfig-paths/register` que fallaba al iniciar en la nueva imagen minimalista.

---

## 2. Línea de Tiempo
| Hora (UTC) | Acción | Resultado |
|------------|--------|-----------|
| 18:40 | Confirmación del fallo de postbacks en Cloud Logging | Errores DNS reiterados (`ENOTFOUND postback.xafra-ads.com`) |
| 18:55 | Discusión con stake-holders → se decide usar fallback directo a Cloud Run | Go/No-Go: ✅ |
| 19:05 | Edición manual de `cloudbuild-core-prod.yaml` para apuntar a la URL directa | `POSTBACK_SERVICE_URL=https://postback-service-prod-697203931362.us-central1.run.app/api/postbacks/send` |
| 19:20 | Reconstrucción de imagen (`postback-fix`) y despliegue → revisión fallida | Error: `Error: Cannot find module 'tsconfig-paths/register'` |
| 19:45 | Refactor del `deployment/Dockerfile.core-service` (remover preload, ejecutar build compilado) | Nueva imagen `postback-fix2` |
| 20:10 | Deploy de la imagen `postback-fix2` → nueva revisión `core-service-prod-postbackfix2` | Revisión arranca sin errores |
| 20:25 | Reasignación de tráfico 100% a `core-service-prod-postbackfix2` | Cutover exitoso |
| 20:40 | Verificación de variables de entorno (describe Cloud Run service) | `POSTBACK_SERVICE_URL` actualizado |
| 21:00 | Inicio de documentación y preparación de checkpoint/backup | Estado cerrado ✅ |

---

## 3. Cambios Realizados
### 3.1 Configuración Cloud Build
- Archivo: `cloudbuild-core-prod.yaml`
- Acción: Actualización de la línea `POSTBACK_SERVICE_URL` con la URL directa de Cloud Run.
- Impacto: Core-service ya no depende de DNS para invocar el postback-service.

### 3.2 Dockerfile de Core Service
- Archivo: `deployment/Dockerfile.core-service`
- Principales ajustes:
  - Eliminar el preload `tsconfig-paths/register` para evitar dependencias dev-only.
  - Ejecutar el build TypeScript y correr `node services/core-service/dist/index.js`.
  - Validación explícita de Prisma Client durante el build.

### 3.3 Cloud Run Deployment
- Servicio: `core-service-prod`
- Revisión: `core-service-prod-postbackfix2`
- Comando aplicado: `gcloud run services update-traffic core-service-prod --to-revisions core-service-prod-postbackfix2=1`

---

## 4. Validaciones Posteriores
- `gcloud run revisions list --service core-service-prod` → revisión `postbackfix2` marcada como `Serving`.
- `gcloud run services describe core-service-prod` → variable `POSTBACK_SERVICE_URL` actualizada.
- `gcloud logging read` → sin errores de bootstrap ni de módulos faltantes.
- Confirmaciones internas pendientes (requieren interacción con Level23 para validar HTTP 200 final).

---

## 5. Riesgos Resueltos
- ❌ DNS externo no confiable → ✅ Uso de URL directa de Cloud Run.
- ❌ Arranque fallido por `tsconfig-paths/register` → ✅ Eliminado del runtime.
- ❌ Revisión previa sin tráfico (postbackfix) → ✅ Retirada, solo `postbackfix2` recibe tráfico.

---

## 6. Seguimiento
- [ ] Reintentar confirmaciones reales para asegurar cierre con proveedor.
- [ ] Evaluar creación de un dominio alterno en Cloud DNS apuntando al servicio una vez estabilizado.
- [ ] Documentar en el runbook de emergencias el procedimiento de fallback DNS.

---

## 7. Material Referenciado
- Dockerfile final: `deployment/Dockerfile.core-service`
- Pipeline: `cloudbuild-core-prod.yaml`
- Revisión actual: `core-service-prod-postbackfix2`
- Variable crítica: `POSTBACK_SERVICE_URL`

---

**Reporte generado como parte del checkpoint `postback_cloudrun_20250924_210530`.**
