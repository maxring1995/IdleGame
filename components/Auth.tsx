'use client'

import { useState, useEffect } from 'react'
import { useGameStore } from '@/lib/store'
import { signUp, signIn, getSession } from '@/lib/auth'
import { getCharacter } from '@/lib/character'
import { createClient } from '@/lib/supabase/client'
import CharacterCreation from './CharacterCreation'

export default function Auth() {
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showCharacterCreation, setShowCharacterCreation] = useState(false)

  const { user, profile, character, setUser, setProfile, setCharacter } = useGameStore()

  // Check if Supabase is configured
  const isSupabaseConfigured =
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
    !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project-url')

  // Auth state listener - this component doesn't need to check session
  // since page.tsx already handles that
  useEffect(() => {
    const supabase = createClient()

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session?.user?.id)
      if (session?.user) {
        setUser(session.user)
        await loadUserData(session.user.id)
      } else {
        setUser(null)
        setProfile(null)
        setCharacter(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function loadUserData(userId: string) {
    try {
      const supabase = createClient()

      // Load profile with retry logic
      let profileData = null
      let attempts = 0
      const maxAttempts = 3

      while (!profileData && attempts < maxAttempts) {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single()

        profileData = data
        if (!profileData && attempts < maxAttempts - 1) {
          // Wait a bit before retrying (profile might still be creating via trigger)
          await new Promise(resolve => setTimeout(resolve, 500))
        }
        attempts++
      }

      if (profileData) {
        setProfile(profileData)
      } else {
        throw new Error('Profile not found. Please try again.')
      }

      // Load character
      const { data: characterData } = await getCharacter(userId)
      if (characterData) {
        setCharacter(characterData)
      } else {
        setShowCharacterCreation(true)
      }

      // Successfully loaded - clear loading state
      setIsLoading(false)
    } catch (err) {
      console.error('Error loading user data:', err)
      setError((err as Error).message || 'Failed to load user data. Please refresh the page.')
      setIsLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    // Prevent multiple concurrent submissions
    if (isLoading) {
      console.log('Submission already in progress, ignoring...')
      return
    }

    setError(null)
    setIsLoading(true)

    // Safety timeout - force clear loading after 15 seconds
    const timeoutId = setTimeout(() => {
      console.error('Auth timeout - forcing clear of loading state')
      setIsLoading(false)
      setError('Request timed out. Please try again.')
    }, 15000)

    try {
      // Validate username
      if (username.length < 3 || username.length > 20) {
        throw new Error('Username must be between 3 and 20 characters')
      }

      if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        throw new Error('Username can only contain letters, numbers, and underscores')
      }

      if (isSignUp) {
        if (!email) {
          throw new Error('Email is required')
        }
        if (!password) {
          throw new Error('Password is required')
        }
        if (password !== confirmPassword) {
          throw new Error('Passwords do not match')
        }

        console.log('Attempting signup...')
        const { data, error } = await signUp(username, email, password)
        if (error) throw error

        // Manually load user data after signup
        if (data?.user) {
          console.log('Signup successful, loading user data...')
          setUser(data.user)
          await loadUserData(data.user.id)
        } else {
          throw new Error('Failed to create user')
        }
      } else {
        if (!password) {
          throw new Error('Password is required')
        }

        console.log('Attempting signin...')
        const { data, error } = await signIn(username || email, password)
        if (error) throw error

        // Manually load user data after signin
        if (data?.user) {
          console.log('Signin successful, loading user data...')
          setUser(data.user)
          await loadUserData(data.user.id)
        } else {
          throw new Error('Failed to sign in')
        }
      }

      // Clear timeout on success
      clearTimeout(timeoutId)
    } catch (err: any) {
      console.error('Auth error:', err)
      clearTimeout(timeoutId)
      setError(err.message || 'An error occurred')
      setIsLoading(false)
    }
  }

  // If user is authenticated but has no character, show character creation
  if (user && !character && showCharacterCreation) {
    return <CharacterCreation userId={user.id} />
  }

  // If user is fully set up, they shouldn't see this component
  if (user && character) {
    return null
  }

  return (
    <div className="bg-bg-panel rounded-lg p-8 shadow-lg backdrop-blur-xl border border-white/10">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-primary mb-2">Eternal Realms</h1>
        <p className="text-gray-400">Begin your adventure</p>
      </div>

      {!isSupabaseConfigured && (
        <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/50 rounded-lg">
          <p className="text-yellow-400 text-sm font-medium mb-2">⚠️ Supabase Not Configured</p>
          <p className="text-yellow-300/80 text-xs">
            Please configure your Supabase credentials in <code className="bg-black/30 px-1 rounded">.env.local</code>
            <br />
            See README.md for setup instructions.
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {isSignUp && (
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your.email@example.com"
              className="w-full px-4 py-3 bg-bg-card border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition"
              required={isSignUp}
              disabled={isLoading}
            />
          </div>
        )}

        <div>
          <label htmlFor="username" className="block text-sm font-medium text-gray-300 mb-2">
            Username
          </label>
          <input
            id="username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Choose your username"
            className="w-full px-4 py-3 bg-bg-card border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition"
            required
            minLength={3}
            maxLength={20}
            pattern="[a-zA-Z0-9_]+"
            disabled={isLoading}
          />
          <p className="mt-2 text-xs text-gray-500">
            3-20 characters, letters, numbers, and underscores only
          </p>
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            className="w-full px-4 py-3 bg-bg-card border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition"
            required
            minLength={8}
            disabled={isLoading}
          />
          {isSignUp && (
            <p className="mt-2 text-xs text-gray-500">
              At least 8 characters with uppercase, lowercase, and number
            </p>
          )}
        </div>

        {isSignUp && (
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-2">
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm your password"
              className="w-full px-4 py-3 bg-bg-card border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition"
              required
              minLength={8}
              disabled={isLoading}
            />
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3 px-4 bg-primary text-bg-dark font-semibold rounded-lg hover:bg-primary-dark transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Loading...' : isSignUp ? 'Create Account' : 'Sign In'}
        </button>

        <button
          type="button"
          onClick={() => setIsSignUp(!isSignUp)}
          className="w-full text-sm text-gray-400 hover:text-primary transition"
          disabled={isLoading}
        >
          {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
        </button>
      </form>

      <div className="mt-8 pt-6 border-t border-white/10">
        <p className="text-xs text-gray-500 text-center">
          Your progress is saved automatically.
          <br />
          Keep your username safe to access your character.
        </p>
      </div>
    </div>
  )
}
