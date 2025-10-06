-- ============================================
-- BALANCE MIGRATION: Core Character Progression
-- Date: 2025-01-06
-- Phase: 1 (Critical)
-- ============================================
-- CHANGES:
-- 1. Exponential XP curve (linear → exponential)
-- 2. Level-scaled stat bonuses
-- 3. Level-scaled idle generation
-- 4. Recalculate existing character progress
-- ============================================

-- ============================================
-- PART 1: BACKUP EXISTING DATA
-- ============================================

-- Create backup table for rollback
CREATE TABLE IF NOT EXISTS _backup_characters_20250106 AS
SELECT * FROM characters;

COMMENT ON TABLE _backup_characters_20250106 IS 'Backup before balance migration - can restore if needed';

-- ============================================
-- PART 2: NEW XP FORMULA (EXPONENTIAL)
-- ============================================

-- Calculate XP required for a given level (exponential curve)
CREATE OR REPLACE FUNCTION calculate_character_xp_for_level(target_level INTEGER)
RETURNS BIGINT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF target_level <= 1 THEN
    RETURN 0;
  END IF;

  -- Exponential formula: level^2.5 * 100
  RETURN FLOOR(POWER(target_level, 2.5) * 100);
END;
$$;

-- Calculate level from total XP (inverse function)
CREATE OR REPLACE FUNCTION calculate_level_from_character_xp(total_xp BIGINT)
RETURNS INTEGER
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  current_level INTEGER := 1;
  xp_for_next_level BIGINT;
BEGIN
  -- Cap at level 99
  WHILE current_level < 99 LOOP
    xp_for_next_level := calculate_character_xp_for_level(current_level + 1);

    IF total_xp < xp_for_next_level THEN
      RETURN current_level;
    END IF;

    current_level := current_level + 1;
  END LOOP;

  RETURN 99;
END;
$$;

-- ============================================
-- PART 3: NEW STAT CALCULATION (EXPONENTIAL)
-- ============================================

-- Calculate base attack stat from level
CREATE OR REPLACE FUNCTION calculate_base_attack(char_level INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  -- Formula: 10 + (level-1)*3 + floor(level/10)*5
  RETURN 10 + (char_level - 1) * 3 + FLOOR(char_level / 10.0) * 5;
END;
$$;

-- Calculate base defense stat from level
CREATE OR REPLACE FUNCTION calculate_base_defense(char_level INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  -- Formula: 5 + (level-1)*2 + floor(level/10)*3
  RETURN 5 + (char_level - 1) * 2 + FLOOR(char_level / 10.0) * 3;
END;
$$;

-- Calculate base max health from level
CREATE OR REPLACE FUNCTION calculate_base_max_health(char_level INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  -- Formula: 100 + (level-1)*25 + (level*level)/4
  RETURN 100 + (char_level - 1) * 25 + FLOOR((char_level * char_level) / 4.0);
END;
$$;

-- Calculate base max mana from level
CREATE OR REPLACE FUNCTION calculate_base_max_mana(char_level INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  -- Formula: 50 + (level-1)*15 + (level*level)/6
  RETURN 50 + (char_level - 1) * 15 + FLOOR((char_level * char_level) / 6.0);
END;
$$;

-- ============================================
-- PART 4: IDLE GENERATION (LEVEL-SCALED)
-- ============================================

-- Calculate idle XP gain (called every 5 seconds)
CREATE OR REPLACE FUNCTION calculate_idle_xp_gain(char_level INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  -- Formula: level * 10 (every 5 seconds)
  -- Level 1: 10 XP per 5 sec = 7,200 XP/hr
  -- Level 50: 500 XP per 5 sec = 360,000 XP/hr
  -- Level 99: 990 XP per 5 sec = 712,800 XP/hr
  RETURN char_level * 10;
END;
$$;

-- Calculate idle gold gain (called every 5 seconds)
CREATE OR REPLACE FUNCTION calculate_idle_gold_gain(char_level INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  -- Formula: level * 20 (every 5 seconds)
  -- Level 1: 20 gold per 5 sec = 14,400 gold/hr
  -- Level 50: 1000 gold per 5 sec = 720,000 gold/hr
  -- Level 99: 1980 gold per 5 sec = 1,425,600 gold/hr
  RETURN char_level * 20;
END;
$$;

-- ============================================
-- PART 5: DATA MIGRATION - RECALCULATE LEVELS
-- ============================================

-- Store old XP as a reference column
ALTER TABLE characters ADD COLUMN IF NOT EXISTS old_experience BIGINT;
ALTER TABLE characters ADD COLUMN IF NOT EXISTS xp_conversion_date TIMESTAMPTZ;

-- Copy current XP to old_experience for tracking
UPDATE characters
SET
  old_experience = experience,
  xp_conversion_date = NOW()
WHERE old_experience IS NULL;

-- Recalculate all character levels based on NEW curve
-- This will likely LOWER most character levels significantly
UPDATE characters
SET
  level = calculate_level_from_character_xp(experience),
  experience = GREATEST(experience, calculate_character_xp_for_level(level));

-- Recalculate base stats for all characters
-- Note: This updates BASE stats only; equipment bonuses are added separately
UPDATE characters c
SET
  attack = calculate_base_attack(c.level),
  defense = calculate_base_defense(c.level),
  max_health = calculate_base_max_health(c.level),
  max_mana = calculate_base_max_mana(c.level),
  -- Heal characters to full HP/MP after migration
  health = calculate_base_max_health(c.level),
  mana = calculate_base_max_mana(c.level);

-- Re-apply equipment bonuses by triggering stat recalculation
-- This will be handled by the inventory.ts updateCharacterStats() function
-- No SQL needed here, just a note for the frontend

-- ============================================
-- PART 6: ADD INDEXES FOR NEW FUNCTIONS
-- ============================================

-- Index for level-based queries
CREATE INDEX IF NOT EXISTS idx_characters_level_desc ON characters(level DESC);

-- Index for XP leaderboard
CREATE INDEX IF NOT EXISTS idx_characters_experience_desc ON characters(experience DESC);

-- ============================================
-- PART 7: VALIDATION QUERIES
-- ============================================

-- View XP requirements for key levels
DO $$
BEGIN
  RAISE NOTICE '=== NEW XP REQUIREMENTS ===';
  RAISE NOTICE 'Level 2: % XP', calculate_character_xp_for_level(2);
  RAISE NOTICE 'Level 10: % XP', calculate_character_xp_for_level(10);
  RAISE NOTICE 'Level 25: % XP', calculate_character_xp_for_level(25);
  RAISE NOTICE 'Level 50: % XP', calculate_character_xp_for_level(50);
  RAISE NOTICE 'Level 75: % XP', calculate_character_xp_for_level(75);
  RAISE NOTICE 'Level 99: % XP', calculate_character_xp_for_level(99);

  RAISE NOTICE '=== NEW STAT SCALING ===';
  RAISE NOTICE 'Level 1: % ATK, % DEF, % HP, % MP',
    calculate_base_attack(1),
    calculate_base_defense(1),
    calculate_base_max_health(1),
    calculate_base_max_mana(1);
  RAISE NOTICE 'Level 50: % ATK, % DEF, % HP, % MP',
    calculate_base_attack(50),
    calculate_base_defense(50),
    calculate_base_max_health(50),
    calculate_base_max_mana(50);
  RAISE NOTICE 'Level 99: % ATK, % DEF, % HP, % MP',
    calculate_base_attack(99),
    calculate_base_defense(99),
    calculate_base_max_health(99),
    calculate_base_max_mana(99);
END $$;

-- Show sample character transformations
DO $$
DECLARE
  char_record RECORD;
BEGIN
  RAISE NOTICE '=== CHARACTER LEVEL CHANGES (Sample) ===';
  FOR char_record IN
    SELECT
      id,
      name,
      old_experience,
      experience,
      level,
      attack,
      defense,
      max_health,
      max_mana
    FROM characters
    ORDER BY experience DESC
    LIMIT 5
  LOOP
    RAISE NOTICE 'Character: % | Old XP: % | New XP: % | Level: % | Stats: %/%/%/%',
      char_record.name,
      char_record.old_experience,
      char_record.experience,
      char_record.level,
      char_record.attack,
      char_record.defense,
      char_record.max_health,
      char_record.max_mana;
  END LOOP;
END $$;

-- ============================================
-- PART 8: DOCUMENTATION
-- ============================================

COMMENT ON FUNCTION calculate_character_xp_for_level IS
'Calculates total XP required to reach a given level using exponential formula: level^2.5 * 100';

COMMENT ON FUNCTION calculate_level_from_character_xp IS
'Determines character level from total XP earned (inverse of XP formula)';

COMMENT ON FUNCTION calculate_base_attack IS
'Calculates base attack stat from character level (equipment bonuses added separately)';

COMMENT ON FUNCTION calculate_base_defense IS
'Calculates base defense stat from character level (equipment bonuses added separately)';

COMMENT ON FUNCTION calculate_base_max_health IS
'Calculates base max health from character level (equipment bonuses added separately)';

COMMENT ON FUNCTION calculate_base_max_mana IS
'Calculates base max mana from character level (equipment bonuses added separately)';

COMMENT ON FUNCTION calculate_idle_xp_gain IS
'Calculates XP gained per 5-second idle tick (scales with level)';

COMMENT ON FUNCTION calculate_idle_gold_gain IS
'Calculates gold gained per 5-second idle tick (scales with level)';

-- ============================================
-- MIGRATION COMPLETE
-- ============================================

-- Log migration completion
INSERT INTO _migration_log (migration_name, applied_at, description) VALUES
  ('20250106000000_balance_core_progression', NOW(), 'Exponential XP curve, level-scaled stats, level-scaled idle gains')
ON CONFLICT DO NOTHING;

-- Create migration log table if it doesn't exist
CREATE TABLE IF NOT EXISTS _migration_log (
  id SERIAL PRIMARY KEY,
  migration_name TEXT UNIQUE NOT NULL,
  applied_at TIMESTAMPTZ NOT NULL,
  description TEXT
);
