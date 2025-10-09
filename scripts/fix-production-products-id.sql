-- Xafra-ads v5
-- Hotfix: normalizar autoincremento de production.products.id_product
-- Ejecutar en la base de datos de producción (o cualquier entorno con el esquema "production")

BEGIN;

-- 1) Asegura la existencia de la secuencia oficial
CREATE SEQUENCE IF NOT EXISTS production.products_id_product_seq
    AS BIGINT
    INCREMENT BY 1
    MINVALUE 1
    START WITH 1
    CACHE 1;

-- 2) Declara la relación de propiedad entre la secuencia y la columna
ALTER SEQUENCE production.products_id_product_seq
  OWNED BY production.products.id_product;

-- 3) Si el ID más alto es mayor que el segundo más alto + 1, ajusta al consecutivo correcto
WITH ordered AS (
    SELECT id_product,
           ROW_NUMBER() OVER (ORDER BY id_product DESC) AS rn
    FROM production.products
), bounds AS (
    SELECT
        MAX(CASE WHEN rn = 1 THEN id_product END) AS max_id,
        MAX(CASE WHEN rn = 2 THEN id_product END) AS second_max_id
    FROM ordered
)
UPDATE production.products p
SET id_product = COALESCE(b.second_max_id, 0) + 1
FROM bounds b
WHERE p.id_product = b.max_id
  AND b.max_id > COALESCE(b.second_max_id, 0) + 1;

-- 4) Ajusta la secuencia al nuevo máximo (mínimo 1)
SELECT setval(
    'production.products_id_product_seq',
    GREATEST(
        COALESCE((SELECT MAX(id_product) FROM production.products), 0),
        1
    ),
    true
);

-- 5) Refuerza restricciones para futuras inserciones
ALTER TABLE production.products
    ALTER COLUMN id_product SET DEFAULT nextval('production.products_id_product_seq'),
    ALTER COLUMN id_product SET NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE constraint_type = 'PRIMARY KEY'
          AND table_schema = 'production'
          AND table_name = 'products'
    ) THEN
        EXECUTE 'ALTER TABLE production.products ADD PRIMARY KEY (id_product)';
    END IF;
END;
$$;

COMMIT;
