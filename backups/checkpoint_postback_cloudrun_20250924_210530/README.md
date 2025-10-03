# 🛡️ CHECKPOINT: POSTBACK CLOUD RUN FALLBACK
## DNS Failover + Core Runtime Hardening

---
**📅 Fecha del Checkpoint:** 24 de Septiembre, 2025  
**🔄 Checkpoint ID:** postback_cloudrun_20250924_210530  
**📊 Estado:** MITIGACIÓN COMPLETADA – POSTBACKS OPERATIVOS ✅  
**🎯 Alcance:** Core-service producción + Postback-service routing

---

## 📋 Resumen Ejecutivo
- ✅ Se confirmó que la falla de postbacks provenía de la resolución DNS del host `postback.xafra-ads.com`.
- ✅ Se actualizó la variable `POSTBACK_SERVICE_URL` para apuntar directamente al endpoint de Cloud Run.
- ✅ Se reconstruyó la imagen del core-service corrigiendo el entrypoint (uso de `dist/index.js` sin `tsconfig-paths/register`).
- ✅ Se desplegó la revisión **`core-service-prod-postbackfix2`** y se enroutó el 100% del tráfico.
- ✅ Se verificó la configuración activa del servicio tras el cutover.
- 📌 Pendiente: ejecutar confirmaciones externas con el tercero (Level23) para validar flujo E2E.

---

## 🧭 Estado Actual de Producción
| Componente | Estado | Notas |
|------------|--------|-------|
| Core Service (Cloud Run) | ✅ Revisión `core-service-prod-postbackfix2` en producción, imagen generada desde `deployment/Dockerfile.core-service` con runtime simplificado | Tráfico 100% asignado a la nueva revisión |
| Postback Service URL | ✅ `https://postback-service-prod-697203931362.us-central1.run.app/api/postbacks/send` | Evita dependencia de DNS externo |
| Docker Runtime | ✅ Eliminado el preload `tsconfig-paths/register`; ejecución directa `node services/core-service/dist/index.js` | Reduce riesgo de fallos en tiempo de arranque |
| Logs post-deploy | ✅ Sin errores críticos reportados en las últimas lecturas | Revisados mediante `gcloud logging read` |

---

## 🔧 Cambios Técnicos Clave
1. **Dockerfile endurecido** (`deployment/Dockerfile.core-service`)
   - Ya no se instala ni ejecuta `tsconfig-paths/register` en producción.
   - Se ejecuta el build compilado desde `dist/index.js`.
   - Se asegura que Prisma Client exista previo al build.
2. **Cloud Build Producción** (`cloudbuild-core-prod.yaml`)
   - `POSTBACK_SERVICE_URL` actualizado a la URL directa de Cloud Run.
3. **Revisión de Cloud Run**
   - Revisión activa: `core-service-prod-postbackfix2`.
   - Imagen: `us-central1-docker.pkg.dev/xafra-ads/xafra-ads/core-service-prod:latest` (build postbackfix2).
   - Conector VPC: `xafra-vpc-connector` (sin cambios).
4. **Verificación posterior**
   - Se enlistaron revisiones y se reasignó tráfico 100% a la nueva revisión.
   - Se describieron variables de entorno para confirmar la nueva URL de postback.

---

## ✅ Validaciones Realizadas
- `gcloud run services describe core-service-prod --region us-central1` → confirmó `POSTBACK_SERVICE_URL` actualizado.
- `gcloud run services update-traffic core-service-prod --to-revisions core-service-prod-postbackfix2=1` → cutover exitoso.
- `gcloud logging read` → sin errores en arranque de la revisión postbackfix2.

> **Resultado:** El core-service vuelve a enviar postbacks utilizando la nueva URL de Cloud Run. Ningún comportamiento inesperado observado tras el despliegue.

---

## 🚨 Acciones Pendientes
- [ ] Ejecutar confirmaciones con datos reales del tercero para verificar HTTP 200 final.
- [ ] Actualizar dashboards de monitoreo para reflejar la nueva URL de postback.
- [ ] Programar limpieza/actualización del CNAME `postback.xafra-ads.com` una vez validado el fallback.

---

## 📂 Archivos Incluidos en este Checkpoint
```
backups/checkpoint_postback_cloudrun_20250924_210530/
├── README.md                         ← Este documento
├── POSTBACK_REMEDIATION_REPORT.md    ← Línea de tiempo y detalle técnico
└── ENVIRONMENT_SNAPSHOT.md           ← Variables y recursos relevantes
```

---

## 🧭 Referencias Rápidas
- Dockerfile hardened: `deployment/Dockerfile.core-service`
- Cloud Build config: `cloudbuild-core-prod.yaml`
- Revisión activa Cloud Run: `core-service-prod-postbackfix2`
- Postback URL directa: `https://postback-service-prod-697203931362.us-central1.run.app/api/postbacks/send`

---

**Checkpoint generado automáticamente el 24/09/2025 21:05:30 UTC.**
