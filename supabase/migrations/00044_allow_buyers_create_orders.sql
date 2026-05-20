-- Add RLS policies to allow buyers to create orders and order items

-- Allow buyers to insert their own orders
CREATE POLICY "Buyers can create their own orders"
  ON orders FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = buyer_id AND 
    has_role(auth.uid(), 'buyer')
  );

-- Allow buyers to insert order items for their orders
CREATE POLICY "Buyers can create order items"
  ON order_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
      AND orders.buyer_id = auth.uid()
    )
  );
