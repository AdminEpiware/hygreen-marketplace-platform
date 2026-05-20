-- Update product-images bucket to allow 5MB files
UPDATE storage.buckets
SET 
  file_size_limit = 5242880, -- 5MB
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/jpg']
WHERE id = 'product-images';
