/**
 * Gathering System
 *
 * Handles gathering sessions, progress tracking, and resource collection.
 */

import { createClient } from '@/utils/supabase/client'
import { ActiveGathering, Material, GatheringSession } from './supabase'
import { getMaterialById, addMaterialToInventory, addSkillExperience } from './materials'

/**
 * Start a new gathering session
 */
export async function startGathering(
  characterId: string,
  materialId: string,
  quantityGoal: number = 1
) {
  const supabase = createClient()

  // Get material info
  const { data: material, error: matError } = await getMaterialById(materialId)

  if (matError || !material) {
    return { data: null, error: matError || new Error('Material not found') }
  }

  // Check if character already has an active gathering session
  const { data: existing, error: checkError } = await supabase
    .from('active_gathering')
    .select('*')
    .eq('character_id', characterId)
    .single()

  if (existing) {
    return { data: null, error: new Error('Already gathering. Complete current session first.') }
  }

  // Verify character meets requirements
  const { data: character, error: charError } = await supabase
    .from('characters')
    .select('level')
    .eq('id', characterId)
    .single()

  if (charError || !character) {
    return { data: null, error: charError || new Error('Character not found') }
  }

  const { data: skill, error: skillError } = await supabase
    .from('character_skills')
    .select('level')
    .eq('character_id', characterId)
    .eq('skill_type', material.required_skill_type)
    .single()

  const playerSkillLevel = skill?.level || 1

  if (playerSkillLevel < material.required_skill_level) {
    return {
      data: null,
      error: new Error(`Requires ${material.required_skill_type} level ${material.required_skill_level}`)
    }
  }

  if (character.level < material.required_zone_level) {
    return {
      data: null,
      error: new Error(`Requires character level ${material.required_zone_level}`)
    }
  }

  // Create active gathering session
  const { data, error } = await supabase
    .from('active_gathering')
    .insert({
      character_id: characterId,
      skill_type: material.required_skill_type,
      material_id: materialId,
      quantity_goal: quantityGoal,
      quantity_gathered: 0
    })
    .select()
    .single()

  return { data: data as ActiveGathering | null, error }
}

/**
 * Get active gathering session for a character
 */
export async function getActiveGathering(characterId: string) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('active_gathering')
    .select('*')
    .eq('character_id', characterId)
    .single()

  if (error && error.code === 'PGRST116') {
    // No active session
    return { data: null, error: null }
  }

  return { data: data as ActiveGathering | null, error }
}

/**
 * Get gathering session with progress details
 */
export async function getGatheringSession(characterId: string): Promise<{
  data: GatheringSession | null
  error: any
}> {
  const { data: activeGathering, error: activeError } = await getActiveGathering(characterId)

  if (activeError || !activeGathering) {
    return { data: null, error: activeError }
  }

  const { data: material, error: matError } = await getMaterialById(activeGathering.material_id)

  if (matError || !material) {
    return { data: null, error: matError }
  }

  // Calculate progress
  const now = new Date()
  const lastGathered = new Date(activeGathering.last_gathered_at)
  const timeSinceLastGather = now.getTime() - lastGathered.getTime()

  // Calculate efficiency bonus based on skill level (future enhancement)
  const gatheringTime = material.gathering_time_ms

  // How many units should be gathered by now?
  const unitsGatherable = Math.floor(timeSinceLastGather / gatheringTime)
  const currentGathered = Math.min(
    activeGathering.quantity_gathered + unitsGatherable,
    activeGathering.quantity_goal
  )

  const progress = (currentGathered / activeGathering.quantity_goal) * 100
  const timeRemainingMs = Math.max(
    0,
    (activeGathering.quantity_goal - currentGathered) * gatheringTime
  )

  return {
    data: {
      material,
      progress: Math.min(100, progress),
      timeRemaining: timeRemainingMs,
      quantityGathered: currentGathered,
      quantityGoal: activeGathering.quantity_goal
    },
    error: null
  }
}

/**
 * Process gathering progress and collect resources if ready
 */
export async function processGathering(characterId: string) {
  const supabase = createClient()

  const { data: session, error: sessionError } = await getGatheringSession(characterId)

  if (sessionError || !session) {
    return { data: null, error: sessionError, completed: false }
  }

  const { data: activeGathering, error: activeError } = await getActiveGathering(characterId)

  if (activeError || !activeGathering) {
    return { data: null, error: activeError, completed: false }
  }

  const now = new Date()
  const lastGathered = new Date(activeGathering.last_gathered_at)
  const timeSinceLastGather = now.getTime() - lastGathered.getTime()
  const gatheringTime = session.material.gathering_time_ms

  // How many units can be gathered?
  const unitsGatherable = Math.floor(timeSinceLastGather / gatheringTime)

  if (unitsGatherable === 0) {
    // Not enough time has passed
    return { data: session, error: null, completed: false }
  }

  const newQuantityGathered = Math.min(
    activeGathering.quantity_gathered + unitsGatherable,
    activeGathering.quantity_goal
  )

  const unitsActuallyGathered = newQuantityGathered - activeGathering.quantity_gathered

  // Update active gathering
  const { error: updateError } = await supabase
    .from('active_gathering')
    .update({
      quantity_gathered: newQuantityGathered,
      last_gathered_at: now.toISOString()
    })
    .eq('character_id', characterId)

  if (updateError) {
    return { data: null, error: updateError, completed: false }
  }

  // Add experience for units gathered
  if (unitsActuallyGathered > 0) {
    const totalExperience = session.material.experience_reward * unitsActuallyGathered

    await addSkillExperience(
      characterId,
      session.material.required_skill_type,
      totalExperience
    )
  }

  // Check if goal is reached
  const completed = newQuantityGathered >= activeGathering.quantity_goal

  return {
    data: {
      ...session,
      quantityGathered: newQuantityGathered,
      progress: (newQuantityGathered / activeGathering.quantity_goal) * 100
    },
    error: null,
    completed,
    unitsGathered: unitsActuallyGathered
  }
}

/**
 * Complete gathering session and add materials to inventory
 */
export async function completeGathering(characterId: string) {
  const supabase = createClient()

  const { data: activeGathering, error: activeError } = await getActiveGathering(characterId)

  if (activeError || !activeGathering) {
    return { data: null, error: activeError || new Error('No active gathering session') }
  }

  // Process any remaining progress first
  await processGathering(characterId)

  // Get updated gathering state
  const { data: updatedGathering } = await getActiveGathering(characterId)

  if (!updatedGathering) {
    return { data: null, error: new Error('No active gathering session') }
  }

  // Check if gathering is complete
  if (updatedGathering.quantity_gathered < updatedGathering.quantity_goal) {
    return {
      data: null,
      error: new Error('Gathering not yet complete'),
      quantityGathered: updatedGathering.quantity_gathered
    }
  }

  // Add materials to inventory
  const { error: invError } = await addMaterialToInventory(
    characterId,
    updatedGathering.material_id,
    updatedGathering.quantity_goal
  )

  if (invError) {
    return { data: null, error: invError }
  }

  // Delete active gathering session
  const { error: deleteError } = await supabase
    .from('active_gathering')
    .delete()
    .eq('character_id', characterId)

  if (deleteError) {
    return { data: null, error: deleteError }
  }

  return {
    data: {
      materialId: updatedGathering.material_id,
      quantity: updatedGathering.quantity_goal,
      skillType: updatedGathering.skill_type
    },
    error: null,
    quantityGathered: updatedGathering.quantity_goal
  }
}

/**
 * Cancel active gathering session
 */
export async function cancelGathering(characterId: string) {
  const supabase = createClient()

  // Process progress first to give credit for partial work
  await processGathering(characterId)

  const { data: activeGathering, error: activeError } = await getActiveGathering(characterId)

  if (activeError || !activeGathering) {
    return { data: null, error: activeError || new Error('No active gathering session') }
  }

  // Add partial materials to inventory if any were gathered
  if (activeGathering.quantity_gathered > 0) {
    await addMaterialToInventory(
      characterId,
      activeGathering.material_id,
      activeGathering.quantity_gathered
    )
  }

  // Delete session
  const { error: deleteError } = await supabase
    .from('active_gathering')
    .delete()
    .eq('character_id', characterId)

  return {
    data: {
      materialId: activeGathering.material_id,
      quantityGathered: activeGathering.quantity_gathered
    },
    error: deleteError
  }
}

/**
 * Calculate gathering time with skill bonus
 * Higher skill = faster gathering (up to 50% reduction at level 99)
 */
export function calculateGatheringTime(baseTime: number, skillLevel: number): number {
  // Efficiency bonus: 0.5% per level (max 49.5% at level 99)
  const efficiencyBonus = Math.min(0.495, (skillLevel - 1) * 0.005)
  return Math.floor(baseTime * (1 - efficiencyBonus))
}

/**
 * Get available gathering nodes for a character's level
 */
export async function getAvailableNodes(characterId: string, skillType: string) {
  const supabase = createClient()

  const { data: character, error: charError } = await supabase
    .from('characters')
    .select('level')
    .eq('id', characterId)
    .single()

  if (charError || !character) {
    return { data: null, error: charError }
  }

  const { data: nodes, error: nodesError } = await supabase
    .from('gathering_nodes')
    .select(`
      *,
      materials:material_id (*)
    `)
    .lte('required_zone_level', character.level)

  if (nodesError) {
    return { data: null, error: nodesError }
  }

  // Filter by skill type
  const filteredNodes = nodes?.filter((node: any) => {
    return node.materials?.required_skill_type === skillType
  })

  return { data: filteredNodes, error: null }
}
