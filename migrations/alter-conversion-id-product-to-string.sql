-- Migration: Change id_product from BIGINT to VARCHAR(255) in conversions table
-- Date: 2025-01-02
-- Reason: id_product should be a string identifier, not a numeric value

-- Step 1: Alter the column type
ALTER TABLE staging.conversions 
ALTER COLUMN id_product TYPE VARCHAR(255) USING id_product::VARCHAR;

-- Step 2: Verify the change
SELECT 
    column_name, 
    data_type, 
    character_maximum_length,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'staging' 
  AND table_name = 'conversions'
  AND column_name = 'id_product';

-- Expected result:
-- column_name  | data_type      | character_maximum_length | is_nullable
-- id_product   | character varying | 255                   | YES
