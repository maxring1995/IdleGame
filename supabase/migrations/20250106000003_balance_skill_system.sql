-- ============================================
-- BALANCE MIGRATION: Skill System Enhancement
-- Date: 2025-01-06
-- Phase: 2 (Major)
-- ============================================
-- CHANGES:
-- 1. Add skill → character stat bonuses
-- 2. Scale gathering XP by material tier
-- 3. Add skill level → speed bonuses
-- 4. Create milestone rewards (every 10 levels)
-- 5. Increase baseline skill XP gains
-- ============================================

-- ============================================
-- PART 1: BACKUP EXISTING DATA
-- ============================================

CREATE TABLE IF NOT EXISTS _backup_character_skills_20250106 AS
SELECT * FROM character_skills;

CREATE TABLE IF NOT EXISTS _backup_skill_milestones_20250106 AS
SELECT * FROM skill_milestones;

-- ============================================
-- PART 2: SKILL → STAT BONUS SYSTEM
-- ============================================

-- Calculate attack bonus from Attack skill
CREATE OR REPLACE FUNCTION get_attack_skill_bonus(skill_level INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  -- +5 attack per 10 skill levels
  RETURN FLOOR(skill_level / 10.0) * 5;
END;
$$;

-- Calculate defense bonus from Defense skill
CREATE OR REPLACE FUNCTION get_defense_skill_bonus(skill_level INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  -- +5 defense per 10 skill levels
  RETURN FLOOR(skill_level / 10.0) * 5;
END;
$$;

-- Calculate HP bonus from Constitution skill
CREATE OR REPLACE FUNCTION get_constitution_skill_bonus(skill_level INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  -- +50 max HP per 10 skill levels
  RETURN FLOOR(skill_level / 10.0) * 50;
END;
$$;

-- Calculate mana bonus from Magic skill
CREATE OR REPLACE FUNCTION get_magic_skill_bonus(skill_level INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  -- +30 max mana per 10 skill levels
  RETURN FLOOR(skill_level / 10.0) * 30;
END;
$$;

-- Calculate HP bonus from gathering skills
CREATE OR REPLACE FUNCTION get_gathering_skill_hp_bonus(skill_level INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  -- +3 max HP per skill level (capped at level 50)
  IF skill_level >= 99 THEN
    RETURN 30; -- Level 99: +30 HP
  ELSIF skill_level >= 50 THEN
    RETURN 15; -- Level 50: +15 HP
  ELSE
    RETURN 0;
  END IF;
END;
$$;

-- ============================================
-- PART 3: GATHERING XP SCALING BY TIER
-- ============================================

-- Add tier column to materials if missing
ALTER TABLE materials ADD COLUMN IF NOT EXISTS tier INTEGER DEFAULT 1;
ALTER TABLE materials ADD COLUMN IF NOT EXISTS base_xp INTEGER DEFAULT 10;

-- Assign tiers to existing materials based on required level
UPDATE materials
SET tier = CASE
  WHEN required_level <= 10 THEN 1
  WHEN required_level <= 25 THEN 2
  WHEN required_level <= 45 THEN 3
  WHEN required_level <= 70 THEN 4
  ELSE 5
END
WHERE tier IS NULL OR tier = 1;

-- Assign base XP to materials
UPDATE materials
SET base_xp = CASE
  WHEN tier = 1 THEN 10
  WHEN tier = 2 THEN 15
  WHEN tier = 3 THEN 20
  WHEN tier = 4 THEN 25
  WHEN tier = 5 THEN 30
  ELSE 10
END;

-- ============================================
-- PART 4: ADD MILESTONE REWARDS (EVERY 10 LEVELS)
-- ============================================

-- Clear existing milestone rewards to rebuild
DELETE FROM skill_milestones WHERE milestone_level % 10 != 0;

-- Add comprehensive milestone rewards for all skills at every 10 levels
INSERT INTO skill_milestones (skill_type, milestone_level, reward_type, reward_data, description)
SELECT
  sd.skill_type,
  level_milestone,
  CASE
    WHEN level_milestone = 10 THEN 'gold'
    WHEN level_milestone = 20 THEN 'stat_boost'
    WHEN level_milestone = 30 THEN 'gold'
    WHEN level_milestone = 40 THEN 'stat_boost'
    WHEN level_milestone = 50 THEN 'mastery_point'
    WHEN level_milestone = 60 THEN 'gold'
    WHEN level_milestone = 70 THEN 'stat_boost'
    WHEN level_milestone = 80 THEN 'gold'
    WHEN level_milestone = 90 THEN 'mastery_point'
    WHEN level_milestone = 99 THEN 'mastery_point'
  END,
  CASE
    -- Gold rewards scale with level
    WHEN level_milestone = 10 THEN jsonb_build_object('amount', 500)
    WHEN level_milestone = 30 THEN jsonb_build_object('amount', 2000)
    WHEN level_milestone = 60 THEN jsonb_build_object('amount', 10000)
    WHEN level_milestone = 80 THEN jsonb_build_object('amount', 50000)

    -- Combat skill stat boosts
    WHEN sd.skill_type IN ('attack', 'strength') AND level_milestone IN (20, 40, 70) THEN jsonb_build_object('attack', 5)
    WHEN sd.skill_type = 'defense' AND level_milestone IN (20, 40, 70) THEN jsonb_build_object('defense', 5)
    WHEN sd.skill_type = 'constitution' AND level_milestone IN (20, 40, 70) THEN jsonb_build_object('max_health', 50)
    WHEN sd.skill_type = 'magic' AND level_milestone IN (20, 40, 70) THEN jsonb_build_object('max_mana', 30)
    WHEN sd.skill_type = 'ranged' AND level_milestone IN (20, 40, 70) THEN jsonb_build_object('attack', 3)

    -- Gathering skill HP boosts
    WHEN sd.category = 'gathering' AND level_milestone IN (20, 40, 70) THEN jsonb_build_object('max_health', 15)

    -- Artisan skill bonuses
    WHEN sd.category = 'artisan' AND level_milestone IN (20, 40, 70) THEN jsonb_build_object('max_mana', 10)

    -- Mastery points
    WHEN level_milestone IN (50, 90, 99) THEN jsonb_build_object('points', CASE level_milestone WHEN 99 THEN 3 WHEN 90 THEN 2 ELSE 1 END)

    ELSE '{}'::jsonb
  END,
  CASE
    WHEN level_milestone = 10 THEN 'First milestone reward'
    WHEN level_milestone = 50 THEN 'Halfway to mastery'
    WHEN level_milestone = 99 THEN 'MASTERY ACHIEVED!'
    ELSE 'Milestone reward'
  END
FROM skill_definitions sd
CROSS JOIN (VALUES (10), (20), (30), (40), (50), (60), (70), (80), (90), (99)) AS levels(level_milestone)
WHERE sd.skill_type NOT IN ('agility', 'thieving', 'slayer') -- Skip support skills for now
ON CONFLICT (skill_type, milestone_level) DO UPDATE SET
  reward_type = EXCLUDED.reward_type,
  reward_data = EXCLUDED.reward_data,
  description = EXCLUDED.description;

-- ============================================
-- PART 5: GATHERING SPEED BONUSES
-- ============================================

-- Calculate gathering speed reduction from skill level
CREATE OR REPLACE FUNCTION calculate_gathering_speed_reduction(skill_level INTEGER)
RETURNS NUMERIC
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  -- 1% speed increase per skill level (max 99% at level 99)
  RETURN LEAST(skill_level * 0.01, 0.99);
END;
$$;

-- ============================================
-- PART 6: MATERIAL SELL PRICE INCREASE
-- ============================================

-- Triple material sell prices to make gathering worthwhile
UPDATE items
SET sell_price = sell_price * 3
WHERE type = 'material';

-- ============================================
-- PART 7: VALIDATION QUERIES
-- ============================================

DO $$
DECLARE
  skill_name TEXT;
  skill_level INTEGER;
BEGIN
  RAISE NOTICE '=== SKILL SYSTEM BALANCE ===';
  RAISE NOTICE '';

  RAISE NOTICE 'SKILL → STAT BONUSES:';
  FOR skill_level IN 10, 50, 99 LOOP
    RAISE NOTICE '  Level %:', skill_level;
    RAISE NOTICE '    Attack skill: +% attack', get_attack_skill_bonus(skill_level);
    RAISE NOTICE '    Defense skill: +% defense', get_defense_skill_bonus(skill_level);
    RAISE NOTICE '    Constitution: +% max HP', get_constitution_skill_bonus(skill_level);
    RAISE NOTICE '    Magic skill: +% max mana', get_magic_skill_bonus(skill_level);
    RAISE NOTICE '    Gathering skills: +% max HP each', get_gathering_skill_hp_bonus(skill_level);
  END LOOP;

  RAISE NOTICE '';
  RAISE NOTICE 'GATHERING SPEED BONUSES:';
  FOR skill_level IN 1, 25, 50, 75, 99 LOOP
    RAISE NOTICE '  Level %: %% faster (%% of base time)',
      skill_level,
      ROUND((calculate_gathering_speed_reduction(skill_level) * 100)::numeric, 0),
      ROUND(((1 - calculate_gathering_speed_reduction(skill_level)) * 100)::numeric, 0);
  END LOOP;

  RAISE NOTICE '';
  RAISE NOTICE 'MILESTONE REWARDS:';
  RAISE NOTICE '  % total milestones created', (SELECT COUNT(*) FROM skill_milestones);
  RAISE NOTICE '  Every 10 levels: Gold or stat boost';
  RAISE NOTICE '  Levels 50, 90, 99: Mastery Points';

  RAISE NOTICE '';
  RAISE NOTICE 'MATERIAL VALUE:';
  RAISE NOTICE '  All material sell prices tripled';
  RAISE NOTICE '  Oak Log: % gold', (SELECT sell_price FROM items WHERE id = 'oak_log' LIMIT 1);
  RAISE NOTICE '  Iron Ore: % gold', (SELECT sell_price FROM items WHERE id = 'iron_ore' LIMIT 1);
END $$;

-- ============================================
-- PART 8: DOCUMENTATION
-- ============================================

COMMENT ON FUNCTION get_attack_skill_bonus IS
'Returns attack stat bonus from Attack skill (+5 per 10 levels)';

COMMENT ON FUNCTION get_defense_skill_bonus IS
'Returns defense stat bonus from Defense skill (+5 per 10 levels)';

COMMENT ON FUNCTION get_constitution_skill_bonus IS
'Returns max HP bonus from Constitution skill (+50 per 10 levels)';

COMMENT ON FUNCTION get_magic_skill_bonus IS
'Returns max mana bonus from Magic skill (+30 per 10 levels)';

COMMENT ON FUNCTION get_gathering_skill_hp_bonus IS
'Returns max HP bonus from gathering skills (+15 at 50, +30 at 99)';

COMMENT ON FUNCTION calculate_gathering_speed_reduction IS
'Returns speed multiplier from skill level (1% per level, max 99%)';

COMMENT ON COLUMN materials.tier IS
'Material tier (1-5) for XP scaling and difficulty';

COMMENT ON COLUMN materials.base_xp IS
'Base XP awarded for gathering this material (before bonuses)';

-- ============================================
-- PART 9: CODE CHANGES REQUIRED
-- ============================================

-- NOTE: The following changes must be made in lib/gathering.ts and lib/skills.ts:

/*
REQUIRED CODE CHANGES:

1. lib/gathering.ts - Scale XP by tier (around line 150-170)
   Add after XP calculation:
     const materialTier = materialData.tier || 1
     const tierMultiplier = 1 + (materialTier * 0.6)
     const finalXP = Math.floor(baseXP * tierMultiplier)

2. lib/gathering.ts - Apply speed reduction from skill level
   In calculateGatheringTime function:
     const speedReduction = skillLevel * 0.01 // 1% per level
     const effectiveTime = baseTime * (1 - Math.min(speedReduction, 0.99))

3. lib/inventory.ts:314 - Update updateCharacterStats() to include skill bonuses
   Add before calculating total bonuses:
     // Get skill levels
     const { data: skills } = await supabase
       .from('character_skills')
       .select('*')
       .eq('character_id', characterId)

     // Calculate skill bonuses
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
       // Gathering skills give HP at 50 and 99
       if (['mining', 'woodcutting', 'fishing', 'hunting', 'alchemy'].includes(skill.skill_type)) {
         if (skill.level >= 99) skillHealthBonus += 30
         else if (skill.level >= 50) skillHealthBonus += 15
       }
     })

   Then add to final stat calculation:
     attack: baseAttack + attackBonus + skillAttackBonus,
     defense: baseDefense + defenseBonus + skillDefenseBonus,
     max_health: baseHealth + healthBonus + skillHealthBonus,
     max_mana: baseMana + manaBonus + skillManaBonus
*/

-- ============================================
-- MIGRATION COMPLETE
-- ============================================

INSERT INTO _migration_log (migration_name, applied_at, description) VALUES
  ('20250106000003_balance_skill_system', NOW(), 'Skills give stat bonuses, tier-based XP scaling, speed bonuses, milestone rewards every 10 levels')
ON CONFLICT (migration_name) DO NOTHING;
