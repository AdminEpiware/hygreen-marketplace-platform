-- Enable RLS on all new tables
ALTER TABLE buyer_stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE seller_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE seller_payment_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE pay_later_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_deletion_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for buyer_stores
CREATE POLICY "Users can view their own stores"
  ON buyer_stores FOR SELECT
  TO authenticated
  USING (buyer_id = auth.uid());

CREATE POLICY "Users can create their own stores"
  ON buyer_stores FOR INSERT
  TO authenticated
  WITH CHECK (buyer_id = auth.uid());

CREATE POLICY "Users can update their own stores"
  ON buyer_stores FOR UPDATE
  TO authenticated
  USING (buyer_id = auth.uid());

CREATE POLICY "Users can delete their own stores"
  ON buyer_stores FOR DELETE
  TO authenticated
  USING (buyer_id = auth.uid());

-- RLS Policies for seller_verifications
CREATE POLICY "Sellers can view their own verifications"
  ON seller_verifications FOR SELECT
  TO authenticated
  USING (seller_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Sellers can create their own verifications"
  ON seller_verifications FOR INSERT
  TO authenticated
  WITH CHECK (seller_id = auth.uid());

CREATE POLICY "Sellers can update their own verifications"
  ON seller_verifications FOR UPDATE
  TO authenticated
  USING (seller_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- RLS Policies for seller_payment_plans
CREATE POLICY "Sellers can view their own payment plans"
  ON seller_payment_plans FOR SELECT
  TO authenticated
  USING (seller_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Sellers can create their own payment plans"
  ON seller_payment_plans FOR INSERT
  TO authenticated
  WITH CHECK (seller_id = auth.uid());

CREATE POLICY "Sellers can update their own payment plans"
  ON seller_payment_plans FOR UPDATE
  TO authenticated
  USING (seller_id = auth.uid());

-- RLS Policies for pay_later_accounts
CREATE POLICY "Users can view their own pay later accounts"
  ON pay_later_accounts FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Users can create their own pay later accounts"
  ON pay_later_accounts FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own pay later accounts"
  ON pay_later_accounts FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- RLS Policies for support_tickets
CREATE POLICY "Users can view their own tickets"
  ON support_tickets FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Users can create their own tickets"
  ON support_tickets FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own tickets"
  ON support_tickets FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- RLS Policies for account_deletion_requests
CREATE POLICY "Users can view their own deletion requests"
  ON account_deletion_requests FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Users can create their own deletion requests"
  ON account_deletion_requests FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can update deletion requests"
  ON account_deletion_requests FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));