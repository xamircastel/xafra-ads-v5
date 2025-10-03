# 🚀 QUICK START - Google Ads Conversions
## Comandos Rápidos para Deployment

---

## ⚡ Deployment Rápido a Staging

### 1. Ejecutar Migration
```bash
cd dev/packages/database
DATABASE_URL="postgresql://postgres:XafraTech2025!@34.28.245.62:5432/xafra-ads?schema=staging" npx prisma migrate deploy
```

### 2. Generar Prisma Client
```bash
npx prisma generate
```

### 3. Deploy Services
```bash
cd ../..
gcloud builds submit --config=cloudbuild-core-stg.yaml .
gcloud builds submit --config=cloudbuild-postback-stg.yaml .
```

### 4. Ejecutar Tests
```powershell
cd scripts
.\test-google-conversions.ps1
```

### 5. Verificar Monitoreo
```powershell
.\monitor-google-conversions.ps1
```

---

## 🧪 Test Rápido Manual

```bash
# Reemplazar con API Key real
curl -X GET "https://core-service-stg-shk2qzic2q-uc.a.run.app/service/v1/confirm/pe/entel/google/xafra_mfs9yf3g_e8c39158306ce0759b573cf36c56218b/EAIaIQobChMItest$(date +%s)" \
  -H "Content-Type: application/json" \
  -d '{"msisdn":"51987654321","campaign":"Test"}'
```

---

## 📊 Ver Estadísticas

```powershell
# Últimos 7 días
.\monitor-google-conversions.ps1

# Últimos 30 días
.\monitor-google-conversions.ps1 -Days 30
```

---

## 🔍 Verificar Health

```bash
# Core Service
curl https://core-service-stg-shk2qzic2q-uc.a.run.app/health

# Postback Service
curl https://postback-service-stg-697203931362.us-central1.run.app/api/postbacks/google/health
```

---

## 📋 Verificar Migration

```bash
cd dev/packages/database
DATABASE_URL="postgresql://postgres:XafraTech2025!@34.28.245.62:5432/xafra-ads?schema=staging" npx prisma migrate status
```

---

## 🎯 Ejemplo Real de Uso

```javascript
// JavaScript/Node.js
const axios = require('axios');

const apikey = 'TU_API_KEY_AQUI';
const gclid = 'EAIaIQobChMI...'; // From Google Ads

const url = `https://xafra-ads.com/service/v1/confirm/pe/entel/google/${apikey}/${gclid}`;

axios.get(url, {
  data: {
    msisdn: '51987654321',
    campaign: 'Juegos1',
    id_product: 123
  }
})
.then(res => console.log('Success:', res.data))
.catch(err => console.error('Error:', err.response?.data));
```

---

## 📖 Documentación Completa

- **API Docs:** `dev/docs/GOOGLE_ADS_CONVERSIONS_API.md`
- **Implementation Guide:** `dev/docs/GOOGLE_ADS_IMPLEMENTATION.md`
- **Summary:** `dev/GOOGLE_ADS_IMPLEMENTATION_COMPLETE.md`

---

✅ **Todo listo para deployment!**
