-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin(uid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = uid AND role = 'admin'
  );
$$;

-- RLS Policies for store_warnings
ALTER TABLE store_warnings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view all warnings" ON store_warnings;
CREATE POLICY "Admins can view all warnings"
  ON store_warnings FOR SELECT
  TO authenticated
  USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can create warnings" ON store_warnings;
CREATE POLICY "Admins can create warnings"
  ON store_warnings FOR INSERT
  TO authenticated
  WITH CHECK (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can update warnings" ON store_warnings;
CREATE POLICY "Admins can update warnings"
  ON store_warnings FOR UPDATE
  TO authenticated
  USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Sellers can view their own warnings" ON store_warnings;
CREATE POLICY "Sellers can view their own warnings"
  ON store_warnings FOR SELECT
  TO authenticated
  USING (store_id = auth.uid());

-- RLS Policies for support_tickets
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own tickets" ON support_tickets;
CREATE POLICY "Users can view their own tickets"
  ON support_tickets FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR is_admin(auth.uid()));

DROP POLICY IF EXISTS "Users can create tickets" ON support_tickets;
CREATE POLICY "Users can create tickets"
  ON support_tickets FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own tickets" ON support_tickets;
CREATE POLICY "Users can update their own tickets"
  ON support_tickets FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can view all tickets" ON support_tickets;
CREATE POLICY "Admins can view all tickets"
  ON support_tickets FOR SELECT
  TO authenticated
  USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can update all tickets" ON support_tickets;
CREATE POLICY "Admins can update all tickets"
  ON support_tickets FOR UPDATE
  TO authenticated
  USING (is_admin(auth.uid()));

-- RLS Policies for ticket_messages
ALTER TABLE ticket_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view messages for their tickets" ON ticket_messages;
CREATE POLICY "Users can view messages for their tickets"
  ON ticket_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM support_tickets
      WHERE id = ticket_messages.ticket_id
      AND (user_id = auth.uid() OR is_admin(auth.uid()))
    )
  );

DROP POLICY IF EXISTS "Users can create messages for their tickets" ON ticket_messages;
CREATE POLICY "Users can create messages for their tickets"
  ON ticket_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM support_tickets
      WHERE id = ticket_messages.ticket_id
      AND (user_id = auth.uid() OR is_admin(auth.uid()))
    )
  );

DROP POLICY IF EXISTS "Admins can create messages for any ticket" ON ticket_messages;
CREATE POLICY "Admins can create messages for any ticket"
  ON ticket_messages FOR INSERT
  TO authenticated
  WITH CHECK (is_admin(auth.uid()));

-- RLS Policies for admin_activity_logs
ALTER TABLE admin_activity_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view all activity logs" ON admin_activity_logs;
CREATE POLICY "Admins can view all activity logs"
  ON admin_activity_logs FOR SELECT
  TO authenticated
  USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can create activity logs" ON admin_activity_logs;
CREATE POLICY "Admins can create activity logs"
  ON admin_activity_logs FOR INSERT
  TO authenticated
  WITH CHECK (is_admin(auth.uid()) AND admin_id = auth.uid());
