-- Allow buyers to view seller profiles (for store listing)
CREATE POLICY "Buyers can view seller profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    role = 'seller' 
    AND verification_status = 'approved'
  );

-- Allow anyone to view approved seller profiles (for public store browsing)
CREATE POLICY "Anyone can view approved seller profiles"
  ON public.profiles FOR SELECT
  TO authenticated, anon
  USING (
    role = 'seller' 
    AND verification_status = 'approved'
  );
