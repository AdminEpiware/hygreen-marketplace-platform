-- Helper function to check user role
CREATE OR REPLACE FUNCTION public.has_role(uid uuid, role_name text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = uid AND p.role = role_name::public.user_role
  );
$$;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Products policies
CREATE POLICY "Anyone can view products"
  ON public.products FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Sellers can insert their own products"
  ON public.products FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = seller_id AND public.has_role(auth.uid(), 'seller'));

CREATE POLICY "Sellers can update their own products"
  ON public.products FOR UPDATE
  TO authenticated
  USING (auth.uid() = seller_id AND public.has_role(auth.uid(), 'seller'))
  WITH CHECK (auth.uid() = seller_id);

CREATE POLICY "Sellers can delete their own products"
  ON public.products FOR DELETE
  TO authenticated
  USING (auth.uid() = seller_id AND public.has_role(auth.uid(), 'seller'));

-- Cart policies
CREATE POLICY "Buyers can view their own cart"
  ON public.cart FOR SELECT
  TO authenticated
  USING (auth.uid() = buyer_id AND public.has_role(auth.uid(), 'buyer'));

CREATE POLICY "Buyers can insert into their own cart"
  ON public.cart FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = buyer_id AND public.has_role(auth.uid(), 'buyer'));

CREATE POLICY "Buyers can update their own cart"
  ON public.cart FOR UPDATE
  TO authenticated
  USING (auth.uid() = buyer_id AND public.has_role(auth.uid(), 'buyer'))
  WITH CHECK (auth.uid() = buyer_id);

CREATE POLICY "Buyers can delete from their own cart"
  ON public.cart FOR DELETE
  TO authenticated
  USING (auth.uid() = buyer_id AND public.has_role(auth.uid(), 'buyer'));

-- Orders policies
CREATE POLICY "Buyers can view their own orders"
  ON public.orders FOR SELECT
  TO authenticated
  USING (auth.uid() = buyer_id AND public.has_role(auth.uid(), 'buyer'));

CREATE POLICY "Sellers can view orders containing their products"
  ON public.orders FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'seller') AND
    EXISTS (
      SELECT 1 FROM public.order_items oi
      WHERE oi.order_id = id AND oi.seller_id = auth.uid()
    )
  );

CREATE POLICY "Service role can manage orders"
  ON public.orders FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Sellers can update order status"
  ON public.orders FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'seller') AND
    EXISTS (
      SELECT 1 FROM public.order_items oi
      WHERE oi.order_id = id AND oi.seller_id = auth.uid()
    )
  );

-- Order items policies
CREATE POLICY "Buyers can view their order items"
  ON public.order_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_id AND o.buyer_id = auth.uid()
    )
  );

CREATE POLICY "Sellers can view their order items"
  ON public.order_items FOR SELECT
  TO authenticated
  USING (auth.uid() = seller_id AND public.has_role(auth.uid(), 'seller'));

CREATE POLICY "Service role can manage order items"
  ON public.order_items FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- Config policies
CREATE POLICY "Anyone can view config"
  ON public.config FOR SELECT
  TO authenticated, anon
  USING (true);