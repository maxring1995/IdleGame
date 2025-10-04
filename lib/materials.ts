/**
 * Materials Management
 *
 * Handles all material-related database operations for the gathering system.
 */

import { createClient } from '@/utils/supabase/client'
import { Material, MaterialWithDetails, GatheringSkillType, CharacterSkill } from './supabase'

/**
 * Get all materials
 */
export async function getAllMaterials() {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('materials')
    .select('*')
    .order('tier', { ascending: true })
    .order('required_skill_level', { ascending: true })

  return { data: data as Material[] | null, error }
}

/**
 * Get materials by skill type
 */
export async function getMaterialsBySkill(skillType: GatheringSkillType) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('materials')
    .select('*')
    .eq('required_skill_type', skillType)
    .order('required_skill_level', { ascending: true })

  return { data: data as Material[] | null, error }
}

/**
 * Get materials with character's skill level and availability info
 */
export async function getMaterialsWithDetails(
  characterId: string,
  skillType: GatheringSkillType
): Promise<{ data: MaterialWithDetails[] | null; error: any }> {
  const supabase = createClient()

  // Get character's level and skill level
  const { data: character, error: charError } = await supabase
    .from('characters')
    .select('level')
    .eq('id', characterId)
    .single()

  if (charError) return { data: null, error: charError }

  const { data: skill, error: skillError } = await supabase
    .from('character_skills')
    .select('level')
    .eq('character_id', characterId)
    .eq('skill_type', skillType)
    .single()

  const playerSkillLevel = skill?.level || 1

  // Get materials for this skill
  const { data: materials, error: matError } = await getMaterialsBySkill(skillType)

  if (matError || !materials) return { data: null, error: matError }

  // Get gathering nodes
  const { data: nodes, error: nodesError } = await supabase
    .from('gathering_nodes')
    .select('*')
    .in('material_id', materials.map(m => m.id))

  if (nodesError) return { data: null, error: nodesError }

  // Map materials with details
  const materialsWithDetails: MaterialWithDetails[] = materials.map(material => {
    const node = nodes?.find(n => n.material_id === material.id)
    const canGather = playerSkillLevel >= material.required_skill_level &&
                      character.level >= material.required_zone_level

    let lockReason: string | undefined
    let isLocked = false

    if (playerSkillLevel < material.required_skill_level) {
      isLocked = true
      lockReason = `Requires ${skillType} level ${material.required_skill_level}`
    } else if (character.level < material.required_zone_level) {
      isLocked = true
      lockReason = `Requires character level ${material.required_zone_level}`
    }

    return {
      ...material,
      node,
      playerSkillLevel,
      canGather,
      isLocked,
      lockReason
    }
  })

  return { data: materialsWithDetails, error: null }
}

/**
 * Get material by ID
 */
export async function getMaterialById(materialId: string) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('materials')
    .select('*')
    .eq('id', materialId)
    .single()

  return { data: data as Material | null, error }
}

/**
 * Get materials by tier
 */
export async function getMaterialsByTier(tier: number) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('materials')
    .select('*')
    .eq('tier', tier)
    .order('required_skill_level', { ascending: true })

  return { data: data as Material[] | null, error }
}

/**
 * Get character's material inventory (from inventory table)
 * Materials are stored as regular inventory items
 */
export async function getCharacterMaterials(characterId: string) {
  const supabase = createClient()

  // Get inventory items that reference materials
  const { data: inventoryItems, error: invError } = await supabase
    .from('inventory')
    .select(`
      *,
      items:item_id (
        id,
        name,
        type,
        rarity
      )
    `)
    .eq('character_id', characterId)

  if (invError) return { data: null, error: invError }

  // Filter only material-type items
  // Note: Materials will be added to inventory when gathered
  const materialItems = inventoryItems?.filter(item => {
    const itemData = item.items as any
    return itemData && itemData.type === 'material'
  })

  return { data: materialItems, error: null }
}

/**
 * Add material to character's inventory
 */
export async function addMaterialToInventory(
  characterId: string,
  materialId: string,
  quantity: number
) {
  const supabase = createClient()

  // Check if material already exists in inventory
  const { data: existingItem, error: checkError } = await supabase
    .from('inventory')
    .select('*')
    .eq('character_id', characterId)
    .eq('item_id', materialId)
    .single()

  if (checkError && checkError.code !== 'PGRST116') {
    // PGRST116 = not found, which is fine
    return { data: null, error: checkError }
  }

  if (existingItem) {
    // Update quantity
    const { data, error } = await supabase
      .from('inventory')
      .update({ quantity: existingItem.quantity + quantity })
      .eq('id', existingItem.id)
      .select()
      .single()

    return { data, error }
  } else {
    // Create new inventory entry
    const { data, error } = await supabase
      .from('inventory')
      .insert({
        character_id: characterId,
        item_id: materialId,
        quantity: quantity,
        equipped: false,
        enchantment_level: 0,
        durability: 100
      })
      .select()
      .single()

    return { data, error }
  }
}

/**
 * Get or create character skill
 */
export async function getOrCreateSkill(
  characterId: string,
  skillType: string
): Promise<{ data: CharacterSkill | null; error: any }> {
  const supabase = createClient()

  // Try to get existing skill
  const { data: existingSkill, error: getError } = await supabase
    .from('character_skills')
    .select('*')
    .eq('character_id', characterId)
    .eq('skill_type', skillType)
    .single()

  // If skill exists, return it
  if (existingSkill) {
    return { data: existingSkill as CharacterSkill, error: null }
  }

  // If error is something other than "not found", return the error
  if (getError && getError.code !== 'PGRST116') {
    return { data: null, error: getError }
  }

  // Create new skill if it doesn't exist
  const { data: newSkill, error: createError } = await supabase
    .from('character_skills')
    .insert({
      character_id: characterId,
      skill_type: skillType,
      level: 1,
      experience: 0
    })
    .select()
    .single()

  return { data: newSkill as CharacterSkill | null, error: createError }
}

/**
 * Add experience to a gathering skill and level up if needed
 */
export async function addSkillExperience(
  characterId: string,
  skillType: string,
  experienceGained: number
): Promise<{ data: CharacterSkill | null; error: any; leveledUp: boolean; newLevel?: number }> {
  const supabase = createClient()

  // Get or create the skill
  const { data: skill, error: skillError } = await getOrCreateSkill(characterId, skillType)

  if (skillError || !skill) {
    return { data: null, error: skillError, leveledUp: false }
  }

  const newExperience = skill.experience + experienceGained
  let newLevel = skill.level
  let leveledUp = false

  // Calculate new level (experience formula: level * 100)
  // Similar to combat level, but for skills
  while (newExperience >= newLevel * 100 && newLevel < 99) {
    newLevel++
    leveledUp = true
  }

  // Update skill
  const { data: updatedSkill, error: updateError } = await supabase
    .from('character_skills')
    .update({
      level: newLevel,
      experience: newExperience
    })
    .eq('character_id', characterId)
    .eq('skill_type', skillType)
    .select()
    .single()

  return {
    data: updatedSkill as CharacterSkill | null,
    error: updateError,
    leveledUp,
    newLevel: leveledUp ? newLevel : undefined
  }
}

/**
 * Get materials for a specific zone
 */
export async function getMaterialsByZone(
  zoneId: string,
  skillType: GatheringSkillType
) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('materials')
    .select('*')
    .eq('zone_id', zoneId)
    .eq('required_skill_type', skillType)
    .order('required_skill_level', { ascending: true })

  return { data: data as Material[] | null, error }
}

/**
 * Get all zones with material counts for a skill type
 */
export async function getZonesWithMaterials(
  skillType: GatheringSkillType,
  playerLevel: number
) {
  const supabase = createClient()

  // Get all zones player can access
  const { data: zones, error: zonesError } = await supabase
    .from('world_zones')
    .select('*')
    .lte('required_level', playerLevel)
    .order('required_level', { ascending: true })

  if (zonesError) return { data: null, error: zonesError }

  // Get material counts per zone
  const zonesWithCounts = await Promise.all(
    (zones || []).map(async (zone) => {
      const { data: materials } = await supabase
        .from('materials')
        .select('id')
        .eq('zone_id', zone.id)
        .eq('required_skill_type', skillType)

      return {
        ...zone,
        materialCount: materials?.length || 0
      }
    })
  )

  return { data: zonesWithCounts, error: null }
}
