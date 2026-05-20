-- Create reviews table
CREATE TABLE public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  buyer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(product_id, buyer_id, order_id)
);

-- Create review_responses table
CREATE TABLE public.review_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL REFERENCES public.reviews(id) ON DELETE CASCADE UNIQUE,
  seller_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  response_text text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_reviews_product_id ON public.reviews(product_id);
CREATE INDEX idx_reviews_buyer_id ON public.reviews(buyer_id);
CREATE INDEX idx_reviews_order_id ON public.reviews(order_id);
CREATE INDEX idx_review_responses_review_id ON public.review_responses(review_id);
CREATE INDEX idx_review_responses_seller_id ON public.review_responses(seller_id);

-- Add columns to products table for caching average rating and review count
ALTER TABLE public.products 
ADD COLUMN average_rating numeric(3,2) DEFAULT 0,
ADD COLUMN review_count integer DEFAULT 0;

-- Function to update product rating statistics
CREATE OR REPLACE FUNCTION update_product_rating_stats()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.products
  SET 
    average_rating = (
      SELECT COALESCE(ROUND(AVG(rating)::numeric, 2), 0)
      FROM public.reviews
      WHERE product_id = COALESCE(NEW.product_id, OLD.product_id)
    ),
    review_count = (
      SELECT COUNT(*)
      FROM public.reviews
      WHERE product_id = COALESCE(NEW.product_id, OLD.product_id)
    )
  WHERE id = COALESCE(NEW.product_id, OLD.product_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Trigger to update product rating stats on review insert/update/delete
CREATE TRIGGER trigger_update_product_rating_stats
AFTER INSERT OR UPDATE OR DELETE ON public.reviews
FOR EACH ROW
EXECUTE FUNCTION update_product_rating_stats();

-- RLS Policies for reviews table
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Buyers can view all reviews
CREATE POLICY "Anyone can view reviews"
ON public.reviews FOR SELECT
TO authenticated
USING (true);

-- Buyers can insert reviews for their own delivered orders
CREATE POLICY "Buyers can insert reviews for delivered orders"
ON public.reviews FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = buyer_id AND
  EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_id
    AND o.buyer_id = auth.uid()
    AND o.order_status = 'delivered'
  )
);

-- Buyers can update their own reviews
CREATE POLICY "Buyers can update own reviews"
ON public.reviews FOR UPDATE
TO authenticated
USING (auth.uid() = buyer_id)
WITH CHECK (auth.uid() = buyer_id);

-- Buyers can delete their own reviews
CREATE POLICY "Buyers can delete own reviews"
ON public.reviews FOR DELETE
TO authenticated
USING (auth.uid() = buyer_id);

-- RLS Policies for review_responses table
ALTER TABLE public.review_responses ENABLE ROW LEVEL SECURITY;

-- Anyone can view review responses
CREATE POLICY "Anyone can view review responses"
ON public.review_responses FOR SELECT
TO authenticated
USING (true);

-- Sellers can insert responses for reviews of their products
CREATE POLICY "Sellers can insert responses for their product reviews"
ON public.review_responses FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.reviews r
    JOIN public.products p ON r.product_id = p.id
    WHERE r.id = review_id
    AND p.seller_id = auth.uid()
  )
);

-- Sellers can update their own responses
CREATE POLICY "Sellers can update own responses"
ON public.review_responses FOR UPDATE
TO authenticated
USING (seller_id = auth.uid())
WITH CHECK (seller_id = auth.uid());

-- Sellers can delete their own responses
CREATE POLICY "Sellers can delete own responses"
ON public.review_responses FOR DELETE
TO authenticated
USING (seller_id = auth.uid());