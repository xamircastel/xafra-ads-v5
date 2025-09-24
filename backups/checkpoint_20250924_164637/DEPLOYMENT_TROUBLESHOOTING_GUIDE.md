# Xafra-ads v5 - Guía de Deployment y Troubleshooting

## Resumen Ejecutivo

Este documento detalla los problemas encontrados durante el proceso de deployment del core-service y las soluciones implementadas. El objetivo es servir como referencia para futuros deployments y troubleshooting.

## 📋 Contexto del Problema Original

**Problema Principal:** El endpoint `/api/util/encrypt` generaba nuevos `encrypted_id` en cada llamada en lugar de reutilizar los existentes para IDs que no expiran (`expire_hours = 0`).

**Arquitectura:** Microservicios Node.js/TypeScript en GCP Cloud Run con Prisma ORM y PostgreSQL.

---

## 🚨 Problemas Encontrados y Soluciones

### 1. **PROBLEMA: Arquitectura de Deployment Fragmentada**

#### Síntomas:
- 15+ Dockerfiles redundantes y inconsistentes
- Configuraciones de Cloud Build duplicadas
- Falta de estándares en el proceso de build
- Archivos temporales contaminando el sistema

#### Causa Raíz:
Desarrollo iterativo sin arquitectura unificada de deployment.

#### Solución Implementada:
```bash
# Estructura nueva unificada
deployment/
├── Dockerfile.core-service      # Dockerfile unificado
├── cloudbuild-core-service.yaml # Cloud Build estandarizado
└── [futuros servicios]
```

#### Archivos Clave Creados:
- `deployment/Dockerfile.core-service`
- `deployment/cloudbuild-core-service.yaml`

---

### 2. **PROBLEMA: Errores de TypeScript en Build**

#### Síntomas:
```
error TS2307: Cannot find module '@xafra/shared' or its corresponding type declarations
error TS2307: Cannot find module '@xafra/database' or its corresponding type declarations
```

#### Causa Raíz:
- Dependencias de workspace no instaladas correctamente
- Orden incorrecto de build en Dockerfile

#### Solución Implementada:
```dockerfile
# Secuencia correcta en Dockerfile
WORKDIR /app
RUN npm ci                              # Instalar dependencias root
WORKDIR /app/packages/database
RUN npx prisma generate                 # Generar Prisma Client
WORKDIR /app/services/core-service
RUN npm ci                              # Instalar dependencias del servicio
RUN npm run build                       # Build TypeScript
```

---

### 3. **PROBLEMA CRÍTICO: Prisma Client Runtime Initialization**

#### Síntomas:
```
Error: @prisma/client did not initialize yet. Please run "prisma generate" and try to import it again.
    at new PrismaClient (/app/node_modules/.prisma/client/default.js:43:11)
```

#### Análisis del Problema:
- ✅ **Build-time:** Prisma Client se genera correctamente
- ✅ **Build-time:** Tests de verificación pasan
- ❌ **Runtime:** Prisma Client falla al inicializar

#### Causa Raíz Identificada:
**Discrepancia entre directorios de build-time vs runtime:**
- Build-time: Prisma se genera desde `/app/packages/database`
- Runtime: Aplicación se ejecuta desde `/app/services/core-service`
- Runtime: Prisma Client busca inicialización que no existe en el contexto de ejecución

#### Investigación Realizada:
```bash
# Durante build-time (FUNCIONABA):
WORKDIR /app/packages/database
RUN npx prisma generate  # ✅ Genera en /app/node_modules/@prisma/client

# Durante runtime (FALLABA):
CMD ["npm", "run", "start", "--workspace=core-service"]  # ❌ Ejecuta desde /app pero busca Prisma no inicializado
```

#### Solución Final Implementada:
```dockerfile
# SOLUCIÓN: Regenerar Prisma Client en runtime
CMD ["sh", "-c", "cd packages/database && npx prisma generate && cd ../../services/core-service && node dist/index.js"]
```

**Resultado:**
```
✅ Generated Prisma Client (v5.22.0) to ./../../node_modules/@prisma/client in 401ms
✅ [DATABASE] Connected to database
✅ [CACHE] Connected to simple cache
✅ Core Service started successfully
```

---

## 🔍 Debugging Metodología Aplicada

### Paso 1: Análisis de Logs Sistemático
```bash
# Verificar estado del servicio
gcloud run services describe core-service-stg --region=us-central1

# Analizar logs específicos de revisión
gcloud beta run revisions logs read [REVISION-NAME] --region=us-central1 --limit=20

# Revisar logs de build
gcloud builds log [BUILD-ID]
```

### Paso 2: Debugging en Build-time
```dockerfile
# Agregar verificaciones en Dockerfile
RUN node -e "console.log('Testing Prisma Client...'); const { PrismaClient } = require('@prisma/client'); console.log('✅ Prisma Client available');"

# Debug de paths
RUN echo "=== DEBUGGING PRISMA PATHS ===" && \
    pwd && \
    ls -la node_modules/@prisma/ && \
    node -e "try { const { PrismaClient } = require('@prisma/client'); console.log('✅ Prisma available from /app'); } catch(e) { console.log('❌ Prisma error:', e.message); }"
```

### Paso 3: Análisis de Diferencias Build vs Runtime
- **Build Context:** Multi-stage con workdir variables
- **Runtime Context:** Single workdir con estado persistente
- **Prisma Context:** Generación en build-time vs inicialización en runtime

---

## 📁 Arquitectura de Deployment Final

### Estructura de Archivos:
```
deployment/
├── Dockerfile.core-service          # Dockerfile unificado y optimizado
├── cloudbuild-core-service.yaml     # Cloud Build con 3 pasos (build, push, deploy)
└── [templates para otros servicios]

# Dockerfiles obsoletos removidos:
❌ Dockerfile.core-stg
❌ Dockerfile.simple
❌ Dockerfile.staging
❌ [12+ archivos más]
```

### Dockerfile Final Optimizado:
```dockerfile
FROM node:20-alpine

# Dependencias del sistema
RUN apk add --no-cache openssl ca-certificates curl

# Setup del workspace
WORKDIR /app
COPY package*.json ./
COPY tsconfig*.json ./
COPY packages/ ./packages/
COPY services/core-service/ ./services/core-service/
COPY environments/ ./environments/

# Build process
RUN npm ci
WORKDIR /app/packages/database
RUN npx prisma generate
WORKDIR /app/services/core-service
RUN npm ci && npm run build

# Verificación build-time
RUN node -e "const { PrismaClient } = require('@prisma/client'); console.log('✅ Prisma Client available');"

# Runtime setup
WORKDIR /app
ENV NODE_ENV=staging
ENV PORT=8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8080/health || exit 1
EXPOSE 8080

# SOLUCIÓN CRÍTICA: Regenerar Prisma en runtime
CMD ["sh", "-c", "cd packages/database && npx prisma generate && cd ../../services/core-service && node dist/index.js"]
```

### Cloud Build Configuration:
```yaml
steps:
  # Step 1: Build imagen
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-f', 'deployment/Dockerfile.core-service', '-t', 'us-central1-docker.pkg.dev/xafra-ads/xafra-ads/core-service-stg:latest', '.']

  # Step 2: Push imagen
  - name: 'gcr.io/cloud-builders/docker'
    args: ['push', 'us-central1-docker.pkg.dev/xafra-ads/xafra-ads/core-service-stg:latest']

  # Step 3: Deploy a Cloud Run
  - name: 'gcr.io/cloud-builders/gcloud'
    args: ['run', 'deploy', 'core-service-stg', '--image', 'us-central1-docker.pkg.dev/xafra-ads/xafra-ads/core-service-stg:latest', '--region', 'us-central1', '--platform', 'managed']
```

---

## ⚡ Comandos de Deployment

### Deployment Completo:
```bash
# Desde directorio root del proyecto
gcloud builds submit --config=deployment/cloudbuild-core-service.yaml .
```

### Verificación Post-Deployment:
```bash
# Verificar estado del servicio
gcloud run services describe core-service-stg --region=us-central1

# Ver logs en tiempo real
gcloud beta run revisions logs read $(gcloud run services describe core-service-stg --region=us-central1 --format="value(status.traffic[0].revisionName)") --region=us-central1 --limit=15

# Test del endpoint
curl -X POST "https://core-service-stg-shk2qzic2q-uc.a.run.app/api/util/encrypt" \
  -H "Content-Type: application/json" \
  -d '{"product_id": "TEST123", "expire_hours": 0, "api_key": "xafra_2024_api_key"}'
```

---

## 🎯 Lecciones Aprendidas

### 1. **Prisma en Containers**
- **Problema:** Prisma Client requiere inicialización tanto en build-time como runtime
- **Solución:** Regenerar Prisma Client al inicio del container
- **Aprendizaje:** No asumir que build-time = runtime para herramientas como Prisma

### 2. **Arquitectura de Deployment**
- **Problema:** Fragmentación y archivos temporales
- **Solución:** Estructura unificada bajo `deployment/`
- **Aprendizaje:** Establecer estándares desde el inicio

### 3. **Debugging de Containers**
- **Problema:** Diferencias entre entornos de build y runtime
- **Solución:** Verificaciones sistemáticas en cada etapa
- **Aprendizaje:** Logs estructurados y debugging paso a paso

### 4. **Workspace Management**
- **Problema:** Dependencias complejas entre packages
- **Solución:** Orden específico de instalación y build
- **Aprendizaje:** Documentar secuencias críticas

---

## 🚀 Templates para Futuros Servicios

### Checklist Pre-Deployment:
- [ ] Dockerfile unificado en `deployment/`
- [ ] Cloud Build config creado
- [ ] Dependencias de workspace verificadas
- [ ] Prisma generation verificado (si aplica)
- [ ] Variables de entorno configuradas
- [ ] Health check implementado
- [ ] Logs de debugging removidos

### Template Dockerfile para Microservicios:
```dockerfile
FROM node:20-alpine
WORKDIR /app
RUN apk add --no-cache openssl ca-certificates curl

# Copiar archivos necesarios
COPY package*.json ./
COPY tsconfig*.json ./
COPY packages/ ./packages/
COPY services/[SERVICE-NAME]/ ./services/[SERVICE-NAME]/
COPY environments/ ./environments/

# Build process
RUN npm ci
# [Prisma generation si es necesario]
WORKDIR /app/services/[SERVICE-NAME]
RUN npm ci && npm run build

# Runtime
WORKDIR /app
ENV NODE_ENV=staging
ENV PORT=8080
EXPOSE 8080
CMD ["sh", "-c", "cd services/[SERVICE-NAME] && node dist/index.js"]
```

---

## 📞 Contacto y Mantenimiento

**Documento creado:** Septiembre 23, 2025  
**Última actualización:** Septiembre 23, 2025  
**Revisar:** Cada nueva implementación de microservicio  

**Responsables de mantenimiento:**  
- Actualizaciones de este documento después de cada deployment exitoso
- Validación de templates con nuevos servicios
- Monitoreo de cambios en dependencias (Prisma, Node.js, etc.)

---

## 🔗 Referencias Técnicas

- [GCP Cloud Run Documentation](https://cloud.google.com/run/docs)
- [Prisma Client in Docker](https://www.prisma.io/docs/guides/deployment/deployment-guides/deploying-to-google-cloud-run)
- [Node.js Workspaces](https://docs.npmjs.com/cli/v7/using-npm/workspaces)
- [Docker Multi-stage Builds](https://docs.docker.com/develop/dev-best-practices/dockerfile_best-practices/)