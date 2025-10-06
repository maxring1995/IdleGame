-- ============================================================================
-- CROSS-SYSTEM FEEDBACK LOOPS
-- Creates interconnections between game systems for enhanced progression
-- ============================================================================

-- ============================================================================
-- 1. SKILL REQUIREMENTS FOR ZONE ACCESS
-- ============================================================================

-- Add skill requirements to world zones
CREATE TABLE IF NOT EXISTS zone_skill_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id UUID NOT NULL REFERENCES world_zones(id) ON DELETE CASCADE,
  skill_type TEXT NOT NULL, -- e.g., 'woodcutting', 'mining', 'combat', 'attack'
  required_level INTEGER NOT NULL DEFAULT 1,
  is_optional BOOLEAN DEFAULT FALSE, -- If true, meeting this helps but isn't required
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(zone_id, skill_type)
);

CREATE INDEX idx_zone_skill_requirements_zone ON zone_skill_requirements(zone_id);
CREATE INDEX idx_zone_skill_requirements_skill ON zone_skill_requirements(skill_type);

-- Function to check if character meets zone skill requirements
CREATE OR REPLACE FUNCTION check_zone_skill_requirements(
  p_character_id UUID,
  p_zone_id UUID
)
RETURNS TABLE (
  meets_requirements BOOLEAN,
  missing_requirements JSONB
) AS $$
DECLARE
  v_missing JSONB := '[]'::JSONB;
  v_requirement RECORD;
  v_character_skill_level INTEGER;
BEGIN
  -- Check each required skill
  FOR v_requirement IN
    SELECT skill_type, required_level, is_optional
    FROM zone_skill_requirements
    WHERE zone_id = p_zone_id AND is_optional = FALSE
  LOOP
    -- Get character's skill level
    SELECT COALESCE(level, 0) INTO v_character_skill_level
    FROM character_skills
    WHERE character_id = p_character_id
      AND skill_type = v_requirement.skill_type;

    -- If doesn't meet requirement, add to missing list
    IF v_character_skill_level < v_requirement.required_level THEN
      v_missing := v_missing || jsonb_build_object(
        'skill_type', v_requirement.skill_type,
        'required_level', v_requirement.required_level,
        'current_level', COALESCE(v_character_skill_level, 0)
      );
    END IF;
  END LOOP;

  -- Return results
  RETURN QUERY SELECT
    (jsonb_array_length(v_missing) = 0) as meets_requirements,
    v_missing as missing_requirements;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- 2. CRAFTING QUALITY BONUSES FROM EXPLORATION
-- ============================================================================

-- Add crafting quality bonus to landmarks
ALTER TABLE zone_landmarks
ADD COLUMN IF NOT EXISTS crafting_quality_bonus DECIMAL(3,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS crafting_speed_bonus DECIMAL(3,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS crafting_cost_reduction DECIMAL(3,2) DEFAULT 0;

-- Add to character landmark bonuses
ALTER TABLE character_landmark_bonuses
ADD COLUMN IF NOT EXISTS crafting_quality_bonus DECIMAL(3,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS crafting_speed_bonus DECIMAL(3,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS crafting_cost_reduction DECIMAL(3,2) DEFAULT 0;

-- Update existing landmarks with crafting bonuses
UPDATE zone_landmarks
SET
  crafting_quality_bonus = CASE landmark_type
    WHEN 'crafting' THEN 0.10  -- 10% better quality from crafting landmarks
    WHEN 'shrine' THEN 0.03    -- 3% from shrines
    WHEN 'ruins' THEN 0.05     -- 5% from ruins (ancient knowledge)
    WHEN 'lore' THEN 0.08      -- 8% from lore locations
    ELSE 0
  END,
  crafting_speed_bonus = CASE landmark_type
    WHEN 'crafting' THEN 0.15  -- 15% faster crafting
    WHEN 'shrine' THEN 0.05    -- 5% from shrines
    WHEN 'vendor' THEN 0.10    -- 10% from vendors (tips and tricks)
    ELSE 0
  END,
  crafting_cost_reduction = CASE landmark_type
    WHEN 'crafting' THEN 0.10  -- 10% material cost reduction
    WHEN 'vendor' THEN 0.15    -- 15% from vendors (better deals)
    WHEN 'ruins' THEN 0.05     -- 5% from ruins (efficient techniques)
    ELSE 0
  END
WHERE crafting_quality_bonus IS NULL OR crafting_quality_bonus = 0;

-- Function to get total crafting bonuses for a character
CREATE OR REPLACE FUNCTION get_character_crafting_bonuses(p_character_id UUID)
RETURNS TABLE (
  quality_bonus DECIMAL,
  speed_bonus DECIMAL,
  cost_reduction DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(crafting_quality_bonus), 0)::DECIMAL as quality_bonus,
    COALESCE(SUM(crafting_speed_bonus), 0)::DECIMAL as speed_bonus,
    COALESCE(SUM(crafting_cost_reduction), 0)::DECIMAL as cost_reduction
  FROM character_landmark_bonuses
  WHERE character_id = p_character_id;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- 3. COMBAT ABILITIES UNLOCK GATHERING SPEED BONUSES
-- ============================================================================

-- Create skill synergy bonuses table
CREATE TABLE IF NOT EXISTS skill_synergy_bonuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_skill_type TEXT NOT NULL, -- e.g., 'attack', 'defense', 'strength'
  required_level INTEGER NOT NULL,
  target_skill_type TEXT, -- NULL means applies to all skills in category
  target_category TEXT, -- 'gathering', 'crafting', 'combat', 'all'
  bonus_type TEXT NOT NULL, -- 'speed', 'yield', 'quality', 'critical_chance'
  bonus_value DECIMAL(5,3) NOT NULL, -- Multiplier or percentage
  display_name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(source_skill_type, required_level, target_skill_type, bonus_type)
);

CREATE INDEX idx_skill_synergy_source ON skill_synergy_bonuses(source_skill_type);
CREATE INDEX idx_skill_synergy_target ON skill_synergy_bonuses(target_skill_type);

-- Insert combat → gathering synergies
INSERT INTO skill_synergy_bonuses (
  source_skill_type,
  required_level,
  target_skill_type,
  target_category,
  bonus_type,
  bonus_value,
  display_name,
  description,
  icon
) VALUES
  -- Attack skill synergies
  ('attack', 25, NULL, 'gathering', 'speed', 0.05, 'Warrior''s Efficiency I', 'Combat experience makes you 5% faster at all gathering skills', '⚔️'),
  ('attack', 50, NULL, 'gathering', 'speed', 0.10, 'Warrior''s Efficiency II', 'Combat mastery makes you 10% faster at all gathering skills', '⚔️'),
  ('attack', 75, NULL, 'gathering', 'speed', 0.15, 'Warrior''s Efficiency III', 'Combat expertise makes you 15% faster at all gathering skills', '⚔️'),
  ('attack', 99, NULL, 'gathering', 'speed', 0.25, 'Warrior''s Mastery', 'Combat mastery makes you 25% faster at all gathering skills', '⚔️'),

  -- Defense skill synergies
  ('defense', 25, NULL, 'gathering', 'yield', 0.03, 'Defensive Precision I', 'Defensive training improves gathering yield by 3%', '🛡️'),
  ('defense', 50, NULL, 'gathering', 'yield', 0.05, 'Defensive Precision II', 'Defensive mastery improves gathering yield by 5%', '🛡️'),
  ('defense', 75, NULL, 'gathering', 'yield', 0.08, 'Defensive Precision III', 'Defensive expertise improves gathering yield by 8%', '🛡️'),

  -- Constitution synergies
  ('constitution', 40, NULL, 'gathering', 'stamina', 0.10, 'Enduring Worker', 'High constitution allows 10% longer gathering sessions', '❤️'),
  ('constitution', 80, NULL, 'gathering', 'stamina', 0.20, 'Tireless Worker', 'Exceptional constitution allows 20% longer gathering sessions', '❤️'),

  -- Strength synergies (affects woodcutting, mining specifically)
  ('strength', 30, 'woodcutting', 'gathering', 'speed', 0.10, 'Mighty Lumberjack', 'Strength makes woodcutting 10% faster', '💪'),
  ('strength', 30, 'mining', 'gathering', 'speed', 0.10, 'Powerful Miner', 'Strength makes mining 10% faster', '💪'),
  ('strength', 60, 'woodcutting', 'gathering', 'speed', 0.20, 'Legendary Lumberjack', 'Great strength makes woodcutting 20% faster', '💪'),
  ('strength', 60, 'mining', 'gathering', 'speed', 0.20, 'Master Miner', 'Great strength makes mining 20% faster', '💪'),

  -- Agility synergies (affects fishing, hunting)
  ('agility', 30, 'fishing', 'gathering', 'speed', 0.10, 'Swift Angler', 'Agility makes fishing 10% faster', '🏃'),
  ('agility', 30, 'hunting', 'gathering', 'speed', 0.10, 'Quick Hunter', 'Agility makes hunting 10% faster', '🏃'),
  ('agility', 60, 'fishing', 'gathering', 'speed', 0.20, 'Master Angler', 'Great agility makes fishing 20% faster', '🏃'),
  ('agility', 60, 'hunting', 'gathering', 'speed', 0.20, 'Elite Hunter', 'Great agility makes hunting 20% faster', '🏃'),

  -- Intelligence synergies (affects alchemy, magic)
  ('intelligence', 30, 'alchemy', 'gathering', 'quality', 0.10, 'Alchemical Insight', 'Intelligence improves alchemy quality by 10%', '🧠'),
  ('intelligence', 30, 'magic', 'gathering', 'quality', 0.10, 'Magical Precision', 'Intelligence improves magic gathering quality by 10%', '🧠'),
  ('intelligence', 60, 'alchemy', 'gathering', 'quality', 0.20, 'Master Alchemist', 'Great intelligence improves alchemy quality by 20%', '🧠'),
  ('intelligence', 60, 'magic', 'gathering', 'quality', 0.20, 'Archmage''s Touch', 'Great intelligence improves magic gathering quality by 20%', '🧠'),

  -- Crafting synergies from combat
  ('attack', 50, NULL, 'crafting', 'speed', 0.10, 'Combat Forger', 'Combat experience makes crafting 10% faster', '⚔️'),
  ('defense', 50, NULL, 'crafting', 'quality', 0.05, 'Defensive Crafter', 'Defensive knowledge improves crafting quality by 5%', '🛡️'),
  ('intelligence', 50, NULL, 'crafting', 'quality', 0.10, 'Intelligent Design', 'Intelligence improves crafting quality by 10%', '🧠');

-- Function to get all active synergy bonuses for a character
CREATE OR REPLACE FUNCTION get_character_synergy_bonuses(p_character_id UUID)
RETURNS TABLE (
  source_skill TEXT,
  target_skill TEXT,
  target_category TEXT,
  bonus_type TEXT,
  bonus_value DECIMAL,
  display_name TEXT,
  description TEXT,
  icon TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ssb.source_skill_type,
    ssb.target_skill_type,
    ssb.target_category,
    ssb.bonus_type,
    ssb.bonus_value,
    ssb.display_name,
    ssb.description,
    ssb.icon
  FROM skill_synergy_bonuses ssb
  INNER JOIN character_skills cs
    ON cs.skill_type = ssb.source_skill_type
    AND cs.level >= ssb.required_level
  WHERE cs.character_id = p_character_id
  ORDER BY ssb.source_skill_type, ssb.required_level;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to calculate gathering speed bonus for a specific skill
DROP FUNCTION IF EXISTS get_gathering_speed_bonus(UUID, TEXT);
CREATE OR REPLACE FUNCTION get_gathering_speed_bonus(
  p_character_id UUID,
  p_gathering_skill TEXT
)
RETURNS DECIMAL AS $$
DECLARE
  v_total_bonus DECIMAL := 0;
BEGIN
  -- Sum all applicable speed bonuses
  SELECT COALESCE(SUM(ssb.bonus_value), 0) INTO v_total_bonus
  FROM skill_synergy_bonuses ssb
  INNER JOIN character_skills cs
    ON cs.skill_type = ssb.source_skill_type
    AND cs.level >= ssb.required_level
  WHERE cs.character_id = p_character_id
    AND ssb.bonus_type = 'speed'
    AND ssb.target_category = 'gathering'
    AND (ssb.target_skill_type IS NULL OR ssb.target_skill_type = p_gathering_skill);

  RETURN v_total_bonus;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- 4. QUEST COMPLETION GRANTS PERMANENT MERCHANT DISCOUNTS
-- ============================================================================

-- Create permanent bonuses tracking table
CREATE TABLE IF NOT EXISTS character_permanent_bonuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  bonus_type TEXT NOT NULL, -- 'merchant_discount', 'xp_bonus', 'gold_find', etc.
  bonus_value DECIMAL(5,3) NOT NULL,
  source_type TEXT NOT NULL, -- 'quest', 'achievement', 'exploration', 'event'
  source_id UUID, -- ID of the quest/achievement/etc that granted this
  display_name TEXT NOT NULL,
  description TEXT,
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ, -- NULL for permanent
  is_active BOOLEAN DEFAULT TRUE
);

CREATE INDEX idx_character_permanent_bonuses_character ON character_permanent_bonuses(character_id);
CREATE INDEX idx_character_permanent_bonuses_type ON character_permanent_bonuses(bonus_type);
CREATE INDEX idx_character_permanent_bonuses_source ON character_permanent_bonuses(source_type, source_id);

-- Add merchant discount to quest rewards
-- Note: quest_definitions table structure may vary, adjust as needed
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quest_definitions'
    AND column_name = 'rewards'
  ) THEN
    -- Update existing quests to include merchant discount rewards
    -- This is just an example - adjust based on actual quest structure
    EXECUTE 'COMMENT ON COLUMN quest_definitions.rewards IS ''JSONB rewards can now include: {merchant_discount: 0.05} for 5% permanent discount''';
  END IF;
END $$;

-- Function to get total merchant discount for a character
CREATE OR REPLACE FUNCTION get_character_merchant_discount(p_character_id UUID)
RETURNS DECIMAL AS $$
DECLARE
  v_total_discount DECIMAL := 0;
BEGIN
  -- Sum all active merchant discount bonuses
  SELECT COALESCE(SUM(bonus_value), 0) INTO v_total_discount
  FROM character_permanent_bonuses
  WHERE character_id = p_character_id
    AND bonus_type = 'merchant_discount'
    AND is_active = TRUE
    AND (expires_at IS NULL OR expires_at > NOW());

  RETURN LEAST(v_total_discount, 0.75); -- Cap at 75% discount
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to grant permanent bonus (called when quest completes, etc.)
CREATE OR REPLACE FUNCTION grant_permanent_bonus(
  p_character_id UUID,
  p_bonus_type TEXT,
  p_bonus_value DECIMAL,
  p_source_type TEXT,
  p_source_id UUID,
  p_display_name TEXT,
  p_description TEXT DEFAULT NULL,
  p_expires_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_bonus_id UUID;
BEGIN
  INSERT INTO character_permanent_bonuses (
    character_id,
    bonus_type,
    bonus_value,
    source_type,
    source_id,
    display_name,
    description,
    expires_at
  ) VALUES (
    p_character_id,
    p_bonus_type,
    p_bonus_value,
    p_source_type,
    p_source_id,
    p_display_name,
    p_description,
    p_expires_at
  )
  RETURNING id INTO v_bonus_id;

  RETURN v_bonus_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 5. UNIFIED BONUS SYSTEM - Get ALL active bonuses for a character
-- ============================================================================

-- Create comprehensive view of all character bonuses
CREATE OR REPLACE FUNCTION get_all_character_bonuses(p_character_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB := '{}'::JSONB;
  v_landmark_bonuses RECORD;
  v_crafting_bonuses RECORD;
  v_synergy_bonuses JSONB;
  v_permanent_bonuses JSONB;
  v_merchant_discount DECIMAL;
BEGIN
  -- Get landmark bonuses
  SELECT * INTO v_landmark_bonuses
  FROM get_character_landmark_bonuses(p_character_id);

  v_result := v_result || jsonb_build_object(
    'landmark_bonuses', jsonb_build_object(
      'attack', v_landmark_bonuses.total_attack,
      'defense', v_landmark_bonuses.total_defense,
      'health', v_landmark_bonuses.total_health,
      'mana', v_landmark_bonuses.total_mana,
      'speed_multiplier', v_landmark_bonuses.total_speed_multiplier,
      'discovery_bonus', v_landmark_bonuses.total_discovery_bonus,
      'gold_find_bonus', v_landmark_bonuses.total_gold_find_bonus,
      'xp_bonus', v_landmark_bonuses.total_xp_bonus
    )
  );

  -- Get crafting bonuses
  SELECT * INTO v_crafting_bonuses
  FROM get_character_crafting_bonuses(p_character_id);

  v_result := v_result || jsonb_build_object(
    'crafting_bonuses', jsonb_build_object(
      'quality_bonus', v_crafting_bonuses.quality_bonus,
      'speed_bonus', v_crafting_bonuses.speed_bonus,
      'cost_reduction', v_crafting_bonuses.cost_reduction
    )
  );

  -- Get synergy bonuses
  SELECT jsonb_agg(
    jsonb_build_object(
      'source_skill', source_skill,
      'target_skill', target_skill,
      'target_category', target_category,
      'bonus_type', bonus_type,
      'bonus_value', bonus_value,
      'display_name', display_name,
      'description', description,
      'icon', icon
    )
  ) INTO v_synergy_bonuses
  FROM get_character_synergy_bonuses(p_character_id);

  v_result := v_result || jsonb_build_object(
    'synergy_bonuses', COALESCE(v_synergy_bonuses, '[]'::JSONB)
  );

  -- Get permanent bonuses
  SELECT jsonb_agg(
    jsonb_build_object(
      'bonus_type', bonus_type,
      'bonus_value', bonus_value,
      'display_name', display_name,
      'description', description,
      'source_type', source_type,
      'granted_at', granted_at,
      'expires_at', expires_at
    )
  ) INTO v_permanent_bonuses
  FROM character_permanent_bonuses
  WHERE character_id = p_character_id
    AND is_active = TRUE
    AND (expires_at IS NULL OR expires_at > NOW());

  v_result := v_result || jsonb_build_object(
    'permanent_bonuses', COALESCE(v_permanent_bonuses, '[]'::JSONB)
  );

  -- Get merchant discount
  SELECT get_character_merchant_discount(p_character_id) INTO v_merchant_discount;

  v_result := v_result || jsonb_build_object(
    'merchant_discount', v_merchant_discount
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- SAMPLE DATA: Add skill requirements to zones
-- ============================================================================

-- Add skill requirements to existing zones (examples)
INSERT INTO zone_skill_requirements (zone_id, skill_type, required_level, is_optional)
SELECT
  wz.id,
  'woodcutting',
  30,
  FALSE
FROM world_zones wz
WHERE wz.name = 'Whispering Woods' AND wz.required_level >= 10
ON CONFLICT (zone_id, skill_type) DO NOTHING;

INSERT INTO zone_skill_requirements (zone_id, skill_type, required_level, is_optional)
SELECT
  wz.id,
  'mining',
  50,
  FALSE
FROM world_zones wz
WHERE wz.name LIKE '%Mountain%' AND wz.required_level >= 20
ON CONFLICT (zone_id, skill_type) DO NOTHING;

INSERT INTO zone_skill_requirements (zone_id, skill_type, required_level, is_optional)
SELECT
  wz.id,
  'fishing',
  40,
  FALSE
FROM world_zones wz
WHERE wz.name LIKE '%Coast%' OR wz.name LIKE '%Shore%'
ON CONFLICT (zone_id, skill_type) DO NOTHING;

-- ============================================================================
-- COMMENTS AND DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE zone_skill_requirements IS 'Skill requirements for accessing zones - creates skill-gated progression';
COMMENT ON TABLE skill_synergy_bonuses IS 'Bonuses granted when source skill reaches certain levels - creates cross-system synergies';
COMMENT ON TABLE character_permanent_bonuses IS 'Permanent bonuses from quests, achievements, events - persistent rewards';

COMMENT ON FUNCTION check_zone_skill_requirements IS 'Checks if character meets all skill requirements for a zone';
COMMENT ON FUNCTION get_character_crafting_bonuses IS 'Returns total crafting bonuses from landmark discoveries';
COMMENT ON FUNCTION get_character_synergy_bonuses IS 'Returns all active skill synergy bonuses for a character';
COMMENT ON FUNCTION get_gathering_speed_bonus IS 'Calculates total gathering speed bonus for a specific skill';
COMMENT ON FUNCTION get_character_merchant_discount IS 'Returns total merchant discount (capped at 75%)';
COMMENT ON FUNCTION grant_permanent_bonus IS 'Grants a permanent bonus to a character';
COMMENT ON FUNCTION get_all_character_bonuses IS 'Returns ALL active bonuses for a character in a single JSONB object';

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE zone_skill_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill_synergy_bonuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE character_permanent_bonuses ENABLE ROW LEVEL SECURITY;

-- Zone skill requirements are public (everyone can see what's required)
CREATE POLICY "Zone skill requirements are viewable by everyone"
  ON zone_skill_requirements FOR SELECT
  USING (true);

-- Skill synergy bonuses are public (everyone can see synergies)
CREATE POLICY "Skill synergies are viewable by everyone"
  ON skill_synergy_bonuses FOR SELECT
  USING (true);

-- Permanent bonuses - users can view their own
CREATE POLICY "Users can view their own permanent bonuses"
  ON character_permanent_bonuses FOR SELECT
  USING (character_id IN (
    SELECT id FROM characters WHERE user_id = auth.uid()
  ));

-- Permanent bonuses - system can insert (via function)
CREATE POLICY "System can grant permanent bonuses"
  ON character_permanent_bonuses FOR INSERT
  WITH CHECK (character_id IN (
    SELECT id FROM characters WHERE user_id = auth.uid()
  ));

-- Update landmark bonus function to include crafting bonuses
DROP FUNCTION IF EXISTS get_character_landmark_bonuses(UUID);
CREATE OR REPLACE FUNCTION get_character_landmark_bonuses(p_character_id UUID)
RETURNS TABLE (
  total_attack INTEGER,
  total_defense INTEGER,
  total_health INTEGER,
  total_mana INTEGER,
  total_speed_multiplier DECIMAL,
  total_discovery_bonus DECIMAL,
  total_gold_find_bonus DECIMAL,
  total_xp_bonus DECIMAL,
  total_crafting_quality DECIMAL,
  total_crafting_speed DECIMAL,
  total_crafting_cost_reduction DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(attack_bonus), 0)::INTEGER as total_attack,
    COALESCE(SUM(defense_bonus), 0)::INTEGER as total_defense,
    COALESCE(SUM(health_bonus), 0)::INTEGER as total_health,
    COALESCE(SUM(mana_bonus), 0)::INTEGER as total_mana,
    COALESCE(SUM(speed_bonus), 0)::DECIMAL as total_speed_multiplier,
    COALESCE(SUM(discovery_bonus), 0)::DECIMAL as total_discovery_bonus,
    COALESCE(SUM(gold_find_bonus), 0)::DECIMAL as total_gold_find_bonus,
    COALESCE(SUM(xp_bonus), 0)::DECIMAL as total_xp_bonus,
    COALESCE(SUM(crafting_quality_bonus), 0)::DECIMAL as total_crafting_quality,
    COALESCE(SUM(crafting_speed_bonus), 0)::DECIMAL as total_crafting_speed,
    COALESCE(SUM(crafting_cost_reduction), 0)::DECIMAL as total_crafting_cost_reduction
  FROM character_landmark_bonuses
  WHERE character_id = p_character_id;
END;
$$ LANGUAGE plpgsql STABLE;
