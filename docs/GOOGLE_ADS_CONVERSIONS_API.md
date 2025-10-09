# 📋 Google Ads Conversions API - ENTEL Peru
## Documentación de Integración

---

## 🎯 Descripción General

Sistema de tracking de conversiones para Google Ads sin landing pages intermedias, específicamente diseñado para ENTEL Perú. Permite registrar conversiones desde el sistema del cliente directamente después de una transacción exitosa.

---

## 🔗 Endpoints Disponibles

### 1. Registrar Conversión (Principal)

**Método:** `GET`  
**URL:** `https://xafra-ads.com/service/v1/confirm/pe/entel/google/{apikey}/{tracking}`

#### Parámetros de URL:
- `{apikey}` - API Key del customer (requerido)
- `{tracking}` - Google Click ID (gclid) generado por Google Ads (requerido)

#### Body (Opcional - JSON):
```json
{
  "msisdn": "51987654321",
  "empello_token": "uknfebhjcwtmvngwoubdszyycvltwuwicitgufabsaryejrgopelsyqzltlwtlnf",
  "id_product": 123,
  "campaign": "Juegos1"
}
```

#### Campos del Body:
| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `msisdn` | string(20) | No | Número telefónico del usuario |
| `empello_token` | string(255) | No | Token de integración Empello |
| `id_product` | number | No | ID del producto asociado |
| `campaign` | string(255) | No | Nombre de la campaña |

#### Respuesta Exitosa (200):
```json
{
  "success": true,
  "message": "Conversion registered successfully",
  "data": {
    "conversion_id": 123,
    "tracking": "EAIaIQobChMI...",
    "customer": "ENTEL Peru",
    "country": "PE",
    "operator": "ENTEL",
    "conversion_date": "2025-10-02T10:30:00.000Z",
    "response_time_ms": 45
  }
}
```

#### Errores Comunes:

**401 - API Key Inválido:**
```json
{
  "success": false,
  "error": "Invalid or inactive API key",
  "code": "UNAUTHORIZED"
}
```

**400 - Tracking Inválido:**
```json
{
  "success": false,
  "error": "Invalid tracking parameter (gclid)",
  "code": "INVALID_TRACKING"
}
```

**409 - Conversión Duplicada:**
```json
{
  "success": false,
  "error": "Conversion already registered",
  "code": "DUPLICATE_CONVERSION",
  "data": {
    "conversion_id": 123,
    "conversion_date": "2025-10-02T10:30:00.000Z"
  }
}
```

---

### 2. Consultar Estado de Conversión

**Método:** `GET`  
**URL:** `https://xafra-ads.com/service/v1/google/conversion/status/{tracking}`

#### Parámetros:
- `{tracking}` - Google Click ID (gclid)

#### Respuesta Exitosa (200):
```json
{
  "success": true,
  "data": {
    "conversion_id": 123,
    "tracking": "EAIaIQobChMI...",
    "customer": "ENTEL Peru",
    "country": "PE",
    "operator": "ENTEL",
    "campaign": "Juegos1",
    "msisdn": "51987654321",
    "conversion_date": "2025-10-02T10:30:00.000Z",
    "status_post_back": 1,
    "date_post_back": "2025-10-02T10:30:02.000Z",
    "status_description": "Success"
  }
}
```

#### Estados de Postback:
| Valor | Descripción |
|-------|-------------|
| `null` | Pendiente - aún no se ha enviado a Google |
| `1` | Éxito - enviado correctamente a Google Ads |
| `2` | Fallo - error al enviar a Google Ads |

---

## 📊 Estructura de Datos en Base de Datos

### Tabla: `conversions`

```sql
CREATE TABLE conversions (
  id                BIGSERIAL PRIMARY KEY,
  conversion_date   TIMESTAMP NOT NULL DEFAULT NOW(),
  customer_id       BIGINT NOT NULL,
  tracking          VARCHAR(500) NOT NULL,
  id_product        BIGINT,
  msisdn            VARCHAR(20),
  empello_token     VARCHAR(255),
  source            VARCHAR(50) NOT NULL DEFAULT 'google',
  status_post_back  SMALLINT,
  date_post_back    TIMESTAMP,
  campaign          VARCHAR(255),
  country           VARCHAR(10),
  operator          VARCHAR(50)
);
```

---

## 🔄 Flujo de Procesamiento

```
1. Usuario hace clic en anuncio de Google Ads
   ↓
2. Google genera gclid único
   ↓
3. Usuario completa proceso de contratación en sitio de ENTEL
   ↓
4. Sistema de ENTEL llama a:
   GET /service/v1/confirm/pe/entel/google/{apikey}/{gclid}
   ↓
5. Xafra-ads valida API Key y crea registro en tabla conversions
   ↓
6. Response inmediato al cliente (< 200ms)
   ↓
7. Proceso asíncrono envía conversión a Google Ads API
   ↓
8. Google Ads registra la conversión
   ↓
9. Status actualizado en base de datos (status_post_back = 1)
```

---

## 🧪 Ejemplos de Uso

### Ejemplo 1: Conversión Simple (Solo Requeridos)

```bash
curl -X GET "https://xafra-ads.com/service/v1/confirm/pe/entel/google/xafra_abc123_xyz789/EAIaIQobChMIp7vN9P..."
```

### Ejemplo 2: Conversión con Datos Completos

```bash
curl -X GET "https://xafra-ads.com/service/v1/confirm/pe/entel/google/xafra_abc123_xyz789/EAIaIQobChMIp7vN9P..." \
  -H "Content-Type: application/json" \
  -d '{
    "msisdn": "51987654321",
    "empello_token": "uknfebhjcwtmvngwoubdszyycvltwuwicitgufabsaryejrgopelsyqzltlwtlnf",
    "id_product": 45,
    "campaign": "PromoOctubre2025"
  }'
```

### Ejemplo 3: PowerShell (Windows)

```powershell
$apikey = "xafra_abc123_xyz789"
$gclid = "EAIaIQobChMIp7vN9P..."
$url = "https://xafra-ads.com/service/v1/confirm/pe/entel/google/$apikey/$gclid"

$body = @{
    msisdn = "51987654321"
    id_product = 45
    campaign = "PromoOctubre2025"
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri $url -Method GET -Body $body -ContentType "application/json"
$response | ConvertTo-Json -Depth 5
```

### Ejemplo 4: JavaScript/Node.js

```javascript
const axios = require('axios');

const apikey = 'xafra_abc123_xyz789';
const gclid = 'EAIaIQobChMIp7vN9P...';
const url = `https://xafra-ads.com/service/v1/confirm/pe/entel/google/${apikey}/${gclid}`;

const data = {
  msisdn: '51987654321',
  empello_token: 'uknfebhjcwtmvngwoubdszyycvltwuwicitgufabsaryejrgopelsyqzltlwtlnf',
  id_product: 45,
  campaign: 'PromoOctubre2025'
};

axios.get(url, { data })
  .then(response => {
    console.log('Conversión registrada:', response.data);
  })
  .catch(error => {
    console.error('Error:', error.response?.data || error.message);
  });
```

---

## 🔐 Seguridad

### API Key:
- Cada customer tiene un API Key único
- Se valida en cada request
- Se almacena en cache por 5 minutos para mejor performance
- Debe mantenerse confidencial

### Validaciones:
- ✅ API Key debe estar activo (`status = 1, active = 1`)
- ✅ Tracking (gclid) debe tener mínimo 10 caracteres
- ✅ No se permiten conversiones duplicadas (mismo tracking + customer)
- ✅ Todos los campos opcionales se validan si están presentes

---

## 📈 Métricas y Monitoreo

### Performance Targets:
- **Response Time:** < 200ms
- **Success Rate:** > 99%
- **Google Ads Upload Rate:** > 95%
- **Duplicate Prevention:** 100%

### Logs Disponibles:
- Request tracking completo
- Error handling detallado
- Performance metrics
- Google Ads API responses

---

## ⚠️ Notas Importantes

1. **gclid Único:** Cada conversión debe usar un gclid único. Google Ads no permite duplicados.

2. **Timing:** El gclid debe usarse dentro del período de atribución de Google Ads (típicamente 30-90 días).

3. **Async Processing:** El envío a Google Ads API es asíncrono. El response es inmediato pero el postback puede tomar unos segundos.

4. **Retry Logic:** Si falla el envío a Google Ads, el sistema NO reintenta automáticamente (esto puede agregarse si es necesario).

5. **Country/Operator:** Se heredan del customer. Para ENTEL Peru siempre será `PE` / `ENTEL`.

---

## 🐛 Troubleshooting

### Problema: Response 401 (Unauthorized)
**Causa:** API Key inválido o inactivo  
**Solución:** Verificar que el API Key sea correcto y esté activo en la base de datos

### Problema: Response 409 (Duplicate)
**Causa:** Conversión ya registrada con ese gclid  
**Solución:** Cada conversión debe usar un gclid único. Verificar que no se esté reutilizando

### Problema: Response 400 (Invalid Tracking)
**Causa:** gclid muy corto o inválido  
**Solución:** Verificar que el gclid sea el generado por Google Ads (típicamente 80+ caracteres)

### Problema: status_post_back = 2 (Failed)
**Causa:** Error al enviar a Google Ads API  
**Solución:** Verificar logs del postback-service y credenciales de Google Ads

---

## 📞 Soporte

Para soporte técnico o dudas sobre la integración:
- Email: soporte@xafra-ads.com
- Documentación técnica completa disponible en el repositorio

---

**Última actualización:** 2 de Octubre 2025  
**Versión:** 1.0.0
