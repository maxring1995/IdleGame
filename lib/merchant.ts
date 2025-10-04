import { createClient } from '@/utils/supabase/client'
import type {
  MerchantInventoryWithItem,
  MerchantTransactionWithItem,
  CharacterMerchantData,
  BuyItemResult,
  SellItemResult,
  Item,
  InventoryItem
} from './supabase'

/**
 * Get merchant inventory items available for purchase
 * Filters by character level and merchant tier
 */
export async function getMerchantInventory(characterId: string) {
  const supabase = createClient()

  // Get character level
  const { data: character, error: charError } = await supabase
    .from('characters')
    .select('level')
    .eq('id', characterId)
    .single()

  if (charError || !character) {
    return { data: null, error: 'Character not found' }
  }

  // Get merchant data (or create default)
  let { data: merchantData } = await supabase
    .from('character_merchant_data')
    .select('*')
    .eq('character_id', characterId)
    .maybeSingle()

  // Create merchant data if doesn't exist
  if (!merchantData) {
    const { data: newData, error: createError } = await supabase
      .from('character_merchant_data')
      .insert({
        character_id: characterId,
        unlocked_tier: 1,
        last_inventory_refresh: new Date().toISOString()
      })
      .select()
      .single()

    if (createError) {
      return { data: null, error: createError.message }
    }
    merchantData = newData
  }

  // Get available merchant inventory
  const { data: inventory, error: invError } = await supabase
    .from('merchant_inventory')
    .select(`
      *,
      item:items(*)
    `)
    .lte('merchant_tier', merchantData.unlocked_tier)
    .lte('required_character_level', character.level)
    .order('merchant_tier', { ascending: true })
    .order('required_character_level', { ascending: true })

  if (invError) {
    return { data: null, error: invError.message }
  }

  return {
    data: {
      inventory: inventory as MerchantInventoryWithItem[],
      merchantData,
      characterLevel: character.level
    },
    error: null
  }
}

/**
 * Buy an item from the merchant
 */
export async function buyItem(
  characterId: string,
  merchantInventoryId: string,
  quantity: number = 1
): Promise<BuyItemResult> {
  const supabase = createClient()

  // Get character
  const { data: character, error: charError } = await supabase
    .from('characters')
    .select('gold, level')
    .eq('id', characterId)
    .single()

  if (charError || !character) {
    return { success: false, error: 'Character not found' }
  }

  // Get merchant inventory item
  const { data: merchantItem, error: merchantError } = await supabase
    .from('merchant_inventory')
    .select(`
      *,
      item:items(*)
    `)
    .eq('id', merchantInventoryId)
    .single()

  if (merchantError || !merchantItem) {
    return { success: false, error: 'Item not found in merchant inventory' }
  }

  const item = (merchantItem as any).item as Item

  // Check level requirement
  if (character.level < merchantItem.required_character_level) {
    return {
      success: false,
      error: `Requires level ${merchantItem.required_character_level}`
    }
  }

  // Check stock (if limited)
  if (merchantItem.stock_quantity !== -1 && merchantItem.stock_quantity < quantity) {
    return {
      success: false,
      error: `Not enough stock (available: ${merchantItem.stock_quantity})`
    }
  }

  // Calculate total cost
  const totalCost = merchantItem.buy_price * quantity

  // Check if player has enough gold
  if (character.gold < totalCost) {
    return {
      success: false,
      error: `Not enough gold (need ${totalCost}, have ${character.gold})`
    }
  }

  // Deduct gold from character
  const { error: goldError } = await supabase
    .from('characters')
    .update({ gold: character.gold - totalCost })
    .eq('id', characterId)

  if (goldError) {
    return { success: false, error: 'Failed to deduct gold' }
  }

  // Add item to inventory
  const { data: existingItem } = await supabase
    .from('inventory')
    .select('*')
    .eq('character_id', characterId)
    .eq('item_id', item.id)
    .maybeSingle()

  if (existingItem && item.stackable) {
    // Stack with existing
    await supabase
      .from('inventory')
      .update({ quantity: existingItem.quantity + quantity })
      .eq('id', existingItem.id)
  } else {
    // Create new inventory entry
    await supabase
      .from('inventory')
      .insert({
        character_id: characterId,
        item_id: item.id,
        quantity,
        equipped: false,
        enchantment_level: 0,
        durability: 100
      })
  }

  // Update merchant stock (if limited)
  if (merchantItem.stock_quantity !== -1) {
    await supabase
      .from('merchant_inventory')
      .update({ stock_quantity: merchantItem.stock_quantity - quantity })
      .eq('id', merchantInventoryId)
  }

  // Record transaction
  const { data: transaction, error: transError } = await supabase
    .from('merchant_transactions')
    .insert({
      character_id: characterId,
      transaction_type: 'buy',
      item_id: item.id,
      quantity,
      price_per_unit: merchantItem.buy_price,
      total_price: totalCost
    })
    .select()
    .single()

  if (transError) {
    console.error('Failed to record transaction:', transError)
  }

  // Update merchant data stats
  await supabase
    .from('character_merchant_data')
    .update({
      total_purchases: supabase.rpc('increment', { x: 1 }) as any,
      lifetime_gold_spent: supabase.rpc('increment', { x: totalCost }) as any
    })
    .eq('character_id', characterId)

  return {
    success: true,
    transaction: transaction || undefined,
    newGold: character.gold - totalCost
  }
}

/**
 * Sell an item to the merchant
 * Player receives 60% of the item's sell_price
 */
export async function sellItem(
  characterId: string,
  inventoryItemId: string,
  quantity: number = 1
): Promise<SellItemResult> {
  const supabase = createClient()

  // Get character
  const { data: character, error: charError } = await supabase
    .from('characters')
    .select('gold')
    .eq('id', characterId)
    .single()

  if (charError || !character) {
    return { success: false, error: 'Character not found' }
  }

  // Get inventory item
  const { data: inventoryItem, error: invError } = await supabase
    .from('inventory')
    .select(`
      *,
      item:items(*)
    `)
    .eq('id', inventoryItemId)
    .eq('character_id', characterId)
    .single()

  if (invError || !inventoryItem) {
    return { success: false, error: 'Item not found in inventory' }
  }

  const item = (inventoryItem as any).item as Item

  // Check if item is equipped
  if (inventoryItem.equipped) {
    return { success: false, error: 'Cannot sell equipped items' }
  }

  // Check quantity
  if (inventoryItem.quantity < quantity) {
    return {
      success: false,
      error: `Not enough items (have ${inventoryItem.quantity}, trying to sell ${quantity})`
    }
  }

  // Calculate sell price (60% of sell_price)
  const pricePerUnit = Math.floor(item.sell_price * 0.6)
  const totalPrice = pricePerUnit * quantity

  // Update or remove inventory item
  if (inventoryItem.quantity > quantity) {
    // Reduce quantity
    await supabase
      .from('inventory')
      .update({ quantity: inventoryItem.quantity - quantity })
      .eq('id', inventoryItemId)
  } else {
    // Remove entirely
    await supabase
      .from('inventory')
      .delete()
      .eq('id', inventoryItemId)
  }

  // Add gold to character
  const { error: goldError } = await supabase
    .from('characters')
    .update({ gold: character.gold + totalPrice })
    .eq('id', characterId)

  if (goldError) {
    return { success: false, error: 'Failed to add gold' }
  }

  // Record transaction
  const { data: transaction, error: transError } = await supabase
    .from('merchant_transactions')
    .insert({
      character_id: characterId,
      transaction_type: 'sell',
      item_id: item.id,
      quantity,
      price_per_unit: pricePerUnit,
      total_price: totalPrice
    })
    .select()
    .single()

  if (transError) {
    console.error('Failed to record transaction:', transError)
  }

  // Update merchant data stats
  await supabase
    .from('character_merchant_data')
    .update({
      total_sales: supabase.rpc('increment', { x: 1 }) as any,
      lifetime_gold_earned: supabase.rpc('increment', { x: totalPrice }) as any
    })
    .eq('character_id', characterId)

  return {
    success: true,
    transaction: transaction || undefined,
    newGold: character.gold + totalPrice
  }
}

/**
 * Get transaction history for a character
 */
export async function getTransactionHistory(
  characterId: string,
  limit: number = 50
) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('merchant_transactions')
    .select(`
      *,
      item:items(*)
    `)
    .eq('character_id', characterId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    return { data: null, error: error.message }
  }

  return { data: data as MerchantTransactionWithItem[], error: null }
}

/**
 * Get merchant stats for a character
 */
export async function getMerchantStats(characterId: string) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('character_merchant_data')
    .select('*')
    .eq('character_id', characterId)
    .maybeSingle()

  if (error) {
    return { data: null, error: error.message }
  }

  return { data, error: null }
}

/**
 * Get all zone merchants with their zones
 */
export async function getZoneMerchants() {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('zone_merchants')
    .select(`
      *,
      zone:world_zones(*)
    `)
    .order('zone_id', { ascending: true })

  if (error) {
    return { data: null, error: error.message }
  }

  return { data, error: null }
}

/**
 * Get merchants for a specific zone
 */
export async function getZoneMerchantsByZone(zoneId: string) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('zone_merchants')
    .select(`
      *,
      zone:world_zones(*)
    `)
    .eq('zone_id', zoneId)
    .order('merchant_name', { ascending: true })

  if (error) {
    return { data: null, error: error.message }
  }

  return { data, error: null }
}

/**
 * Get zone merchant inventory (items sold by a specific merchant in a zone)
 */
export async function getZoneMerchantInventory(zoneId: string, merchantName: string, characterLevel: number) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('merchant_inventory')
    .select(`
      *,
      item:items(*)
    `)
    .eq('zone_id', zoneId)
    .eq('merchant_name', merchantName)
    .lte('required_character_level', characterLevel)
    .order('required_character_level', { ascending: true })

  if (error) {
    return { data: null, error: error.message }
  }

  return { data, error: null }
}
