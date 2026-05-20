
-- Create enum for payment methods
CREATE TYPE payment_method AS ENUM ('cash', 'upi', 'pay_later', 'card');

-- Create direct_sales table for offline/walk-in sales
CREATE TABLE direct_sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  store_name text NOT NULL,
  
  -- Customer details (optional)
  customer_name text,
  customer_mobile text,
  
  -- Sale items (stored as JSONB array)
  items jsonb NOT NULL,
  
  -- Pricing
  subtotal numeric NOT NULL,
  tax numeric DEFAULT 0,
  discount numeric DEFAULT 0,
  total numeric NOT NULL,
  
  -- Payment
  payment_method payment_method NOT NULL,
  payment_status text DEFAULT 'completed',
  
  -- Metadata
  sale_type text DEFAULT 'direct_sale',
  notes text,
  sale_date timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX idx_direct_sales_seller_id ON direct_sales(seller_id);
CREATE INDEX idx_direct_sales_sale_date ON direct_sales(sale_date DESC);
CREATE INDEX idx_direct_sales_store_name ON direct_sales(store_name);

-- Enable RLS
ALTER TABLE direct_sales ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Sellers can view their own direct sales
CREATE POLICY "Sellers can view own direct sales"
  ON direct_sales
  FOR SELECT
  TO authenticated
  USING (seller_id = auth.uid());

-- Sellers can insert their own direct sales
CREATE POLICY "Sellers can create direct sales"
  ON direct_sales
  FOR INSERT
  TO authenticated
  WITH CHECK (seller_id = auth.uid());

-- Sellers can update their own direct sales
CREATE POLICY "Sellers can update own direct sales"
  ON direct_sales
  FOR UPDATE
  TO authenticated
  USING (seller_id = auth.uid())
  WITH CHECK (seller_id = auth.uid());

-- Sellers can delete their own direct sales
CREATE POLICY "Sellers can delete own direct sales"
  ON direct_sales
  FOR DELETE
  TO authenticated
  USING (seller_id = auth.uid());

-- Add comments
COMMENT ON TABLE direct_sales IS 'Stores direct/offline sales made by sellers for walk-in customers';
COMMENT ON COLUMN direct_sales.items IS 'Array of sale items with product details, quantity, and price';
COMMENT ON COLUMN direct_sales.sale_type IS 'Type of sale: direct_sale, offline_sale, walk_in';
