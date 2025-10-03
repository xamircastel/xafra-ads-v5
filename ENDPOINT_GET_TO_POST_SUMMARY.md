# Resumen de Cambios: Endpoint GET → POST

**Fecha:** 2025-01-02  
**Servicio:** core-service  
**Endpoint:** Google Ads Conversions API  
**Razón del Cambio:** Corrección de lógica de negocio - endpoint debe recibir JSON body con campos opcionales

---

## 🎯 Problema Identificado

El endpoint fue implementado inicialmente como `GET`, pero la lógica de negocio requiere:
1. **Parámetros obligatorios** en la URL (`apikey`, `tracking`)
2. **Parámetros opcionales** en JSON body (`msisdn`, `id_product`, `empello_token`, `campaign`)

Un endpoint `GET` no puede recibir un JSON body según las especificaciones HTTP, por lo que debe ser `POST`.

---

## ✅ Cambios Implementados

### 1. Archivo: `services/core-service/src/routes/google-conversions.ts`

#### Cambio 1.1: Método del Endpoint (Línea 24)
```typescript
// ANTES
router.get('/google/conversion/:apikey/:tracking', async (req: Request, res: Response) => {

// DESPUÉS
router.post('/google/conversion/:apikey/:tracking', async (req: Request, res: Response) => {
```

#### Cambio 1.2: Interface ConversionBody (Línea 8-13)
```typescript
// ANTES
interface ConversionBody {
  msisdn?: string;
  id_product?: number;  // ❌ Tipo incorrecto
  empello_token?: string;
  campaign?: string;
}

// DESPUÉS
interface ConversionBody {
  msisdn?: string;          // Opcional - máx 20 caracteres
  id_product?: string;      // Opcional - máx 255 caracteres (CORREGIDO)
  empello_token?: string;   // Opcional - máx 255 caracteres
  campaign?: string;        // Opcional - máx 255 caracteres
}
```

#### Cambio 1.3: Validación de Body (Líneas 103-137)
```typescript
// ANTES
if (bodyData.id_product !== undefined) {
  if (typeof bodyData.id_product !== 'number' || bodyData.id_product < 0) {
    return res.status(400).json({
      success: false,
      error: 'id_product must be a positive number',
      code: 'INVALID_BODY'
    });
  }
}

// DESPUÉS
if (bodyData.id_product !== undefined) {
  if (typeof bodyData.id_product !== 'string' || 
      bodyData.id_product.length === 0 || 
      bodyData.id_product.length > 255) {
    return res.status(400).json({
      success: false,
      error: 'id_product must be a non-empty string (max 255 characters)',
      code: 'INVALID_BODY'
    });
  }
}
```

#### Cambio 1.4: Inserción en Base de Datos (Líneas 173-186)
```typescript
// ANTES
const conversion = await prisma.conversion.create({
  data: {
    // ...
    id_product: bodyData.id_product ? BigInt(bodyData.id_product) : null,
    // ...
    status_post_back: 'pending',  // ❌ Tipo incorrecto (string en vez de number)
    // ...
  }
});

// DESPUÉS
const conversion = await prisma.conversion.create({
  data: {
    // ...
    id_product: bodyData.id_product || null,  // Opcional - String
    msisdn: bodyData.msisdn || null,          // Opcional
    empello_token: bodyData.empello_token || null,  // Opcional
    campaign: bodyData.campaign || null,      // Opcional
    // ...
    status_post_back: 0,  // 0=pending, se actualizará después (CORREGIDO)
    // ...
  }
});
```

#### Cambio 1.5: Respuesta del Endpoint (Líneas 210-226)
```typescript
// ANTES
res.json({
  success: true,
  message: 'Conversion registered successfully',
  data: {
    conversion_id: Number(conversion.id),
    tracking,
    customer: customer.name,
    country: conversion.country,
    operator: conversion.operator,
    conversion_date: conversion.conversion_date,
    response_time_ms: responseTime
  }
});

// DESPUÉS
res.json({
  success: true,
  message: 'Conversion registered successfully',
  data: {
    conversion_id: Number(conversion.id),
    tracking,
    customer: customer.name,
    country: conversion.country,
    operator: conversion.operator,
    conversion_date: conversion.conversion_date,
    response_time_ms: responseTime,
    // Campos opcionales del JSON body (si fueron proporcionados)
    ...(bodyData.msisdn && { msisdn: bodyData.msisdn }),
    ...(bodyData.id_product && { id_product: bodyData.id_product }),
    ...(bodyData.empello_token && { empello_token: bodyData.empello_token }),
    ...(bodyData.campaign && { campaign: bodyData.campaign })
  }
});
```

### 2. Archivo: `packages/database/prisma/schema.prisma`

#### Cambio 2.1: Tipo de Campo id_product (Línea 179)
```prisma
# ANTES
model Conversion {
  id                BigInt    @id @default(autoincrement())
  # ...
  id_product        BigInt?  # ❌ Tipo incorrecto
  # ...
}

# DESPUÉS
model Conversion {
  id                BigInt    @id @default(autoincrement())
  # ...
  id_product        String?   @db.VarChar(255)  # ✅ Corregido a String
  # ...
}
```

### 3. Archivos Nuevos Creados

- ✅ `GOOGLE_ADS_CONVERSIONS_API.md` - Documentación completa del endpoint POST
- ✅ `test-google-conversions-post.ps1` - Script de testing para endpoint POST
- ✅ `apply-migration-id-product.ps1` - Script para aplicar migración de BD
- ✅ `migrations/alter-conversion-id-product-to-string.sql` - SQL de migración

---

## 🗄️ Migración de Base de Datos Requerida

**Archivo:** `migrations/alter-conversion-id-product-to-string.sql`

```sql
ALTER TABLE staging.conversions 
ALTER COLUMN id_product TYPE VARCHAR(255) USING id_product::VARCHAR;
```

**Aplicar con:**
```powershell
.\apply-migration-id-product.ps1
```

**⚠️ IMPORTANTE:** Esta migración debe ejecutarse **ANTES** de desplegar la nueva versión del core-service.

---

## 🚀 Pasos para Despliegue

### 1. ✅ Compilación Local (Completado)
```powershell
cd services/core-service
npm run build
```
**Resultado:** ✅ Compilación exitosa, sin errores TypeScript

### 2. ⏳ Aplicar Migración de BD (Pendiente)
```powershell
.\apply-migration-id-product.ps1
```

### 3. ⏳ Rebuild y Deploy a Staging (Pendiente)
```powershell
gcloud builds submit --config=cloudbuild-core-stg.yaml .
```

### 4. ⏳ Testing en Staging (Pendiente)
```powershell
.\test-google-conversions-post.ps1
```

### 5. ⏳ Deploy a Producción (Pendiente - después de validación)
```powershell
gcloud builds submit --config=cloudbuild-core-prod.yaml .
```

---

## 🧪 Escenarios de Testing

### Test 1: Solo parámetros obligatorios (URL)
```bash
curl -X POST "https://URL/service/v1/google/conversion/APIKEY/TRACKING"
```

### Test 2: Con campos opcionales parciales
```bash
curl -X POST "https://URL/service/v1/google/conversion/APIKEY/TRACKING" \
  -H "Content-Type: application/json" \
  -d '{"msisdn":"51987654321","campaign":"Juegos1"}'
```

### Test 3: Con todos los campos opcionales
```bash
curl -X POST "https://URL/service/v1/google/conversion/APIKEY/TRACKING" \
  -H "Content-Type: application/json" \
  -d '{
    "msisdn":"51987654321",
    "id_product":"PROD-ENTEL-123",
    "empello_token":"uknfebhjcwtmvngwoubdszyycvltwuwicitgufabsaryejrgopelsyqzltlwtlnf",
    "campaign":"Juegos1"
  }'
```

### Test 4: Validación de errores
- ❌ msisdn > 20 caracteres → 400 Bad Request
- ❌ id_product > 255 caracteres → 400 Bad Request
- ❌ tracking duplicado → 409 Conflict
- ❌ API key inválida → 401 Unauthorized

---

## 📊 Estado del Proyecto

| Componente | Estado | Comentarios |
|------------|--------|-------------|
| Código TypeScript | ✅ Completado | Sin errores de compilación |
| Prisma Schema | ✅ Actualizado | Campo id_product ahora es String |
| Prisma Client | ✅ Regenerado | Tipos actualizados correctamente |
| Migración SQL | ✅ Creada | Pendiente de ejecución en BD |
| Documentación | ✅ Completa | GOOGLE_ADS_CONVERSIONS_API.md |
| Scripts Testing | ✅ Creados | test-google-conversions-post.ps1 |
| Deploy Staging | ⏳ Pendiente | Después de aplicar migración |
| Testing Staging | ⏳ Pendiente | Después de deploy |
| Deploy Producción | ⏳ Pendiente | Después de validación |

---

## 🔍 Verificación de Calidad

### ✅ Checklist de Validación

- [x] Endpoint cambiado de GET a POST
- [x] Interface ConversionBody actualizada (id_product: string)
- [x] Validación de body implementada correctamente
- [x] Inserción en BD con tipos correctos
- [x] Respuesta incluye campos opcionales cuando son proporcionados
- [x] Prisma Schema actualizado (id_product: String)
- [x] Prisma Client regenerado
- [x] Compilación TypeScript exitosa (0 errores)
- [x] Documentación completa creada
- [x] Scripts de testing creados
- [x] Migración SQL creada
- [ ] Migración ejecutada en BD
- [ ] Deploy a staging completado
- [ ] Tests de integración pasados
- [ ] Deploy a producción completado

---

## 📝 Lecciones Aprendidas

1. **Especificaciones HTTP:** Los endpoints GET no deben recibir body JSON. Para datos opcionales en el body, usar POST.

2. **Tipos de Datos:** Validar que los tipos en Prisma Schema coincidan con la lógica de negocio desde el inicio.

3. **Validación Completa:** Implementar validación tanto de tipos como de longitud máxima para todos los campos opcionales.

4. **Documentación:** Documentar claramente qué parámetros son obligatorios vs opcionales.

5. **Testing:** Crear scripts de testing que cubran múltiples escenarios (con body, sin body, validaciones, etc.).

---

## 🔗 Referencias

- Documentación: `GOOGLE_ADS_CONVERSIONS_API.md`
- Testing: `test-google-conversions-post.ps1`
- Migración: `migrations/alter-conversion-id-product-to-string.sql`
- Schema: `packages/database/prisma/schema.prisma`
- Endpoint: `services/core-service/src/routes/google-conversions.ts`

---

**Última actualización:** 2025-01-02  
**Autor:** GitHub Copilot  
**Revisión:** Pendiente
