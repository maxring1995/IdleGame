'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getMaterialsForSkill(characterId: string, skillType: string) {
  const supabase = await createClient()

  // Get character level
  const { data: character, error: charError } = await supabase
    .from('characters')
    .select('level')
    .eq('id', characterId)
    .maybeSingle()

  if (!character || charError) return { data: null, error: 'Character not found' }

  // Get skill level
  const { data: skill } = await supabase
    .from('character_skills')
    .select('level, experience')
    .eq('character_id', characterId)
    .eq('skill_type', skillType)
    .maybeSingle()

  const skillLevel = skill?.level || 1
  const skillExperience = skill?.experience || 0

  // Get materials for this skill
  const { data: materials } = await supabase
    .from('materials')
    .select('*')
    .eq('required_skill_type', skillType)
    .order('required_skill_level', { ascending: true })

  const materialsWithStatus = materials?.map(mat => ({
    ...mat,
    canGather: skillLevel >= mat.required_skill_level && character.level >= mat.required_zone_level,
    isLocked: skillLevel < mat.required_skill_level || character.level < mat.required_zone_level,
    lockReason: skillLevel < mat.required_skill_level
      ? `Requires ${skillType} level ${mat.required_skill_level}`
      : character.level < mat.required_zone_level
      ? `Requires character level ${mat.required_zone_level}`
      : null
  }))

  return {
    data: {
      materials: materialsWithStatus || [],
      skillLevel,
      skillExperience,
      experienceForNextLevel: skillLevel * 100
    },
    error: null
  }
}

export async function startGatheringSimple(
  characterId: string,
  materialId: string,
  quantity: number
) {
  const supabase = await createClient()

  // Check for existing session
  const { data: existing } = await supabase
    .from('active_gathering')
    .select('*')
    .eq('character_id', characterId)
    .maybeSingle()

  if (existing) {
    return { success: false, error: 'Already gathering' }
  }

  // Get material
  const { data: material, error: matError } = await supabase
    .from('materials')
    .select('*')
    .eq('id', materialId)
    .maybeSingle()

  if (!material || matError) {
    return { success: false, error: 'Material not found' }
  }

  // Create session
  const { error } = await supabase
    .from('active_gathering')
    .insert({
      character_id: characterId,
      skill_type: material.required_skill_type,
      material_id: materialId,
      quantity_goal: quantity,
      quantity_gathered: 0
    })

  if (error) {
    return { success: false, error: error.message }
  }

  const totalTime = material.gathering_time_ms * quantity

  revalidatePath('/game')
  return {
    success: true,
    error: null,
    session: {
      totalTime,
      material: material.name,
      quantity
    }
  }
}

export async function checkGatheringProgress(characterId: string) {
  const supabase = await createClient()

  const { data: session } = await supabase
    .from('active_gathering')
    .select('*')
    .eq('character_id', characterId)
    .maybeSingle()

  if (!session) return { data: null, error: null }

  const { data: material, error: matError } = await supabase
    .from('materials')
    .select('*')
    .eq('id', session.material_id)
    .maybeSingle()

  if (!material || matError) return { data: null, error: 'Material not found' }

  const now = new Date()
  const lastGathered = new Date(session.last_gathered_at)
  const timeSinceLastGather = now.getTime() - lastGathered.getTime()
  const gatheringTime = material.gathering_time_ms

  const unitsGatherable = Math.floor(timeSinceLastGather / gatheringTime)
  const newQuantityGathered = Math.min(
    session.quantity_gathered + unitsGatherable,
    session.quantity_goal
  )

  // Update if changed
  if (newQuantityGathered > session.quantity_gathered) {
    await supabase
      .from('active_gathering')
      .update({
        quantity_gathered: newQuantityGathered,
        last_gathered_at: now.toISOString()
      })
      .eq('character_id', characterId)
  }

  const progress = (newQuantityGathered / session.quantity_goal) * 100
  const timeRemaining = Math.max(0, (session.quantity_goal - newQuantityGathered) * gatheringTime)

  return {
    data: {
      material,
      quantityGathered: newQuantityGathered,
      quantityGoal: session.quantity_goal,
      progress,
      timeRemaining,
      isComplete: newQuantityGathered >= session.quantity_goal
    },
    error: null
  }
}

export async function collectGathering(characterId: string) {
  const supabase = await createClient()

  const { data: session } = await supabase
    .from('active_gathering')
    .select('*')
    .eq('character_id', characterId)
    .maybeSingle()

  if (!session) {
    return { success: false, error: 'No active session' }
  }

  // Check progress first
  const { data: progress } = await checkGatheringProgress(characterId)

  if (!progress?.isComplete) {
    return { success: false, error: 'Not complete yet' }
  }

  const { data: material, error: matError } = await supabase
    .from('materials')
    .select('*')
    .eq('id', session.material_id)
    .maybeSingle()

  if (!material || matError) {
    return { success: false, error: 'Material not found' }
  }

  // Add to inventory (use quantity_gathered, not quantity_goal)
  const { data: existing } = await supabase
    .from('inventory')
    .select('*')
    .eq('character_id', characterId)
    .eq('item_id', session.material_id)
    .maybeSingle()

  if (existing) {
    await supabase
      .from('inventory')
      .update({ quantity: existing.quantity + session.quantity_gathered })
      .eq('id', existing.id)
  } else {
    await supabase
      .from('inventory')
      .insert({
        character_id: characterId,
        item_id: session.material_id,
        quantity: session.quantity_gathered,
        equipped: false,
        enchantment_level: 0,
        durability: 100
      })
  }

  // Add XP (use quantity_gathered, not quantity_goal)
  const totalXP = material.experience_reward * session.quantity_gathered

  const { data: skill } = await supabase
    .from('character_skills')
    .select('*')
    .eq('character_id', characterId)
    .eq('skill_type', session.skill_type)
    .maybeSingle()

  if (skill) {
    const newXP = skill.experience + totalXP
    let newLevel = skill.level

    while (newXP >= newLevel * 100 && newLevel < 99) {
      newLevel++
    }

    await supabase
      .from('character_skills')
      .update({ level: newLevel, experience: newXP })
      .eq('character_id', characterId)
      .eq('skill_type', session.skill_type)
  } else {
    await supabase
      .from('character_skills')
      .insert({
        character_id: characterId,
        skill_type: session.skill_type,
        level: 1,
        experience: totalXP
      })
  }

  // Delete session
  await supabase
    .from('active_gathering')
    .delete()
    .eq('character_id', characterId)

  revalidatePath('/game')
  return {
    success: true,
    error: null,
    data: {
      materialName: material.name,
      quantity: session.quantity_gathered,
      xpGained: totalXP
    }
  }
}

export async function cancelGatheringSimple(characterId: string) {
  const supabase = await createClient()

  await supabase
    .from('active_gathering')
    .delete()
    .eq('character_id', characterId)

  revalidatePath('/game')
  return { success: true }
}
