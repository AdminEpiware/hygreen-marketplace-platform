-- Create cart_items table with store support
CREATE TABLE IF NOT EXISTS public.cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  buyer_store_id UUID NOT NULL REFERENCES public.buyer_stores(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(buyer_id, buyer_store_id, product_id)
);

-- Create indexes for performance
CREATE INDEX idx_cart_items_buyer_id ON public.cart_items(buyer_id);
CREATE INDEX idx_cart_items_buyer_store_id ON public.cart_items(buyer_store_id);
CREATE INDEX idx_cart_items_product_id ON public.cart_items(product_id);

-- Add RLS policies for cart_items
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;

-- Policy: Buyers can view their own cart items
CREATE POLICY "Buyers can view their own cart items"
ON public.cart_items FOR SELECT
TO authenticated
USING (auth.uid() = buyer_id);

-- Policy: Buyers can insert their own cart items
CREATE POLICY "Buyers can insert their own cart items"
ON public.cart_items FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = buyer_id);

-- Policy: Buyers can update their own cart items
CREATE POLICY "Buyers can update their own cart items"
ON public.cart_items FOR UPDATE
TO authenticated
USING (auth.uid() = buyer_id);

-- Policy: Buyers can delete their own cart items
CREATE POLICY "Buyers can delete their own cart items"
ON public.cart_items FOR DELETE
TO authenticated
USING (auth.uid() = buyer_id);

-- Add contact_number to buyer_stores table
ALTER TABLE public.buyer_stores
ADD COLUMN IF NOT EXISTS contact_number TEXT;

-- Add comment for documentation
COMMENT ON TABLE public.cart_items IS 'Shopping cart items for buyers, isolated by store';
COMMENT ON COLUMN public.cart_items.buyer_store_id IS 'Reference to buyer store for data isolation';
COMMENT ON COLUMN public.buyer_stores.contact_number IS 'Contact number for store-specific deliveries';