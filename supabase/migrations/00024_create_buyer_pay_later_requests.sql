
-- Create enum for payment plans
CREATE TYPE payment_plan AS ENUM ('weekly', 'monthly');

-- Create enum for request status
CREATE TYPE request_status AS ENUM ('pending', 'approved', 'rejected');

-- Create buyer_pay_later_requests table
CREATE TABLE buyer_pay_later_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  seller_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  store_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  store_name text NOT NULL,
  buyer_store_name text NOT NULL,
  
  -- Request details
  payment_plan payment_plan NOT NULL,
  documents jsonb NOT NULL, -- Array of document objects with type and URL
  
  -- Status and approval
  status request_status DEFAULT 'pending',
  approved_by uuid REFERENCES profiles(id),
  rejection_reason text,
  
  -- Timestamps
  requested_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_buyer_pay_later_requests_buyer_id ON buyer_pay_later_requests(buyer_id);
CREATE INDEX idx_buyer_pay_later_requests_seller_id ON buyer_pay_later_requests(seller_id);
CREATE INDEX idx_buyer_pay_later_requests_store_id ON buyer_pay_later_requests(store_id);
CREATE INDEX idx_buyer_pay_later_requests_status ON buyer_pay_later_requests(status);

-- Enable RLS
ALTER TABLE buyer_pay_later_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Buyers can view their own requests
CREATE POLICY "Buyers can view own requests"
  ON buyer_pay_later_requests
  FOR SELECT
  TO authenticated
  USING (buyer_id = auth.uid());

-- Buyers can create requests
CREATE POLICY "Buyers can create requests"
  ON buyer_pay_later_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (buyer_id = auth.uid());

-- Sellers can view requests for their store
CREATE POLICY "Sellers can view requests for their store"
  ON buyer_pay_later_requests
  FOR SELECT
  TO authenticated
  USING (seller_id = auth.uid());

-- Sellers can update requests for their store
CREATE POLICY "Sellers can update requests for their store"
  ON buyer_pay_later_requests
  FOR UPDATE
  TO authenticated
  USING (seller_id = auth.uid())
  WITH CHECK (seller_id = auth.uid());

-- Create storage bucket for pay later documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'pay-later-documents',
  'pay-later-documents',
  false, -- Private bucket
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/jpg', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- Add comments
COMMENT ON TABLE buyer_pay_later_requests IS 'Buyer requests for Pay Later access to specific stores';
COMMENT ON COLUMN buyer_pay_later_requests.documents IS 'Array of uploaded documents with type (aadhaar, company_id, govt_id) and storage URL';
COMMENT ON COLUMN buyer_pay_later_requests.payment_plan IS 'Weekly or monthly payment plan requested by buyer';
