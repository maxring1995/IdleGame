import { createClient } from '@/utils/supabase/client'
import type { ExplorationSkill, ExplorationSkillType } from './supabase'

// ============================================================================
// EXPLORATION SKILLS SYSTEM
// ============================================================================

/**
 * Initialize exploration skills for a new character
 */
export async function initializeExplorationSkills(
  characterId: string
): Promise<{ data: ExplorationSkill[] | null; error: Error | null }> {
  const supabase = createClient()

  try {
    const skills: Partial<ExplorationSkill>[] = [
      { character_id: characterId, skill_type: 'cartography', level: 1, experience: 0, total_experience: 0 },
      { character_id: characterId, skill_type: 'survival', level: 1, experience: 0, total_experience: 0 },
      { character_id: characterId, skill_type: 'archaeology', level: 1, experience: 0, total_experience: 0 },
      { character_id: characterId, skill_type: 'tracking', level: 1, experience: 0, total_experience: 0 }
    ]

    const { data, error } = await supabase
      .from('exploration_skills')
      .insert(skills)
      .select()

    if (error) throw error
    return { data: data as ExplorationSkill[], error: null }
  } catch (err) {
    console.error('Error initializing exploration skills:', err)
    return { data: null, error: err as Error }
  }
}

/**
 * Get all exploration skills for a character
 */
export async function getExplorationSkills(
  characterId: string
): Promise<{ data: ExplorationSkill[] | null; error: Error | null }> {
  const supabase = createClient()

  try {
    const { data, error } = await supabase
      .from('exploration_skills')
      .select('*')
      .eq('character_id', characterId)
      .order('skill_type')

    if (error) throw error
    return { data: data as ExplorationSkill[], error: null }
  } catch (err) {
    console.error('Error fetching exploration skills:', err)
    return { data: null, error: err as Error }
  }
}

/**
 * Get a specific exploration skill
 */
export async function getExplorationSkill(
  characterId: string,
  skillType: ExplorationSkillType
): Promise<{ data: ExplorationSkill | null; error: Error | null }> {
  const supabase = createClient()

  try {
    const { data, error } = await supabase
      .from('exploration_skills')
      .select('*')
      .eq('character_id', characterId)
      .eq('skill_type', skillType)
      .single()

    if (error) throw error
    return { data: data as ExplorationSkill, error: null }
  } catch (err) {
    console.error('Error fetching exploration skill:', err)
    return { data: null, error: err as Error }
  }
}

/**
 * Calculate XP required for a level
 */
function calculateXPForLevel(level: number): number {
  // Progressive formula: each level requires more XP
  return Math.floor(100 * Math.pow(1.5, level - 1))
}

/**
 * Calculate total XP required to reach a level
 */
function calculateTotalXPForLevel(level: number): number {
  let total = 0
  for (let i = 1; i < level; i++) {
    total += calculateXPForLevel(i)
  }
  return total
}

/**
 * Add experience to an exploration skill
 */
export async function addExplorationSkillXP(
  characterId: string,
  skillType: ExplorationSkillType,
  xpAmount: number
): Promise<{ data: any; error: Error | null }> {
  const supabase = createClient()

  try {
    // Get current skill
    const { data: skill, error: fetchError } = await getExplorationSkill(characterId, skillType)
    if (fetchError) throw fetchError
    if (!skill) {
      // Initialize if doesn't exist
      await initializeExplorationSkills(characterId)
      return addExplorationSkillXP(characterId, skillType, xpAmount)
    }

    const newTotalXP = skill.total_experience + xpAmount
    let newLevel = skill.level
    let newExperience = skill.experience + xpAmount

    // Check for level ups
    let levelsGained = 0
    while (newExperience >= calculateXPForLevel(newLevel)) {
      newExperience -= calculateXPForLevel(newLevel)
      newLevel++
      levelsGained++
    }

    // Update skill
    const { error: updateError } = await supabase
      .from('exploration_skills')
      .update({
        level: newLevel,
        experience: newExperience,
        total_experience: newTotalXP,
        updated_at: new Date().toISOString()
      })
      .eq('character_id', characterId)
      .eq('skill_type', skillType)

    if (updateError) throw updateError

    return {
      data: {
        skill_type: skillType,
        xp_gained: xpAmount,
        new_level: newLevel,
        levels_gained: levelsGained,
        current_xp: newExperience,
        xp_for_next: calculateXPForLevel(newLevel),
        total_xp: newTotalXP
      },
      error: null
    }
  } catch (err) {
    console.error('Error adding exploration skill XP:', err)
    return { data: null, error: err as Error }
  }
}

/**
 * Get skill bonuses for a character
 */
export async function getExplorationSkillBonuses(
  characterId: string
): Promise<{ data: Record<string, any> | null; error: Error | null }> {
  try {
    const { data: skills, error } = await getExplorationSkills(characterId)
    if (error) throw error
    if (!skills) return { data: null, error: null }

    const bonuses: Record<string, any> = {}

    for (const skill of skills) {
      switch (skill.skill_type) {
        case 'cartography':
          // +2% map reveal per level, +1% movement speed per 5 levels
          bonuses.map_reveal = 1 + (skill.level * 0.02)
          bonuses.movement_speed = 1 + (Math.floor(skill.level / 5) * 0.01)
          bonuses.shortcut_chance = skill.level * 0.01
          break

        case 'survival':
          // +3% hazard resistance per level, +2% resource find per level
          bonuses.hazard_resistance = skill.level * 0.03
          bonuses.resource_bonus = 1 + (skill.level * 0.02)
          bonuses.stamina_efficiency = 1 + (skill.level * 0.01)
          break

        case 'archaeology':
          // +2% landmark discovery per level, +5% artifact find per level
          bonuses.landmark_discovery = 1 + (skill.level * 0.02)
          bonuses.artifact_chance = skill.level * 0.05
          bonuses.puzzle_hint_chance = skill.level * 0.02
          break

        case 'tracking':
          // +3% creature detection per level, +2% treasure find per level
          bonuses.creature_detection = 1 + (skill.level * 0.03)
          bonuses.treasure_find = 1 + (skill.level * 0.02)
          bonuses.trail_visibility = skill.level * 0.01
          break
      }
    }

    // Calculate overall exploration efficiency
    const totalLevels = skills.reduce((sum, s) => sum + s.level, 0)
    bonuses.exploration_speed = 1 + (totalLevels * 0.005) // +0.5% speed per total level
    bonuses.event_quality = 1 + (totalLevels * 0.002) // +0.2% better event outcomes per level

    return { data: bonuses, error: null }
  } catch (err) {
    console.error('Error calculating skill bonuses:', err)
    return { data: null, error: err as Error }
  }
}

/**
 * Get skill progress information
 */
export async function getSkillProgress(
  characterId: string,
  skillType: ExplorationSkillType
): Promise<{ data: any; error: Error | null }> {
  try {
    const { data: skill, error } = await getExplorationSkill(characterId, skillType)
    if (error) throw error
    if (!skill) return { data: null, error: new Error('Skill not found') }

    const xpForCurrentLevel = calculateXPForLevel(skill.level)
    const xpForNextLevel = calculateXPForLevel(skill.level + 1)
    const progressPercent = (skill.experience / xpForCurrentLevel) * 100

    return {
      data: {
        skill_type: skillType,
        level: skill.level,
        experience: skill.experience,
        xp_for_current_level: xpForCurrentLevel,
        xp_for_next_level: xpForNextLevel,
        progress_percent: Math.round(progressPercent),
        total_experience: skill.total_experience,
        bonuses: getSkillBonusesForType(skillType, skill.level)
      },
      error: null
    }
  } catch (err) {
    console.error('Error getting skill progress:', err)
    return { data: null, error: err as Error }
  }
}

/**
 * Get specific bonuses for a skill type
 */
function getSkillBonusesForType(skillType: ExplorationSkillType, level: number): Record<string, any> {
  switch (skillType) {
    case 'cartography':
      return {
        map_reveal: `+${level * 2}%`,
        movement_speed: `+${Math.floor(level / 5)}%`,
        shortcut_chance: `${level}%`,
        description: 'Improves map exploration and navigation'
      }

    case 'survival':
      return {
        hazard_resistance: `+${level * 3}%`,
        resource_bonus: `+${level * 2}%`,
        stamina_efficiency: `+${level}%`,
        description: 'Reduces hazard damage and improves resource gathering'
      }

    case 'archaeology':
      return {
        landmark_discovery: `+${level * 2}%`,
        artifact_chance: `+${level * 5}%`,
        puzzle_hints: `${level * 2}%`,
        description: 'Increases discovery of landmarks and ancient artifacts'
      }

    case 'tracking':
      return {
        creature_detection: `+${level * 3}%`,
        treasure_find: `+${level * 2}%`,
        trail_visibility: `+${level}%`,
        description: 'Improves tracking of creatures and finding hidden treasures'
      }

    default:
      return {}
  }
}

/**
 * Apply skill effects to exploration
 */
export async function applySkillEffects(
  characterId: string,
  baseValues: {
    explorationSpeed?: number
    discoveryChance?: number
    hazardDamage?: number
    resourceYield?: number
    mapRevealRadius?: number
  }
): Promise<{ data: any; error: Error | null }> {
  try {
    const { data: bonuses, error } = await getExplorationSkillBonuses(characterId)
    if (error) throw error
    if (!bonuses) return { data: baseValues, error: null }

    const modifiedValues = { ...baseValues }

    if (baseValues.explorationSpeed !== undefined) {
      modifiedValues.explorationSpeed = baseValues.explorationSpeed * (bonuses.exploration_speed || 1)
    }

    if (baseValues.discoveryChance !== undefined) {
      modifiedValues.discoveryChance = baseValues.discoveryChance * (bonuses.landmark_discovery || 1)
    }

    if (baseValues.hazardDamage !== undefined) {
      modifiedValues.hazardDamage = Math.max(0, baseValues.hazardDamage * (1 - (bonuses.hazard_resistance || 0)))
    }

    if (baseValues.resourceYield !== undefined) {
      modifiedValues.resourceYield = baseValues.resourceYield * (bonuses.resource_bonus || 1)
    }

    if (baseValues.mapRevealRadius !== undefined) {
      modifiedValues.mapRevealRadius = baseValues.mapRevealRadius * (bonuses.map_reveal || 1)
    }

    return { data: modifiedValues, error: null }
  } catch (err) {
    console.error('Error applying skill effects:', err)
    return { data: baseValues, error: err as Error }
  }
}