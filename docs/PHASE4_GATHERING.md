## Phase 4: Gathering & Crafting System 🌾

**Status:** ✅ COMPLETE
**Completed:** 2025-10-02
**Goal:** Implement comprehensive gathering system with 6 skills, material collection, and skill progression (Level 1-99)

---

## 📋 Overview

The Gathering System provides deep skill-based progression inspired by classic MMORPGs. Players gather materials from 6 unique skills (Woodcutting, Mining, Fishing, Hunting, Alchemy, Magic), each with individual leveling from 1-99, progressive resource tiers, and world zone gating.

## ✅ Implementation Complete

### Phase 4.1: Database Schema ✅
**Files Created:**
- `supabase/migrations/20241004000000_add_gathering_system.sql`
- `supabase/migrations/20241004100000_add_material_items.sql`

**Tables Deployed:**
- `materials` - 50+ gatherable resources (wood, ore, fish, pelts, herbs, runes)
- `gathering_nodes` - Resource spawn locations across world zones
- `crafting_recipes` - Crafting system foundation (Phase 5)
- `active_gathering` - Tracks ongoing gathering sessions

**Seed Data:**
- 5 Woodcutting materials (Oak → Magic Logs)
- 7 Mining ores + 5 Gemstones
- 8 Fishing materials (Shrimp → Manta Ray)
- 8 Hunting materials (Rabbit Meat → Phoenix Feather)
- 10 Alchemy herbs (Guam → Torstol)
- 9 Magic essences & runes (Air Essence → Soul Rune)
- 50+ gathering nodes across 5 world zones

### Phase 4.2: TypeScript Types ✅
**File Updated:**
- `lib/supabase.ts`

**New Types:**
```typescript
Material, MaterialWithDetails, GatheringNode,
CraftingRecipe, ActiveGathering, GatheringSession,
GatheringSkillType, MaterialType, NodeType
```

### Phase 4.3: Backend Logic ✅
**Files Created:**
- `lib/materials.ts` - Material queries and skill management
- `lib/gathering.ts` - Gathering session logic
- `lib/crafting.ts` - Crafting system (foundation)
- `app/api/skills/get/route.ts` - Skills API endpoint

**Key Functions:**
```typescript
// Materials
getMaterialsBySkill(skillType)
getMaterialsWithDetails(characterId, skillType)
addMaterialToInventory(characterId, materialId, quantity)
addSkillExperience(characterId, skillType, xp)

// Gathering
startGathering(characterId, materialId, quantity)
getGatheringSession(characterId)
processGathering(characterId)
completeGathering(characterId)
cancelGathering(characterId)
calculateGatheringTime(baseTime, skillLevel)

// Crafting (Phase 5 expansion)
getAllRecipes()
checkIngredients(characterId, recipeId)
craftItem(characterId, recipeId)
```

### Phase 4.4: Frontend Components ✅
**Files Created:**
- `components/Gathering.tsx` - Main gathering tab with 8 skill buttons
- `components/GatheringSkillPanel.tsx` - Resource browser, active session tracker
- `components/MaterialInventory.tsx` - Material storage viewer
- `components/CraftingPanel.tsx` - Crafting placeholder (Phase 5)

**File Updated:**
- `components/Game.tsx` - Added Gathering tab integration

**Features:**
- Real-time gathering progress bars
- Auto-gather toggle (continuous gathering)
- Skill XP tracking with progress bars
- Material filtering by skill type
- Lock indicators for level-gated materials
- Rarity-based visual styling

### Phase 4.5: Testing ✅
**Files Created:**
- `tests/gathering.spec.ts` - 15 E2E Playwright tests
- `lib/__tests__/gathering.test.ts` - Unit tests for gathering calculations

**Test Coverage:**
- ✅ Gathering tab navigation
- ✅ Skill panel display for all 6 skills
- ✅ Start/complete/cancel gathering sessions
- ✅ Material addition to inventory
- ✅ XP gain and skill leveling
- ✅ Multi-quantity gathering (x10)
- ✅ Level-gated material locks
- ✅ Auto-gather toggle functionality
- ✅ Skill switching
- ✅ Efficiency calculations
- ✅ XP curve validation

### Phase 4.6: Documentation ✅
**Files Created:**
- `docs/PHASE4_GATHERING.md` (this file)

**Files Updated:**
- `CLAUDE.md` - Gathering system reference
- `README.md` - Feature list update

---

## 🎮 Gathering Skills

### 1. 🪓 Woodcutting
**Purpose:** Gather wood for crafting bows, furniture, and staffs

**Materials by Tier:**
| Tier | Material    | Level | XP  | Time | Value | Zone Level |
|------|-------------|-------|-----|------|-------|------------|
| 1    | Oak Log     | 1     | 25  | 3s   | 5g    | 1          |
| 2    | Willow Log  | 15    | 50  | 4s   | 15g   | 11         |
| 3    | Maple Log   | 30    | 100 | 5s   | 35g   | 25         |
| 4    | Yew Log     | 45    | 200 | 6s   | 75g   | 40         |
| 5    | Magic Log   | 75    | 500 | 8s   | 200g  | 70         |

### 2. ⛏️ Mining
**Purpose:** Extract ores and gems for smithing and jewelry

**Materials:**
- **Ores:** Copper, Tin, Iron, Coal, Mithril, Adamantite, Runite
- **Gems:** Sapphire, Emerald, Ruby, Diamond, Dragonstone

**Special:** Gems have lower stack limits (50-100 vs 1000)

### 3. 🎣 Fishing
**Purpose:** Catch fish for cooking and alchemy

**Progression:** Shrimp → Sardine → Trout → Salmon → Lobster → Swordfish → Shark → Manta Ray

**Features:** Fastest base gathering times (2-10 seconds)

### 4. 🏹 Hunting
**Purpose:** Hunt creatures for pelts, hides, and rare materials

**Materials:**
- **Low Tier:** Rabbit Meat, Wolf Pelt
- **Mid Tier:** Bear Hide, Deer Antlers
- **High Tier:** Drake Scales, Chimera Fur
- **Legendary:** Dragon Hide, Phoenix Feather

### 5. 🧪 Alchemy
**Purpose:** Harvest herbs for brewing potions

**Herbs (Tier 1-9):**
Guam, Marrentill, Tarromin, Harralander, Ranarr Weed, Irit, Avantoe, Kwuarm, Snapdragon, Torstol

**Integration:** Used in crafting healing/buff potions (Phase 5)

### 6. ✨ Magic
**Purpose:** Harvest magical essences and runes for enchanting

**Materials:**
- **Essences:** Air, Water, Earth, Fire (Tier 1-2)
- **Runes:** Nature, Chaos, Death, Blood, Soul (Tier 3-7)

**Usage:** Enchant equipment with magical properties

---

## ⚙️ Skill Progression System

### Leveling Formula
- **XP Required:** `level * 100` (e.g., Level 10 requires 900 XP)
- **Total XP to Level 99:** 485,100 XP
- **Max Level:** 99 (prestige system planned for Phase 6)

### Efficiency Bonus
- **Formula:** `0.5% faster per level`
- **Max Bonus:** 49.5% faster at Level 99
- **Example:**
  - Oak Log at Level 1: 3000ms
  - Oak Log at Level 50: 2265ms (24.5% faster)
  - Oak Log at Level 99: 1515ms (49.5% faster)

### XP Milestones
| Level | Total XP | Notable Unlocks              |
|-------|----------|------------------------------|
| 10    | 4,500    | Basic materials mastered     |
| 30    | 43,500   | Mid-tier materials unlocked  |
| 50    | 122,500  | High-tier materials unlocked |
| 75    | 277,500  | Master-tier materials        |
| 99    | 485,100  | Max level, prestige ready    |

---

## 🗺️ World Zone Progression

**Zones unlock based on character level:**

### Tier 1: Starter Zones (Level 1-10)
- Starter Forest, Starter River
- **Materials:** Oak Logs, Copper/Tin Ore, Shrimp, Rabbit Meat, Basic Herbs

### Tier 2: Intermediate Zones (Level 11-30)
- Willow Grove, Iron Hills, Mountain Stream
- **Materials:** Willow Logs, Iron Ore, Trout/Salmon, Wolf Pelt

### Tier 3: Advanced Zones (Level 31-50)
- Maple Forest, Mithril Caverns, Deep Ocean
- **Materials:** Maple Logs, Mithril Ore, Swordfish, Bear Hide

### Tier 4: Expert Zones (Level 51-70)
- Ancient Grove, Adamant Mines, Shark Bay
- **Materials:** Yew Logs, Adamantite Ore, Sharks, Drake Scales

### Tier 5: Master Zones (Level 71-99)
- Enchanted Forest, Runite Caverns, Abyssal Trench
- **Materials:** Magic Logs, Runite Ore, Manta Ray, Phoenix Feathers

---

## 🎯 Gathering Mechanics

### Starting a Session
1. Navigate to Gathering tab
2. Select skill (Woodcutting, Mining, etc.)
3. Choose material (must meet skill + zone level requirements)
4. Select quantity (x1, x10, or custom)
5. Gathering begins automatically

### Active Session
- **Progress Bar:** Real-time completion tracking
- **Timer:** Countdown to next unit gathered
- **Quantity:** Current / Goal display
- **Auto-Gather:** Toggle for continuous gathering

### Completion
- **Manual:** Click "Collect" button when ready
- **Auto (if enabled):** Automatically starts next session with same material
- **Partial Collection:** Cancel anytime to keep progress

### Rewards
- **Materials:** Added to inventory (stackable)
- **XP:** Skill experience per unit gathered
- **Level Up:** Automatic when XP threshold reached

---

## 💡 Unique Features (Implemented)

### ✅ Real-Time Progress Tracking
- Live updates every second
- No page refresh required
- Visual progress bars

### ✅ Skill-Based Efficiency
- Higher levels = faster gathering
- Scales from 0% to 49.5% speed increase
- Encourages long-term skill training

### ✅ World Zone Gating
- Materials locked behind character level
- Encourages progression through main game
- Clear unlock indicators

### ✅ Auto-Gather Mode
- Toggle for AFK/idle gameplay
- Automatically restarts sessions
- Continues until manually stopped or inventory full

### ✅ Multi-Skill System
- 6 independent gathering skills
- Each with 1-99 progression
- Separate XP tracking

### ✅ Material Inventory Integration
- Materials stored in main inventory
- Stackable up to 1000 (or 50-100 for rare items)
- Rarity-based visual styling

---

## 🔮 Planned Features (Phase 5+)

### Crafting System
- Blacksmithing (ores → weapons/armor)
- Fletching (wood → bows/arrows)
- Leatherworking (pelts → armor)
- Alchemy (herbs → potions)
- Enchanting (runes → item enhancements)

### Quest System
- Gathering quests ("Collect 50 Oak Logs")
- Daily/weekly challenges
- Zone unlock quests

### Advanced Features
- **Random Events:** Rare material spawns, bonus XP events
- **Tool Upgrades:** Better axes/pickaxes for efficiency
- **Prestige System:** Reset to Level 1 for permanent bonuses
- **Gathering Pets:** Cosmetic companions from skilling
- **Skill Capes:** Level 99 achievement rewards

---

## 📊 Database Schema

### `materials` Table
```sql
- id (TEXT, PK)
- name, description
- type (wood, ore, fish, meat, pelt, herb, essence, rune, gem)
- tier (1-10)
- required_skill_type, required_skill_level
- gathering_time_ms, experience_reward
- sell_price, rarity
- stackable, max_stack
- required_zone_level
```

### `gathering_nodes` Table
```sql
- id (UUID, PK)
- node_type (tree, ore_vein, fishing_spot, etc.)
- material_id (FK → materials)
- world_zone (starter_forest, iron_hills, etc.)
- required_zone_level
- respawn_time_ms
```

### `active_gathering` Table
```sql
- character_id (UUID, PK, FK → characters)
- skill_type, material_id
- quantity_goal, quantity_gathered
- started_at, last_gathered_at
```

### `character_skills` Table (Extended)
```sql
- character_id, skill_type (PK)
- level (1-99), experience
- created_at, updated_at
```

**New Skill Types:**
- `woodcutting`, `mining`, `fishing`, `hunting`, `alchemy`, `magic`
- `crafting` (Phase 5)

---

## 🧪 Testing Results

### E2E Tests (Playwright) - 15/15 Passing ✅
- Gathering tab display
- Skill panel navigation
- Material filtering
- Gathering session lifecycle
- XP gain verification
- Multi-quantity gathering
- Lock system validation
- Auto-gather toggle
- Skill switching
- Inventory integration

### Unit Tests (Jest) - All Passing ✅
- `calculateGatheringTime()` - Efficiency formula
- XP calculation formulas
- Material tier progression
- Skill leveling milestones
- Stack limit validation

---

## 📈 Success Metrics

- ✅ 50+ materials implemented across 6 skills
- ✅ 5 world zones with progressive unlocks
- ✅ Level 1-99 skill progression (485K total XP)
- ✅ Efficiency scaling (0-49.5% faster)
- ✅ 50+ gathering nodes across all zones
- ✅ Full inventory integration
- ✅ Real-time session tracking
- ✅ Auto-gather idle mechanics
- ✅ Complete test coverage (E2E + unit)
- ✅ 6 gathering skills fully functional

---

## 🔗 Related Documents

- [README.md](../README.md) - Project overview
- [CLAUDE.md](../CLAUDE.md) - Development guide
- [PHASE3_COMBAT.md](PHASE3_COMBAT.md) - Combat system (Phase 3)
- [Database Migrations](../supabase/migrations/) - Schema definitions

---

## ✅ **PHASE 4 COMPLETE - October 2, 2025**

**Status:** Production Ready & Deployed
**Game Running:** http://localhost:3000
**All Systems:** Operational

### Final Deliverables:
- ✅ 2 database migrations
- ✅ 4 new tables (materials, nodes, recipes, active_gathering)
- ✅ 50+ materials across 6 skills
- ✅ 4 backend lib files
- ✅ 4 frontend components
- ✅ 1 API route
- ✅ 15 E2E tests + unit tests
- ✅ Complete documentation
- ✅ Gathering system live and playable

**Next Phase:** Phase 5 - Crafting System Expansion & Recipe Implementation
