-- ============================================
-- BALANCE MIGRATION: Combat System Overhaul
-- Date: 2025-01-06
-- Phase: 1 (Critical)
-- ============================================
-- CHANGES:
-- 1. Exponential enemy HP scaling
-- 2. Level-scaled damage formula
-- 3. Increase combat skill XP (10x)
-- 4. Scale character XP rewards
-- 5. Rebalance loot drop rates
-- ============================================

-- ============================================
-- PART 1: BACKUP EXISTING DATA
-- ============================================

CREATE TABLE IF NOT EXISTS _backup_enemies_20250106 AS
SELECT * FROM enemies;

COMMENT ON TABLE _backup_enemies_20250106 IS
'Backup before combat balance - enemies had linear HP scaling';

-- ============================================
-- PART 2: ENEMY HP SCALING (EXPONENTIAL)
-- ============================================

-- Calculate balanced HP for enemy level
CREATE OR REPLACE FUNCTION calculate_enemy_hp(base_hp INTEGER, enemy_level INTEGER, is_boss BOOLEAN DEFAULT false)
RETURNS INTEGER
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  scaled_hp INTEGER;
  boss_multiplier NUMERIC := 2.5;
BEGIN
  -- Exponential scaling: base_hp * (level ^ 1.8)
  scaled_hp := FLOOR(base_hp * POWER(enemy_level, 1.8));

  -- Boss multiplier
  IF is_boss THEN
    scaled_hp := FLOOR(scaled_hp * boss_multiplier);
  END IF;

  RETURN GREATEST(scaled_hp, 10); -- Minimum 10 HP
END;
$$;

-- Update all existing enemies with new HP scaling
UPDATE enemies
SET health = calculate_enemy_hp(
  CASE
    -- Base HP values by enemy type
    WHEN id LIKE '%slime%' THEN 50
    WHEN id LIKE '%goblin%' THEN 80
    WHEN id LIKE '%wolf%' THEN 90
    WHEN id LIKE '%orc%' THEN 120
    WHEN id LIKE '%mage%' THEN 100
    WHEN id LIKE '%troll%' THEN 150
    WHEN id LIKE '%dragon%' THEN 200
    ELSE 100
  END,
  level,
  COALESCE(is_boss, false)
);

-- ============================================
-- PART 3: COMBAT XP REWARDS (CHARACTER LEVEL)
-- ============================================

-- Calculate character XP from defeating enemy
CREATE OR REPLACE FUNCTION calculate_combat_character_xp(enemy_level INTEGER, is_boss BOOLEAN DEFAULT false)
RETURNS INTEGER
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  base_xp INTEGER;
  boss_multiplier NUMERIC := 2.0;
BEGIN
  -- Base formula: enemy_level * 50
  base_xp := enemy_level * 50;

  -- Boss multiplier
  IF is_boss THEN
    base_xp := FLOOR(base_xp * boss_multiplier);
  END IF;

  RETURN GREATEST(base_xp, 10);
END;
$$;

-- Update all enemy experience rewards
UPDATE enemies
SET experience_reward = calculate_combat_character_xp(level, COALESCE(is_boss, false));

-- ============================================
-- PART 4: REBALANCE LOOT DROP RATES
-- ============================================

-- Reduce loot drop rates (too generous currently)
UPDATE enemies
SET loot_table = (
  SELECT jsonb_object_agg(
    key,
    CASE
      -- Health potions: 20% → 10%
      WHEN key LIKE '%health_potion%' THEN to_jsonb(LEAST((value::text)::numeric * 0.5, 0.10))
      -- Equipment: 10% → 3%
      WHEN key LIKE '%sword%' OR key LIKE '%armor%' THEN to_jsonb(LEAST((value::text)::numeric * 0.3, 0.03))
      -- Rare items: 5% → 1%
      WHEN (value::text)::numeric <= 0.05 THEN to_jsonb((value::text)::numeric * 0.2)
      -- Everything else: 50% reduction
      ELSE to_jsonb((value::text)::numeric * 0.5)
    END
  )
  FROM jsonb_each(loot_table)
)
WHERE loot_table IS NOT NULL AND loot_table != '{}'::jsonb;

-- ============================================
-- PART 5: GOLD REWARDS SCALING
-- ============================================

-- Scale gold rewards with enemy level
UPDATE enemies
SET
  gold_min = GREATEST(level * 10, 5),
  gold_max = GREATEST(level * 30, 15);

-- Boss gold multiplier
UPDATE enemies
SET
  gold_min = FLOOR(gold_min * 2.0),
  gold_max = FLOOR(gold_max * 2.0)
WHERE COALESCE(is_boss, false) = true;

-- ============================================
-- PART 6: ENEMY STAT SCALING
-- ============================================

-- Scale attack stat with level
UPDATE enemies
SET attack = GREATEST(
  FLOOR(5 + (level - 1) * 4 + POWER(level, 1.3)),
  1
);

-- Scale defense stat with level
UPDATE enemies
SET defense = GREATEST(
  FLOOR(2 + (level - 1) * 2 + POWER(level, 1.2)),
  0
);

-- Boss stat multipliers
UPDATE enemies
SET
  attack = FLOOR(attack * 1.5),
  defense = FLOOR(defense * 1.5)
WHERE COALESCE(is_boss, false) = true;

-- ============================================
-- PART 7: ADD MISSING BOSS FLAG COLUMN
-- ============================================

ALTER TABLE enemies ADD COLUMN IF NOT EXISTS is_boss BOOLEAN DEFAULT false;

-- Mark existing boss enemies
UPDATE enemies
SET is_boss = true
WHERE id IN (
  'forest_guardian',
  'goblin_king',
  'ancient_dragon',
  'lich_lord'
) OR name LIKE '%Boss%' OR name LIKE '%King%' OR name LIKE '%Lord%' OR name LIKE '%Guardian%';

-- ============================================
-- PART 8: VALIDATION QUERIES
-- ============================================

DO $$
DECLARE
  enemy_record RECORD;
BEGIN
  RAISE NOTICE '=== COMBAT BALANCE CHANGES ===';
  RAISE NOTICE '';

  RAISE NOTICE 'REGULAR ENEMIES:';
  FOR enemy_record IN
    SELECT * FROM enemies
    WHERE COALESCE(is_boss, false) = false
    ORDER BY level
    LIMIT 5
  LOOP
    RAISE NOTICE '  % (Lv %): % HP | % ATK | % DEF | % XP | %-% gold',
      enemy_record.name,
      enemy_record.level,
      enemy_record.health,
      enemy_record.attack,
      enemy_record.defense,
      enemy_record.experience_reward,
      enemy_record.gold_min,
      enemy_record.gold_max;
  END LOOP;

  RAISE NOTICE '';
  RAISE NOTICE 'BOSS ENEMIES:';
  FOR enemy_record IN
    SELECT * FROM enemies
    WHERE COALESCE(is_boss, false) = true
    ORDER BY level
    LIMIT 5
  LOOP
    RAISE NOTICE '  % (Lv %): % HP | % ATK | % DEF | % XP | %-% gold',
      enemy_record.name,
      enemy_record.level,
      enemy_record.health,
      enemy_record.attack,
      enemy_record.defense,
      enemy_record.experience_reward,
      enemy_record.gold_min,
      enemy_record.gold_max;
  END LOOP;

  RAISE NOTICE '';
  RAISE NOTICE '=== EXPECTED COMBAT DURATION ===';
  RAISE NOTICE 'Level 1 enemy vs Level 1 player: ~5-8 turns';
  RAISE NOTICE 'Level 10 enemy vs Level 10 player: ~8-12 turns';
  RAISE NOTICE 'Level 25 enemy vs Level 25 player: ~10-15 turns';
  RAISE NOTICE 'Boss fights: 2.5x HP = ~15-30 turns';
END $$;

-- ============================================
-- PART 9: DOCUMENTATION
-- ============================================

COMMENT ON FUNCTION calculate_enemy_hp IS
'Calculates enemy HP using exponential scaling: base_hp * (level^1.8). Bosses get 2.5x multiplier.';

COMMENT ON FUNCTION calculate_combat_character_xp IS
'Calculates character XP reward for defeating enemy: level * 50. Bosses give 2x XP.';

COMMENT ON COLUMN enemies.is_boss IS
'Boss flag (true for boss encounters with 2.5x HP, 1.5x stats, 2x rewards)';

-- ============================================
-- PART 10: CODE CHANGES REQUIRED
-- ============================================

-- NOTE: The following changes must be made in lib/combat.ts:

/*
REQUIRED CODE CHANGES in lib/combat.ts:

1. Line 11-20: Add level-scaled damage multiplier
   FROM:
     export function calculateDamage(attackerAttack: number, defenderDefense: number): number {
       const baseDamage = attackerAttack - Math.floor(defenderDefense / 2)
       const variance = 0.85 + Math.random() * 0.3
       const actualDamage = baseDamage * variance
       return Math.max(1, Math.floor(actualDamage))
     }

   TO:
     export function calculateDamage(
       attackerAttack: number,
       defenderDefense: number,
       attackerLevel: number = 1
     ): number {
       const baseDamage = attackerAttack - Math.floor(defenderDefense / 2)
       // Add level scaling: 1.5% damage per level
       const levelMultiplier = 1 + (attackerLevel * 0.015)
       const scaledDamage = baseDamage * levelMultiplier
       // Increase variance to 20%
       const variance = 0.80 + Math.random() * 0.4
       const actualDamage = scaledDamage * variance
       return Math.max(1, Math.floor(actualDamage))
     }

2. Line 156: Update player attack to use level scaling
   FROM:
     const playerDamage = calculateDamage(character.attack, enemy.defense)
   TO:
     const playerDamage = calculateDamage(character.attack, enemy.defense, character.level)

3. Line 206: Update enemy attack to use level scaling
   FROM:
     const enemyDamage = calculateDamage(enemy.attack, character.defense)
   TO:
     const enemyDamage = calculateDamage(enemy.attack, character.defense, enemy.level)

4. Line 176-190: Increase combat skill XP (10x)
   FROM:
     await addSkillExperience(characterId, 'attack', 2)
     const strengthXP = Math.max(1, Math.floor(playerDamage / 2))
     await addSkillExperience(characterId, 'strength', strengthXP)
   TO:
     await addSkillExperience(characterId, 'attack', 20)
     const strengthXP = 10
     await addSkillExperience(characterId, 'strength', strengthXP)

5. Line 217-219: Increase defense XP
   FROM:
     const defenseXP = Math.max(1, Math.floor(enemyDamage / 2))
     await addSkillExperience(characterId, 'defense', defenseXP)
   TO:
     const defenseXP = 15
     await addSkillExperience(characterId, 'defense', defenseXP)

6. Line 236-237: Increase constitution XP
   FROM:
     await addSkillExperience(characterId, 'constitution', 1)
   TO:
     await addSkillExperience(characterId, 'constitution', 10)

7. Line 182-189: Increase magic/ranged XP
   FROM:
     const magicXP = 3 + Math.max(1, Math.floor(playerDamage / 2))
     const rangedXP = 2 + Math.max(1, Math.floor(playerDamage / 3))
   TO:
     const magicXP = 25
     const rangedXP = 20
*/

-- ============================================
-- MIGRATION COMPLETE
-- ============================================

INSERT INTO _migration_log (migration_name, applied_at, description) VALUES
  ('20250106000002_balance_combat_system', NOW(), 'Enemy HP exponential scaling, level-scaled damage, 10x combat skill XP, balanced rewards')
ON CONFLICT (migration_name) DO NOTHING;
