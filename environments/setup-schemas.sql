-- 🗄️ SCRIPT DE CREACIÓN DE SCHEMAS OPTIMIZADO
-- =============================================
-- Propósito: Crear separación lógica en una sola BD
-- Costo: $0 USD (usa BD existente)

-- 🔧 DESARROLLO (Schema público - ya existe)
-- Schema: public (actual, no tocar)
-- Propósito: Desarrollo y testing actual

-- 🧪 STAGING (Nuevo schema)
CREATE SCHEMA IF NOT EXISTS staging;

-- Copiar estructura desde public a staging
CREATE TABLE staging.customers AS TABLE public.customers WITH NO DATA;
CREATE TABLE staging.products AS TABLE public.products WITH NO DATA;
CREATE TABLE staging.auth_users AS TABLE public.auth_users WITH NO DATA;
CREATE TABLE staging.campaign AS TABLE public.campaign WITH NO DATA;
CREATE TABLE staging.ads AS TABLE public.ads WITH NO DATA;
CREATE TABLE staging.ads_conf AS TABLE public.ads_conf WITH NO DATA;
CREATE TABLE staging.ads_def AS TABLE public.ads_def WITH NO DATA;
CREATE TABLE staging.blacklist AS TABLE public.blacklist WITH NO DATA;
CREATE TABLE staging.xafra_campaign AS TABLE public.xafra_campaign WITH NO DATA;

-- Copiar datos de prueba para staging
INSERT INTO staging.customers SELECT * FROM public.customers;
INSERT INTO staging.products SELECT * FROM public.products;
INSERT INTO staging.auth_users SELECT * FROM public.auth_users;

-- 🏭 PRODUCCIÓN (Nuevo schema)  
CREATE SCHEMA IF NOT EXISTS production;

-- Copiar estructura desde public a production
CREATE TABLE production.customers AS TABLE public.customers WITH NO DATA;
CREATE TABLE production.products AS TABLE public.products WITH NO DATA;
CREATE TABLE production.auth_users AS TABLE public.auth_users WITH NO DATA;
CREATE TABLE production.campaign AS TABLE public.campaign WITH NO DATA;
CREATE TABLE production.ads AS TABLE public.ads WITH NO DATA;
CREATE TABLE production.ads_conf AS TABLE public.ads_conf WITH NO DATA;
CREATE TABLE production.ads_def AS TABLE public.ads_def WITH NO DATA;
CREATE TABLE production.blacklist AS TABLE public.blacklist WITH NO DATA;
CREATE TABLE production.xafra_campaign AS TABLE public.xafra_campaign WITH NO DATA;

-- Copiar datos iniciales para producción (customers y products)
INSERT INTO production.customers SELECT * FROM public.customers;
INSERT INTO production.products SELECT * FROM public.products;

-- 🔐 PERMISOS (Opcional para mayor seguridad)
-- GRANT USAGE ON SCHEMA staging TO postgres;
-- GRANT USAGE ON SCHEMA production TO postgres;

-- 📊 VERIFICACIÓN
SELECT 
    schema_name,
    (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = schema_name) as table_count
FROM information_schema.schemata 
WHERE schema_name IN ('public', 'staging', 'production')
ORDER BY schema_name;