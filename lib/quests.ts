import { createClient } from '@/utils/supabase/client'
import type { Quest } from './supabase'
import { addExperience, addGold } from './character'
import { addItem } from './inventory'
import { notificationHelpers } from './notificationStore'

// Quest definition interface
export interface QuestDefinition {
  id: string
  title: string
  description?: string
  level_requirement: number
  objective: string
  xp_reward: number
  gold_reward: number
  item_rewards?: Record<string, number> // item_id -> quantity
  icon?: string
  created_at?: string
  prerequisite_quest_id?: string
  quest_type?: 'standard' | 'daily' | 'weekly' | 'repeatable' | 'chain' | 'boss' | 'skill'
  repeatable?: boolean
  reset_interval?: 'daily' | 'weekly' | 'monthly' | null
  required_skill_type?: string
  required_skill_level?: number
  is_boss_quest?: boolean
  boss_enemy_id?: string
  objectives?: QuestObjective[]
  completion_count?: number
}

export interface QuestObjective {
  type: 'kill' | 'gather' | 'craft' | 'explore' | 'level' | 'gold' | 'skill'
  description: string
  goal: number
  current?: number
  targetId?: string
}

// Quest progress tracking
export interface QuestProgress {
  current: number
  goal: number
  type: 'kill' | 'gather' | 'craft' | 'explore' | 'level' | 'gold'
  targetId?: string // enemy_id, material_id, etc.
}

// Get all available quest definitions (with prerequisite checking)
export async function getQuestDefinitions(characterLevel: number, characterId?: string) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('quest_definitions')
    .select('*')
    .lte('level_requirement', characterLevel)
    .order('level_requirement', { ascending: true })

  if (error) {
    console.error('Error fetching quest definitions:', error)
    return { data: null, error }
  }

  let quests = data as QuestDefinition[]

  // Filter by prerequisites and skill requirements if characterId provided
  if (characterId) {
    // Get completed quests
    const { data: completions } = await supabase
      .from('quest_completions')
      .select('quest_id')
      .eq('character_id', characterId)

    const completedQuestIds = new Set(completions?.map(c => c.quest_id) || [])

    // Get character skills
    const { data: skills } = await supabase
      .from('character_skills')
      .select('skill_type, level')
      .eq('character_id', characterId)

    const skillLevels = new Map(skills?.map(s => [s.skill_type, s.level]) || [])

    // Filter quests
    quests = quests.filter(quest => {
      // Check prerequisite
      if (quest.prerequisite_quest_id && !completedQuestIds.has(quest.prerequisite_quest_id)) {
        return false
      }

      // Check skill requirement
      if (quest.required_skill_type && quest.required_skill_level) {
        const currentLevel = skillLevels.get(quest.required_skill_type) || 1
        if (currentLevel < quest.required_skill_level) {
          return false
        }
      }

      // Check if daily/weekly is available (not completed today/this week)
      if (quest.reset_interval) {
        const todayStart = new Date()
        todayStart.setHours(0, 0, 0, 0)

        const completion = completions?.find(c =>
          c.quest_id === quest.id &&
          new Date(c.completed_at) > todayStart
        )

        if (completion) return false
      }

      return true
    })
  }

  return { data: quests, error: null }
}

// Get character's active and completed quests
export async function getCharacterQuests(characterId: string) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('quests')
    .select(`
      *,
      quest_definitions (
        title,
        description,
        objective,
        xp_reward,
        gold_reward,
        item_rewards,
        icon
      )
    `)
    .eq('character_id', characterId)
    .order('started_at', { ascending: false })

  if (error) {
    console.error('Error fetching character quests:', error)
    return { data: null, error }
  }

  return { data, error: null }
}

// Accept a quest
export async function acceptQuest(characterId: string, questId: string) {
  const supabase = createClient()

  // Check if quest already exists (any status)
  const { data: existing } = await supabase
    .from('quests')
    .select('id, status, progress')
    .eq('character_id', characterId)
    .eq('quest_id', questId)
    .maybeSingle()

  if (existing) {
    // If already active, return error
    if (existing.status === 'active') {
      return { data: null, error: new Error('Quest already accepted') }
    }

    // If failed or completed, update it back to active and reset progress
    const { data: questDef } = await supabase
      .from('quest_definitions')
      .select('*')
      .eq('id', questId)
      .single()

    if (!questDef) {
      return { data: null, error: new Error('Quest not found') }
    }

    const progress = parseObjective(questDef.objective)

    const { data: updated, error: updateError } = await supabase
      .from('quests')
      .update({
        status: 'active',
        progress: progress,
        started_at: new Date().toISOString(),
        completed_at: null
      })
      .eq('character_id', characterId)
      .eq('quest_id', questId)
      .select()
      .single()

    if (updateError) {
      console.error('Error reactivating quest:', updateError)
      return { data: null, error: updateError }
    }

    return { data: updated, error: null }
  }

  // Quest doesn't exist, create new one
  const { data: questDef } = await supabase
    .from('quest_definitions')
    .select('*')
    .eq('id', questId)
    .single()

  if (!questDef) {
    return { data: null, error: new Error('Quest not found') }
  }

  // Parse objective to determine quest type and initialize progress
  const progress = parseObjective(questDef.objective)

  const { data, error } = await supabase
    .from('quests')
    .insert({
      character_id: characterId,
      quest_id: questId,
      status: 'active',
      progress: progress
    })
    .select()
    .single()

  if (error) {
    console.error('Error accepting quest:', error)
    return { data: null, error }
  }

  return { data, error: null }
}

// Update quest progress
export async function updateQuestProgress(
  characterId: string,
  questId: string,
  progressUpdate: Partial<QuestProgress>
) {
  const supabase = createClient()

  // Get current quest
  const { data: quest } = await supabase
    .from('quests')
    .select('progress')
    .eq('character_id', characterId)
    .eq('quest_id', questId)
    .eq('status', 'active')
    .single()

  if (!quest) {
    return { data: null, error: new Error('Active quest not found') }
  }

  const currentProgress = quest.progress as QuestProgress
  const newProgress = { ...currentProgress, ...progressUpdate }

  const { data, error } = await supabase
    .from('quests')
    .update({ progress: newProgress })
    .eq('character_id', characterId)
    .eq('quest_id', questId)
    .eq('status', 'active')
    .select()
    .single()

  if (error) {
    console.error('Error updating quest progress:', error)
    return { data: null, error }
  }

  return { data, error: null }
}

// Complete a quest and claim rewards
export async function completeQuest(characterId: string, questId: string) {
  const supabase = createClient()

  // Get quest definition for rewards
  const { data: questDef } = await supabase
    .from('quest_definitions')
    .select('*')
    .eq('id', questId)
    .single()

  if (!questDef) {
    return { data: null, error: new Error('Quest definition not found') }
  }

  // Mark quest as completed
  const { data, error } = await supabase
    .from('quests')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString()
    })
    .eq('character_id', characterId)
    .eq('quest_id', questId)
    .eq('status', 'active')
    .select()
    .single()

  if (error) {
    console.error('Error completing quest:', error)
    return { data: null, error }
  }

  // Award rewards
  const rewards = {
    xp: questDef.xp_reward || 0,
    gold: questDef.gold_reward || 0,
    items: questDef.item_rewards || {}
  }

  // Add XP
  if (rewards.xp > 0) {
    await addExperience(characterId, rewards.xp)
  }

  // Add gold
  if (rewards.gold > 0) {
    await addGold(characterId, rewards.gold)
  }

  // Add items
  if (rewards.items && Object.keys(rewards.items).length > 0) {
    for (const [itemId, quantity] of Object.entries(rewards.items)) {
      if (typeof quantity === 'number') {
        await addItem(characterId, itemId, quantity)
      }
    }
  }

  // Record completion for repeatable quests
  await supabase
    .from('quest_completions')
    .insert({
      character_id: characterId,
      quest_id: questId,
      completed_at: new Date().toISOString()
    })

  return { data: { quest: data, rewards }, error: null }
}

// Check if quest objectives are met
export function isQuestComplete(progress: QuestProgress): boolean {
  return progress.current >= progress.goal
}

// Parse quest objective string to initialize progress
function parseObjective(objective: string): QuestProgress {
  // Examples:
  // "Defeat 5 Goblins" -> { type: 'kill', current: 0, goal: 5, targetId: 'goblin' }
  // "Gather 10 Oak Logs" -> { type: 'gather', current: 0, goal: 10, targetId: 'oak_log' }
  // "Reach level 5" -> { type: 'level', current: 0, goal: 5 }

  const lowerObjective = objective.toLowerCase()

  // Kill quest
  if (lowerObjective.includes('defeat') || lowerObjective.includes('kill')) {
    const match = objective.match(/(\d+)\s+(\w+)/i)
    return {
      type: 'kill',
      current: 0,
      goal: match ? parseInt(match[1]) : 1,
      targetId: match ? match[2].toLowerCase() : undefined
    }
  }

  // Gather quest
  if (lowerObjective.includes('gather') || lowerObjective.includes('collect')) {
    const match = objective.match(/(\d+)\s+([\w\s]+)/i)
    return {
      type: 'gather',
      current: 0,
      goal: match ? parseInt(match[1]) : 1,
      targetId: match ? match[2].trim().toLowerCase().replace(/\s+/g, '_') : undefined
    }
  }

  // Craft quest
  if (lowerObjective.includes('craft') || lowerObjective.includes('create')) {
    const match = objective.match(/(\d+)\s+([\w\s]+)/i)
    return {
      type: 'craft',
      current: 0,
      goal: match ? parseInt(match[1]) : 1,
      targetId: match ? match[2].trim().toLowerCase().replace(/\s+/g, '_') : undefined
    }
  }

  // Exploration quest
  if (lowerObjective.includes('discover') || lowerObjective.includes('explore')) {
    const match = objective.match(/(\d+)/i)
    return {
      type: 'explore',
      current: 0,
      goal: match ? parseInt(match[1]) : 1
    }
  }

  // Level quest
  if (lowerObjective.includes('level') || lowerObjective.includes('reach')) {
    const match = objective.match(/(\d+)/i)
    return {
      type: 'level',
      current: 0,
      goal: match ? parseInt(match[1]) : 1
    }
  }

  // Gold quest
  if (lowerObjective.includes('gold') || lowerObjective.includes('earn')) {
    const match = objective.match(/(\d+)/i)
    return {
      type: 'gold',
      current: 0,
      goal: match ? parseInt(match[1]) : 100
    }
  }

  // Default to generic quest
  return {
    type: 'kill',
    current: 0,
    goal: 1
  }
}

// Track quest progress automatically based on player actions
export async function trackQuestProgress(
  characterId: string,
  eventType: 'kill' | 'gather' | 'craft' | 'explore' | 'level' | 'gold',
  eventData: { targetId?: string; amount?: number }
) {
  const supabase = createClient()

  console.log('[Quest Tracking] ============ START ============')
  console.log('[Quest Tracking] Character ID:', characterId)
  console.log('[Quest Tracking] Event Type:', eventType)
  console.log('[Quest Tracking] Event Data:', JSON.stringify(eventData))

  // Get all active quests for this character with quest definitions
  const { data: quests, error: fetchError } = await supabase
    .from('quests')
    .select('id, quest_id, progress, quest_definitions(title, icon)')
    .eq('character_id', characterId)
    .eq('status', 'active')

  if (fetchError) {
    console.error('[Quest Tracking] ERROR fetching quests:', fetchError)
    return
  }

  console.log('[Quest Tracking] Active quests found:', quests?.length || 0)
  if (quests && quests.length > 0) {
    console.log('[Quest Tracking] Quest IDs:', quests.map(q => q.quest_id).join(', '))
  }

  if (!quests || quests.length === 0) {
    console.log('[Quest Tracking] No active quests - exiting early')
    return
  }

  // Update matching quests
  for (const quest of quests) {
    const progress = quest.progress as QuestProgress

    console.log('[Quest Tracking] ----------')
    console.log('[Quest Tracking] Checking quest:', quest.quest_id)
    console.log('[Quest Tracking]   Progress:', JSON.stringify(progress))
    console.log('[Quest Tracking]   Quest Type:', progress.type)
    console.log('[Quest Tracking]   Quest TargetId:', progress.targetId)
    console.log('[Quest Tracking]   Quest Current:', progress.current)
    console.log('[Quest Tracking]   Quest Goal:', progress.goal)

    // Check if quest type matches event type
    const typeMatches = progress.type === eventType
    console.log('[Quest Tracking]   Type Match?', typeMatches, `("${progress.type}" === "${eventType}")`)

    if (!typeMatches) {
      console.log('[Quest Tracking]   ❌ SKIP: Type mismatch')
      continue
    }

    // Check if targetId matches (if specified)
    const targetMatches = !progress.targetId || progress.targetId === eventData.targetId
    console.log('[Quest Tracking]   Target Match?', targetMatches, `("${progress.targetId}" === "${eventData.targetId}")`)

    if (progress.targetId && progress.targetId !== eventData.targetId) {
      console.log('[Quest Tracking]   ❌ SKIP: TargetId mismatch')
      continue
    }

    console.log('[Quest Tracking]   ✅ MATCH! Updating progress...')

    // Update progress
    let newCurrent: number
    if (eventType === 'level' || eventType === 'gold') {
      // For level and gold quests, set to the actual amount (not incremental)
      newCurrent = eventData.amount || 0
    } else {
      // For other quests, increment by amount
      newCurrent = progress.current + (eventData.amount || 1)
    }

    const finalProgress = Math.min(newCurrent, progress.goal)

    console.log(`[Quest Tracking]   Calculation: ${progress.current} + ${eventData.amount} = ${newCurrent}`)
    console.log(`[Quest Tracking]   Final (capped): ${finalProgress} / ${progress.goal}`)

    try {
      await updateQuestProgress(characterId, quest.quest_id, {
        current: finalProgress
      })
      console.log('[Quest Tracking]   ✅ Update SUCCESS!')

      // Send progress notification if quest progressed
      if (finalProgress > progress.current) {
        const questDef = (quest as any).quest_definitions
        const questTitle = questDef?.title || quest.quest_id
        const questIcon = questDef?.icon || '📜'

        // Import notification store dynamically to avoid circular dependencies
        try {
          const { useNotificationStore } = await import('./notificationStore')
          const { addNotification } = useNotificationStore.getState()

          addNotification({
            type: 'info',
            category: 'quest',
            title: `${questIcon} Quest Progress`,
            message: `"${questTitle}" - ${finalProgress}/${progress.goal}`,
            icon: questIcon,
          })

          console.log('[Quest Tracking]   📬 Notification sent!')
        } catch (notifError) {
          console.error('[Quest Tracking]   ⚠️ Notification failed:', notifError)
        }
      }
    } catch (error) {
      console.error('[Quest Tracking]   ❌ Update FAILED:', error)
    }
  }

  console.log('[Quest Tracking] ============ END ============')
}

// Abandon a quest
export async function abandonQuest(characterId: string, questId: string) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('quests')
    .update({ status: 'failed' })
    .eq('character_id', characterId)
    .eq('quest_id', questId)
    .eq('status', 'active')
    .select()
    .single()

  if (error) {
    console.error('Error abandoning quest:', error)
    return { data: null, error }
  }

  return { data, error: null }
}
