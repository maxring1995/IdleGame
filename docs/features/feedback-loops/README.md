# 🔄 Cross-System Feedback Loops

**Status**: ✅ Implemented (Database & Backend Complete)
**Version**: 1.0.0
**Date**: 2025-10-06

## Overview

The Cross-System Feedback Loops feature creates **interconnected progression** where advancement in one system enhances performance in others, creating a rich web of synergies and rewards that encourage diverse gameplay.

### Core Concept

Instead of isolated progression:
```
❌ OLD: Combat → XP/Gold → Level Up (isolated systems)
```

We now have interconnected progression:
```
✅ NEW: Combat → XP/Gold/Skill XP → Level Up → Unlock Zones →
        New Gathering → Better Crafting → Better Equipment →
        Easier Combat + Gathering Bonuses
```

---

## 🎯 Implemented Features

### 1. **Skill Requirements for Zone Access** ✅

Zones can now require specific skill levels for access, not just character levels.

**Database**: `zone_skill_requirements` table
- Zone ID + Skill Type + Required Level
- Optional vs. required skills
- Example: "Whispering Woods requires Woodcutting 30"

**Functions**:
- `check_zone_skill_requirements(character_id, zone_id)` - Returns meets requirements + missing skills
- `getZoneSkillRequirements(zoneId)` - Get all requirements for a zone

**Example**:
```typescript
const { data } = await checkZoneSkillRequirements(characterId, zoneId)
if (!data.meets_requirements) {
  console.log('Missing:', data.missing_requirements)
  // [{ skill_type: 'woodcutting', required_level: 30, current_level: 15 }]
}
```

---

### 2. **Combat Skills Unlock Gathering/Crafting Bonuses** ✅

Progressing combat skills grants **permanent passive bonuses** to gathering and crafting.

**Database**: `skill_synergy_bonuses` table
- 24 synergies implemented covering all skills
- Source skill + level → Target category + bonus type + value

**Synergies Implemented**:

#### General Combat → Gathering (applies to ALL gathering skills)
- **Attack 25**: +5% gathering speed
- **Attack 50**: +10% gathering speed
- **Attack 75**: +15% gathering speed
- **Attack 99**: +25% gathering speed
- **Defense 25/50/75**: +3%/5%/8% gathering yield
- **Constitution 40/80**: +10%/20% stamina (longer sessions)

#### Specific Stat → Gathering Skill
- **Strength 30/60** → Woodcutting/Mining: +10%/20% speed
- **Agility 30/60** → Fishing/Hunting: +10%/20% speed
- **Intelligence 30/60** → Alchemy/Magic: +10%/20% quality

#### Combat → Crafting
- **Attack 50**: +10% crafting speed
- **Defense 50**: +5% crafting quality
- **Intelligence 50**: +10% crafting quality

**Functions**:
- `get_character_synergy_bonuses(character_id)` - Get all active synergies
- `get_gathering_speed_bonus(character_id, skill_type)` - Calculate total speed bonus
- `calculateGatheringTime(baseTime, skillLevel, speedBonus)` - Apply bonuses

**Example**:
```typescript
// Player with Attack 75 and Strength 60
const { data: bonuses } = await getCharacterSynergyBonuses(characterId)
// Returns:
// - "Warrior's Efficiency III": +15% all gathering
// - "Master Miner": +20% mining speed
// Total mining speed bonus: +35%!
```

---

### 3. **Exploration Landmarks Grant Crafting Bonuses** ✅

Discovering landmarks grants **permanent crafting improvements**.

**Database**: Extended `zone_landmarks` and `character_landmark_bonuses` tables
- Added: `crafting_quality_bonus`, `crafting_speed_bonus`, `crafting_cost_reduction`

**Bonuses by Landmark Type**:
- **Crafting Landmarks**: +10% quality, +15% speed, +10% cost reduction
- **Shrines**: +3% quality, +5% speed
- **Ruins**: +5% quality, +5% cost reduction (ancient knowledge)
- **Lore Locations**: +8% quality (wisdom)
- **Vendors**: +10% speed, +15% cost reduction (tips and deals)

**Functions**:
- `get_character_crafting_bonuses(character_id)` - Total bonuses from all landmarks
- `applyCraftingBonuses(baseTime, baseCost, bonuses)` - Apply to recipes

**Example**:
```typescript
// Player discovers 3 crafting landmarks, 2 shrines, 1 vendor
const { data: bonuses } = await getCraftingBonuses(characterId)
// Returns:
// - quality_bonus: 0.36 (36% better quality chance)
// - speed_bonus: 0.60 (60% faster crafting!)
// - cost_reduction: 0.45 (45% cheaper materials)
```

---

### 4. **Quest Completion Grants Permanent Merchant Discounts** ✅

Completing quests can now grant **permanent bonuses** including merchant discounts.

**Database**: `character_permanent_bonuses` table
- Tracks all permanent bonuses from any source
- Bonus type + value + source (quest/achievement/event)
- Can expire (time-limited) or be permanent

**Functions**:
- `grant_permanent_bonus(...)` - Award bonus (called from quest completion)
- `get_character_merchant_discount(character_id)` - Total discount (capped at 75%)
- `calculateMerchantPrice(basePrice, discount)` - Apply discount

**Example**:
```typescript
// Quest "Merchant's Friend" completed
await grantPermanentBonus(
  characterId,
  'merchant_discount',
  0.05, // 5%
  'quest',
  questId,
  "Merchant's Friend Discount",
  "The merchant remembers your kindness"
)

// Later when buying
const { data: discount } = await getMerchantDiscount(characterId)
const finalPrice = calculateMerchantPrice(1000, discount) // 950 gold
```

---

### 5. **Unified Bonus System** ✅

Single function to retrieve **ALL active bonuses** for a character.

**Function**: `get_all_character_bonuses(character_id)`

Returns JSONB with:
```json
{
  "landmark_bonuses": {
    "attack": 5, "defense": 3, "health": 20, "mana": 15,
    "xp_bonus": 0.15, "gold_find_bonus": 0.10,
    "crafting_quality": 0.20, "crafting_speed": 0.30, ...
  },
  "crafting_bonuses": {
    "quality_bonus": 0.20, "speed_bonus": 0.30, "cost_reduction": 0.15
  },
  "synergy_bonuses": [
    {
      "display_name": "Warrior's Efficiency III",
      "description": "Combat expertise makes you 15% faster at all gathering skills",
      "bonus_value": 0.15, "bonus_type": "speed", ...
    }
  ],
  "permanent_bonuses": [
    {
      "display_name": "Merchant's Friend Discount",
      "bonus_type": "merchant_discount", "bonus_value": 0.05, ...
    }
  ],
  "merchant_discount": 0.15
}
```

---

## 📊 Database Schema

### New Tables

**`zone_skill_requirements`**
```sql
- id UUID PRIMARY KEY
- zone_id UUID → world_zones
- skill_type TEXT
- required_level INTEGER
- is_optional BOOLEAN
```

**`skill_synergy_bonuses`**
```sql
- id UUID PRIMARY KEY
- source_skill_type TEXT (e.g., 'attack', 'strength')
- required_level INTEGER
- target_skill_type TEXT (NULL = all in category)
- target_category TEXT ('gathering', 'crafting', 'combat')
- bonus_type TEXT ('speed', 'quality', 'yield', 'stamina')
- bonus_value DECIMAL(5,3)
- display_name, description, icon TEXT
```

**`character_permanent_bonuses`**
```sql
- id UUID PRIMARY KEY
- character_id UUID → characters
- bonus_type TEXT ('merchant_discount', 'xp_bonus', etc.)
- bonus_value DECIMAL(5,3)
- source_type TEXT ('quest', 'achievement', 'event')
- source_id UUID (reference to source)
- display_name, description TEXT
- granted_at, expires_at TIMESTAMPTZ
- is_active BOOLEAN
```

### Extended Tables

**`zone_landmarks`** - Added:
- `crafting_quality_bonus DECIMAL(3,2)`
- `crafting_speed_bonus DECIMAL(3,2)`
- `crafting_cost_reduction DECIMAL(3,2)`

**`character_landmark_bonuses`** - Added same 3 columns

---

## 🔧 API Functions

### Zone Skill Requirements
- ✅ `check_zone_skill_requirements(character_id, zone_id)` - Check if meets requirements
- ✅ `getZoneSkillRequirements(zoneId)` - Get all requirements for zone

### Skill Synergies
- ✅ `get_character_synergy_bonuses(character_id)` - All active synergies
- ✅ `get_gathering_speed_bonus(character_id, skill)` - Speed bonus for skill
- ✅ `getAllSynergyBonuses()` - Reference data (all possible synergies)

### Crafting Bonuses
- ✅ `get_character_crafting_bonuses(character_id)` - Total crafting bonuses
- ✅ `applyCraftingBonuses(baseTime, baseCost, bonuses)` - Apply to recipe

### Permanent Bonuses
- ✅ `grant_permanent_bonus(...)` - Award bonus to character
- ✅ `get_character_merchant_discount(character_id)` - Total discount
- ✅ `getPermanentBonuses(characterId)` - All active bonuses
- ✅ `calculateMerchantPrice(basePrice, discount)` - Apply discount

### Unified System
- ✅ `get_all_character_bonuses(character_id)` - ALL bonuses in one call

### Utility Functions
- ✅ `calculateGatheringTime(baseTime, skillLevel, speedBonus)` - Final gather time
- ✅ `formatBonusPercent(value)` - Format for display (0.05 → "+5%")
- ✅ `getBonusColor(bonusType)` - Tailwind color class for bonus type

---

## 🎮 Gameplay Impact

### Example: Level 1 → Level 50 Progression

**Level 1 Character:**
- Combat: 5 mins to kill enemy
- Gathering: 10 seconds per resource
- Crafting: 30 seconds per item
- Merchant prices: 100% (full price)
- Zones: Only starter zone

**Level 50 Character (with synergies):**
- Combat: 2 mins to kill enemy (better gear from crafting)
- Gathering: 4 seconds per resource (Attack 50 = +10%, Strength 60 = +20%)
- Crafting: 12 seconds per item (Attack 50 = +10% speed, landmarks = +30%)
- Merchant prices: 85% (3 quests completed = 15% discount)
- Zones: Unlocked 5 new zones (met skill requirements)

**Result**: 2.5x faster progression, more engaging gameplay, rewards for diverse activities!

---

## 📈 Future Enhancements (Phase 2)

### Not Yet Implemented (UI Layer)

These features are **database-ready** but need UI integration:

- [ ] Zone UI showing skill requirements (red/yellow/green indicators)
- [ ] Crafting UI showing active bonus sources ("+ 15% from Shrines")
- [ ] Gathering UI showing speed bonuses with breakdown
- [ ] "Bonuses" tab in character sheet showing all active bonuses
- [ ] Visual notifications when unlocking new synergies
- [ ] Merchant UI showing applied discount percentage
- [ ] Quest rewards preview showing permanent bonuses

### Additional Features to Consider

- [ ] Class-specific synergies (Warrior gets better mining bonuses)
- [ ] Negative synergies (combat fatigue reduces crafting speed temporarily)
- [ ] Synergy milestones (unlock special abilities at bonus thresholds)
- [ ] Bonus caps and diminishing returns for balance
- [ ] Seasonal events modifying synergy values
- [ ] Guild bonuses (shared synergies with guild members)

---

## 🧪 Testing

### Manual Testing Checklist

- [ ] Create character, level attack to 25, verify gathering speed bonus
- [ ] Discover crafting landmark, verify crafting bonuses apply
- [ ] Complete quest that grants merchant discount, verify prices reduced
- [ ] Try accessing zone with skill requirement, verify blocking
- [ ] Level up required skill, verify zone unlocks
- [ ] Check unified bonus API returns all bonuses correctly

### Unit Tests Needed

- [ ] `calculateGatheringTime()` with various bonuses
- [ ] `applyCraftingBonuses()` with edge cases
- [ ] `calculateMerchantPrice()` with discount caps
- [ ] Bonus stacking logic (multiple sources)

### E2E Tests Needed

- [ ] Full progression: Combat → Gathering speed bonus → Faster materials → Better crafting
- [ ] Quest completion → Merchant discount → Cheaper purchases
- [ ] Zone unlocking based on skill requirements

---

## 📚 Documentation

### Files Created/Updated

**Database:**
- ✅ `/supabase/migrations/20250106100000_add_cross_system_feedback_loops.sql`

**TypeScript:**
- ✅ `/lib/supabase.ts` - Added types for new tables
- ✅ `/lib/bonuses.ts` - Complete bonus system library (NEW)

**Documentation:**
- ✅ `/docs/features/feedback-loops/README.md` (this file)
- ⏳ `/docs/GAME_WIKI.md` - Update with feedback loop system
- ⏳ `/CLAUDE.md` - Add feedback loop references

---

## 💡 Developer Guide

### How to Use in Your Code

**1. Check zone access:**
```typescript
import { checkZoneSkillRequirements } from '@/lib/bonuses'

const { data } = await checkZoneSkillRequirements(characterId, zoneId)
if (!data.meets_requirements) {
  showError(`You need: ${data.missing_requirements.map(r =>
    `${r.skill_type} level ${r.required_level}`
  ).join(', ')}`)
}
```

**2. Apply gathering bonuses:**
```typescript
import { getGatheringSpeedBonus, calculateGatheringTime } from '@/lib/bonuses'

const { data: speedBonus } = await getGatheringSpeedBonus(characterId, 'woodcutting')
const finalTime = calculateGatheringTime(
  material.gathering_time_ms,
  characterSkillLevel,
  speedBonus
)
```

**3. Apply crafting bonuses:**
```typescript
import { getCraftingBonuses, applyCraftingBonuses } from '@/lib/bonuses'

const { data: bonuses } = await getCraftingBonuses(characterId)
const { time, cost, quality } = applyCraftingBonuses(
  recipe.crafting_time_ms,
  recipe.material_cost,
  bonuses
)
```

**4. Grant quest reward:**
```typescript
import { grantPermanentBonus } from '@/lib/bonuses'

await grantPermanentBonus(
  characterId,
  'merchant_discount',
  0.05,
  'quest',
  questId,
  'Merchant Friend Discount',
  'Your reputation precedes you'
)
```

**5. Show all bonuses:**
```typescript
import { getAllCharacterBonuses } from '@/lib/bonuses'

const { data: bonuses } = await getAllCharacterBonuses(characterId)
console.log('Active synergies:', bonuses.synergy_bonuses)
console.log('Merchant discount:', bonuses.merchant_discount)
```

---

## 🎉 Summary

This system creates a **living, breathing world** where player choices matter and everything connects:

✅ **Combat skill** makes you a **better gatherer**
✅ **Exploring** makes you a **better crafter**
✅ **Helping NPCs** gives you **better prices**
✅ **Raising skills** unlocks **new zones**
✅ **Everything enhances everything else**

The groundwork is complete - now it's time to bring it to life in the UI!
