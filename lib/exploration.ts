import { createClient } from '@/utils/supabase/client'
import type {
  ActiveExploration,
  ExplorationUpdate,
  ZoneLandmark,
  ExplorationReward,
  ExplorationRewardConfig,
  ExplorationEvent
} from './supabase'
import { attemptLandmarkDiscovery, updateZoneTimeSpent } from './worldZones'
import { addTravelLogEntry } from './travel'
import { addItem } from './inventory'
import { addExperience, addGold } from './character'
import { rollForEvent } from './explorationEvents'
import { applySkillEffects, addExplorationSkillXP, getExplorationSkill } from './explorationSkills'
import { revealTiles, getTilesInRadius, getRevealRadius } from './mapProgress'

// ============================================================================
// Exploration Management
// ============================================================================

/**
 * Start exploring a zone
 */
export async function startExploration(
  characterId: string,
  zoneId: string,
  auto: boolean = false,
  autoStopAt?: number,
  supplies?: Array<{ id: string; quantity: number }>,
  expeditionType: 'scout' | 'standard' | 'deep' | 'legendary' = 'standard'
): Promise<{ data: ActiveExploration | null; error: Error | null }> {
  const supabase = createClient()
  try {
    // Check if already exploring
    const { data: existing } = await supabase
      .from('active_explorations')
      .select('*')
      .eq('character_id', characterId)
      .maybeSingle()

    if (existing) {
      throw new Error('Already exploring a zone')
    }

    // Get character stats for failure calculation
    const { data: character } = await supabase
      .from('characters')
      .select('level, gold, attack, defense, health')
      .eq('id', characterId)
      .single()

    if (!character) throw new Error('Character not found')

    // Get zone danger level
    const { data: zone } = await supabase
      .from('world_zones')
      .select('danger_level')
      .eq('id', zoneId)
      .single()

    if (!zone) throw new Error('Zone not found')

    // Calculate total supply cost
    let totalCost = 0
    if (supplies && supplies.length > 0) {
      const { data: supplyData } = await supabase
        .from('expedition_supplies')
        .select('*')
        .in('id', supplies.map(s => s.id))

      if (supplyData) {
        totalCost = supplyData.reduce((total, supply) => {
          const selected = supplies.find(s => s.id === supply.id)
          return total + (supply.cost * (selected?.quantity || 0))
        }, 0)
      }
    }

    // Check if character can afford supplies
    if (character.gold < totalCost) {
      throw new Error('Insufficient gold for expedition supplies')
    }

    // Deduct gold for supplies
    if (totalCost > 0) {
      await supabase
        .from('characters')
        .update({ gold: character.gold - totalCost })
        .eq('id', characterId)
    }

    // Calculate failure chance based on danger vs stats
    const failureChance = calculateFailureChance(
      character.level,
      character.attack,
      character.defense,
      zone.danger_level,
      expeditionType
    )

    // Create exploration session
    const { data, error } = await supabase
      .from('active_explorations')
      .insert({
        character_id: characterId,
        zone_id: zoneId,
        started_at: new Date().toISOString(),
        exploration_progress: 0,
        discoveries_found: 0,
        is_auto: auto,
        auto_stop_at: autoStopAt,
        supplies_used: supplies || [],
        expedition_cost: totalCost,
        expedition_type: expeditionType,
        failure_chance: failureChance,
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (err) {
    console.error('Error starting exploration:', err)
    return { data: null, error: err as Error }
  }
}

/**
 * Calculate failure chance based on character stats vs zone danger
 */
function calculateFailureChance(
  characterLevel: number,
  attack: number,
  defense: number,
  zoneDanger: number,
  expeditionType: string
): number {
  // Base chance from level difference
  const levelDiff = zoneDanger - characterLevel
  let baseChance = Math.max(0, levelDiff * 2) // 2% per level below zone requirement

  // Adjust for character stats (attack + defense reduces risk)
  const statScore = (attack + defense) / 2
  const statReduction = Math.min(statScore / 20, 15) // Max 15% reduction from stats
  baseChance = Math.max(0, baseChance - statReduction)

  // Expedition type modifiers
  const typeModifiers = {
    scout: 0.5,      // 50% less risk (quick and safe)
    standard: 1.0,   // Normal risk
    deep: 1.5,       // 50% more risk (higher rewards, higher danger)
    legendary: 2.0   // 100% more risk (extreme danger)
  }

  baseChance *= typeModifiers[expeditionType as keyof typeof typeModifiers] || 1.0

  // Cap between 5% and 60%
  return Math.min(Math.max(baseChance, 5), 60)
}

/**
 * Get active exploration session
 */
export async function getActiveExploration(
  characterId: string
): Promise<{ data: ActiveExploration | null; error: Error | null }> {
  const supabase = createClient()
  try {
    const { data, error } = await supabase
      .from('active_explorations')
      .select('*')
      .eq('character_id', characterId)
      .maybeSingle()

    if (error) throw error
    return { data: data || null, error: null }
  } catch (err) {
    console.error('Error fetching active exploration:', err)
    return { data: null, error: err as Error }
  }
}

/**
 * Roll for item from loot table using weighted random selection
 */
function rollLootTable(lootTable: Record<string, number>): string | null {
  const items = Object.entries(lootTable)
  if (items.length === 0) return null

  const totalWeight = items.reduce((sum, [_, weight]) => sum + weight, 0)
  let random = Math.random() * totalWeight

  for (const [itemId, weight] of items) {
    random -= weight
    if (random <= 0) return itemId
  }

  return items[items.length - 1][0] // fallback to last item
}

/**
 * Check and award exploration rewards for progress milestones
 */
async function checkExplorationRewards(
  characterId: string,
  zoneId: string,
  currentProgress: number,
  lastRewardPercent: number
): Promise<ExplorationReward[]> {
  const supabase = createClient()
  const rewards: ExplorationReward[] = []

  try {
    // Get reward configs for each percent between last check and current progress
    for (let percent = lastRewardPercent + 1; percent <= currentProgress; percent++) {
      const { data: config } = await supabase
        .from('exploration_rewards_config')
        .select('*')
        .eq('zone_id', zoneId)
        .eq('progress_percent', percent)
        .maybeSingle()

      if (!config) continue

      // Balanced reward system - quality over quantity
      // Use configured reward chance (5-35% based on milestone)
      const isMilestone = percent % 10 === 0
      const rewardChance = config.reward_chance

      // Roll for reward
      const shouldGiveReward = Math.random() <= rewardChance

      if (shouldGiveReward) {
        const items: string[] = []
        // Modest gold multiplier (1-1.5x, slightly higher on milestones)
        const goldMultiplier = isMilestone ? 1.5 : (1 + Math.random() * 0.5)
        const gold = Math.floor((Math.floor(Math.random() * (config.gold_max - config.gold_min + 1)) + config.gold_min) * goldMultiplier)

        // Modest XP multiplier (1-1.5x, slightly higher on milestones)
        const xpMultiplier = isMilestone ? 1.5 : (1 + Math.random() * 0.5)
        const xp = Math.floor((Math.floor(Math.random() * (config.xp_max - config.xp_min + 1)) + config.xp_min) * xpMultiplier)

        // Roll 1-2 items from loot table (2-3 items on milestones)
        const baseItemCount = isMilestone ? 2 : 1
        const itemRange = isMilestone ? 2 : 2
        const itemCount = Math.floor(Math.random() * itemRange) + baseItemCount
        for (let i = 0; i < itemCount; i++) {
          const itemId = rollLootTable(config.loot_table)
          if (itemId) items.push(itemId)
        }

        // Award rewards
        if (gold > 0) await addGold(characterId, gold)
        if (xp > 0) await addExperience(characterId, xp)
        for (const itemId of items) {
          await addItem(characterId, itemId, 1)
        }

        // Log reward
        await supabase.from('exploration_rewards_log').insert({
          character_id: characterId,
          zone_id: zoneId,
          progress_percent: percent,
          items_received: items,
          gold_received: gold,
          xp_received: xp
        })

        rewards.push({
          items,
          gold,
          xp,
          progress_percent: percent
        })

        // Log to travel log
        const rewardSummary = []
        if (items.length > 0) rewardSummary.push(`${items.length} items`)
        if (gold > 0) rewardSummary.push(`${gold} gold`)
        if (xp > 0) rewardSummary.push(`${xp} XP`)

        if (rewardSummary.length > 0) {
          const treasureType = isMilestone ? '🎁 Treasure Chest' : '💰 Treasure'
          await addTravelLogEntry(
            characterId,
            zoneId,
            'landmark_found' as any, // Using landmark_found as closest type for rewards
            `${treasureType} found at ${percent}%! Received: ${rewardSummary.join(', ')}`
          )
        }
      }
    }

    return rewards
  } catch (err) {
    console.error('Error checking exploration rewards:', err)
    return rewards
  }
}

/**
 * Process exploration progress
 */
export async function processExploration(
  characterId: string
): Promise<{ data: ExplorationUpdate | null; error: Error | null }> {
  const supabase = createClient()
  try {
    const { data: exploration, error: expError } = await getActiveExploration(characterId)
    if (expError) throw expError
    if (!exploration) throw new Error('No active exploration')

    const now = new Date()
    const started = new Date(exploration.started_at)
    const timeSpent = Math.floor((now.getTime() - started.getTime()) / 1000) // seconds

    // Get zone danger level for event rolling
    const { data: zone } = await supabase
      .from('world_zones')
      .select('danger_level')
      .eq('id', exploration.zone_id)
      .single()

    // Apply skill effects to exploration speed
    const { data: modifiedValues } = await applySkillEffects(characterId, {
      explorationSpeed: 15 // base: 1% per 15 seconds (DOUBLED speed)
    })

    // Calculate progress with skill bonuses
    const effectiveSpeed = modifiedValues?.explorationSpeed || 15
    const progress = Math.min(Math.floor(timeSpent / effectiveSpeed), 100)

    // Roll for discoveries every 5% progress increase (DOUBLED frequency)
    const discoveries: ZoneLandmark[] = []
    const progressBrackets = Math.floor(progress / 5)
    const previousBrackets = Math.floor(exploration.exploration_progress / 5)

    if (progressBrackets > previousBrackets) {
      // Attempt discovery for each new 5% bracket
      for (let i = previousBrackets; i < progressBrackets; i++) {
        const { data: discovery } = await attemptLandmarkDiscovery(
          characterId,
          exploration.zone_id
        )

        if (discovery) {
          discoveries.push(discovery)
          // Grant archaeology XP for discoveries (3x increased)
          await addExplorationSkillXP(characterId, 'archaeology', 60)
        }
      }
    }

    // Roll for exploration events (20% chance every progress tick - 4x increase)
    let triggeredEvent: ExplorationEvent | null = null
    if (progress > exploration.exploration_progress && Math.random() < 0.20) {
      const { data: event } = await rollForEvent(
        characterId,
        exploration.zone_id,
        progress,
        zone?.danger_level || 10
      )

      if (event) {
        triggeredEvent = event
        // Log the event for the player to respond to later
        await supabase.from('exploration_event_log').insert({
          character_id: characterId,
          event_id: event.id,
          zone_id: exploration.zone_id,
          outcome: { pending: true }
        })
      }
    }

    // Check for rewards at each new percent
    const rewards = await checkExplorationRewards(
      characterId,
      exploration.zone_id,
      progress,
      exploration.last_reward_percent || 0
    )

    // Update exploration progress
    await supabase
      .from('active_explorations')
      .update({
        exploration_progress: progress,
        discoveries_found: exploration.discoveries_found + discoveries.length,
        last_reward_percent: progress,
        updated_at: now.toISOString()
      })
      .eq('id', exploration.id)

    // Update zone time spent
    await updateZoneTimeSpent(characterId, exploration.zone_id, 10) // Add 10 seconds

    // Log discoveries
    for (const discovery of discoveries) {
      await addTravelLogEntry(
        characterId,
        exploration.zone_id,
        'landmark_found',
        `Discovered ${discovery.name} while exploring`
      )
    }

    // Grant general exploration XP (4x increased for all skills)
    if (progress > exploration.exploration_progress) {
      await addExplorationSkillXP(characterId, 'survival', 20)
      await addExplorationSkillXP(characterId, 'tracking', 15)
      await addExplorationSkillXP(characterId, 'cartography', 18)

      // Reveal map tiles based on progress
      const progressIncrease = progress - exploration.exploration_progress
      if (progressIncrease > 0) {
        // Get cartography skill level for reveal bonus
        const { data: cartographySkill } = await getExplorationSkill(characterId, 'cartography')
        const cartographyLevel = cartographySkill?.level || 1

        // Base reveal radius, increased by cartography
        const baseRadius = 2
        const revealRadius = getRevealRadius(baseRadius, cartographyLevel)

        // Calculate current position based on progress (simulate movement)
        const mapSize = 20
        const currentX = Math.floor((progress / 100) * mapSize)
        const currentY = Math.floor(Math.random() * mapSize)

        // Get tiles to reveal
        const tilesToReveal = getTilesInRadius(currentX, currentY, revealRadius, mapSize, mapSize)

        // Reveal tiles on map
        await revealTiles(characterId, exploration.zone_id, tilesToReveal, { x: currentX, y: currentY })
      }
    }

    // Roll for failure (once at 50% progress)
    let failed = false
    let failureReason = ''

    if (progress >= 50 && !exploration.failed && exploration.failure_chance > 0) {
      const failRoll = Math.random() * 100

      if (failRoll < exploration.failure_chance) {
        failed = true

        // Determine failure type
        const failureTypes = [
          'Ambushed by enemies and forced to retreat!',
          'Equipment failure - expedition aborted for safety.',
          'Lost in the wilderness, had to turn back.',
          'Dangerous conditions forced an early return.',
          'Encountered overwhelming force - retreat necessary.'
        ]
        failureReason = failureTypes[Math.floor(Math.random() * failureTypes.length)]

        // Mark exploration as failed
        await supabase
          .from('active_explorations')
          .update({
            failed: true,
            failure_reason: failureReason
          })
          .eq('id', exploration.id)

        // Apply failure penalties
        await applyFailurePenalties(characterId, exploration)
      }
    }

    // Check if completed, failed, or should auto-stop
    const completed = progress >= 100 ||
                     failed ||
                     (exploration.is_auto && exploration.auto_stop_at != null && progress >= exploration.auto_stop_at)

    return {
      data: {
        progress,
        discoveries,
        rewards,
        timeSpent,
        completed,
        failed,
        failureReason,
        event: triggeredEvent as any // Include the triggered event if any
      },
      error: null
    }
  } catch (err) {
    console.error('Error processing exploration:', err)
    return { data: null, error: err as Error }
  }
}

/**
 * Apply penalties when expedition fails
 */
async function applyFailurePenalties(
  characterId: string,
  exploration: ActiveExploration
): Promise<void> {
  const supabase = createClient()

  try {
    // Get character stats
    const { data: character } = await supabase
      .from('characters')
      .select('health, max_health, gold')
      .eq('id', characterId)
      .single()

    if (!character) return

    // Calculate penalties based on expedition type
    const penalties = {
      scout: { healthLoss: 0.10, goldLoss: 0.20 },      // 10% health, 20% gold
      standard: { healthLoss: 0.20, goldLoss: 0.30 },   // 20% health, 30% gold
      deep: { healthLoss: 0.35, goldLoss: 0.40 },       // 35% health, 40% gold
      legendary: { healthLoss: 0.50, goldLoss: 0.50 }   // 50% health, 50% gold
    }

    const expeditionType = (exploration as any).expedition_type || 'standard'
    const penalty = penalties[expeditionType as keyof typeof penalties] || penalties.standard

    // Calculate health loss (percentage of max health)
    const healthLoss = Math.floor(character.max_health * penalty.healthLoss)
    const newHealth = Math.max(1, character.health - healthLoss) // Never go below 1 HP

    // Calculate gold loss (percentage of current gold, plus any expedition cost)
    const expeditionCost = (exploration as any).expedition_cost || 0
    const goldLoss = Math.floor(character.gold * penalty.goldLoss) + Math.floor(expeditionCost * 0.5) // Lose 50% of supply cost too
    const newGold = Math.max(0, character.gold - goldLoss)

    // Apply penalties
    await supabase
      .from('characters')
      .update({
        health: newHealth,
        gold: newGold
      })
      .eq('id', characterId)

    // Log the failure
    await addTravelLogEntry(
      characterId,
      exploration.zone_id,
      'exploration_completed',
      `Expedition FAILED: ${(exploration as any).failure_reason} Lost ${healthLoss} HP and ${goldLoss} gold.`
    )
  } catch (err) {
    console.error('Error applying failure penalties:', err)
  }
}

/**
 * Stop exploration and get summary
 */
export async function stopExploration(
  characterId: string
): Promise<{ data: any; error: Error | null }> {
  const supabase = createClient()
  try {
    const { data: exploration } = await getActiveExploration(characterId)
    if (!exploration) throw new Error('No active exploration')

    // Final progress update
    const { data: finalUpdate } = await processExploration(characterId)

    // Add log entry
    const { data: zone } = await supabase
      .from('world_zones')
      .select('name')
      .eq('id', exploration.zone_id)
      .maybeSingle()

    await addTravelLogEntry(
      characterId,
      exploration.zone_id,
      'exploration_completed',
      `Finished exploring ${zone?.name || 'zone'} (${exploration.exploration_progress}% complete, ${exploration.discoveries_found} discoveries)`
    )

    // Delete exploration session
    await supabase
      .from('active_explorations')
      .delete()
      .eq('id', exploration.id)

    return {
      data: {
        progress: exploration.exploration_progress,
        discoveries: exploration.discoveries_found,
        timeSpent: finalUpdate?.timeSpent || 0
      },
      error: null
    }
  } catch (err) {
    console.error('Error stopping exploration:', err)
    return { data: null, error: err as Error }
  }
}
