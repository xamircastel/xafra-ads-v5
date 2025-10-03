# 🛠️ Informe de despliegue – 27 de septiembre de 2025

Este documento resume los incidentes detectados durante los despliegues recientes a producción y las acciones correctivas aplicadas. Su objetivo es servir como guía de referencia rápida para futuros despliegues de los servicios **postback-service** y **core-service**.

---

## 📋 Resumen ejecutivo

- **Postback Service**: El contenedor fallaba en Cloud Run porque reconstruía workspaces en runtime y usaba un healthcheck incorrecto. Se corrigió el `Dockerfile`, se regeneró la imagen (`20250927124354`) y se validó el servicio en producción.
- **Core Service**: La revisión `core-service-prod-00018-b95` no levantaba en Cloud Run. Se restauró el tráfico a la revisión estable `core-service-prod-00012-b6b`.

---

## 1. Postback Service – contenedor no iniciaba en Cloud Run

| Aspecto | Detalle |
|---------|---------|
| **Síntoma** | Revisión `postback-service-prod-00007-5z5` fallaba con `MODULE_NOT_FOUND`/`npm run build` durante el arranque. Cloud Run marcaba la revisión como no lista.
| **Causa raíz** | El `CMD` del contenedor ejecutaba `npm run build` y reconstruía `@xafra/shared` en runtime sin dependencias instaladas.
| **Corrección** | Actualizamos `deployment/Dockerfile.postback-service` para compilar únicamente `@xafra/postback-service` en build-time y dejar el `CMD` en `npx prisma generate && node services/postback-service/dist/index.js`.
| **Archivos** | `deployment/Dockerfile.postback-service`, `services/postback-service/tsconfig.json` (rootDir = `./src`).

### Pasos aplicados

```bash
# Build local para validar
docker build -t postback-service-test -f deployment/Dockerfile.postback-service .

# Redis temporal y smoke test
docker network create postback-test
docker run -d --rm --name postback-redis --network postback-test redis:7-alpine
docker run -d --rm --name postback-service-test-run --network postback-test \
  -p 8080:8080 -e REDIS_URL=redis://postback-redis:6379 postback-service-test
curl http://localhost:8080/api/health
```

### Validaciones

- Healthcheck local respondió `status: healthy` con Redis conectado.
- En Cloud Run, la revisión `postback-service-prod-00008-bn9` quedó sirviendo el 100 % del tráfico.

---

## 2. Postback Service – Health check incorrecto

| Aspecto | Detalle |
|---------|---------|
| **Síntoma** | Los contenedores marcaban `/health` con 404 porque el servicio expone `/api/health`.
| **Corrección** | Ajustamos el `HEALTHCHECK` en `deployment/Dockerfile.postback-service` para usar `curl -f http://localhost:8080/api/health`.
| **Verificación** | `docker logs` mostró `GET /api/health - 200`, y `curl` en producción devolvió JSON saludable.

---

## 3. Postback Service – Error al desplegar (`reserved env names`)

| Aspecto | Detalle |
|---------|---------|
| **Síntoma** | `gcloud run deploy` falló con `spec.template.spec.containers[0].env: ... reserved env names were provided: PORT`.
| **Causa** | Se intentó fijar la variable `PORT`, pero Cloud Run la gestiona automáticamente.
| **Corrección** | Reejecutamos el despliegue omitiendo `PORT` en `--set-env-vars`.

```bash
gcloud run deploy postback-service-prod \
  --image us-central1-docker.pkg.dev/xafra-ads/xafra-ads/postback-service-prod:20250927124354 \
  --region us-central1 --platform managed --allow-unauthenticated \
  --port 8080 --memory 1Gi --cpu 2 --min-instances 1 --max-instances 10 \
  --timeout 300 --concurrency 160 \
  --set-env-vars 'NODE_ENV=production,DATABASE_URL=postgresql://postgres:XafraTech2025!@34.28.245.62:5432/xafra-ads?schema=production,REDIS_URL=redis://10.147.230.83:6379,REDIS_PREFIX=production,ENCRYPTION_KEY=prod-256-bit-encryption-key-for-production-environment-secure,POSTBACK_SERVICE_URL=https://postback.xafra-ads.com/api/postbacks/send' \
  --vpc-connector xafra-vpc-connector --vpc-egress private-ranges-only
```

---

## 4. Core Service – Revisión fallida y rollback

| Aspecto | Detalle |
|---------|---------|
| **Síntoma** | La revisión `core-service-prod-00018-b95` quedó inactiva con el mensaje `failed to start and listen on the port provided by the PORT=8080 environment variable`.
| **Acción inmediata** | Se restableció el tráfico a la última revisión estable `core-service-prod-00012-b6b`.
| **Comando usado** | `gcloud run services update-traffic core-service-prod --region us-central1 --to-revisions core-service-prod-00012-b6b=100`
| **Verificación** | `curl https://core-service-prod-697203931362.us-central1.run.app/health` → `status": "ok"`.

---

## ✅ Resultado final

- **postback-service-prod** ejecutándose con la imagen `20250927124354` y healthcheck correcto.
- **core-service-prod** sirviendo tráfico desde la revisión estable `00012-b6b`.
- Documentados los comandos y ajustes clave para reproducir el proceso.

---

## 📌 Recomendaciones futuras

1. **Evitar builds en runtime**: Asegurar que cada Dockerfile compile únicamente durante la fase de build.
2. **Healthchecks alineados**: Validar rutas reales antes de desplegar.
3. **Verificar variables reservadas**: Revisar la lista de env vars restringidas de Cloud Run.
4. **Mantener revisiones estables etiquetadas**: Considerar etiquetas (`--tag`) opcionales como `stable` para facilitar rollbacks.

---

_Última actualización: 2025-09-27 22:20 UTC_
