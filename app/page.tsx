'use client'

import { useEffect } from 'react'
import { useGameStore } from '@/lib/store'
import { getSession } from '@/lib/auth'
import { getCharacter } from '@/lib/character'
import { createClient } from '@/lib/supabase/client'
import Auth from '@/components/Auth'
import Game from '@/components/Game'

export default function Home() {
  const { user, character, setUser, setProfile, setCharacter, setLoading } = useGameStore()

  useEffect(() => {
    let mounted = true
    const supabase = createClient()

    async function initialize() {
      try {
        // Get initial session with timeout
        const sessionPromise = getSession()
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Session check timeout')), 5000)
        )

        const { session } = await Promise.race([sessionPromise, timeoutPromise]) as any

        if (!mounted) return

        if (session?.user) {
          setUser(session.user)
          await loadUserData(session.user.id)
        }
      } catch (error) {
        console.error('Session check error:', error)
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    // Run initial check
    initialize()

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Page auth state changed:', event)
      if (!mounted) return

      if (session?.user) {
        setUser(session.user)
        await loadUserData(session.user.id)
      } else {
        setUser(null)
        setProfile(null)
        setCharacter(null)
      }
      setLoading(false)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  async function loadUserData(userId: string) {
    const supabase = createClient()

    // Load profile
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (profileData) {
      setProfile(profileData)
    }

    // Load character
    const { data: characterData } = await getCharacter(userId)
    if (characterData) {
      setCharacter(characterData)
    }
  }

  // Show game if user is authenticated and has a character
  if (user && character) {
    return <Game />
  }

  // Show auth screen
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <Auth />
      </div>
    </main>
  )
}
