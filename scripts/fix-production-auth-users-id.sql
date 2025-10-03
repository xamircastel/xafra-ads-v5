-- Xafra-ads v5
-- Hotfix: restablecer auto incremento en production.auth_users.id_auth
-- Ejecutar en la base de datos de producción (o el entorno que tenga el esquema "production")

BEGIN;

-- 1) Asegurar que exista la secuencia dedicada al campo id_auth
CREATE SEQUENCE IF NOT EXISTS production.auth_users_id_auth_seq
    AS BIGINT
    INCREMENT BY 1
    MINVALUE 1
    START WITH 1
    CACHE 1;

-- 2) Asociar la secuencia a la columna para que sea su "propietaria"
ALTER SEQUENCE production.auth_users_id_auth_seq
  OWNED BY production.auth_users.id_auth;

-- 3) Ajustar la secuencia al valor máximo actual
SELECT setval(
    'production.auth_users_id_auth_seq',
    GREATEST(
        COALESCE((SELECT MAX(id_auth) FROM production.auth_users WHERE id_auth IS NOT NULL), 0),
        1
    ),
    true
);

-- 4) Asignar nuevos IDs a registros existentes sin id_auth
UPDATE production.auth_users
SET id_auth = nextval('production.auth_users_id_auth_seq')
WHERE id_auth IS NULL;

-- 5) Configurar el DEFAULT y evitar futuros NULL
ALTER TABLE production.auth_users
    ALTER COLUMN id_auth SET DEFAULT nextval('production.auth_users_id_auth_seq'),
    ALTER COLUMN id_auth SET NOT NULL;

-- 6) Garantizar que la tabla tenga Primary Key en id_auth
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE constraint_type = 'PRIMARY KEY'
          AND table_schema = 'production'
          AND table_name = 'auth_users'
    ) THEN
        EXECUTE 'ALTER TABLE production.auth_users ADD PRIMARY KEY (id_auth)';
    END IF;
END;
$$;

COMMIT;
