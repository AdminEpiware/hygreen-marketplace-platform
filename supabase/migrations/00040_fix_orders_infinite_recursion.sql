
-- Drop existing policies that cause recursion
DROP POLICY IF EXISTS "Buyers can view their own orders" ON orders;
DROP POLICY IF EXISTS "Sellers can view orders containing their products" ON orders;
DROP POLICY IF EXISTS "Sellers can update order status" ON orders;
DROP POLICY IF EXISTS "Buyers can view their order items" ON order_items;

-- Create helper function to check if user can view order (without recursion)
CREATE OR REPLACE FUNCTION can_view_order(order_id uuid, user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM orders o
    WHERE o.id = order_id
    AND (
      -- Buyer can view their own orders
      (o.buyer_id = user_id AND has_role(user_id, 'buyer'))
      OR
      -- Seller can view orders containing their products
      (has_role(user_id, 'seller') AND o.seller_id = user_id)
    )
  );
$$;

-- Create helper function to check if user can update order (without recursion)
CREATE OR REPLACE FUNCTION can_update_order(order_id uuid, user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM orders o
    WHERE o.id = order_id
    AND has_role(user_id, 'seller')
    AND o.seller_id = user_id
  );
$$;

-- Recreate orders policies without recursion
CREATE POLICY "Buyers can view their own orders"
ON orders
FOR SELECT
TO authenticated
USING (
  (auth.uid() = buyer_id AND has_role(auth.uid(), 'buyer'))
  OR
  (has_role(auth.uid(), 'seller') AND auth.uid() = seller_id)
);

CREATE POLICY "Sellers can update order status"
ON orders
FOR UPDATE
TO authenticated
USING (can_update_order(id, auth.uid()))
WITH CHECK (can_update_order(id, auth.uid()));

-- Recreate order_items policies without recursion
CREATE POLICY "Buyers can view their order items"
ON order_items
FOR SELECT
TO authenticated
USING (can_view_order(order_id, auth.uid()));

-- Add comment explaining the fix
COMMENT ON FUNCTION can_view_order IS 'Helper function to check order view permissions without causing infinite recursion in RLS policies';
COMMENT ON FUNCTION can_update_order IS 'Helper function to check order update permissions without causing infinite recursion in RLS policies';
