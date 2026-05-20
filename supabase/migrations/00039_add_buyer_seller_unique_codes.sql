-- Add unique buyer and seller codes to profiles table
-- Format: BUY-0001, BUY-0002 for buyers
--         SEL-0001, SEL-0002 for sellers

-- Add columns for buyer and seller codes
ALTER TABLE profiles
ADD COLUMN buyer_code TEXT UNIQUE,
ADD COLUMN seller_code TEXT UNIQUE;

-- Create sequences for generating unique numbers
CREATE SEQUENCE IF NOT EXISTS buyer_code_seq START 1;
CREATE SEQUENCE IF NOT EXISTS seller_code_seq START 1;

-- Function to generate buyer code
CREATE OR REPLACE FUNCTION generate_buyer_code()
RETURNS TEXT AS $$
DECLARE
  next_num INTEGER;
  new_code TEXT;
BEGIN
  -- Get next sequence number
  next_num := nextval('buyer_code_seq');
  
  -- Format as BUY-XXXX (4 digits, zero-padded)
  new_code := 'BUY-' || LPAD(next_num::TEXT, 4, '0');
  
  RETURN new_code;
END;
$$ LANGUAGE plpgsql;

-- Function to generate seller code
CREATE OR REPLACE FUNCTION generate_seller_code()
RETURNS TEXT AS $$
DECLARE
  next_num INTEGER;
  new_code TEXT;
BEGIN
  -- Get next sequence number
  next_num := nextval('seller_code_seq');
  
  -- Format as SEL-XXXX (4 digits, zero-padded)
  new_code := 'SEL-' || LPAD(next_num::TEXT, 4, '0');
  
  RETURN new_code;
END;
$$ LANGUAGE plpgsql;

-- Function to auto-generate codes based on role
CREATE OR REPLACE FUNCTION auto_generate_user_codes()
RETURNS TRIGGER AS $$
BEGIN
  -- Generate buyer code if role is buyer and code doesn't exist
  IF NEW.role = 'buyer' AND NEW.buyer_code IS NULL THEN
    NEW.buyer_code := generate_buyer_code();
  END IF;
  
  -- Generate seller code if role is seller and code doesn't exist
  IF NEW.role = 'seller' AND NEW.seller_code IS NULL THEN
    NEW.seller_code := generate_seller_code();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-generate codes on insert
DROP TRIGGER IF EXISTS auto_generate_user_codes_trigger ON profiles;

CREATE TRIGGER auto_generate_user_codes_trigger
BEFORE INSERT ON profiles
FOR EACH ROW
EXECUTE FUNCTION auto_generate_user_codes();

-- Update existing users to have codes
-- For buyers
UPDATE profiles
SET buyer_code = generate_buyer_code()
WHERE role = 'buyer' AND buyer_code IS NULL;

-- For sellers
UPDATE profiles
SET seller_code = generate_seller_code()
WHERE role = 'seller' AND seller_code IS NULL;

-- For admins (they might need both codes if they also buy/sell)
-- We'll leave them NULL for now, can be generated if needed

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_buyer_code ON profiles(buyer_code);
CREATE INDEX IF NOT EXISTS idx_profiles_seller_code ON profiles(seller_code);