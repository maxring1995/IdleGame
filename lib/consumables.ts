import { createClient } from '@/utils/supabase/client'
import { Character, Item, InventoryItem } from './supabase'

// Consumable effect types
export type ConsumableEffectType =
  | 'restore_health'
  | 'restore_mana'
  | 'buff_attack'
  | 'buff_defense'
  | 'buff_experience'
  | 'buff_gold_find'
  | 'buff_luck'
  | 'buff_speed'

export interface ConsumableEffect {
  type: ConsumableEffectType
  value: number // Amount restored or buff percentage
  duration?: number // Duration in milliseconds (buffs only)
}

export interface ActiveBuff {
  id: string
  character_id: string
  item_id: string
  item_name: string
  item_icon: string
  effect_type: ConsumableEffectType
  effect_value: number
  started_at: string
  expires_at: string
  created_at: string
}

/**
 * Parse consumable effects from an item
 * Determines what effects a consumable has based on its properties
 */
export function parseConsumableEffects(item: Item): ConsumableEffect[] {
  const effects: ConsumableEffect[] = []

  // Instant restoration effects
  if (item.health_bonus > 0) {
    effects.push({
      type: 'restore_health',
      value: item.health_bonus
    })
  }

  if (item.mana_bonus > 0) {
    effects.push({
      type: 'restore_mana',
      value: item.mana_bonus
    })
  }

  // Buff effects (based on item description keywords)
  const description = item.description?.toLowerCase() || ''
  const duration = 5 * 60 * 1000 // 5 minutes default

  if (description.includes('strength') || description.includes('attack')) {
    effects.push({
      type: 'buff_attack',
      value: 20, // 20% attack increase
      duration
    })
  }

  if (description.includes('defense') || description.includes('resistance')) {
    effects.push({
      type: 'buff_defense',
      value: 20, // 20% defense increase
      duration
    })
  }

  if (description.includes('experience') || description.includes('xp')) {
    effects.push({
      type: 'buff_experience',
      value: 50, // 50% XP boost
      duration
    })
  }

  if (description.includes('gold') || description.includes('fortune')) {
    effects.push({
      type: 'buff_gold_find',
      value: 50, // 50% gold boost
      duration
    })
  }

  if (description.includes('luck') || description.includes('loot')) {
    effects.push({
      type: 'buff_luck',
      value: 25, // 25% better loot chance
      duration
    })
  }

  if (description.includes('speed')) {
    effects.push({
      type: 'buff_speed',
      value: 30, // 30% faster gathering/crafting
      duration
    })
  }

  return effects
}

/**
 * Use a consumable item
 * Applies instant effects (healing) and creates buff records
 */
export async function useConsumable(
  characterId: string,
  inventoryItemId: string
): Promise<{ success: boolean; error?: string; effects?: ConsumableEffect[] }> {
  const supabase = createClient()

  try {
    // Get inventory item with item details
    const { data: invItem, error: invError } = await supabase
      .from('inventory')
      .select('*, items(*)')
      .eq('id', inventoryItemId)
      .eq('character_id', characterId)
      .single()

    if (invError || !invItem) {
      return { success: false, error: 'Item not found in inventory' }
    }

    const item = invItem.items as unknown as Item

    // Verify it's a consumable
    if (item.type !== 'consumable') {
      return { success: false, error: 'This item is not consumable' }
    }

    // Parse effects
    const effects = parseConsumableEffects(item)

    if (effects.length === 0) {
      return { success: false, error: 'This consumable has no effects' }
    }

    // Get current character stats
    const { data: character, error: charError } = await supabase
      .from('characters')
      .select('*')
      .eq('id', characterId)
      .single()

    if (charError || !character) {
      return { success: false, error: 'Character not found' }
    }

    // Apply instant effects
    let healthRestored = 0
    let manaRestored = 0

    for (const effect of effects) {
      if (effect.type === 'restore_health') {
        const newHealth = Math.min(character.health + effect.value, character.max_health)
        healthRestored = newHealth - character.health
        character.health = newHealth
      } else if (effect.type === 'restore_mana') {
        const newMana = Math.min(character.mana + effect.value, character.max_mana)
        manaRestored = newMana - character.mana
        character.mana = newMana
      }
    }

    // Update character health/mana
    if (healthRestored > 0 || manaRestored > 0) {
      const { error: updateError } = await supabase
        .from('characters')
        .update({
          health: character.health,
          mana: character.mana,
          updated_at: new Date().toISOString()
        })
        .eq('id', characterId)

      if (updateError) {
        return { success: false, error: 'Failed to update character stats' }
      }
    }

    // Create buff records for timed effects
    for (const effect of effects) {
      if (effect.duration) {
        const now = new Date()
        const expiresAt = new Date(now.getTime() + effect.duration)

        const { error: buffError } = await supabase
          .from('active_buffs')
          .insert({
            character_id: characterId,
            item_id: item.id,
            item_name: item.name,
            item_icon: (item as any).icon || '✨',
            effect_type: effect.type,
            effect_value: effect.value,
            started_at: now.toISOString(),
            expires_at: expiresAt.toISOString()
          })

        if (buffError) {
          console.error('Failed to create buff:', buffError)
        }
      }
    }

    // Reduce item quantity
    if (invItem.quantity > 1) {
      const { error: updateError } = await supabase
        .from('inventory')
        .update({ quantity: invItem.quantity - 1 })
        .eq('id', inventoryItemId)

      if (updateError) {
        return { success: false, error: 'Failed to update inventory' }
      }
    } else {
      // Delete item if quantity is 1
      const { error: deleteError } = await supabase
        .from('inventory')
        .delete()
        .eq('id', inventoryItemId)

      if (deleteError) {
        return { success: false, error: 'Failed to remove item from inventory' }
      }
    }

    // Clean up expired buffs
    await cleanExpiredBuffs(characterId)

    return { success: true, effects }
  } catch (err) {
    console.error('Error using consumable:', err)
    return { success: false, error: 'An unexpected error occurred' }
  }
}

/**
 * Get active buffs for a character
 */
export async function getActiveBuffs(characterId: string): Promise<ActiveBuff[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('active_buffs')
    .select('*')
    .eq('character_id', characterId)
    .gt('expires_at', new Date().toISOString())
    .order('expires_at', { ascending: true })

  if (error) {
    console.error('Error fetching active buffs:', error)
    return []
  }

  return data as ActiveBuff[]
}

/**
 * Clean up expired buffs for a character
 */
export async function cleanExpiredBuffs(characterId: string): Promise<void> {
  const supabase = createClient()

  await supabase
    .from('active_buffs')
    .delete()
    .eq('character_id', characterId)
    .lt('expires_at', new Date().toISOString())
}

/**
 * Remove a specific buff (for manual cancellation)
 */
export async function removeBuff(buffId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient()

  const { error } = await supabase
    .from('active_buffs')
    .delete()
    .eq('id', buffId)

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true }
}

/**
 * Calculate total buff value for a specific effect type
 * Used for applying buffs to combat, gathering, etc.
 */
export async function getBuffBonus(
  characterId: string,
  effectType: ConsumableEffectType
): Promise<number> {
  const buffs = await getActiveBuffs(characterId)

  return buffs
    .filter(buff => buff.effect_type === effectType)
    .reduce((total, buff) => total + buff.effect_value, 0)
}

/**
 * Get human-readable effect description
 */
export function getEffectDescription(effect: ConsumableEffect): string {
  switch (effect.type) {
    case 'restore_health':
      return `Restores ${effect.value} HP`
    case 'restore_mana':
      return `Restores ${effect.value} MP`
    case 'buff_attack':
      return `+${effect.value}% Attack for ${formatDuration(effect.duration!)}`
    case 'buff_defense':
      return `+${effect.value}% Defense for ${formatDuration(effect.duration!)}`
    case 'buff_experience':
      return `+${effect.value}% XP Gain for ${formatDuration(effect.duration!)}`
    case 'buff_gold_find':
      return `+${effect.value}% Gold Find for ${formatDuration(effect.duration!)}`
    case 'buff_luck':
      return `+${effect.value}% Loot Chance for ${formatDuration(effect.duration!)}`
    case 'buff_speed':
      return `+${effect.value}% Speed for ${formatDuration(effect.duration!)}`
    default:
      return 'Unknown effect'
  }
}

/**
 * Format duration in human-readable format
 */
function formatDuration(ms: number): string {
  const minutes = Math.floor(ms / 60000)
  if (minutes < 60) {
    return `${minutes}m`
  }
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`
}

/**
 * Get remaining time for a buff in milliseconds
 */
export function getBuffTimeRemaining(buff: ActiveBuff): number {
  const now = new Date().getTime()
  const expires = new Date(buff.expires_at).getTime()
  return Math.max(0, expires - now)
}

/**
 * Format time remaining for display
 */
export function formatTimeRemaining(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  if (minutes > 60) {
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    return `${hours}:${remainingMinutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }

  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}
