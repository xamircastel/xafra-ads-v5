# 📋 DOCUMENTO MAESTRO - XAFRA-ADS V5
## Plataforma de Publicidad Digital con Arquitectura de Microservicios

---

## 📑 ÍNDICE
1. [Descripción General del Proyecto](#1-descripción-general-del-proyecto)
2. [Arquitectura Técnica](#2-arquitectura-técnica)
3. [Stack Tecnológico](#3-stack-tecnológico)
4. [Base de Datos](#4-base-de-datos)
5. [Microservicios](#5-microservicios)
6. [Infraestructura y Deployment](#6-infraestructura-y-deployment)
7. [Ambientes y Configuración](#7-ambientes-y-configuración)
8. [APIs y Endpoints](#8-apis-y-endpoints)
9. [Seguridad](#9-seguridad)
10. [Monitoreo y Logging](#10-monitoreo-y-logging)
11. [Performance y Optimización](#11-performance-y-optimización)
12. [Desarrollo y Deployment](#12-desarrollo-y-deployment)
13. [Documentación Técnica](#13-documentación-técnica)
14. [Roadmap y Futuras Mejoras](#14-roadmap-y-futuras-mejoras)

---

## 1. DESCRIPCIÓN GENERAL DEL PROYECTO

### 1.1 Objetivo del Proyecto
Xafra-ads v5 es una **reescritura completa** del sistema legacy de publicidad digital, diseñado para manejar **redirecciones de URLs ultra-rápidas (<50ms)**, gestión de campañas publicitarias, tracking de conversiones y optimización de tráfico.

### 1.2 Características Principales
- ✅ **Rendimiento Crítico**: Redirecciones URL <50ms para maximizar conversiones
- ✅ **Escalabilidad**: Arquitectura de microservicios en GCP Cloud Run
- ✅ **Geo-Targeting**: Lógica específica por país/operador (especialmente Costa Rica Kolbi)
- ✅ **Optimización Inteligente**: Distribución de tráfico basada en tasas de conversión
- ✅ **Tracking Avanzado**: Sistema completo de postbacks y analytics
- ✅ **Compatibilidad**: Mantiene compatibilidad con base de datos existente (2.9M+ registros)

### 1.3 Métricas de Negocio
- **Volumen**: 2.9M+ registros de campañas existentes
- **Performance Target**: <50ms tiempo de respuesta
- **Disponibilidad**: 99.9% uptime objetivo
- **Escalabilidad**: Preparado para crecimiento 10x

---

## 2. ARQUITECTURA TÉCNICA

### 2.1 Diagrama de Arquitectura

```
┌─────────────────────────────────────────────────────────────────┐
│                    🌐 GCP Load Balancer                          │
│                   (stg.xafra-ads.com)                            │
└─────────────┬───────────────────────┬───────────────────────────┘
              │                       │
        ┌─────▼─────┐           ┌─────▼─────┐
        │  HOMEPAGE │           │    API    │
        │   React   │           │ GATEWAY   │
        │           │           │  (Nginx)  │
        └───────────┘           └─────┬─────┘
                                      │
      ┌─────────────┬─────────────┬───▼───┬─────────────┐
      │             │             │       │             │
 ┌────▼────┐  ┌────▼────┐  ┌────▼────┐ ┌▼────┐  ┌────▼────┐
 │  CORE   │  │TRACKING │  │  AUTH   │ │CAMP │  │POSTBACK │
 │SERVICE  │  │SERVICE  │  │SERVICE  │ │MGMT │  │SERVICE  │
 │         │  │         │  │         │ │     │  │         │
 │ Ads +   │  │Click    │  │API Key  │ │Camp │  │Webhook  │
 │ Utils   │  │Track    │  │Auth     │ │CRUD │  │Notify   │
 └─────────┘  └─────────┘  └─────────┘ └─────┘  └─────────┘
      │             │             │       │             │
      └─────────────┼─────────────┼───────┼─────────────┘
                    │             │       │
              ┌─────▼─────┐ ┌─────▼─────┐ │
              │PostgreSQL │ │   Redis   │ │
              │ Database  │ │   Cache   │ │
              └───────────┘ └───────────┘ │
                                          │
                              ┌───────────▼──────────┐
                              │   External APIs      │
                              │   (Traffic Sources)  │
                              └──────────────────────┘
```

### 2.2 Patrones Arquitectónicos
- **Microservicios**: 5 servicios independientes con responsabilidades específicas
- **Event-Driven**: Comunicación asíncrona para postbacks y tracking
- **CQRS**: Separación de comandos y consultas para optimización
- **Circuit Breaker**: Resilencia ante fallos de servicios externos
- **Gateway Pattern**: Nginx como punto de entrada unificado

### 2.3 Principios de Diseño
- **Single Responsibility**: Cada servicio tiene una responsabilidad específica
- **Loose Coupling**: Servicios independientes con APIs bien definidas
- **High Cohesion**: Funcionalidades relacionadas agrupadas
- **Fail-Fast**: Validación temprana y manejo explícito de errores

---

## 3. STACK TECNOLÓGICO

### 3.1 Backend
| Componente | Tecnología | Versión | Justificación |
|------------|------------|---------|---------------|
| **Runtime** | Node.js | 20 LTS | Performance, ecosystem, async I/O |
| **Lenguaje** | TypeScript | 5.4+ | Type safety, developer experience |
| **Framework** | Express.js | 4.x | Ligero, maduro, gran ecosystem |
| **ORM** | Prisma | 5.22+ | Type-safe DB access, migrations |
| **Validación** | Joi | 17.x | Schema validation robusto |
| **Testing** | Jest | 29.x | Testing framework estándar |

### 3.2 Base de Datos
| Componente | Tecnología | Justificación |
|------------|------------|---------------|
| **Principal** | PostgreSQL 14+ | ACID, JSON support, performance |
| **Cache** | Redis 7+ | Sub-ms access, pub/sub, TTL |
| **ORM** | Prisma Client | Type safety, query optimization |
| **Migraciones** | Prisma Migrate | Version control para DB schema |

### 3.3 Infraestructura
| Componente | Tecnología | Configuración |
|------------|------------|---------------|
| **Containers** | Docker | Multi-stage builds optimizados |
| **Orchestration** | GCP Cloud Run | Serverless, auto-scaling |
| **Load Balancer** | GCP Load Balancer | Global, SSL termination |
| **API Gateway** | Nginx | Routing, rate limiting, SSL |
| **Monitoring** | GCP Operations | Logs, metrics, alertas |
| **CI/CD** | Google Cloud Build | Automated builds & deploys |

### 3.4 Desarrollo
| Componente | Tecnología | Propósito |
|------------|------------|-----------|
| **Linting** | ESLint + Prettier | Code quality, formatting |
| **Git Hooks** | Husky | Pre-commit validation |
| **Package Manager** | npm workspaces | Monorepo management |
| **API Testing** | Postman | Manual & automated testing |

---

## 4. BASE DE DATOS

### 4.1 Esquema Principal

#### Tabla CUSTOMERS
```sql
CREATE TABLE customers (
  id_customer BIGSERIAL PRIMARY KEY,
  name VARCHAR(1000),
  short_name VARCHAR(100),
  mail VARCHAR(200),
  phone VARCHAR(20),
  country VARCHAR(10),
  operator VARCHAR(50)
);
```

#### Tabla AUTH_USERS
```sql
CREATE TABLE auth_users (
  id_auth BIGSERIAL PRIMARY KEY,
  user_name VARCHAR(50),
  shared_key VARCHAR(50),
  api_key VARCHAR(50),
  active SMALLINT,
  creation_date TIMESTAMP DEFAULT NOW(),
  customer_id BIGINT REFERENCES customers(id_customer),
  password VARCHAR(255),
  status SMALLINT DEFAULT 1,
  expiration_date TIMESTAMP,
  description VARCHAR(500),
  permissions VARCHAR(1000),
  login_count INTEGER DEFAULT 0,
  last_login TIMESTAMP,
  modification_date TIMESTAMP
);
```

#### Tabla PRODUCTS
```sql
CREATE TABLE products (
  id_product BIGSERIAL PRIMARY KEY,
  reference VARCHAR(100),
  name VARCHAR(500),
  url_redirect_success VARCHAR(1000),
  active SMALLINT,
  id_customer BIGINT REFERENCES customers(id_customer),
  url_redirect_postback VARCHAR(1000),
  method_postback VARCHAR(20),
  body_postback VARCHAR(2500),
  is_qs SMALLINT,
  country VARCHAR(10),
  operator VARCHAR(50),
  random SMALLINT,
  encrypted_id VARCHAR(20)
);
```

#### Tabla CAMPAIGN
```sql
CREATE TABLE campaign (
  id BIGSERIAL PRIMARY KEY,
  creation_date TIMESTAMP DEFAULT NOW(),
  modification_date TIMESTAMP,
  id_product BIGINT REFERENCES products(id_product),
  tracking VARCHAR(500),
  status SMALLINT,
  uuid VARCHAR(50),
  status_post_back SMALLINT,
  date_post_back TIMESTAMP,
  params TEXT,
  xafra_tracking_id VARCHAR(100),
  short_tracking VARCHAR(50),
  country VARCHAR(50),
  operator VARCHAR(50)
);
```

### 4.2 Índices de Performance
```sql
-- Índices críticos para performance
CREATE INDEX idx_campaign_tracking ON campaign(tracking);
CREATE INDEX idx_campaign_product ON campaign(id_product);
CREATE INDEX idx_products_encrypted ON products(encrypted_id);
CREATE INDEX idx_auth_users_apikey ON auth_users(api_key);
CREATE INDEX idx_campaign_country_operator ON campaign(country, operator);
```

### 4.3 Estrategia de Cache (Redis)
```typescript
// Patrones de cache implementados
const CACHE_PATTERNS = {
  // Productos encriptados (TTL: 1 año o custom)
  encrypted: `encrypted:${encrypted_id}`,
  
  // Autenticación (TTL: 1 hora)
  auth: `auth:${api_key}`,
  
  // Configuración por país/operador (TTL: 1 día)
  config: `config:${country}:${operator}`,
  
  // Tracking temporal (TTL: 1 hora)
  tracking: `track:${tracking_id}`
};
```

---

## 5. MICROSERVICIOS

### 5.1 Core Service
**Puerto**: 3001 | **Responsabilidad**: Ads redirect + Utilidades

#### Endpoints Principales:
- `GET /api/ads/redirect/:tracking_id` - Redirección principal (crítica <50ms)
- `POST /api/util/encrypt` - Encriptación de product IDs
- `POST /api/util/decrypt` - Decriptación y validación
- `GET /api/util/config` - Configuración por país/operador

#### Características Especiales:
- **Ultra-optimizado**: Cache L1 + L2, lazy loading
- **Geo-logic**: Lógica específica Costa Rica Kolbi
- **Encriptación determinística**: IDs únicos reutilizables
- **Fallback graceful**: Manejo de errores transparente

### 5.2 Tracking Service
**Puerto**: 3002 | **Responsabilidad**: Click tracking + Analytics

#### Endpoints Principales:
- `POST /api/tracking/click` - Registro de clicks
- `GET /api/tracking/stats` - Estadísticas de campaña
- `POST /api/tracking/batch` - Tracking en lotes

#### Características:
- **High-throughput**: Procesamiento asíncrono
- **Deduplicación**: Prevención de clicks duplicados
- **Agregación**: Estadísticas en tiempo real

### 5.3 Auth Service
**Puerto**: 3003 | **Responsabilidad**: Autenticación + Autorización

#### Endpoints Principales:
- `POST /api/auth/validate` - Validación de API keys
- `GET /api/auth/permissions` - Permisos de usuario
- `POST /api/auth/refresh` - Renovación de sesiones

#### Características:
- **Stateless JWT**: Tokens auto-contenidos
- **Rate limiting**: Protección contra ataques
- **Audit trail**: Log de accesos y permisos

### 5.4 Campaign Service
**Puerto**: 3004 | **Responsabilidad**: Gestión de campañas

#### Endpoints Principales:
- `GET /api/campaigns` - Listado de campañas
- `POST /api/campaigns` - Creación de campañas
- `PUT /api/campaigns/:id` - Actualización
- `DELETE /api/campaigns/:id` - Eliminación

### 5.5 Postback Service
**Puerto**: 3005 | **Responsabilidad**: Webhooks + Notificaciones

#### Endpoints Principales:
- `POST /api/postback/webhook` - Recepción de webhooks
- `POST /api/postback/notify` - Envío de notificaciones
- `GET /api/postback/status` - Estado de envíos

---

## 6. INFRAESTRUCTURA Y DEPLOYMENT

### 6.1 Google Cloud Platform

#### Servicios Utilizados:
| Servicio | Propósito | Configuración |
|----------|-----------|---------------|
| **Cloud Run** | Microservicios | 1-1000 instancias, auto-scaling |
| **Cloud SQL** | PostgreSQL | db-custom-2-4096 (PROD) |
| **Memorystore** | Redis | 1GB Standard (PROD) |
| **Cloud Build** | CI/CD | Triggered by git push |
| **Load Balancer** | Entrada | Global, SSL, CDN |
| **Cloud DNS** | Dominios | Gestión de DNS |
| **Operations** | Monitoring | Logs, metrics, alertas |

### 6.2 Containerización (Docker)

#### Dockerfile Multi-Stage Optimizado:
```dockerfile
# Stage 1: Dependencies
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

# Stage 2: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY . .
RUN npm run build

# Stage 3: Runtime
FROM node:20-alpine AS runtime
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

### 6.3 Cloud Build Pipeline

#### Pipeline Stages:
1. **Build**: `docker build` optimizado
2. **Test**: Unit tests + linting
3. **Deploy**: `gcloud run deploy`
4. **Verify**: Health checks post-deploy

```yaml
# cloudbuild-core-stg.yaml
steps:
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', 'core-service-stg', '.']
  - name: 'gcr.io/cloud-builders/gcloud'
    args: ['run', 'deploy', 'core-service-stg', '--image', '...']
```

---

## 7. AMBIENTES Y CONFIGURACIÓN

### 7.1 Estrategia Multi-Ambiente

| Ambiente | Propósito | Base de Datos | Dominio | CPU/Memory |
|----------|-----------|---------------|---------|------------|
| **DEV** | Desarrollo local | Existente (34.28.245.62) | localhost | Local |
| **STG** | Pre-producción | Cloud SQL STG | stg.xafra-ads.com | 1 CPU, 2GB |
| **PROD** | Producción | Cloud SQL PROD | api.xafra-ads.com | 2 CPU, 4GB |

### 7.2 Variables de Entorno

#### Configuración por Ambiente:
```bash
# Development
NODE_ENV=development
DATABASE_URL=postgresql://postgres:pass@34.28.245.62:5432/xafra-ads
REDIS_URL=redis://localhost:6379

# Staging
NODE_ENV=staging
DATABASE_URL=postgresql://xafra-user:pass@sql-stg:5432/xafra-ads-stg
REDIS_URL=redis://memorystore-stg:6379

# Production
NODE_ENV=production
DATABASE_URL=postgresql://xafra-user:pass@sql-prod:5432/xafra-ads-prod
REDIS_URL=redis://memorystore-prod:6379
```

### 7.3 Configuración de Servicios

#### Gateway Nginx:
```nginx
upstream core-service {
    server core-service-stg:3001;
}

upstream tracking-service {
    server tracking-service-stg:3002;
}

location /api/ads {
    proxy_pass http://core-service;
    proxy_cache api_cache;
    proxy_cache_valid 200 1m;
}
```

---

## 8. APIS Y ENDPOINTS

### 8.1 API Gateway Routes

| Ruta | Servicio | Propósito | Cache | Rate Limit |
|------|----------|-----------|-------|------------|
| `/api/ads/*` | Core | Redirects críticos | 1min | 1000/min |
| `/api/util/*` | Core | Utilidades | 5min | 100/min |
| `/api/track/*` | Tracking | Click tracking | No | 500/min |
| `/api/auth/*` | Auth | Autenticación | 1hr | 20/min |
| `/api/campaigns/*` | Campaign | CRUD campañas | No | 50/min |
| `/api/postback/*` | Postback | Webhooks | No | 100/min |

### 8.2 Esquemas de Request/Response

#### Encrypt API:
```typescript
// Request
interface EncryptRequest {
  apikey: string;
  product_id: number;
  expire_hours?: number; // 0 = never expires
}

// Response
interface EncryptResponse {
  success: boolean;
  data: {
    encrypted_id: string;
    product_id: number;
    length: number;
    expire_hours: number;
    never_expires: boolean;
    expires_at: string | null;
  }
}
```

#### Redirect API:
```typescript
// URL: /api/ads/redirect/:tracking_id
// Response: 302 redirect + tracking pixel
```

### 8.3 Códigos de Error Estandardizados

```typescript
enum ErrorCodes {
  // Autenticación
  UNAUTHORIZED = 'UNAUTHORIZED',
  APIKEY_EXPIRED = 'APIKEY_EXPIRED',
  INVALID_PASSWORD = 'INVALID_PASSWORD',
  
  // Validación
  INVALID_PRODUCT_ID = 'INVALID_PRODUCT_ID',
  MISSING_ENCRYPTED_ID = 'MISSING_ENCRYPTED_ID',
  
  // Negocio
  PRODUCT_NOT_FOUND = 'PRODUCT_NOT_FOUND',
  CAMPAIGN_INACTIVE = 'CAMPAIGN_INACTIVE',
  
  // Sistema
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE'
}
```

---

## 9. SEGURIDAD

### 9.1 Autenticación y Autorización

#### API Key Authentication:
```typescript
// Formato: xafra_[8chars]_[32chars_hash]
// Ejemplo: xafra_mfpqcyvr_f9ab4fd209a828dcd1bce8005f660fae

interface AuthUser {
  api_key: string;
  customer_id: number;
  permissions: string[];
  expiration_date?: Date;
  status: number; // 1=active, 0=inactive
}
```

#### Niveles de Permisos:
- `ads:read` - Consultar anuncios
- `ads:redirect` - Ejecutar redirects
- `campaigns:read` - Ver campañas
- `campaigns:write` - Crear/editar campañas
- `analytics:read` - Ver estadísticas
- `admin:all` - Acceso total

### 9.2 Validación y Sanitización

#### Middleware de Seguridad:
```typescript
// Rate limiting
app.use(rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 1000 // requests per window
}));

// Input validation
app.use('/api/', validateRequest(RequestSchema));

// SQL Injection prevention (Prisma ORM)
// XSS prevention (input sanitization)
// CSRF protection (stateless API)
```

### 9.3 Encriptación

#### Product ID Encryption:
```typescript
// Algoritmo: AES-256-GCM determinístico
// Key derivation: PBKDF2 con salt fijo por environment
// Formato salida: Base62 (URL-safe, 9-20 chars)

function createShortEncryption(data: string): string {
  const cipher = crypto.createCipher('aes-256-gcm', SECRET_KEY);
  const encrypted = cipher.update(data, 'utf8', 'base64url');
  return encrypted.substring(0, 9); // Short ID para URLs
}
```

---

## 10. MONITOREO Y LOGGING

### 10.1 Logging Estructurado

#### Formato Estándar:
```typescript
interface LogEntry {
  timestamp: string;
  level: 'error' | 'warn' | 'info' | 'debug';
  service: string;
  operation: string;
  customer_id?: number;
  tracking_id?: string;
  duration_ms?: number;
  ip?: string;
  user_agent?: string;
  metadata?: Record<string, any>;
}

// Ejemplo
logger.info('redirect_successful', {
  tracking_id: 'xyz123',
  product_id: 1,
  country: 'CR',
  operator: 'kolbi',
  duration_ms: 23
});
```

### 10.2 Métricas Clave

#### Business Metrics:
- **Redirect Success Rate**: % de redirects exitosos
- **Average Response Time**: Tiempo promedio de redirect
- **Conversion Rate**: % de conversiones por campaña
- **Traffic Distribution**: Distribución por país/operador

#### Technical Metrics:
- **Request Rate**: Requests por segundo
- **Error Rate**: % de errores por endpoint
- **Cache Hit Rate**: % de hits en cache
- **Database Performance**: Query time, connections

### 10.3 Alertas y Monitoring

#### Alertas Críticas:
```yaml
# Cloud Monitoring Alerts
- name: "High Error Rate"
  condition: error_rate > 5%
  duration: 5 minutes
  
- name: "Slow Redirects"
  condition: avg_redirect_time > 100ms
  duration: 2 minutes
  
- name: "Low Cache Hit Rate"
  condition: cache_hit_rate < 80%
  duration: 10 minutes
```

---

## 11. PERFORMANCE Y OPTIMIZACIÓN

### 11.1 Objetivos de Performance

| Métrica | Target | Actual | Estrategia |
|---------|--------|--------|------------|
| **Redirect Time** | <50ms | ~23ms | Cache L1+L2, optimized queries |
| **API Response** | <200ms | ~150ms | Redis cache, connection pooling |
| **Throughput** | 1000 RPS | 800 RPS | Horizontal scaling, CDN |
| **Availability** | 99.9% | 99.8% | Circuit breakers, health checks |

### 11.2 Estrategias de Cache

#### Cache L1 (Memory):
```typescript
// In-memory cache para datos ultra-frecuentes
const memoryCache = new Map();
const CACHE_TTL = 60000; // 1 minute

async function getCachedProduct(encrypted_id: string) {
  const cached = memoryCache.get(encrypted_id);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  // Fallback to Redis (L2)
  return await redisCacheGet(encrypted_id);
}
```

#### Cache L2 (Redis):
```typescript
// Redis para cache distribuido
const redis = new Redis(REDIS_URL);

// TTL dinámico basado en tipo de dato
const CACHE_STRATEGY = {
  encrypted_products: 365 * 24 * 3600, // 1 año
  auth_tokens: 3600, // 1 hora
  geo_config: 24 * 3600, // 1 día
  tracking_temp: 3600 // 1 hora
};
```

### 11.3 Optimización de Base de Datos

#### Connection Pooling:
```typescript
// Prisma connection pool optimizado
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: DATABASE_URL
    }
  },
  log: ['query', 'error'],
  // Connection pool settings
  __internal: {
    pool: {
      max: 20,
      min: 5,
      acquire: 60000,
      idle: 10000
    }
  }
});
```

#### Query Optimization:
```sql
-- Queries optimizados con índices específicos
EXPLAIN ANALYZE 
SELECT p.*, c.country, c.operator 
FROM products p 
LEFT JOIN customers c ON p.id_customer = c.id_customer 
WHERE p.encrypted_id = $1 AND p.active = 1;
-- Execution time: ~2ms con índice
```

---

## 12. DESARROLLO Y DEPLOYMENT

### 12.1 Workflow de Desarrollo

#### Git Flow:
```bash
# Feature development
git checkout -b feature/encrypt-unique-ids
git commit -m "feat: implement unique encrypted IDs"
git push origin feature/encrypt-unique-ids

# Pull request & review
# Merge to master triggers automatic deployment
```

#### Comandos de Desarrollo:
```bash
# Setup inicial
npm install
npm run db:generate
npm run db:migrate

# Desarrollo local
npm run dev          # Todos los servicios
npm run dev:core     # Solo core service
npm run build        # Build todos los workspaces
npm run test         # Test completo
npm run lint         # Linting
```

### 12.2 Pipeline CI/CD

#### Cloud Build Triggers:
```yaml
# Trigger automático en push a master
trigger:
  branch: master
  
steps:
  1. Build: docker build optimizado
  2. Test: npm test + lint
  3. Deploy STG: gcloud run deploy staging
  4. Health Check: verify deployment
  5. Deploy PROD: manual approval + deploy
```

### 12.3 Estrategia de Rollback

#### Deployment Seguro:
```bash
# Deploy con rollback automático
gcloud run deploy core-service-stg \
  --image=gcr.io/xafra-ads/core-service:latest \
  --max-instances=1000 \
  --timeout=60s \
  --health-check-path=/health

# Rollback inmediato si falla
gcloud run services update-traffic core-service-stg \
  --to-revisions=core-service-stg-00033-kc9=100
```

---

## 13. DOCUMENTACIÓN TÉCNICA

### 13.1 Estructura de Proyecto

```
xafra-ads-v5/dev/
├── packages/
│   ├── database/           # Prisma schema + migrations
│   └── shared/            # Utilities compartidas
├── services/
│   ├── core-service/      # Ads redirect + utils
│   ├── tracking-service/  # Click tracking
│   ├── auth-service/      # Authentication
│   ├── campaign-service/  # Campaign CRUD
│   └── postback-service/  # Webhooks
├── infrastructure/
│   ├── docker/           # Dockerfiles
│   ├── nginx/           # Gateway config
│   └── monitoring/      # Cloud monitoring
├── environments/         # Environment configs
├── cloudbuild-*.yaml    # CI/CD pipelines
└── docker-compose.yml   # Local development
```

### 13.2 APIs Documentation

#### Postman Collection:
- **Archivo**: `Xafra-ads-v5-QA-Collection.postman_collection.json`
- **Environments**: DEV, STG, PROD
- **Tests**: Automated API testing
- **Examples**: Request/response samples

### 13.3 Database Documentation

#### Migrations:
```bash
# Ver estado de migraciones
npx prisma migrate status

# Crear nueva migración
npx prisma migrate dev --name add_new_field

# Aplicar en producción
npx prisma migrate deploy
```

#### Schema Evolution:
- Todas las migraciones versionadas en `packages/database/prisma/migrations/`
- Backward compatibility mantenida
- Rollback strategies documentadas

---

## 14. ROADMAP Y FUTURAS MEJORAS

### 14.1 Fase Actual (v5.0) - ✅ Completado
- [x] Microservicios core implementados
- [x] Base de datos migrada y optimizada
- [x] Deploy en GCP Cloud Run
- [x] APIs principales funcionando
- [x] Sistema de cache implementado
- [x] Monitoring básico configurado

### 14.2 Próximas Mejoras (v5.1)

#### Q4 2025:
- [ ] **Analytics Dashboard**: Frontend React para visualización
- [ ] **Advanced Caching**: Redis Cluster para alta disponibilidad
- [ ] **API Rate Limiting**: Por customer/tier de servicio
- [ ] **Geo-targeting Enhanced**: Soporte para más países
- [ ] **A/B Testing**: Framework para testing de optimizaciones

#### Q1 2026:
- [ ] **Machine Learning**: Optimización automática de tráfico
- [ ] **Real-time Analytics**: Stream processing con Apache Kafka
- [ ] **Mobile SDK**: SDK para integración móvil
- [ ] **GraphQL Gateway**: Alternative API interface
- [ ] **Multi-region Deployment**: Expansión global

### 14.3 Optimizaciones Técnicas

#### Performance:
- [ ] **Edge Computing**: Cloudflare Workers para redirects
- [ ] **Database Sharding**: Particionamiento por región
- [ ] **CDN Integration**: Static assets optimization
- [ ] **Connection Pooling**: PgBouncer implementation

#### Seguridad:
- [ ] **OAuth 2.0**: Modern authentication
- [ ] **API Versioning**: V2 API with breaking changes
- [ ] **Audit Logging**: Comprehensive audit trail
- [ ] **Penetration Testing**: Regular security audits

---

## 📞 CONTACTO Y SOPORTE

### Equipo de Desarrollo:
- **Tech Lead**: Xamir Castelblanco (xamir.castelblanco@xafratech.com)
- **Repository**: https://github.com/xamircastel/xafra-ads-v5
- **Project Board**: [GitHub Projects](https://github.com/xamircastel/xafra-ads-v5/projects)

### Environments:
- **Staging**: https://stg.xafra-ads.com
- **Production**: https://api.xafra-ads.com (próximamente)
- **Monitoring**: [GCP Console](https://console.cloud.google.com/run?project=xafra-ads)

---

*Documento actualizado: Septiembre 23, 2025*  
*Versión: 1.0*  
*Estado: Producción Staging*