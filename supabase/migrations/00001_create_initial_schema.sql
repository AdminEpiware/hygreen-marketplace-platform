-- Create user_role enum
CREATE TYPE public.user_role AS ENUM ('buyer', 'seller');

-- Create profiles table
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text NOT NULL,
  mobile_number text NOT NULL,
  address text NOT NULL,
  role public.user_role NOT NULL DEFAULT 'buyer'::public.user_role,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create trigger function for new user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, mobile_number, address, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'mobile_number', ''),
    COALESCE(NEW.raw_user_meta_data->>'address', ''),
    COALESCE((NEW.raw_user_meta_data->>'role')::public.user_role, 'buyer'::public.user_role)
  );
  RETURN NEW;
END;
$$;

-- Create trigger on auth.users
CREATE TRIGGER on_auth_user_confirmed
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  WHEN (OLD.confirmed_at IS NULL AND NEW.confirmed_at IS NOT NULL)
  EXECUTE FUNCTION public.handle_new_user();

-- Create product categories enum
CREATE TYPE public.product_category AS ENUM ('vegetables', 'fruits', 'grocery', 'dairy', 'bakery', 'meat', 'beverages', 'snacks');

-- Create products table
CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  category public.product_category NOT NULL,
  price numeric(10, 2) NOT NULL CHECK (price > 0),
  unit text NOT NULL DEFAULT 'kg',
  available_quantity numeric(10, 2) NOT NULL CHECK (available_quantity >= 0),
  description text,
  image_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create cart table
CREATE TABLE public.cart (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity numeric(10, 2) NOT NULL CHECK (quantity > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(buyer_id, product_id)
);

-- Create order status enum
CREATE TYPE public.order_status AS ENUM ('placed', 'confirmed', 'packed', 'delivered', 'cancelled');

-- Create payment type enum
CREATE TYPE public.payment_type AS ENUM ('cash_on_delivery', 'online_payment', 'weekly_plan', 'monthly_plan');

-- Create payment status enum
CREATE TYPE public.payment_status AS ENUM ('pending', 'completed', 'failed');

-- Create orders table
CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text UNIQUE NOT NULL,
  buyer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  delivery_address text NOT NULL,
  payment_type public.payment_type NOT NULL,
  payment_status public.payment_status NOT NULL DEFAULT 'pending'::public.payment_status,
  order_status public.order_status NOT NULL DEFAULT 'placed'::public.order_status,
  subtotal numeric(12, 2) NOT NULL,
  tax numeric(12, 2) NOT NULL,
  total_amount numeric(12, 2) NOT NULL,
  due_date timestamptz,
  stripe_session_id text,
  stripe_payment_intent_id text,
  customer_email text,
  customer_name text,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create order_items table
CREATE TABLE public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  seller_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  product_name text NOT NULL,
  product_category public.product_category NOT NULL,
  price numeric(10, 2) NOT NULL,
  unit text NOT NULL,
  quantity numeric(10, 2) NOT NULL,
  item_total numeric(12, 2) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create config table for tax settings
CREATE TABLE public.config (
  key text PRIMARY KEY,
  value text NOT NULL,
  description text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Insert default tax rate
INSERT INTO public.config (key, value, description) VALUES ('tax_rate', '0.05', 'Tax rate as decimal (e.g., 0.05 = 5%)');

-- Create function to generate order number
CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  new_order_number text;
  order_count int;
BEGIN
  SELECT COUNT(*) INTO order_count FROM public.orders;
  new_order_number := 'ORD-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD((order_count + 1)::text, 6, '0');
  RETURN new_order_number;
END;
$$;

-- Create trigger to auto-generate order number
CREATE OR REPLACE FUNCTION public.set_order_number()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.order_number IS NULL OR NEW.order_number = '' THEN
    NEW.order_number := public.generate_order_number();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_set_order_number
  BEFORE INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.set_order_number();

-- Create storage bucket for product images
INSERT INTO storage.buckets (id, name, public) VALUES ('product-images', 'product-images', true);

-- Create storage policy for product images
CREATE POLICY "Public read access for product images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'product-images');

CREATE POLICY "Authenticated users can upload product images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'product-images');

CREATE POLICY "Users can update their own product images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'product-images');

CREATE POLICY "Users can delete their own product images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'product-images');

-- Create indexes
CREATE INDEX idx_products_seller_id ON public.products(seller_id);
CREATE INDEX idx_products_category ON public.products(category);
CREATE INDEX idx_cart_buyer_id ON public.cart(buyer_id);
CREATE INDEX idx_orders_buyer_id ON public.orders(buyer_id);
CREATE INDEX idx_orders_order_number ON public.orders(order_number);
CREATE INDEX idx_orders_payment_status ON public.orders(payment_status);
CREATE INDEX idx_orders_order_status ON public.orders(order_status);
CREATE INDEX idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX idx_order_items_seller_id ON public.order_items(seller_id);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.config ENABLE ROW LEVEL SECURITY;