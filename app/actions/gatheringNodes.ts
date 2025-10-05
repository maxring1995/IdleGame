'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import {
  getActiveNodesInZone,
  getNodeWithMaterial,
  harvestNode as harvestNodeLib,
  spawnNodesInZone
} from '@/lib/gatheringNodes'

/**
 * Get all active gathering nodes in a specific world zone
 */
export async function getNodesInZone(worldZone: string) {
  try {
    const supabase = await createClient()
    const { data, error } = await getActiveNodesInZone(worldZone, supabase)

    if (error) {
      return { success: false, error: error.message, nodes: null }
    }

    return { success: true, nodes: data, error: null }
  } catch (err: any) {
    console.error('Error in getNodesInZone action:', err)
    return { success: false, error: err.message, nodes: null }
  }
}

/**
 * Get detailed information about a specific node including material data
 */
export async function getNodeDetails(nodeId: string) {
  try {
    const supabase = await createClient()
    const { data, error } = await getNodeWithMaterial(nodeId, supabase)

    if (error) {
      return { success: false, error: error.message, node: null }
    }

    return { success: true, node: data, error: null }
  } catch (err: any) {
    console.error('Error in getNodeDetails action:', err)
    return { success: false, error: err.message, node: null }
  }
}

/**
 * Harvest materials from a gathering node
 */
export async function harvestNodeAction(characterId: string, nodeId: string) {
  try {
    const supabase = await createClient()
    const { data, error } = await harvestNodeLib(characterId, nodeId, supabase)

    if (error) {
      return {
        success: false,
        error: error.message,
        result: null
      }
    }

    // Revalidate paths to update UI
    revalidatePath('/game')
    revalidatePath('/adventure')

    return {
      success: true,
      result: data,
      error: null
    }
  } catch (err: any) {
    console.error('Error in harvestNodeAction:', err)
    return {
      success: false,
      error: err.message,
      result: null
    }
  }
}

/**
 * Admin action: Spawn new gathering nodes in a zone
 * This should be restricted to admin users in production
 */
export async function spawnNodesAction(
  worldZone: string,
  materialId: string,
  count: number = 5
) {
  try {
    const supabase = await createClient()

    // TODO: Add admin check here
    // const { data: { user } } = await supabase.auth.getUser()
    // if (!isAdmin(user)) throw new Error('Unauthorized')

    const { data, error } = await spawnNodesInZone(worldZone, materialId, count)

    if (error) {
      return { success: false, error: error.message, nodes: null }
    }

    revalidatePath('/game')
    revalidatePath('/adventure')

    return { success: true, nodes: data, error: null }
  } catch (err: any) {
    console.error('Error in spawnNodesAction:', err)
    return { success: false, error: err.message, nodes: null }
  }
}

/**
 * Get character's gathering statistics
 */
export async function getGatheringStats(characterId: string) {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('gathering_statistics')
      .select('*')
      .eq('character_id', characterId)
      .maybeSingle()

    if (error) {
      return { success: false, error: error.message, stats: null }
    }

    // Initialize stats if they don't exist
    if (!data) {
      const { data: newStats, error: insertError } = await supabase
        .from('gathering_statistics')
        .insert({ character_id: characterId })
        .select()
        .single()

      if (insertError) {
        return { success: false, error: insertError.message, stats: null }
      }

      return { success: true, stats: newStats, error: null }
    }

    return { success: true, stats: data, error: null }
  } catch (err: any) {
    console.error('Error in getGatheringStats action:', err)
    return { success: false, error: err.message, stats: null }
  }
}

/**
 * Get active gathering encounter for character (if any)
 */
export async function getActiveEncounter(characterId: string) {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('gathering_encounters')
      .select('*')
      .eq('character_id', characterId)
      .eq('resolved', false)
      .order('triggered_at', { ascending: false })
      .maybeSingle()

    if (error) {
      return { success: false, error: error.message, encounter: null }
    }

    return { success: true, encounter: data, error: null }
  } catch (err: any) {
    console.error('Error in getActiveEncounter action:', err)
    return { success: false, error: err.message, encounter: null }
  }
}

/**
 * Resolve a gathering encounter
 */
export async function resolveEncounter(
  encounterId: string,
  action: 'claim' | 'flee' | 'fight'
) {
  try {
    const supabase = await createClient()

    // Get encounter details
    const { data: encounter, error: fetchError } = await supabase
      .from('gathering_encounters')
      .select('*')
      .eq('id', encounterId)
      .single()

    if (fetchError || !encounter) {
      return { success: false, error: 'Encounter not found', rewards: null }
    }

    let rewards: any = {}

    // Handle different encounter types
    if (encounter.encounter_type === 'treasure' && action === 'claim') {
      const gold = encounter.encounter_data.gold || 0

      // Award gold to character
      const { data: character } = await supabase
        .from('characters')
        .select('gold')
        .eq('id', encounter.character_id)
        .single()

      if (character) {
        await supabase
          .from('characters')
          .update({ gold: character.gold + gold })
          .eq('id', encounter.character_id)

        rewards = { gold }
      }
    }

    // Mark encounter as resolved
    const { error: updateError } = await supabase
      .from('gathering_encounters')
      .update({
        resolved: true,
        resolved_at: new Date().toISOString(),
        resolution_action: action,
        rewards_granted: rewards
      })
      .eq('id', encounterId)

    if (updateError) {
      return { success: false, error: updateError.message, rewards: null }
    }

    // Update statistics
    await supabase
      .from('gathering_statistics')
      .update({
        total_encounters: supabase.raw('total_encounters + 1') as any,
        ...(encounter.encounter_type === 'treasure' && { total_treasures_found: supabase.raw('total_treasures_found + 1') as any }),
        ...(encounter.encounter_type === 'monster' && action === 'fight' && { total_monsters_fought: supabase.raw('total_monsters_fought + 1') as any }),
        ...(encounter.encounter_type === 'wanderer' && { total_wanderers_met: supabase.raw('total_wanderers_met + 1') as any })
      })
      .eq('character_id', encounter.character_id)

    revalidatePath('/game')

    return { success: true, rewards, error: null }
  } catch (err: any) {
    console.error('Error in resolveEncounter action:', err)
    return { success: false, error: err.message, rewards: null }
  }
}
