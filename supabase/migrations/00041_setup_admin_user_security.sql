-- This migration ensures that if the admin email exists, it has the admin role
-- Note: The actual user creation must be done through Supabase Auth

-- Function to automatically set admin role for specific email
CREATE OR REPLACE FUNCTION set_admin_role_for_specific_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- If the email is the designated admin email, set role to admin
  IF NEW.email = 'adminsmartgrocery@gmail.com' THEN
    NEW.role := 'admin';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to automatically set admin role on profile creation
DROP TRIGGER IF EXISTS trigger_set_admin_role ON profiles;
CREATE TRIGGER trigger_set_admin_role
  BEFORE INSERT OR UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION set_admin_role_for_specific_email();

-- Update existing profile if it exists
UPDATE profiles
SET role = 'admin'
WHERE email = 'adminsmartgrocery@gmail.com';

-- Add constraint to prevent unauthorized admin role assignment
CREATE OR REPLACE FUNCTION prevent_unauthorized_admin_assignment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Allow admin role only for the designated email
  IF NEW.role = 'admin' AND NEW.email != 'adminsmartgrocery@gmail.com' THEN
    -- Check if the user making the change is already an admin
    IF NOT EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    ) THEN
      RAISE EXCEPTION 'Unauthorized admin role assignment';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to prevent unauthorized admin assignment
DROP TRIGGER IF EXISTS trigger_prevent_unauthorized_admin ON profiles;
CREATE TRIGGER trigger_prevent_unauthorized_admin
  BEFORE INSERT OR UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION prevent_unauthorized_admin_assignment();
