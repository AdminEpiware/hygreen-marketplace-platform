
-- Add order_type to orders table for classification
ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_type text DEFAULT 'online';

-- Add check constraint to ensure valid values
ALTER TABLE orders ADD CONSTRAINT orders_order_type_check 
CHECK (order_type IN ('online', 'direct'));

-- Create index for faster filtering
CREATE INDEX IF NOT EXISTS idx_orders_order_type ON orders(order_type);

-- Add comment
COMMENT ON COLUMN orders.order_type IS 'Type of order: online (app orders) or direct (walk-in sales)';
