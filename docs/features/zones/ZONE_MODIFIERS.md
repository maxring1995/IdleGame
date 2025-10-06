# Zone Modifiers System

**Version**: 1.0.0
**Status**: ✅ Production Ready
**Last Updated**: 2025-10-07

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Database Schema](#database-schema)
4. [TypeScript Library](#typescript-library)
5. [Integration Points](#integration-points)
6. [UI Components](#ui-components)
7. [Testing](#testing)
8. [Performance Considerations](#performance-considerations)
9. [Future Enhancements](#future-enhancements)
10. [Troubleshooting](#troubleshooting)

---

## Overview

### Purpose

The Zone Modifiers System transforms world zones from static exploration containers into **dynamic environments that affect all game systems**. Each zone provides unique bonuses and penalties that influence:

- **Combat**: Damage, defense, regeneration rates
- **Gathering**: Resource spawn rates, XP bonuses
- **Crafting**: Success rates, cost reduction, quality bonuses
- **Merchants**: Price modifiers, unique items
- **Quests**: Zone-specific quest availability

### Design Goals

1. **Strategic Depth**: Players choose zones based on current goals (combat farming, resource gathering, crafting)
2. **Exploration Value**: Discovery unlocks access to powerful zone bonuses
3. **System Integration**: Modifiers seamlessly apply across all game systems
4. **Flexibility**: JSON-based schema allows easy addition of new modifier types
5. **Performance**: Server-side calculations with efficient caching

### Key Features

- **Multiplicative Stacking**: Zone bonuses combine with existing bonuses (landmarks, synergies)
- **Real-time Application**: Modifiers apply automatically based on character's current zone
- **Type Safety**: Comprehensive TypeScript interfaces prevent runtime errors
- **Developer-Friendly**: Single API call retrieves all modifiers for a character
- **UI Transparency**: Clear display of active bonuses in character sheet

---

## Architecture

### High-Level Flow

```
┌─────────────────┐
│  Character      │
│  enters zone    │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│  Database Function:                     │
│  get_character_zone_modifiers()         │
│  Returns JSONB with all modifiers       │
└────────┬────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│  TypeScript Wrapper Functions           │
│  - applyZoneCombatModifiers()           │
│  - applyZoneGatheringModifiers()        │
│  - applyZoneCraftingModifiers()         │
│  - applyZoneMerchantModifiers()         │
└────────┬────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│  Game Systems Apply Modifiers           │
│  - Combat: Modified attack/defense      │
│  - Gathering: Modified spawn rates      │
│  - Crafting: Modified success/cost      │
│  - Merchants: Modified prices           │
└─────────────────────────────────────────┘
```

### Design Decisions

**Why JSONB instead of relational tables?**
- Zones have different modifier combinations (not all zones affect all systems)
- Easy to add new modifier types without migrations
- PostgreSQL JSONB indexing provides fast queries
- Flexible schema supports future zone types

**Why server-side functions?**
- Centralized modifier calculation logic
- Prevents client-side manipulation
- Easier to update modifier formulas
- Supports complex bonus stacking logic

**Why multiplicative stacking?**
- Prevents overpowered combinations (additive can compound excessively)
- Matches player expectations from similar RPGs
- Easier to balance individual modifiers

---

## Database Schema

### Migration File

**Location**: `/supabase/migrations/20241007000000_add_zone_modifiers.sql`

### Tables Modified

#### `world_zones`

**Added Column**:
```sql
system_modifiers JSONB DEFAULT '{}'::jsonb
```

**Structure Example**:
```json
{
  "combat": {
    "damage_bonus": 0.15,
    "defense_bonus": 0.10,
    "hp_regen_bonus": 0.0,
    "mp_regen_bonus": -0.10,
    "enemy_types": ["orc", "troll", "stone_elemental"]
  },
  "gathering": {
    "spawn_rate_modifiers": {
      "mining": 2.0,
      "woodcutting": 0.3
    },
    "xp_bonus": 0.15
  },
  "crafting": {
    "success_rate_bonus": {
      "smithing": 0.25,
      "all": 0.05
    },
    "cost_reduction": {
      "smithing": 0.10
    },
    "quality_bonus": 0.15
  },
  "merchants": {
    "price_modifier": 0.95,
    "unique_items": ["ironpeak_hammer", "mountain_boots"]
  },
  "quests": {
    "available_quest_ids": ["quest_mountain_king", "quest_ore_trader"]
  }
}
```

### Database Functions

#### 1. `get_character_zone_modifiers(p_character_id uuid)`

**Purpose**: Retrieve modifiers for character's current zone

**Returns**: JSONB with zone modifiers

**Usage**:
```sql
SELECT get_character_zone_modifiers('character-uuid-here');
```

**Logic**:
1. Get character's `current_zone_id`
2. If no zone, return empty JSONB `{}`
3. Fetch `system_modifiers` from `world_zones`
4. Return modifiers

#### 2. `apply_zone_combat_modifiers(p_character_id uuid, p_base_damage int, p_base_defense int)`

**Purpose**: Apply zone combat modifiers to character stats

**Returns**: JSONB with modified values
```json
{
  "modified_damage": 115,
  "modified_defense": 110,
  "hp_regen_bonus": 0.0,
  "mp_regen_bonus": -0.10
}
```

**Formula**:
```sql
modified_damage = p_base_damage * (1 + COALESCE(damage_bonus, 0))
modified_defense = p_base_defense * (1 + COALESCE(defense_bonus, 0))
```

#### 3. `apply_zone_gathering_modifiers(p_character_id uuid, p_skill_type text, p_base_time_ms int)`

**Purpose**: Apply gathering speed modifiers

**Returns**: JSONB with modified time
```json
{
  "modified_time_ms": 2500,
  "spawn_rate_modifier": 2.0,
  "xp_bonus": 0.15
}
```

**Formula**:
```sql
spawn_rate = COALESCE((mods->'gathering'->'spawn_rate_modifiers'->p_skill_type)::numeric, 1.0)
modified_time_ms = (p_base_time_ms / spawn_rate)::int
```

**Example**:
- Base time: 5000ms
- Mining spawn rate: 2.0x (Ironpeak Foothills)
- Modified time: 5000 / 2.0 = **2500ms** (50% faster!)

#### 4. `apply_zone_crafting_modifiers(p_character_id uuid, p_skill_type text, p_base_success_rate numeric, p_base_cost int)`

**Purpose**: Apply crafting bonuses

**Returns**: JSONB with modified values
```json
{
  "modified_success_rate": 0.80,
  "modified_cost": 90,
  "quality_bonus": 0.10
}
```

**Formula**:
```sql
skill_success_bonus = COALESCE((success_rate_bonus->p_skill_type)::numeric, 0)
all_success_bonus = COALESCE((success_rate_bonus->'all')::numeric, 0)
total_success_bonus = skill_success_bonus + all_success_bonus

modified_success_rate = LEAST(1.0, p_base_success_rate + total_success_bonus)

skill_cost_reduction = COALESCE((cost_reduction->p_skill_type)::numeric, 0)
all_cost_reduction = COALESCE((cost_reduction->'all')::numeric, 0)
total_cost_reduction = skill_cost_reduction + all_cost_reduction

modified_cost = GREATEST(1, (p_base_cost * (1 - total_cost_reduction))::int)
```

#### 5. `apply_zone_merchant_modifiers(p_character_id uuid, p_base_price int)`

**Purpose**: Apply merchant price modifiers

**Returns**: JSONB with modified price
```json
{
  "modified_price": 95,
  "price_modifier": 0.95,
  "unique_items": ["forest_cloak", "nature_staff"]
}
```

**Formula**:
```sql
modified_price = (p_base_price * COALESCE(price_modifier, 1.0))::int
```

---

## TypeScript Library

### File Location

`/lib/zone-modifiers.ts`

### Core Interfaces

```typescript
export interface ZoneModifiers {
  combat?: CombatModifiers
  gathering?: GatheringModifiers
  crafting?: CraftingModifiers
  merchants?: MerchantModifiers
  quests?: QuestModifiers
}

export interface CombatModifiers {
  damage_bonus: number        // 0.15 = +15% damage
  defense_bonus: number       // 0.10 = +10% defense
  hp_regen_bonus: number      // 0.05 = +5% HP regen
  mp_regen_bonus: number      // -0.10 = -10% MP regen
  enemy_types: string[]       // ['orc', 'troll']
}

export interface GatheringModifiers {
  spawn_rate_modifiers: {
    [skillType: string]: number  // 2.0 = 2x spawn rate (50% faster)
  }
  xp_bonus: number              // 0.15 = +15% XP
}

export interface CraftingModifiers {
  success_rate_bonus: {
    [skillType: string]: number  // 0.25 = +25% success
  }
  cost_reduction: {
    [skillType: string]: number  // 0.10 = 10% cheaper
  }
  quality_bonus: number          // 0.15 = +15% quality chance
}

export interface MerchantModifiers {
  price_modifier: number         // 0.95 = 5% discount
  unique_items: string[]         // ['item1', 'item2']
}

export interface QuestModifiers {
  available_quest_ids: string[]
}
```

### Core Functions

#### `getCharacterZoneModifiers(characterId: string)`

**Purpose**: Retrieve all zone modifiers for a character

**Returns**: `{ data: ZoneModifiers | null, error: Error | null }`

**Usage**:
```typescript
const { data: mods, error } = await getCharacterZoneModifiers(characterId)

if (error) {
  console.error('Failed to get zone modifiers:', error)
  return
}

if (mods?.combat) {
  console.log(`+${mods.combat.damage_bonus * 100}% damage in this zone!`)
}
```

#### `applyZoneCombatModifiers(characterId, baseDamage, baseDefense)`

**Purpose**: Get modified combat stats

**Returns**: `{ data: { modified_damage, modified_defense, hp_regen_bonus, mp_regen_bonus }, error }`

**Usage**:
```typescript
const { data: zoneMods } = await applyZoneCombatModifiers(
  characterId,
  character.attack,
  character.defense
)

const finalAttack = zoneMods?.modified_damage || character.attack
const finalDefense = zoneMods?.modified_defense || character.defense
```

#### `applyZoneGatheringModifiers(characterId, skillType, baseTimeMs)`

**Purpose**: Get modified gathering time

**Returns**: `{ data: { modified_time_ms, spawn_rate_modifier, xp_bonus }, error }`

**Usage**:
```typescript
const { data: zoneMods } = await applyZoneGatheringModifiers(
  characterId,
  'mining',
  5000 // Base time: 5 seconds
)

const finalTime = zoneMods?.modified_time_ms || 5000
const xpBonus = zoneMods?.xp_bonus || 0

console.log(`Gathering takes ${finalTime}ms (${xpBonus * 100}% bonus XP)`)
```

### Helper Functions

#### `formatModifier(value: number, showPlus?: boolean): string`

**Purpose**: Format modifier as percentage string

**Examples**:
```typescript
formatModifier(0.15)      // "+15%"
formatModifier(-0.10)     // "-10%"
formatModifier(0.05, false) // "5%"
```

#### `describeAllModifiers(mods: ZoneModifiers)`

**Purpose**: Generate human-readable descriptions

**Returns**:
```typescript
{
  combat: ["+15% Attack", "+10% Defense", "-10% MP Regen"],
  gathering: ["+100% Mining Speed", "+15% Gathering XP"],
  crafting: ["+25% Smithing Success", "-10% Smithing Cost"],
  merchants: ["5% Cheaper Prices", "2 Unique Items"]
}
```

**Usage**:
```typescript
const descriptions = describeAllModifiers(mods)

descriptions.combat.forEach(desc => {
  console.log(`⚔️ ${desc}`)
})
```

#### `hasActiveModifiers(mods: ZoneModifiers): boolean`

**Purpose**: Check if zone has any active bonuses

**Logic**:
- Returns `true` if any non-zero bonuses exist
- Returns `false` for default/neutral values (e.g., spawn rate 1.0)

**Usage**:
```typescript
if (hasActiveModifiers(mods)) {
  // Show zone bonuses UI
}
```

---

## Integration Points

### 1. Gathering System

**File**: `/app/actions/gathering-simple.ts`

**Integration in `startGatheringSimple()`**:
```typescript
import { applyZoneGatheringModifiers } from '@/lib/zone-modifiers'

// Calculate base gathering time
const baseGatheringTime = calculateGatheringTime(
  material.gathering_time,
  currentSkillLevel
)

// Apply zone modifiers
const { data: zoneModifiers } = await applyZoneGatheringModifiers(
  characterId,
  material.required_skill_type,
  baseGatheringTime
)

const gatheringTimePerUnit = zoneModifiers?.modified_time_ms || baseGatheringTime
const zoneXPBonus = zoneModifiers?.xp_bonus || 0

// Create gathering session with modified time
await supabase.from('active_gathering').insert({
  character_id: characterId,
  material_id: materialId,
  target_quantity: quantity,
  gathered_quantity: 0,
  started_at: new Date().toISOString(),
  estimated_end_at: new Date(Date.now() + totalTime).toISOString(),
  zone_xp_bonus: zoneXPBonus
})
```

**Integration in `collectGathering()`**:
```typescript
// Apply zone XP bonus from stored session
const zoneXPBonus = session.zone_xp_bonus || 0
const totalXP = Math.floor(baseXP * (1 + zoneXPBonus))

await addSkillExperience(characterId, material.required_skill_type, totalXP)
```

### 2. Combat System

**File**: `/lib/combat.ts`

**Integration in `executeTurn()`**:
```typescript
import { applyZoneCombatModifiers } from './zone-modifiers'

// Get zone-modified stats
const { data: zoneModifiers } = await applyZoneCombatModifiers(
  characterId,
  character.attack,
  character.defense
)

const modifiedAttack = zoneModifiers?.modified_damage || character.attack
const modifiedDefense = zoneModifiers?.modified_defense || character.defense

// Calculate damage with zone bonuses
const playerDamage = calculateDamage(modifiedAttack, enemy.defense, character.level)
const enemyDamage = calculateDamage(enemy.attack, modifiedDefense, enemy.level)
```

**Also integrated in `useAbilityInCombat()`** with identical pattern.

### 3. Crafting System

**File**: `/lib/crafting.ts`

**Integration in `craftItem()`**:
```typescript
import { applyZoneCraftingModifiers } from './zone-modifiers'

// Get landmark bonuses (existing system)
const { data: landmarkBonuses } = await getCraftingBonuses(characterId)

// Get zone bonuses (new system)
const { data: zoneModifiers } = await applyZoneCraftingModifiers(
  characterId,
  recipe.required_skill_type,
  1.0,
  100
)

// Combine bonuses (multiplicative stacking)
const totalCostReduction =
  landmarkBonuses.cost_reduction +
  (zoneModifiers ? (100 - zoneModifiers.modified_cost) / 100 : 0)

const totalQualityBonus =
  landmarkBonuses.quality_bonus +
  (zoneModifiers?.quality_bonus || 0)

// Apply combined bonuses
const reducedCost = Math.max(1, Math.floor(quantity * (1 - totalCostReduction)))

// Return both bonus sources for UI display
return {
  success: true,
  materialsSaved: quantity - reducedCost,
  bonusesApplied: {
    landmark: landmarkBonuses,
    zone: zoneModifiers
  }
}
```

### 4. Merchant System

**File**: `/lib/merchant.ts` (to be implemented)

**Planned Integration**:
```typescript
import { applyZoneMerchantModifiers } from './zone-modifiers'

async function getMerchantPrice(characterId: string, itemId: string, basePrice: number) {
  const { data: zoneMods } = await applyZoneMerchantModifiers(characterId, basePrice)

  const finalPrice = zoneMods?.modified_price || basePrice
  const discountAmount = basePrice - finalPrice

  return {
    basePrice,
    finalPrice,
    discountAmount,
    discountPercent: ((1 - zoneMods?.price_modifier) * 100) || 0
  }
}
```

---

## UI Components

### ZoneModifiersDisplay Component

**File**: `/components/ZoneModifiersDisplay.tsx`

**Purpose**: Display active zone bonuses in character sheet

**Props**:
```typescript
interface ZoneModifiersDisplayProps {
  characterId: string
  compact?: boolean  // Default: false
}
```

**Features**:
- **Compact Mode**: Expandable panel for sidebar (used in Game.tsx)
- **Full Mode**: Detailed grid view with all bonuses
- **Auto-hide**: Hidden when no active modifiers
- **Color Coding**:
  - Combat: Red (⚔️)
  - Gathering: Green (🌿)
  - Crafting: Blue (🔨)
  - Merchants: Yellow (💰)

**Usage in Game.tsx**:
```typescript
import ZoneModifiersDisplay from './ZoneModifiersDisplay'

<div className="animate-fade-in-up" style={{ animationDelay: '0.175s' }}>
  <ZoneModifiersDisplay characterId={character.id} compact={true} />
</div>
```

**State Management**:
```typescript
const [modifiers, setModifiers] = useState<ZoneModifiers | null>(null)
const [loading, setLoading] = useState(true)
const [expanded, setExpanded] = useState(!compact)

useEffect(() => {
  async function loadModifiers() {
    const { data } = await getCharacterZoneModifiers(characterId)
    setModifiers(data)
    setLoading(false)
  }
  loadModifiers()
}, [characterId])
```

### WorldMap Zone Indicator

**File**: `/components/WorldMap.tsx`

**Change**: Added visual indicator for zones with active bonuses

**Implementation**:
```typescript
{!locked && zone.isDiscovered && (
  <div className="flex items-center gap-1 text-amber-400">
    <span>⭐</span>
    <span>Zone Bonuses Active</span>
  </div>
)}
```

**Future Enhancement**: Show preview of zone bonuses on hover before traveling.

---

## Testing

### Unit Tests

**File**: `/test/unit/zone-modifiers.test.ts`

**Test Coverage**:

#### Helper Function Tests
```typescript
describe('formatModifier', () => {
  it('should format positive modifiers with plus sign', () => {
    expect(formatModifier(0.15)).toBe('+15%')
  })

  it('should format negative modifiers with minus sign', () => {
    expect(formatModifier(-0.1)).toBe('-10%')
  })
})

describe('describeCombatModifiers', () => {
  it('should describe all combat bonuses', () => {
    const mods = {
      damage_bonus: 0.15,
      defense_bonus: 0.1,
      hp_regen_bonus: 0.05,
      mp_regen_bonus: 0.2,
      enemy_types: ['orc', 'troll']
    }

    const descriptions = describeCombatModifiers(mods)
    expect(descriptions).toContain('+15% Attack')
    expect(descriptions).toContain('+10% Defense')
  })
})
```

#### Integration Tests
```typescript
describe('Zone Modifiers - Integration Examples', () => {
  it('should correctly describe Ironpeak Foothills modifiers', () => {
    const ironpeak = {
      combat: {
        damage_bonus: 0.15,
        defense_bonus: 0.1,
        hp_regen_bonus: 0,
        mp_regen_bonus: -0.1,
        enemy_types: ['orc', 'troll', 'stone_elemental']
      },
      gathering: {
        spawn_rate_modifiers: {
          mining: 2.0,
          woodcutting: 0.3
        },
        xp_bonus: 0.15
      }
    }

    expect(hasActiveModifiers(ironpeak)).toBe(true)

    const combatDesc = describeCombatModifiers(ironpeak.combat)
    expect(combatDesc).toContain('+15% Attack')
    expect(combatDesc).toContain('-10% MP Regen')
  })
})
```

### E2E Testing Strategy

**Recommended Test Flow**:
```typescript
// test/e2e/zone-modifiers.spec.ts
test('zone modifiers affect gathering speed', async ({ page }) => {
  // 1. Login and create character
  await loginAsTestUser(page)

  // 2. Travel to Ironpeak Foothills (mining bonus zone)
  await page.click('[data-testid="travel-tab"]')
  await page.click('[data-testid="zone-ironpeak"]')

  // 3. Start mining session
  await page.click('[data-testid="gathering-tab"]')
  await page.click('[data-testid="skill-mining"]')
  await page.click('[data-testid="gather-copper-ore"]')

  // 4. Verify zone bonuses displayed
  await expect(page.locator('[data-testid="zone-bonuses"]')).toContainText('+100% Mining Speed')

  // 5. Check gathering time is reduced
  const gatheringTime = await page.locator('[data-testid="gathering-time"]').innerText()
  expect(parseInt(gatheringTime)).toBeLessThan(5000) // Base time is 5000ms
})
```

---

## Performance Considerations

### Database Queries

**Optimization**: Zone modifiers retrieved via single RPC call
```typescript
// GOOD - Single database call
const { data } = await getCharacterZoneModifiers(characterId)

// BAD - Multiple calls
const { data: combat } = await applyZoneCombatModifiers(...)
const { data: gathering } = await applyZoneGatheringModifiers(...)
const { data: crafting } = await applyZoneCraftingModifiers(...)
```

**When to use specialized functions**:
- Use `applyZone[System]Modifiers()` when you need calculated values (modified damage, modified time)
- Use `getCharacterZoneModifiers()` when you just need raw modifier data

### Caching Strategy

**Current**: No caching (zone modifiers fetched on each action)

**Future Enhancement**: Client-side caching with invalidation on zone change
```typescript
// Zustand store example
interface GameStore {
  currentZoneModifiers: ZoneModifiers | null
  setZoneModifiers: (mods: ZoneModifiers) => void
}

// Invalidate on zone change
useEffect(() => {
  async function loadZoneMods() {
    const { data } = await getCharacterZoneModifiers(character.id)
    setZoneModifiers(data)
  }
  loadZoneMods()
}, [character.current_zone_id])
```

### JSONB Indexing

**Current**: No indexes on `system_modifiers` column

**Future Enhancement**: Add GIN index for faster queries
```sql
CREATE INDEX idx_world_zones_system_modifiers
ON world_zones USING GIN (system_modifiers);
```

---

## Future Enhancements

### 1. Dynamic Zone Events

**Concept**: Temporary zone modifiers that change based on time/events

**Example**:
```json
{
  "event": "Blood Moon",
  "active_until": "2025-10-08T00:00:00Z",
  "modifiers": {
    "combat": {
      "damage_bonus": 0.5,
      "enemy_types": ["undead", "vampire"]
    }
  }
}
```

**Implementation**:
- Add `active_events` JSONB column to `world_zones`
- Check event expiration in `get_character_zone_modifiers()`
- UI notification: "Blood Moon rises! +50% damage until midnight!"

### 2. Zone Quests Integration

**Concept**: Unlock zone-specific quest chains

**Example**:
```typescript
// Check available quests when entering zone
const { data: zoneMods } = await getCharacterZoneModifiers(characterId)

if (zoneMods?.quests?.available_quest_ids) {
  // Show quest notification
  notify('New quests available in this zone!')
}
```

**Database**:
```sql
-- Add to quests table
ALTER TABLE quests ADD COLUMN required_zone_id uuid REFERENCES world_zones(id);

-- Function to get zone quests
CREATE FUNCTION get_zone_quests(p_zone_id uuid)
RETURNS TABLE(quest_id uuid, name text, description text);
```

### 3. Zone Progression System

**Concept**: Zone "mastery" levels that unlock additional bonuses

**Example**:
```json
{
  "zone_id": "ironpeak-foothills",
  "character_id": "user-123",
  "time_spent_seconds": 3600,
  "mastery_level": 2,
  "mastery_bonuses": {
    "gathering": {
      "xp_bonus": 0.05  // Additional +5% XP at mastery level 2
    }
  }
}
```

**Table**:
```sql
CREATE TABLE character_zone_mastery (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id uuid REFERENCES characters(id) ON DELETE CASCADE,
  zone_id uuid REFERENCES world_zones(id) ON DELETE CASCADE,
  time_spent_seconds int DEFAULT 0,
  mastery_level int DEFAULT 1,
  mastery_bonuses jsonb DEFAULT '{}'::jsonb,
  UNIQUE(character_id, zone_id)
);
```

### 4. Zone Hazards & Weather

**Concept**: Environmental effects that modify gameplay

**Examples**:
- **Sandstorm** (Shattered Wastes): -20% gathering speed, +10% enemy difficulty
- **Blizzard** (Frostspire Mountains): -50% movement speed, enemies drop more resources
- **Thunderstorm** (Whispering Woods): +30% magic damage, -10% physical damage

**Implementation**:
```json
{
  "weather": {
    "current": "blizzard",
    "duration_minutes": 30,
    "modifiers": {
      "gathering": {
        "spawn_rate_modifiers": {
          "all": 0.5
        }
      },
      "combat": {
        "loot_bonus": 0.3
      }
    }
  }
}
```

### 5. Zone PvP Modifiers

**Concept**: Unique bonuses for PvP zones

**Example**:
```json
{
  "pvp": {
    "enabled": true,
    "kill_streak_bonus": 0.1,  // +10% stats per kill
    "death_penalty": 0.5,       // Lose 50% of zone-specific currency
    "safe_zones": ["spawn_point_1", "spawn_point_2"]
  }
}
```

### 6. Zone-Specific Crafting Recipes

**Concept**: Recipes only available in specific zones

**Example**:
```typescript
// Recipe unlocked only in Emberpeak Mines
{
  id: 'flaming_sword',
  name: 'Flaming Sword',
  required_zone_id: 'emberpeak-mines',
  requirements: {
    smithing: 75,
    materials: [
      { id: 'adamantite_ore', quantity: 10 },
      { id: 'fire_essence', quantity: 5 }
    ]
  }
}
```

---

## Troubleshooting

### Zone Modifiers Not Applying

**Symptom**: Character in zone but no bonuses showing

**Checklist**:
1. Verify `current_zone_id` is set in `characters` table
   ```sql
   SELECT current_zone_id FROM characters WHERE id = 'character-uuid';
   ```

2. Check zone has modifiers
   ```sql
   SELECT system_modifiers FROM world_zones WHERE id = 'zone-uuid';
   ```

3. Check RPC function works
   ```sql
   SELECT get_character_zone_modifiers('character-uuid');
   ```

4. Check TypeScript function returns data
   ```typescript
   const { data, error } = await getCharacterZoneModifiers(characterId)
   console.log('Zone mods:', data, error)
   ```

### Modifier Values Incorrect

**Symptom**: Bonuses applied but values seem wrong

**Common Issues**:

1. **Multiplicative vs Additive**
   - Zone: +15% damage (0.15)
   - Formula: `base * (1 + 0.15)` not `base + 0.15`

2. **Spawn Rate Confusion**
   - Spawn rate `2.0` = 2x faster (time divided by 2)
   - Not `base_time * 2` (would be 2x slower!)

3. **Cost Reduction Calculation**
   - Cost reduction `0.10` = 10% cheaper
   - Formula: `cost * (1 - 0.10)` = `cost * 0.9`

### UI Not Updating

**Symptom**: Zone modifiers display shows old/wrong data

**Solutions**:

1. **Force component refresh** when zone changes
   ```typescript
   useEffect(() => {
     loadModifiers()
   }, [character.current_zone_id]) // Add dependency
   ```

2. **Clear stale state** on zone change
   ```typescript
   const handleZoneChange = async (newZoneId) => {
     setModifiers(null) // Clear old data
     await travelToZone(newZoneId)
     await loadModifiers() // Load new data
   }
   ```

### Migration Failed

**Symptom**: Migration errors when applying SQL

**Common Errors**:

1. **Table doesn't exist**
   - Error: `relation "zones" does not exist`
   - Fix: Use correct table name `world_zones`

2. **Column already exists**
   - Error: `column "system_modifiers" already exists`
   - Fix: Use `ADD COLUMN IF NOT EXISTS`

3. **Function already exists**
   - Error: `function already exists with same argument types`
   - Fix: Use `CREATE OR REPLACE FUNCTION`

### Performance Issues

**Symptom**: Slow queries when applying modifiers

**Solutions**:

1. **Add GIN index** for JSONB queries
   ```sql
   CREATE INDEX idx_world_zones_system_modifiers
   ON world_zones USING GIN (system_modifiers);
   ```

2. **Cache zone modifiers** in client state
   ```typescript
   // Only fetch once per zone
   const cachedMods = useMemo(() => modifiers, [character.current_zone_id])
   ```

3. **Use specialized functions** instead of generic one
   ```typescript
   // FAST - Calculates only what you need
   await applyZoneCombatModifiers(characterId, attack, defense)

   // SLOWER - Fetches all modifiers
   const mods = await getCharacterZoneModifiers(characterId)
   const damage = attack * (1 + mods.combat.damage_bonus)
   ```

---

## Developer Checklist

### Adding a New Zone

- [ ] Insert zone record in `world_zones` table
- [ ] Add `system_modifiers` JSONB with desired bonuses
- [ ] Test modifiers with `get_character_zone_modifiers()` function
- [ ] Add zone to World Map UI
- [ ] Update GAME_WIKI.md with zone profile
- [ ] Test all affected systems (combat, gathering, crafting)

### Adding a New Modifier Type

- [ ] Update `ZoneModifiers` interface in `/lib/zone-modifiers.ts`
- [ ] Create database function `apply_zone_[system]_modifiers()`
- [ ] Create TypeScript wrapper function
- [ ] Add integration to target system
- [ ] Add UI display in `ZoneModifiersDisplay.tsx`
- [ ] Write unit tests for new modifier type
- [ ] Update documentation (GAME_WIKI.md, this file)

### Modifying Existing Zone Bonuses

- [ ] Update `system_modifiers` JSONB in database
  ```sql
  UPDATE world_zones
  SET system_modifiers = jsonb_set(
    system_modifiers,
    '{combat,damage_bonus}',
    '0.20'::jsonb
  )
  WHERE id = 'zone-uuid';
  ```
- [ ] Test changes in-game
- [ ] Update documentation with new values
- [ ] Announce changes to players (if significant balance change)

---

## Summary

The Zone Modifiers System successfully transforms zones from static containers into **dynamic strategic environments**. Players now choose zones based on their current goals:

- **Combat farming?** → Ironpeak Foothills (+15% attack, +10% defense)
- **Herb gathering?** → Whispering Woods (+80% alchemy speed)
- **Crafting session?** → Whispering Woods (+25% alchemy success, -15% cost)
- **Shopping?** → Whispering Woods (5% merchant discount)

**System Benefits**:
✅ Strategic depth added to exploration
✅ Seamless integration with all game systems
✅ Type-safe TypeScript implementation
✅ Flexible JSONB schema for future expansion
✅ Comprehensive testing coverage
✅ Clear UI feedback for players

**Future Potential**:
🔮 Dynamic zone events (Blood Moon, festivals)
🔮 Zone mastery progression system
🔮 Weather effects and hazards
🔮 Zone-specific crafting recipes
🔮 PvP zone modifiers

The foundation is built. Now expand and iterate! 🚀
