# 🛡️ BACKUP COMPLETO XAFRA-ADS V5 MVP
# =====================================
# Creado: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
# Versión: v1.0.0-mvp  
# Estado: MVP 100% FUNCIONAL

## 📦 CONTENIDO DEL BACKUP

### 🗄️ BACKUP DE BASE DE DATOS
- **Archivo principal**: xafra_ads_mvp_backup_20250918_183809.sql (29,735 bytes)
  - Backup completo con estructura y datos
  - Incluye todas las tablas, índices, constraints y secuencias
  - Comando de restauración:
    ```bash
    $env:PGPASSWORD="XafraTech2025!"; psql -h 34.28.245.62 -U postgres -d xafra-ads < backup_file.sql
    ```

- **Backup solo datos**: xafra_ads_data_only_20250918_183850.sql (6,851 bytes)
  - Solo datos de tablas críticas sin estructura

### 📊 DATOS CRÍTICOS RESPALDADOS

#### 👥 CUSTOMERS (2 registros)
- Digital-X (id: 1)
- Gomovil (id: 2)

#### 🛍️ PRODUCTS (2 registros)  
- Mind (id: 1)
- Discovery Language (id: 2)

#### 🔐 AUTH_USERS (2 registros)
- Digital-X: xafra_mfpqcyvr_f9ab4fd209a828dcd1bce8005f660fae
- Gomovil: xafra_mfpqwrai_6f4b47226e39ca34417bc6352276193c

#### 📊 CAMPAIGNS (10 registros activos)
- Incluye trackings normales y Kolbi short_tracking
- Estados: Funcionales con confirmaciones y postbacks

### 🔄 REPOSITORIO GIT
- **GitHub**: https://github.com/xamircastel/xafra-ads-v5
- **Tag crítico**: v1.0.0-mvp
- **Commit**: a3cf98a - "MVP COMPLETO: Implementación funcional al 100%"
- **Archivos**: 94 archivos, 25,542 líneas de código

## 🚨 INSTRUCCIONES DE RESTAURACIÓN DE EMERGENCIA

### 1. RESTAURAR CÓDIGO FUENTE
```bash
git clone https://github.com/xamircastel/xafra-ads-v5.git
cd xafra-ads-v5
git checkout v1.0.0-mvp
```

### 2. RESTAURAR BASE DE DATOS
```bash
$env:PGPASSWORD="XafraTech2025!"
pg_dump -h 34.28.245.62 -U postgres -d xafra-ads < xafra_ads_mvp_backup_20250918_183809.sql
```

### 3. INICIAR SERVICIOS
```bash
npm run dev
# Servicios en puertos: 8080, 3002, 3003, 3004, 3005
```

## ✅ VERIFICACIÓN DE BACKUP
- [x] Código fuente en GitHub con tag v1.0.0-mvp
- [x] Base de datos completa respaldada  
- [x] Datos críticos extraídos por separado
- [x] API keys de 47 caracteres preservadas
- [x] Configuraciones de Kolbi respaldadas
- [x] Tracking y confirmaciones funcionales

## 🎯 ESTADO ACTUAL
**TODOS LOS COMPONENTES DEL MVP ESTÁN 100% RESPALDADOS Y PROTEGIDOS**

En caso de emergencia, se puede restaurar completamente el sistema funcional 
usando los archivos de este directorio y las instrucciones anteriores.

---
*Backup creado automáticamente durante Fase 2 del proceso de despliegue a producción*