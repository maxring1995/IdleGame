# 🗺️ Zone Expansion System Documentation

**Status**: ✅ Complete and Live
**Date**: 2025-10-04
**Migration Version**: 20241009000000

## Overview

The Zone Expansion System adds immersive zone-based progression to the game. Each zone has unique merchants, monsters, materials, and items, creating distinct gameplay experiences as players explore different regions.

## Features

### 🏪 Zone-Specific Merchants
- **15 unique merchants** across 7 zones
- Each merchant has personality, greeting messages, and icons
- Different merchant types: general, weapons, armor, potions, materials, specialty
- Pricing varies by zone (higher tiers = higher prices)
- Merchant personalities: friendly, gruff, mysterious, cheerful, suspicious

### ⚔️ Zone-Specific Monsters
- Enemies automatically assigned to zones based on level
- Level 1-9: Whispering Woods
- Level 10-19: Ironpeak Foothills
- Level 20-29: Shadowfen Marsh
- Level 30-39: Emberpeak Mines
- Level 40-49: Frostspire Mountains
- Level 50+: The Shattered Wastes

### ⛏️ Zone-Specific Materials
- Materials tied to specific zones for gathering
- Zone progression unlocks new materials
- Same level distribution as enemies

### 🎁 Zone-Specific Items
- Items available only in certain zones
- Rarer items in higher-level zones
- Exclusive equipment and consumables

## Database Schema

### New Tables

#### `zone_merchants`
Unique merchants with personalities in each zone.

```sql
CREATE TABLE zone_merchants (
  id UUID PRIMARY KEY,
  zone_id UUID NOT NULL REFERENCES world_zones(id),
  merchant_name TEXT NOT NULL,
  merchant_type TEXT NOT NULL, -- 'general', 'weapons', 'armor', 'potions', 'materials', 'specialty'
  description TEXT,
  greeting_message TEXT,
  personality TEXT, -- 'friendly', 'gruff', 'mysterious', 'cheerful', 'suspicious'
  icon TEXT DEFAULT '🏪',
  discount_multiplier DECIMAL(3,2) DEFAULT 1.00,
  unlocked_at_reputation INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(zone_id, merchant_name)
);
```

#### `zone_exclusive_items`
Items exclusive to specific zones.

```sql
CREATE TABLE zone_exclusive_items (
  id UUID PRIMARY KEY,
  zone_id UUID NOT NULL REFERENCES world_zones(id),
  item_id TEXT NOT NULL REFERENCES items(id),
  is_exclusive BOOLEAN DEFAULT true,
  discovery_required BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(zone_id, item_id)
);
```

### Modified Tables

#### `merchant_inventory` (added columns)
- `zone_id UUID` - Links to specific zone (NULL = global merchant)
- `merchant_name TEXT` - Name of zone merchant
- `merchant_description TEXT` - Optional description

#### `enemies` (added column)
- `zone_id UUID` - Links enemy to specific zone

#### `materials` (added column)
- `zone_id UUID` - Links material to specific zone

## Zone Merchants

### Havenbrook Village (Level 1+)
**Theme**: Starter Zone, Safe Haven

| Merchant | Type | Personality | Icon | Greeting |
|----------|------|------------|------|----------|
| Merchant Aldric | general | friendly | 👨‍💼 | "Welcome, traveler! Looking for supplies?" |
| Blacksmith Gerta | weapons | gruff | ⚒️ | "Need a good blade? I've got just the thing!" |
| Apothecary Finn | potions | cheerful | 🧪 | "Potions and remedies! Fresh today!" |

**Items**: Starter weapons and armor (level 1-5, common/uncommon)
**Pricing**: 150% markup (base rate)

### Whispering Woods (Level 1+)
**Theme**: Forest, Natural Materials

| Merchant | Type | Personality | Icon | Greeting |
|----------|------|------------|------|----------|
| Ranger Sylva | materials | mysterious | 🏹 | "The woods provide... for those who respect them." |
| Wandering Trader Orin | general | cheerful | 🎒 | "Come! Come! Treasures from afar!" |

**Items**: Wood, leather, bows, herbs (level 1-15)
**Pricing**: 130% markup (cheaper materials)

### Ironpeak Foothills (Level 10+)
**Theme**: Mountains, Dwarven Crafts

| Merchant | Type | Personality | Icon | Greeting |
|----------|------|------------|------|----------|
| Dwarf Merchant Thorin | weapons | gruff | 🪓 | "Mountain steel! Best in the realm!" |
| Gemcutter Mira | materials | friendly | 💎 | "Ah, a fellow admirer of earth's treasures!" |

**Items**: Iron, steel, mithril, ores, gems (level 10-25)
**Pricing**: 140% markup

### Shadowfen Marsh (Level 20+)
**Theme**: Dark, Mysterious, Dangerous

| Merchant | Type | Personality | Icon | Greeting |
|----------|------|------------|------|----------|
| Swamp Witch Morgana | potions | suspicious | 🧙‍♀️ | "Hehehe... what brings you to my bog?" |
| Scavenger Rask | general | suspicious | 🦎 | "Got coin? I got goods. No questions." |

**Items**: Dark/poison items, uncommon/rare (level 20-35)
**Pricing**: 160% markup

### Emberpeak Mines (Level 25+)
**Theme**: Volcanic, Fire-Forged

| Merchant | Type | Personality | Icon | Greeting |
|----------|------|------------|------|----------|
| Forgemaster Vulcan | weapons | gruff | 🔥 | "Fire-forged weapons! Unbreakable!" |
| Ore Trader Krag | materials | gruff | ⛏️ | "These ores ain't gonna sell themselves!" |

**Items**: Adamant, runes, coal (level 25-45)
**Pricing**: 170% markup

### Frostspire Mountains (Level 40+)
**Theme**: Ice, Frost, High-Tier

| Merchant | Type | Personality | Icon | Greeting |
|----------|------|------------|------|----------|
| Ice Merchant Elara | specialty | mysterious | ❄️ | "Welcome to my frozen emporium." |
| Mountain Hermit Bjorn | potions | gruff | 🧔 | "Hmph. You made it this far. Impressive." |

**Items**: Frost gear, rare/epic (level 40-55)
**Pricing**: 200% markup

### The Shattered Wastes (Level 50+)
**Theme**: Demonic, Legendary, End-Game

| Merchant | Type | Personality | Icon | Greeting |
|----------|------|------------|------|----------|
| Demon Merchant Azrael | specialty | suspicious | 😈 | "Mortal! I have wares that will change your fate..." |
| Soul Trader Vex | weapons | mysterious | 💀 | "Power... for a price. Always a price." |

**Items**: Legendary/cursed gear, epic/legendary (level 50+)
**Pricing**: 300% markup

## API Functions

### Merchant Functions ([lib/merchant.ts](../lib/merchant.ts))

#### `getZoneMerchants()`
Get all zone merchants with their zones.

```typescript
const { data, error } = await getZoneMerchants()
// Returns: ZoneMerchantWithZone[]
```

#### `getZoneMerchantsByZone(zoneId: string)`
Get merchants for a specific zone.

```typescript
const { data, error } = await getZoneMerchantsByZone(zoneId)
// Returns: ZoneMerchantWithZone[]
```

#### `getZoneMerchantInventory(zoneId, merchantName, characterLevel)`
Get items sold by a specific merchant.

```typescript
const { data, error } = await getZoneMerchantInventory(
  '00000000-0000-0000-0000-000000000001',
  'Blacksmith Gerta',
  character.level
)
// Returns: MerchantInventoryWithItem[]
```

### Combat Functions ([lib/enemies.ts](../lib/enemies.ts))

#### `getEnemiesByZone(zoneId, playerLevel)`
Get enemies for a specific zone.

```typescript
const { data, error } = await getEnemiesByZone(zoneId, character.level)
// Returns: Enemy[]
```

#### `getZonesWithEnemies(playerLevel)`
Get all zones with enemy counts.

```typescript
const { data, error } = await getZonesWithEnemies(character.level)
// Returns: (WorldZone & { enemyCount: number })[]
```

### Gathering Functions ([lib/materials.ts](../lib/materials.ts))

#### `getMaterialsByZone(zoneId, skillType)`
Get materials for a specific zone and skill.

```typescript
const { data, error } = await getMaterialsByZone(zoneId, 'woodcutting')
// Returns: Material[]
```

#### `getZonesWithMaterials(skillType, playerLevel)`
Get all zones with material counts for a skill.

```typescript
const { data, error } = await getZonesWithMaterials('mining', character.level)
// Returns: (WorldZone & { materialCount: number })[]
```

## TypeScript Types

### New Types ([lib/supabase.ts](../lib/supabase.ts))

```typescript
export interface ZoneMerchant {
  id: string
  zone_id: string
  merchant_name: string
  merchant_type: 'general' | 'weapons' | 'armor' | 'potions' | 'materials' | 'specialty'
  description?: string
  greeting_message?: string
  personality?: 'friendly' | 'gruff' | 'mysterious' | 'cheerful' | 'suspicious'
  icon: string
  discount_multiplier: number
  unlocked_at_reputation: number
  created_at: string
}

export interface ZoneMerchantWithZone extends ZoneMerchant {
  zone: WorldZone
}

export interface ZoneMerchantWithInventory extends ZoneMerchant {
  zone: WorldZone
  inventory: MerchantInventoryWithItem[]
}
```

### Modified Types

```typescript
export interface MerchantInventoryItem {
  // ... existing fields
  zone_id?: string // NEW: Zone-specific merchant
  merchant_name?: string // NEW: Name of merchant
  merchant_description?: string // NEW: Optional description
}
```

## Pricing Strategy

### By Zone Tier

| Zone | Level Range | Markup | Strategy |
|------|-------------|--------|----------|
| Havenbrook Village | 1-5 | 150% | Starter prices |
| Whispering Woods | 1-15 | 130% | Cheaper materials |
| Ironpeak Foothills | 10-25 | 140% | Mid-tier |
| Shadowfen Marsh | 20-35 | 160% | Rare items premium |
| Emberpeak Mines | 25-45 | 170% | High-tier |
| Frostspire Mountains | 40-55 | 200% | Elite gear |
| The Shattered Wastes | 50+ | 300% | Legendary premium |

### Item Type Multipliers
- **Weapons/Armor/Consumables**: Standard zone markup
- **Materials**: 20% lower markup (encourage gathering)
- **Specialty Items**: Zone markup (can be very high at high tiers)

## Usage Examples

### Example 1: Browse Zone Merchants
```typescript
// Get all merchants in Ironpeak Foothills
const { data: merchants } = await getZoneMerchantsByZone(
  '00000000-0000-0000-0000-000000000003'
)

merchants.forEach(merchant => {
  console.log(`${merchant.icon} ${merchant.merchant_name}`)
  console.log(`  "${merchant.greeting_message}"`)
  console.log(`  Type: ${merchant.merchant_type}`)
})

// Output:
// 🪓 Dwarf Merchant Thorin
//   "Mountain steel! Best in the realm!"
//   Type: weapons
// 💎 Gemcutter Mira
//   "Ah, a fellow admirer of earth's treasures!"
//   Type: materials
```

### Example 2: Shop at Zone Merchant
```typescript
// Get Blacksmith Gerta's inventory in Havenbrook
const { data: inventory } = await getZoneMerchantInventory(
  '00000000-0000-0000-0000-000000000001', // Havenbrook
  'Blacksmith Gerta',
  character.level
)

// Buy an item
const bronzeSword = inventory.find(i => i.item.name === 'Bronze Sword')
if (bronzeSword) {
  const result = await buyItem(character.id, bronzeSword.id, 1)
  console.log(`Bought for ${bronzeSword.buy_price} gold!`)
}
```

### Example 3: Find Enemies by Zone
```typescript
// Get enemies in Shadowfen Marsh
const { data: enemies } = await getEnemiesByZone(
  '00000000-0000-0000-0000-000000000004',
  character.level
)

console.log(`Found ${enemies.length} enemies in the swamp!`)
```

### Example 4: Find Materials by Zone
```typescript
// Get mining materials in Ironpeak Foothills
const { data: materials } = await getMaterialsByZone(
  '00000000-0000-0000-0000-000000000003',
  'mining'
)

materials.forEach(mat => {
  console.log(`${mat.name} - Level ${mat.required_skill_level} required`)
})
```

## Future Enhancements

### Planned Features
- **Zone Discovery System**: Unlock zones through quests/exploration
- **Merchant Reputation**: Better prices with higher reputation
- **Zone Events**: Time-limited merchants and items
- **Dynamic Pricing**: Supply/demand based on player activity
- **Merchant Quests**: Special tasks from zone merchants
- **Zone-Exclusive Recipes**: Crafting recipes only available in certain zones
- **Weather Effects**: Zone-specific weather affecting gameplay
- **Zone Bosses**: Special encounters in each zone
- **Zone Achievements**: Complete zone-specific challenges

### Potential Additions
- **Black Market**: Hidden merchants with rare/illegal items
- **Traveling Merchants**: Move between zones on schedules
- **Auction House**: Player-to-player trading per zone
- **Zone Alliances**: Faction-based merchant discounts
- **Seasonal Merchants**: Holiday/event-exclusive traders

## Files Changed

### Created
- ✅ `supabase/migrations/20241009000000_add_zone_expansion_system.sql`
- ✅ `docs/ZONE_EXPANSION_SYSTEM.md`

### Modified
- ✅ `lib/supabase.ts` - Added zone merchant types
- ✅ `lib/merchant.ts` - Added zone merchant functions
- ✅ `lib/enemies.ts` - Added zone enemy functions
- ✅ `lib/materials.ts` - Added zone material functions

### Database Changes
- ✅ Created `zone_merchants` table (15 merchants seeded)
- ✅ Created `zone_exclusive_items` table
- ✅ Added `zone_id` to `merchant_inventory`
- ✅ Added `zone_id` to `enemies`
- ✅ Added `zone_id` to `materials`
- ✅ Auto-assigned existing enemies to zones
- ✅ Auto-assigned existing materials to zones
- ✅ Auto-assigned items to zone merchants

## Testing Checklist

- [x] Verify zone merchants created (15 merchants)
- [x] Verify merchant inventory assigned to zones
- [x] Verify enemies assigned to zones
- [x] Verify materials assigned to zones
- [x] Test `getZoneMerchants()` function
- [x] Test `getZoneMerchantsByZone()` function
- [x] Test `getZoneMerchantInventory()` function
- [x] Test `getEnemiesByZone()` function
- [x] Test `getZonesWithEnemies()` function
- [x] Test `getMaterialsByZone()` function
- [x] Test `getZonesWithMaterials()` function
- [x] Verify pricing varies by zone
- [x] Verify RLS policies work correctly

## Verification Queries

```sql
-- Check zone merchants
SELECT
  wz.name as zone_name,
  zm.merchant_name,
  zm.merchant_type,
  zm.personality,
  zm.icon,
  COUNT(mi.id) as items_count
FROM zone_merchants zm
JOIN world_zones wz ON zm.zone_id = wz.id
LEFT JOIN merchant_inventory mi ON mi.zone_id = zm.zone_id AND mi.merchant_name = zm.merchant_name
GROUP BY wz.id, wz.name, zm.id, zm.merchant_name, zm.merchant_type, zm.personality, zm.icon
ORDER BY wz.required_level, zm.merchant_name;

-- Check enemies by zone
SELECT
  wz.name as zone_name,
  COUNT(e.id) as enemy_count,
  MIN(e.level) as min_level,
  MAX(e.level) as max_level
FROM world_zones wz
LEFT JOIN enemies e ON e.zone_id = wz.id
GROUP BY wz.id, wz.name
ORDER BY wz.required_level;

-- Check materials by zone
SELECT
  wz.name as zone_name,
  m.required_skill_type,
  COUNT(m.id) as material_count
FROM world_zones wz
LEFT JOIN materials m ON m.zone_id = wz.id
GROUP BY wz.id, wz.name, m.required_skill_type
ORDER BY wz.required_level, m.required_skill_type;
```

---

## Summary

The Zone Expansion System is **fully operational** and provides:

- ✅ **15 unique merchants** with personalities across 7 zones
- ✅ **Zone-specific pricing** (130% to 300% markup based on zone tier)
- ✅ **Zone-based enemy distribution** for immersive combat
- ✅ **Zone-based material gathering** for exploration
- ✅ **Complete API** for zone-based queries
- ✅ **Automatic zone assignment** for existing content
- ✅ **RLS security** for all new tables

Players can now experience distinct gameplay in each zone, with unique merchants, monsters, and materials creating a rich, varied world to explore!

**Date Completed**: 2025-10-04
**Migration Version**: 20241009000000
**Dev Server**: ✅ Running at http://localhost:3001
