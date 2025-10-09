-- =====================================================
-- SCRIPT: Creación de tabla production.conversions
-- FECHA: 2025-10-08
-- PROPÓSITO: Migración del endpoint de conversiones a producción
-- =====================================================

-- Paso 1: Verificar que el schema production existe
CREATE SCHEMA IF NOT EXISTS production;

-- Paso 2: Crear la tabla conversions en production
CREATE TABLE IF NOT EXISTS production.conversions (
  id BIGSERIAL PRIMARY KEY,
  customer_id BIGINT NOT NULL,
  tracking VARCHAR(255) NOT NULL,
  id_product VARCHAR(50),
  msisdn VARCHAR(20),
  empello_token VARCHAR(300),
  source VARCHAR(50) NOT NULL,
  status_post_back SMALLINT,
  date_post_back TIMESTAMP,
  campaign VARCHAR(20),
  country VARCHAR(10),
  operator VARCHAR(50),
  conversion_date TIMESTAMP DEFAULT NOW(),
  
  -- Foreign Key hacia production.customers
  CONSTRAINT fk_conversions_customer 
    FOREIGN KEY (customer_id) 
    REFERENCES production.customers(id_customer)
    ON DELETE CASCADE
);

-- Paso 3: Crear índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_conversions_tracking 
  ON production.conversions(tracking);

CREATE INDEX IF NOT EXISTS idx_conversions_customer_id 
  ON production.conversions(customer_id);

CREATE INDEX IF NOT EXISTS idx_conversions_conversion_date 
  ON production.conversions(conversion_date);

CREATE INDEX IF NOT EXISTS idx_conversions_source 
  ON production.conversions(source);

CREATE INDEX IF NOT EXISTS idx_conversions_customer_tracking 
  ON production.conversions(customer_id, tracking);

-- Paso 4: Agregar comentarios a la tabla
COMMENT ON TABLE production.conversions IS 
  'Tabla de conversiones para Google Ads y otras fuentes. Registra eventos de conversión con tracking único por cliente.';

COMMENT ON COLUMN production.conversions.id IS 
  'Identificador único de la conversión';

COMMENT ON COLUMN production.conversions.customer_id IS 
  'ID del cliente (FK a production.customers)';

COMMENT ON COLUMN production.conversions.tracking IS 
  'Código único de tracking de la conversión';

COMMENT ON COLUMN production.conversions.source IS 
  'Fuente de la conversión (google, facebook, etc)';

COMMENT ON COLUMN production.conversions.conversion_date IS 
  'Fecha y hora de registro de la conversión';

-- Verificación final
SELECT 
  'production.conversions' as tabla_creada,
  COUNT(*) as registros_actuales
FROM production.conversions;

-- Mostrar estructura de la tabla
\d production.conversions

-- Mostrar índices creados
SELECT 
  indexname, 
  indexdef 
FROM pg_indexes 
WHERE schemaname = 'production' 
  AND tablename = 'conversions';
