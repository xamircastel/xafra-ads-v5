-- =============================================
-- SCRIPT DE ALINEACIÓN DE SECUENCIAS PRODUCTION
-- Xafra-ads v5 - Production Setup
-- Fecha: 25 Sep 2025
-- =============================================

-- 1. VERIFICAR VALORES ACTUALES DE SECUENCIAS
SELECT 'production' as schema, 'products_id_product_seq' as sequence_name, last_value 
FROM production.products_id_product_seq
UNION ALL
SELECT 'staging', 'products_id_product_seq', last_value 
FROM staging.products_id_product_seq;

-- 2. AJUSTAR SECUENCIA PRODUCTION PARA EVITAR CONFLICTOS
-- Configurar secuencia production comenzando desde un valor seguro
SELECT setval('production.products_id_product_seq', 1000, false);

-- 3. VERIFICAR NUEVA CONFIGURACIÓN
SELECT 'production' as schema, 'products_id_product_seq' as sequence_name, last_value, is_called
FROM production.products_id_product_seq;

-- 4. CREAR SCRIPT DE RESPALDO PARA OTRAS SECUENCIAS (FUTURO)
-- En caso de que se agreguen más secuencias, usar este patrón:
-- SELECT setval('production.{sequence_name}', {safe_starting_value}, false);

-- 5. VERIFICAR QUE NO HAY CONFLICTOS CON PRODUCTOS EXISTENTES
SELECT 
    'Current max id_product in production: ' || COALESCE(MAX(id_product), 0) as info
FROM production.products;