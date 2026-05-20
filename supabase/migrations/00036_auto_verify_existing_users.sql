-- Auto-verify existing users who registered before email verification was implemented
-- This ensures existing users can login without being blocked

UPDATE profiles
SET is_email_verified = true
WHERE is_email_verified = false
  AND created_at < '2026-04-27 00:00:00'::timestamptz;

-- Also handle NULL values (if any)
UPDATE profiles
SET is_email_verified = true
WHERE is_email_verified IS NULL;