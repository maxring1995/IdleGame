import { supabase } from './supabase'
import type { ExplorationCompanion, CompanionAbility } from './supabase'

export type CompanionType = 'npc' | 'pet' | 'summon'
export type CompanionRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'

/**
 * Get all companions for a character
 */
export async function getCompanions(
  characterId: string
): Promise<{ data: ExplorationCompanion[] | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('exploration_companions')
      .select('*, companion_abilities(*)')
      .eq('character_id', characterId)
      .order('loyalty', { ascending: false })

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    return { data: null, error: error as Error }
  }
}

/**
 * Get active (equipped) companion
 */
export async function getActiveCompanion(
  characterId: string
): Promise<{ data: ExplorationCompanion | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('exploration_companions')
      .select('*, companion_abilities(*)')
      .eq('character_id', characterId)
      .eq('is_active', true)
      .single()

    if (error && error.code !== 'PGRST116') throw error
    return { data: error ? null : data, error: null }
  } catch (error) {
    return { data: null, error: error as Error }
  }
}

/**
 * Recruit a new companion
 */
export async function recruitCompanion(
  characterId: string,
  companionName: string,
  companionType: CompanionType,
  cost: number
): Promise<{ data: ExplorationCompanion | null; error: Error | null }> {
  try {
    // Check if character has enough gold
    const { data: character, error: charError } = await supabase
      .from('characters')
      .select('gold')
      .eq('id', characterId)
      .single()

    if (charError) throw charError

    if (character.gold < cost) {
      throw new Error('Insufficient gold')
    }

    // Deduct gold
    await supabase
      .from('characters')
      .update({ gold: character.gold - cost })
      .eq('id', characterId)

    // Create companion
    const rarity = rollCompanionRarity()
    const stats = generateCompanionStats(rarity, companionType)

    const { data, error } = await supabase
      .from('exploration_companions')
      .insert({
        character_id: characterId,
        companion_name: companionName,
        companion_type: companionType,
        rarity,
        level: 1,
        experience: 0,
        loyalty: 50,
        is_active: false,
        stats,
        personality_traits: generatePersonalityTraits(companionType)
      })
      .select()
      .single()

    if (error) throw error

    // Add starting ability
    await addCompanionAbility(data.id, companionType, rarity)

    return { data, error: null }
  } catch (error) {
    return { data: null, error: error as Error }
  }
}

/**
 * Set active companion
 */
export async function setActiveCompanion(
  characterId: string,
  companionId: string
): Promise<{ data: boolean; error: Error | null }> {
  try {
    // Deactivate all companions
    await supabase
      .from('exploration_companions')
      .update({ is_active: false })
      .eq('character_id', characterId)

    // Activate selected companion
    const { error } = await supabase
      .from('exploration_companions')
      .update({ is_active: true })
      .eq('id', companionId)
      .eq('character_id', characterId)

    if (error) throw error
    return { data: true, error: null }
  } catch (error) {
    return { data: false, error: error as Error }
  }
}

/**
 * Add experience to companion
 */
export async function addCompanionXP(
  companionId: string,
  xp: number
): Promise<{ data: { leveled_up: boolean; new_level?: number } | null; error: Error | null }> {
  try {
    const { data: companion, error: fetchError } = await supabase
      .from('exploration_companions')
      .select('*')
      .eq('id', companionId)
      .single()

    if (fetchError) throw fetchError

    const newXP = companion.experience + xp
    const xpForNextLevel = companion.level * 150
    let newLevel = companion.level
    let leveledUp = false

    if (newXP >= xpForNextLevel) {
      newLevel += 1
      leveledUp = true

      // Learn new ability every 5 levels
      if (newLevel % 5 === 0) {
        await addCompanionAbility(companionId, companion.companion_type, companion.rarity)
      }
    }

    await supabase
      .from('exploration_companions')
      .update({
        experience: newXP,
        level: newLevel,
        loyalty: Math.min(100, companion.loyalty + (leveledUp ? 5 : 1))
      })
      .eq('id', companionId)

    return {
      data: { leveled_up: leveledUp, new_level: leveledUp ? newLevel : undefined },
      error: null
    }
  } catch (error) {
    return { data: null, error: error as Error }
  }
}

/**
 * Increase companion loyalty
 */
export async function increaseLoyalty(
  companionId: string,
  amount: number = 5
): Promise<{ data: number | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('exploration_companions')
      .select('loyalty')
      .eq('id', companionId)
      .single()

    if (error) throw error

    const newLoyalty = Math.min(100, data.loyalty + amount)

    await supabase
      .from('exploration_companions')
      .update({ loyalty: newLoyalty })
      .eq('id', companionId)

    return { data: newLoyalty, error: null }
  } catch (error) {
    return { data: null, error: error as Error }
  }
}

/**
 * Use companion ability
 */
export async function useCompanionAbility(
  companionId: string,
  abilityId: string,
  targetType: 'self' | 'enemy' | 'environment' = 'self'
): Promise<{
  data: {
    success: boolean
    effects: Record<string, number>
    message: string
  } | null
  error: Error | null
}> {
  try {
    const { data: ability, error: abilityError } = await supabase
      .from('companion_abilities')
      .select('*')
      .eq('id', abilityId)
      .single()

    if (abilityError) throw abilityError

    // Check cooldown
    if (ability.cooldown_remaining && ability.cooldown_remaining > 0) {
      throw new Error('Ability is on cooldown')
    }

    // Apply effects
    const effects = ability.effects as Record<string, number>
    const message = `${ability.ability_name} activated! ${ability.description}`

    // Set cooldown
    await supabase
      .from('companion_abilities')
      .update({ cooldown_remaining: ability.cooldown_seconds })
      .eq('id', abilityId)

    // Increase loyalty for using ability
    await increaseLoyalty(companionId, 2)

    return {
      data: { success: true, effects, message },
      error: null
    }
  } catch (error) {
    return { data: null, error: error as Error }
  }
}

/**
 * Helper: Roll companion rarity
 */
function rollCompanionRarity(): CompanionRarity {
  const roll = Math.random() * 100

  if (roll < 50) return 'common'
  if (roll < 75) return 'uncommon'
  if (roll < 90) return 'rare'
  if (roll < 98) return 'epic'
  return 'legendary'
}

/**
 * Helper: Generate companion stats based on rarity
 */
function generateCompanionStats(rarity: CompanionRarity, type: CompanionType): Record<string, number> {
  const baseStats = {
    common: { attack: 10, defense: 10, utility: 10 },
    uncommon: { attack: 15, defense: 15, utility: 15 },
    rare: { attack: 25, defense: 25, utility: 25 },
    epic: { attack: 40, defense: 40, utility: 40 },
    legendary: { attack: 60, defense: 60, utility: 60 }
  }

  const stats = baseStats[rarity]

  // Type specialization
  if (type === 'pet') {
    stats.utility += 10
  } else if (type === 'npc') {
    stats.attack += 10
    stats.defense += 10
  } else if (type === 'summon') {
    stats.attack += 15
    stats.defense -= 5
  }

  return stats
}

/**
 * Helper: Generate personality traits
 */
function generatePersonalityTraits(type: CompanionType): string[] {
  const traitPool: Record<CompanionType, string[]> = {
    pet: ['Loyal', 'Playful', 'Brave', 'Cautious', 'Curious', 'Protective'],
    npc: ['Wise', 'Witty', 'Serious', 'Cheerful', 'Mysterious', 'Noble'],
    summon: ['Obedient', 'Powerful', 'Ancient', 'Ephemeral', 'Mystical', 'Chaotic']
  }

  const traits = traitPool[type]
  const selected: string[] = []

  // Pick 2-3 random traits
  const numTraits = Math.floor(Math.random() * 2) + 2
  while (selected.length < numTraits) {
    const trait = traits[Math.floor(Math.random() * traits.length)]
    if (!selected.includes(trait)) {
      selected.push(trait)
    }
  }

  return selected
}

/**
 * Helper: Add companion ability
 */
async function addCompanionAbility(
  companionId: string,
  companionType: CompanionType,
  rarity: CompanionRarity
): Promise<void> {
  const abilityTemplates: Record<CompanionType, any[]> = {
    pet: [
      {
        ability_name: 'Keen Senses',
        ability_type: 'passive',
        description: 'Increases resource detection range',
        effects: { resource_detection: 25, treasure_chance: 10 },
        cooldown_seconds: 0
      },
      {
        ability_name: 'Loyal Guard',
        ability_type: 'defensive',
        description: 'Reduces damage taken',
        effects: { damage_reduction: 15 },
        cooldown_seconds: 120
      },
      {
        ability_name: 'Track Prey',
        ability_type: 'active',
        description: 'Reveals nearby creatures and treasures',
        effects: { reveal_radius: 3, duration: 60 },
        cooldown_seconds: 300
      }
    ],
    npc: [
      {
        ability_name: 'Combat Training',
        ability_type: 'offensive',
        description: 'Increases attack damage',
        effects: { attack_bonus: 20, critical_chance: 10 },
        cooldown_seconds: 0
      },
      {
        ability_name: 'Tactical Advice',
        ability_type: 'utility',
        description: 'Provides strategic bonuses',
        effects: { xp_bonus: 15, success_rate: 10 },
        cooldown_seconds: 180
      },
      {
        ability_name: 'Emergency Healing',
        ability_type: 'support',
        description: 'Restores health in dire situations',
        effects: { health_restore: 50 },
        cooldown_seconds: 600
      }
    ],
    summon: [
      {
        ability_name: 'Arcane Burst',
        ability_type: 'offensive',
        description: 'Unleashes magical energy',
        effects: { magic_damage: 50, area_effect: 2 },
        cooldown_seconds: 90
      },
      {
        ability_name: 'Ethereal Shield',
        ability_type: 'defensive',
        description: 'Creates a protective barrier',
        effects: { damage_reduction: 30, duration: 30 },
        cooldown_seconds: 240
      },
      {
        ability_name: 'Mystical Link',
        ability_type: 'utility',
        description: 'Shares knowledge and power',
        effects: { skill_xp_bonus: 25, mana_regen: 10 },
        cooldown_seconds: 0
      }
    ]
  }

  const abilities = abilityTemplates[companionType]
  const ability = abilities[Math.floor(Math.random() * abilities.length)]

  // Scale effects with rarity
  const rarityMultipliers = {
    common: 1.0,
    uncommon: 1.3,
    rare: 1.6,
    epic: 2.0,
    legendary: 2.5
  }

  const multiplier = rarityMultipliers[rarity]
  const scaledEffects: Record<string, number> = {}

  for (const [key, value] of Object.entries(ability.effects)) {
    scaledEffects[key] = Math.floor((value as number) * multiplier)
  }

  await supabase.from('companion_abilities').insert({
    companion_id: companionId,
    ...ability,
    effects: scaledEffects
  })
}

/**
 * Get companion bonuses for exploration
 */
export async function getCompanionBonuses(
  characterId: string
): Promise<{ data: Record<string, number> | null; error: Error | null }> {
  try {
    const { data: companion } = await getActiveCompanion(characterId)

    if (!companion) {
      return { data: {}, error: null }
    }

    const bonuses: Record<string, number> = {}

    // Base stat bonuses
    const stats = companion.stats as Record<string, number>
    bonuses.attack_bonus = stats.attack || 0
    bonuses.defense_bonus = stats.defense || 0
    bonuses.utility_bonus = stats.utility || 0

    // Loyalty multiplier
    const loyaltyMultiplier = companion.loyalty / 100
    bonuses.loyalty_multiplier = loyaltyMultiplier

    // Passive ability bonuses
    const abilities = companion.companion_abilities as CompanionAbility[]
    for (const ability of abilities || []) {
      if (ability.ability_type === 'passive') {
        const effects = ability.effects as Record<string, number>
        for (const [key, value] of Object.entries(effects)) {
          bonuses[key] = (bonuses[key] || 0) + value * loyaltyMultiplier
        }
      }
    }

    return { data: bonuses, error: null }
  } catch (error) {
    return { data: null, error: error as Error }
  }
}
