/**
 * Gathering Specializations System
 *
 * Manages specialization selection, bonuses, and application
 * for the deep gathering system.
 */

import { createClient } from '@/utils/supabase/client'
import type { GatheringSpecialization } from './supabase'

/**
 * Get all available specializations for a skill
 */
export async function getSpecializationsForSkill(skillType: string): Promise<{
  data: GatheringSpecialization[] | null
  error: Error | null
}> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('gathering_specializations')
    .select('*')
    .eq('skill_type', skillType)
    .order('name')

  if (error) {
    console.error('[specializations] Error fetching specializations:', error)
    return { data: null, error }
  }

  return { data, error: null }
}

/**
 * Get a character's current specialization for a skill
 */
export async function getCharacterSpecialization(characterId: string, skillType: string): Promise<{
  data: { specialization: GatheringSpecialization | null, unlockedAt: Date | null } | null
  error: Error | null
}> {
  const supabase = createClient()

  // Get the character's skill data
  const { data: skillData, error: skillError } = await supabase
    .from('character_skills')
    .select('specialization_id, specialization_unlocked_at')
    .eq('character_id', characterId)
    .eq('skill_type', skillType)
    .single()

  if (skillError) {
    // No skill record exists yet
    if (skillError.code === 'PGRST116') {
      return { data: { specialization: null, unlockedAt: null }, error: null }
    }
    return { data: null, error: skillError }
  }

  // No specialization selected yet
  if (!skillData.specialization_id) {
    return { data: { specialization: null, unlockedAt: null }, error: null }
  }

  // Get the specialization details
  const { data: spec, error: specError } = await supabase
    .from('gathering_specializations')
    .select('*')
    .eq('id', skillData.specialization_id)
    .single()

  if (specError) {
    return { data: null, error: specError }
  }

  return {
    data: {
      specialization: spec,
      unlockedAt: skillData.specialization_unlocked_at ? new Date(skillData.specialization_unlocked_at) : null
    },
    error: null
  }
}

/**
 * Check if a character can select a specialization
 */
export async function canSelectSpecialization(characterId: string, skillType: string): Promise<{
  data: { canSelect: boolean, currentLevel: number, hasSpecialization: boolean } | null
  error: Error | null
}> {
  const supabase = createClient()

  // Get the character's skill data
  const { data: skillData, error } = await supabase
    .from('character_skills')
    .select('level, specialization_id')
    .eq('character_id', characterId)
    .eq('skill_type', skillType)
    .single()

  if (error) {
    // No skill record exists yet (level 1)
    if (error.code === 'PGRST116') {
      return { data: { canSelect: false, currentLevel: 1, hasSpecialization: false }, error: null }
    }
    return { data: null, error }
  }

  const canSelect = skillData.level >= 50 && !skillData.specialization_id
  const hasSpecialization = !!skillData.specialization_id

  return {
    data: { canSelect, currentLevel: skillData.level, hasSpecialization },
    error: null
  }
}

/**
 * Select a specialization for a character
 */
export async function selectSpecialization(characterId: string, skillType: string, specializationId: string): Promise<{
  data: boolean | null
  error: Error | null
}> {
  const supabase = createClient()

  // Verify the specialization exists and matches the skill type
  const { data: spec, error: specError } = await supabase
    .from('gathering_specializations')
    .select('*')
    .eq('id', specializationId)
    .eq('skill_type', skillType)
    .single()

  if (specError || !spec) {
    return { data: null, error: specError || new Error('Invalid specialization') }
  }

  // Check if character can select (level 50+, no existing specialization)
  const { data: canSelectData, error: checkError } = await canSelectSpecialization(characterId, skillType)

  if (checkError || !canSelectData) {
    return { data: null, error: checkError || new Error('Failed to check specialization eligibility') }
  }

  if (!canSelectData.canSelect) {
    if (canSelectData.hasSpecialization) {
      return { data: null, error: new Error('Character already has a specialization for this skill') }
    }
    return { data: null, error: new Error(`Character must be level 50+ (current: ${canSelectData.currentLevel})`) }
  }

  // Update the character's skill with the specialization
  const { error: updateError } = await supabase
    .from('character_skills')
    .update({
      specialization_id: specializationId,
      specialization_unlocked_at: new Date().toISOString()
    })
    .eq('character_id', characterId)
    .eq('skill_type', skillType)

  if (updateError) {
    console.error('[specializations] Error selecting specialization:', updateError)
    return { data: null, error: updateError }
  }

  console.log(`[specializations] Character ${characterId} selected ${spec.name} for ${skillType}`)
  return { data: true, error: null }
}

/**
 * Check all skills for specialization eligibility
 * Returns skills that are level 50+ without a specialization
 */
export async function checkSpecializationEligibility(characterId: string): Promise<{
  data: Array<{ skillType: string, level: number }> | null
  error: Error | null
}> {
  const supabase = createClient()

  const { data: skills, error } = await supabase
    .from('character_skills')
    .select('skill_type, level, specialization_id')
    .eq('character_id', characterId)
    .gte('level', 50)
    .is('specialization_id', null)

  if (error) {
    console.error('[specializations] Error checking eligibility:', error)
    return { data: null, error }
  }

  const eligible = skills?.map(s => ({
    skillType: s.skill_type,
    level: s.level
  })) || []

  return { data: eligible, error: null }
}

/**
 * Apply specialization bonuses to gathering calculations
 * This is used by the harvest logic to modify yields, speeds, etc.
 */
export function applySpecializationBonuses(
  baseValues: {
    yield: number
    gatherTime: number
    successChance: number
  },
  specialization: GatheringSpecialization | null
): {
  yield: number
  gatherTime: number
  successChance: number
  bonusEffects: string[]
} {
  if (!specialization) {
    return { ...baseValues, bonusEffects: [] }
  }

  const bonuses = specialization.bonuses as any
  const bonusEffects: string[] = []
  let modifiedYield = baseValues.yield
  let modifiedTime = baseValues.gatherTime
  let modifiedSuccess = baseValues.successChance

  // Apply yield multiplier
  if (bonuses.yield_multiplier) {
    modifiedYield *= bonuses.yield_multiplier
    bonusEffects.push(`+${Math.round((bonuses.yield_multiplier - 1) * 100)}% yield`)
  }

  // Apply speed bonuses
  if (bonuses.elemental_speed) {
    modifiedTime /= bonuses.elemental_speed
    bonusEffects.push(`${Math.round((bonuses.elemental_speed - 1) * 100)}% faster`)
  }

  // Apply failure immunity
  if (bonuses.failure_immunity) {
    modifiedSuccess = 1.0 // 100% success rate
    bonusEffects.push('Never fail')
  }

  // Apply double drop chance (calculated separately in harvest logic)
  if (bonuses.double_drop_chance) {
    bonusEffects.push(`${Math.round(bonuses.double_drop_chance * 100)}% double drops`)
  }

  // Special multipliers (gems, runes, etc.) are handled in harvest logic
  if (bonuses.gem_find_multiplier) {
    bonusEffects.push(`${bonuses.gem_find_multiplier}x gem finds`)
  }

  if (bonuses.rune_yield_multiplier) {
    bonusEffects.push(`${bonuses.rune_yield_multiplier}x rune yield`)
  }

  return {
    yield: Math.floor(modifiedYield),
    gatherTime: Math.round(modifiedTime),
    successChance: Math.min(1, modifiedSuccess),
    bonusEffects
  }
}

/**
 * Check if a specialization provides a specific bonus type
 */
export function hasSpecializationBonus(specialization: GatheringSpecialization | null, bonusType: string): boolean {
  if (!specialization) return false

  const bonuses = specialization.bonuses as any
  return !!bonuses[bonusType]
}

/**
 * Get the value of a specific bonus from a specialization
 */
export function getSpecializationBonusValue(specialization: GatheringSpecialization | null, bonusType: string): any {
  if (!specialization) return null

  const bonuses = specialization.bonuses as any
  return bonuses[bonusType] || null
}