-- ============================================
-- BALANCE MIGRATION: Quality of Life & Final Balance
-- Date: 2025-01-06
-- Phase: 3 (Polish)
-- ============================================
-- CHANGES:
-- 1. Add AFK diminishing returns (anti-bot)
-- 2. Update quest XP rewards
-- 3. Add achievement rewards
-- 4. Balance expedition costs
-- 5. Add helpful statistics views
-- ============================================

-- ============================================
-- PART 1: BACKUP EXISTING DATA
-- ============================================

CREATE TABLE IF NOT EXISTS _backup_quest_definitions_20250106 AS
SELECT * FROM quest_definitions WHERE EXISTS (SELECT 1 FROM quest_definitions LIMIT 1);

-- ============================================
-- PART 2: AFK DIMINISHING RETURNS
-- ============================================

-- Track last active time for AFK calculation
ALTER TABLE characters ADD COLUMN IF NOT EXISTS last_active_timestamp TIMESTAMPTZ DEFAULT NOW();

-- Update all characters to current time
UPDATE characters
SET last_active_timestamp = NOW()
WHERE last_active_timestamp IS NULL;

-- Calculate AFK penalty multiplier
CREATE OR REPLACE FUNCTION calculate_afk_penalty(last_active TIMESTAMPTZ)
RETURNS NUMERIC
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  afk_seconds INTEGER;
  penalty NUMERIC;
BEGIN
  afk_seconds := EXTRACT(EPOCH FROM (NOW() - last_active))::INTEGER;

  -- No penalty for first 8 hours (28,800 seconds)
  IF afk_seconds <= 28800 THEN
    RETURN 1.0;
  END IF;

  -- Apply diminishing returns after 8 hours
  -- Formula: 0.5 + (0.5 / (1 + (afk_time - 8hr) / 4hr))
  -- 8 hours: 100% gains
  -- 12 hours: 75% gains
  -- 24 hours: 55% gains
  -- 48 hours: 45% gains
  penalty := 0.5 + (0.5 / (1 + ((afk_seconds - 28800)::NUMERIC / 14400)));

  RETURN ROUND(penalty, 3);
END;
$$;

-- ============================================
-- PART 3: QUEST XP REWARDS REBALANCE
-- ============================================

-- Quest rewards should scale with new XP curve
ALTER TABLE quest_definitions ADD COLUMN IF NOT EXISTS xp_reward INTEGER DEFAULT 0;
ALTER TABLE quest_definitions ADD COLUMN IF NOT EXISTS gold_reward INTEGER DEFAULT 0;

-- Update quest reward scaling
CREATE OR REPLACE FUNCTION calculate_quest_xp_reward(
  quest_difficulty TEXT,
  required_level INTEGER
)
RETURNS INTEGER
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  base_xp INTEGER;
  difficulty_multiplier NUMERIC;
BEGIN
  -- Base XP from required level (scales with new XP curve)
  base_xp := required_level * 100;

  -- Difficulty multipliers
  difficulty_multiplier := CASE quest_difficulty
    WHEN 'easy' THEN 0.5
    WHEN 'medium' THEN 1.0
    WHEN 'hard' THEN 2.0
    WHEN 'elite' THEN 4.0
    ELSE 1.0
  END;

  RETURN FLOOR(base_xp * difficulty_multiplier);
END;
$$;

-- ============================================
-- PART 4: EXPEDITION SUPPLY COSTS
-- ============================================

-- Balance expedition supply costs
UPDATE expedition_supplies
SET cost = CASE
  WHEN id LIKE '%basic%' THEN 50
  WHEN id LIKE '%standard%' THEN 150
  WHEN id LIKE '%advanced%' THEN 400
  WHEN id LIKE '%premium%' THEN 1000
  ELSE 100
END;

-- ============================================
-- PART 5: HELPFUL STATISTICS VIEWS
-- ============================================

-- Player progression overview
CREATE OR REPLACE VIEW player_progression_stats AS
SELECT
  c.id AS character_id,
  c.name AS character_name,
  c.level AS character_level,
  c.experience AS total_xp,

  -- XP to next level
  calculate_character_xp_for_level(c.level + 1) - c.experience AS xp_to_next_level,

  -- Total skill levels
  (SELECT SUM(level) FROM character_skills WHERE character_id = c.id) AS total_skill_levels,

  -- Skills at 99
  (SELECT COUNT(*) FROM character_skills WHERE character_id = c.id AND level = 99) AS skills_maxed,

  -- Gold stats
  c.gold AS current_gold,
  COALESCE((SELECT SUM(total_price) FROM merchant_transactions WHERE character_id = c.id AND transaction_type = 'buy'), 0) AS gold_spent,
  COALESCE((SELECT SUM(total_price) FROM merchant_transactions WHERE character_id = c.id AND transaction_type = 'sell'), 0) AS gold_earned,

  -- Combat stats
  COALESCE((SELECT COUNT(*) FROM combat_logs WHERE character_id = c.id AND victory = true), 0) AS combat_victories,
  COALESCE((SELECT COUNT(*) FROM combat_logs WHERE character_id = c.id AND victory = false), 0) AS combat_defeats,

  -- Playtime estimate (from last_active)
  EXTRACT(EPOCH FROM (c.last_active - c.created_at))::INTEGER AS playtime_seconds,

  c.created_at AS account_created,
  c.last_active AS last_seen

FROM characters c;

COMMENT ON VIEW player_progression_stats IS
'Comprehensive player progression statistics dashboard';

-- Wealth leaderboard
CREATE OR REPLACE VIEW wealth_leaderboard AS
SELECT
  c.name,
  c.level,
  c.gold AS current_gold,
  COALESCE(t.total_earned, 0) AS total_gold_earned,
  COALESCE(t.total_spent, 0) AS total_gold_spent,
  c.gold + COALESCE(t.total_spent, 0) AS lifetime_gold
FROM characters c
LEFT JOIN (
  SELECT
    character_id,
    SUM(CASE WHEN transaction_type = 'sell' THEN total_price ELSE 0 END) AS total_earned,
    SUM(CASE WHEN transaction_type = 'buy' THEN total_price ELSE 0 END) AS total_spent
  FROM merchant_transactions
  GROUP BY character_id
) t ON t.character_id = c.id
ORDER BY lifetime_gold DESC;

COMMENT ON VIEW wealth_leaderboard IS
'Leaderboard ranked by lifetime gold earned';

-- Skill rankings
CREATE OR REPLACE VIEW skill_leaderboard AS
SELECT
  c.name AS character_name,
  cs.skill_type,
  cs.level AS skill_level,
  cs.experience AS total_xp,
  cs.prestige_level,
  RANK() OVER (PARTITION BY cs.skill_type ORDER BY cs.experience DESC) AS rank
FROM character_skills cs
JOIN characters c ON c.id = cs.character_id
WHERE cs.level > 1  -- Filter out level 1 skills
ORDER BY cs.skill_type, cs.experience DESC;

COMMENT ON VIEW skill_leaderboard IS
'Leaderboard for each skill type';

-- ============================================
-- PART 6: ACHIEVEMENT REWARD SYSTEM
-- ============================================

-- Add rewards to achievements
CREATE TABLE IF NOT EXISTS achievement_definitions (
  achievement_id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  description TEXT,
  reward_gold INTEGER DEFAULT 0,
  reward_xp INTEGER DEFAULT 0,
  reward_items JSONB DEFAULT '[]'::jsonb,
  icon TEXT DEFAULT '🏆',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sample achievement definitions
INSERT INTO achievement_definitions (achievement_id, display_name, description, reward_gold, reward_xp, icon) VALUES
  ('first_level', 'First Steps', 'Reach level 2', 100, 50, '⭐'),
  ('level_10', 'Apprentice', 'Reach level 10', 500, 500, '🎖️'),
  ('level_25', 'Journeyman', 'Reach level 25', 2000, 2000, '🏅'),
  ('level_50', 'Expert', 'Reach level 50', 10000, 10000, '💫'),
  ('level_99', 'Grandmaster', 'Reach level 99', 100000, 100000, '👑'),

  ('first_99', 'Skill Master', 'Get your first skill to 99', 50000, 50000, '🌟'),
  ('all_99', 'True Master', 'Get all skills to 99', 1000000, 1000000, '💎'),

  ('100_wins', 'Warrior', '100 combat victories', 5000, 5000, '⚔️'),
  ('1000_wins', 'Champion', '1000 combat victories', 50000, 50000, '🛡️'),

  ('first_boss', 'Boss Slayer', 'Defeat your first boss', 1000, 1000, '💀'),
  ('all_bosses', 'Legend', 'Defeat all bosses', 25000, 25000, '👹'),

  ('millionaire', 'Millionaire', 'Accumulate 1,000,000 gold', 10000, 10000, '💰'),
  ('explorer', 'Explorer', 'Discover all zones', 15000, 15000, '🗺️')
ON CONFLICT (achievement_id) DO NOTHING;

-- Enable RLS
ALTER TABLE achievement_definitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Achievement definitions viewable by all"
  ON achievement_definitions FOR SELECT
  TO authenticated
  USING (true);

-- ============================================
-- PART 7: BALANCE TWEAKS
-- ============================================

-- Increase starter gold (with new economy, 100 is too low)
UPDATE characters
SET gold = GREATEST(gold, 500)
WHERE level <= 5 AND gold < 500;

-- Set reasonable default stats for new characters
ALTER TABLE characters ALTER COLUMN gold SET DEFAULT 500;

-- ============================================
-- PART 8: VALIDATION QUERIES
-- ============================================

DO $$
DECLARE
  afk_time INTERVAL;
  penalty NUMERIC;
BEGIN
  RAISE NOTICE '=== QOL & FINAL BALANCE ===';
  RAISE NOTICE '';

  RAISE NOTICE 'AFK DIMINISHING RETURNS:';
  FOR afk_time IN
    SELECT * FROM (VALUES
      ('8 hours'::INTERVAL),
      ('12 hours'::INTERVAL),
      ('24 hours'::INTERVAL),
      ('48 hours'::INTERVAL)
    ) AS t(afk)
  LOOP
    penalty := calculate_afk_penalty(NOW() - afk_time);
    RAISE NOTICE '  % AFK: %% of normal idle gains',
      afk_time,
      ROUND(penalty * 100, 0);
  END LOOP;

  RAISE NOTICE '';
  RAISE NOTICE 'QUEST XP SCALING:';
  RAISE NOTICE '  Easy quest (Lv 10): % XP',
    calculate_quest_xp_reward('easy', 10);
  RAISE NOTICE '  Medium quest (Lv 25): % XP',
    calculate_quest_xp_reward('medium', 25);
  RAISE NOTICE '  Hard quest (Lv 50): % XP',
    calculate_quest_xp_reward('hard', 50);
  RAISE NOTICE '  Elite quest (Lv 75): % XP',
    calculate_quest_xp_reward('elite', 75);

  RAISE NOTICE '';
  RAISE NOTICE 'ACHIEVEMENT REWARDS:';
  RAISE NOTICE '  % total achievements defined',
    (SELECT COUNT(*) FROM achievement_definitions);
  RAISE NOTICE '  Level 99 achievement: % gold + % XP',
    (SELECT reward_gold FROM achievement_definitions WHERE achievement_id = 'level_99'),
    (SELECT reward_xp FROM achievement_definitions WHERE achievement_id = 'level_99');

  RAISE NOTICE '';
  RAISE NOTICE 'STATISTICS VIEWS CREATED:';
  RAISE NOTICE '  ✅ player_progression_stats';
  RAISE NOTICE '  ✅ wealth_leaderboard';
  RAISE NOTICE '  ✅ skill_leaderboard';
END $$;

-- ============================================
-- PART 9: DOCUMENTATION
-- ============================================

COMMENT ON FUNCTION calculate_afk_penalty IS
'Calculates idle gain penalty for AFK time (100% for 0-8hr, 75% at 12hr, 55% at 24hr)';

COMMENT ON FUNCTION calculate_quest_xp_reward IS
'Calculates XP reward for quest based on difficulty and required level';

COMMENT ON TABLE achievement_definitions IS
'Defines achievements and their rewards';

COMMENT ON COLUMN characters.last_active_timestamp IS
'Last time player performed an action (used for AFK penalty calculation)';

-- ============================================
-- PART 10: CODE CHANGES REQUIRED
-- ============================================

-- NOTE: Apply AFK penalty to idle gains in Game.tsx:

/*
REQUIRED CODE CHANGES in components/Game.tsx:

1. Line ~280: Apply AFK penalty to idle gains
   useEffect(() => {
     if (!character) return

     const interval = setInterval(async () => {
       // Get AFK penalty from database
       const { data: char } = await supabase
         .from('characters')
         .select('last_active_timestamp, level')
         .eq('id', character.id)
         .single()

       // Calculate penalty
       const afkSeconds = Math.floor((Date.now() - new Date(char.last_active_timestamp).getTime()) / 1000)
       let penalty = 1.0
       if (afkSeconds > 28800) {
         penalty = 0.5 + (0.5 / (1 + (afkSeconds - 28800) / 14400))
       }

       // Apply level-scaled idle gains with AFK penalty
       const idleXP = Math.floor(character.level * 10 * penalty)
       const idleGold = Math.floor(character.level * 20 * penalty)

       await addExperience(character.id, idleXP)
       await addGold(character.id, idleGold)

       // Update last_active_timestamp on any user action
       // (handled separately in action handlers)
     }, 5000)

     return () => clearInterval(interval)
   }, [character])

2. Update last_active_timestamp on user actions:
   // After combat, gathering, exploration, etc.
   await supabase
     .from('characters')
     .update({ last_active_timestamp: new Date().toISOString() })
     .eq('id', characterId)
*/

-- ============================================
-- MIGRATION COMPLETE
-- ============================================

INSERT INTO _migration_log (migration_name, applied_at, description) VALUES
  ('20250106000006_balance_qol', NOW(), 'AFK diminishing returns, quest XP scaling, achievement rewards, statistics views')
ON CONFLICT (migration_name) DO NOTHING;

-- ============================================
-- FINAL SUMMARY
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '╔════════════════════════════════════════════════════════════╗';
  RAISE NOTICE '║     ETERNAL REALMS - BALANCE OVERHAUL COMPLETE            ║';
  RAISE NOTICE '╠════════════════════════════════════════════════════════════╣';
  RAISE NOTICE '║ Phase 1 (Critical):                                       ║';
  RAISE NOTICE '║   ✅ Exponential character XP curve                       ║';
  RAISE NOTICE '║   ✅ Exploration rewards nerfed 80-90%%                   ║';
  RAISE NOTICE '║   ✅ Combat system rebalanced (HP, damage, XP)           ║';
  RAISE NOTICE '║                                                           ║';
  RAISE NOTICE '║ Phase 2 (Major):                                          ║';
  RAISE NOTICE '║   ✅ Skills grant stat bonuses                           ║';
  RAISE NOTICE '║   ✅ Tier-based gathering XP scaling                     ║';
  RAISE NOTICE '║   ✅ Economy overhaul (2-4x merchant markup)             ║';
  RAISE NOTICE '║   ✅ Equipment durability system                         ║';
  RAISE NOTICE '║                                                           ║';
  RAISE NOTICE '║ Phase 3 (Polish):                                         ║';
  RAISE NOTICE '║   ✅ Crafting XP +50%%, bulk crafting bonuses            ║';
  RAISE NOTICE '║   ✅ AFK diminishing returns (anti-bot)                  ║';
  RAISE NOTICE '║   ✅ Quest/achievement reward scaling                    ║';
  RAISE NOTICE '║   ✅ Statistics views and leaderboards                   ║';
  RAISE NOTICE '╠════════════════════════════════════════════════════════════╣';
  RAISE NOTICE '║ NEXT STEPS:                                               ║';
  RAISE NOTICE '║   1. Review code change comments in each migration       ║';
  RAISE NOTICE '║   2. Update TypeScript files as noted                    ║';
  RAISE NOTICE '║   3. Test progression on local environment               ║';
  RAISE NOTICE '║   4. Deploy to production when ready                     ║';
  RAISE NOTICE '╚════════════════════════════════════════════════════════════╝';
  RAISE NOTICE '';
END $$;
