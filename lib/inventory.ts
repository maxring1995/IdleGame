import { createClient } from '@/utils/supabase/client'
import { InventoryItem, Item } from './supabase'

/**
 * Get all inventory items for a character with item details
 */
export async function getInventory(characterId: string) {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('inventory')
      .select(`
        *,
        item:items(*)
      `)
      .eq('character_id', characterId)
      .order('slot', { ascending: true, nullsFirst: false })

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Get inventory error:', error)
    return { data: null, error }
  }
}

/**
 * Get equipped items for a character
 */
export async function getEquippedItems(characterId: string) {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('inventory')
      .select(`
        *,
        item:items(*)
      `)
      .eq('character_id', characterId)
      .eq('equipped', true)

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Get equipped items error:', error)
    return { data: null, error }
  }
}

/**
 * Add an item to inventory
 */
export async function addItem(characterId: string, itemId: string, quantity: number = 1) {
  try {
    const supabase = createClient()
    // Check if item exists and is stackable
    const { data: itemDef } = await supabase
      .from('items')
      .select('*')
      .eq('id', itemId)
      .single()

    if (!itemDef) {
      throw new Error('Item not found')
    }

    // Check if item already exists in inventory
    const { data: existingItem } = await supabase
      .from('inventory')
      .select('*')
      .eq('character_id', characterId)
      .eq('item_id', itemId)
      .single()

    if (existingItem && itemDef.stackable) {
      // Update quantity
      const newQuantity = Math.min(
        existingItem.quantity + quantity,
        itemDef.max_stack
      )

      const { data, error } = await supabase
        .from('inventory')
        .update({ quantity: newQuantity })
        .eq('id', existingItem.id)
        .select()
        .single()

      if (error) throw error
      return { data, error: null }
    } else {
      // Find next available slot
      const { data: usedSlots } = await supabase
        .from('inventory')
        .select('slot')
        .eq('character_id', characterId)
        .not('slot', 'is', null)
        .order('slot', { ascending: true })

      let nextSlot = 0
      if (usedSlots && usedSlots.length > 0) {
        const slots = usedSlots.map(s => s.slot!).sort((a, b) => a - b)
        for (let i = 0; i < slots.length; i++) {
          if (slots[i] !== i) {
            nextSlot = i
            break
          }
        }
        if (nextSlot === 0) {
          nextSlot = slots[slots.length - 1] + 1
        }
      }

      // Insert new item
      const { data, error } = await supabase
        .from('inventory')
        .insert({
          character_id: characterId,
          item_id: itemId,
          quantity,
          slot: nextSlot,
          equipped: false,
          enchantment_level: 0,
          durability: 100,
        })
        .select()
        .single()

      if (error) throw error
      return { data, error: null }
    }
  } catch (error) {
    console.error('Add item error:', error)
    return { data: null, error }
  }
}

/**
 * Remove an item from inventory
 */
export async function removeItem(inventoryItemId: string, quantity: number = 1) {
  try {
    const supabase = createClient()
    const { data: item } = await supabase
      .from('inventory')
      .select('quantity')
      .eq('id', inventoryItemId)
      .single()

    if (!item) {
      throw new Error('Item not found in inventory')
    }

    if (item.quantity <= quantity) {
      // Delete the item
      const { error } = await supabase
        .from('inventory')
        .delete()
        .eq('id', inventoryItemId)

      if (error) throw error
      return { data: null, error: null }
    } else {
      // Decrease quantity
      const { data, error } = await supabase
        .from('inventory')
        .update({ quantity: item.quantity - quantity })
        .eq('id', inventoryItemId)
        .select()
        .single()

      if (error) throw error
      return { data, error: null }
    }
  } catch (error) {
    console.error('Remove item error:', error)
    return { data: null, error }
  }
}

/**
 * Equip an item
 */
export async function equipItem(characterId: string, inventoryItemId: string) {
  try {
    const supabase = createClient()
    // Get the item details
    const { data: inventoryItem } = await supabase
      .from('inventory')
      .select(`
        *,
        item:items(*)
      `)
      .eq('id', inventoryItemId)
      .single()

    if (!inventoryItem || !inventoryItem.item) {
      throw new Error('Item not found')
    }

    const item = Array.isArray(inventoryItem.item) ? inventoryItem.item[0] : inventoryItem.item

    if (!item.equipment_slot) {
      throw new Error('Item is not equipable')
    }

    // Unequip any currently equipped item in the same slot
    // First, get all items with the same equipment slot
    const { data: sameSlotItems } = await supabase
      .from('items')
      .select('id')
      .eq('equipment_slot', item.equipment_slot)

    const itemIds = sameSlotItems?.map(i => i.id) || []

    // Then unequip any equipped items in that slot
    if (itemIds.length > 0) {
      await supabase
        .from('inventory')
        .update({ equipped: false })
        .eq('character_id', characterId)
        .eq('equipped', true)
        .in('item_id', itemIds)
    }

    // Equip the new item
    const { data, error } = await supabase
      .from('inventory')
      .update({ equipped: true })
      .eq('id', inventoryItemId)
      .select()
      .single()

    if (error) throw error

    // Update character stats
    await updateCharacterStats(characterId)

    return { data, error: null }
  } catch (error) {
    console.error('Equip item error:', error)
    return { data: null, error }
  }
}

/**
 * Delete an item from inventory
 */
export async function deleteInventoryItem(inventoryItemId: string) {
  try {
    const supabase = createClient()

    // Check if item is equipped
    const { data: inventoryItem } = await supabase
      .from('inventory')
      .select('*, item:items(*)')
      .eq('id', inventoryItemId)
      .single()

    if (!inventoryItem) {
      throw new Error('Item not found')
    }

    const characterId = inventoryItem.character_id

    // If equipped, unequip first to update stats
    if (inventoryItem.equipped) {
      await unequipItem(inventoryItemId, characterId)
    }

    // Delete the item
    const { error } = await supabase
      .from('inventory')
      .delete()
      .eq('id', inventoryItemId)

    if (error) throw error

    return { error: null }
  } catch (error) {
    console.error('Delete item error:', error)
    return { error: error as Error }
  }
}

/**
 * Unequip an item
 */
export async function unequipItem(inventoryItemId: string, characterId: string) {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('inventory')
      .update({ equipped: false })
      .eq('id', inventoryItemId)
      .select()
      .single()

    if (error) throw error

    // Update character stats
    await updateCharacterStats(characterId)

    return { data, error: null }
  } catch (error) {
    console.error('Unequip item error:', error)
    return { data: null, error }
  }
}

/**
 * Update character stats based on equipped items
 */
async function updateCharacterStats(characterId: string) {
  try {
    const supabase = createClient()
    // Get base character stats
    const { data: character } = await supabase
      .from('characters')
      .select('*')
      .eq('id', characterId)
      .single()

    if (!character) return

    // Get all equipped items
    const { data: equippedItems } = await supabase
      .from('inventory')
      .select(`
        *,
        item:items(*)
      `)
      .eq('character_id', characterId)
      .eq('equipped', true)

    if (!equippedItems) return

    // Calculate total bonuses
    let attackBonus = 0
    let defenseBonus = 0
    let healthBonus = 0
    let manaBonus = 0

    equippedItems.forEach(invItem => {
      const item = Array.isArray(invItem.item) ? invItem.item[0] : invItem.item
      if (item) {
        attackBonus += item.attack_bonus || 0
        defenseBonus += item.defense_bonus || 0
        healthBonus += item.health_bonus || 0
        manaBonus += item.mana_bonus || 0
      }
    })

    // Base stats (from level)
    const baseAttack = 10 + (character.level - 1) * 2
    const baseDefense = 5 + (character.level - 1) * 1
    const baseHealth = 100 + (character.level - 1) * 20
    const baseMana = 50 + (character.level - 1) * 10

    // Update character with new stats
    await supabase
      .from('characters')
      .update({
        attack: baseAttack + attackBonus,
        defense: baseDefense + defenseBonus,
        max_health: baseHealth + healthBonus,
        max_mana: baseMana + manaBonus,
      })
      .eq('id', characterId)

  } catch (error) {
    console.error('Update character stats error:', error)
  }
}

/**
 * Get all available items (item catalog)
 */
export async function getAllItems() {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('items')
      .select('*')
      .order('required_level', { ascending: true })

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Get all items error:', error)
    return { data: null, error }
  }
}
