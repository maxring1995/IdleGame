import { createClient } from '@/utils/supabase/client'
import { Character } from './supabase'
import { trackQuestProgress } from './quests'
import { initializeAllSkills } from './skillInitialization'
import { initializeStarterTools } from './initializeCharacterTools'
import { initializeExplorationSkills } from './explorationSkills'

/**
 * Create a new character for a user
 */
export async function createCharacter(
  userId: string,
  name: string,
  raceId: string,
  gender: 'male' | 'female',
  appearance: Record<string, any>,
  classId: string
): Promise<{ data: Character | null; error: any }> {
  try {
    const supabase = createClient()

    // Get race and class data to calculate starting stats
    const { data: race } = await supabase
      .from('races')
      .select('*')
      .eq('id', raceId)
      .single()

    const { data: classData } = await supabase
      .from('classes')
      .select('*')
      .eq('id', classId)
      .single()

    if (!race || !classData) {
      throw new Error('Invalid race or class selection')
    }

    // Calculate starting stats with bonuses
    let health = 100 + race.health_bonus
    let mana = 50 + race.mana_bonus
    let attack = 10 + race.attack_bonus
    let defense = 5 + race.defense_bonus

    health = Math.floor(health * classData.health_modifier)
    mana = Math.floor(mana * classData.mana_modifier)
    attack = Math.floor(attack * classData.attack_modifier)
    defense = Math.floor(defense * classData.defense_modifier)

    const { data, error } = await supabase
      .from('characters')
      .insert({
        user_id: userId,
        name,
        race_id: raceId,
        gender,
        appearance,
        class_id: classId,
        level: 1,
        experience: 0,
        health,
        max_health: health,
        mana,
        max_mana: mana,
        attack,
        defense,
        gold: 100,
        gems: 0,
        talent_points: 0,
        total_talent_points: 0,
      })
      .select()
      .single()

    if (error) throw error

    // Give starter items
    if (data) {
      await supabase.from('inventory').insert([
        {
          character_id: data.id,
          item_id: 'wooden_sword',
          quantity: 1,
          slot: 0,
          equipped: false,
        },
        {
          character_id: data.id,
          item_id: 'leather_armor',
          quantity: 1,
          slot: 1,
          equipped: false,
        },
        {
          character_id: data.id,
          item_id: 'health_potion',
          quantity: 3,
          slot: 2,
          equipped: false,
        },
      ])

      // Initialize all 20 skills
      await initializeAllSkills(data.id)

      // Initialize exploration skills (cartography, survival, archaeology, tracking)
      await initializeExplorationSkills(data.id)

      // Initialize starter gathering tools
      await initializeStarterTools(data.id)
    }

    return { data, error: null }
  } catch (error) {
    console.error('Create character error:', error)
    return { data: null, error }
  }
}

/**
 * Get character for current user
 */
export async function getCharacter(userId: string): Promise<{ data: Character | null; error: any }> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('characters')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
      throw error
    }

    return { data, error: null }
  } catch (error) {
    console.error('Get character error:', error)
    return { data: null, error }
  }
}

/**
 * Update character stats
 */
export async function updateCharacter(
  characterId: string,
  updates: Partial<Character>
): Promise<{ data: Character | null; error: any }> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('characters')
      .update({
        ...updates,
        last_active: new Date().toISOString(),
      })
      .eq('id', characterId)
      .select()
      .single()

    if (error) throw error

    return { data, error: null }
  } catch (error) {
    console.error('Update character error:', error)
    return { data: null, error }
  }
}

/**
 * Calculate total XP required to reach a specific level (exponential formula)
 * Formula: level^2.5 * 100
 */
function calculateXPForLevel(level: number): number {
  if (level <= 1) return 0
  return Math.floor(Math.pow(level, 2.5) * 100)
}

/**
 * Calculate what level a character should be based on their total XP
 */
function calculateLevelFromXP(totalXP: number): number {
  let level = 1
  while (calculateXPForLevel(level + 1) <= totalXP) {
    level++
  }
  return level
}

/**
 * Add experience and handle level ups
 */
export async function addExperience(
  characterId: string,
  amount: number
): Promise<{ data: Character | null; error: any; leveledUp: boolean }> {
  try {
    const supabase = createClient()
    // Get current character
    const { data: character, error: fetchError } = await supabase
      .from('characters')
      .select('*')
      .eq('id', characterId)
      .single()

    if (fetchError) throw fetchError

    const newExperience = character.experience + amount
    const newLevel = calculateLevelFromXP(newExperience)
    const leveledUp = newLevel > character.level

    // Check if leveled up
    if (leveledUp) {
      // Calculate stat increases based on levels gained
      const levelsGained = newLevel - character.level

      // Exponential stat scaling: base * level^1.3
      const newMaxHealth = Math.floor(100 * Math.pow(newLevel, 1.3))
      const newMaxMana = Math.floor(50 * Math.pow(newLevel, 1.3))
      const newAttack = Math.floor(10 * Math.pow(newLevel, 1.3))
      const newDefense = Math.floor(5 * Math.pow(newLevel, 1.3))

      const { data, error } = await supabase
        .from('characters')
        .update({
          experience: newExperience,
          level: newLevel,
          health: newMaxHealth, // Restore health on level up
          mana: newMaxMana, // Restore mana on level up
          max_health: newMaxHealth,
          max_mana: newMaxMana,
          attack: newAttack,
          defense: newDefense,
          last_active: new Date().toISOString(),
        })
        .eq('id', characterId)
        .select()
        .single()

      if (error) throw error

      // Track quest progress for level quests
      await trackQuestProgress(characterId, 'level', {
        amount: newLevel
      })

      return { data, error: null, leveledUp }
    } else {
      const { data, error } = await supabase
        .from('characters')
        .update({
          experience: newExperience,
          last_active: new Date().toISOString(),
        })
        .eq('id', characterId)
        .select()
        .single()

      if (error) throw error
      return { data, error: null, leveledUp }
    }
  } catch (error) {
    console.error('Add experience error:', error)
    return { data: null, error, leveledUp: false }
  }
}

/**
 * Add gold to character
 */
export async function addGold(characterId: string, amount: number) {
  try {
    const supabase = createClient()
    const { data: character } = await supabase
      .from('characters')
      .select('gold')
      .eq('id', characterId)
      .single()

    const newGold = (character?.gold || 0) + amount

    const { data, error } = await supabase
      .from('characters')
      .update({
        gold: newGold,
        last_active: new Date().toISOString(),
      })
      .eq('id', characterId)
      .select()
      .single()

    if (error) throw error

    // Track quest progress for gold quests
    await trackQuestProgress(characterId, 'gold', {
      amount: newGold
    })

    return { data, error: null }
  } catch (error) {
    console.error('Add gold error:', error)
    return { data: null, error }
  }
}

/**
 * Delete a character (keeps account intact)
 */
export async function deleteCharacter(characterId: string): Promise<{ success: boolean; error: any }> {
  try {
    const supabase = createClient()

    // Delete character (cascade will handle related records)
    const { error } = await supabase
      .from('characters')
      .delete()
      .eq('id', characterId)

    if (error) throw error

    return { success: true, error: null }
  } catch (error) {
    console.error('Delete character error:', error)
    return { success: false, error }
  }
}

/**
 * Update character health
 */
export async function updateCharacterHealth(
  characterId: string,
  amount: number
): Promise<{ data: Character | null; error: Error | null }> {
  const supabase = createClient()

  try {
    // Get current health and max health
    const { data: character, error: fetchError } = await supabase
      .from('characters')
      .select('health, max_health')
      .eq('id', characterId)
      .single()

    if (fetchError) throw fetchError
    if (!character) throw new Error('Character not found')

    // Calculate new health (clamp between 0 and max_health)
    const newHealth = Math.max(0, Math.min(character.max_health, character.health + amount))

    const { data, error } = await supabase
      .from('characters')
      .update({
        health: newHealth,
        last_active: new Date().toISOString()
      })
      .eq('id', characterId)
      .select()
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (err) {
    console.error('Error updating health:', err)
    return { data: null, error: err as Error }
  }
}
