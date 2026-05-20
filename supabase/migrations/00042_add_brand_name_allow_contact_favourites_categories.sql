
-- 1. Add brand_name to products
ALTER TABLE products ADD COLUMN brand_name text;

-- 2. Add allow_buyer_contact to profiles (seller setting)
ALTER TABLE profiles ADD COLUMN allow_buyer_contact boolean NOT NULL DEFAULT false;

-- 3. Create product_favourites table
CREATE TABLE product_favourites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (buyer_id, product_id)
);
ALTER TABLE product_favourites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Buyers manage own favourites" ON product_favourites
  FOR ALL TO authenticated
  USING (buyer_id = auth.uid())
  WITH CHECK (buyer_id = auth.uid());

-- 4. Create categories table (dynamic, hierarchical)
CREATE TABLE categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  parent_id uuid REFERENCES categories(id) ON DELETE CASCADE,
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
-- All authenticated users can read; only admins (role='admin') can write
CREATE POLICY "Anyone can read categories" ON categories
  FOR SELECT USING (true);
CREATE POLICY "Admins manage categories" ON categories
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- 5. Seed all categories
INSERT INTO categories (name, sort_order) VALUES
  ('Grocery & Essentials', 1),
  ('Fruits & Vegetables', 2),
  ('Dairy Products', 3),
  ('Snacks & Beverages', 4),
  ('Bakery Items', 5),
  ('Frozen Foods', 6),
  ('Meat & Seafood', 7),
  ('Organic Products', 8),
  ('Household Items', 9),
  ('Cleaning Supplies', 10),
  ('Kitchen Accessories', 11),
  ('Fashion & Clothing', 12),
  ('Men''s Wear', 13),
  ('Women''s Wear', 14),
  ('Kids'' Wear', 15),
  ('Footwear', 16),
  ('Bags & Accessories', 17),
  ('Cosmetics & Beauty Products', 18),
  ('Personal Care Products', 19),
  ('Health & Wellness', 20),
  ('Medicines & Pharmacy', 21),
  ('Baby Care Products', 22),
  ('Sports & Fitness Items', 23),
  ('Gym Equipment', 24),
  ('Electronics', 25),
  ('Mobile Phones & Accessories', 26),
  ('Computers & Laptops', 27),
  ('Home Appliances', 28),
  ('Furniture', 29),
  ('Home Decor', 30),
  ('Stationery & Office Supplies', 31),
  ('Books & Educational Products', 32),
  ('Toys & Games', 33),
  ('Pet Food & Pet Accessories', 34),
  ('Automobile Accessories', 35),
  ('Gardening Products', 36),
  ('Jewelry & Watches', 37),
  ('Gift Items', 38),
  ('Religious & Festival Products', 39),
  ('Hardware & Tools', 40),
  ('Industrial Products', 41),
  ('Agricultural Products', 42),
  ('Farmer Products & Fresh Produce', 43);
