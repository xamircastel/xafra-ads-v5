-- =============================================
-- SCRIPT DE CONFIGURACIÓN REDIS NAMESPACING
-- Xafra-ads v5 - Production Setup
-- Fecha: 25 Sep 2025
-- =============================================

-- CONFIGURACIÓN REDIS PARA NAMESPACING POR AMBIENTE
-- Este script documenta la estrategia de namespacing para Redis

-- 1. ESTRATEGIA DE KEYS
/*
STAGING KEYS:
- staging:campaign:{id}
- staging:product:{id}
- staging:tracking:{tracking_id}
- staging:cache:conversion_rates
- staging:retry_queue:postbacks

PRODUCTION KEYS:
- production:campaign:{id}
- production:product:{id}
- production:tracking:{tracking_id}
- production:cache:conversion_rates
- production:retry_queue:postbacks
*/

-- 2. CONFIGURACIÓN DE MEMORIA
/*
TOTAL REDIS MEMORY: Actual disponible
STAGING ALLOCATION: 40% de memoria total
PRODUCTION ALLOCATION: 60% de memoria total

EVICTION POLICY: allkeys-lru
TTL DEFAULT:
- Campaigns: 1 hora
- Products: 4 horas
- Tracking: 30 minutos
- Conversion rates: 5 minutos
*/

-- 3. CONFIGURACIÓN EN SERVICIOS
/*
Environment Variables para Production:
REDIS_URL: redis://10.147.230.83:6379
REDIS_PREFIX: production
REDIS_TTL_CAMPAIGN: 3600
REDIS_TTL_PRODUCT: 14400
REDIS_TTL_TRACKING: 1800
REDIS_TTL_CONVERSION: 300

Environment Variables para Staging (mantener):
REDIS_URL: redis://10.147.230.83:6379
REDIS_PREFIX: staging
REDIS_TTL_CAMPAIGN: 1800
REDIS_TTL_PRODUCT: 3600
REDIS_TTL_TRACKING: 900
REDIS_TTL_CONVERSION: 300
*/

-- 4. COMANDOS DE VERIFICACIÓN REDIS
/*
# Verificar keys por ambiente
redis-cli -h 10.147.230.83 -p 6379 KEYS "staging:*"
redis-cli -h 10.147.230.83 -p 6379 KEYS "production:*"

# Verificar uso de memoria
redis-cli -h 10.147.230.83 -p 6379 INFO memory

# Limpiar cache de staging si es necesario
redis-cli -h 10.147.230.83 -p 6379 DEL staging:*

# Limpiar cache de production si es necesario
redis-cli -h 10.147.230.83 -p 6379 DEL production:*
*/

-- Este archivo es solo documentación
SELECT 'Redis namespacing configuration documented' as status;