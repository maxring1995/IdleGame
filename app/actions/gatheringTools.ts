'use server'

/**
 * Server Actions for Gathering Tools
 *
 * Tool equipment, repair, and management actions
 */

import { revalidatePath } from 'next/cache'
import {
  getAllGatheringTools,
  equipTool as equipToolLib,
  unequipTool as unequipToolLib,
  repairTool as repairToolLib,
  getRepairCost,
  type ToolSlot
} from '@/lib/gatheringTools'

/**
 * Get all available gathering tools
 */
export async function getAllTools() {
  const { data, error } = await getAllGatheringTools()

  return {
    success: !error,
    tools: data,
    error: error?.message
  }
}

/**
 * Get character's equipped tools with durability
 */
export async function getCharacterEquippedTools(characterId: string) {
  // Import server client for proper auth context
  const { createClient } = await import('@/utils/supabase/server')
  const supabase = await createClient()

  // Get equipped tools for the character
  const { data: equipped, error: equippedError } = await supabase
    .from('character_equipped_tools')
    .select('*')
    .eq('character_id', characterId)
    .single()

  // If there's an error other than "no rows found", return error
  if (equippedError && equippedError.code !== 'PGRST116') {
    console.error('[gatheringTools] Error fetching equipped tools:', equippedError)
    return {
      success: false,
      equipped: null,
      error: equippedError.message
    }
  }

  // If no equipped tools row exists, return error
  if (!equipped || equippedError?.code === 'PGRST116') {
    console.error('[gatheringTools] No tools found for character:', characterId)
    return {
      success: false,
      equipped: null,
      error: 'No equipped tools found. Please contact support or create a new character.'
    }
  }

  // Fetch tool details for each slot
  const toolIds = [
    equipped.axe_id,
    equipped.pickaxe_id,
    equipped.fishing_rod_id,
    equipped.hunting_knife_id,
    equipped.herbalism_sickle_id,
    equipped.divination_staff_id
  ].filter(id => id !== null) as string[]

  const toolsMap: Record<string, any> = {}

  if (toolIds.length > 0) {
    const { data: tools, error: toolsError } = await supabase
      .from('gathering_tools')
      .select('*')
      .in('id', toolIds)

    if (toolsError) {
      console.error('[gatheringTools] Error fetching tool details:', toolsError)
      return {
        success: false,
        equipped: null,
        error: toolsError.message
      }
    }

    tools?.forEach(tool => {
      toolsMap[tool.id] = tool
    })
  }

  return {
    success: true,
    equipped: {
      ...equipped,
      tools: {
        axe_id: equipped.axe_id ? toolsMap[equipped.axe_id] || null : null,
        pickaxe_id: equipped.pickaxe_id ? toolsMap[equipped.pickaxe_id] || null : null,
        fishing_rod_id: equipped.fishing_rod_id ? toolsMap[equipped.fishing_rod_id] || null : null,
        hunting_knife_id: equipped.hunting_knife_id ? toolsMap[equipped.hunting_knife_id] || null : null,
        herbalism_sickle_id: equipped.herbalism_sickle_id ? toolsMap[equipped.herbalism_sickle_id] || null : null,
        divination_staff_id: equipped.divination_staff_id ? toolsMap[equipped.divination_staff_id] || null : null
      }
    },
    error: null
  }
}

/**
 * Equip a tool
 */
export async function equipTool(characterId: string, toolId: string) {
  const { data, error } = await equipToolLib(characterId, toolId)

  revalidatePath('/game')

  return {
    success: !error,
    result: data,
    error: error?.message
  }
}

/**
 * Unequip a tool from a slot
 */
export async function unequipTool(characterId: string, slot: ToolSlot) {
  const { data, error } = await unequipToolLib(characterId, slot)

  revalidatePath('/game')

  return {
    success: !error,
    result: data,
    error: error?.message
  }
}

/**
 * Repair a tool (costs gold)
 */
export async function repairTool(characterId: string, slot: ToolSlot, tier: number) {
  const cost = getRepairCost(tier)
  const { data, error } = await repairToolLib(characterId, slot, cost)

  revalidatePath('/game')

  return {
    success: !error,
    result: data,
    cost,
    error: error?.message
  }
}
