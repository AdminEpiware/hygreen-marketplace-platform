-- Create verification_status enum
DO $$ BEGIN
  CREATE TYPE verification_status AS ENUM ('pending', 'approved', 'rejected', 'suspended');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create pay_later_account_status enum
DO $$ BEGIN
  CREATE TYPE pay_later_account_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create invoice_type enum
DO $$ BEGIN
  CREATE TYPE invoice_type AS ENUM ('online_order', 'direct_sale');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create audit_action_type enum
DO $$ BEGIN
  CREATE TYPE audit_action_type AS ENUM (
    'seller_verification_submitted',
    'seller_verification_approved',
    'seller_verification_rejected',
    'seller_verification_suspended',
    'pay_later_application_submitted',
    'pay_later_application_approved',
    'pay_later_application_rejected',
    'invoice_generated',
    'store_pay_later_enabled',
    'store_pay_later_disabled',
    'payment_processed',
    'account_deletion_requested',
    'account_deletion_approved'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add verification fields to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS verification_status verification_status DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS business_name TEXT,
ADD COLUMN IF NOT EXISTS business_type TEXT,
ADD COLUMN IF NOT EXISTS business_address TEXT,
ADD COLUMN IF NOT EXISTS verification_document_url TEXT,
ADD COLUMN IF NOT EXISTS verification_submitted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS verification_reviewed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS verification_reviewed_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS verification_rejection_reason TEXT,
ADD COLUMN IF NOT EXISTS payment_plan TEXT CHECK (payment_plan IN ('weekly', 'monthly'));

-- Add pay_later_enabled to buyer_stores
ALTER TABLE public.buyer_stores
ADD COLUMN IF NOT EXISTS pay_later_enabled BOOLEAN DEFAULT FALSE;

-- Comments for documentation
COMMENT ON COLUMN public.profiles.verification_status IS 'Seller verification status: pending, approved, rejected, suspended';
COMMENT ON COLUMN public.buyer_stores.pay_later_enabled IS 'Whether Pay Later is enabled for this store (crown icon indicator)';