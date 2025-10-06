// Zone Modifier System
// Makes zones affect all game systems: combat, gathering, crafting, quests, merchants

import { createClient } from '@/utils/supabase/client'

// ============================================================================
// Types
// ============================================================================

export interface ZoneModifiers {
  combat?: CombatModifiers
  gathering?: GatheringModifiers
  crafting?: CraftingModifiers
  merchants?: MerchantModifiers
  quests?: QuestModifiers
}

export interface CombatModifiers {
  damage_bonus: number // 0.15 = +15% damage
  defense_bonus: number // 0.1 = +10% defense
  hp_regen_bonus: number // 0.05 = +5% HP regen
  mp_regen_bonus: number // 0.2 = +20% MP regen
  enemy_types: string[] // Enemy types that spawn in this zone
}

export interface GatheringModifiers {
  spawn_rate_modifiers: {
    woodcutting?: number // 1.5 = 50% more nodes, gather 33% faster
    mining?: number
    fishing?: number
    hunting?: number
    alchemy?: number
    magic?: number
  }
  xp_bonus: number // 0.1 = +10% XP from gathering
}

export interface CraftingModifiers {
  success_rate_bonus: {
    [craftType: string]: number // 'smithing': 0.3 = +30% success rate
    all?: number // Bonus to all crafting types
  }
  cost_reduction: {
    [craftType: string]: number // 'alchemy': 0.15 = 15% cheaper materials
    all?: number
  }
  quality_bonus: number // 0.1 = +10% chance for higher quality
}

export interface MerchantModifiers {
  price_modifier: number // 0.95 = 5% cheaper, 1.1 = 10% more expensive
  unique_items: string[] // Item IDs available only in this zone
}

export interface QuestModifiers {
  available_chains: string[] // Quest chain IDs available in this zone
}

export interface CombatModifierResult {
  modified_damage: number
  modified_defense: number
  mp_regen_bonus: number
  hp_regen_bonus: number
}

export interface GatheringModifierResult {
  modified_time_ms: number
  spawn_rate_modifier: number
  xp_bonus: number
}

export interface CraftingModifierResult {
  modified_success_rate: number
  modified_cost: number
  quality_bonus: number
}

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Get all zone modifiers for a character based on their current zone
 */
export async function getCharacterZoneModifiers(
  characterId: string
): Promise<{ data: ZoneModifiers | null; error: Error | null }> {
  try {
    const supabase = createClient()

    const { data, error } = await supabase.rpc('get_character_zone_modifiers', {
      p_character_id: characterId
    })

    if (error) throw error

    return { data: data as ZoneModifiers, error: null }
  } catch (error) {
    console.error('Error getting character zone modifiers:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Apply zone modifiers to combat stats
 */
export async function applyZoneCombatModifiers(
  characterId: string,
  baseDamage: number,
  baseDefense: number
): Promise<{ data: CombatModifierResult | null; error: Error | null }> {
  try {
    const supabase = createClient()

    const { data, error } = await supabase.rpc('apply_zone_combat_modifiers', {
      p_character_id: characterId,
      p_base_damage: baseDamage,
      p_base_defense: baseDefense
    })

    if (error) throw error

    return { data: data as CombatModifierResult, error: null }
  } catch (error) {
    console.error('Error applying zone combat modifiers:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Apply zone modifiers to gathering operations
 */
export async function applyZoneGatheringModifiers(
  characterId: string,
  skillType: string,
  baseTimeMs: number
): Promise<{ data: GatheringModifierResult | null; error: Error | null }> {
  try {
    const supabase = createClient()

    const { data, error } = await supabase.rpc('apply_zone_gathering_modifiers', {
      p_character_id: characterId,
      p_skill_type: skillType,
      p_base_time_ms: baseTimeMs
    })

    if (error) throw error

    return { data: data as GatheringModifierResult, error: null }
  } catch (error) {
    console.error('Error applying zone gathering modifiers:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Apply zone modifiers to crafting operations
 */
export async function applyZoneCraftingModifiers(
  characterId: string,
  craftType: string,
  baseSuccessRate: number,
  baseCost: number
): Promise<{ data: CraftingModifierResult | null; error: Error | null }> {
  try {
    const supabase = createClient()

    const { data, error } = await supabase.rpc('apply_zone_crafting_modifiers', {
      p_character_id: characterId,
      p_craft_type: craftType,
      p_base_success_rate: baseSuccessRate,
      p_base_cost: baseCost
    })

    if (error) throw error

    return { data: data as CraftingModifierResult, error: null }
  } catch (error) {
    console.error('Error applying zone crafting modifiers:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Get merchant modifiers for a character's current zone
 */
export async function getZoneMerchantModifiers(
  characterId: string
): Promise<{ data: MerchantModifiers | null; error: Error | null }> {
  try {
    const supabase = createClient()

    const { data, error } = await supabase.rpc('get_zone_merchant_modifiers', {
      p_character_id: characterId
    })

    if (error) throw error

    return { data: data as MerchantModifiers, error: null }
  } catch (error) {
    console.error('Error getting zone merchant modifiers:', error)
    return { data: null, error: error as Error }
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Format a modifier as a percentage string
 * @example formatModifier(0.15, true) => "+15%"
 * @example formatModifier(-0.1, false) => "-10%"
 */
export function formatModifier(value: number, showPlus: boolean = true): string {
  const percent = Math.round(value * 100)
  if (percent === 0) return '0%'
  if (percent > 0 && showPlus) return `+${percent}%`
  return `${percent}%`
}

/**
 * Get a human-readable description of combat modifiers
 */
export function describeCombatModifiers(mods: CombatModifiers): string[] {
  const descriptions: string[] = []

  if (mods.damage_bonus !== 0) {
    descriptions.push(`${formatModifier(mods.damage_bonus)} Attack`)
  }
  if (mods.defense_bonus !== 0) {
    descriptions.push(`${formatModifier(mods.defense_bonus)} Defense`)
  }
  if (mods.hp_regen_bonus !== 0) {
    descriptions.push(`${formatModifier(mods.hp_regen_bonus)} HP Regen`)
  }
  if (mods.mp_regen_bonus !== 0) {
    descriptions.push(`${formatModifier(mods.mp_regen_bonus)} MP Regen`)
  }

  return descriptions
}

/**
 * Get a human-readable description of gathering modifiers
 */
export function describeGatheringModifiers(mods: GatheringModifiers): string[] {
  const descriptions: string[] = []

  const skillNames: Record<string, string> = {
    woodcutting: 'Woodcutting',
    mining: 'Mining',
    fishing: 'Fishing',
    hunting: 'Hunting',
    alchemy: 'Alchemy',
    magic: 'Magic'
  }

  Object.entries(mods.spawn_rate_modifiers).forEach(([skill, modifier]) => {
    if (modifier !== 1.0) {
      const speedBonus = ((modifier - 1) * 100).toFixed(0)
      const sign = modifier > 1 ? '+' : ''
      descriptions.push(`${sign}${speedBonus}% ${skillNames[skill]} speed`)
    }
  })

  if (mods.xp_bonus !== 0) {
    descriptions.push(`${formatModifier(mods.xp_bonus)} Gathering XP`)
  }

  return descriptions
}

/**
 * Get a human-readable description of crafting modifiers
 */
export function describeCraftingModifiers(mods: CraftingModifiers): string[] {
  const descriptions: string[] = []

  // Success rate bonuses
  Object.entries(mods.success_rate_bonus).forEach(([type, bonus]) => {
    if (bonus !== 0) {
      const label = type === 'all' ? 'All Crafting' : type.charAt(0).toUpperCase() + type.slice(1)
      descriptions.push(`${formatModifier(bonus)} ${label} Success`)
    }
  })

  // Cost reductions
  Object.entries(mods.cost_reduction).forEach(([type, reduction]) => {
    if (reduction !== 0) {
      const label = type === 'all' ? 'All Crafting' : type.charAt(0).toUpperCase() + type.slice(1)
      descriptions.push(`${formatModifier(reduction)} ${label} Cost`)
    }
  })

  if (mods.quality_bonus !== 0) {
    descriptions.push(`${formatModifier(mods.quality_bonus)} Quality Chance`)
  }

  return descriptions
}

/**
 * Get a human-readable description of merchant modifiers
 */
export function describeMerchantModifiers(mods: MerchantModifiers): string[] {
  const descriptions: string[] = []

  if (mods.price_modifier !== 1.0) {
    const discount = (1 - mods.price_modifier) * 100
    if (discount > 0) {
      descriptions.push(`${discount.toFixed(0)}% Cheaper Prices`)
    } else {
      descriptions.push(`${Math.abs(discount).toFixed(0)}% Higher Prices`)
    }
  }

  if (mods.unique_items.length > 0) {
    descriptions.push(`${mods.unique_items.length} Unique Items`)
  }

  return descriptions
}

/**
 * Get all zone modifiers in a human-readable format
 */
export function describeAllModifiers(mods: ZoneModifiers): {
  combat: string[]
  gathering: string[]
  crafting: string[]
  merchants: string[]
} {
  return {
    combat: mods.combat ? describeCombatModifiers(mods.combat) : [],
    gathering: mods.gathering ? describeGatheringModifiers(mods.gathering) : [],
    crafting: mods.crafting ? describeCraftingModifiers(mods.crafting) : [],
    merchants: mods.merchants ? describeMerchantModifiers(mods.merchants) : []
  }
}

/**
 * Check if a zone has any active modifiers
 */
export function hasActiveModifiers(mods: ZoneModifiers): boolean {
  if (!mods) return false

  const hasCombat = mods.combat && (
    mods.combat.damage_bonus !== 0 ||
    mods.combat.defense_bonus !== 0 ||
    mods.combat.hp_regen_bonus !== 0 ||
    mods.combat.mp_regen_bonus !== 0
  )

  const hasGathering = mods.gathering && (
    Object.values(mods.gathering.spawn_rate_modifiers).some(v => v !== 1.0) ||
    mods.gathering.xp_bonus !== 0
  )

  const hasCrafting = mods.crafting && (
    Object.values(mods.crafting.success_rate_bonus).some(v => v !== 0) ||
    Object.values(mods.crafting.cost_reduction).some(v => v !== 0) ||
    mods.crafting.quality_bonus !== 0
  )

  const hasMerchants = mods.merchants && (
    mods.merchants.price_modifier !== 1.0 ||
    mods.merchants.unique_items.length > 0
  )

  return !!(hasCombat || hasGathering || hasCrafting || hasMerchants)
}
