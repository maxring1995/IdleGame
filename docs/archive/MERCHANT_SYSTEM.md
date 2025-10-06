# 🏪 Merchant System Documentation

**Status**: ✅ Complete and Live
**Date**: 2025-10-04

## Overview

The Merchant System allows players to buy and sell items using gold. It features a dynamic shop inventory with tier-based progression, transaction tracking, and integrated notifications.

## Features

### 🛒 Buy Items
- Purchase weapons, armor, consumables, and materials
- Prices are 150% of item sell price (120% for materials)
- Filter and search through available items
- Level-based item unlocking
- Unlimited stock for most items

### 💰 Sell Items
- Sell inventory items for 60% of their base value
- Cannot sell equipped items
- Stackable items can be sold in any quantity
- Instant gold payout

### 📊 Merchant Tiers
- **Tier 1**: Available from character level 1-5
- **Tier 2**: Unlocks at character level 6-15
- **Tier 3**: Unlocks at character level 16-30
- **Tier 4**: Unlocks at character level 31-50
- **Tier 5**: Unlocks at character level 51+

### 📜 Transaction History
- View last 50 transactions
- See buy/sell type, item, quantity, and price
- Track total purchases, sales, and net gold

### 📢 Notifications
- Purchase confirmation with item and cost
- Sale confirmation with item and earnings
- Error notifications for failed transactions

## Database Schema

### Tables

#### `merchant_inventory`
Stores items available for purchase from the merchant.

```sql
CREATE TABLE merchant_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id TEXT NOT NULL REFERENCES items(id),
  stock_quantity INTEGER NOT NULL DEFAULT -1, -- -1 = unlimited
  buy_price INTEGER NOT NULL,
  price_multiplier DECIMAL(3,2) NOT NULL DEFAULT 1.50,
  available_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  available_until TIMESTAMPTZ,
  merchant_tier INTEGER NOT NULL DEFAULT 1,
  required_character_level INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

#### `merchant_transactions`
Tracks all buy/sell transactions.

```sql
CREATE TABLE merchant_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id UUID NOT NULL REFERENCES characters(id),
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('buy', 'sell')),
  item_id TEXT NOT NULL REFERENCES items(id),
  quantity INTEGER NOT NULL DEFAULT 1,
  price_per_unit INTEGER NOT NULL,
  total_price INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

#### `character_merchant_data`
Stores per-character merchant progression.

```sql
CREATE TABLE character_merchant_data (
  character_id UUID PRIMARY KEY REFERENCES characters(id),
  unlocked_tier INTEGER NOT NULL DEFAULT 1,
  last_inventory_refresh TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  total_purchases INTEGER NOT NULL DEFAULT 0,
  total_sales INTEGER NOT NULL DEFAULT 0,
  lifetime_gold_spent INTEGER NOT NULL DEFAULT 0,
  lifetime_gold_earned INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

## Business Logic

### Location: [lib/merchant.ts](../lib/merchant.ts)

#### Key Functions

**`getMerchantInventory(characterId: string)`**
- Fetches items available for purchase
- Filters by character level and unlocked tier
- Creates merchant data if doesn't exist
- Returns inventory with joined item details

**`buyItem(characterId, merchantInventoryId, quantity)`**
- Validates character has enough gold
- Checks level requirements
- Deducts gold from character
- Adds item to inventory (stacks if applicable)
- Updates merchant stock (if limited)
- Records transaction
- Updates merchant stats

**`sellItem(characterId, inventoryItemId, quantity)`**
- Validates item exists and isn't equipped
- Calculates sell price (60% of base value)
- Removes/reduces inventory quantity
- Adds gold to character
- Records transaction
- Updates merchant stats

**`getTransactionHistory(characterId, limit = 50)`**
- Fetches recent transactions with item details
- Ordered by newest first

**`getMerchantStats(characterId)`**
- Returns merchant progression data
- Total purchases, sales, gold spent/earned

## UI Components

### Location: [components/Merchant.tsx](../components/Merchant.tsx)

### Structure

**3-Tab Interface:**
1. **🛒 Buy Tab**: Browse and purchase items
2. **💰 Sell Tab**: Sell inventory items
3. **📜 History Tab**: View transaction history

**Features:**
- Real-time search and filtering
- Item type filter (all/weapon/armor/consumable/material)
- Rarity-based color coding
- Quantity selector for bulk transactions
- Price calculations with totals
- Item stat preview
- Gold balance display
- Merchant stats dashboard

### Design Patterns

**Buy Flow:**
1. User browses merchant inventory
2. Clicks item to view details in sidebar
3. Adjusts quantity
4. Clicks "Purchase Item"
5. Validation (gold, level)
6. Transaction processed
7. Notification shown
8. Inventory refreshed

**Sell Flow:**
1. User browses their inventory (unequipped items)
2. Clicks item to view details
3. Adjusts quantity
4. Clicks "Sell Item"
5. Transaction processed (60% value)
6. Notification shown
7. Inventory refreshed

## Pricing System

### Buy Prices
- **Weapons/Armor/Consumables**: `base_sell_price * 1.50` (150% markup)
- **Materials**: `base_sell_price * 1.20` (120% markup)
- **Minimum**: 10 gold (5 gold for materials)

### Sell Prices
- **All Items**: `base_sell_price * 0.60` (60% of value)

### Examples
| Item | Sell Price | Buy Price (150%) | Sell-to-Merchant (60%) |
|------|------------|------------------|------------------------|
| Bronze Sword | 20g | 30g | 12g |
| Health Potion | 10g | 15g | 6g |
| Oak Log | 5g | 6g (120%) | 3g |
| Bronze Helmet | 15g | 23g | 9g |

## Integration

### Game Component
- Merchant tab added between Quests and Inventory
- Yellow theme (🏪 icon)
- Tab button at [components/Game.tsx:426-438](../components/Game.tsx#L426-L438)
- Content rendering at [components/Game.tsx:470-471](../components/Game.tsx#L470-L471)

### Notifications
- Buy success: "🛒 Purchase Complete!"
- Sell success: "💰 Item Sold!"
- Errors: "❌ Purchase/Sale Failed"
- Automatically updates gold in character stats

### State Management
- Uses Zustand `useGameStore` for character data
- Uses `useNotificationStore` for notifications
- Updates character gold via `updateCharacterStats()`

## Merchant Stats Dashboard

Located in merchant header, shows:
- **Tier**: Current unlocked tier (1-5)
- **Purchases**: Total items bought
- **Sales**: Total items sold
- **Net Gold**: `gold_earned - gold_spent` (green if positive, red if negative)

## Technical Notes

### RLS Policies
- **merchant_inventory**: Public read, service role write
- **merchant_transactions**: Users can view/create their own
- **character_merchant_data**: Users can view/update their own

### Indexes
```sql
idx_merchant_inventory_tier (merchant_tier, required_character_level)
idx_merchant_inventory_item (item_id)
idx_merchant_transactions_character (character_id, created_at DESC)
idx_character_merchant_data_character (character_id)
```

### Auto-Seeding
Migration includes `seed_merchant_inventory()` function that:
1. Clears existing inventory
2. Adds all weapons/armor/consumables (common/uncommon/rare)
3. Assigns tiers based on required level
4. Adds 20 common materials at lower markup

**Seeded Items:**
- ~50+ items total
- Weapons: Wooden Sword, Bronze Sword, Shortbow, etc.
- Armor: Bronze Helmet, Platebody, Platelegs, Traveler's gear
- Materials: Oak Log, Copper Ore, Raw Shrimp, Air Essence, etc.
- All with unlimited stock (-1)

## Usage Example

```typescript
// Buy 5 health potions
const result = await buyItem(characterId, merchantInventoryId, 5)
if (result.success) {
  console.log(`Spent ${result.transaction.total_price} gold`)
  console.log(`New balance: ${result.newGold}`)
}

// Sell 10 oak logs
const sellResult = await sellItem(characterId, inventoryItemId, 10)
if (sellResult.success) {
  console.log(`Earned ${sellResult.transaction.total_price} gold`)
}
```

## Future Enhancements

Potential additions:
- **Daily Deals**: Rotating discounted items
- **Reputation System**: Better prices with loyalty
- **Special Orders**: Merchant requests specific items
- **Bulk Discounts**: Lower prices for large quantities
- **Rare Stock**: Limited-time legendary items
- **Buyback System**: Re-purchase recently sold items
- **Merchant NPCs**: Different merchants in different zones

## Files Changed

### Created
- ✅ `supabase/migrations/20241008000000_add_merchant_system.sql`
- ✅ `lib/merchant.ts`
- ✅ `components/Merchant.tsx`
- ✅ `docs/MERCHANT_SYSTEM.md`

### Modified
- ✅ `lib/supabase.ts` - Added merchant TypeScript types
- ✅ `components/Game.tsx` - Added merchant tab and routing

## Testing

### Manual Test Checklist
- [x] View merchant inventory
- [x] Buy item with sufficient gold
- [x] Try to buy without enough gold (should fail)
- [x] Try to buy item above level requirement (should fail)
- [x] Sell unequipped item
- [x] Try to sell equipped item (should fail)
- [x] View transaction history
- [x] Check merchant stats update correctly
- [x] Verify notifications appear
- [x] Test search and filter
- [x] Test quantity adjustments

### Database Verification

```sql
-- Check merchant inventory count
SELECT COUNT(*) FROM merchant_inventory; -- Should have 50+ items

-- Check item distribution
SELECT merchant_tier, COUNT(*)
FROM merchant_inventory
GROUP BY merchant_tier
ORDER BY merchant_tier;

-- View sample items
SELECT i.name, i.type, mi.buy_price, mi.merchant_tier
FROM merchant_inventory mi
JOIN items i ON mi.item_id = i.id
LIMIT 10;
```

---

## Summary

The Merchant System is **fully operational** and provides:
- ✅ Complete buy/sell functionality
- ✅ Tiered progression system
- ✅ Transaction tracking
- ✅ Integrated notifications
- ✅ Professional UI with search/filter
- ✅ Database-backed inventory
- ✅ Auto-seeded with 50+ items
- ✅ Proper RLS security

Players can now earn gold through combat, gathering, and questing, then spend it at the merchant to upgrade their equipment, buy consumables, or sell excess materials!

**Access**: Click the 🏪 Merchant tab in the main game interface.

**Date Completed**: 2025-10-04
**Migration Version**: 20241008000000
