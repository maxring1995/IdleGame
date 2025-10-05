/**
 * Deep Gathering System - Node Management
 *
 * Handles node-based gathering including:
 * - Node spawning and discovery
 * - Node interaction (harvesting)
 * - Node depletion and respawn
 * - Quality tiers and health
 */

import { createClient } from '@/utils/supabase/client'
import type {
  GatheringNode,
  Material,
  GatheringTool,
  CharacterEquippedTools,
  GatheringEncounter,
  QualityTier
} from './supabase'
import { addSkillExperience } from './skills'
import { updateContractProgress } from './contracts'

// ============================================================================
// Node Discovery & Spawning
// ============================================================================

/**
 * Get all active nodes in a specific zone
 */
export async function getActiveNodesInZone(
  worldZone: string,
  supabaseClient?: any
): Promise<{ data: GatheringNode[] | null; error: Error | null }> {
  const supabase = supabaseClient || createClient()
  try {
    const { data, error } = await supabase
      .from('gathering_nodes')
      .select('*')
      .eq('world_zone', worldZone)
      .eq('is_active', true)
      .order('spawn_position->x')

    if (error) throw error
    return { data: data as GatheringNode[], error: null }
  } catch (err) {
    console.error('Error fetching active nodes:', err)
    return { data: null, error: err as Error }
  }
}

/**
 * Get node with material details
 */
export async function getNodeWithMaterial(
  nodeId: string,
  supabaseClient?: any
): Promise<{ data: (GatheringNode & { material: Material }) | null; error: Error | null }> {
  const supabase = supabaseClient || createClient()
  try {
    const { data, error } = await supabase
      .from('gathering_nodes')
      .select(`
        *,
        material:materials(*)
      `)
      .eq('id', nodeId)
      .single()

    if (error) throw error
    return { data: data as any, error: null }
  } catch (err) {
    console.error('Error fetching node with material:', err)
    return { data: null, error: err as Error }
  }
}

/**
 * Spawn new nodes in a zone (admin/system function)
 * Creates nodes with random positions and quality tiers
 */
export async function spawnNodesInZone(
  worldZone: string,
  materialId: string,
  count: number = 5
): Promise<{ data: GatheringNode[] | null; error: Error | null }> {
  const supabase = createClient()
  try {
    // Get material info for node type
    const { data: material } = await supabase
      .from('materials')
      .select('required_skill_type')
      .eq('id', materialId)
      .single()

    if (!material) throw new Error('Material not found')

    // Map skill type to node type
    const nodeTypeMap: Record<string, string> = {
      'woodcutting': 'tree',
      'mining': 'ore_vein',
      'fishing': 'fishing_spot',
      'hunting': 'hunting_ground',
      'alchemy': 'herb_patch',
      'magic': 'ley_line'
    }

    const nodeType = nodeTypeMap[material.required_skill_type] || 'tree'

    // Generate random nodes
    const nodes = Array.from({ length: count }, (_, i) => ({
      node_type: nodeType,
      material_id: materialId,
      world_zone: worldZone,
      quality_tier: rollQualityTier(),
      max_health: rollNodeHealth(),
      current_health: 0, // Will be set to max_health via database default
      is_active: true,
      spawn_position: {
        x: Math.floor(Math.random() * 1000),
        y: Math.floor(Math.random() * 1000)
      },
      respawn_variance: 0.2,
      required_zone_level: 1,
      respawn_time_ms: 60000 + Math.floor(Math.random() * 30000) // 60-90 seconds
    }))

    const { data, error } = await supabase
      .from('gathering_nodes')
      .insert(nodes)
      .select()

    if (error) throw error

    // Set current_health = max_health for new nodes
    const nodeIds = data.map((n: any) => n.id)
    await supabase
      .from('gathering_nodes')
      .update({ current_health: supabase.raw('max_health') } as any)
      .in('id', nodeIds)

    return { data: data as GatheringNode[], error: null }
  } catch (err) {
    console.error('Error spawning nodes:', err)
    return { data: null, error: err as Error }
  }
}

/**
 * Roll quality tier for a new node
 * - 70% Standard
 * - 20% Poor
 * - 10% Rich
 */
function rollQualityTier(): QualityTier {
  const roll = Math.random()
  if (roll < 0.10) return 'rich'
  if (roll < 0.30) return 'poor'
  return 'standard'
}

/**
 * Roll node health (how many times it can be harvested)
 */
function rollNodeHealth(): number {
  const roll = Math.random()
  if (roll < 0.05) return 5 // 5% chance for 5 health
  if (roll < 0.20) return 4 // 15% chance for 4 health
  return 3 // 80% chance for 3 health
}

// ============================================================================
// Node Interaction & Harvesting
// ============================================================================

/**
 * Calculate gathering yield based on node quality, tools, and bonuses
 */
function calculateGatherYield(
  baseYield: number,
  qualityTier: QualityTier,
  tool?: GatheringTool,
  specialization?: any
): { baseAmount: number; bonusAmount: number } {
  let amount = baseYield

  // Quality tier modifiers
  if (qualityTier === 'rich') amount = Math.floor(amount * 1.5)
  if (qualityTier === 'poor') amount = Math.max(1, Math.floor(amount * 0.7))

  // Tool bonus yield chance
  let bonusAmount = 0
  if (tool && Math.random() < tool.bonus_yield_chance) {
    bonusAmount = tool.bonus_yield_amount
  }

  // Specialization bonuses
  if (specialization?.bonuses?.yield_multiplier) {
    amount = Math.floor(amount * specialization.bonuses.yield_multiplier)
  }

  if (specialization?.bonuses?.double_drop_chance) {
    if (Math.random() < specialization.bonuses.double_drop_chance) {
      bonusAmount += amount
    }
  }

  return { baseAmount: amount, bonusAmount }
}

/**
 * Calculate gathering time based on tool and skill level
 */
function calculateGatherTime(
  baseTimeMs: number,
  gatheringPower: number = 1.0,
  skillLevel: number = 1
): number {
  // Tool power reduces time
  let time = baseTimeMs / gatheringPower

  // Skill level gives small bonus (0.5% per level, max 49.5% at level 99)
  const skillBonus = 1 - (skillLevel * 0.005)
  time *= Math.max(skillBonus, 0.505)

  return Math.max(Math.floor(time), 500) // Minimum 500ms
}

/**
 * Get character's equipped tool for a skill type
 */
export async function getEquippedToolForSkill(
  characterId: string,
  skillType: string,
  supabaseClient?: any
): Promise<{ data: (GatheringTool & { durability: number }) | null; error: Error | null }> {
  const supabase = supabaseClient || createClient()
  try {
    const { data: equipped, error: equippedError } = await supabase
      .from('character_equipped_tools')
      .select('*')
      .eq('character_id', characterId)
      .maybeSingle()

    if (equippedError) throw equippedError
    if (!equipped) return { data: null, error: null }

    // Map skill type to tool slot
    const toolSlotMap: Record<string, { idKey: string; durabilityKey: string }> = {
      'woodcutting': { idKey: 'axe_id', durabilityKey: 'axe_durability' },
      'mining': { idKey: 'pickaxe_id', durabilityKey: 'pickaxe_durability' },
      'fishing': { idKey: 'fishing_rod_id', durabilityKey: 'fishing_rod_durability' },
      'hunting': { idKey: 'hunting_knife_id', durabilityKey: 'hunting_knife_durability' },
      'alchemy': { idKey: 'herbalism_sickle_id', durabilityKey: 'herbalism_sickle_durability' },
      'magic': { idKey: 'divination_staff_id', durabilityKey: 'divination_staff_durability' }
    }

    const slot = toolSlotMap[skillType]
    if (!slot) return { data: null, error: null }

    const toolId = (equipped as any)[slot.idKey]
    const durability = (equipped as any)[slot.durabilityKey]

    if (!toolId) return { data: null, error: null }

    // Get tool details
    const { data: tool, error: toolError } = await supabase
      .from('gathering_tools')
      .select('*')
      .eq('id', toolId)
      .single()

    if (toolError) throw toolError

    return {
      data: { ...tool, durability } as GatheringTool & { durability: number },
      error: null
    }
  } catch (err) {
    console.error('Error getting equipped tool:', err)
    return { data: null, error: err as Error }
  }
}

/**
 * Harvest from a gathering node
 * Returns materials gathered and updates node health
 */
export async function harvestNode(
  characterId: string,
  nodeId: string,
  supabaseClient?: any
): Promise<{
  data: {
    materialsGained: number
    bonusMaterials: number
    xpGained: number
    nodeDepleted: boolean
    encounter?: GatheringEncounter
  } | null
  error: Error | null
}> {
  const supabase = supabaseClient || createClient()
  try {
    // Get node with material details
    const { data: nodeData, error: nodeError } = await getNodeWithMaterial(nodeId, supabase)
    if (nodeError || !nodeData) throw new Error('Node not found')

    const node = nodeData
    const material = nodeData.material

    // Check if node is active
    if (!node.is_active || node.current_health <= 0) {
      throw new Error('This node has been depleted')
    }

    // Get character skill level
    const { data: skill } = await supabase
      .from('character_skills')
      .select('level, specialization_id')
      .eq('character_id', characterId)
      .eq('skill_type', material.required_skill_type)
      .maybeSingle()

    const skillLevel = skill?.level || 1

    // Check skill requirements
    if (skillLevel < material.required_skill_level) {
      throw new Error(`Requires ${material.required_skill_type} level ${material.required_skill_level}`)
    }

    // Get equipped tool
    const { data: tool } = await getEquippedToolForSkill(characterId, material.required_skill_type, supabase)

    // Get specialization
    let specialization = null
    if (skill?.specialization_id) {
      const { data: spec } = await supabase
        .from('gathering_specializations')
        .select('*')
        .eq('id', skill.specialization_id)
        .single()
      specialization = spec
    }

    // Calculate yield
    const { baseAmount, bonusAmount } = calculateGatherYield(
      1, // Base 1 material per gather
      node.quality_tier,
      tool || undefined,
      specialization
    )

    const totalMaterials = baseAmount + bonusAmount

    // Add materials to inventory
    const { data: existingItem } = await supabase
      .from('inventory')
      .select('*')
      .eq('character_id', characterId)
      .eq('item_id', material.id)
      .maybeSingle()

    if (existingItem) {
      await supabase
        .from('inventory')
        .update({ quantity: existingItem.quantity + totalMaterials })
        .eq('id', existingItem.id)
    } else {
      await supabase
        .from('inventory')
        .insert({
          character_id: characterId,
          item_id: material.id,
          quantity: totalMaterials,
          equipped: false,
          enchantment_level: 0,
          durability: 100
        })
    }

    // Reduce node health
    const newHealth = node.current_health - 1
    const nodeDepleted = newHealth <= 0

    console.log('[harvestNode] Reducing node health:', {
      nodeId,
      oldHealth: node.current_health,
      newHealth,
      nodeDepleted
    })

    const { error: updateError } = await supabase
      .from('gathering_nodes')
      .update({
        current_health: newHealth,
        last_harvested_at: new Date().toISOString(),
        last_harvested_by: characterId,
        is_active: !nodeDepleted
      })
      .eq('id', nodeId)

    if (updateError) {
      console.error('[harvestNode] Failed to update node health:', updateError)
      throw updateError
    }

    // Add XP
    const xpMultiplier = node.quality_tier === 'rich' ? 1.5 : node.quality_tier === 'poor' ? 0.75 : 1.0
    const xpGained = Math.floor(material.experience_reward * xpMultiplier)

    console.log('[harvestNode] Adding XP:', {
      skillType: material.required_skill_type,
      xpGained,
      xpMultiplier
    })

    const { error: xpError, leveledUp, newLevel } = await addSkillExperience(
      characterId,
      material.required_skill_type,
      xpGained,
      1.0, // class bonus
      supabase
    )

    if (xpError) {
      console.error('[harvestNode] Failed to add XP:', xpError)
    } else if (leveledUp) {
      console.log(`[harvestNode] Level up! New ${material.required_skill_type} level: ${newLevel}`)
    }

    // Update gathering statistics
    await updateGatheringStats(characterId, material.type, totalMaterials)

    // Update contract progress
    await updateContractProgress(characterId, material.id, totalMaterials)

    // Check for random encounter (5% chance)
    let encounter: GatheringEncounter | undefined
    if (Math.random() < 0.05) {
      const { data: enc } = await rollGatheringEncounter(
        characterId,
        material.id,
        node.world_zone
      )
      if (enc) encounter = enc
    }

    // Reduce tool durability
    if (tool && tool.durability > 0) {
      await reduceToolDurability(characterId, material.required_skill_type, 1)
    }

    return {
      data: {
        materialsGained: baseAmount,
        bonusMaterials: bonusAmount,
        xpGained,
        nodeDepleted,
        encounter
      },
      error: null
    }
  } catch (err) {
    console.error('Error harvesting node:', err)
    return { data: null, error: err as Error }
  }
}

// ============================================================================
// Node Respawn System
// ============================================================================

/**
 * Process node respawns (background job / cron)
 * Checks for depleted nodes and respawns them after respawn_time_ms
 */
export async function processNodeRespawns(): Promise<{ data: number; error: Error | null }> {
  const supabase = createClient()
  try {
    // Find nodes that are inactive and past their respawn time
    const { data: nodes, error } = await supabase
      .from('gathering_nodes')
      .select('*')
      .eq('is_active', false)
      .not('last_harvested_at', 'is', null)

    if (error) throw error
    if (!nodes || nodes.length === 0) return { data: 0, error: null }

    const now = new Date()
    const nodesToRespawn = []

    for (const node of nodes) {
      if (!node.last_harvested_at) continue

      const harvestedAt = new Date(node.last_harvested_at)
      const respawnTime = node.respawn_time_ms
      const variance = respawnTime * node.respawn_variance
      const actualRespawnTime = respawnTime + (Math.random() * variance * 2 - variance)

      const respawnAt = new Date(harvestedAt.getTime() + actualRespawnTime)

      if (now >= respawnAt) {
        nodesToRespawn.push(node.id)
      }
    }

    if (nodesToRespawn.length === 0) return { data: 0, error: null }

    // Respawn nodes
    const { error: updateError } = await supabase
      .from('gathering_nodes')
      .update({
        is_active: true,
        current_health: supabase.raw('max_health') as any,
        quality_tier: rollQualityTier() // Re-roll quality on respawn
      })
      .in('id', nodesToRespawn)

    if (updateError) throw updateError

    return { data: nodesToRespawn.length, error: null }
  } catch (err) {
    console.error('Error processing node respawns:', err)
    return { data: 0, error: err as Error }
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Update character's gathering statistics
 */
async function updateGatheringStats(
  characterId: string,
  materialType: string,
  amount: number
): Promise<void> {
  const supabase = createClient()

  const statMap: Record<string, string> = {
    'wood': 'total_wood_gathered',
    'ore': 'total_ore_gathered',
    'fish': 'total_fish_gathered',
    'meat': 'total_meat_gathered',
    'herb': 'total_herbs_gathered',
    'essence': 'total_essence_gathered',
    'gem': 'total_gems_found'
  }

  const column = statMap[materialType]
  if (!column) return

  // Upsert statistics
  const { data: existing } = await supabase
    .from('gathering_statistics')
    .select('*')
    .eq('character_id', characterId)
    .maybeSingle()

  if (existing) {
    await supabase
      .from('gathering_statistics')
      .update({
        [column]: (existing as any)[column] + amount,
        total_nodes_depleted: existing.total_nodes_depleted + 1
      })
      .eq('character_id', characterId)
  } else {
    await supabase
      .from('gathering_statistics')
      .insert({
        character_id: characterId,
        [column]: amount,
        total_nodes_depleted: 1
      })
  }
}

/**
 * Roll for a random gathering encounter
 */
async function rollGatheringEncounter(
  characterId: string,
  materialId: string,
  worldZone: string
): Promise<{ data: GatheringEncounter | null; error: Error | null }> {
  const supabase = createClient()
  try {
    const roll = Math.random()
    let encounterType: string
    let encounterData: any = {}

    if (roll < 0.40) {
      // Treasure (40%)
      encounterType = 'treasure'
      encounterData = {
        gold: Math.floor(Math.random() * 500) + 100,
        message: 'You discovered a hidden cache while gathering!'
      }
    } else if (roll < 0.60) {
      // Rare spawn (20%)
      encounterType = 'rare_spawn'
      encounterData = {
        message: 'A rare resource node appeared nearby!'
      }
    } else if (roll < 0.75) {
      // Monster (15%)
      encounterType = 'monster'
      encounterData = {
        message: 'A wild creature appears!',
        enemyLevel: Math.floor(Math.random() * 5) + 1
      }
    } else if (roll < 0.90) {
      // Wanderer (15%)
      encounterType = 'wanderer'
      encounterData = {
        message: 'A mysterious traveler approaches...'
      }
    } else {
      // Rune discovery (10%)
      encounterType = 'rune_discovery'
      encounterData = {
        message: 'You uncovered an ancient rune inscription!'
      }
    }

    const { data, error } = await supabase
      .from('gathering_encounters')
      .insert({
        character_id: characterId,
        encounter_type: encounterType,
        encounter_data: encounterData,
        material_id: materialId,
        world_zone: worldZone,
        resolved: false
      })
      .select()
      .single()

    if (error) throw error
    return { data: data as GatheringEncounter, error: null }
  } catch (err) {
    console.error('Error rolling gathering encounter:', err)
    return { data: null, error: err as Error }
  }
}

/**
 * Reduce tool durability
 */
async function reduceToolDurability(
  characterId: string,
  skillType: string,
  amount: number = 1
): Promise<void> {
  const supabase = createClient()

  const durabilityMap: Record<string, string> = {
    'woodcutting': 'axe_durability',
    'mining': 'pickaxe_durability',
    'fishing': 'fishing_rod_durability',
    'hunting': 'hunting_knife_durability',
    'alchemy': 'herbalism_sickle_durability',
    'magic': 'divination_staff_durability'
  }

  const column = durabilityMap[skillType]
  if (!column) return

  const { data: equipped } = await supabase
    .from('character_equipped_tools')
    .select('*')
    .eq('character_id', characterId)
    .maybeSingle()

  if (!equipped) return

  const currentDurability = (equipped as any)[column] || 0
  const newDurability = Math.max(0, currentDurability - amount)

  await supabase
    .from('character_equipped_tools')
    .update({ [column]: newDurability })
    .eq('character_id', characterId)
}
