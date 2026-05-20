
-- Drop existing global unique constraints
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_barcode_key;
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_product_code_key;

-- Add store-level unique constraints
-- Product code must be unique within a store (but can be NULL)
CREATE UNIQUE INDEX products_seller_product_code_unique 
ON products (seller_id, product_code) 
WHERE product_code IS NOT NULL;

-- Barcode must be unique within a store (but can be NULL)
CREATE UNIQUE INDEX products_seller_barcode_unique 
ON products (seller_id, barcode) 
WHERE barcode IS NOT NULL;

-- Add comment for documentation
COMMENT ON INDEX products_seller_product_code_unique IS 'Ensures product_code is unique within each store (seller_id), allowing NULL values';
COMMENT ON INDEX products_seller_barcode_unique IS 'Ensures barcode is unique within each store (seller_id), allowing NULL values';
