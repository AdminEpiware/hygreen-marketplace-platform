-- Create invoices table
CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT NOT NULL UNIQUE,
  invoice_type invoice_type NOT NULL,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  seller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  buyer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  customer_name TEXT,
  customer_contact TEXT,
  store_name TEXT NOT NULL,
  store_address TEXT NOT NULL,
  store_contact TEXT,
  items JSONB NOT NULL,
  subtotal NUMERIC(10, 2) NOT NULL,
  tax NUMERIC(10, 2) NOT NULL,
  total_amount NUMERIC(10, 2) NOT NULL,
  payment_type TEXT,
  payment_status TEXT,
  invoice_date TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for invoices
CREATE INDEX IF NOT EXISTS idx_invoices_seller_id ON public.invoices(seller_id);
CREATE INDEX IF NOT EXISTS idx_invoices_buyer_id ON public.invoices(buyer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_order_id ON public.invoices(order_id);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_number ON public.invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_date ON public.invoices(invoice_date);

-- Enable RLS for invoices
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- RLS Policies for invoices
CREATE POLICY "Sellers view own invoices"
ON public.invoices FOR SELECT
TO authenticated
USING (seller_id = auth.uid());

CREATE POLICY "Buyers view own invoices"
ON public.invoices FOR SELECT
TO authenticated
USING (buyer_id = auth.uid());

CREATE POLICY "Sellers insert own invoices"
ON public.invoices FOR INSERT
TO authenticated
WITH CHECK (seller_id = auth.uid());

CREATE POLICY "Sellers update own invoices"
ON public.invoices FOR UPDATE
TO authenticated
USING (seller_id = auth.uid());

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_role TEXT,
  action_type audit_action_type NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  action_status TEXT DEFAULT 'success',
  ip_address TEXT,
  before_state JSONB,
  after_state JSONB,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for audit_logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_type ON public.audit_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_id ON public.audit_logs(entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at);

-- Enable RLS for audit_logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policy for audit_logs (admin only)
CREATE POLICY "Admins view audit logs"
ON public.audit_logs FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Function to generate invoice number
CREATE OR REPLACE FUNCTION generate_invoice_number(seller_uuid UUID)
RETURNS TEXT AS $$
DECLARE
  invoice_date TEXT;
  sequence_num INTEGER;
  invoice_num TEXT;
BEGIN
  invoice_date := TO_CHAR(NOW(), 'YYYYMMDD');
  
  SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM '[0-9]+$') AS INTEGER)), 0) + 1
  INTO sequence_num
  FROM public.invoices
  WHERE seller_id = seller_uuid
  AND invoice_date::DATE = NOW()::DATE;
  
  invoice_num := SUBSTRING(seller_uuid::TEXT FROM 1 FOR 8) || '-' || invoice_date || '-' || LPAD(sequence_num::TEXT, 4, '0');
  
  RETURN invoice_num;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comments
COMMENT ON TABLE public.invoices IS 'Invoices for online orders and direct store sales';
COMMENT ON TABLE public.audit_logs IS 'Comprehensive audit trail for compliance and traceability';