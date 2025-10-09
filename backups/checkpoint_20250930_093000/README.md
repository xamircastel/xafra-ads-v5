# Checkpoint — 2025-09-30 09:30 UTC

## Resumen ejecutivo
- Los ajustes de secuencia para `production.auth_users.id_auth` están documentados en `scripts/fix-production-auth-users-id.sql` y listos para ejecutar en caso de requerirse.
- El gateway en producción está desplegado con la revisión `gateway-prod-00017-76d`, que restaura el fallback hacia core-service y mantiene el homepage React actualizado.
- Las pruebas de `/ads/tr/random/002AnCnN/` devuelven `302` correcto tras el despliegue. No hay 500s registrados desde la última verificación manual.
- Se cuenta con documentación actualizada en `GITHUB_COMMIT_SUMMARY.md` y guías de despliegue en `cloudbuild-*.yaml`.

## Estado de servicios críticos
| Servicio | Entorno | Revisión / Versión | Notas |
|----------|---------|--------------------|-------|
| Gateway  | Prod    | `gateway-prod-00017-76d` | Routings `/ads/*` reactivados, homepage estático vigente. |
| Core     | Prod    | Última revisión estable (sin cambios recientes) | Sin despliegues posteriores al fix de fallback. |
| Postback | Prod    | Operativo | Fallback a Cloud Run activo, monitoreo básico en curso. |
| Auth     | Prod    | Sin redeploy desde hotfix | Secuencia lista para corrección si se detectan IDs nulos. |

## Actividades recientes
1. Restaurado `@core_service_fallback` en `infrastructure/nginx/conf.d/gateway-routes.conf` y reempaquetado gateway.
2. `gcloud builds submit --config cloudbuild-gateway-prod.yaml` ejecutado; revisión desplegada sin tráfico previo.
3. Validado preview tag (HTTP 302) y luego movido tráfico a `gateway-prod-00017-76d` (100%).
4. Confirmada la respuesta 302 en el dominio público.
5. Documentado resultado en `GITHUB_COMMIT_SUMMARY.md`.

## Próximos pasos sugeridos
- **Monitoreo**: Revisar logs de Cloud Run (`gateway-prod`, `core-prod`) en las próximas 24 h para confirmar ausencia de 500s.
- **DNS / tags**: Retirar tag de previsualización si ya no se necesita (`gcloud run services update-traffic gateway-prod ...`).
- **Seguimiento DB**: Ejecutar el script de secuencia solo si se detectan registros con `id_auth` nulos; registrar hora y usuario si se aplica.
- **Automatización**: Evaluar incluir tests/CI que validen rutas críticas de gateway antes de cada despliegue.

## Cómo retomar fácilmente
1. Clonar o abrir el repo en `c:\Users\XCAST\Desktop\xafra-ads-v5\dev`.
2. Revisar este checkpoint y los logs de `CI_CD_TEST_LOG.md` si hubo nuevos builds.
3. Para trabajar en gateway:
   - `npm install` (si es primera vez en el entorno).
   - `npm run build --workspace=@xafra/gateway-homepage` para validar assets.
   - Actualizar Nginx en `infrastructure/nginx/conf.d/gateway-routes.conf` según sea necesario.
4. Para servicios Node (core/auth/postback):
   - Asegurar `pnpm install` en `packages/*` si se habilitan workspaces (ver `package.json`).
   - Ejecutar pruebas con `npm test` o scripts específicos del servicio.
5. Antes de un deployment:
   - Validar `.env` / secretos con `verify-prisma-config.js` y `check-*` scripts según aplique.
   - Usar los pipelines `cloudbuild-*-prod.yaml` y redirigir tráfico gradualmente.

## Verificaciones rápidas
- `curl -I https://xafra-ads.com/ads/tr/random/002AnCnN/` → `HTTP/2 302` (última ejecución exitosa).
- `gcloud run services describe gateway-prod --format='value(status.traffic)'` → 100% en `gateway-prod-00017-76d`.

## Contactos y notas
- Mantener comunicación con el equipo de tráfico antes de mover tráfico en producción.
- Revisar `DEPLOYMENT_TROUBLESHOOTING_GUIDE.md` ante incidencias.
- Último responsable: GitHub Copilot (asistencia automatizada).