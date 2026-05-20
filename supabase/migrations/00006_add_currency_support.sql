-- Add country and currency_preference to profiles table
ALTER TABLE profiles
ADD COLUMN country text,
ADD COLUMN currency_preference text DEFAULT 'USD';

-- Add base_currency to products table
ALTER TABLE products
ADD COLUMN base_currency text DEFAULT 'USD';

-- Create exchange_rates table
CREATE TABLE exchange_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  currency_code text UNIQUE NOT NULL,
  rate numeric(10, 6) NOT NULL,
  updated_at timestamptz DEFAULT now()
);

-- Insert initial exchange rates (base currency: USD)
INSERT INTO exchange_rates (currency_code, rate) VALUES
('USD', 1.000000),
('INR', 83.120000),
('GBP', 0.790000),
('EUR', 0.920000),
('AUD', 1.520000),
('CAD', 1.360000),
('JPY', 149.500000),
('CNY', 7.240000);

-- Create index for faster lookups
CREATE INDEX idx_exchange_rates_currency ON exchange_rates(currency_code);