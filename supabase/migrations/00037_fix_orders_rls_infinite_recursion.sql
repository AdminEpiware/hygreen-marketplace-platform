-- Fix infinite recursion in orders and order_items RLS policies
-- The issue: order_items INSERT checks orders table, and orders SELECT checks order_items table
-- This creates a circular dependency causing infinite recursion

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Buyers can create order items" ON order_items;
DROP POLICY IF EXISTS "Buyers can view their order items" ON order_items;
DROP POLICY IF EXISTS "Sellers can view orders containing their products" ON orders;
DROP POLICY IF EXISTS "Sellers can update order status" ON orders;

-- Recreate order_items policies without circular dependency
-- For INSERT: Trust that the buyer_id in the order_items matches auth.uid()
-- The application should ensure this, and we can add a trigger for validation
CREATE POLICY "Buyers can create order items"
ON order_items
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'buyer')
);

-- For SELECT: Buyers can view order items if they match the order's buyer_id
-- Use a simpler check that doesn't cause recursion
CREATE POLICY "Buyers can view their order items"
ON order_items
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM orders o
    WHERE o.id = order_items.order_id 
    AND o.buyer_id = auth.uid()
  )
);

-- Recreate orders policies with fixed logic
-- Sellers can view orders that contain their products
CREATE POLICY "Sellers can view orders containing their products"
ON orders
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'seller')
  AND EXISTS (
    SELECT 1 FROM order_items oi
    WHERE oi.order_id = orders.id 
    AND oi.seller_id = auth.uid()
  )
);

-- Sellers can update order status for orders containing their products
CREATE POLICY "Sellers can update order status"
ON orders
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'seller')
  AND EXISTS (
    SELECT 1 FROM order_items oi
    WHERE oi.order_id = orders.id 
    AND oi.seller_id = auth.uid()
  )
)
WITH CHECK (
  has_role(auth.uid(), 'seller')
  AND EXISTS (
    SELECT 1 FROM order_items oi
    WHERE oi.order_id = orders.id 
    AND oi.seller_id = auth.uid()
  )
);

-- Add a trigger to ensure order_items buyer_id matches the order's buyer_id
-- This provides the security check we removed from the RLS policy
CREATE OR REPLACE FUNCTION validate_order_item_buyer()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if the order exists and belongs to the current user
  IF NOT EXISTS (
    SELECT 1 FROM orders 
    WHERE id = NEW.order_id 
    AND buyer_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Order does not exist or does not belong to the current user';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS validate_order_item_buyer_trigger ON order_items;

CREATE TRIGGER validate_order_item_buyer_trigger
BEFORE INSERT ON order_items
FOR EACH ROW
EXECUTE FUNCTION validate_order_item_buyer();