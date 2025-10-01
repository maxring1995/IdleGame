# Authentication System

## Overview

The Eternal Realms authentication system uses **password-based authentication** with Supabase Auth, implementing proper server-side rendering (SSR) and automatic session refresh for Next.js App Router.

## Features

✅ **Cross-Browser Authentication** - Sign in from any device with username/email and password
✅ **Password Validation** - Strong password requirements enforced
✅ **Username or Email Login** - Flexible sign-in options
✅ **Race Condition Protection** - Prevents multiple concurrent submissions
✅ **Profile Retry Logic** - Handles database trigger delays gracefully
✅ **Automatic Session Refresh** - Middleware refreshes sessions on every request
✅ **SSR-Compatible** - Proper client/server separation for Next.js App Router
✅ **Timeout Protection** - 5-second timeout on session checks prevents hanging

## Sign Up

Users can create an account with:
- **Email** (required)
- **Username** (3-20 characters, alphanumeric and underscores only)
- **Password** (minimum 8 characters)

### Password Requirements

- At least 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- Maximum 72 characters

### Example

```typescript
import { signUp } from '@/lib/auth'

const { data, error } = await signUp(
  'myusername',
  'user@example.com',
  'SecurePass123'
)

if (error) {
  console.error('Signup failed:', error.message)
} else {
  console.log('User created:', data.user.id)
}
```

## Sign In

Users can sign in with either:
- **Username** + Password
- **Email** + Password

The system automatically detects whether the input is an email (contains @) or username.

### Example

```typescript
import { signIn } from '@/lib/auth'

// Sign in with username
const { data, error } = await signIn('myusername', 'SecurePass123')

// Sign in with email
const { data, error } = await signIn('user@example.com', 'SecurePass123')

if (error) {
  console.error('Sign in failed:', error.message)
} else {
  console.log('Signed in as:', data.user.email)
}
```

## Database Schema

### Profiles Table

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  username TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Trigger

Automatically creates profile when user signs up:

```sql
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, username, email)
  VALUES (new.id, new.raw_user_meta_data->>'username', new.email);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

## Session Management

Sessions are managed by Supabase Auth with proper Next.js SSR integration:
- **Automatically persisted** across page reloads
- **Secure HTTP-only cookies** stored by Supabase
- **Token refresh via middleware** - `middleware.ts` refreshes sessions on every request
- **Works across browsers/devices** - No localStorage dependencies
- **Client/Server separation** - Separate clients for browser and server components

### Architecture

```
middleware.ts
  ↓ Refreshes session on every request
  ↓ Sets cookies for both server and browser

lib/supabase/
  ├── client.ts       - Browser client (Client Components)
  ├── server.ts       - Server client (Server Components)
  └── middleware.ts   - Session refresh logic
```

All auth functions (`signUp`, `signIn`, `signOut`, `getSession`) now create fresh clients using the SSR-aware `createBrowserClient` from `@supabase/ssr` package.

## Security

### ✅ Implemented

- Strong password validation
- SQL injection prevention (Supabase handles this)
- XSS protection (React handles this)
- CSRF protection (Supabase handles this)
- Secure password storage (bcrypt via Supabase)
- Race condition prevention
- Email verification (can be enabled in Supabase dashboard)

### 🔒 Best Practices

1. **Never store passwords in localStorage**
2. **Always validate input on both client and server**
3. **Use HTTPS in production**
4. **Enable email verification for production**
5. **Implement rate limiting for auth endpoints**

## Testing

### Unit Tests

```bash
npm test
```

Tests include:
- Password validation
- Username validation
- Concurrent submission prevention
- Profile loading with retry logic

### E2E Tests

```bash
npm run test:e2e
```

Tests include:
- Account creation flow
- Cross-browser sign-in
- Username and email login
- Password validation
- Wrong password rejection

## Troubleshooting

### Issue: "User already registered"

**Cause**: Email is already in use
**Solution**: Use a different email or sign in with existing account

### Issue: "Invalid login credentials"

**Cause**: Wrong username/email or password
**Solution**: Double-check credentials or create a new account

### Issue: "Password must contain at least one uppercase letter"

**Cause**: Password doesn't meet requirements
**Solution**: Use a password with uppercase, lowercase, and number

### Issue: Loading state stuck / Auth timeout

**Cause**: Session check hanging indefinitely (common issue with Supabase SSR)
**Solution**: Fixed in latest version with:
- 5-second timeout on `getSession()` calls in `page.tsx`
- Proper middleware session refresh
- SSR-compatible Supabase clients using `@supabase/ssr`

### Issue: Profile creation delayed

**Cause**: Database trigger takes time to create profile
**Solution**: Retry logic (up to 3 attempts with 500ms delay)

### Issue: Session not persisting after refresh

**Cause**: Missing middleware or incorrect Supabase client
**Solution**: Ensure `middleware.ts` exists and all functions use `createClient()` from `lib/supabase/client.ts`

## Migration from Old System

The old system used localStorage-only authentication. To migrate:

1. **Database**: Email column added to profiles table
2. **Auth Functions**: Updated to require password parameter
3. **UI**: Added password and confirm password fields
4. **Tests**: Updated to include password in all auth flows

### Breaking Changes

- `signUp(username, email?)` → `signUp(username, email, password)`
- `signIn(username)` → `signIn(emailOrUsername, password)`
- localStorage credentials no longer used

## Recent Fixes (2025-10-02)

### Authentication Hanging/Timeout Issues

**Problem**: Users experienced indefinite loading states when signing up or signing in. The UI would get stuck with "Loading..." and never complete.

**Root Causes**:
1. Using basic `createClient` from `@supabase/supabase-js` instead of SSR-aware client
2. No middleware to refresh sessions automatically
3. Duplicate session checks creating race conditions
4. No timeout protection on auth operations

**Solutions Implemented**:
1. ✅ Installed `@supabase/ssr` package for proper Next.js App Router support
2. ✅ Created separate client utilities:
   - `lib/supabase/client.ts` - Browser client for client components
   - `lib/supabase/server.ts` - Server client for server components
   - `lib/supabase/middleware.ts` - Session refresh logic
3. ✅ Added `middleware.ts` to automatically refresh sessions on every request
4. ✅ Updated all library functions to create fresh clients per operation
5. ✅ Added 5-second timeout protection in `page.tsx` session check
6. ✅ Removed duplicate session checks between `page.tsx` and `Auth.tsx`
7. ✅ Added cleanup handlers to prevent memory leaks

**Result**: Authentication now works smoothly without hanging or timing out.

## Future Enhancements

- [ ] Password reset via email
- [ ] Social auth (Google, GitHub, etc.)
- [ ] Two-factor authentication (2FA)
- [ ] Account recovery options
- [ ] Remember me functionality
- [ ] Session timeout configuration

## API Reference

### `signUp(username: string, email: string, password: string)`

Creates a new user account.

**Returns**: `Promise<{ data, error }>`

### `signIn(emailOrUsername: string, password: string)`

Signs in an existing user.

**Returns**: `Promise<{ data, error }>`

### `signOut()`

Signs out the current user.

**Returns**: `Promise<{ error }>`

### `getSession()`

Gets the current session with timeout protection.

**Returns**: `Promise<{ session, error }>`

**Note**: In `page.tsx`, this is wrapped with a 5-second timeout to prevent hanging.

### `getUser()`

Gets the current user (validates with Supabase Auth server).

**Returns**: `Promise<{ user, error }>`

**Note**: Use this for authentication checks as it revalidates the token on every call.

### `validatePassword(password: string)`

Validates password strength.

**Returns**: `string | null` (error message or null if valid)

### `checkUsernameAvailability(username: string)`

Checks if a username is available.

**Returns**: `Promise<boolean>`

## Browser Compatibility

✅ Chrome/Edge (Chromium)
✅ Firefox
✅ Safari
⚠️ Non-standard browsers (like Comet) may have compatibility issues

**Recommendation**: Use standard browsers for best experience.
