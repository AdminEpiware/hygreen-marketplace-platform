-- Drop existing table
DROP TABLE IF EXISTS public.pay_later_accounts CASCADE;

-- Create pay_later_accounts table with correct schema
CREATE TABLE public.pay_later_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_holder_name TEXT NOT NULL,
  account_type TEXT NOT NULL CHECK (account_type IN ('individual', 'company')),
  aadhaar_number TEXT,
  company_id TEXT,
  document_url TEXT NOT NULL,
  requested_credit_limit NUMERIC(10, 2) NOT NULL,
  assigned_credit_limit NUMERIC(10, 2),
  used_credit NUMERIC(10, 2) DEFAULT 0,
  available_credit NUMERIC(10, 2) DEFAULT 0,
  status pay_later_account_status DEFAULT 'pending',
  terms_accepted BOOLEAN DEFAULT FALSE,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id),
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(buyer_id)
);

-- Create indexes
CREATE INDEX idx_pay_later_accounts_buyer_id ON public.pay_later_accounts(buyer_id);
CREATE INDEX idx_pay_later_accounts_status ON public.pay_later_accounts(status);

-- Enable RLS
ALTER TABLE public.pay_later_accounts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Buyers view own account"
ON public.pay_later_accounts FOR SELECT
TO authenticated
USING (buyer_id = auth.uid());

CREATE POLICY "Buyers insert own application"
ON public.pay_later_accounts FOR INSERT
TO authenticated
WITH CHECK (buyer_id = auth.uid());

CREATE POLICY "Buyers update own application"
ON public.pay_later_accounts FOR UPDATE
TO authenticated
USING (buyer_id = auth.uid());

-- Function to update available credit
CREATE OR REPLACE FUNCTION update_available_credit()
RETURNS TRIGGER AS $$
BEGIN
  NEW.available_credit := COALESCE(NEW.assigned_credit_limit, 0) - COALESCE(NEW.used_credit, 0);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_available_credit
BEFORE INSERT OR UPDATE ON public.pay_later_accounts
FOR EACH ROW
EXECUTE FUNCTION update_available_credit();

COMMENT ON TABLE public.pay_later_accounts IS 'Pay Later credit accounts for buyers with Aadhaar/Company ID verification';