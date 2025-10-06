import { createClient } from '@/utils/supabase/client'
import type {
  AllCharacterBonuses,
  ZoneSkillCheck,
  ZoneSkillRequirement,
  SkillSynergyBonus,
  CharacterPermanentBonus,
  CraftingBonuses,
  SynergyBonusDetails
} from './supabase'

/**
 * Cross-System Feedback Loops - Bonus System
 *
 * This module handles all bonus calculations and cross-system interactions:
 * - Skill requirements for zone access
 * - Combat skills unlocking gathering/crafting bonuses
 * - Exploration landmarks granting crafting bonuses
 * - Quest completion granting permanent merchant discounts
 */

// ============================================================================
// ZONE SKILL REQUIREMENTS
// ============================================================================

/**
 * Check if character meets all skill requirements for a zone
 */
export async function checkZoneSkillRequirements(
  characterId: string,
  zoneId: string
): Promise<{ data: ZoneSkillCheck | null; error: any }> {
  const supabase = createClient()

  const { data, error } = await supabase.rpc('check_zone_skill_requirements', {
    p_character_id: characterId,
    p_zone_id: zoneId
  })

  if (error) {
    console.error('Error checking zone skill requirements:', error)
    return { data: null, error }
  }

  return { data: data[0] || null, error: null }
}

/**
 * Get all skill requirements for a zone
 */
export async function getZoneSkillRequirements(
  zoneId: string
): Promise<{ data: ZoneSkillRequirement[] | null; error: any }> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('zone_skill_requirements')
    .select('*')
    .eq('zone_id', zoneId)
    .order('required_level', { ascending: true })

  if (error) {
    console.error('Error fetching zone skill requirements:', error)
    return { data: null, error }
  }

  return { data, error: null }
}

// ============================================================================
// SKILL SYNERGY BONUSES
// ============================================================================

/**
 * Get all active skill synergy bonuses for a character
 */
export async function getCharacterSynergyBonuses(
  characterId: string
): Promise<{ data: SynergyBonusDetails[] | null; error: any }> {
  const supabase = createClient()

  const { data, error } = await supabase.rpc('get_character_synergy_bonuses', {
    p_character_id: characterId
  })

  if (error) {
    console.error('Error fetching character synergy bonuses:', error)
    return { data: null, error }
  }

  return { data, error: null }
}

/**
 * Get gathering speed bonus for a specific gathering skill
 */
export async function getGatheringSpeedBonus(
  characterId: string,
  gatheringSkill: string
): Promise<{ data: number; error: any }> {
  const supabase = createClient()

  const { data, error } = await supabase.rpc('get_gathering_speed_bonus', {
    p_character_id: characterId,
    p_gathering_skill: gatheringSkill
  })

  if (error) {
    console.error('Error fetching gathering speed bonus:', error)
    return { data: 0, error }
  }

  return { data: data || 0, error: null }
}

/**
 * Get all available synergy bonuses (reference data)
 */
export async function getAllSynergyBonuses(): Promise<{ data: SkillSynergyBonus[] | null; error: any }> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('skill_synergy_bonuses')
    .select('*')
    .order('source_skill_type')
    .order('required_level')

  if (error) {
    console.error('Error fetching synergy bonuses:', error)
    return { data: null, error }
  }

  return { data, error: null }
}

// ============================================================================
// CRAFTING BONUSES FROM EXPLORATION
// ============================================================================

/**
 * Get total crafting bonuses from discovered landmarks
 */
export async function getCraftingBonuses(
  characterId: string
): Promise<{ data: CraftingBonuses | null; error: any }> {
  const supabase = createClient()

  const { data, error } = await supabase.rpc('get_character_crafting_bonuses', {
    p_character_id: characterId
  })

  if (error) {
    console.error('Error fetching crafting bonuses:', error)
    return { data: null, error }
  }

  return { data: data[0] || null, error: null }
}

/**
 * Apply crafting bonuses to recipe calculations
 */
export function applyCraftingBonuses(
  baseTime: number,
  baseCost: number,
  bonuses: CraftingBonuses
): { time: number; cost: number; quality: number } {
  // Apply speed bonus (reduces time)
  const time = Math.max(1000, Math.floor(baseTime * (1 - bonuses.speed_bonus)))

  // Apply cost reduction (reduces material cost)
  const cost = Math.max(1, Math.floor(baseCost * (1 - bonuses.cost_reduction)))

  // Quality bonus is returned as-is for use in quality rolls
  const quality = bonuses.quality_bonus

  return { time, cost, quality }
}

// ============================================================================
// PERMANENT BONUSES (Quest Rewards, etc.)
// ============================================================================

/**
 * Get total merchant discount for a character
 */
export async function getMerchantDiscount(
  characterId: string
): Promise<{ data: number; error: any }> {
  const supabase = createClient()

  const { data, error } = await supabase.rpc('get_character_merchant_discount', {
    p_character_id: characterId
  })

  if (error) {
    console.error('Error fetching merchant discount:', error)
    return { data: 0, error }
  }

  return { data: data || 0, error: null }
}

/**
 * Grant a permanent bonus to a character (called from quest completion, etc.)
 */
export async function grantPermanentBonus(
  characterId: string,
  bonusType: string,
  bonusValue: number,
  sourceType: string,
  sourceId: string,
  displayName: string,
  description?: string,
  expiresAt?: string
): Promise<{ data: string | null; error: any }> {
  const supabase = createClient()

  const { data, error } = await supabase.rpc('grant_permanent_bonus', {
    p_character_id: characterId,
    p_bonus_type: bonusType,
    p_bonus_value: bonusValue,
    p_source_type: sourceType,
    p_source_id: sourceId,
    p_display_name: displayName,
    p_description: description || null,
    p_expires_at: expiresAt || null
  })

  if (error) {
    console.error('Error granting permanent bonus:', error)
    return { data: null, error }
  }

  return { data, error: null }
}

/**
 * Get all active permanent bonuses for a character
 */
export async function getPermanentBonuses(
  characterId: string
): Promise<{ data: CharacterPermanentBonus[] | null; error: any }> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('character_permanent_bonuses')
    .select('*')
    .eq('character_id', characterId)
    .eq('is_active', true)
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
    .order('granted_at', { ascending: false })

  if (error) {
    console.error('Error fetching permanent bonuses:', error)
    return { data: null, error }
  }

  return { data, error: null }
}

// ============================================================================
// UNIFIED BONUS SYSTEM
// ============================================================================

/**
 * Get ALL active bonuses for a character in one call
 */
export async function getAllCharacterBonuses(
  characterId: string
): Promise<{ data: AllCharacterBonuses | null; error: any }> {
  const supabase = createClient()

  const { data, error } = await supabase.rpc('get_all_character_bonuses', {
    p_character_id: characterId
  })

  if (error) {
    console.error('Error fetching all character bonuses:', error)
    return { data: null, error }
  }

  return { data, error: null }
}

/**
 * Calculate final gathering time with all bonuses applied
 */
export function calculateGatheringTime(
  baseTime: number,
  skillLevel: number,
  speedBonus: number
): number {
  // Skill level efficiency: 0.5% faster per level (max 49.5% at level 99)
  const skillEfficiency = Math.min(0.495, skillLevel * 0.005)

  // Combine skill efficiency with synergy speed bonus
  const totalSpeedBonus = skillEfficiency + speedBonus

  // Apply bonus (capped at 75% reduction)
  const cappedBonus = Math.min(0.75, totalSpeedBonus)

  return Math.max(1000, Math.floor(baseTime * (1 - cappedBonus)))
}

/**
 * Calculate final merchant price with discount applied
 */
export function calculateMerchantPrice(
  basePrice: number,
  discount: number
): number {
  return Math.max(1, Math.floor(basePrice * (1 - discount)))
}

/**
 * Format bonus value for display (e.g., 0.05 → "+5%", 0.15 → "+15%")
 */
export function formatBonusPercent(value: number): string {
  return `+${(value * 100).toFixed(0)}%`
}

/**
 * Format bonus value for display with color
 */
export function getBonusColor(bonusType: string): string {
  switch (bonusType) {
    case 'speed':
      return 'text-green-400'
    case 'quality':
      return 'text-blue-400'
    case 'yield':
      return 'text-yellow-400'
    case 'merchant_discount':
      return 'text-emerald-400'
    case 'xp_bonus':
      return 'text-purple-400'
    default:
      return 'text-gray-400'
  }
}
