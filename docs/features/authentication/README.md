# Authentication System Documentation

Documentation for the Authentication System in Eternal Realms.

## 📚 Documents

- **[AUTHENTICATION.md](AUTHENTICATION.md)** - Authentication system architecture

## 🔐 Authentication System Overview

Username-based authentication with auto-generated emails and passwords.

### Features
- **Username-Only Signup**: No email required
- **Auto-Generated Emails**: `username@example.com`
- **Auto-Generated Passwords**: Random 32-character passwords
- **Local Storage**: Passwords stored in localStorage for recovery
- **Supabase Auth**: JWT tokens and session management

### Authentication Flow

**Sign Up:**
1. User enters username
2. System generates email: `username@example.com`
3. System generates random 32-char password
4. Password stored in localStorage: `eternalrealms_auth_${username}`
5. Supabase creates auth user
6. Profile and character records created

**Sign In:**
1. User enters username
2. System retrieves password from localStorage
3. If not found, prompts for password
4. Supabase authenticates
5. Load profile and character data

**Sign Out:**
1. Clear Supabase session
2. Clear Zustand store
3. Redirect to login page

### Key Files
- `lib/auth.ts` - Authentication logic
- `components/Auth.tsx` - Login/signup UI
- `app/actions.ts` - Server actions for auth

## 🔒 Security Considerations

⚠️ **IMPORTANT**: This is a **low-security** design for ease-of-use:
- Passwords stored in localStorage (not secure)
- Auto-generated emails may conflict
- No email verification
- No password reset flow

**Use Cases:**
- Development/testing
- Single-player local games
- Non-critical applications

**NOT Recommended For:**
- Production applications with sensitive data
- Multi-user systems requiring security
- Applications handling personal information

## 🧪 Testing

**Unit Tests**:
- `npm test test/unit/auth.test.ts`
- `npm test test/unit/auth-integration.test.ts`

**E2E Tests**:
- `npx playwright test test/e2e/auth.spec.ts`
- `npx playwright test test/e2e/signin.spec.ts`
- `npx playwright test test/e2e/password-auth.spec.ts`

## 📖 Related Documentation

- [Testing Guide](../../guides/TESTING.md)
- [Troubleshooting](../../guides/TROUBLESHOOTING.md)

---

**Last Updated:** 2025-10-04
