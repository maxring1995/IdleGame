-- Migration: Add Dynamic Quest Generation System
-- Description: Enables contextual quest generation based on player state
-- Version: 1.0.0
-- Date: 2024-10-06

-- =====================================================
-- 1. Quest Templates Table
-- =====================================================
-- Stores templates for generating dynamic quests

CREATE TABLE quest_templates (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  category TEXT NOT NULL CHECK (category IN (
    'zone_exploration',      -- Based on recently discovered zones
    'combat_item',           -- Based on equipped items/weapons
    'skill_gathering',       -- Based on current skill levels
    'merchant_trade',        -- Based on merchant interactions
    'boss_challenge',        -- Boss-specific challenges
    'crafting_mastery'       -- Crafting-based quests
  )),

  -- Template text with placeholders (e.g., "Map the {zone_name} fully")
  title_template TEXT NOT NULL,
  description_template TEXT,
  objective_template TEXT NOT NULL,

  -- Level gating
  min_character_level INT DEFAULT 1,
  max_character_level INT DEFAULT 99,

  -- Base rewards (before scaling)
  base_xp_reward INT NOT NULL DEFAULT 100,
  base_gold_reward INT NOT NULL DEFAULT 50,
  base_item_rewards JSONB DEFAULT '{}', -- item_id -> quantity

  -- Reward scaling
  difficulty_multiplier DECIMAL(3,2) DEFAULT 1.0,
  xp_per_level INT DEFAULT 10, -- Additional XP per character level
  gold_per_level INT DEFAULT 5,  -- Additional gold per character level

  -- Conditions for when this template can be used
  required_conditions JSONB DEFAULT '{}',
  -- Examples:
  -- { "recently_discovered_zone": true }
  -- { "equipped_weapon_type": "sword" }
  -- { "skill_level": { "mining": 20 } }
  -- { "merchant_visits": 1 }

  -- Selection weight (higher = more likely to be chosen)
  weight INT DEFAULT 10,

  -- Quest type flags
  is_repeatable BOOLEAN DEFAULT true,
  reset_interval TEXT CHECK (reset_interval IN ('daily', 'weekly', 'monthly', null)),

  -- Metadata
  icon TEXT DEFAULT '📜',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_quest_templates_category ON quest_templates(category);
CREATE INDEX idx_quest_templates_level_range ON quest_templates(min_character_level, max_character_level);

-- =====================================================
-- 2. Modify quest_definitions Table
-- =====================================================
-- Add dynamic quest tracking fields

ALTER TABLE quest_definitions
  ADD COLUMN IF NOT EXISTS is_dynamic BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES quest_templates(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS context_snapshot JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS generated_at TIMESTAMPTZ;

CREATE INDEX idx_quest_definitions_is_dynamic ON quest_definitions(is_dynamic);
CREATE INDEX idx_quest_definitions_template_id ON quest_definitions(template_id);

-- =====================================================
-- 3. Dynamic Quest History Table
-- =====================================================
-- Tracks generated quests to prevent duplicates

CREATE TABLE dynamic_quest_history (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  character_id UUID REFERENCES characters(id) ON DELETE CASCADE NOT NULL,
  template_id UUID REFERENCES quest_templates(id) ON DELETE CASCADE NOT NULL,
  quest_definition_id TEXT REFERENCES quest_definitions(id) ON DELETE CASCADE,
  context_snapshot JSONB DEFAULT '{}',
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,

  CONSTRAINT unique_active_template_per_character UNIQUE(character_id, template_id, quest_definition_id)
);

CREATE INDEX idx_dynamic_quest_history_character ON dynamic_quest_history(character_id);
CREATE INDEX idx_dynamic_quest_history_template ON dynamic_quest_history(template_id);

-- RLS for dynamic_quest_history
ALTER TABLE dynamic_quest_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own quest history"
  ON dynamic_quest_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM characters
      WHERE characters.id = dynamic_quest_history.character_id
        AND characters.user_id = auth.uid()
    )
  );

CREATE POLICY "System can insert quest history"
  ON dynamic_quest_history FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM characters
      WHERE characters.id = dynamic_quest_history.character_id
        AND characters.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own quest history"
  ON dynamic_quest_history FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM characters
      WHERE characters.id = dynamic_quest_history.character_id
        AND characters.user_id = auth.uid()
    )
  );

-- =====================================================
-- 4. SQL Functions for Dynamic Quest Generation
-- =====================================================

-- Get player context for quest generation
CREATE OR REPLACE FUNCTION get_player_context(p_character_id UUID)
RETURNS JSONB AS $$
DECLARE
  context JSONB;
  char_data RECORD;
  recent_zones TEXT[];
  equipped_items JSONB;
  skill_levels JSONB;
  merchant_visits INT;
BEGIN
  -- Get character data
  SELECT c.*,
         COALESCE(
           (SELECT jsonb_object_agg(cs.skill_type, cs.level)
            FROM character_skills cs
            WHERE cs.character_id = c.id),
           '{}'::jsonb
         ) as skills
  INTO char_data
  FROM characters c
  WHERE c.id = p_character_id;

  IF NOT FOUND THEN
    RETURN '{}'::jsonb;
  END IF;

  -- Get recently discovered zones (last 5)
  SELECT array_agg(zone_id ORDER BY discovered_at DESC)
  INTO recent_zones
  FROM (
    SELECT DISTINCT zone_id, MAX(discovered_at) as discovered_at
    FROM character_zone_discoveries
    WHERE character_id = p_character_id
    GROUP BY zone_id
    ORDER BY MAX(discovered_at) DESC
    LIMIT 5
  ) recent;

  -- Get equipped items with types
  SELECT jsonb_object_agg(
    i.type,
    jsonb_build_object(
      'item_id', i.id,
      'name', i.name,
      'rarity', i.rarity
    )
  )
  INTO equipped_items
  FROM inventory inv
  JOIN items i ON i.id = inv.item_id
  WHERE inv.character_id = p_character_id
    AND inv.equipped = true;

  -- Count merchant transactions (from character_permanent_bonuses or similar)
  SELECT COUNT(DISTINCT source_id)
  INTO merchant_visits
  FROM character_permanent_bonuses
  WHERE character_id = p_character_id
    AND source_type = 'merchant';

  -- Build context object
  context := jsonb_build_object(
    'character_id', char_data.id,
    'level', char_data.level,
    'class', char_data.class,
    'skills', char_data.skills,
    'recent_zones', COALESCE(recent_zones, ARRAY[]::TEXT[]),
    'equipped_items', COALESCE(equipped_items, '{}'::jsonb),
    'merchant_visits', COALESCE(merchant_visits, 0),
    'total_xp', char_data.xp,
    'gold', char_data.gold,
    'generated_at', NOW()
  );

  RETURN context;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if a quest template matches player context
CREATE OR REPLACE FUNCTION check_template_conditions(
  p_template_id UUID,
  p_context JSONB
)
RETURNS BOOLEAN AS $$
DECLARE
  template RECORD;
  conditions JSONB;
  char_level INT;
BEGIN
  -- Get template
  SELECT * INTO template
  FROM quest_templates
  WHERE id = p_template_id;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- Check level range
  char_level := (p_context->>'level')::INT;
  IF char_level < template.min_character_level OR char_level > template.max_character_level THEN
    RETURN false;
  END IF;

  conditions := template.required_conditions;

  -- Check recently discovered zone requirement
  IF conditions ? 'recently_discovered_zone' AND (conditions->>'recently_discovered_zone')::BOOLEAN THEN
    IF jsonb_array_length(p_context->'recent_zones') = 0 THEN
      RETURN false;
    END IF;
  END IF;

  -- Check equipped weapon type requirement
  IF conditions ? 'equipped_weapon_type' THEN
    IF NOT (p_context->'equipped_items' ? 'weapon') THEN
      RETURN false;
    END IF;
  END IF;

  -- Check skill level requirement
  IF conditions ? 'skill_level' THEN
    DECLARE
      required_skill TEXT;
      required_level INT;
      current_level INT;
    BEGIN
      FOR required_skill IN SELECT jsonb_object_keys(conditions->'skill_level')
      LOOP
        required_level := (conditions->'skill_level'->>required_skill)::INT;
        current_level := COALESCE((p_context->'skills'->>required_skill)::INT, 1);

        IF current_level < required_level THEN
          RETURN false;
        END IF;
      END LOOP;
    END;
  END IF;

  -- Check merchant visits requirement
  IF conditions ? 'merchant_visits' THEN
    IF (p_context->>'merchant_visits')::INT < (conditions->>'merchant_visits')::INT THEN
      RETURN false;
    END IF;
  END IF;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Calculate scaled rewards for a quest
CREATE OR REPLACE FUNCTION calculate_quest_rewards(
  p_template_id UUID,
  p_character_level INT,
  p_difficulty_modifier DECIMAL DEFAULT 1.0
)
RETURNS JSONB AS $$
DECLARE
  template RECORD;
  xp_reward INT;
  gold_reward INT;
BEGIN
  SELECT * INTO template
  FROM quest_templates
  WHERE id = p_template_id;

  IF NOT FOUND THEN
    RETURN '{}'::jsonb;
  END IF;

  -- Calculate scaled rewards
  xp_reward := template.base_xp_reward
    + (template.xp_per_level * p_character_level)
    + ROUND((template.base_xp_reward * template.difficulty_multiplier * p_difficulty_modifier)::numeric);

  gold_reward := template.base_gold_reward
    + (template.gold_per_level * p_character_level)
    + ROUND((template.base_gold_reward * template.difficulty_multiplier * p_difficulty_modifier)::numeric);

  RETURN jsonb_build_object(
    'xp_reward', xp_reward,
    'gold_reward', gold_reward,
    'item_rewards', template.base_item_rewards
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 5. Insert Default Quest Templates
-- =====================================================

-- Zone Exploration Templates
INSERT INTO quest_templates (category, title_template, description_template, objective_template,
  min_character_level, base_xp_reward, base_gold_reward, required_conditions, icon, weight)
VALUES
  -- Recently discovered zones
  ('zone_exploration',
   'Map the {zone_name}',
   'Fully explore {zone_name} and discover all its secrets.',
   'Discover all {landmark_count} landmarks in {zone_name}',
   1, 200, 100,
   '{"recently_discovered_zone": true}',
   '🗺️', 15),

  ('zone_exploration',
   'Explore {zone_name} Thoroughly',
   'Spend time exploring {zone_name} to uncover hidden areas.',
   'Spend {time_minutes} minutes in {zone_name}',
   5, 150, 80,
   '{"recently_discovered_zone": true}',
   '⏱️', 12),

-- Combat Item Templates
  ('combat_item',
   'Master the {weapon_name}',
   'Prove your skill with {weapon_name} in battle.',
   'Win {win_count} battles using {weapon_name}',
   3, 250, 120,
   '{"equipped_weapon_type": "weapon"}',
   '⚔️', 14),

  ('combat_item',
   'Deadly {weapon_type} Strikes',
   'Deal massive damage with your {weapon_type}.',
   'Deal {damage_total} total damage with {weapon_type} equipped',
   8, 300, 150,
   '{"equipped_weapon_type": "weapon"}',
   '💥', 10),

-- Skill Gathering Templates
  ('skill_gathering',
   'Advanced {skill_name}',
   'Use your advanced {skill_name} skills to gather rare materials.',
   'Gather {quantity} {material_name} using {skill_name}',
   10, 350, 180,
   '{"skill_level": {"mining": 10}}',
   '⛏️', 13),

  ('skill_gathering',
   '{skill_name} Mastery',
   'Master {skill_name} by gathering diverse materials.',
   'Gather materials {times} times using {skill_name}',
   15, 400, 200,
   '{"skill_level": {"woodcutting": 15}}',
   '🪓', 11),

-- Merchant Trade Templates
  ('merchant_trade',
   'Merchant Network',
   'Establish trade relationships across the realm.',
   'Trade with {merchant_count} different merchants',
   5, 180, 100,
   '{"merchant_visits": 1}',
   '💰', 10),

  ('merchant_trade',
   'Economic Growth',
   'Accumulate wealth through trading.',
   'Earn {gold_amount} gold from merchant trades',
   10, 250, 0,  -- No gold reward since quest IS about earning gold
   '{"merchant_visits": 2}',
   '📈', 9),

-- Boss Challenge Templates
  ('boss_challenge',
   'Slay {boss_name}',
   'Defeat the fearsome {boss_name} in combat.',
   'Defeat {boss_name} {times} time(s)',
   15, 500, 300,
   '{}',
   '👑', 8),

-- Crafting Mastery Templates
  ('crafting_mastery',
   'Crafting Excellence',
   'Create high-quality items to prove your crafting skill.',
   'Craft {quantity} items of {rarity} rarity or higher',
   12, 300, 150,
   '{}',
   '🔨', 12);

-- Add comments
COMMENT ON TABLE quest_templates IS 'Templates for generating dynamic quests based on player context';
COMMENT ON TABLE dynamic_quest_history IS 'Tracks generated dynamic quests to prevent duplicates and manage lifecycle';
COMMENT ON FUNCTION get_player_context IS 'Returns current player state for contextual quest generation';
COMMENT ON FUNCTION check_template_conditions IS 'Validates if a quest template can be generated for a player';
COMMENT ON FUNCTION calculate_quest_rewards IS 'Calculates scaled rewards based on character level and difficulty';
