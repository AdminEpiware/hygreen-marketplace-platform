-- Create buyer_stores table for multi-store management
CREATE TABLE IF NOT EXISTS buyer_stores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  store_name text NOT NULL,
  delivery_address text NOT NULL,
  is_active boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add buyer_store_id to cart table
ALTER TABLE cart ADD COLUMN IF NOT EXISTS buyer_store_id uuid REFERENCES buyer_stores(id) ON DELETE CASCADE;

-- Add buyer_store_id to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS buyer_store_id uuid REFERENCES buyer_stores(id) ON DELETE SET NULL;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_buyer_stores_buyer_id ON buyer_stores(buyer_id);
CREATE INDEX IF NOT EXISTS idx_cart_buyer_store_id ON cart(buyer_store_id);
CREATE INDEX IF NOT EXISTS idx_orders_buyer_store_id ON orders(buyer_store_id);

-- Create seller_verifications table
CREATE TABLE IF NOT EXISTS seller_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  business_name text NOT NULL,
  business_type text NOT NULL CHECK (business_type IN ('individual', 'company')),
  business_address text NOT NULL,
  contact_number text NOT NULL,
  aadhaar_number text,
  company_id text,
  document_url text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  rejection_reason text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT verification_document_check CHECK (
    (business_type = 'individual' AND aadhaar_number IS NOT NULL) OR
    (business_type = 'company' AND company_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_seller_verifications_seller_id ON seller_verifications(seller_id);
CREATE INDEX IF NOT EXISTS idx_seller_verifications_status ON seller_verifications(status);

-- Create seller_payment_plans table
CREATE TABLE IF NOT EXISTS seller_payment_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  plan_type text NOT NULL CHECK (plan_type IN ('weekly', 'monthly')),
  start_date timestamptz DEFAULT now(),
  next_due_date timestamptz NOT NULL,
  amount numeric(10, 2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'cancelled')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_seller_payment_plans_seller_id ON seller_payment_plans(seller_id);

-- Create pay_later_accounts table
CREATE TABLE IF NOT EXISTS pay_later_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  store_id uuid REFERENCES buyer_stores(id) ON DELETE CASCADE,
  account_holder_name text NOT NULL,
  aadhaar_number text,
  company_id text,
  document_url text,
  credit_limit numeric(10, 2) NOT NULL DEFAULT 0,
  outstanding_balance numeric(10, 2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'suspended')),
  terms_accepted boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT pay_later_document_check CHECK (
    (aadhaar_number IS NOT NULL) OR (company_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_pay_later_accounts_user_id ON pay_later_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_pay_later_accounts_store_id ON pay_later_accounts(store_id);

-- Create support_tickets table
CREATE TABLE IF NOT EXISTS support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  store_id uuid REFERENCES buyer_stores(id) ON DELETE SET NULL,
  issue_type text NOT NULL CHECK (issue_type IN ('account', 'payment', 'order', 'product', 'other')),
  subject text NOT NULL,
  description text NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  admin_notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);

-- Create account_deletion_requests table
CREATE TABLE IF NOT EXISTS account_deletion_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  request_date timestamptz DEFAULT now(),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_notes text,
  has_pending_payments boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_account_deletion_requests_user_id ON account_deletion_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_account_deletion_requests_status ON account_deletion_requests(status);

-- Add profile_photo_url and verification_status to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS profile_photo_url text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS verification_status text DEFAULT 'unverified' CHECK (verification_status IN ('unverified', 'pending', 'verified', 'rejected'));