-- Add product_code and barcode columns to products table
ALTER TABLE products
ADD COLUMN product_code text,
ADD COLUMN barcode text;

-- Add unique constraints
ALTER TABLE products
ADD CONSTRAINT products_product_code_key UNIQUE (product_code);

ALTER TABLE products
ADD CONSTRAINT products_barcode_key UNIQUE (barcode);

-- Create index on seller_id for better query performance
CREATE INDEX IF NOT EXISTS idx_products_seller_id ON products(seller_id);