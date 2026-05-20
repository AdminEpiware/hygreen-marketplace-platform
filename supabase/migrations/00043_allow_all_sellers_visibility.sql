-- Update RLS policies to allow buyers to view ALL sellers (not just approved)
-- This allows all registered sellers to be visible as stores immediately

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Anyone can view approved seller profiles" ON profiles;
DROP POLICY IF EXISTS "Buyers can view seller profiles" ON profiles;

-- Create new policies that allow viewing ALL sellers
CREATE POLICY "Anyone can view all seller profiles"
  ON profiles FOR SELECT
  TO anon, authenticated
  USING (role = 'seller');

CREATE POLICY "Authenticated users can view all seller profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (role = 'seller');
