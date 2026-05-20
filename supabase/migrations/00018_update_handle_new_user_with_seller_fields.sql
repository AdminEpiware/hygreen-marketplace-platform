-- Update handle_new_user function to include seller store and payment fields
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
user_count int;
detected_currency text;
BEGIN
SELECT COUNT(*) INTO user_count FROM profiles;

-- Get country from metadata and detect currency
detected_currency := COALESCE(NEW.raw_user_meta_data->>'country', 'United States');

-- Insert a profile synced with fields collected at signup
INSERT INTO public.profiles (
  id, 
  email, 
  full_name, 
  mobile_number, 
  address, 
  country, 
  currency_preference, 
  role,
  store_name,
  store_address,
  store_contact,
  pay_later_enabled,
  weekly_plan_enabled,
  monthly_plan_enabled
)
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
  CASE WHEN user_count = 0 THEN 'seller'::public.user_role ELSE (NEW.raw_user_meta_data->>'role')::public.user_role END,
  NEW.raw_user_meta_data->>'store_name',
  NEW.raw_user_meta_data->>'store_address',
  NEW.raw_user_meta_data->>'store_contact',
  COALESCE((NEW.raw_user_meta_data->>'pay_later_enabled')::boolean, false),
  COALESCE((NEW.raw_user_meta_data->>'weekly_plan_enabled')::boolean, false),
  COALESCE((NEW.raw_user_meta_data->>'monthly_plan_enabled')::boolean, false)
);
RETURN NEW;
END;
$$;
