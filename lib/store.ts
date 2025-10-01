import { create } from 'zustand'
import { Character, Profile } from './supabase'
import { User } from '@supabase/supabase-js'

interface GameState {
  // Auth state
  user: User | null
  profile: Profile | null
  character: Character | null
  isLoading: boolean
  error: string | null

  // Actions
  setUser: (user: User | null) => void
  setProfile: (profile: Profile | null) => void
  setCharacter: (character: Character | null) => void
  setLoading: (isLoading: boolean) => void
  setError: (error: string | null) => void

  // Character updates
  updateCharacterStats: (updates: Partial<Character>) => void

  // Reset
  reset: () => void
}

export const useGameStore = create<GameState>((set) => ({
  // Initial state
  user: null,
  profile: null,
  character: null,
  isLoading: true,
  error: null,

  // Actions
  setUser: (user) => set({ user }),
  setProfile: (profile) => set({ profile }),
  setCharacter: (character) => set({ character }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),

  updateCharacterStats: (updates) =>
    set((state) => ({
      character: state.character
        ? { ...state.character, ...updates }
        : null,
    })),

  reset: () =>
    set({
      user: null,
      profile: null,
      character: null,
      isLoading: false,
      error: null,
    }),
}))
