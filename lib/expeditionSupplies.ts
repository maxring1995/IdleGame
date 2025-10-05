import { createClient } from '@/utils/supabase/client'
import type { ExpeditionSupply, CharacterExpedition } from './supabase'

// ============================================================================
// EXPEDITION SUPPLIES SYSTEM
// ============================================================================

/**
 * Get all available expedition supplies
 */
export async function getExpeditionSupplies(
  characterLevel: number = 1
): Promise<{ data: ExpeditionSupply[] | null; error: Error | null }> {
  const supabase = createClient()

  try {
    const { data, error } = await supabase
      .from('expedition_supplies')
      .select('*')
      .lte('level_required', characterLevel)
      .order('supply_type')
      .order('cost')

    if (error) throw error
    return { data: data as ExpeditionSupply[], error: null }
  } catch (err) {
    console.error('Error fetching expedition supplies:', err)
    return { data: null, error: err as Error }
  }
}

/**
 * Purchase expedition supplies
 */
export async function purchaseSupply(
  characterId: string,
  supplyId: string,
  quantity: number = 1
): Promise<{ data: any; error: Error | null }> {
  const supabase = createClient()

  try {
    // Get supply details
    const { data: supply } = await supabase
      .from('expedition_supplies')
      .select('*')
      .eq('id', supplyId)
      .single()

    if (!supply) throw new Error('Supply not found')

    // Get character gold
    const { data: character } = await supabase
      .from('characters')
      .select('gold')
      .eq('id', characterId)
      .single()

    if (!character) throw new Error('Character not found')

    const totalCost = supply.cost * quantity
    if (character.gold < totalCost) {
      throw new Error('Insufficient gold')
    }

    // Deduct gold
    await supabase
      .from('characters')
      .update({ gold: character.gold - totalCost })
      .eq('id', characterId)

    // Add to character's supply inventory (would need a new table)
    // For now, we'll return the purchase info
    return {
      data: {
        supply,
        quantity,
        totalCost,
        remainingGold: character.gold - totalCost
      },
      error: null
    }
  } catch (err) {
    console.error('Error purchasing supply:', err)
    return { data: null, error: err as Error }
  }
}

/**
 * Start a new expedition
 */
export async function startExpedition(
  characterId: string,
  zoneId: string,
  expeditionType: 'scout' | 'standard' | 'deep' | 'legendary',
  supplies: Array<{ id: string; quantity: number }>
): Promise<{ data: CharacterExpedition | null; error: Error | null }> {
  const supabase = createClient()

  try {
    // Check if already on expedition
    const { data: existing } = await supabase
      .from('character_expeditions')
      .select('*')
      .eq('character_id', characterId)
      .eq('status', 'active')
      .single()

    if (existing) {
      throw new Error('Already on an expedition')
    }

    // Create expedition
    const { data, error } = await supabase
      .from('character_expeditions')
      .insert({
        character_id: characterId,
        zone_id: zoneId,
        expedition_type: expeditionType,
        supplies_used: supplies,
        status: 'active',
        started_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) throw error
    return { data: data as CharacterExpedition, error: null }
  } catch (err) {
    console.error('Error starting expedition:', err)
    return { data: null, error: err as Error }
  }
}

/**
 * Get active expedition
 */
export async function getActiveExpedition(
  characterId: string
): Promise<{ data: CharacterExpedition | null; error: Error | null }> {
  const supabase = createClient()

  try {
    const { data, error } = await supabase
      .from('character_expeditions')
      .select('*')
      .eq('character_id', characterId)
      .eq('status', 'active')
      .single()

    if (error && error.code !== 'PGRST116') throw error
    return { data: data as CharacterExpedition | null, error: null }
  } catch (err) {
    console.error('Error fetching active expedition:', err)
    return { data: null, error: err as Error }
  }
}

/**
 * Calculate expedition duration based on type (in seconds)
 */
function getExpeditionDuration(expeditionType: string): number {
  switch (expeditionType) {
    case 'scout': return 300 // 5 minutes
    case 'standard': return 600 // 10 minutes
    case 'deep': return 1200 // 20 minutes
    case 'legendary': return 1800 // 30 minutes
    default: return 600
  }
}

/**
 * Calculate expedition rewards based on type
 */
function calculateExpeditionRewards(expeditionType: string): {
  gold: { min: number; max: number }
  xp: { min: number; max: number }
  items: Array<{ id: string; chance: number }>
  materials: Array<{ type: string; min: number; max: number }>
} {
  switch (expeditionType) {
    case 'scout':
      return {
        gold: { min: 200, max: 400 },
        xp: { min: 300, max: 500 },
        items: [
          { id: 'health_potion', chance: 1.0 },
          { id: 'mana_potion', chance: 1.0 },
          { id: 'adv_berry', chance: 0.9 },
          { id: 'adv_mushroom', chance: 0.9 },
          { id: 'adv_wooden_club', chance: 0.5 },
          { id: 'adv_cloth_tunic', chance: 0.5 },
          { id: 'adv_leather_cap', chance: 0.3 },
          { id: 'adv_copper_ring', chance: 0.1 }
        ],
        materials: [
          { type: 'wood', min: 5, max: 15 },
          { type: 'stone', min: 3, max: 10 }
        ]
      }

    case 'standard':
      return {
        gold: { min: 500, max: 1000 },
        xp: { min: 800, max: 1500 },
        items: [
          { id: 'health_potion', chance: 1.0 },
          { id: 'mana_potion', chance: 1.0 },
          { id: 'greater_health_potion', chance: 0.8 },
          { id: 'adv_iron_sword', chance: 0.7 },
          { id: 'adv_leather_armor', chance: 0.7 },
          { id: 'adv_steel_sword', chance: 0.4 },
          { id: 'adv_silver_ring', chance: 0.3 },
          { id: 'adv_gold_ring', chance: 0.15 },
          { id: 'adv_rare_gem', chance: 0.1 },
          { id: 'adv_enchanted_ring', chance: 0.05 }
        ],
        materials: [
          { type: 'iron', min: 5, max: 15 },
          { type: 'wood', min: 10, max: 25 },
          { type: 'herbs', min: 3, max: 8 }
        ]
      }

    case 'deep':
      return {
        gold: { min: 1500, max: 3000 },
        xp: { min: 2500, max: 4000 },
        items: [
          { id: 'greater_health_potion', chance: 1.0 },
          { id: 'greater_mana_potion', chance: 1.0 },
          { id: 'adv_steel_sword', chance: 0.8 },
          { id: 'adv_iron_armor', chance: 0.8 },
          { id: 'adv_mythril_sword', chance: 0.6 },
          { id: 'adv_steel_armor', chance: 0.6 },
          { id: 'adv_gold_ring', chance: 0.5 },
          { id: 'adv_enchanted_ring', chance: 0.4 },
          { id: 'adv_rare_artifact', chance: 0.3 },
          { id: 'adv_epic_weapon', chance: 0.2 },
          { id: 'adv_rare_gem', chance: 0.3 },
          { id: 'adv_treasure_map', chance: 0.1 },
          { id: 'adv_legendary_weapon', chance: 0.03 }
        ],
        materials: [
          { type: 'mythril', min: 3, max: 10 },
          { type: 'iron', min: 10, max: 20 },
          { type: 'rare_gems', min: 2, max: 6 },
          { type: 'ancient_fragments', min: 1, max: 3 }
        ]
      }

    case 'legendary':
      return {
        gold: { min: 5000, max: 10000 },
        xp: { min: 6000, max: 10000 },
        items: [
          { id: 'legendary_health_potion', chance: 1.0 },
          { id: 'legendary_mana_potion', chance: 1.0 },
          { id: 'adv_mythril_sword', chance: 0.9 },
          { id: 'adv_steel_armor', chance: 0.9 },
          { id: 'adv_enchanted_ring', chance: 0.8 },
          { id: 'adv_epic_weapon', chance: 0.7 },
          { id: 'adv_epic_armor', chance: 0.7 },
          { id: 'adv_rare_artifact', chance: 0.6 },
          { id: 'adv_legendary_weapon', chance: 0.5 },
          { id: 'adv_legendary_armor', chance: 0.5 },
          { id: 'adv_treasure_map', chance: 0.6 },
          { id: 'adv_ancient_relic', chance: 0.3 },
          { id: 'adv_dragon_scale', chance: 0.2 },
          { id: 'adv_ultimate_artifact', chance: 0.1 }
        ],
        materials: [
          { type: 'adamantite', min: 5, max: 15 },
          { type: 'mythril', min: 10, max: 25 },
          { type: 'legendary_gems', min: 3, max: 8 },
          { type: 'ancient_relics', min: 2, max: 5 },
          { type: 'dragon_scales', min: 1, max: 3 }
        ]
      }

    default:
      return calculateExpeditionRewards('standard')
  }
}

/**
 * Process expedition progress and check completion
 */
export async function processExpedition(
  characterId: string
): Promise<{ data: any; error: Error | null }> {
  const supabase = createClient()

  try {
    const { data: expedition, error: fetchError } = await getActiveExpedition(characterId)
    if (fetchError) throw fetchError
    if (!expedition) return { data: null, error: new Error('No active expedition') }

    const now = new Date()
    const started = new Date(expedition.started_at)
    const timeSpent = Math.floor((now.getTime() - started.getTime()) / 1000)

    const duration = getExpeditionDuration(expedition.expedition_type)
    const progress = Math.min((timeSpent / duration) * 100, 100)
    const completed = progress >= 100

    return {
      data: {
        expedition,
        progress,
        timeSpent,
        duration,
        completed
      },
      error: null
    }
  } catch (err) {
    console.error('Error processing expedition:', err)
    return { data: null, error: err as Error }
  }
}

/**
 * Complete expedition and award rewards
 */
export async function completeExpedition(
  characterId: string
): Promise<{ data: any; error: Error | null }> {
  const supabase = createClient()

  try {
    const { data: expedition, error: fetchError } = await getActiveExpedition(characterId)
    if (fetchError) throw fetchError
    if (!expedition) return { data: null, error: new Error('No active expedition') }

    // Calculate rewards
    const rewardConfig = calculateExpeditionRewards(expedition.expedition_type)
    const rewards: any = {
      gold: 0,
      xp: 0,
      items: [],
      materials: []
    }

    // Roll gold
    rewards.gold = Math.floor(
      Math.random() * (rewardConfig.gold.max - rewardConfig.gold.min + 1) + rewardConfig.gold.min
    )

    // Roll XP
    rewards.xp = Math.floor(
      Math.random() * (rewardConfig.xp.max - rewardConfig.xp.min + 1) + rewardConfig.xp.min
    )

    // Roll items
    for (const itemConfig of rewardConfig.items) {
      if (Math.random() <= itemConfig.chance) {
        rewards.items.push(itemConfig.id)
      }
    }

    // Roll materials
    for (const materialConfig of rewardConfig.materials) {
      const quantity = Math.floor(
        Math.random() * (materialConfig.max - materialConfig.min + 1) + materialConfig.min
      )
      rewards.materials.push({
        type: materialConfig.type,
        quantity
      })
    }

    // Apply supply bonuses
    const supplies = expedition.supplies_used as Array<{ id: string; quantity: number }>
    if (supplies && supplies.length > 0) {
      // Get supply details
      const { data: supplyData } = await supabase
        .from('expedition_supplies')
        .select('*')
        .in('id', supplies.map(s => s.id))

      if (supplyData) {
        const bonuses = applySupplyEffects(
          { gold: 1, xp: 1, loot: 1 },
          supplyData as ExpeditionSupply[]
        )
        rewards.gold = Math.floor(rewards.gold * (bonuses.gold_find || 1))
        rewards.xp = Math.floor(rewards.xp * (bonuses.xp_bonus || 1))
      }
    }

    // Award gold
    const { data: character } = await supabase
      .from('characters')
      .select('gold, experience')
      .eq('id', characterId)
      .single()

    if (character) {
      await supabase
        .from('characters')
        .update({
          gold: character.gold + rewards.gold,
          experience: character.experience + rewards.xp
        })
        .eq('id', characterId)
    }

    // Award items
    const { addItem } = await import('./inventory')
    for (const itemId of rewards.items) {
      await addItem(characterId, itemId, 1)
    }

    // Mark expedition as completed
    await supabase
      .from('character_expeditions')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        rewards_received: rewards
      })
      .eq('id', expedition.id)

    return { data: rewards, error: null }
  } catch (err) {
    console.error('Error completing expedition:', err)
    return { data: null, error: err as Error }
  }
}

/**
 * Apply supply effects
 */
export function applySupplyEffects(
  baseValues: Record<string, number>,
  supplies: ExpeditionSupply[]
): Record<string, number> {
  const modified = { ...baseValues }

  for (const supply of supplies) {
    for (const [effect, value] of Object.entries(supply.effect)) {
      if (effect in modified) {
        // Multiplicative effects (like speed multipliers)
        if (effect.includes('speed') || effect.includes('bonus') || effect.includes('multiplier')) {
          modified[effect] *= value as number
        } else {
          // Additive effects
          modified[effect] += value as number
        }
      } else {
        modified[effect] = value as number
      }
    }
  }

  return modified
}

/**
 * Initialize default expedition supplies
 */
export async function seedExpeditionSupplies(): Promise<void> {
  const supabase = createClient()

  const supplies: Partial<ExpeditionSupply>[] = [
    // Food supplies
    {
      name: 'Energy Bar',
      supply_type: 'food',
      description: 'A quick energy boost that increases exploration speed.',
      effect: { exploration_speed: 1.1, stamina: 20 },
      duration: 1800, // 30 minutes
      cost: 25,
      level_required: 1,
      stack_size: 10,
      icon: '🍫'
    },
    {
      name: 'Explorer Rations',
      supply_type: 'food',
      description: 'Complete meal that provides sustained energy.',
      effect: { exploration_speed: 1.15, stamina: 50, health_regen: 5 },
      duration: 3600, // 1 hour
      cost: 75,
      level_required: 5,
      stack_size: 5,
      icon: '🥘'
    },

    // Tools
    {
      name: 'Grappling Hook',
      supply_type: 'tool',
      description: 'Access difficult terrain and hidden areas.',
      effect: { access_hidden: 1, climb_speed: 1.5 },
      cost: 200,
      level_required: 10,
      stack_size: 1,
      icon: '🪝'
    },
    {
      name: 'Lockpicks',
      supply_type: 'tool',
      description: 'Open locked chests and doors.',
      effect: { lockpicking: 1, treasure_access: 1 },
      cost: 150,
      level_required: 8,
      stack_size: 5,
      icon: '🔓'
    },

    // Light sources
    {
      name: 'Torch',
      supply_type: 'light',
      description: 'Basic light source for dark areas.',
      effect: { visibility: 1.2, discovery_chance: 0.05 },
      duration: 1800,
      cost: 20,
      level_required: 1,
      stack_size: 10,
      icon: '🔦'
    },
    {
      name: 'Enchanted Lantern',
      supply_type: 'light',
      description: 'Magical light that reveals hidden secrets.',
      effect: { visibility: 1.5, discovery_chance: 0.2, magic_detection: 1 },
      duration: 7200,
      cost: 300,
      level_required: 15,
      stack_size: 1,
      icon: '🏮'
    },

    // Medicine
    {
      name: 'Antidote',
      supply_type: 'medicine',
      description: 'Cures poison and prevents poisoning.',
      effect: { poison_resist: 1, cure_poison: 1 },
      cost: 50,
      level_required: 3,
      stack_size: 5,
      icon: '💊'
    },
    {
      name: 'Healing Salve',
      supply_type: 'medicine',
      description: 'Gradually restores health during exploration.',
      effect: { health_regen: 10, wound_recovery: 1 },
      duration: 3600,
      cost: 100,
      level_required: 5,
      stack_size: 3,
      icon: '🧴'
    },

    // Maps
    {
      name: 'Scout Map',
      supply_type: 'map',
      description: 'Reveals 25% of zone immediately.',
      effect: { instant_reveal: 0.25, navigation_bonus: 1.1 },
      cost: 150,
      level_required: 1,
      stack_size: 1,
      icon: '🗺️'
    },
    {
      name: 'Treasure Map',
      supply_type: 'map',
      description: 'Marks valuable treasure locations.',
      effect: { treasure_markers: 3, gold_find: 1.3 },
      cost: 500,
      level_required: 10,
      stack_size: 1,
      icon: '📜'
    },

    // Special items
    {
      name: 'Lucky Charm',
      supply_type: 'special',
      description: 'Increases chances of rare discoveries.',
      effect: { luck: 1.2, rare_find: 0.15, event_quality: 1.1 },
      cost: 250,
      level_required: 7,
      stack_size: 1,
      icon: '🍀'
    },
    {
      name: 'Portal Stone',
      supply_type: 'special',
      description: 'Emergency escape from dangerous situations.',
      effect: { emergency_escape: 1, instant_return: 1 },
      cost: 400,
      level_required: 12,
      stack_size: 1,
      icon: '🔮'
    }
  ]

  // Insert supplies if they don't exist
  for (const supply of supplies) {
    const { data: existing } = await supabase
      .from('expedition_supplies')
      .select('id')
      .eq('name', supply.name!)
      .single()

    if (!existing) {
      await supabase.from('expedition_supplies').insert(supply)
    }
  }
}