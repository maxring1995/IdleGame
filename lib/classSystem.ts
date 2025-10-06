import { createClient } from '@/utils/supabase/client'
import type {
  Race,
  Class,
  AppearancePreset,
  ClassAbility,
  TalentTree,
  TalentNode,
  CharacterTalent,
  TalentBuild,
  CharacterTalentSpec,
  ClassTrainer,
  TrainerWithAbilities,
  Transmogrification,
  TransmogCollection,
  TransmogCollectionWithItem
} from './supabase'

/**
 * Get all available races
 */
export async function getRaces(): Promise<{ data: Race[] | null; error: any }> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('races')
      .select('*')
      .order('name')

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Get races error:', error)
    return { data: null, error }
  }
}

/**
 * Get all available classes
 */
export async function getClasses(): Promise<{ data: Class[] | null; error: any }> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('classes')
      .select('*')
      .order('name')

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Get classes error:', error)
    return { data: null, error }
  }
}

/**
 * Get appearance presets for a specific race and gender
 */
export async function getAppearancePresets(
  raceId: string,
  gender: 'male' | 'female'
): Promise<{ data: AppearancePreset[] | null; error: any }> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('appearance_presets')
      .select('*')
      .eq('race_id', raceId)
      .eq('gender', gender)

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Get appearance presets error:', error)
    return { data: null, error }
  }
}

/**
 * Get class abilities for a specific class
 */
export async function getClassAbilities(classId: string): Promise<{ data: ClassAbility[] | null; error: any }> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('class_abilities')
      .select('*')
      .eq('class_id', classId)
      .order('required_level')

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Get class abilities error:', error)
    return { data: null, error }
  }
}

/**
 * Learn a new ability for a character
 */
export async function learnAbility(
  characterId: string,
  abilityId: string
): Promise<{ success: boolean; error: any }> {
  try {
    const supabase = createClient()
    const { error } = await supabase
      .from('character_abilities')
      .insert({
        character_id: characterId,
        ability_id: abilityId
      })

    if (error) throw error
    return { success: true, error: null }
  } catch (error) {
    console.error('Learn ability error:', error)
    return { success: false, error }
  }
}

/**
 * Get character's learned abilities
 */
export async function getCharacterAbilities(
  characterId: string
): Promise<{ data: ClassAbility[] | null; error: any }> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('character_abilities')
      .select(`
        ability_id,
        learned_at,
        class_abilities (*)
      `)
      .eq('character_id', characterId)

    if (error) throw error

    // Extract ability data from join
    const abilities = data?.map((item: any) => item.class_abilities) || []
    return { data: abilities, error: null }
  } catch (error) {
    console.error('Get character abilities error:', error)
    return { data: null, error }
  }
}

/**
 * Get talent trees for a specific class
 */
export async function getTalentTrees(classId: string): Promise<{ data: TalentTree[] | null; error: any }> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('talent_trees')
      .select('*')
      .eq('class_id', classId)
      .order('name')

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Get talent trees error:', error)
    return { data: null, error }
  }
}

/**
 * Get talent nodes for a specific talent tree
 */
export async function getTalentNodes(treeId: string): Promise<{ data: TalentNode[] | null; error: any }> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('talent_nodes')
      .select('*')
      .eq('tree_id', treeId)
      .order('tier')
      .order('column_position')

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Get talent nodes error:', error)
    return { data: null, error }
  }
}

/**
 * Spend talent points on a talent node
 */
export async function spendTalentPoint(
  characterId: string,
  talentId: string,
  pointsToSpend: number = 1
): Promise<{ success: boolean; error: any }> {
  try {
    const supabase = createClient()

    // Check if character has enough talent points
    const { data: character, error: charError } = await supabase
      .from('characters')
      .select('talent_points')
      .eq('id', characterId)
      .single()

    if (charError) throw charError
    if (!character || character.talent_points < pointsToSpend) {
      throw new Error('Not enough talent points')
    }

    // Check if talent already learned
    const { data: existing, error: existingError } = await supabase
      .from('character_talents')
      .select('*')
      .eq('character_id', characterId)
      .eq('talent_id', talentId)
      .single()

    if (existing) {
      // Update existing talent
      const newPoints = existing.points_spent + pointsToSpend

      const { error: updateError } = await supabase
        .from('character_talents')
        .update({ points_spent: newPoints })
        .eq('id', existing.id)

      if (updateError) throw updateError
    } else {
      // Insert new talent
      const { error: insertError } = await supabase
        .from('character_talents')
        .insert({
          character_id: characterId,
          talent_id: talentId,
          points_spent: pointsToSpend
        })

      if (insertError) throw insertError
    }

    // Decrease character's available talent points
    const { error: pointsError } = await supabase
      .from('characters')
      .update({ talent_points: character.talent_points - pointsToSpend })
      .eq('id', characterId)

    if (pointsError) throw pointsError

    return { success: true, error: null }
  } catch (error) {
    console.error('Spend talent point error:', error)
    return { success: false, error }
  }
}

/**
 * Get character's learned talents
 */
export async function getCharacterTalents(
  characterId: string
): Promise<{ data: CharacterTalent[] | null; error: any }> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('character_talents')
      .select('*')
      .eq('character_id', characterId)

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Get character talents error:', error)
    return { data: null, error }
  }
}

/**
 * Reset all talents for a character (costs gold)
 */
export async function resetTalents(
  characterId: string
): Promise<{ success: boolean; error: any }> {
  try {
    const supabase = createClient()

    // Get character data
    const { data: character, error: charError } = await supabase
      .from('characters')
      .select('total_talent_points, gold')
      .eq('id', characterId)
      .single()

    if (charError) throw charError
    if (!character) throw new Error('Character not found')

    // Calculate reset cost (increases with total talents spent)
    const resetCost = Math.floor(character.total_talent_points * 100)

    if (character.gold < resetCost) {
      throw new Error(`Not enough gold. Need ${resetCost} gold to reset talents.`)
    }

    // Delete all character talents
    const { error: deleteError } = await supabase
      .from('character_talents')
      .delete()
      .eq('character_id', characterId)

    if (deleteError) throw deleteError

    // Refund talent points and charge gold
    const { error: updateError } = await supabase
      .from('characters')
      .update({
        talent_points: character.total_talent_points,
        gold: character.gold - resetCost
      })
      .eq('id', characterId)

    if (updateError) throw updateError

    return { success: true, error: null }
  } catch (error) {
    console.error('Reset talents error:', error)
    return { success: false, error }
  }
}

/**
 * ==========================================
 * TALENT BUILDS SYSTEM
 * ==========================================
 */

/**
 * Get all talent builds for a character
 */
export async function getTalentBuilds(characterId: string): Promise<{ data: TalentBuild[] | null; error: any }> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('talent_builds')
      .select('*')
      .eq('character_id', characterId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Get talent builds error:', error)
    return { data: null, error }
  }
}

/**
 * Save current talent configuration as a build
 */
export async function saveTalentBuild(
  characterId: string,
  name: string,
  description: string,
  classId: string,
  specType: string,
  isPublic: boolean = false
): Promise<{ success: boolean; error: any; buildId?: string }> {
  try {
    const supabase = createClient()

    // Get current talents
    const { data: currentTalents } = await supabase
      .from('character_talents')
      .select('*')
      .eq('character_id', characterId)

    if (!currentTalents) {
      throw new Error('No talents to save')
    }

    // Create talent data mapping
    const talentData: Record<string, number> = {}
    currentTalents.forEach((talent: CharacterTalent) => {
      talentData[talent.talent_id] = talent.points_spent
    })

    // Save build
    const { data, error } = await supabase
      .from('talent_builds')
      .insert({
        character_id: characterId,
        name,
        description,
        class_id: classId,
        spec_type: specType,
        talent_data: talentData,
        is_public: isPublic
      })
      .select()
      .single()

    if (error) throw error

    return { success: true, error: null, buildId: data.id }
  } catch (error) {
    console.error('Save talent build error:', error)
    return { success: false, error }
  }
}

/**
 * Load a saved talent build
 */
export async function loadTalentBuild(
  characterId: string,
  buildId: string
): Promise<{ success: boolean; error: any }> {
  try {
    const supabase = createClient()

    // Get build
    const { data: build, error: buildError } = await supabase
      .from('talent_builds')
      .select('*')
      .eq('id', buildId)
      .single()

    if (buildError) throw buildError
    if (!build) throw new Error('Build not found')

    // Get character data
    const { data: character, error: charError } = await supabase
      .from('characters')
      .select('gold, total_talent_points')
      .eq('id', characterId)
      .single()

    if (charError) throw charError
    if (!character) throw new Error('Character not found')

    // Calculate total points needed
    const totalPointsNeeded = Object.values(build.talent_data as Record<string, number>).reduce(
      (sum, points) => sum + points,
      0
    )

    if (totalPointsNeeded > character.total_talent_points) {
      throw new Error('Not enough total talent points to load this build')
    }

    // Delete current talents
    await supabase
      .from('character_talents')
      .delete()
      .eq('character_id', characterId)

    // Insert new talents from build
    const talentsToInsert = Object.entries(build.talent_data as Record<string, number>).map(
      ([talentId, points]) => ({
        character_id: characterId,
        talent_id: talentId,
        points_spent: points
      })
    )

    const { error: insertError } = await supabase
      .from('character_talents')
      .insert(talentsToInsert)

    if (insertError) throw insertError

    // Update character's available talent points
    const { error: updateError } = await supabase
      .from('characters')
      .update({
        talent_points: character.total_talent_points - totalPointsNeeded
      })
      .eq('id', characterId)

    if (updateError) throw updateError

    return { success: true, error: null }
  } catch (error) {
    console.error('Load talent build error:', error)
    return { success: false, error }
  }
}

/**
 * Delete a talent build
 */
export async function deleteTalentBuild(buildId: string): Promise<{ success: boolean; error: any }> {
  try {
    const supabase = createClient()
    const { error } = await supabase
      .from('talent_builds')
      .delete()
      .eq('id', buildId)

    if (error) throw error
    return { success: true, error: null }
  } catch (error) {
    console.error('Delete talent build error:', error)
    return { success: false, error }
  }
}

/**
 * ==========================================
 * DUAL SPECIALIZATION SYSTEM
 * ==========================================
 */

/**
 * Unlock dual specialization (costs 1000 gold)
 */
export async function unlockDualSpec(characterId: string): Promise<{ success: boolean; error: any }> {
  try {
    const supabase = createClient()
    const { error } = await supabase.rpc('unlock_dual_spec', { char_id: characterId })

    if (error) throw error
    return { success: true, error: null }
  } catch (error) {
    console.error('Unlock dual spec error:', error)
    return { success: false, error }
  }
}

/**
 * Switch active specialization
 */
export async function switchActiveSpec(
  characterId: string,
  specNumber: 1 | 2
): Promise<{ success: boolean; error: any }> {
  try {
    const supabase = createClient()

    // Check if dual spec is unlocked
    const { data: character } = await supabase
      .from('characters')
      .select('dual_spec_unlocked, active_spec')
      .eq('id', characterId)
      .single()

    if (!character?.dual_spec_unlocked) {
      throw new Error('Dual specialization not unlocked')
    }

    // Save current talents to current spec
    const currentSpec = character.active_spec || 1

    // Delete current spec talents
    await supabase
      .from('character_talents_spec')
      .delete()
      .eq('character_id', characterId)
      .eq('spec_number', currentSpec)

    // Get current talents and save them
    const { data: currentTalents } = await supabase
      .from('character_talents')
      .select('*')
      .eq('character_id', characterId)

    if (currentTalents && currentTalents.length > 0) {
      const talentsToSave = currentTalents.map((talent: CharacterTalent) => ({
        character_id: characterId,
        spec_number: currentSpec,
        talent_id: talent.talent_id,
        points_spent: talent.points_spent
      }))

      await supabase.from('character_talents_spec').insert(talentsToSave)
    }

    // Delete all current talents
    await supabase
      .from('character_talents')
      .delete()
      .eq('character_id', characterId)

    // Load talents from new spec
    const { data: newSpecTalents } = await supabase
      .from('character_talents_spec')
      .select('*')
      .eq('character_id', characterId)
      .eq('spec_number', specNumber)

    if (newSpecTalents && newSpecTalents.length > 0) {
      const talentsToLoad = newSpecTalents.map((talent: CharacterTalentSpec) => ({
        character_id: characterId,
        talent_id: talent.talent_id,
        points_spent: talent.points_spent
      }))

      await supabase.from('character_talents').insert(talentsToLoad)
    }

    // Update active spec
    const { error: updateError } = await supabase
      .from('characters')
      .update({ active_spec: specNumber })
      .eq('id', characterId)

    if (updateError) throw updateError

    return { success: true, error: null }
  } catch (error) {
    console.error('Switch active spec error:', error)
    return { success: false, error }
  }
}

/**
 * Rename a specialization
 */
export async function renameSpec(
  characterId: string,
  specNumber: 1 | 2,
  newName: string
): Promise<{ success: boolean; error: any }> {
  try {
    const supabase = createClient()
    const column = specNumber === 1 ? 'spec_1_name' : 'spec_2_name'

    const { error } = await supabase
      .from('characters')
      .update({ [column]: newName })
      .eq('id', characterId)

    if (error) throw error
    return { success: true, error: null }
  } catch (error) {
    console.error('Rename spec error:', error)
    return { success: false, error }
  }
}

/**
 * ==========================================
 * CLASS TRAINER SYSTEM
 * ==========================================
 */

/**
 * Get class trainers for a specific class
 */
export async function getClassTrainers(classId: string): Promise<{ data: ClassTrainer[] | null; error: any }> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('class_trainers')
      .select('*')
      .eq('class_id', classId)
      .order('location_name')

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Get class trainers error:', error)
    return { data: null, error }
  }
}

/**
 * Get trainer with their abilities
 */
export async function getTrainerWithAbilities(trainerId: string): Promise<{ data: TrainerWithAbilities | null; error: any }> {
  try {
    const supabase = createClient()

    // Get trainer
    const { data: trainer, error: trainerError } = await supabase
      .from('class_trainers')
      .select('*')
      .eq('id', trainerId)
      .single()

    if (trainerError) throw trainerError

    // Get trainer abilities with ability details
    const { data: abilities, error: abilitiesError } = await supabase
      .from('trainer_abilities')
      .select(`
        *,
        ability:class_abilities(*)
      `)
      .eq('trainer_id', trainerId)

    if (abilitiesError) throw abilitiesError

    const result: TrainerWithAbilities = {
      ...trainer,
      abilities: abilities as any
    }

    return { data: result, error: null }
  } catch (error) {
    console.error('Get trainer with abilities error:', error)
    return { data: null, error }
  }
}

/**
 * Learn ability from trainer (costs gold)
 */
export async function learnFromTrainer(
  characterId: string,
  trainerId: string,
  abilityId: string
): Promise<{ success: boolean; error: any }> {
  try {
    const supabase = createClient()

    // Get trainer ability (includes gold cost)
    const { data: trainerAbility, error: taError } = await supabase
      .from('trainer_abilities')
      .select('*')
      .eq('trainer_id', trainerId)
      .eq('ability_id', abilityId)
      .single()

    if (taError) throw taError
    if (!trainerAbility) throw new Error('Ability not available from this trainer')

    // Get character gold
    const { data: character, error: charError } = await supabase
      .from('characters')
      .select('gold')
      .eq('id', characterId)
      .single()

    if (charError) throw charError
    if (!character) throw new Error('Character not found')

    // Check if enough gold
    if (character.gold < trainerAbility.gold_cost) {
      throw new Error(`Not enough gold. Need ${trainerAbility.gold_cost} gold.`)
    }

    // Check if already learned
    const { data: existing } = await supabase
      .from('character_abilities')
      .select('*')
      .eq('character_id', characterId)
      .eq('ability_id', abilityId)
      .single()

    if (existing) {
      throw new Error('Ability already learned')
    }

    // Deduct gold
    const { error: goldError } = await supabase
      .from('characters')
      .update({ gold: character.gold - trainerAbility.gold_cost })
      .eq('id', characterId)

    if (goldError) throw goldError

    // Learn ability
    const { error: learnError } = await supabase
      .from('character_abilities')
      .insert({
        character_id: characterId,
        ability_id: abilityId
      })

    if (learnError) throw learnError

    return { success: true, error: null }
  } catch (error) {
    console.error('Learn from trainer error:', error)
    return { success: false, error }
  }
}

/**
 * ==========================================
 * TRANSMOGRIFICATION SYSTEM
 * ==========================================
 */

/**
 * Get transmog collection for a character
 */
export async function getTransmogCollection(characterId: string): Promise<{ data: TransmogCollectionWithItem[] | null; error: any }> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('transmog_collection')
      .select(`
        *,
        item:items(*)
      `)
      .eq('character_id', characterId)
      .order('unlocked_at', { ascending: false })

    if (error) throw error
    return { data: data as any, error: null }
  } catch (error) {
    console.error('Get transmog collection error:', error)
    return { data: null, error }
  }
}

/**
 * Get active transmogs for a character
 */
export async function getActiveTransmogs(characterId: string): Promise<{ data: Transmogrification[] | null; error: any }> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('transmogrifications')
      .select('*')
      .eq('character_id', characterId)

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Get active transmogs error:', error)
    return { data: null, error }
  }
}

/**
 * Unlock transmog appearance (costs gold based on rarity)
 */
export async function unlockTransmogAppearance(
  characterId: string,
  itemId: string
): Promise<{ success: boolean; error: any }> {
  try {
    const supabase = createClient()
    const { error } = await supabase.rpc('unlock_transmog_appearance', {
      char_id: characterId,
      item_to_unlock: itemId
    })

    if (error) throw error
    return { success: true, error: null }
  } catch (error) {
    console.error('Unlock transmog appearance error:', error)
    return { success: false, error }
  }
}

/**
 * Apply transmog to an equipment slot (costs 5 gold)
 */
export async function applyTransmog(
  characterId: string,
  slot: string,
  actualItemId: string,
  visualItemId: string
): Promise<{ success: boolean; error: any }> {
  try {
    const supabase = createClient()

    // Call RPC to validate and deduct gold
    const { error: rpcError } = await supabase.rpc('apply_transmog', {
      char_id: characterId,
      equip_slot: slot,
      visual_item: visualItemId
    })

    if (rpcError) throw rpcError

    // Upsert transmog
    const { error } = await supabase
      .from('transmogrifications')
      .upsert({
        character_id: characterId,
        slot,
        actual_item_id: actualItemId,
        visual_item_id: visualItemId
      })

    if (error) throw error
    return { success: true, error: null }
  } catch (error) {
    console.error('Apply transmog error:', error)
    return { success: false, error }
  }
}

/**
 * Remove transmog from a slot
 */
export async function removeTransmog(
  characterId: string,
  slot: string
): Promise<{ success: boolean; error: any }> {
  try {
    const supabase = createClient()
    const { error } = await supabase
      .from('transmogrifications')
      .delete()
      .eq('character_id', characterId)
      .eq('slot', slot)

    if (error) throw error
    return { success: true, error: null }
  } catch (error) {
    console.error('Remove transmog error:', error)
    return { success: false, error }
  }
}

// ============================================================================
// WEAPON PROFICIENCY SYSTEM
// ============================================================================

/**
 * Check if a character can equip a specific weapon based on class proficiency
 */
export async function canEquipWeapon(
  characterId: string,
  itemId: string
): Promise<{ canEquip: boolean; error: any; reason?: string }> {
  try {
    const supabase = createClient()

    // Get character's class
    const { data: character, error: charError } = await supabase
      .from('characters')
      .select('class_id')
      .eq('id', characterId)
      .single()

    if (charError) throw charError

    // If no class, allow all weapons (backward compatibility)
    if (!character.class_id) {
      return { canEquip: true, error: null }
    }

    // Get item's weapon type
    const { data: item, error: itemError } = await supabase
      .from('items')
      .select('weapon_type, equipment_slot, name')
      .eq('id', itemId)
      .single()

    if (itemError) throw itemError

    // If not a weapon, allow it
    if (!item.weapon_type || (item.equipment_slot !== 'weapon' && item.equipment_slot !== 'shield')) {
      return { canEquip: true, error: null }
    }

    // Get class proficiencies
    const { data: classData, error: classError } = await supabase
      .from('classes')
      .select('weapon_proficiency, name')
      .eq('id', character.class_id)
      .single()

    if (classError) throw classError

    // Check if weapon type is in proficiencies
    const canEquip = classData.weapon_proficiency.includes(item.weapon_type)

    if (!canEquip) {
      return {
        canEquip: false,
        error: null,
        reason: `${classData.name}s cannot equip ${item.weapon_type}s`
      }
    }

    return { canEquip: true, error: null }
  } catch (error) {
    console.error('Check weapon proficiency error:', error)
    return { canEquip: false, error }
  }
}

/**
 * Get all weapon types a character's class can use
 */
export async function getClassWeaponProficiencies(
  classId: string
): Promise<{ data: string[] | null; error: any }> {
  try {
    const supabase = createClient()

    const { data, error } = await supabase
      .from('classes')
      .select('weapon_proficiency')
      .eq('id', classId)
      .single()

    if (error) throw error

    return { data: data.weapon_proficiency, error: null }
  } catch (error) {
    console.error('Get weapon proficiencies error:', error)
    return { data: null, error }
  }
}
