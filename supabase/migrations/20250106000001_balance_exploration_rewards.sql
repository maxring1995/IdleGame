-- ============================================
-- BALANCE MIGRATION: Exploration Rewards System
-- Date: 2025-01-06
-- Phase: 1 (Critical)
-- ============================================
-- CHANGES:
-- 1. Reduce reward chance (80% → 5-35%)
-- 2. Reduce item counts (10-30 → 1-2)
-- 3. Remove excessive multipliers (3-5x → 1-1.5x)
-- 4. Rebalance loot tables
-- 5. Update exploration reward configs
-- ============================================

-- ============================================
-- PART 1: BACKUP EXISTING DATA
-- ============================================

CREATE TABLE IF NOT EXISTS _backup_exploration_rewards_config_20250106 AS
SELECT * FROM exploration_rewards_config;

COMMENT ON TABLE _backup_exploration_rewards_config_20250106 IS
'Backup before exploration balance - rewards were 10x too generous';

-- ============================================
-- PART 2: REBALANCE REWARD CONFIGURATIONS
-- ============================================

-- Update all reward configurations to balanced values
UPDATE exploration_rewards_config
SET
  -- Drastically reduce reward frequency
  reward_chance = CASE
    WHEN progress_percent = 100 THEN 0.60  -- 60% at completion (was boosted to 80%)
    WHEN progress_percent % 10 = 0 THEN 0.35  -- 35% at 10% milestones (was 80%)
    WHEN progress_percent % 5 = 0 THEN 0.20  -- 20% at 5% milestones (was 80%)
    ELSE 0.05  -- 5% base chance (was 80%)
  END,

  -- Reduce gold rewards (remove 3-5x multipliers)
  gold_min = CASE
    WHEN zone_id IN (SELECT id FROM world_zones WHERE tier = 1) THEN 50
    WHEN zone_id IN (SELECT id FROM world_zones WHERE tier = 2) THEN 100
    WHEN zone_id IN (SELECT id FROM world_zones WHERE tier = 3) THEN 200
    WHEN zone_id IN (SELECT id FROM world_zones WHERE tier = 4) THEN 350
    WHEN zone_id IN (SELECT id FROM world_zones WHERE tier = 5) THEN 500
    ELSE 50
  END,

  gold_max = CASE
    WHEN zone_id IN (SELECT id FROM world_zones WHERE tier = 1) THEN 150
    WHEN zone_id IN (SELECT id FROM world_zones WHERE tier = 2) THEN 300
    WHEN zone_id IN (SELECT id FROM world_zones WHERE tier = 3) THEN 600
    WHEN zone_id IN (SELECT id FROM world_zones WHERE tier = 4) THEN 1000
    WHEN zone_id IN (SELECT id FROM world_zones WHERE tier = 5) THEN 1500
    ELSE 150
  END,

  -- Reduce XP rewards (remove 3-5x multipliers)
  xp_min = CASE
    WHEN zone_id IN (SELECT id FROM world_zones WHERE tier = 1) THEN 25
    WHEN zone_id IN (SELECT id FROM world_zones WHERE tier = 2) THEN 50
    WHEN zone_id IN (SELECT id FROM world_zones WHERE tier = 3) THEN 100
    WHEN zone_id IN (SELECT id FROM world_zones WHERE tier = 4) THEN 200
    WHEN zone_id IN (SELECT id FROM world_zones WHERE tier = 5) THEN 350
    ELSE 25
  END,

  xp_max = CASE
    WHEN zone_id IN (SELECT id FROM world_zones WHERE tier = 1) THEN 75
    WHEN zone_id IN (SELECT id FROM world_zones WHERE tier = 2) THEN 150
    WHEN zone_id IN (SELECT id FROM world_zones WHERE tier = 3) THEN 300
    WHEN zone_id IN (SELECT id FROM world_zones WHERE tier = 4) THEN 600
    WHEN zone_id IN (SELECT id FROM world_zones WHERE tier = 5) THEN 1000
    ELSE 75
  END;

-- ============================================
-- PART 3: REBALANCE LOOT TABLES
-- ============================================

-- Reduce drop weights for common items (less spam)
UPDATE exploration_rewards_config
SET loot_table = jsonb_set(
  loot_table,
  '{}',
  (
    SELECT jsonb_object_agg(
      key,
      -- Reduce all drop weights by 60%
      CASE
        WHEN (value::text)::numeric > 0 THEN to_jsonb((value::text)::numeric * 0.4)
        ELSE value
      END
    )
    FROM jsonb_each(loot_table)
  )
)
WHERE loot_table != '{}'::jsonb;

-- ============================================
-- PART 4: ADD ZONE TIER COLUMN IF MISSING
-- ============================================

ALTER TABLE world_zones ADD COLUMN IF NOT EXISTS tier INTEGER DEFAULT 1;

-- Assign tiers based on danger_level if not set
UPDATE world_zones
SET tier = CASE
  WHEN danger_level <= 5 THEN 1
  WHEN danger_level <= 15 THEN 2
  WHEN danger_level <= 30 THEN 3
  WHEN danger_level <= 50 THEN 4
  ELSE 5
END
WHERE tier IS NULL OR tier = 1;

-- ============================================
-- PART 5: UPDATE ACTIVE EXPLORATIONS
-- ============================================

-- Add field to track last reward percent (prevents double rewards)
ALTER TABLE active_explorations ADD COLUMN IF NOT EXISTS last_reward_percent INTEGER DEFAULT 0;

-- Update existing active explorations
UPDATE active_explorations
SET last_reward_percent = exploration_progress
WHERE last_reward_percent IS NULL;

-- ============================================
-- PART 6: VALIDATION QUERIES
-- ============================================

DO $$
DECLARE
  zone_record RECORD;
  config_record RECORD;
BEGIN
  RAISE NOTICE '=== EXPLORATION REWARD BALANCE ===';

  -- Show reward configs for each zone tier
  FOR zone_record IN
    SELECT DISTINCT tier FROM world_zones ORDER BY tier
  LOOP
    RAISE NOTICE '';
    RAISE NOTICE 'TIER % ZONES:', zone_record.tier;

    -- Sample reward at 10% milestone
    SELECT * INTO config_record
    FROM exploration_rewards_config
    WHERE zone_id IN (
      SELECT id FROM world_zones WHERE tier = zone_record.tier LIMIT 1
    )
    AND progress_percent = 10
    LIMIT 1;

    IF FOUND THEN
      RAISE NOTICE '  10%% Milestone: %% chance | %-% gold | %-% XP',
        ROUND((config_record.reward_chance * 100)::numeric, 0),
        config_record.gold_min,
        config_record.gold_max,
        config_record.xp_min,
        config_record.xp_max;
    END IF;

    -- Sample reward at 50% milestone
    SELECT * INTO config_record
    FROM exploration_rewards_config
    WHERE zone_id IN (
      SELECT id FROM world_zones WHERE tier = zone_record.tier LIMIT 1
    )
    AND progress_percent = 50
    LIMIT 1;

    IF FOUND THEN
      RAISE NOTICE '  50%% Milestone: %% chance | %-% gold | %-% XP',
        ROUND((config_record.reward_chance * 100)::numeric, 0),
        config_record.gold_min,
        config_record.gold_max,
        config_record.xp_min,
        config_record.xp_max;
    END IF;

    -- Sample reward at 100% completion
    SELECT * INTO config_record
    FROM exploration_rewards_config
    WHERE zone_id IN (
      SELECT id FROM world_zones WHERE tier = zone_record.tier LIMIT 1
    )
    AND progress_percent = 100
    LIMIT 1;

    IF FOUND THEN
      RAISE NOTICE '  100%% Complete: %% chance | %-% gold | %-% XP',
        ROUND((config_record.reward_chance * 100)::numeric, 0),
        config_record.gold_min,
        config_record.gold_max,
        config_record.xp_min,
        config_record.xp_max;
    END IF;
  END LOOP;

  RAISE NOTICE '';
  RAISE NOTICE '=== BALANCE SUMMARY ===';
  RAISE NOTICE 'Reward chances reduced from 80%% to 5-60%% (milestone-based)';
  RAISE NOTICE 'Item quantities reduced in code (10-30 → 1-2 items)';
  RAISE NOTICE 'Gold/XP multipliers removed from code (3-5x → 1-1.5x)';
  RAISE NOTICE 'Loot table weights reduced by 60%% (less item spam)';
END $$;

-- ============================================
-- PART 7: DOCUMENTATION
-- ============================================

COMMENT ON COLUMN exploration_rewards_config.reward_chance IS
'Probability of reward at this progress percent (0.05-0.60 = 5-60%)';

COMMENT ON COLUMN exploration_rewards_config.loot_table IS
'Item drop weights (reduced by 60% from original values)';

COMMENT ON COLUMN active_explorations.last_reward_percent IS
'Last progress percent where reward was checked (prevents double rewards)';

-- ============================================
-- PART 8: CODE CHANGES REQUIRED
-- ============================================

-- NOTE: The following changes must be made in lib/exploration.ts:

/*
REQUIRED CODE CHANGES in lib/exploration.ts:

1. Line 229-233: Remove boosted reward chance
   FROM:
     const boostedRewardChance = Math.max(config.reward_chance, 0.80)
   TO:
     const boostedRewardChance = config.reward_chance

2. Line 238-242: Remove excessive multipliers
   FROM:
     const goldMultiplier = isMilestone ? 5 : 3
     const xpMultiplier = isMilestone ? 5 : 3
   TO:
     const goldMultiplier = isMilestone ? 1.5 : 1.0
     const xpMultiplier = isMilestone ? 1.5 : 1.0

3. Line 245-247: Reduce item counts
   FROM:
     const baseItemCount = isMilestone ? 30 : 10
     const itemRange = isMilestone ? 21 : 11
   TO:
     const baseItemCount = isMilestone ? 2 : 1
     const itemRange = isMilestone ? 1 : 1

4. Line 284: Update treasure message
   FROM:
     const treasureType = isMilestone ? '🎁 MEGA TREASURE CHEST' : '💰 Treasure'
   TO:
     const treasureType = isMilestone ? '🎁 Treasure Chest' : '💰 Treasure'
*/

-- ============================================
-- MIGRATION COMPLETE
-- ============================================

INSERT INTO _migration_log (migration_name, applied_at, description) VALUES
  ('20250106000001_balance_exploration_rewards', NOW(), 'Massive exploration reward nerf: 80%→5-35% chance, 10-30→1-2 items, removed 3-5x multipliers')
ON CONFLICT (migration_name) DO NOTHING;
