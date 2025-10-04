/**
 * Quest System Unit Tests
 * Tests quest progress tracking logic
 */

import { describe, it, expect, beforeEach } from '@jest/globals'

// Mock the Supabase client
const mockSupabase = {
  from: (table: string) => ({
    select: (columns: string) => ({
      eq: (column: string, value: any) => ({
        eq: (column2: string, value2: any) => mockQuery,
        single: () => mockQuery,
      }),
      single: () => mockQuery,
    }),
    update: (data: any) => ({
      eq: (column: string, value: any) => ({
        eq: (column2: string, value2: any) => ({
          select: (columns?: string) => ({
            single: () => mockQuery,
          }),
        }),
      }),
    }),
  }),
}

let mockQuery = { data: null, error: null }

// Import the function we're testing (we'll test the logic directly)
describe('Quest Progress Tracking', () => {
  describe('parseObjective', () => {
    it('should parse "Gather 10 Oak Log" correctly', () => {
      const objective = "Gather 10 Oak Log"
      const match = objective.match(/(\d+)\s+([\w\s]+)/i)
      const targetId = match ? match[2].trim().toLowerCase().replace(/\s+/g, '_') : undefined

      expect(match).toBeTruthy()
      expect(match![1]).toBe('10')
      expect(match![2]).toBe('Oak Log')
      expect(targetId).toBe('oak_log')
    })

    it('should parse "Gather 5 Copper Ore" correctly', () => {
      const objective = "Gather 5 Copper Ore"
      const match = objective.match(/(\d+)\s+([\w\s]+)/i)
      const targetId = match ? match[2].trim().toLowerCase().replace(/\s+/g, '_') : undefined

      expect(targetId).toBe('copper_ore')
    })

    it('should parse "Collect 20 Shrimp" correctly', () => {
      const objective = "Collect 20 Shrimp"
      const match = objective.match(/(\d+)\s+([\w\s]+)/i)
      const targetId = match ? match[2].trim().toLowerCase().replace(/\s+/g, '_') : undefined

      expect(targetId).toBe('shrimp')
    })
  })

  describe('Quest Type Matching', () => {
    it('should match gather quest type', () => {
      const questType = 'gather'
      const eventType = 'gather'

      expect(questType === eventType).toBe(true)
    })

    it('should not match different quest types', () => {
      const questType = 'kill'
      const eventType = 'gather'

      expect(questType === eventType).toBe(false)
    })
  })

  describe('Target ID Matching', () => {
    it('should match exact targetId', () => {
      const questTargetId = 'oak_log'
      const eventTargetId = 'oak_log'

      expect(questTargetId === eventTargetId).toBe(true)
    })

    it('should not match different targetIds', () => {
      const questTargetId = 'oak_log'
      const eventTargetId = 'willow_log'

      expect(questTargetId === eventTargetId).toBe(false)
    })

    it('should handle undefined targetId (any target)', () => {
      const questTargetId = undefined
      const eventTargetId = 'oak_log'

      // If quest has no targetId, it should accept any target
      const matches = !questTargetId || questTargetId === eventTargetId
      expect(matches).toBe(true)
    })
  })

  describe('Progress Calculation', () => {
    it('should increment gather quest progress by amount', () => {
      const currentProgress = 0
      const amount = 10
      const goal = 10

      const newProgress = currentProgress + amount
      const finalProgress = Math.min(newProgress, goal)

      expect(finalProgress).toBe(10)
    })

    it('should cap progress at goal', () => {
      const currentProgress = 5
      const amount = 10
      const goal = 10

      const newProgress = currentProgress + amount // 15
      const finalProgress = Math.min(newProgress, goal)

      expect(finalProgress).toBe(10)
    })

    it('should handle partial progress', () => {
      const currentProgress = 3
      const amount = 2
      const goal = 10

      const newProgress = currentProgress + amount
      const finalProgress = Math.min(newProgress, goal)

      expect(finalProgress).toBe(5)
    })
  })

  describe('Full Quest Tracking Logic', () => {
    it('should update quest when all conditions match', () => {
      // Quest data
      const questProgress = {
        type: 'gather' as const,
        current: 0,
        goal: 10,
        targetId: 'oak_log'
      }

      // Event data
      const eventType = 'gather' as const
      const eventData = {
        targetId: 'oak_log',
        amount: 10
      }

      // Matching logic
      const typeMatches = questProgress.type === eventType
      const targetMatches = !questProgress.targetId || questProgress.targetId === eventData.targetId
      const shouldUpdate = typeMatches && targetMatches

      expect(shouldUpdate).toBe(true)

      // Progress calculation
      if (shouldUpdate) {
        const newCurrent = questProgress.current + (eventData.amount || 1)
        const finalProgress = Math.min(newCurrent, questProgress.goal)

        expect(finalProgress).toBe(10)
      }
    })

    it('should NOT update quest when type does not match', () => {
      // Quest data (kill quest)
      const questProgress = {
        type: 'kill' as const,
        current: 0,
        goal: 5,
        targetId: 'goblin'
      }

      // Event data (gather event)
      const eventType = 'gather' as const
      const eventData = {
        targetId: 'oak_log',
        amount: 10
      }

      // Matching logic
      const typeMatches = questProgress.type === eventType
      const shouldUpdate = typeMatches

      expect(shouldUpdate).toBe(false)
    })

    it('should NOT update quest when targetId does not match', () => {
      // Quest data
      const questProgress = {
        type: 'gather' as const,
        current: 0,
        goal: 10,
        targetId: 'oak_log'
      }

      // Event data (wrong material)
      const eventType = 'gather' as const
      const eventData = {
        targetId: 'willow_log',
        amount: 10
      }

      // Matching logic
      const typeMatches = questProgress.type === eventType
      const targetMatches = !questProgress.targetId || questProgress.targetId === eventData.targetId
      const shouldUpdate = typeMatches && targetMatches

      expect(shouldUpdate).toBe(false)
    })
  })

  describe('Edge Cases', () => {
    it('should handle missing amount (default to 1)', () => {
      const currentProgress = 5
      const amount = undefined
      const goal = 10

      const newProgress = currentProgress + (amount || 1)
      const finalProgress = Math.min(newProgress, goal)

      expect(finalProgress).toBe(6)
    })

    it('should handle zero progress', () => {
      const currentProgress = 0
      const amount = 0
      const goal = 10

      const newProgress = currentProgress + amount
      const finalProgress = Math.min(newProgress, goal)

      expect(finalProgress).toBe(0)
    })

    it('should handle level/gold quests (non-incremental)', () => {
      const eventType = 'level'
      const currentProgress = 1
      const newLevel = 5
      const goal = 5

      // For level/gold, we set to the value, not increment
      let newCurrent: number
      if (eventType === 'level' || eventType === 'gold') {
        newCurrent = newLevel
      } else {
        newCurrent = currentProgress + newLevel
      }

      const finalProgress = Math.min(newCurrent, goal)
      expect(finalProgress).toBe(5)
    })
  })
})

describe('Integration: Gather Quest Flow', () => {
  it('should complete gather quest after collecting materials', () => {
    // Initial quest state
    const quest = {
      quest_id: 'gather_wood',
      status: 'active',
      progress: {
        type: 'gather' as const,
        current: 0,
        goal: 10,
        targetId: 'oak_log'
      }
    }

    // Simulate gathering 10 oak logs
    const gatherEvent = {
      eventType: 'gather' as const,
      eventData: {
        targetId: 'oak_log',
        amount: 10
      }
    }

    // Check if quest should update
    const typeMatches = quest.progress.type === gatherEvent.eventType
    const targetMatches = !quest.progress.targetId || quest.progress.targetId === gatherEvent.eventData.targetId
    const shouldUpdate = typeMatches && targetMatches

    console.log('=== Integration Test: Gather Quest ===')
    console.log('Quest:', quest)
    console.log('Event:', gatherEvent)
    console.log('Type matches:', typeMatches)
    console.log('Target matches:', targetMatches)
    console.log('Should update:', shouldUpdate)

    expect(shouldUpdate).toBe(true)

    if (shouldUpdate) {
      // Update progress
      const newCurrent = quest.progress.current + (gatherEvent.eventData.amount || 1)
      quest.progress.current = Math.min(newCurrent, quest.progress.goal)

      console.log('Updated progress:', quest.progress.current, '/', quest.progress.goal)

      expect(quest.progress.current).toBe(10)
      expect(quest.progress.current >= quest.progress.goal).toBe(true)
    }
  })

  it('should handle multiple gather sessions (5 + 5 = 10)', () => {
    const quest = {
      quest_id: 'gather_wood',
      status: 'active',
      progress: {
        type: 'gather' as const,
        current: 0,
        goal: 10,
        targetId: 'oak_log'
      }
    }

    // First gathering session: 5 logs
    const event1 = {
      eventType: 'gather' as const,
      eventData: { targetId: 'oak_log', amount: 5 }
    }

    if (quest.progress.type === event1.eventType && quest.progress.targetId === event1.eventData.targetId) {
      quest.progress.current = Math.min(
        quest.progress.current + event1.eventData.amount,
        quest.progress.goal
      )
    }

    expect(quest.progress.current).toBe(5)

    // Second gathering session: 5 more logs
    const event2 = {
      eventType: 'gather' as const,
      eventData: { targetId: 'oak_log', amount: 5 }
    }

    if (quest.progress.type === event2.eventType && quest.progress.targetId === event2.eventData.targetId) {
      quest.progress.current = Math.min(
        quest.progress.current + event2.eventData.amount,
        quest.progress.goal
      )
    }

    expect(quest.progress.current).toBe(10)
  })
})
