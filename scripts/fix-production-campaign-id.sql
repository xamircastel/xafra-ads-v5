-- Xafra-ads v5
-- Hotfix: restablecer auto incremento en production.campaign.id
-- Ejecutar en la base de datos de producción (o el entorno con el esquema "production")

BEGIN;

-- 1) Asegurar que exista la secuencia dedicada al campo id
CREATE SEQUENCE IF NOT EXISTS production.campaign_id_seq
    AS BIGINT
    INCREMENT BY 1
    MINVALUE 1
    START WITH 1
    CACHE 1;

-- 2) Asociar la secuencia a la columna
ALTER SEQUENCE production.campaign_id_seq
  OWNED BY production.campaign.id;

-- 3) Ajustar la secuencia al valor máximo actual (mínimo 1)
SELECT setval(
    'production.campaign_id_seq',
    GREATEST(
        COALESCE((SELECT MAX(id) FROM production.campaign WHERE id IS NOT NULL), 0),
        1
    ),
    true
);

-- 4) Asignar IDs a registros existentes sin valor
UPDATE production.campaign
SET id = nextval('production.campaign_id_seq')
WHERE id IS NULL;

-- 5) Configurar DEFAULT y restricciones
ALTER TABLE production.campaign
    ALTER COLUMN id SET DEFAULT nextval('production.campaign_id_seq'),
    ALTER COLUMN id SET NOT NULL;

-- 6) Garantizar clave primaria
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE constraint_type = 'PRIMARY KEY'
          AND table_schema = 'production'
          AND table_name = 'campaign'
    ) THEN
        EXECUTE 'ALTER TABLE production.campaign ADD PRIMARY KEY (id)';
    END IF;
END;
$$;

COMMIT;
