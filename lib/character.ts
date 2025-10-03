import { createClient } from '@/utils/supabase/client'
import { Character } from './supabase'

/**
 * Create a new character for a user
 */
export async function createCharacter(userId: string, name: string): Promise<{ data: Character | null; error: any }> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('characters')
      .insert({
        user_id: userId,
        name,
        level: 1,
        experience: 0,
        health: 100,
        max_health: 100,
        mana: 50,
        max_mana: 50,
        attack: 10,
        defense: 5,
        gold: 100,
        gems: 0,
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

      // Initialize crafting skills
      await supabase.from('character_skills').insert([
        {
          character_id: data.id,
          skill_type: 'crafting',
          level: 1,
          experience: 0,
        },
        {
          character_id: data.id,
          skill_type: 'alchemy',
          level: 1,
          experience: 0,
        },
      ])
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
    const experienceForNextLevel = character.level * 100
    let newLevel = character.level
    let leveledUp = false

    // Check if leveled up
    if (newExperience >= experienceForNextLevel) {
      newLevel = character.level + 1
      leveledUp = true

      // Increase stats on level up
      const statIncrease = {
        max_health: character.max_health + 20,
        max_mana: character.max_mana + 10,
        attack: character.attack + 2,
        defense: character.defense + 1,
      }

      const { data, error } = await supabase
        .from('characters')
        .update({
          experience: newExperience,
          level: newLevel,
          health: statIncrease.max_health, // Restore health on level up
          mana: statIncrease.max_mana, // Restore mana on level up
          ...statIncrease,
          last_active: new Date().toISOString(),
        })
        .eq('id', characterId)
        .select()
        .single()

      if (error) throw error
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

    const { data, error } = await supabase
      .from('characters')
      .update({
        gold: (character?.gold || 0) + amount,
        last_active: new Date().toISOString(),
      })
      .eq('id', characterId)
      .select()
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Add gold error:', error)
    return { data: null, error }
  }
}
