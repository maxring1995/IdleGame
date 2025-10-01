import { createClient } from './supabase/client'

/**
 * Validate password strength
 */
export function validatePassword(password: string): string | null {
  if (password.length < 8) {
    return 'Password must be at least 8 characters'
  }
  if (password.length > 72) {
    return 'Password must be less than 72 characters'
  }
  if (!/[a-z]/.test(password)) {
    return 'Password must contain at least one lowercase letter'
  }
  if (!/[A-Z]/.test(password)) {
    return 'Password must contain at least one uppercase letter'
  }
  if (!/[0-9]/.test(password)) {
    return 'Password must contain at least one number'
  }
  return null
}

/**
 * Sign up a new user with email, username, and password
 */
export async function signUp(username: string, email: string, password: string) {
  try {
    const supabase = createClient()

    // Validate password
    const passwordError = validatePassword(password)
    if (passwordError) {
      throw new Error(passwordError)
    }

    console.log('Calling Supabase signUp API...')
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username,
        },
      },
    })

    console.log('Supabase response:', { data, error })

    if (error) throw error

    return { data, error: null }
  } catch (error) {
    console.error('Sign up error:', error)

    // Better error messages for common issues
    const errorMessage = (error as any)?.message || String(error)

    if (errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError')) {
      return { data: null, error: new Error('Network error. Please check your internet connection.') }
    }
    if (errorMessage.includes('User already registered')) {
      return { data: null, error: new Error('This email is already registered. Please sign in instead.') }
    }

    return { data: null, error: error instanceof Error ? error : new Error(String(error)) }
  }
}

/**
 * Sign in with email or username and password
 */
export async function signIn(emailOrUsername: string, password: string) {
  try {
    const supabase = createClient()
    let email = emailOrUsername

    // If not an email, look up email by username
    if (!emailOrUsername.includes('@')) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('email')
        .eq('username', emailOrUsername)
        .single()

      if (!profile?.email) {
        throw new Error('Invalid login credentials')
      }

      email = profile.email
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) throw error

    return { data, error: null }
  } catch (error) {
    console.error('Sign in error:', error)
    return { data: null, error }
  }
}

/**
 * Sign out current user
 */
export async function signOut() {
  try {
    const supabase = createClient()
    const { error } = await supabase.auth.signOut()
    if (error) throw error

    return { error: null }
  } catch (error) {
    console.error('Sign out error:', error)
    return { error }
  }
}

/**
 * Get current user session
 */
export async function getSession() {
  const supabase = createClient()
  const { data: { session }, error } = await supabase.auth.getSession()
  return { session, error }
}

export async function getUser() {
  const supabase = createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  return { user, error }
}

/**
 * Check if username is available
 */
export async function checkUsernameAvailability(username: string): Promise<boolean> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('profiles')
    .select('username')
    .eq('username', username)
    .single()

  return !data && !error
}
