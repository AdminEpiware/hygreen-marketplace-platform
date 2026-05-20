-- Add email OTP verification fields to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS email_otp TEXT,
ADD COLUMN IF NOT EXISTS otp_expiry_time TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS otp_attempts INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_email_verified BOOLEAN DEFAULT FALSE;

-- Create index for faster OTP lookups
CREATE INDEX IF NOT EXISTS idx_profiles_email_otp ON profiles(email_otp) WHERE email_otp IS NOT NULL;

-- Create index for email verification status
CREATE INDEX IF NOT EXISTS idx_profiles_email_verified ON profiles(is_email_verified);

COMMENT ON COLUMN profiles.email_otp IS 'Hashed 6-digit OTP for email verification';
COMMENT ON COLUMN profiles.otp_expiry_time IS 'Expiry time for the OTP (5 minutes from generation)';
COMMENT ON COLUMN profiles.otp_attempts IS 'Number of failed OTP verification attempts';
COMMENT ON COLUMN profiles.is_email_verified IS 'Whether the user has verified their email via OTP';