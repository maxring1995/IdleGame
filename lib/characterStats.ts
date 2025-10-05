import { Character, Item, InventoryItem } from './supabase'

/**
 * Breakdown of a single stat showing all sources
 */
export interface StatBreakdown {
  base: number
  equipment: number
  buffs: number
  total: number
}

/**
 * Complete breakdown of all character stats
 */
export interface CharacterStatsBreakdown {
  attack: StatBreakdown
  defense: StatBreakdown
  health: StatBreakdown
  max_health: StatBreakdown
  mana: StatBreakdown
  max_mana: StatBreakdown
}

/**
 * Equipment contribution by slot
 */
export interface EquipmentContribution {
  slot: string
  itemName: string
  rarity: string
  stats: {
    attack: number
    defense: number
    health: number
    mana: number
  }
}

/**
 * Active buff effect
 */
export interface ActiveBuff {
  id: string
  effect_type: string
  effect_value: number
  item_name: string
  expires_at: string
}

/**
 * Calculate complete stat breakdown for a character
 */
export function calculateStatBreakdown(
  character: Character,
  equippedItems: Array<InventoryItem & { item: Item }>,
  activeBuffs: ActiveBuff[]
): CharacterStatsBreakdown {
  // Base stats from character
  const baseStats = {
    attack: character.attack,
    defense: character.defense,
    health: character.health,
    max_health: character.max_health,
    mana: character.mana,
    max_mana: character.max_mana,
  }

  // Calculate equipment bonuses
  const equipmentBonuses = {
    attack: 0,
    defense: 0,
    health: 0,
    max_health: 0,
    mana: 0,
    max_mana: 0,
  }

  equippedItems.forEach((invItem) => {
    const item = invItem.item
    equipmentBonuses.attack += item.attack_bonus || 0
    equipmentBonuses.defense += item.defense_bonus || 0
    equipmentBonuses.max_health += item.health_bonus || 0
    equipmentBonuses.max_mana += item.mana_bonus || 0
  })

  // Calculate buff bonuses (percentage-based)
  const buffBonuses = {
    attack: 0,
    defense: 0,
    health: 0,
    max_health: 0,
    mana: 0,
    max_mana: 0,
  }

  activeBuffs.forEach((buff) => {
    const multiplier = buff.effect_value / 100
    switch (buff.effect_type) {
      case 'buff_attack':
        buffBonuses.attack += baseStats.attack * multiplier
        break
      case 'buff_defense':
        buffBonuses.defense += baseStats.defense * multiplier
        break
      // Add more buff types as needed
    }
  })

  // Combine all sources
  return {
    attack: {
      base: baseStats.attack,
      equipment: equipmentBonuses.attack,
      buffs: Math.floor(buffBonuses.attack),
      total: baseStats.attack + equipmentBonuses.attack + Math.floor(buffBonuses.attack),
    },
    defense: {
      base: baseStats.defense,
      equipment: equipmentBonuses.defense,
      buffs: Math.floor(buffBonuses.defense),
      total: baseStats.defense + equipmentBonuses.defense + Math.floor(buffBonuses.defense),
    },
    health: {
      base: baseStats.health,
      equipment: 0,
      buffs: 0,
      total: baseStats.health,
    },
    max_health: {
      base: baseStats.max_health,
      equipment: equipmentBonuses.max_health,
      buffs: Math.floor(buffBonuses.max_health),
      total: baseStats.max_health + equipmentBonuses.max_health + Math.floor(buffBonuses.max_health),
    },
    mana: {
      base: baseStats.mana,
      equipment: 0,
      buffs: 0,
      total: baseStats.mana,
    },
    max_mana: {
      base: baseStats.max_mana,
      equipment: equipmentBonuses.max_mana,
      buffs: Math.floor(buffBonuses.max_mana),
      total: baseStats.max_mana + equipmentBonuses.max_mana + Math.floor(buffBonuses.max_mana),
    },
  }
}

/**
 * Format a stat with its sources for display
 */
export function formatStatWithSources(
  statName: string,
  breakdown: StatBreakdown
): string {
  const parts: string[] = []

  parts.push(`Base: ${breakdown.base}`)

  if (breakdown.equipment > 0) {
    parts.push(`Equipment: +${breakdown.equipment}`)
  }

  if (breakdown.buffs > 0) {
    parts.push(`Buffs: +${breakdown.buffs}`)
  }

  return parts.join(' | ')
}

/**
 * Get equipment contribution breakdown by slot
 */
export function getEquipmentContribution(
  equippedItems: Array<InventoryItem & { item: Item }>
): EquipmentContribution[] {
  return equippedItems.map((invItem) => {
    const item = invItem.item
    return {
      slot: item.equipment_slot || 'unknown',
      itemName: item.name,
      rarity: item.rarity,
      stats: {
        attack: item.attack_bonus || 0,
        defense: item.defense_bonus || 0,
        health: item.health_bonus || 0,
        mana: item.mana_bonus || 0,
      },
    }
  })
}

/**
 * Calculate total equipment stats
 */
export function getTotalEquipmentStats(
  equippedItems: Array<InventoryItem & { item: Item }>
): { attack: number; defense: number; health: number; mana: number } {
  return equippedItems.reduce(
    (totals, invItem) => {
      const item = invItem.item
      return {
        attack: totals.attack + (item.attack_bonus || 0),
        defense: totals.defense + (item.defense_bonus || 0),
        health: totals.health + (item.health_bonus || 0),
        mana: totals.mana + (item.mana_bonus || 0),
      }
    },
    { attack: 0, defense: 0, health: 0, mana: 0 }
  )
}

/**
 * Format time duration (e.g., "2h 30m", "5d 12h")
 */
export function formatDuration(startDate: string): string {
  const start = new Date(startDate).getTime()
  const now = Date.now()
  const diff = now - start

  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

  if (days > 0) {
    return `${days}d ${hours}h`
  } else if (hours > 0) {
    return `${hours}h ${minutes}m`
  } else {
    return `${minutes}m`
  }
}
