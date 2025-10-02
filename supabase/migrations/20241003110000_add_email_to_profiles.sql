-- =====================================================
-- Add email column to profiles table
-- Required for password-based authentication
-- =====================================================

-- Add email column to profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS email TEXT NOT NULL DEFAULT '';

-- Update handle_new_user trigger to populate email
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, username, email)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'username',
    new.email
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger if it doesn't exist
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Add comment
COMMENT ON COLUMN profiles.email IS 'User email from auth.users - used for sign in';
