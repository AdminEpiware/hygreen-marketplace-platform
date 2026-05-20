-- Add store and payment configuration fields to profiles table for sellers
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS store_name text,
ADD COLUMN IF NOT EXISTS store_address text,
ADD COLUMN IF NOT EXISTS store_contact text,
ADD COLUMN IF NOT EXISTS pay_later_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS weekly_plan_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS monthly_plan_enabled boolean DEFAULT false;

-- Add comments for documentation
COMMENT ON COLUMN profiles.store_name IS 'Store name for seller accounts';
COMMENT ON COLUMN profiles.store_address IS 'Physical store address for seller accounts';
COMMENT ON COLUMN profiles.store_contact IS 'Store contact number for seller accounts';
COMMENT ON COLUMN profiles.pay_later_enabled IS 'Whether the seller store supports Pay Later payments';
COMMENT ON COLUMN profiles.weekly_plan_enabled IS 'Whether the seller store supports weekly payment plans';
COMMENT ON COLUMN profiles.monthly_plan_enabled IS 'Whether the seller store supports monthly payment plans';
