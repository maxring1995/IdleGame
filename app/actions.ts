'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export async function login(formData: FormData) {
  const supabase = await createClient()

  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  const { error } = await supabase.auth.signInWithPassword(data)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/', 'layout')
  redirect('/')
}

export async function signup(formData: FormData) {
  const supabase = await createClient()

  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  const { error } = await supabase.auth.signUp(data)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/', 'layout')
  redirect('/')
}

export async function signOut() {
  const supabase = await createClient()

  const { error } = await supabase.auth.signOut()

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/', 'layout')
  return { success: true }
}

export async function deleteAccount() {
  const supabase = await createClient()

  try {
    // Call the RPC function to delete user (deletes auth.users + profile + cascade)
    const { error: deleteError } = await supabase.rpc('delete_user')

    if (deleteError) {
      console.error('Error deleting account:', deleteError)
      return { success: false, error: deleteError.message }
    }

    // Sign out is automatic since user is deleted, but call it to clean up session
    await supabase.auth.signOut()

    revalidatePath('/', 'layout')
    return { success: true }
  } catch (error) {
    console.error('Delete account error:', error)
    return { success: false, error: 'Failed to delete account' }
  }
}

export async function createCharacterAction(
  userId: string,
  name: string,
  raceId: string,
  gender: 'male' | 'female',
  appearance: Record<string, any>,
  classId: string
) {
  const supabase = await createClient()

  try {
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
      return { error: 'Invalid race or class selection' }
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

    // Create character
    const { data: character, error: characterError } = await supabase
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

    if (characterError) {
      console.error('Character creation error:', characterError)
      return { error: characterError.message }
    }

    // Add starter items
    if (character) {
      const { error: inventoryError } = await supabase.from('inventory').insert([
        {
          character_id: character.id,
          item_id: 'wooden_sword',
          quantity: 1,
          slot: 0,
          equipped: false,
        },
        {
          character_id: character.id,
          item_id: 'leather_armor',
          quantity: 1,
          slot: 1,
          equipped: false,
        },
        {
          character_id: character.id,
          item_id: 'health_potion',
          quantity: 3,
          slot: 2,
          equipped: false,
        },
      ])

      if (inventoryError) {
        console.error('Inventory creation error:', inventoryError)
        // Don't fail if inventory creation fails, character is already created
      }
    }

    // Revalidate and redirect to refresh the page with the new character
    revalidatePath('/', 'layout')
    redirect('/')
  } catch (error: any) {
    console.error('Create character action error:', error)
    return { error: error.message || 'Failed to create character' }
  }
}
