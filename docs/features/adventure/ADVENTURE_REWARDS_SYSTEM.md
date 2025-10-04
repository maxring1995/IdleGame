# Adventure Rewards System

## Overview
The new Adventure Rewards System transforms exploration into an exciting treasure hunt with rewards at **every 1% of progress**, not just every 10%. The system features **200+ unique adventure-specific items** spanning all equipment types and rarities.

## 🎁 Reward System Features

### Per-Percent Rewards
- **Chance at every 1%**: Players have a chance to receive rewards at each percentage point of exploration progress
- **Escalating probability**: Reward chance increases with progress (5% at 1% → 95% at 100% in highest zones)
- **Multiple items**: Each reward can grant 1-3 items from the zone's loot table
- **Gold & XP scaling**: Both gold and experience rewards scale with progress percentage

### Reward Tiers by Zone

| Zone | Level Range | Base Chance | Max Chance | Gold Range | XP Range | Rarity Focus |
|------|-------------|-------------|------------|------------|----------|--------------|
| **Havenbrook** | 1-5 | 5% | 35% | 2-500 | 5-1,000 | Common/Uncommon |
| **Whispering Woods** | 5-10 | 8% | 45% | 10-1,000 | 15-3,000 | Uncommon/Rare |
| **Ironpeak Foothills** | 10-15 | 10% | 55% | 25-2,500 | 30-6,000 | Rare |
| **Crystalmere Lake** | 15-20 | 12% | 65% | 50-5,000 | 60-12,000 | Rare/Epic |
| **Shadowfen Marsh** | 20-25 | 15% | 75% | 100-10,000 | 100-20,000 | Epic |
| **Thornveil Thicket** | 25-30 | 18% | 85% | 200-20,000 | 200-40,000 | Epic/Legendary |
| **Emberforge Depths** | 30+ | 20% | 95% | 500-50,000 | 500-100,000 | Legendary |

## 📦 New Adventure Items (200+)

### Equipment Categories

#### Weapons (50 items)
- **Zone-specific themes**: Each zone has unique weapon styles
  - Havenbrook: Basic starter weapons (clubs, daggers)
  - Whispering Woods: Elven weapons (blades, bows)
  - Ironpeak: Mountain weapons (axes, hammers)
  - Crystalmere: Magical weapons (staves, tridents)
  - Shadowfen: Dark weapons (venomous, cursed)
  - Thornveil: Nature weapons (thornblades, greatbows)
  - Emberforge: Legendary weapons (lava, dragon-slayer)

- **Example Items**:
  - `adv_wooden_club` - Traveler's Club (Common, +8 ATK)
  - `adv_elven_blade` - Elven Longblade (Rare, +25 ATK)
  - `adv_dragon_slayer` - Dragonslayer Greatsword (Legendary, +95 ATK)

#### Armor (114 items)
- **Helmets** (20 items): Explorer's Cap → Ancient Warlord Mask
- **Chest Armor** (25 items): Traveler's Tunic → Starforged Armor
- **Legs** (18 items): Traveler's Pants → Ancient Warlord Greaves
- **Boots** (18 items): Traveler's Shoes → Ancient Warlord Sabatons
- **Gloves** (18 items): Traveler's Gloves → Ancient Warlord Gauntlets
- **Rings** (15 items): Copper Ring → Ancient Warlord Ring
- **Amulets** (15 items): Wooden Amulet → Ancient Warlord Amulet

#### Consumables (20 items)
- **Healing**: Wild Berry, Healing Herb, Greater Health Potion, Phoenix Tear
- **Mana**: Glowing Mushroom, Mana Crystal Shard, Greater Mana Potion
- **Hybrid**: Forest Honey, Adventurer's Elixir, Rejuvenation Potion
- **Legendary**: Ambrosia (1000 HP/500 MP), Immortality Elixir
- **Buff Potions**: Strength, Defense, Speed, Luck, Experience, Gold Fortune

### Rarity Distribution

| Rarity | Count | Drop Weight | Visual Color |
|--------|-------|-------------|--------------|
| Common | 30 | High (100) | Gray |
| Uncommon | 45 | Medium-High (60-80) | Green |
| Rare | 50 | Medium (40-60) | Blue |
| Epic | 45 | Low (20-40) | Purple |
| Legendary | 30 | Very Low (3-10) | Yellow/Gold |

## 🔧 Technical Implementation

### Database Schema

#### `exploration_rewards_config` Table
```sql
- id: UUID
- zone_id: UUID (FK to world_zones)
- progress_percent: INTEGER (1-100)
- reward_chance: NUMERIC(4,3) (0.000-1.000)
- loot_table: JSONB {item_id: drop_weight}
- gold_min/gold_max: INTEGER
- xp_min/xp_max: INTEGER
```

#### `exploration_rewards_log` Table
```sql
- id: UUID
- character_id: UUID (FK to characters)
- zone_id: UUID (FK to world_zones)
- progress_percent: INTEGER
- items_received: JSONB (array of item_ids)
- gold_received: INTEGER
- xp_received: INTEGER
- created_at: TIMESTAMPTZ
```

#### `active_explorations` Table (Updated)
```sql
+ last_reward_percent: INTEGER DEFAULT 0
```

### Reward Algorithm

1. **Progress Calculation**: Every second, calculate current exploration progress (1% per 30 seconds)
2. **Per-Percent Check**: For each new percent reached (since last check):
   - Fetch reward config for that percent
   - Roll random number against `reward_chance`
   - If successful, roll 1-3 items from weighted loot table
   - Calculate gold/XP within min/max range
   - Award items, gold, and XP to character
   - Log reward in `exploration_rewards_log`
3. **Weighted Random**: Items selected using weighted probability (higher weight = more common)

### Key Functions

#### `lib/exploration.ts`
- `rollLootTable(lootTable)` - Weighted random item selection
- `checkExplorationRewards(characterId, zoneId, currentProgress, lastRewardPercent)` - Main reward logic
- `processExploration(characterId)` - Updated to include reward checking

#### `components/ExplorationPanel.tsx`
- Real-time reward display with item details
- Color-coded rarity badges
- Scrollable reward history (last 10 rewards)
- Shows gold, XP, and items with full names

## 🎮 Player Experience

### Reward Feedback
- **Visual**: Animated reward cards with rarity-based colors
- **Audio**: (Future enhancement) Different sounds per rarity
- **Travel Log**: Each reward logged with summary text
- **Inventory**: Items automatically added to inventory

### Example Exploration Session (Emberforge Depths, Level 30)

| Progress | Chance | Potential Reward |
|----------|--------|------------------|
| 1% | 21% | 500-600 gold, 500-650 XP, 1-3 items |
| 25% | 45% | 3,000-4,000 gold, 4,000-6,000 XP, 1-3 items |
| 50% | 70% | 5,500-8,000 gold, 8,000-13,000 XP, 1-3 items |
| 75% | 85% | 8,000-12,000 gold, 12,000-19,000 XP, 1-3 items |
| 100% | 95% | 10,500-15,000 gold, 15,000-25,000 XP, 1-3 items |

**Expected Rewards** (100% exploration):
- **Total Rolls**: ~100 attempts (one per percent)
- **Expected Successful Rolls**: ~60 rewards (average 60% success rate)
- **Expected Items**: 60-180 items (1-3 per reward)
- **Total Gold**: ~300,000-800,000 gold
- **Total XP**: ~500,000-1,500,000 XP

## 🚀 Usage

### For Players
1. Start exploration in any zone
2. Watch progress bar fill (1% every 30 seconds)
3. Rewards appear automatically in the "Recent Rewards" section
4. Items are added to inventory immediately
5. Check Travel Log for reward history

### For Developers
1. Add new items to the `items` table with `adv_` prefix
2. Update zone's reward config in `exploration_rewards_config`
3. Adjust loot weights in the `loot_table` JSONB column
4. Test with different zone levels

## 📊 Reward Config Examples

### High-Level Zone (Emberforge Depths)
```json
{
  "zone_id": "00000000-0000-0000-0000-000000000007",
  "progress_percent": 95,
  "reward_chance": 0.95,
  "loot_table": {
    "adv_dragon_slayer": 6,
    "adv_phoenix_staff": 8,
    "adv_ancient_armor": 4,
    "adv_void_ring": 8,
    "adv_ambrosia": 30
  },
  "gold_min": 10000,
  "gold_max": 15000,
  "xp_min": 15000,
  "xp_max": 25000
}
```

### Low-Level Zone (Havenbrook)
```json
{
  "zone_id": "00000000-0000-0000-0000-000000000001",
  "progress_percent": 50,
  "reward_chance": 0.20,
  "loot_table": {
    "adv_berry": 100,
    "adv_wooden_club": 5,
    "adv_cloth_tunic": 10,
    "adv_copper_ring": 3
  },
  "gold_min": 100,
  "gold_max": 150,
  "xp_min": 150,
  "xp_max": 250
}
```

## 🔮 Future Enhancements

1. **Set Bonuses**: Matching adventure gear provides set bonuses
2. **Achievement Tracking**: Track total rewards found, rarest items, etc.
3. **Reward Multipliers**: Events/buffs that increase reward chances
4. **Seasonal Items**: Limited-time adventure items
5. **Treasure Maps**: Special items that boost reward chances in specific zones
6. **Luck Stat**: New character stat affecting reward probability

## 📝 Migration Info

- **Migration File**: `20241006000000_add_exploration_rewards_system.sql`
- **Items Added**: 200+ adventure items
- **Configs Created**: 700 reward configs (7 zones × 100 progress points)
- **Dependencies**: Requires all previous migrations to be applied

## 🎯 Design Goals

✅ **Engagement**: Frequent rewards keep players engaged
✅ **Progression**: Rewards scale with zone difficulty and character level
✅ **Variety**: 200+ unique items prevent repetition
✅ **Balance**: Weighted loot tables ensure appropriate rarity distribution
✅ **Feedback**: Clear visual/textual feedback for all rewards
✅ **Persistence**: All rewards logged for analytics and future features

---

**Status**: ✅ Implemented and Ready for Testing
**Last Updated**: October 2024
**Version**: 1.0
