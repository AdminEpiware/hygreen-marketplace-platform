-- Drop existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_confirmed ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

-- Recreate function with country support
CREATE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
user_count int;
detected_currency text;
BEGIN
SELECT COUNT(*) INTO user_count FROM profiles;

-- Get country from metadata and detect currency
detected_currency := COALESCE(NEW.raw_user_meta_data->>'country', 'United States');

-- Insert a profile synced with fields collected at signup
INSERT INTO public.profiles (id, email, full_name, mobile_number, address, country, currency_preference, role)
VALUES (
  NEW.id,
  NEW.email,
  NEW.raw_user_meta_data->>'full_name',
  NEW.raw_user_meta_data->>'mobile_number',
  NEW.raw_user_meta_data->>'address',
  NEW.raw_user_meta_data->>'country',
  CASE 
    WHEN NEW.raw_user_meta_data->>'country' = 'India' THEN 'INR'
    WHEN NEW.raw_user_meta_data->>'country' = 'United Kingdom' THEN 'GBP'
    WHEN NEW.raw_user_meta_data->>'country' LIKE '%Germany%' OR NEW.raw_user_meta_data->>'country' LIKE '%France%' OR NEW.raw_user_meta_data->>'country' LIKE '%Italy%' OR NEW.raw_user_meta_data->>'country' LIKE '%Spain%' THEN 'EUR'
    ELSE 'USD'
  END,
  CASE WHEN user_count = 0 THEN 'seller'::public.user_role ELSE (NEW.raw_user_meta_data->>'role')::public.user_role END
);
RETURN NEW;
END;
$$;

-- Recreate trigger
CREATE TRIGGER on_auth_user_confirmed
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  WHEN (OLD.confirmed_at IS NULL AND NEW.confirmed_at IS NOT NULL)
  EXECUTE FUNCTION handle_new_user();