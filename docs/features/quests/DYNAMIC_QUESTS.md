# Dynamic Quest Generation System

**Version**: 1.0.0
**Status**: ✅ Complete
**Last Updated**: 2025-10-06

## Overview

The Dynamic Quest Generation System creates personalized, context-aware quests that respond to player activities and progression. Instead of static quest lists, quests are generated based on:

- **Recently discovered zones** → "Map the Mystic Forest"
- **Equipped items** → "Win 5 battles using Steel Longsword"
- **Skill levels** → "Gather 20 Mithril Ore using your Mining skills"
- **Merchant interactions** → "Trade with 3 different merchants"

This creates a living quest system that evolves with player choices and makes every playthrough feel unique.

---

## Key Features

### 1. **Context-Aware Generation**
Quests are tailored to the player's current state:
- **Zone Discovery**: Quests for recently explored zones
- **Equipment**: Quests based on currently equipped weapon/armor
- **Skills**: Gathering/crafting quests matching highest skill levels
- **Activities**: Quests based on trading, combat, exploration patterns

### 2. **Scalable Rewards**
Quest rewards scale with character level and difficulty:
```
XP Reward = Base XP + (XP per Level × Character Level) + Difficulty Bonus
Gold Reward = Base Gold + (Gold per Level × Character Level) + Difficulty Bonus
```

**Example**:
- Level 5 character: 250 XP, 125 gold
- Level 35 character: 550 XP, 275 gold (same quest template)

### 3. **Template System**
Six quest categories with weighted selection:
| Category | Description | Weight | Example |
|----------|-------------|--------|---------|
| **Zone Exploration** | Map newly discovered zones | 15 | "Discover all 5 landmarks in Ancient Ruins" |
| **Combat Item** | Master equipped weapons | 14 | "Win 7 battles using your Legendary Sword" |
| **Skill Gathering** | Advanced gathering challenges | 13 | "Gather 30 Dragon Scales using Hunting" |
| **Merchant Trade** | Build trade networks | 10 | "Trade with 5 different merchants" |
| **Boss Challenge** | Elite enemy encounters | 8 | "Defeat the Shadow Dragon" |
| **Crafting Mastery** | High-quality crafting | 12 | "Craft 5 Epic items" |

### 4. **Auto-Refresh**
- System automatically generates up to 3 dynamic quests when needed
- Refreshes on character login
- Prevents duplicates for active quests

### 5. **Visual Indicators**
Dynamic quests are marked with:
```
✨ Dynamic
```
Purple gradient badge to distinguish from static quests.

---

## Database Schema

### **quest_templates** Table
Stores reusable templates for quest generation.

```sql
CREATE TABLE quest_templates (
  id UUID PRIMARY KEY,
  category TEXT NOT NULL,  -- zone_exploration, combat_item, skill_gathering, etc.
  title_template TEXT NOT NULL,  -- "Map the {zone_name}"
  description_template TEXT,
  objective_template TEXT NOT NULL,  -- "Discover all {landmark_count} landmarks"
  min_character_level INT DEFAULT 1,
  max_character_level INT DEFAULT 99,
  base_xp_reward INT NOT NULL,
  base_gold_reward INT NOT NULL,
  base_item_rewards JSONB DEFAULT '{}',
  difficulty_multiplier DECIMAL(3,2) DEFAULT 1.0,
  xp_per_level INT DEFAULT 10,
  gold_per_level INT DEFAULT 5,
  required_conditions JSONB DEFAULT '{}',
  weight INT DEFAULT 10,
  is_repeatable BOOLEAN DEFAULT true,
  reset_interval TEXT,  -- 'daily', 'weekly', 'monthly', null
  icon TEXT DEFAULT '📜',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### **quest_definitions** Extensions
Added dynamic quest tracking fields:

```sql
ALTER TABLE quest_definitions
  ADD COLUMN is_dynamic BOOLEAN DEFAULT FALSE,
  ADD COLUMN template_id UUID REFERENCES quest_templates(id),
  ADD COLUMN context_snapshot JSONB DEFAULT '{}',
  ADD COLUMN generated_at TIMESTAMPTZ;
```

### **dynamic_quest_history** Table
Tracks generated quests to prevent duplicates:

```sql
CREATE TABLE dynamic_quest_history (
  id UUID PRIMARY KEY,
  character_id UUID REFERENCES characters(id),
  template_id UUID REFERENCES quest_templates(id),
  quest_definition_id TEXT REFERENCES quest_definitions(id),
  context_snapshot JSONB DEFAULT '{}',
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);
```

---

## SQL Functions

### **get_player_context(character_id)**
Returns comprehensive player state for quest generation:

```sql
SELECT get_player_context('char-uuid');
-- Returns JSONB:
{
  "character_id": "char-uuid",
  "level": 25,
  "class": "warrior",
  "skills": {"attack": 40, "woodcutting": 35, "mining": 20},
  "recent_zones": ["forest", "mountains", "desert"],
  "equipped_items": {
    "weapon": {
      "item_id": "steel_sword",
      "name": "Steel Longsword",
      "rarity": "uncommon"
    }
  },
  "merchant_visits": 3,
  "total_xp": 25000,
  "gold": 5000,
  "generated_at": "2025-10-06T12:00:00Z"
}
```

### **check_template_conditions(template_id, context)**
Validates if a template can be used for a player:

```sql
SELECT check_template_conditions('template-uuid', context_jsonb);
-- Returns BOOLEAN
```

**Validation Logic**:
- Character level within template range
- Required zones discovered (if needed)
- Required items equipped (if needed)
- Required skill levels met (if needed)
- Minimum merchant visits (if needed)

### **calculate_quest_rewards(template_id, character_level, difficulty_modifier)**
Computes scaled rewards:

```sql
SELECT calculate_quest_rewards('template-uuid', 25, 1.0);
-- Returns JSONB:
{
  "xp_reward": 450,
  "gold_reward": 225,
  "item_rewards": {}
}
```

---

## TypeScript API

### **analyzePlayerState(characterId)**
Gets player context from database:

```typescript
import { analyzePlayerState } from '@/lib/dynamic-quests'

const { data: context, error } = await analyzePlayerState(characterId)

// context: PlayerContext
{
  character_id: string
  level: number
  class?: string
  skills: Record<string, number>
  recent_zones: string[]
  equipped_items: Record<string, { item_id, name, rarity }>
  merchant_visits: number
  total_xp: number
  gold: number
  generated_at: string
}
```

### **generateContextualQuests(characterId, count)**
Generates quests tailored to player:

```typescript
import { generateContextualQuests } from '@/lib/dynamic-quests'

const { data: quests, error } = await generateContextualQuests(characterId, 3)

// Returns: QuestDefinition[]
[
  {
    id: 'dyn_zone_exploration_1728234567_abc123',
    title: 'Map the Ancient Ruins',
    description: 'Fully explore Ancient Ruins and discover all its secrets.',
    objective: 'Discover all 5 landmarks in Ancient Ruins',
    level_requirement: 20,
    xp_reward: 500,
    gold_reward: 250,
    is_dynamic: true,
    template_id: 'template-uuid',
    icon: '🗺️',
    context_snapshot: {
      zone_name: 'Ancient Ruins',
      landmark_count: 5,
      player_level: 25
    }
  },
  // ... more quests
]
```

### **refreshDynamicQuests(characterId, targetCount)**
Auto-generates quests to maintain target count:

```typescript
import { refreshDynamicQuests } from '@/lib/dynamic-quests'

// Maintains 3 active dynamic quests
await refreshDynamicQuests(characterId, 3)
```

**Use Cases**:
- On character login
- After completing dynamic quests
- Manual refresh button

### **completeDynamicQuest(characterId, questDefinitionId)**
Marks quest as completed in history:

```typescript
import { completeDynamicQuest } from '@/lib/dynamic-quests'

await completeDynamicQuest(characterId, 'dyn_zone_exploration_...')
```

---

## Template Placeholders

Templates use `{placeholder}` syntax for dynamic substitution:

### **Zone Exploration**
```
Title: "Map the {zone_name}"
Objective: "Discover all {landmark_count} landmarks in {zone_name}"

Placeholders:
- {zone_name}: Name of recently discovered zone
- {zone_id}: Zone UUID
- {landmark_count}: Number of landmarks in zone
- {time_minutes}: Time to spend (level × 2, minimum 5)
```

### **Combat Item**
```
Title: "Master the {weapon_name}"
Objective: "Win {win_count} battles using {weapon_name}"

Placeholders:
- {weapon_name}: Name of equipped weapon
- {weapon_type}: Weapon rarity (common, rare, etc.)
- {weapon_id}: Item UUID
- {win_count}: Battles to win (max(3, level ÷ 3))
- {damage_total}: Damage threshold (level × 500)
```

### **Skill Gathering**
```
Title: "Advanced {skill_name}"
Objective: "Gather {quantity} {material_name} using {skill_name}"

Placeholders:
- {skill_name}: Capitalized skill (Woodcutting, Mining, etc.)
- {skill_type}: Lowercase skill identifier
- {material_name}: Material appropriate for skill level
- {material_id}: Material UUID
- {quantity}: Amount to gather (max(10, skill_level ÷ 2))
- {times}: Gathering sessions (max(5, skill_level ÷ 5))
```

### **Merchant Trade**
```
Title: "Merchant Network"
Objective: "Trade with {merchant_count} different merchants"

Placeholders:
- {merchant_count}: Merchants to visit (max(2, level ÷ 5))
- {gold_amount}: Gold to earn (level × 100)
```

### **Boss Challenge**
```
Title: "Slay {boss_name}"
Objective: "Defeat {boss_name} {times} time(s)"

Placeholders:
- {boss_name}: Boss enemy name
- {boss_id}: Enemy UUID
- {times}: Number of defeats (usually 1)
```

### **Crafting Mastery**
```
Title: "Crafting Excellence"
Objective: "Craft {quantity} items of {rarity} rarity or higher"

Placeholders:
- {rarity}: Item rarity tier (uncommon, rare, epic)
- {quantity}: Items to craft (max(3, level ÷ 5))
```

---

## User Interface

### **Generate Dynamic Quests Button**
Located in Quest Journal header:

```tsx
<button onClick={handleGenerateDynamicQuests} className="btn btn-primary">
  ✨ Generate Quests
</button>
```

**Behavior**:
- Disabled during generation
- Shows "✨ Generating..." while loading
- Switches to Available tab on success
- Shows notification with count of generated quests

**Notifications**:
- **Success**: "✨ Dynamic Quests Generated - 3 new quests tailored to your activities!"
- **No Quests**: "No New Quests - You already have plenty of quests! Complete some first."
- **Error**: Shows error message in red banner

### **Quest Badge**
Dynamic quests display a purple gradient badge:

```tsx
{questDef.is_dynamic && (
  <span className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 text-purple-300">
    ✨ Dynamic
  </span>
)}
```

### **Auto-Refresh**
On component mount:
```tsx
useEffect(() => {
  if (!character) return
  loadQuests()
  refreshDynamicQuests(character.id, 3).catch(console.error)
}, [character?.id])
```

---

## Generation Algorithm

### **Step-by-Step Process**

1. **Analyze Player State**
   ```typescript
   const context = await analyzePlayerState(characterId)
   ```

2. **Filter Templates by Level**
   ```typescript
   templates.filter(t =>
     context.level >= t.min_character_level &&
     context.level <= t.max_character_level
   )
   ```

3. **Check Conditions**
   ```typescript
   const matching = templates.filter(async t => {
     return await check_template_conditions(t.id, context)
   })
   ```

4. **Remove Active Templates**
   ```typescript
   const activeTemplateIds = getActiveQuestTemplates(characterId)
   const available = matching.filter(t => !activeTemplateIds.has(t.id))
   ```

5. **Weighted Random Selection**
   ```typescript
   const selected = selectTemplatesByWeight(available, count)
   ```

6. **Generate Quest Parameters**
   ```typescript
   for (const template of selected) {
     const params = await generateQuestParams(template, context)
     const quest = substituteTemplate(template, params)
     const rewards = await calculate_quest_rewards(template.id, context.level)
   }
   ```

7. **Insert & Track**
   ```typescript
   await supabase.from('quest_definitions').insert(quest)
   await supabase.from('dynamic_quest_history').insert(history)
   ```

---

## Testing

### **Unit Tests** (`test/unit/dynamic-quests.test.ts`)
21 comprehensive tests covering:

✅ Template selection by level
✅ Condition matching
✅ Skill requirement filtering
✅ Reward scaling (XP, gold, difficulty)
✅ Template substitution logic
✅ Weighted random selection
✅ Parameter generation for all quest types
✅ Unique quest ID creation
✅ Context snapshot storage
✅ Edge cases (no items, no zones, min/max levels)

**Run Tests**:
```bash
npm test -- dynamic-quests.test.ts
```

**Expected Output**:
```
PASS test/unit/dynamic-quests.test.ts
  Dynamic Quest Generation
    Template Selection Logic
      ✓ should filter templates by character level
      ✓ should match templates based on required conditions
      ✓ should filter by skill requirements
    Reward Scaling
      ✓ should scale XP rewards based on character level
      ✓ should scale gold rewards based on character level
      ✓ should apply difficulty multiplier
    [... 15 more tests ...]

Test Suites: 1 passed
Tests:       21 passed
```

---

## Performance Considerations

### **Database Queries**
- **Player Context**: 1 SQL function call (caches character data, zones, skills, items)
- **Template Matching**: 1 query + N condition checks (N = template count)
- **Quest Generation**: 1-3 parameter lookups per quest (zones, materials, bosses)
- **Insert Operations**: 2 inserts per quest (definition + history)

**Total for 3 quests**: ~10-15 database calls

### **Caching Opportunities**
- Player context can be cached for 5 minutes
- Templates are mostly static, cache indefinitely
- Active quest check can use existing character quest data

### **Optimization**
- Weighted selection happens in-memory (no DB calls)
- Template substitution is pure string manipulation
- Parallel parameter generation possible

---

## Future Enhancements

### **Planned Features**
1. **Quest Chains**: Dynamic quests that unlock follow-up quests
2. **Seasonal Quests**: Holiday/event-specific templates
3. **Daily/Weekly Rotation**: Guaranteed fresh quests
4. **Achievement Tracking**: Meta-quests based on achievement progress
5. **Party Quests**: Group-based dynamic objectives
6. **Story Branches**: Narrative quests based on player choices

### **Advanced Templates**
- **Multi-Objective Quests**: "Gather 20 logs AND craft 5 arrows"
- **Time-Limited**: "Complete within 1 hour"
- **Conditional Rewards**: Bonus rewards for speed/perfection
- **Fail Conditions**: "Without dying" or "Using only X skill"

### **Analytics**
- Track which quest types are most popular
- Adjust template weights based on completion rates
- Identify underutilized templates

---

## Troubleshooting

### **No Quests Generated**
**Symptom**: "No New Quests" notification when clicking Generate

**Causes**:
1. Already have 3+ active dynamic quests
2. Character level too low/high for all templates
3. Missing required conditions (no zones, no weapon, low skills)

**Solution**:
- Complete some active quests first
- Discover new zones
- Level up skills
- Equip better gear

### **Quest Objectives Not Clear**
**Symptom**: Placeholder text still visible (e.g., "{zone_name}")

**Cause**: Parameter generation failed for that quest type

**Solution**:
- Check database for required data (zones, materials, bosses)
- Verify template placeholders match generation logic
- Check browser console for errors

### **Duplicate Quests**
**Symptom**: Same quest appears multiple times

**Cause**: `dynamic_quest_history` not tracking properly

**Solution**:
```sql
-- Check history
SELECT * FROM dynamic_quest_history
WHERE character_id = 'your-character-uuid'
  AND completed_at IS NULL;

-- Clean up if needed
DELETE FROM dynamic_quest_history
WHERE character_id = 'your-character-uuid'
  AND quest_definition_id NOT IN (
    SELECT quest_id FROM quests
    WHERE character_id = 'your-character-uuid'
      AND status = 'active'
  );
```

### **Rewards Seem Wrong**
**Symptom**: XP/gold much higher/lower than expected

**Cause**: Check character level and template scaling values

**Debug**:
```sql
SELECT calculate_quest_rewards(
  'template-uuid',
  25,  -- character level
  1.0  -- difficulty modifier
);
```

---

## Example Walkthrough

### **Scenario: New Player at Level 10**

**Player State**:
- Level: 10
- Skills: Woodcutting 15, Mining 12, Attack 20
- Zones: Grasslands, Forest
- Weapon: Iron Sword (uncommon)
- Merchant visits: 0

**Generated Quests**:

1. **🗺️ Map the Forest** (Zone Exploration)
   - Objective: "Discover all 3 landmarks in Forest"
   - Rewards: 300 XP, 150 gold
   - Reasoning: Recently discovered zone

2. **⚔️ Master the Iron Sword** (Combat Item)
   - Objective: "Win 3 battles using Iron Sword"
   - Rewards: 370 XP, 180 gold
   - Reasoning: Currently equipped weapon

3. **🪓 Advanced Woodcutting** (Skill Gathering)
   - Objective: "Gather 10 Maple Logs using Woodcutting"
   - Rewards: 500 XP, 260 gold
   - Reasoning: Woodcutting is highest gathering skill (level 15)

**Why These Quests?**
- All templates match level 10 range (1-99)
- Player has required conditions (zones, weapon, skills)
- Weighted selection favored exploration and combat
- Rewards scaled appropriately for level 10

---

## Migration Guide

### **Applying Migration**
```sql
-- Run migration file
psql -f supabase/migrations/20241006000000_add_dynamic_quests.sql
```

### **Verify Tables**
```sql
-- Check table existence
SELECT table_name FROM information_schema.tables
WHERE table_name IN ('quest_templates', 'dynamic_quest_history');

-- Check template count
SELECT category, COUNT(*) FROM quest_templates GROUP BY category;

-- Expected output:
-- zone_exploration    | 2
-- combat_item         | 2
-- skill_gathering     | 2
-- merchant_trade      | 2
-- boss_challenge      | 1
-- crafting_mastery    | 1
```

### **Test Generation**
```sql
-- Get player context
SELECT get_player_context('your-character-uuid');

-- Check matching templates
SELECT id, category, title_template
FROM quest_templates
WHERE min_character_level <= 10  -- your level
  AND max_character_level >= 10;
```

---

## API Reference Summary

### **Database Functions**
```sql
get_player_context(character_id UUID) → JSONB
check_template_conditions(template_id UUID, context JSONB) → BOOLEAN
calculate_quest_rewards(template_id UUID, level INT, difficulty DECIMAL) → JSONB
```

### **TypeScript Functions**
```typescript
analyzePlayerState(characterId: string) → Promise<{ data: PlayerContext | null, error }>
generateContextualQuests(characterId: string, count: number) → Promise<{ data: QuestDefinition[], error }>
refreshDynamicQuests(characterId: string, targetCount: number) → Promise<{ data: QuestDefinition[], error }>
completeDynamicQuest(characterId: string, questId: string) → Promise<{ error }>
```

### **React UI Functions**
```typescript
handleGenerateDynamicQuests() → void  // Generates and shows notifications
```

---

## Related Documentation

- **[Quest System](./README.md)** - Core quest mechanics and tracking
- **[GAME_WIKI.md](../../GAME_WIKI.md)** - Complete game systems reference
- **[CLAUDE.md](../../../CLAUDE.md)** - Development patterns and setup

---

**🎮 Dynamic quests bring personalized gameplay to Eternal Realms. Every player's journey is unique!**
