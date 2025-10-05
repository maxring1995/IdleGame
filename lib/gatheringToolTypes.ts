/**
 * Gathering Tools Types and Helpers
 *
 * This file contains only types and helper functions for gathering tools.
 * No database operations - those are in lib/gatheringTools.ts
 * This can be safely imported by both client and server components.
 */

export type ToolSlot = 'axe_id' | 'pickaxe_id' | 'fishing_rod_id' | 'hunting_knife_id' | 'herbalism_sickle_id' | 'divination_staff_id'
export type ToolType = 'axe' | 'pickaxe' | 'fishing_rod' | 'hunting_knife' | 'herbalism_sickle' | 'divination_staff'

// Map skill types to tool types
export const SKILL_TO_TOOL_TYPE: Record<string, ToolType> = {
  'woodcutting': 'axe',
  'mining': 'pickaxe',
  'fishing': 'fishing_rod',
  'hunting': 'hunting_knife',
  'alchemy': 'herbalism_sickle',
  'magic': 'divination_staff'
}

export const TOOL_TYPE_TO_SLOT: Record<ToolType, ToolSlot> = {
  'axe': 'axe_id',
  'pickaxe': 'pickaxe_id',
  'fishing_rod': 'fishing_rod_id',
  'hunting_knife': 'hunting_knife_id',
  'herbalism_sickle': 'herbalism_sickle_id',
  'divination_staff': 'divination_staff_id'
}

export const TOOL_TYPE_LABELS: Record<ToolType, string> = {
  'axe': '🪓 Woodcutting',
  'pickaxe': '⛏️ Mining',
  'fishing_rod': '🎣 Fishing',
  'hunting_knife': '🏹 Hunting',
  'herbalism_sickle': '🧪 Alchemy',
  'divination_staff': '✨ Magic'
}

/**
 * Calculate repair cost based on tool tier
 */
export function getRepairCost(tier: number): number {
  const baseCosts = [50, 150, 400, 1000, 2500] // Bronze, Iron, Steel, Mithril, Dragon
  return baseCosts[tier - 1] || 50
}

/**
 * Check if tool is completely broken
 */
export function isToolBroken(durability: number): boolean {
  return durability <= 0
}

/**
 * Check if tool needs repair (durability <= 25%)
 */
export function needsRepair(durability: number): boolean {
  return durability <= 25 && durability > 0
}

/**
 * Calculate efficiency bonus from tool tier
 * Each tier provides a 10% speed bonus
 */
export function getToolEfficiencyBonus(tier: number): number {
  return 1 + (tier - 1) * 0.1
}

/**
 * Calculate durability loss per use based on tier
 * Higher tier tools lose durability slower
 */
export function getDurabilityLossPerUse(tier: number): number {
  const baseLoss = 1
  return Math.max(0.2, baseLoss / tier)
}