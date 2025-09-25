-- =============================================
-- SCRIPT DE ALISTAMIENTO AUTH USERS PRODUCTION
-- Xafra-ads v5 - Production Setup
-- Fecha: 25 Sep 2025
-- =============================================

-- 1. CREAR USUARIOS CRÍTICOS PARA PRODUCCIÓN
-- Basado en usuarios existentes en staging pero con API keys nuevas

-- Usuario Digital-X (Customer ID: 1)
INSERT INTO production.auth_users (
    id_auth, user_name, shared_key, api_key, active, creation_date, 
    customer_id, password, status, expiration_date, description, 
    permissions, login_count, last_login, modification_date
) VALUES (
    1, 
    'Digital-X-Production', 
    'xafra_prod_shared_key_digitalx_2025', 
    'xafra_prod_digitalx_api_' || substr(md5(random()::text), 1, 32),
    1, 
    EXTRACT(EPOCH FROM NOW()) * 1000,
    1,
    '$2b$10$' || substr(md5(random()::text), 1, 53), -- Hashed password placeholder
    1,
    EXTRACT(EPOCH FROM NOW() + INTERVAL '1 year') * 1000,
    'Digital-X Production API User - Main Customer',
    'campaign:read,campaign:write,tracking:read,postback:read',
    0,
    0,
    EXTRACT(EPOCH FROM NOW()) * 1000
);

-- Usuario Gomovil (Customer ID: 2)
INSERT INTO production.auth_users (
    id_auth, user_name, shared_key, api_key, active, creation_date, 
    customer_id, password, status, expiration_date, description, 
    permissions, login_count, last_login, modification_date
) VALUES (
    2, 
    'Gomovil-Production', 
    'xafra_prod_shared_key_gomovil_2025', 
    'xafra_prod_gomovil_api_' || substr(md5(random()::text), 1, 32),
    1, 
    EXTRACT(EPOCH FROM NOW()) * 1000,
    2,
    '$2b$10$' || substr(md5(random()::text), 1, 53), -- Hashed password placeholder
    1,
    EXTRACT(EPOCH FROM NOW() + INTERVAL '1 year') * 1000,
    'Gomovil Production API User - Secondary Customer',
    'campaign:read,campaign:write,tracking:read,postback:read',
    0,
    0,
    EXTRACT(EPOCH FROM NOW()) * 1000
);

-- Usuario Admin Master (Para administración)
INSERT INTO production.auth_users (
    id_auth, user_name, shared_key, api_key, active, creation_date, 
    customer_id, password, status, expiration_date, description, 
    permissions, login_count, last_login, modification_date
) VALUES (
    3, 
    'Admin-Master-Production', 
    'xafra_prod_master_admin_key_2025', 
    'xafra_prod_master_admin_' || substr(md5(random()::text), 1, 32),
    1, 
    EXTRACT(EPOCH FROM NOW()) * 1000,
    1,
    '$2b$10$' || substr(md5(random()::text), 1, 53), -- Hashed password placeholder
    1,
    EXTRACT(EPOCH FROM NOW() + INTERVAL '1 year') * 1000,
    'Master Admin Production - Full Access',
    'admin:full,campaign:full,tracking:full,postback:full,auth:full',
    0,
    0,
    EXTRACT(EPOCH FROM NOW()) * 1000
);

-- 2. VERIFICAR INSERCIÓN
SELECT 
    id_auth, 
    user_name, 
    substr(api_key, 1, 20) || '...' as api_key_preview,
    active,
    customer_id,
    description
FROM production.auth_users 
ORDER BY id_auth;

-- 3. MOSTRAR API KEYS COMPLETAS (SOLO PARA SETUP INICIAL)
-- ⚠️ IMPORTANTE: Guardar estos API keys de forma segura
SELECT 
    user_name,
    api_key as complete_api_key,
    customer_id,
    description
FROM production.auth_users 
WHERE id_auth IN (1, 2, 3)
ORDER BY id_auth;