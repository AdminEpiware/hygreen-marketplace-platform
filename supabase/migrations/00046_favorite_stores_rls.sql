-- Enable RLS on favorite_stores table
ALTER TABLE favorite_stores ENABLE ROW LEVEL SECURITY;

-- Buyers can view their own favorites
CREATE POLICY "Buyers can view their own favorites"
  ON favorite_stores FOR SELECT
  TO authenticated
  USING (
    auth.uid() = buyer_id AND 
    has_role(auth.uid(), 'buyer')
  );

-- Buyers can add stores to favorites
CREATE POLICY "Buyers can add favorites"
  ON favorite_stores FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = buyer_id AND 
    has_role(auth.uid(), 'buyer')
  );

-- Buyers can remove stores from favorites
CREATE POLICY "Buyers can remove favorites"
  ON favorite_stores FOR DELETE
  TO authenticated
  USING (
    auth.uid() = buyer_id AND 
    has_role(auth.uid(), 'buyer')
  );

-- Admins can view all favorites
CREATE POLICY "Admins can view all favorites"
  ON favorite_stores FOR SELECT
  TO authenticated
  USING (is_admin(auth.uid()));
