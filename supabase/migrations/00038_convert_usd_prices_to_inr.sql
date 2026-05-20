-- Convert USD-style prices to proper INR values
-- Products with prices < 10 INR are likely USD prices that need conversion
-- Using exchange rate: 1 USD = 83 INR (approximate)

-- Update Fresh Tomatoes: $2.99 → ₹248 (rounded to ₹250 for simplicity)
UPDATE products
SET price = 250.00
WHERE name = 'Fresh Tomatoes' 
AND price = 2.99;

-- Update Green Apples: $3.49 → ₹290 (rounded to ₹290)
UPDATE products
SET price = 290.00
WHERE name = 'Green Apples' 
AND price = 3.49;

-- Note: Eggs at ₹6/piece is reasonable for INR, so we keep it as is
-- Most other products already have correct INR prices

-- Verify all products now have reasonable INR prices
-- Minimum price should be at least ₹5 for most grocery items (except per-piece items)