/**
 * Gathering Tools - Equipment and Management
 *
 * Handles tool equipment, durability, repair, and inventory management
 * for the deep gathering system.
 */

import { createClient } from '@/utils/supabase/client'
import type { GatheringTool, CharacterEquippedTools } from './supabase'
import {
  type ToolSlot,
  type ToolType,
  SKILL_TO_TOOL_TYPE,
  TOOL_TYPE_TO_SLOT,
  TOOL_TYPE_LABELS
} from './gatheringToolTypes'

// Re-export types, constants, and helpers for backwards compatibility
export {
  type ToolSlot,
  type ToolType,
  SKILL_TO_TOOL_TYPE,
  TOOL_TYPE_TO_SLOT,
  TOOL_TYPE_LABELS,
  getRepairCost,
  isToolBroken,
  needsRepair,
  getToolEfficiencyBonus,
  getDurabilityLossPerUse
} from './gatheringToolTypes'

/**
 * Get all available gathering tools from the catalog
 */
export async function getAllGatheringTools(): Promise<{
  data: GatheringTool[] | null
  error: Error | null
}> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('gathering_tools')
    .select('*')
    .order('tier', { ascending: true })
    .order('tool_type', { ascending: true })

  if (error) {
    console.error('[gatheringTools] Error fetching tools:', error)
    return { data: null, error }
  }

  return { data, error: null }
}

/**
 * Get character's equipped tools with durability info
 */
export async function getEquippedTools(characterId: string): Promise<{
  data: (CharacterEquippedTools & { tools: Record<ToolSlot, GatheringTool | null> }) | null
  error: Error | null
}> {
  const supabase = createClient()

  console.log('[gatheringTools] Fetching equipped tools for character:', characterId)

  // Get equipped tools row
  const { data: equipped, error: equippedError } = await supabase
    .from('character_equipped_tools')
    .select('*')
    .eq('character_id', characterId)
    .single()

  console.log('[gatheringTools] Query result:', { equipped, equippedError })

  // If there's an error other than "no rows found", return error
  if (equippedError && equippedError.code !== 'PGRST116') {
    console.error('[gatheringTools] Error fetching equipped tools:', equippedError)
    return { data: null, error: equippedError }
  }

  // If no equipped tools row exists, return error asking them to contact support
  // (Tools should be initialized during character creation or manually by admin)
  if (!equipped || equippedError?.code === 'PGRST116') {
    console.error('[gatheringTools] No tools found for character:', characterId, 'Error code:', equippedError?.code)
    return {
      data: null,
      error: new Error('No equipped tools found. Please contact support or create a new character.')
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

  const toolsMap: Record<string, GatheringTool> = {}

  if (toolIds.length > 0) {
    const { data: tools, error: toolsError } = await supabase
      .from('gathering_tools')
      .select('*')
      .in('id', toolIds)

    if (toolsError) {
      console.error('[gatheringTools] Error fetching tool details:', toolsError)
      return { data: null, error: toolsError }
    }

    tools?.forEach(tool => {
      toolsMap[tool.id] = tool
    })
  }

  return {
    data: {
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
 * Equip a tool in the appropriate slot
 */
export async function equipTool(characterId: string, toolId: string): Promise<{
  data: boolean | null
  error: Error | null
}> {
  const supabase = createClient()

  // Get tool details
  const { data: tool, error: toolError } = await supabase
    .from('gathering_tools')
    .select('*')
    .eq('id', toolId)
    .single()

  if (toolError || !tool) {
    return { data: null, error: toolError || new Error('Tool not found') }
  }

  // Determine slot
  const slot = TOOL_TYPE_TO_SLOT[tool.tool_type as ToolType]
  const durabilityField = `${slot.replace('_id', '_durability')}` as keyof CharacterEquippedTools

  // Ensure character has equipped_tools row
  await getEquippedTools(characterId)

  // Equip the tool
  const { error: equipError } = await supabase
    .from('character_equipped_tools')
    .update({
      [slot]: toolId,
      [durabilityField]: 100 // Reset to full durability on equip
    })
    .eq('character_id', characterId)

  if (equipError) {
    console.error('[gatheringTools] Error equipping tool:', equipError)
    return { data: null, error: equipError }
  }

  return { data: true, error: null }
}

/**
 * Unequip a tool from a slot
 */
export async function unequipTool(characterId: string, slot: ToolSlot): Promise<{
  data: boolean | null
  error: Error | null
}> {
  const supabase = createClient()

  const { error } = await supabase
    .from('character_equipped_tools')
    .update({ [slot]: null })
    .eq('character_id', characterId)

  if (error) {
    console.error('[gatheringTools] Error unequipping tool:', error)
    return { data: null, error }
  }

  return { data: true, error: null }
}

/**
 * Reduce tool durability after use
 */
export async function reduceToolDurability(characterId: string, toolType: ToolType, amount: number = 1): Promise<{
  data: number | null // Remaining durability
  error: Error | null
}> {
  const supabase = createClient()

  const slot = TOOL_TYPE_TO_SLOT[toolType]
  const durabilityField = `${slot.replace('_id', '_durability')}`

  // Get current durability
  const { data: equipped, error: fetchError } = await supabase
    .from('character_equipped_tools')
    .select(durabilityField)
    .eq('character_id', characterId)
    .single()

  if (fetchError || !equipped) {
    return { data: null, error: fetchError || new Error('Equipped tools not found') }
  }

  const currentDurability = equipped[durabilityField as keyof typeof equipped] as number
  const newDurability = Math.max(0, currentDurability - amount)

  // Update durability
  const { error: updateError } = await supabase
    .from('character_equipped_tools')
    .update({ [durabilityField]: newDurability })
    .eq('character_id', characterId)

  if (updateError) {
    console.error('[gatheringTools] Error reducing durability:', updateError)
    return { data: null, error: updateError }
  }

  return { data: newDurability, error: null }
}

/**
 * Repair a tool (costs gold)
 */
export async function repairTool(characterId: string, slot: ToolSlot, repairCost: number): Promise<{
  data: boolean | null
  error: Error | null
}> {
  const supabase = createClient()

  // Get character gold
  const { data: character, error: charError } = await supabase
    .from('characters')
    .select('gold')
    .eq('id', characterId)
    .single()

  if (charError || !character) {
    return { data: null, error: charError || new Error('Character not found') }
  }

  if (character.gold < repairCost) {
    return { data: null, error: new Error('Not enough gold') }
  }

  // Deduct gold and restore durability
  const durabilityField = `${slot.replace('_id', '_durability')}`

  const { error: updateCharError } = await supabase
    .from('characters')
    .update({ gold: character.gold - repairCost })
    .eq('id', characterId)

  if (updateCharError) {
    return { data: null, error: updateCharError }
  }

  const { error: updateToolError } = await supabase
    .from('character_equipped_tools')
    .update({ [durabilityField]: 100 })
    .eq('character_id', characterId)

  if (updateToolError) {
    return { data: null, error: updateToolError }
  }

  return { data: true, error: null }
}

// Helper functions are now imported from gatheringToolTypes.ts
