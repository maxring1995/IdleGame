# Authentication Timeout Fix - October 2, 2025

## Problem
Users experiencing timeout issues during authentication (sign up and sign in). The UI would get stuck with "Loading..." indefinitely.

## Root Causes Identified

1. **Middleware hanging** - `getUser()` call in middleware could hang indefinitely
2. **Auth operations hanging** - `signUp()` and `signIn()` had no timeout protection
3. **Database queries hanging** - Profile lookups could hang without timeout
4. **Load user data hanging** - Character/profile loading had no timeout limit

## Solutions Implemented

### 1. Middleware Timeout Protection (`lib/supabase/middleware.ts`)
```typescript
// Added 3-second timeout to auth check in middleware
try {
  const userPromise = supabase.auth.getUser()
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Auth timeout')), 3000)
  )
  await Promise.race([userPromise, timeoutPromise])
} catch (error) {
  // Log but don't fail - allow request to continue
  console.error('Middleware auth error:', error)
}
```

### 2. Sign Up Timeout Protection (`lib/auth.ts`)
```typescript
// Added 10-second timeout to signUp operation
const signUpPromise = supabase.auth.signUp({ email, password, options })
const timeoutPromise = new Promise((_, reject) =>
  setTimeout(() => reject(new Error('Sign up request timeout')), 10000)
)
const { data, error } = await Promise.race([signUpPromise, timeoutPromise])
```

### 3. Sign In Timeout Protection (`lib/auth.ts`)
```typescript
// Added 5-second timeout to profile lookup
const profilePromise = supabase.from('profiles').select('email').eq('username', username).single()
const timeoutPromise = new Promise((_, reject) =>
  setTimeout(() => reject(new Error('Profile lookup timeout')), 5000)
)
const { data: profile } = await Promise.race([profilePromise, timeoutPromise])

// Added 10-second timeout to signIn operation
const signInPromise = supabase.auth.signInWithPassword({ email, password })
const timeoutPromise = new Promise((_, reject) =>
  setTimeout(() => reject(new Error('Sign in request timeout')), 10000)
)
const { data, error } = await Promise.race([signInPromise, timeoutPromise])
```

### 4. Load User Data Timeout Protection (`components/Auth.tsx`)
```typescript
// Wrapped entire loadUserData function with 10-second timeout
const loadDataPromise = async () => {
  // Load profile with retry logic
  // Load character
}

const timeoutPromise = new Promise((_, reject) =>
  setTimeout(() => reject(new Error('Loading timeout - please try again')), 10000)
)

await Promise.race([loadDataPromise(), timeoutPromise])
```

### 5. Enhanced Logging
Added detailed console logs to track authentication flow:
- `[signUp]` - Sign up operations
- `[signIn]` - Sign in operations
- `[Auth]` - Component-level auth state changes
- Middleware auth errors logged but don't block requests

## Timeout Values

| Operation | Timeout | Reason |
|-----------|---------|--------|
| Middleware `getUser()` | 3 seconds | Fast fail to avoid blocking requests |
| Profile lookup | 5 seconds | Database query should be quick |
| Sign up/Sign in | 10 seconds | Network roundtrip + auth processing |
| Load user data | 10 seconds | Multiple database queries |
| Session check (page.tsx) | 5 seconds | Already implemented |
| Form submission safety | 15 seconds | Already implemented |

## Testing Checklist

- [ ] Sign up with new account (times out gracefully if Supabase is slow)
- [ ] Sign in with username (profile lookup has timeout)
- [ ] Sign in with email (direct auth has timeout)
- [ ] Middleware doesn't block page loads
- [ ] Console shows detailed auth flow logs
- [ ] Error messages are user-friendly

## Expected Behavior

**Before Fix:**
- Loading spinner never goes away
- No error message shown
- User forced to refresh page
- Console shows no errors

**After Fix:**
- Loading spinner clears after timeout (max 10-15 seconds)
- Clear error message shown to user
- Console shows where timeout occurred
- User can retry immediately without refresh

## Browser Console Messages

Successful auth flow will show:
```
[signUp] Creating Supabase client...
[signUp] Calling Supabase signUp API...
[signUp] Supabase response: { hasData: true, error: null }
Auth state changed: SIGNED_IN
```

Timeout will show:
```
[signUp] Creating Supabase client...
[signUp] Calling Supabase signUp API...
[signUp] Error: Sign up request timeout
```

## Files Modified

1. `lib/supabase/middleware.ts` - Added timeout to middleware auth check
2. `lib/auth.ts` - Added timeouts to signUp and signIn
3. `components/Auth.tsx` - Added timeout to loadUserData

## Related Issues

- Previous timeout issues documented in `AUTHENTICATION.md`
- SSR compatibility issues documented in `BUGFIX_REPORT.md`

## Next Steps

If timeouts still occur:
1. Check Supabase dashboard for service status
2. Verify `.env.local` credentials are correct
3. Test network connectivity to Supabase instance
4. Check browser console for specific timeout messages
5. Increase timeout values if needed (currently conservative)

## Monitoring

Watch for these console errors:
- `Middleware auth error: Auth timeout`
- `Sign up request timeout`
- `Sign in request timeout`
- `Profile lookup timeout`
- `Loading timeout - please try again`

These indicate where the bottleneck is occurring.
