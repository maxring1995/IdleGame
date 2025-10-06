/**
 * Quests Store - Centralized caching for quest data
 *
 * Prevents duplicate API calls for quest data
 */

import { create } from 'zustand'
import { createClient } from '@/utils/supabase/client'
import type { Quest, QuestProgress } from '@/lib/supabase'

interface QuestsStore {
  // Cached data
  availableQuests: Quest[]
  activeQuests: QuestProgress[]
  completedQuests: QuestProgress[]

  // Loading states
  isLoading: boolean
  error: string | null

  // Last fetch timestamp
  lastFetch: number | null

  // Actions
  fetchQuests: (characterId: string) => Promise<void>
  invalidateCache: () => void
  reset: () => void
}

const CACHE_DURATION_MS = 2 * 60 * 1000 // 2 minutes

export const useQuestsStore = create<QuestsStore>((set, get) => ({
  availableQuests: [],
  activeQuests: [],
  completedQuests: [],
  isLoading: false,
  error: null,
  lastFetch: null,

  fetchQuests: async (characterId: string) => {
    const { lastFetch, isLoading } = get()

    // Skip if already loading
    if (isLoading) return

    // Skip if cache is fresh
    if (lastFetch && Date.now() - lastFetch < CACHE_DURATION_MS) {
      return
    }

    set({ isLoading: true, error: null })

    try {
      const supabase = createClient()

      // Fetch all quests
      const { data: quests, error: questsError } = await supabase
        .from('quests')
        .select('*')

      if (questsError) throw questsError

      // Fetch character's quest progress
      const { data: progress, error: progressError } = await supabase
        .from('character_quests')
        .select('*, quest:quests(*)')
        .eq('character_id', characterId)

      if (progressError) throw progressError

      const activeQuests = (progress || []).filter(p => p.status === 'active')
      const completedQuests = (progress || []).filter(p => p.status === 'completed')
      const activeQuestIds = new Set(progress?.map(p => p.quest_id))

      const availableQuests = (quests || []).filter(q => !activeQuestIds.has(q.id))

      set({
        availableQuests,
        activeQuests,
        completedQuests,
        lastFetch: Date.now(),
        isLoading: false
      })
    } catch (error: any) {
      set({
        error: error.message,
        isLoading: false
      })
    }
  },

  invalidateCache: () => {
    set({ lastFetch: null })
  },

  reset: () => {
    set({
      availableQuests: [],
      activeQuests: [],
      completedQuests: [],
      isLoading: false,
      error: null,
      lastFetch: null
    })
  }
}))
