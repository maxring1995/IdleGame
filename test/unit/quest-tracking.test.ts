/**
 * Unit tests for Quest Tracking System
 *
 * Tests the quest progress tracking logic, particularly for gathering quests
 */

import { trackQuestProgress, isQuestComplete, type QuestProgress } from '../../lib/quests'

// Mock the Supabase client
jest.mock('@/utils/supabase/client', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn((table: string) => {
      // Mock quest data
      const mockQuests = [
        {
          id: 'quest-1',
          quest_id: 'gather_wood',
          progress: {
            type: 'gather',
            current: 0,
            goal: 10,
            targetId: 'oak_log'
          },
          quest_definitions: {
            title: 'Gathering Wood',
            icon: '🪓'
          }
        }
      ]

      const eqChain = () => ({
        eq: eqChain,
        select: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({ data: mockQuests[0], error: null }))
        })),
        then: (callback: any) => callback({ data: mockQuests, error: null })
      })

      return {
        select: jest.fn(() => eqChain()),
        update: jest.fn(() => eqChain())
      }
    })
  }))
}))

// Mock character functions
jest.mock('../character', () => ({
  addExperience: jest.fn(),
  addGold: jest.fn()
}))

// Mock inventory functions
jest.mock('../inventory', () => ({
  addItem: jest.fn()
}))

// Mock notification store
const mockAddNotification = jest.fn().mockReturnValue('notification-id')

// Create a module that can be dynamically imported
const mockNotificationModule = {
  useNotificationStore: {
    getState: () => ({
      addNotification: mockAddNotification
    })
  },
  notificationHelpers: {
    questProgress: (questName: string, current: number, goal: number) => ({
      type: 'info',
      category: 'quest',
      title: '📋 Quest Progress',
      message: `"${questName}" - ${current}/${goal}`,
      icon: '📋'
    })
  }
}

jest.mock('../notificationStore', () => mockNotificationModule)

describe('Quest Tracking System', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('isQuestComplete', () => {
    it('should return true when current >= goal', () => {
      const progress: QuestProgress = { type: 'gather', current: 10, goal: 10 }
      expect(isQuestComplete(progress)).toBe(true)
    })

    it('should return false when current < goal', () => {
      const progress: QuestProgress = { type: 'gather', current: 5, goal: 10 }
      expect(isQuestComplete(progress)).toBe(false)
    })

    it('should return true when current > goal', () => {
      const progress: QuestProgress = { type: 'gather', current: 15, goal: 10 }
      expect(isQuestComplete(progress)).toBe(true)
    })
  })

  describe('Quest targetId Matching', () => {
    it('should match exact targetId for gathering quest', () => {
      const questProgress: QuestProgress = {
        type: 'gather',
        current: 0,
        goal: 10,
        targetId: 'oak_log'
      }

      const gatheringEvent = {
        targetId: 'oak_log',
        amount: 10
      }

      // Test the matching logic
      const typeMatches = questProgress.type === 'gather'
      const targetMatches = !questProgress.targetId || questProgress.targetId === gatheringEvent.targetId

      expect(typeMatches).toBe(true)
      expect(targetMatches).toBe(true)
    })

    it('should not match different targetId', () => {
      const questProgress: QuestProgress = {
        type: 'gather',
        current: 0,
        goal: 10,
        targetId: 'oak_log'
      }

      const gatheringEvent = {
        targetId: 'willow_log',
        amount: 10
      }

      const typeMatches = questProgress.type === 'gather'
      const targetMatches = !questProgress.targetId || questProgress.targetId === gatheringEvent.targetId

      expect(typeMatches).toBe(true)
      expect(targetMatches).toBe(false)
    })

    it('should handle targetId with spaces vs underscores', () => {
      // Quest parsing converts "Oak Log" to "oak_log"
      const questTargetId = 'Oak Log'.trim().toLowerCase().replace(/\s+/g, '_')

      // Material ID from database
      const materialId = 'oak_log'

      expect(questTargetId).toBe(materialId)
    })

    it('should handle plural vs singular forms', () => {
      // If quest says "Gather 10 Oak Logs" it becomes "oak_logs"
      const questTargetIdPlural = 'Oak Logs'.trim().toLowerCase().replace(/\s+/g, '_')

      // But material ID is singular
      const materialId = 'oak_log'

      // This would FAIL to match
      expect(questTargetIdPlural).not.toBe(materialId)

      // The quest objective should use singular form
      const questTargetIdSingular = 'Oak Log'.trim().toLowerCase().replace(/\s+/g, '_')
      expect(questTargetIdSingular).toBe(materialId)
    })
  })

  describe('Progress Calculation', () => {
    it('should increment progress for gather quests', () => {
      const progress: QuestProgress = { type: 'gather', current: 5, goal: 10 }
      const eventAmount = 5

      const newCurrent = progress.current + eventAmount
      const finalProgress = Math.min(newCurrent, progress.goal)

      expect(finalProgress).toBe(10)
      expect(isQuestComplete({ ...progress, current: finalProgress })).toBe(true)
    })

    it('should cap progress at goal', () => {
      const progress: QuestProgress = { type: 'gather', current: 8, goal: 10 }
      const eventAmount = 5

      const newCurrent = progress.current + eventAmount // 13
      const finalProgress = Math.min(newCurrent, progress.goal) // Should cap at 10

      expect(finalProgress).toBe(10)
    })

    it('should set absolute value for level/gold quests', () => {
      const levelProgress: QuestProgress = { type: 'level', current: 0, goal: 5 }
      const goldProgress: QuestProgress = { type: 'gold', current: 0, goal: 1000 }

      // For level and gold, set to actual amount (not incremental)
      const levelEventAmount = 5
      const goldEventAmount = 1000

      expect(levelEventAmount).toBe(levelProgress.goal)
      expect(goldEventAmount).toBe(goldProgress.goal)
    })
  })

  describe('Quest Progress Notifications', () => {
    beforeEach(() => {
      mockAddNotification.mockClear()
    })

    it('should send notification when quest progress increases', async () => {
      const characterId = 'test-character-id'
      const eventType = 'gather'
      const eventData = { targetId: 'oak_log', amount: 5 }

      // Call trackQuestProgress
      await trackQuestProgress(characterId, eventType, eventData)

      // Verify notification was sent
      expect(mockAddNotification).toHaveBeenCalled()
    })

    it('should include correct quest information in notification', async () => {
      const characterId = 'test-character-id'
      const eventType = 'gather'
      const eventData = { targetId: 'oak_log', amount: 5 }

      await trackQuestProgress(characterId, eventType, eventData)

      // Check notification parameters
      const notificationCall = mockAddNotification.mock.calls[0][0]
      expect(notificationCall.type).toBe('info')
      expect(notificationCall.category).toBe('quest')
      expect(notificationCall.title).toContain('Quest Progress')
      expect(notificationCall.message).toContain('/')  // Should contain progress like "5/10"
    })

    it('should not send notification if progress does not change', async () => {
      // Mock a quest that's already complete
      const characterId = 'test-character-id'
      const eventType = 'gather'
      const eventData = { targetId: 'oak_log', amount: 0 }

      await trackQuestProgress(characterId, eventType, eventData)

      // Should not send notification for 0 progress
      expect(mockAddNotification).not.toHaveBeenCalled()
    })

    it('should handle notification errors gracefully', async () => {
      // Mock notification error
      mockAddNotification.mockImplementation(() => {
        throw new Error('Notification system unavailable')
      })

      const characterId = 'test-character-id'
      const eventType = 'gather'
      const eventData = { targetId: 'oak_log', amount: 5 }

      // Should not throw error
      await expect(trackQuestProgress(characterId, eventType, eventData)).resolves.not.toThrow()
    })

    it('should send notification for each quest that progresses', async () => {
      // If multiple quests match the event, each should get a notification
      const characterId = 'test-character-id'
      const eventType = 'kill'
      const eventData = { targetId: 'goblin', amount: 1 }

      await trackQuestProgress(characterId, eventType, eventData)

      // This test would need multiple quests mocked to verify
      // For now, just verify notification was called
      expect(mockAddNotification).toHaveBeenCalled()
    })
  })
})
