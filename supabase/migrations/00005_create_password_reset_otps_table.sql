-- Create table for storing password reset OTPs
CREATE TABLE password_reset_otps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  otp text NOT NULL,
  attempts int DEFAULT 0,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX idx_password_reset_otps_email ON password_reset_otps(email);
CREATE INDEX idx_password_reset_otps_user_id ON password_reset_otps(user_id);

-- RLS policies
ALTER TABLE password_reset_otps ENABLE ROW LEVEL SECURITY;

-- Service role can manage all OTPs
CREATE POLICY "Service role can manage OTPs"
  ON password_reset_otps FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');