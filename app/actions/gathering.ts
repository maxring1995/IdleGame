'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function startGatheringAction(
  characterId: string,
  materialId: string,
  quantityGoal: number = 1
) {
  const supabase = await createClient()

  // Get material info
  const { data: material, error: matError } = await supabase
    .from('materials')
    .select('*')
    .eq('id', materialId)
    .single()

  if (matError || !material) {
    return { data: null, error: matError || new Error('Material not found') }
  }

  // Check if character already has an active gathering session
  const { data: existing } = await supabase
    .from('active_gathering')
    .select('*')
    .eq('character_id', characterId)
    .single()

  if (existing) {
    return { data: null, error: new Error('Already gathering. Complete current session first.') }
  }

  // Verify character meets requirements
  const { data: character } = await supabase
    .from('characters')
    .select('level')
    .eq('id', characterId)
    .single()

  if (!character) {
    return { data: null, error: new Error('Character not found') }
  }

  const { data: skill } = await supabase
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

  revalidatePath('/game')
  return { data, error }
}

export async function completeGatheringAction(characterId: string) {
  const supabase = await createClient()

  const { data: activeGathering } = await supabase
    .from('active_gathering')
    .select('*')
    .eq('character_id', characterId)
    .single()

  if (!activeGathering) {
    return { data: null, error: new Error('No active gathering session') }
  }

  // Get material info for XP
  const { data: material } = await supabase
    .from('materials')
    .select('*')
    .eq('id', activeGathering.material_id)
    .single()

  // Add materials to inventory
  const { data: existingItem } = await supabase
    .from('inventory')
    .select('*')
    .eq('character_id', characterId)
    .eq('item_id', activeGathering.material_id)
    .single()

  if (existingItem) {
    // Update quantity
    await supabase
      .from('inventory')
      .update({ quantity: existingItem.quantity + activeGathering.quantity_goal })
      .eq('id', existingItem.id)
  } else {
    // Create new inventory entry
    await supabase
      .from('inventory')
      .insert({
        character_id: characterId,
        item_id: activeGathering.material_id,
        quantity: activeGathering.quantity_goal,
        equipped: false,
        enchantment_level: 0,
        durability: 100
      })
  }

  // Add experience to skill
  if (material) {
    const totalExperience = material.experience_reward * activeGathering.quantity_goal

    // Get or create skill
    const { data: existingSkill } = await supabase
      .from('character_skills')
      .select('*')
      .eq('character_id', characterId)
      .eq('skill_type', activeGathering.skill_type)
      .single()

    if (existingSkill) {
      const newExperience = existingSkill.experience + totalExperience
      let newLevel = existingSkill.level

      // Calculate new level
      while (newExperience >= newLevel * 100 && newLevel < 99) {
        newLevel++
      }

      await supabase
        .from('character_skills')
        .update({
          level: newLevel,
          experience: newExperience
        })
        .eq('character_id', characterId)
        .eq('skill_type', activeGathering.skill_type)
    } else {
      // Create new skill
      await supabase
        .from('character_skills')
        .insert({
          character_id: characterId,
          skill_type: activeGathering.skill_type,
          level: 1,
          experience: totalExperience
        })
    }
  }

  // Delete active gathering session
  await supabase
    .from('active_gathering')
    .delete()
    .eq('character_id', characterId)

  revalidatePath('/game')
  return {
    data: {
      materialId: activeGathering.material_id,
      quantity: activeGathering.quantity_goal,
      skillType: activeGathering.skill_type
    },
    error: null
  }
}

export async function cancelGatheringAction(characterId: string) {
  const supabase = await createClient()

  const { data: activeGathering } = await supabase
    .from('active_gathering')
    .select('*')
    .eq('character_id', characterId)
    .single()

  if (!activeGathering) {
    return { data: null, error: new Error('No active gathering session') }
  }

  // Delete session
  await supabase
    .from('active_gathering')
    .delete()
    .eq('character_id', characterId)

  revalidatePath('/game')
  return {
    data: {
      materialId: activeGathering.material_id,
      quantityGathered: activeGathering.quantity_gathered
    },
    error: null
  }
}
