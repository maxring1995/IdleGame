-- ============================================================================
-- LANDMARK DISCOVERY BONUSES
-- Add permanent attribute bonuses when discovering landmarks
-- ============================================================================

-- Add stat bonus columns to zone_landmarks
ALTER TABLE zone_landmarks
ADD COLUMN IF NOT EXISTS attack_bonus INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS defense_bonus INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS health_bonus INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS mana_bonus INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS speed_bonus DECIMAL(3,2) DEFAULT 0, -- Movement speed multiplier
ADD COLUMN IF NOT EXISTS discovery_bonus DECIMAL(3,2) DEFAULT 0, -- Discovery chance bonus
ADD COLUMN IF NOT EXISTS gold_find_bonus DECIMAL(3,2) DEFAULT 0, -- Gold find % bonus
ADD COLUMN IF NOT EXISTS xp_bonus DECIMAL(3,2) DEFAULT 0, -- XP gain % bonus
ADD COLUMN IF NOT EXISTS lore_text TEXT; -- Added if missing from previous migration

-- Create character_landmark_bonuses table to track active bonuses
CREATE TABLE IF NOT EXISTS character_landmark_bonuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  landmark_id UUID NOT NULL REFERENCES zone_landmarks(id) ON DELETE CASCADE,
  attack_bonus INTEGER DEFAULT 0,
  defense_bonus INTEGER DEFAULT 0,
  health_bonus INTEGER DEFAULT 0,
  mana_bonus INTEGER DEFAULT 0,
  speed_bonus DECIMAL(3,2) DEFAULT 0,
  discovery_bonus DECIMAL(3,2) DEFAULT 0,
  gold_find_bonus DECIMAL(3,2) DEFAULT 0,
  xp_bonus DECIMAL(3,2) DEFAULT 0,
  discovered_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(character_id, landmark_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_character_landmark_bonuses_character
  ON character_landmark_bonuses(character_id);

-- RLS Policies
ALTER TABLE character_landmark_bonuses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own landmark bonuses"
  ON character_landmark_bonuses FOR SELECT
  USING (character_id IN (
    SELECT id FROM characters WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can create their own landmark bonuses"
  ON character_landmark_bonuses FOR INSERT
  WITH CHECK (character_id IN (
    SELECT id FROM characters WHERE user_id = auth.uid()
  ));

-- Update existing landmarks with bonuses based on landmark type
UPDATE zone_landmarks
SET
  attack_bonus = CASE landmark_type
    WHEN 'shrine' THEN 2
    WHEN 'ruins' THEN 0
    WHEN 'vendor' THEN 0
    WHEN 'dungeon_entrance' THEN 5
    WHEN 'vista' THEN 0
    WHEN 'quest_giver' THEN 0
    WHEN 'teleport' THEN 0
    WHEN 'lore' THEN 0
    WHEN 'crafting' THEN 0
    ELSE 0
  END,
  defense_bonus = CASE landmark_type
    WHEN 'shrine' THEN 2
    WHEN 'ruins' THEN 1
    WHEN 'vendor' THEN 0
    WHEN 'dungeon_entrance' THEN 3
    WHEN 'vista' THEN 0
    WHEN 'quest_giver' THEN 0
    WHEN 'teleport' THEN 0
    WHEN 'lore' THEN 0
    WHEN 'crafting' THEN 1
    ELSE 0
  END,
  health_bonus = CASE landmark_type
    WHEN 'shrine' THEN 10
    WHEN 'ruins' THEN 5
    WHEN 'vendor' THEN 0
    WHEN 'dungeon_entrance' THEN 15
    WHEN 'vista' THEN 5
    WHEN 'quest_giver' THEN 0
    WHEN 'teleport' THEN 0
    WHEN 'lore' THEN 0
    WHEN 'crafting' THEN 5
    ELSE 0
  END,
  mana_bonus = CASE landmark_type
    WHEN 'shrine' THEN 10
    WHEN 'ruins' THEN 5
    WHEN 'vendor' THEN 0
    WHEN 'dungeon_entrance' THEN 5
    WHEN 'vista' THEN 10
    WHEN 'quest_giver' THEN 0
    WHEN 'teleport' THEN 5
    WHEN 'lore' THEN 5
    WHEN 'crafting' THEN 0
    ELSE 0
  END,
  discovery_bonus = CASE landmark_type
    WHEN 'shrine' THEN 0
    WHEN 'ruins' THEN 0.05
    WHEN 'vendor' THEN 0
    WHEN 'dungeon_entrance' THEN 0
    WHEN 'vista' THEN 0.10
    WHEN 'quest_giver' THEN 0
    WHEN 'teleport' THEN 0
    WHEN 'lore' THEN 0.03
    WHEN 'crafting' THEN 0
    ELSE 0
  END,
  gold_find_bonus = CASE landmark_type
    WHEN 'shrine' THEN 0.05
    WHEN 'ruins' THEN 0.08
    WHEN 'vendor' THEN 0.10
    WHEN 'dungeon_entrance' THEN 0.03
    WHEN 'vista' THEN 0
    WHEN 'quest_giver' THEN 0.05
    WHEN 'teleport' THEN 0
    WHEN 'lore' THEN 0
    WHEN 'crafting' THEN 0
    ELSE 0
  END,
  xp_bonus = CASE landmark_type
    WHEN 'shrine' THEN 0.05
    WHEN 'ruins' THEN 0.08
    WHEN 'vendor' THEN 0
    WHEN 'dungeon_entrance' THEN 0.10
    WHEN 'vista' THEN 0.05
    WHEN 'quest_giver' THEN 0.05
    WHEN 'teleport' THEN 0
    WHEN 'lore' THEN 0.10
    WHEN 'crafting' THEN 0.03
    ELSE 0
  END
WHERE attack_bonus IS NULL OR attack_bonus = 0;

-- Function to get total landmark bonuses for a character
CREATE OR REPLACE FUNCTION get_character_landmark_bonuses(p_character_id UUID)
RETURNS TABLE (
  total_attack INTEGER,
  total_defense INTEGER,
  total_health INTEGER,
  total_mana INTEGER,
  total_speed_multiplier DECIMAL,
  total_discovery_bonus DECIMAL,
  total_gold_find_bonus DECIMAL,
  total_xp_bonus DECIMAL
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
    COALESCE(SUM(xp_bonus), 0)::DECIMAL as total_xp_bonus
  FROM character_landmark_bonuses
  WHERE character_id = p_character_id;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON TABLE character_landmark_bonuses IS 'Tracks permanent stat bonuses from discovered landmarks';
COMMENT ON FUNCTION get_character_landmark_bonuses IS 'Returns total bonuses from all discovered landmarks for a character';
