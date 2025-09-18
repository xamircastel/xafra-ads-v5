# 🔍 ANÁLISIS DE COMPATIBILIDAD: Schema Prisma vs Base de Datos Real

## 📊 TABLAS ENCONTRADAS EN LA BD REAL:
1. **ads** - Nueva tabla no contemplada
2. **ads_conf** - Nueva tabla no contemplada  
3. **ads_def** - Nueva tabla no contemplada
4. **auth_users** ✅ - Coincide (con diferencias en campos)
5. **blacklist** - Nueva tabla no contemplada
6. **campaign** ✅ - Coincide (con diferencias en campos)
7. **customers** ✅ - Coincide (con diferencias en campos)
8. **products** ✅ - Coincide (con diferencias en campos)
9. **vw_ads** - Vista no contemplada
10. **xafra_campaign** - Nueva tabla no contemplada

## ❌ DIFERENCIAS CRÍTICAS IDENTIFICADAS:

### 1. **TABLA CUSTOMERS**
**BD Real:**
- `id_customer` (BIGINT) - PK
- `name` (VARCHAR(1000))
- `short_name` (VARCHAR(100))
- `mail` (VARCHAR(200))
- `phone` (VARCHAR(20))
- `country` (VARCHAR(10))
- `operator` (VARCHAR(50))

**Schema Prisma:**
- `id` (Int) - PK ❌
- `name` (VARCHAR(255)) ❌
- `email` (VARCHAR(255)) ❌ 
- `country` (VARCHAR(2)) ❌
- `operator` (VARCHAR(50)) ✅
- `status` (SmallInt) ❌ NO EXISTE EN BD
- `creation_date` (BigInt) ❌ NO EXISTE EN BD
- `modification_date` (BigInt) ❌ NO EXISTE EN BD

### 2. **TABLA AUTH_USERS**
**BD Real:**
- `id_auth` (BIGINT) - PK
- `user_name` (VARCHAR(50))
- `shared_key` (VARCHAR(50))
- `api_key` (VARCHAR(50))
- `active` (SMALLINT)
- `creation_date` (TIMESTAMP)

**Schema Prisma:**
- `id` (Int) - PK ❌
- `customer_id` (Int) ❌ NO EXISTE EN BD
- `apikey` (VARCHAR(32)) ❌ 
- `status` (SmallInt) ❌ 
- `creation_date` (BigInt) ❌
- `modification_date` (BigInt) ❌ NO EXISTE EN BD

### 3. **TABLA PRODUCTS**
**BD Real:**
- `id_product` (BIGINT) - PK
- `reference` (VARCHAR(100)) ❌ NO EXISTE EN PRISMA
- `name` (VARCHAR(500)) ❌
- `url_redirect_success` (VARCHAR(1000)) ✅
- `active` (SMALLINT) ❌ 
- `id_customer` (BIGINT) ✅
- `url_redirect_postback` (VARCHAR(1000)) ✅
- `method_postback` (VARCHAR(20)) ❌
- `body_postback` (VARCHAR(2500)) ❌ NO EXISTE EN PRISMA
- `is_qs` (SMALLINT) ❌ NO EXISTE EN PRISMA
- `country` (VARCHAR(10)) ❌
- `operator` (VARCHAR(50)) ✅
- `random` (SMALLINT) ❌

**Schema Prisma:**
- `id` (Int) - PK ❌
- `customer_id` (Int) ❌
- `name` (VARCHAR(255)) ❌
- `status` (SmallInt) ❌ 
- `creation_date` (BigInt) ❌ NO EXISTE EN BD
- `modification_date` (BigInt) ❌ NO EXISTE EN BD

### 4. **TABLA CAMPAIGN**
**BD Real:**
- `id` (BIGINT) - PK ✅
- `creation_date` (TIMESTAMP) ❌ 
- `modification_date` (TIMESTAMP) ❌
- `id_product` (BIGINT) ✅
- `tracking` (VARCHAR(500)) ❌
- `status` (SMALLINT) ✅
- `uuid` (VARCHAR(50)) ❌
- `status_post_back` (SMALLINT) ✅
- `date_post_back` (TIMESTAMP) ❌
- `params` (TEXT) ❌ NO EXISTE EN PRISMA
- `xafra_tracking_id` (VARCHAR(100)) ❌
- `short_tracking` (VARCHAR(50)) ❌
- `country` (VARCHAR(50)) ❌
- `operator` (VARCHAR(50)) ❌

**Schema Prisma:**
- `creation_date` (BigInt) ❌
- `modification_date` (BigInt) ❌
- `tracking` (VARCHAR(255)) ❌
- `uuid` (VARCHAR(36)) ❌
- `xafra_tracking_id` (VARCHAR(255)) ❌
- `short_tracking` (VARCHAR(10)) ❌
- `country` (VARCHAR(2)) ❌
- `date_post_back` (BigInt) ❌

## 🚨 TABLAS FALTANTES EN PRISMA:
- **ads** - Sistema de anuncios
- **ads_conf** - Configuración de anuncios
- **ads_def** - Definición de anuncios
- **blacklist** - Lista negra de usuarios
- **xafra_campaign** - Campañas Xafra específicas

## 🚨 TABLAS SOBRANTES EN PRISMA:
- **Analytics** - No existe en BD real
- **PostbackLog** - No existe en BD real
- **RateLimit** - No existe en BD real
- **Config** - No existe en BD real

## 💡 CONCLUSIÓN:
**El schema Prisma actual NO es compatible con la base de datos existente.**
Se requiere una reescritura completa del schema para coincidir con la estructura real.