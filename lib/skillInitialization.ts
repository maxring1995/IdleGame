/**
 * Skill Initialization Utilities
 * Initialize all 20 skills for characters
 */

import { createClient } from '@/utils/supabase/client'
import { initializeSkill } from './skills'

/**
 * All 20 skills in the game
 */
export const ALL_SKILLS = [
  // Combat (6)
  'attack',
  'strength',
  'defense',
  'magic',
  'ranged',
  'constitution',

  // Gathering (5)
  'mining',
  'woodcutting',
  'fishing',
  'farming',
  'hunting',

  // Artisan (6)
  'smithing',
  'crafting',
  'fletching',
  'alchemy',
  'cooking',
  'runecrafting',

  // Support (3)
  'agility',
  'thieving',
  'slayer'
]

/**
 * Initialize all 20 skills for a character
 */
export async function initializeAllSkills(characterId: string): Promise<{ success: boolean; error?: any }> {
  try {
    const supabase = createClient()

    // Get existing skills
    const { data: existingSkills } = await supabase
      .from('character_skills')
      .select('skill_type')
      .eq('character_id', characterId)

    const existingSkillTypes = new Set(existingSkills?.map(s => s.skill_type) || [])

    // Initialize missing skills
    for (const skillType of ALL_SKILLS) {
      if (!existingSkillTypes.has(skillType)) {
        await initializeSkill(characterId, skillType, 1)
      }
    }

    return { success: true }
  } catch (error) {
    console.error('Initialize all skills error:', error)
    return { success: false, error }
  }
}

/**
 * Initialize skills for a new character with class bonuses
 */
export async function initializeSkillsWithClass(
  characterId: string,
  classId?: string
): Promise<{ success: boolean; error?: any }> {
  try {
    const supabase = createClient()

    // Get class definition if provided
    let classBonuses: Record<string, number> = {}
    if (classId) {
      const { data: classData } = await supabase
        .from('class_definitions')
        .select('primary_stats')
        .eq('class_id', classId)
        .single()

      if (classData?.primary_stats) {
        classBonuses = classData.primary_stats as Record<string, number>
      }
    }

    // Initialize all skills with class bonuses
    for (const skillType of ALL_SKILLS) {
      const startingLevel = classBonuses[skillType] || 1
      await initializeSkill(characterId, skillType, startingLevel)
    }

    return { success: true }
  } catch (error) {
    console.error('Initialize skills with class error:', error)
    return { success: false, error }
  }
}
