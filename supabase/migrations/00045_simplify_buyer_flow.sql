-- Create favorites table for buyers to save their favorite stores
CREATE TABLE IF NOT EXISTS favorite_stores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  seller_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(buyer_id, seller_id)
);

-- Add seller_id to cart table (will be populated from products.seller_id)
ALTER TABLE cart 
ADD COLUMN IF NOT EXISTS seller_id uuid REFERENCES profiles(id) ON DELETE CASCADE;

-- Add seller_id to orders table (will be populated from order_items)
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS seller_id uuid REFERENCES profiles(id) ON DELETE CASCADE;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_favorite_stores_buyer_id ON favorite_stores(buyer_id);
CREATE INDEX IF NOT EXISTS idx_favorite_stores_seller_id ON favorite_stores(seller_id);
CREATE INDEX IF NOT EXISTS idx_cart_seller_id ON cart(seller_id);
CREATE INDEX IF NOT EXISTS idx_orders_seller_id ON orders(seller_id);

-- Migrate existing cart data: populate seller_id from products
UPDATE cart
SET seller_id = p.seller_id
FROM products p
WHERE cart.product_id = p.id
AND cart.seller_id IS NULL;

-- Add comment explaining the schema change
COMMENT ON TABLE favorite_stores IS 'Stores that buyers have marked as favorites for quick access';
COMMENT ON COLUMN cart.seller_id IS 'Direct reference to seller (store) - replaces buyer_store_id concept';
COMMENT ON COLUMN orders.seller_id IS 'Direct reference to seller (store) - replaces buyer_store_id concept';
