/**
 * Comprehensive Skill & Class System
 * XP calculations, leveling, milestones, and skill management
 */

import { createClient } from '@/utils/supabase/client'
import {
  CharacterSkill,
  SkillDefinition,
  SkillProgress,
  SkillMilestone,
  CharacterSkillWithDefinition,
  ClassDefinition,
  SpecialAbility,
  ActiveClassAbility,
  SkillSpecialization,
  SkillSynergy,
  CharacterSkillSynergyWithDetails
} from './supabase'

// =====================================================
// XP CALCULATION FUNCTIONS (Runescape-inspired)
// =====================================================

/**
 * Calculate total XP required to reach a specific level
 * Uses Runescape's exponential XP formula
 * Level 1 = 0 XP, Level 2 = 83 XP, Level 99 = 13,034,431 XP
 */
export function calculateXPForLevel(targetLevel: number): number {
  if (targetLevel <= 1) return 0

  let totalXP = 0
  for (let lvl = 2; lvl <= targetLevel; lvl++) {
    const levelXP = Math.floor(lvl + 300 * Math.pow(2, lvl / 7.0))
    totalXP += levelXP
  }

  return Math.floor(totalXP / 4)
}

/**
 * Calculate current level from total XP
 */
export function calculateLevelFromXP(currentXP: number): number {
  let level = 1
  while (level < 99 && currentXP >= calculateXPForLevel(level + 1)) {
    level++
  }
  return level
}

/**
 * Calculate XP required for next level
 */
export function calculateXPForNextLevel(currentLevel: number): number {
  if (currentLevel >= 99) return 0
  return calculateXPForLevel(currentLevel + 1)
}

/**
 * Calculate XP range for current level
 */
export function calculateXPRangeForLevel(level: number): { min: number; max: number } {
  return {
    min: calculateXPForLevel(level),
    max: calculateXPForLevel(level + 1)
  }
}

/**
 * Get detailed skill progress information
 */
export function getSkillProgress(skill: CharacterSkill): SkillProgress {
  const currentLevel = skill.level
  const currentXP = skill.experience
  const xpForCurrentLevel = calculateXPForLevel(currentLevel)
  const xpForNextLevel = calculateXPForLevel(currentLevel + 1)
  const xpIntoLevel = currentXP - xpForCurrentLevel
  const xpNeededForLevel = xpForNextLevel - xpForCurrentLevel

  return {
    current_level: currentLevel,
    current_xp: currentXP,
    xp_for_next_level: xpForNextLevel,
    xp_for_current_level: xpForCurrentLevel,
    progress_percent: xpNeededForLevel > 0 ? (xpIntoLevel / xpNeededForLevel) * 100 : 100,
    prestige_level: skill.prestige_level || 0,
    total_xp: skill.total_experience || currentXP
  }
}

/**
 * Generate XP table for all levels (for reference)
 */
export function generateXPTable(): Array<{ level: number; xp: number; xpToNext: number }> {
  const table: Array<{ level: number; xp: number; xpToNext: number }> = []

  for (let level = 1; level <= 99; level++) {
    const xp = calculateXPForLevel(level)
    const nextXP = level < 99 ? calculateXPForLevel(level + 1) : xp
    table.push({
      level,
      xp,
      xpToNext: nextXP - xp
    })
  }

  return table
}

// =====================================================
// SKILL MANAGEMENT FUNCTIONS
// =====================================================

/**
 * Get all skill definitions
 */
export async function getAllSkillDefinitions(): Promise<{ data: SkillDefinition[] | null; error: any }> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('skill_definitions')
      .select('*')
      .order('category, display_name')

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Get skill definitions error:', error)
    return { data: null, error }
  }
}

/**
 * Get all character skills with definitions
 */
export async function getCharacterSkills(
  characterId: string
): Promise<{ data: CharacterSkillWithDefinition[] | null; error: any }> {
  try {
    const supabase = createClient()

    // Fetch character skills
    const { data: skills, error: skillsError } = await supabase
      .from('character_skills')
      .select('*')
      .eq('character_id', characterId)
      .order('level', { ascending: false })

    if (skillsError) throw skillsError

    // Fetch skill definitions
    const { data: definitions, error: defsError } = await supabase
      .from('skill_definitions')
      .select('*')

    if (defsError) throw defsError

    // Join manually
    const definitionsMap = new Map(definitions?.map(d => [d.skill_type, d]) || [])
    const skillsWithDefs = skills?.map(skill => ({
      ...skill,
      definition: definitionsMap.get(skill.skill_type)
    })) || []

    return { data: skillsWithDefs as CharacterSkillWithDefinition[], error: null }
  } catch (error) {
    console.error('Get character skills error:', error)
    return { data: null, error }
  }
}

/**
 * Initialize a skill for a character
 */
export async function initializeSkill(
  characterId: string,
  skillType: string,
  startingLevel: number = 1,
  supabaseClient?: any
): Promise<{ data: CharacterSkill | null; error: any }> {
  try {
    const supabase = supabaseClient || createClient()
    const startingXP = calculateXPForLevel(startingLevel)

    const { data, error } = await supabase
      .from('character_skills')
      .insert({
        character_id: characterId,
        skill_type: skillType,
        level: startingLevel,
        experience: startingXP,
        prestige_level: 0,
        total_experience: startingXP
      })
      .select()
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Initialize skill error:', error)
    return { data: null, error }
  }
}

/**
 * Add experience to a skill and handle level ups
 */
export async function addSkillExperience(
  characterId: string,
  skillType: string,
  xpAmount: number,
  classBonus: number = 1.0, // XP multiplier from class
  supabaseClient?: any
): Promise<{ data: CharacterSkill | null; error: any; leveledUp: boolean; newLevel?: number }> {
  try {
    const supabase = supabaseClient || createClient()

    // Get current skill data
    const { data: skill, error: fetchError } = await supabase
      .from('character_skills')
      .select('*')
      .eq('character_id', characterId)
      .eq('skill_type', skillType)
      .single()

    if (fetchError) {
      // Skill doesn't exist, initialize it
      const { data: newSkill, error: initError } = await initializeSkill(characterId, skillType, 1, supabase)
      if (initError || !newSkill) throw initError
      return addSkillExperience(characterId, skillType, xpAmount, classBonus, supabase)
    }

    // Apply class bonus to XP
    const finalXP = Math.floor(xpAmount * classBonus)

    // Apply prestige efficiency bonus (5% per prestige level)
    const prestigeBonus = 1 + (skill.prestige_level * 0.05)
    const xpWithPrestige = Math.floor(finalXP * prestigeBonus)

    const newExperience = skill.experience + xpWithPrestige
    const newTotalExperience = (skill.total_experience || skill.experience) + xpWithPrestige
    const newLevel = calculateLevelFromXP(newExperience)
    const leveledUp = newLevel > skill.level

    // Check for milestone rewards
    if (leveledUp) {
      await checkAndGrantMilestoneRewards(characterId, skillType, skill.level, newLevel, supabase)
    }

    // Update skill
    const { data, error } = await supabase
      .from('character_skills')
      .update({
        experience: newExperience,
        total_experience: newTotalExperience,
        level: newLevel,
        updated_at: new Date().toISOString()
      })
      .eq('character_id', characterId)
      .eq('skill_type', skillType)
      .select()
      .single()

    if (error) throw error
    return { data, error: null, leveledUp, newLevel: leveledUp ? newLevel : undefined }
  } catch (error) {
    console.error('Add skill experience error:', error)
    return { data: null, error, leveledUp: false }
  }
}

/**
 * Check for and grant milestone rewards
 */
async function checkAndGrantMilestoneRewards(
  characterId: string,
  skillType: string,
  oldLevel: number,
  newLevel: number,
  supabaseClient: any
): Promise<void> {
  const supabase = supabaseClient
  const milestones = [10, 25, 50, 75, 99]

  for (const milestone of milestones) {
    if (oldLevel < milestone && newLevel >= milestone) {
      // Get milestone reward
      const { data: milestoneData } = await supabase
        .from('skill_milestones')
        .select('*')
        .eq('skill_type', skillType)
        .eq('milestone_level', milestone)
        .single()

      if (milestoneData) {
        await grantMilestoneReward(characterId, milestoneData, supabase)
      }
    }
  }
}

/**
 * Grant a milestone reward to a character
 */
async function grantMilestoneReward(characterId: string, milestone: SkillMilestone, supabaseClient: any): Promise<void> {
  const supabase = supabaseClient

  switch (milestone.reward_type) {
    case 'gold':
      const goldAmount = milestone.reward_data.amount || 0
      const { data: char } = await supabase
        .from('characters')
        .select('gold')
        .eq('id', characterId)
        .single()

      await supabase
        .from('characters')
        .update({ gold: (char?.gold || 0) + goldAmount })
        .eq('id', characterId)
      break

    case 'mastery_point':
      const points = milestone.reward_data.points || 1
      const { data: charData } = await supabase
        .from('characters')
        .select('mastery_points')
        .eq('id', characterId)
        .single()

      await supabase
        .from('characters')
        .update({ mastery_points: (charData?.mastery_points || 0) + points })
        .eq('id', characterId)
      break

    case 'stat_boost':
      // Apply stat boosts from reward_data
      const { data: charStats } = await supabase
        .from('characters')
        .select('attack, defense, max_health, max_mana')
        .eq('id', characterId)
        .single()

      const statUpdates: any = {}
      for (const [stat, value] of Object.entries(milestone.reward_data)) {
        if (['attack', 'defense', 'max_health', 'max_mana'].includes(stat) && charStats) {
          statUpdates[stat] = (charStats[stat as keyof typeof charStats] || 0) + (value as number)
        }
      }
      if (Object.keys(statUpdates).length > 0) {
        await supabase
          .from('characters')
          .update(statUpdates)
          .eq('id', characterId)
      }
      break

    case 'item':
      // Grant item (would need to integrate with inventory system)
      // Implementation depends on inventory.ts functions
      break
  }
}

// =====================================================
// CLASS SYSTEM FUNCTIONS
// =====================================================

/**
 * Get all class definitions
 */
export async function getAllClassDefinitions(): Promise<{ data: ClassDefinition[] | null; error: any }> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('class_definitions')
      .select('*')
      .order('display_name')

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Get class definitions error:', error)
    return { data: null, error }
  }
}

/**
 * Get class definition by ID
 */
export async function getClassDefinition(classId: string): Promise<{ data: ClassDefinition | null; error: any }> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('class_definitions')
      .select('*')
      .eq('class_id', classId)
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Get class definition error:', error)
    return { data: null, error }
  }
}

/**
 * Calculate effective XP multiplier for a skill based on class
 */
export function getClassSkillBonus(classDefinition: ClassDefinition | null, skillType: string): number {
  if (!classDefinition || !classDefinition.skill_bonuses) return 1.0
  return classDefinition.skill_bonuses[skillType] || 1.0
}

/**
 * Apply class starting bonuses to character skills
 */
export async function applyClassStartingBonuses(
  characterId: string,
  classDefinition: ClassDefinition
): Promise<{ success: boolean; error: any }> {
  try {
    const supabase = createClient()

    // Initialize skills with starting levels from primary_stats
    if (classDefinition.primary_stats) {
      for (const [skillType, startLevel] of Object.entries(classDefinition.primary_stats)) {
        await initializeSkill(characterId, skillType, startLevel)
      }
    }

    return { success: true, error: null }
  } catch (error) {
    console.error('Apply class starting bonuses error:', error)
    return { success: false, error }
  }
}

// =====================================================
// PRESTIGE SYSTEM FUNCTIONS
// =====================================================

/**
 * Prestige a skill (reset to level 1, gain permanent bonus)
 */
export async function prestigeSkill(
  characterId: string,
  skillType: string
): Promise<{ data: CharacterSkill | null; error: any }> {
  try {
    const supabase = createClient()

    // Get current skill
    const { data: skill, error: fetchError } = await supabase
      .from('character_skills')
      .select('*')
      .eq('character_id', characterId)
      .eq('skill_type', skillType)
      .single()

    if (fetchError) throw fetchError

    // Must be level 99 to prestige
    if (skill.level < 99) {
      throw new Error('Must be level 99 to prestige')
    }

    // Reset to level 1, increment prestige
    const { data, error } = await supabase
      .from('character_skills')
      .update({
        level: 1,
        experience: 0,
        prestige_level: skill.prestige_level + 1,
        // total_experience stays the same - tracks all-time XP
        updated_at: new Date().toISOString()
      })
      .eq('character_id', characterId)
      .eq('skill_type', skillType)
      .select()
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Prestige skill error:', error)
    return { data: null, error }
  }
}

/**
 * Calculate prestige efficiency bonus
 */
export function calculatePrestigeBonus(prestigeLevel: number): number {
  return 1 + (prestigeLevel * 0.05) // 5% per prestige level
}

// =====================================================
// SPECIALIZATION SYSTEM FUNCTIONS
// =====================================================

/**
 * Get available specializations for a skill
 */
export async function getSkillSpecializations(
  skillType: string
): Promise<{ data: SkillSpecialization[] | null; error: any }> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('skill_specializations')
      .select('*')
      .eq('skill_type', skillType)

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Get skill specializations error:', error)
    return { data: null, error }
  }
}

/**
 * Choose a specialization for a skill (must be level 50+)
 */
export async function chooseSpecialization(
  characterId: string,
  skillType: string,
  specializationId: string
): Promise<{ data: CharacterSkill | null; error: any }> {
  try {
    const supabase = createClient()

    // Verify skill level >= 50
    const { data: skill, error: fetchError } = await supabase
      .from('character_skills')
      .select('*')
      .eq('character_id', characterId)
      .eq('skill_type', skillType)
      .single()

    if (fetchError) throw fetchError

    if (skill.level < 50) {
      throw new Error('Must be level 50 to choose a specialization')
    }

    if (skill.specialization_id) {
      throw new Error('Specialization already chosen for this skill')
    }

    // Set specialization
    const { data, error } = await supabase
      .from('character_skills')
      .update({
        specialization_id: specializationId,
        updated_at: new Date().toISOString()
      })
      .eq('character_id', characterId)
      .eq('skill_type', skillType)
      .select()
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Choose specialization error:', error)
    return { data: null, error }
  }
}

// =====================================================
// SYNERGY SYSTEM FUNCTIONS
// =====================================================

/**
 * Get all unlocked synergies for a character
 */
export async function getCharacterSynergies(
  characterId: string
): Promise<{ data: CharacterSkillSynergyWithDetails[] | null; error: any }> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('character_skill_synergies')
      .select(`
        *,
        synergy:skill_synergies(*)
      `)
      .eq('character_id', characterId)

    if (error) throw error
    return { data: data as CharacterSkillSynergyWithDetails[], error: null }
  } catch (error) {
    console.error('Get character synergies error:', error)
    return { data: null, error }
  }
}

/**
 * Get all available synergies
 */
export async function getAllSynergies(): Promise<{ data: SkillSynergy[] | null; error: any }> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('skill_synergies')
      .select('*')

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Get all synergies error:', error)
    return { data: null, error }
  }
}

/**
 * Check if character meets synergy requirements
 */
export async function checkSynergyRequirements(
  characterId: string,
  synergy: SkillSynergy
): Promise<boolean> {
  const supabase = createClient()

  for (const [skillType, requiredLevel] of Object.entries(synergy.required_skills)) {
    const { data: skill } = await supabase
      .from('character_skills')
      .select('level')
      .eq('character_id', characterId)
      .eq('skill_type', skillType)
      .single()

    if (!skill || skill.level < (requiredLevel as number)) {
      return false
    }
  }

  return true
}

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

/**
 * Get total skill levels for a character
 */
export async function getTotalSkillLevel(characterId: string): Promise<number> {
  const supabase = createClient()
  const { data } = await supabase
    .from('character_skills')
    .select('level')
    .eq('character_id', characterId)

  return data?.reduce((sum, skill) => sum + skill.level, 0) || 0
}

/**
 * Get skill by category
 */
export async function getSkillsByCategory(
  characterId: string,
  category: 'combat' | 'gathering' | 'artisan' | 'support'
): Promise<{ data: CharacterSkillWithDefinition[] | null; error: any }> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('character_skills')
      .select(`
        *,
        definition:skill_definitions!inner(*)
      `)
      .eq('character_id', characterId)
      .eq('skill_definitions.category', category)

    if (error) throw error
    return { data: data as CharacterSkillWithDefinition[], error: null }
  } catch (error) {
    console.error('Get skills by category error:', error)
    return { data: null, error }
  }
}
