/**
 * Initialize Starter Gathering Tools
 *
 * Equips new characters with Bronze-tier tools for all gathering skills
 */

import { createClient } from '@/utils/supabase/client'

/**
 * Initialize a new character with starter Bronze tools
 */
export async function initializeStarterTools(characterId: string): Promise<{
  data: boolean | null
  error: Error | null
}> {
  const supabase = createClient()

  // Create character_equipped_tools row with all Bronze tools
  const { error } = await supabase
    .from('character_equipped_tools')
    .insert({
      character_id: characterId,
      axe_id: 'bronze_axe',
      pickaxe_id: 'bronze_pickaxe',
      fishing_rod_id: 'basic_fishing_rod',
      hunting_knife_id: 'stone_knife',
      herbalism_sickle_id: 'rusty_sickle',
      divination_staff_id: 'apprentice_staff',
      axe_durability: 100,
      pickaxe_durability: 100,
      fishing_rod_durability: 100,
      hunting_knife_durability: 100,
      herbalism_sickle_durability: 100,
      divination_staff_durability: 100
    })

  if (error) {
    console.error('[initializeStarterTools] Error:', error)
    return { data: null, error }
  }

  return { data: true, error: null }
}
