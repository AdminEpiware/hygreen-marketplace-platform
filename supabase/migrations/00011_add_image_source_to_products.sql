-- Create image_source enum type
CREATE TYPE public.image_source AS ENUM ('upload', 'google', 'default');

-- Add image_source column to products table
ALTER TABLE public.products
ADD COLUMN image_source public.image_source NOT NULL DEFAULT 'default';

-- Update existing products with images to have 'default' source
UPDATE public.products
SET image_source = 'default'
WHERE image_url IS NOT NULL;

-- Create index for faster queries
CREATE INDEX idx_products_image_source ON public.products(image_source);

-- Add comment for documentation
COMMENT ON COLUMN public.products.image_source IS 'Source of product image: upload (Supabase Storage), google (external URL), or default (category placeholder)';
