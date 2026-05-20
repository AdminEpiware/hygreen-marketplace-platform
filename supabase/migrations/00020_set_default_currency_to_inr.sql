
-- Update products table default currency to INR
ALTER TABLE products ALTER COLUMN base_currency SET DEFAULT 'INR';

-- Update profiles table default currency preference to INR
ALTER TABLE profiles ALTER COLUMN currency_preference SET DEFAULT 'INR';

-- Update existing products with USD to INR (optional - can be done gradually)
UPDATE products SET base_currency = 'INR' WHERE base_currency = 'USD' OR base_currency IS NULL;

-- Update existing profiles with USD to INR (optional - can be done gradually)
UPDATE profiles SET currency_preference = 'INR' WHERE currency_preference = 'USD' OR currency_preference IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN products.base_currency IS 'Product base currency, defaults to INR (Indian Rupees)';
COMMENT ON COLUMN profiles.currency_preference IS 'User preferred currency, defaults to INR (Indian Rupees)';
