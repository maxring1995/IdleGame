# 🎮 ETERNAL REALMS - BALANCE OVERHAUL IMPLEMENTATION GUIDE

**Date:** 2025-01-06
**Status:** Ready for Implementation
**Migrations:** 7 files created (Phase 1, 2, 3)

---

## ✅ COMPLETED: DATABASE MIGRATIONS

All 7 migration files have been created in `supabase/migrations/`:

### **Phase 1 - Critical Fixes** 🔥
1. ✅ `20250106000000_balance_core_progression.sql`
2. ✅ `20250106000001_balance_exploration_rewards.sql`
3. ✅ `20250106000002_balance_combat_system.sql`

### **Phase 2 - Major Balance** ⚙️
4. ✅ `20250106000003_balance_skill_system.sql`
5. ✅ `20250106000004_balance_economy.sql`

### **Phase 3 - Polish & QoL** ⭐
6. ✅ `20250106000005_balance_crafting.sql`
7. ✅ `20250106000006_balance_qol.sql`

---

## 📋 NEXT STEPS

### **Step 1: Apply Database Migrations**

**Option A: Using Supabase MCP (Recommended)**
```bash
# The migrations will be automatically detected and applied
# through the Supabase MCP integration
```

**Option B: Using Supabase Dashboard**
1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy and paste each migration file in order (000000 → 000006)
4. Execute each migration one at a time
5. Verify no errors in the output

**Option C: Using Supabase CLI**
```bash
# Link to your project
supabase link --project-ref your-project-ref

# Push migrations
supabase db push

# Verify migrations applied
supabase db remote commit list
```

---

### **Step 2: Update TypeScript Code**

Each migration file includes a "CODE CHANGES REQUIRED" section. Here's a consolidated list:

#### **lib/exploration.ts**
```typescript
// Line 229-233: Remove boosted reward chance
const boostedRewardChance = config.reward_chance // Remove Math.max(..., 0.80)

// Line 238-242: Reduce multipliers
const goldMultiplier = isMilestone ? 1.5 : 1.0 // Was 5:3
const xpMultiplier = isMilestone ? 1.5 : 1.0 // Was 5:3

// Line 245-247: Reduce item counts
const baseItemCount = isMilestone ? 2 : 1 // Was 30:10
const itemRange = isMilestone ? 1 : 1 // Was 21:11
```

#### **lib/combat.ts**
```typescript
// Line 11-20: Add level-scaled damage
export function calculateDamage(
  attackerAttack: number,
  defenderDefense: number,
  attackerLevel: number = 1 // NEW
): number {
  const baseDamage = attackerAttack - Math.floor(defenderDefense / 2)
  const levelMultiplier = 1 + (attackerLevel * 0.015) // NEW
  const scaledDamage = baseDamage * levelMultiplier // NEW
  const variance = 0.80 + Math.random() * 0.4 // Increased variance
  const actualDamage = scaledDamage * variance
  return Math.max(1, Math.floor(actualDamage))
}

// Line 156: Update player attack
const playerDamage = calculateDamage(character.attack, enemy.defense, character.level)

// Line 206: Update enemy attack
const enemyDamage = calculateDamage(enemy.attack, character.defense, enemy.level)

// Line 176-237: Increase all skill XP (10x)
await addSkillExperience(characterId, 'attack', 20) // Was 2
await addSkillExperience(characterId, 'strength', 10) // Was 1
await addSkillExperience(characterId, 'defense', 15) // Was 1
await addSkillExperience(characterId, 'magic', 25) // Was 3
await addSkillExperience(characterId, 'ranged', 20) // Was 2
await addSkillExperience(characterId, 'constitution', 10) // Was 1
```

#### **lib/gathering.ts**
```typescript
// Scale XP by material tier
const materialTier = materialData.tier || 1
const tierMultiplier = 1 + (materialTier * 0.6)
const finalXP = Math.floor(baseXP * tierMultiplier)

// Apply speed reduction from skill level
const speedReduction = skillLevel * 0.01 // 1% per level
const effectiveTime = baseTime * (1 - Math.min(speedReduction, 0.99))
```

#### **lib/inventory.ts**
```typescript
// Line 314: Update updateCharacterStats() to include skill bonuses
export async function updateCharacterStats(characterId: string) {
  // ... existing code ...

  // NEW: Get skill levels
  const { data: skills } = await supabase
    .from('character_skills')
    .select('*')
    .eq('character_id', characterId)

  // NEW: Calculate skill bonuses
  let skillAttackBonus = 0
  let skillDefenseBonus = 0
  let skillHealthBonus = 0
  let skillManaBonus = 0

  skills?.forEach(skill => {
    if (skill.skill_type === 'attack') {
      skillAttackBonus += Math.floor(skill.level / 10) * 5
    }
    if (skill.skill_type === 'defense') {
      skillDefenseBonus += Math.floor(skill.level / 10) * 5
    }
    if (skill.skill_type === 'constitution') {
      skillHealthBonus += Math.floor(skill.level / 10) * 50
    }
    if (skill.skill_type === 'magic') {
      skillManaBonus += Math.floor(skill.level / 10) * 30
    }
    if (['mining', 'woodcutting', 'fishing', 'hunting', 'alchemy'].includes(skill.skill_type)) {
      if (skill.level >= 99) skillHealthBonus += 30
      else if (skill.level >= 50) skillHealthBonus += 15
    }
  })

  // Update final stats calculation
  await supabase
    .from('characters')
    .update({
      attack: baseAttack + attackBonus + skillAttackBonus,
      defense: baseDefense + defenseBonus + skillDefenseBonus,
      max_health: baseHealth + healthBonus + skillHealthBonus,
      max_mana: baseMana + manaBonus + skillManaBonus,
    })
    .eq('id', characterId)
}
```

#### **components/Game.tsx**
```typescript
// Line ~280: Apply AFK penalty and level-scaled idle gains
useEffect(() => {
  if (!character) return

  const interval = setInterval(async () => {
    // Get AFK penalty from database
    const { data: char } = await supabase
      .from('characters')
      .select('last_active_timestamp, level')
      .eq('id', character.id)
      .single()

    // Calculate AFK penalty
    const afkSeconds = Math.floor((Date.now() - new Date(char.last_active_timestamp).getTime()) / 1000)
    let penalty = 1.0
    if (afkSeconds > 28800) { // 8 hours
      penalty = 0.5 + (0.5 / (1 + (afkSeconds - 28800) / 14400))
    }

    // Apply level-scaled idle gains with AFK penalty
    const idleXP = Math.floor(character.level * 10 * penalty)
    const idleGold = Math.floor(character.level * 20 * penalty)

    await addExperience(character.id, idleXP)
    await addGold(character.id, idleGold)
  }, 5000)

  return () => clearInterval(interval)
}, [character])

// Update last_active_timestamp on user actions
const updateLastActive = async () => {
  await supabase
    .from('characters')
    .update({ last_active_timestamp: new Date().toISOString() })
    .eq('id', character.id)
}

// Call updateLastActive() after combat, gathering, exploration, etc.
```

#### **lib/crafting.ts** (Optional - for bulk crafting)
```typescript
export async function startCrafting(
  characterId: string,
  recipeId: string,
  quantity: number = 1  // NEW PARAMETER
) {
  // Get skill level
  const skillLevel = await getSkillLevel(characterId, recipe.required_skill_type)

  // Calculate bulk time
  const speedBonus = skillLevel * 0.005 // 0.5% per level
  const bulkBonus = quantity > 1 ? 0.20 : 0 // 20% faster for bulk
  const totalTime = Math.floor(
    recipe.crafting_time_ms * quantity * (1 - speedBonus) * (1 - bulkBonus)
  )

  // Calculate bulk XP
  const xpBonus = quantity > 1 ? 0.10 : 0 // 10% XP bonus for bulk
  const totalXP = Math.floor(recipe.experience_reward * quantity * (1 + xpBonus))

  // Create session with quantity tracking
  // ...
}
```

#### **lib/economy.ts** (New file - create this)
```typescript
import { createClient } from '@/utils/supabase/client'

export async function repairEquipment(
  characterId: string,
  inventoryId: string
) {
  const supabase = createClient()

  // Get item details
  const { data: invItem } = await supabase
    .from('inventory')
    .select('*, item:items(*)')
    .eq('id', inventoryId)
    .single()

  if (!invItem) return { error: 'Item not found' }

  // Calculate repair cost using database function
  const { data: costData } = await supabase
    .rpc('calculate_repair_cost', {
      item_id: invItem.item_id,
      current_durability: invItem.current_durability,
      max_durability: invItem.item.max_durability
    })

  const repairCost = costData || 0

  // Deduct gold
  const { data: character } = await supabase
    .from('characters')
    .select('gold')
    .eq('id', characterId)
    .single()

  if (character.gold < repairCost) {
    return { error: 'Insufficient gold' }
  }

  // Update gold and durability
  await supabase
    .from('characters')
    .update({ gold: character.gold - repairCost })
    .eq('id', characterId)

  await supabase
    .from('inventory')
    .update({ current_durability: invItem.item.max_durability })
    .eq('id', inventoryId)

  // Log repair
  await supabase.from('equipment_repairs').insert({
    character_id: characterId,
    inventory_id: inventoryId,
    repair_cost: repairCost,
    durability_restored: invItem.item.max_durability - invItem.current_durability
  })

  return { data: { repairCost }, error: null }
}

export async function startSkillTraining(
  characterId: string,
  skillType: string
) {
  const supabase = createClient()

  // Get skill level
  const { data: skill } = await supabase
    .from('character_skills')
    .select('level')
    .eq('character_id', characterId)
    .eq('skill_type', skillType)
    .single()

  if (!skill) return { error: 'Skill not found' }

  // Calculate cost
  const cost = skill.level * 1000

  // Deduct gold
  const { data: character } = await supabase
    .from('characters')
    .select('gold')
    .eq('id', characterId)
    .single()

  if (character.gold < cost) {
    return { error: 'Insufficient gold' }
  }

  await supabase
    .from('characters')
    .update({ gold: character.gold - cost })
    .eq('id', characterId)

  // Create training session (1 hour duration)
  const expiresAt = new Date(Date.now() + 3600000) // +1 hour

  await supabase.from('skill_training_sessions').insert({
    character_id: characterId,
    skill_type: skillType,
    cost,
    xp_multiplier: 1.25,
    expires_at: expiresAt.toISOString()
  })

  return { data: { cost, expiresAt }, error: null }
}
```

---

### **Step 3: Testing Checklist**

Before deploying to production:

- [ ] **Character Leveling**: Create new character, verify leveling speed feels right
- [ ] **Combat**: Test combat at levels 1, 10, 25, 50 - verify 5-15 turn fights
- [ ] **Exploration**: Complete exploration session, verify 1-2 items per reward
- [ ] **Gathering**: Test gathering speed improvements at different skill levels
- [ ] **Crafting**: Craft items, verify profitability and XP gains
- [ ] **Idle Gains**: AFK for 12 hours, verify diminishing returns work
- [ ] **Skills**: Level a skill to 99, verify stat bonuses apply
- [ ] **Economy**: Buy/sell items, repair equipment, verify gold flow
- [ ] **Merchant**: Check merchant prices match new markup (2-4x)
- [ ] **Statistics**: View leaderboards and progression stats

---

### **Step 4: Rollback Plan (If Needed)**

Each migration creates backup tables:
- `_backup_characters_20250106`
- `_backup_enemies_20250106`
- `_backup_exploration_rewards_config_20250106`
- `_backup_merchant_inventory_20250106`
- `_backup_items_20250106`
- `_backup_character_skills_20250106`
- `_backup_crafting_recipes_20250106`

**To rollback:**
```sql
-- Restore from backup (example)
DELETE FROM characters;
INSERT INTO characters SELECT * FROM _backup_characters_20250106;

-- Or create a rollback migration
-- See each migration file for specific rollback steps
```

---

## 📊 EXPECTED IMPACT

### **Progression Timeline (After Balance)**

| Level Tier | Time to Reach | Activities |
|------------|---------------|------------|
| 1-10 | 4-6 hours | Tutorial, basic systems |
| 10-30 | 25-35 hours | Core gameplay, skill building |
| 30-60 | 80-120 hours | Advanced content, specialization |
| 60-99 | 300-500 hours | Endgame, skill mastery |

### **Gold Economy**

| Activity | Gold/Hour (Level 50) |
|----------|---------------------|
| Idle | 720,000 |
| Combat | 25,000 |
| Exploration | 12,000 |
| Gathering + Sell | 4,000 |
| Crafting + Sell | 2,500 |

**Gold Sinks:**
- Merchant purchases: 2-4x markup
- Equipment repairs: 10% item value per 10% durability
- Skill training: 1,000 gold per skill level
- Expedition supplies: 50-1,000 gold

---

## 🎯 SUCCESS METRICS

Monitor these after deployment:

1. **Avg time to level 10:** Should be ~5 hours (was ~1 hour)
2. **Avg time to level 50:** Should be ~100 hours (was ~3 hours)
3. **Player retention at day 7:** Target >50%
4. **Gold inflation rate:** Should be <10% per week
5. **Crafting usage:** Should increase 200-300%
6. **Exploration completion rate:** Should decrease to ~60% (was ~95%)

---

## 🆘 SUPPORT & ISSUES

### **Common Issues:**

**Q: Players complaining about level reductions?**
A: This is expected. The new XP curve is exponential, so high-level characters will see level decreases. Their XP is preserved, just redistributed.

**Q: Combat feels too slow?**
A: Combats should last 5-15 turns. If longer, check enemy HP scaling function.

**Q: Idle gains seem weak?**
A: Idle gains scale with level now. At level 50: 500 XP + 1000 gold per 5 sec.

**Q: Exploration gives no rewards?**
A: Reward chance is now 5-35% (was 80%). This is intentional to balance economy.

---

## 📝 CHANGELOG SUMMARY

### **Character Progression**
- XP formula changed to exponential (level^2.5 * 100)
- Stats now scale exponentially with level
- Idle gains scale with character level

### **Combat**
- Enemy HP uses exponential scaling (level^1.8)
- Damage formula includes level multiplier (+1.5% per level)
- Combat skill XP increased 10x
- Character XP from combat now scales with enemy level

### **Exploration**
- Reward chance reduced from 80% to 5-35%
- Item drops reduced from 10-30 to 1-2
- Gold/XP multipliers reduced from 3-5x to 1-1.5x

### **Skills**
- Skills grant stat bonuses every 10 levels
- Gathering XP scales with material tier
- Speed bonuses apply at all skill levels
- Milestone rewards every 10 levels

### **Economy**
- Merchant markup increased to 2-4x (was 1.5x)
- Equipment durability system added
- Crafted items value increased 50%
- Training and repair gold sinks added

### **Crafting**
- XP rewards increased 50%
- Bulk crafting bonuses (20% time, 10% XP)
- Profitability improved across board

### **QoL**
- AFK diminishing returns after 8 hours
- Quest XP scales with new curve
- Achievement reward system
- Statistics views and leaderboards

---

## ✅ FINAL CHECKLIST

- [ ] Database migrations applied successfully
- [ ] TypeScript code updated as documented
- [ ] Local testing completed
- [ ] No console errors in browser
- [ ] All features working as expected
- [ ] Ready for production deployment

---

**Good luck with the balance overhaul! 🎮**

If you encounter issues, refer to the validation queries in each migration file for debugging.
