# URGENT: Fix Missing Email Column in Profiles Table

## Problem
The `profiles` table is missing the `email` column, which causes the sign-in process to timeout when looking up users by username.

## Solution
Run the migration `20241003110000_add_email_to_profiles.sql` in your Supabase SQL Editor.

## Steps to Fix

### Option 1: Run Migration in Supabase Dashboard

1. Go to your Supabase dashboard: https://supabase.com/dashboard
2. Select your project: **Eternal Realms**
3. Go to **SQL Editor** in the left sidebar
4. Click **New Query**
5. Copy and paste the contents of `supabase/migrations/20241003110000_add_email_to_profiles.sql`
6. Click **Run**

### Option 2: Quick SQL Fix

Run this SQL directly in Supabase SQL Editor:

```sql
-- Add email column
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS email TEXT NOT NULL DEFAULT '';

-- Update trigger to populate email
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, username, email)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'username',
    new.email
  )
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

### Option 3: Backfill Existing Users

If you have existing users without email, run this after adding the column:

```sql
-- Backfill emails for existing users
UPDATE profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id
AND (p.email IS NULL OR p.email = '');
```

## Verification

After running the migration, verify it worked:

```sql
-- Check table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'profiles'
ORDER BY ordinal_position;

-- Should show: id, username, email, created_at, updated_at

-- Check existing profiles have emails
SELECT id, username, email
FROM profiles
LIMIT 5;
```

## Why This Happened

The initial migration file (`20241001000000_initial_schema.sql`) was created before password-based auth was implemented. The email column was added to the documentation but not to the actual migration file.

## Files Updated

1. ✅ `supabase/migrations/20241001000000_initial_schema.sql` - Added email column to CREATE TABLE
2. ✅ `supabase/migrations/20241001000000_initial_schema.sql` - Updated handle_new_user() trigger
3. ✅ `supabase/migrations/20241003110000_add_email_to_profiles.sql` - New migration to add email column

## After Fixing

Once the migration is applied:

1. Refresh your browser at http://localhost:3001
2. Try signing in again with username `indate`
3. The profile lookup should now work correctly
4. Sign in should complete without timeout

## Test Account

Based on the screenshot, there's a test account:
- Username: `indate`
- The email should be populated from `auth.users` table

You can check the auth.users table to see what email was used:

```sql
SELECT id, email, raw_user_meta_data->>'username' as username
FROM auth.users
WHERE raw_user_meta_data->>'username' = 'indate';
```
