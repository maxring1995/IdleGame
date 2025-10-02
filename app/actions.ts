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
  redirect('/login')
}

export async function createCharacterAction(userId: string, name: string) {
  const supabase = await createClient()

  try {
    // Create character
    const { data: character, error: characterError } = await supabase
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
