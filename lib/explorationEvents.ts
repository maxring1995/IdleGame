import { createClient } from '@/utils/supabase/client'
import type {
  ExplorationEvent,
  ExplorationChoice,
  ExplorationOutcome,
  ExplorationEventLog,
  ExplorationSkill,
  Character
} from './supabase'
import { addExperience, addGold, updateCharacterHealth } from './character'
import { addItem } from './inventory'
import { addExplorationSkillXP } from './explorationSkills'

// ============================================================================
// EXPLORATION EVENT SYSTEM
// ============================================================================

/**
 * Check if an event should trigger based on exploration state
 */
export async function rollForEvent(
  characterId: string,
  zoneId: string,
  progress: number,
  dangerLevel: number
): Promise<{ data: ExplorationEvent | null; error: Error | null }> {
  const supabase = createClient()

  try {
    // Get applicable events for this zone and progress
    const { data: events, error } = await supabase
      .from('exploration_events')
      .select('*')
      .or(`zone_id.eq.${zoneId},zone_id.is.null`)
      .gte('max_danger_level', dangerLevel)
      .lte('min_danger_level', dangerLevel)
      .gte('max_progress', progress)
      .lte('min_progress', progress)

    if (error) throw error
    if (!events || events.length === 0) return { data: null, error: null }

    // Roll for each event based on trigger chance
    for (const event of events) {
      if (Math.random() <= event.trigger_chance) {
        // Check skill requirements
        const meetsRequirements = await checkSkillRequirements(
          characterId,
          event.required_skills || {}
        )

        if (meetsRequirements) {
          return { data: event as ExplorationEvent, error: null }
        }
      }
    }

    return { data: null, error: null }
  } catch (err) {
    console.error('Error rolling for event:', err)
    return { data: null, error: err as Error }
  }
}

/**
 * Check if character meets skill requirements
 */
async function checkSkillRequirements(
  characterId: string,
  requirements: Record<string, number>
): Promise<boolean> {
  if (Object.keys(requirements).length === 0) return true

  const supabase = createClient()
  const { data: skills } = await supabase
    .from('exploration_skills')
    .select('*')
    .eq('character_id', characterId)

  if (!skills) return false

  for (const [skillType, requiredLevel] of Object.entries(requirements)) {
    const skill = skills.find(s => s.skill_type === skillType)
    if (!skill || skill.level < requiredLevel) {
      return false
    }
  }

  return true
}

/**
 * Process a player's choice for an event
 */
export async function processEventChoice(
  characterId: string,
  eventId: string,
  choice: ExplorationChoice,
  zoneId: string
): Promise<{ data: any; error: Error | null }> {
  const supabase = createClient()

  try {
    // Check if choice requires an item
    if (choice.requires_item) {
      const hasItem = await checkHasItem(characterId, choice.requires_item)
      if (!hasItem) {
        return {
          data: {
            success: false,
            message: `You don't have the required item: ${choice.requires_item}`
          },
          error: null
        }
      }
    }

    // Perform skill check if needed
    let outcome: ExplorationOutcome | undefined

    if (choice.skill_check && choice.outcomes.success && choice.outcomes.failure) {
      const success = await performSkillCheck(characterId, choice.skill_check)
      outcome = success ? choice.outcomes.success : choice.outcomes.failure

      // Grant XP to the skill used
      if (success) {
        const skillType = Object.keys(choice.skill_check)[0]
        await addExplorationSkillXP(characterId, skillType as any, 10)
      }
    } else {
      outcome = choice.outcomes.always
    }

    if (!outcome) {
      return { data: { success: false, message: 'No outcome available' }, error: null }
    }

    // Apply outcome effects
    const rewards = await applyOutcome(characterId, outcome, choice.requires_item)

    // Log the event
    await supabase.from('exploration_event_log').insert({
      character_id: characterId,
      event_id: eventId,
      zone_id: zoneId,
      choice_made: choice.text,
      outcome: outcome,
      rewards_gained: rewards
    })

    return {
      data: {
        success: true,
        outcome,
        rewards,
        message: outcome.message || 'Choice processed successfully'
      },
      error: null
    }
  } catch (err) {
    console.error('Error processing event choice:', err)
    return { data: null, error: err as Error }
  }
}

/**
 * Check if character has a specific item
 */
async function checkHasItem(characterId: string, itemName: string): Promise<boolean> {
  const supabase = createClient()

  // First find the item ID by name
  const { data: item } = await supabase
    .from('items')
    .select('id')
    .eq('name', itemName)
    .single()

  if (!item) return false

  // Check if character has it in inventory
  const { data: inventory } = await supabase
    .from('inventory')
    .select('id')
    .eq('character_id', characterId)
    .eq('item_id', item.id)
    .gt('quantity', 0)
    .single()

  return !!inventory
}

/**
 * Perform a skill check
 */
async function performSkillCheck(
  characterId: string,
  skillCheck: Record<string, number>
): Promise<boolean> {
  const supabase = createClient()

  for (const [skillType, difficulty] of Object.entries(skillCheck)) {
    const { data: skill } = await supabase
      .from('exploration_skills')
      .select('level')
      .eq('character_id', characterId)
      .eq('skill_type', skillType)
      .single()

    const skillLevel = skill?.level || 0

    // Roll 1d20 + skill level vs difficulty
    const roll = Math.floor(Math.random() * 20) + 1 + skillLevel
    if (roll < difficulty) {
      return false
    }
  }

  return true
}

/**
 * Apply the effects of an outcome
 */
async function applyOutcome(
  characterId: string,
  outcome: ExplorationOutcome,
  consumedItem?: string
): Promise<Record<string, any>> {
  const rewards: Record<string, any> = {}

  // Grant XP
  if (outcome.xp && outcome.xp > 0) {
    await addExperience(characterId, outcome.xp)
    rewards.xp = outcome.xp
  }

  // Grant/remove gold
  if (outcome.gold) {
    await addGold(characterId, outcome.gold)
    rewards.gold = outcome.gold
  }

  // Modify health
  if (outcome.health) {
    await updateCharacterHealth(characterId, outcome.health)
    rewards.health = outcome.health
  }

  // Grant items
  if (outcome.items && outcome.items.length > 0) {
    rewards.items = []
    for (const itemName of outcome.items) {
      // Find item ID by name
      const supabase = createClient()
      const { data: item } = await supabase
        .from('items')
        .select('id')
        .eq('name', itemName)
        .single()

      if (item) {
        await addItem(characterId, item.id, 1)
        rewards.items.push(itemName)
      }
    }
  }

  // Consume item if needed
  if (outcome.consumes_item && consumedItem) {
    await consumeItem(characterId, consumedItem)
    rewards.consumed_item = consumedItem
  }

  // Other effects
  if (outcome.discovery) {
    rewards.discovery = outcome.discovery
  }
  if (outcome.safe_passage) {
    rewards.safe_passage = true
  }
  if (outcome.lost) {
    rewards.lost = true
  }
  if (outcome.time) {
    rewards.time_adjustment = outcome.time
  }

  return rewards
}

/**
 * Consume an item from inventory
 */
async function consumeItem(characterId: string, itemName: string): Promise<void> {
  const supabase = createClient()

  // Find item ID
  const { data: item } = await supabase
    .from('items')
    .select('id')
    .eq('name', itemName)
    .single()

  if (!item) return

  // Reduce quantity by 1
  const { data: inventory } = await supabase
    .from('inventory')
    .select('id, quantity')
    .eq('character_id', characterId)
    .eq('item_id', item.id)
    .single()

  if (!inventory) return

  if (inventory.quantity > 1) {
    await supabase
      .from('inventory')
      .update({ quantity: inventory.quantity - 1 })
      .eq('id', inventory.id)
  } else {
    // Remove from inventory if last one
    await supabase
      .from('inventory')
      .delete()
      .eq('id', inventory.id)
  }
}

/**
 * Get recent events for a character
 */
export async function getRecentEvents(
  characterId: string,
  limit: number = 10
): Promise<{ data: ExplorationEventLog[] | null; error: Error | null }> {
  const supabase = createClient()

  try {
    const { data, error } = await supabase
      .from('exploration_event_log')
      .select(`
        *,
        event:exploration_events(*)
      `)
      .eq('character_id', characterId)
      .order('timestamp', { ascending: false })
      .limit(limit)

    if (error) throw error
    return { data: data as any, error: null }
  } catch (err) {
    console.error('Error fetching recent events:', err)
    return { data: null, error: err as Error }
  }
}

/**
 * Initialize exploration events with more sample data
 */
export async function seedExplorationEvents(): Promise<void> {
  const supabase = createClient()

  const events: Partial<ExplorationEvent>[] = [
    {
      event_name: 'Wandering Merchant',
      event_type: 'npc',
      description: 'A hooded figure approaches with a cart full of exotic wares.',
      flavor_text: '"Greetings, traveler! Care to see my special collection?"',
      trigger_chance: 0.15,
      choices: [
        {
          text: "Browse the merchant's wares",
          outcomes: {
            always: {
              message: 'You discover rare items for sale at premium prices.',
              discovery: 'merchant_shop'
            }
          }
        },
        {
          text: 'Attempt to haggle',
          skill_check: { tracking: 10 },
          outcomes: {
            success: {
              message: 'Your negotiation skills impress the merchant!',
              gold: -50,
              items: ['rare_map_fragment']
            },
            failure: {
              message: 'The merchant is offended and leaves.',
            }
          }
        },
        {
          text: 'Politely decline',
          outcomes: {
            always: {
              message: 'The merchant nods and continues on their way.',
              xp: 10
            }
          }
        }
      ] as ExplorationChoice[]
    },
    {
      event_name: 'Collapsed Bridge',
      event_type: 'hazard',
      description: 'The bridge ahead has partially collapsed into the ravine below.',
      flavor_text: 'The wooden planks creak ominously under your weight.',
      trigger_chance: 0.12,
      choices: [
        {
          text: 'Carefully cross the damaged bridge',
          skill_check: { survival: 12 },
          outcomes: {
            success: {
              message: 'You navigate the treacherous crossing safely.',
              xp: 50
            },
            failure: {
              message: 'The bridge gives way! You fall but manage to grab the edge.',
              health: -15,
              time: -300
            }
          }
        },
        {
          text: 'Use rope to secure a safe crossing',
          requires_item: 'Climbing Rope',
          outcomes: {
            always: {
              message: 'The rope holds firm. You cross without incident.',
              safe_passage: true,
              consumes_item: true
            }
          }
        },
        {
          text: 'Find another route',
          outcomes: {
            always: {
              message: 'You backtrack and find a longer but safer path.',
              time: -600,
              safe: true
            }
          }
        }
      ] as ExplorationChoice[]
    },
    {
      event_name: 'Ancient Puzzle Box',
      event_type: 'puzzle',
      description: 'You discover an ornate box covered in strange symbols.',
      flavor_text: 'The intricate mechanisms seem to respond to your touch.',
      trigger_chance: 0.08,
      min_progress: 30,
      choices: [
        {
          text: 'Study the symbols carefully',
          skill_check: { archaeology: 15 },
          outcomes: {
            success: {
              message: 'You decipher the ancient script and open the box!',
              items: ['ancient_artifact'],
              xp: 100,
              discovery: 'puzzle_master'
            },
            failure: {
              message: 'The symbols remain a mystery. The box stays sealed.',
              xp: 25
            }
          }
        },
        {
          text: 'Force it open',
          skill_check: { survival: 20 },
          outcomes: {
            success: {
              message: 'You break the box open, but damage the contents.',
              gold: 100,
              xp: 30
            },
            failure: {
              message: 'The box is too sturdy. You hurt your hand trying.',
              health: -5
            }
          }
        },
        {
          text: 'Take it with you',
          outcomes: {
            always: {
              message: 'You carefully pack the box for later examination.',
              items: ['sealed_puzzle_box']
            }
          }
        }
      ] as ExplorationChoice[]
    }
  ]

  // Insert events if they don't exist
  for (const event of events) {
    const { data: existing } = await supabase
      .from('exploration_events')
      .select('id')
      .eq('event_name', event.event_name!)
      .single()

    if (!existing) {
      await supabase.from('exploration_events').insert(event)
    }
  }
}