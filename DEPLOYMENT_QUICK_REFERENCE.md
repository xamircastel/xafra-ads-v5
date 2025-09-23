# Xafra-ads v5 - Deployment Quick Reference

## 🚀 Deployment Exitoso - Comandos

```bash
# 1. Deploy cualquier servicio
gcloud builds submit --config=deployment/cloudbuild-[SERVICE-NAME].yaml .

# 2. Verificar deployment
gcloud run services describe [SERVICE-NAME]-stg --region=us-central1

# 3. Ver logs
gcloud beta run revisions logs read $(gcloud run services describe [SERVICE-NAME]-stg --region=us-central1 --format="value(status.traffic[0].revisionName)") --region=us-central1 --limit=15
```

## ⚠️ Problemas Comunes y Soluciones Rápidas

### Error: "@prisma/client did not initialize yet"
**Solución:** Agregar regeneración de Prisma en runtime
```dockerfile
CMD ["sh", "-c", "cd packages/database && npx prisma generate && cd ../../services/[SERVICE] && node dist/index.js"]
```

### Error: "Cannot find module '@xafra/shared'"
**Solución:** Instalar dependencias en orden correcto
```dockerfile
WORKDIR /app
RUN npm ci                              # Root dependencies
WORKDIR /app/services/[SERVICE-NAME]
RUN npm ci && npm run build             # Service dependencies + build
```

### Build exitoso pero container no inicia
**Verificar:**
1. PORT=8080 configurado
2. Health check endpoint funcional
3. Logs de runtime: `gcloud beta run revisions logs read [REVISION] --region=us-central1`

## 📁 Estructura de Archivos

```
deployment/
├── Dockerfile.[service-name]        # Un Dockerfile por servicio
├── cloudbuild-[service-name].yaml   # Cloud Build config
└── [templates]

# ❌ NO usar estos archivos legacy:
❌ Dockerfile.staging
❌ Dockerfile.simple  
❌ cloudbuild-*-stg.yaml (excepto los de deployment/)
```

## ✅ Checklist Pre-Deployment

- [ ] Dockerfile en `deployment/` creado
- [ ] Cloud Build config actualizado
- [ ] Variables de entorno configuradas (NODE_ENV, PORT)
- [ ] Health check endpoint implementado
- [ ] Prisma generation (si aplica)
- [ ] Dependencies order correcto

## 🎯 Resultado Esperado

```
✅ Generated Prisma Client (v5.22.0) to ./../../node_modules/@prisma/client in 401ms
✅ [DATABASE] Connected to database  
✅ [CACHE] Connected to simple cache
✅ [INFO] Core Service started successfully { port: 8080, environment: 'staging' }
```

## 📖 Documentación Completa

Ver: `DEPLOYMENT_TROUBLESHOOTING_GUIDE.md` para análisis detallado y troubleshooting avanzado.

---
**Última actualización:** Septiembre 23, 2025