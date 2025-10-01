-- =====================================================
-- Eternal Realms - Phase 3: Combat System
-- =====================================================

-- =====================================================
-- ENEMIES TABLE - Enemy Catalog
-- =====================================================
CREATE TABLE enemies (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  level INTEGER NOT NULL,
  health INTEGER NOT NULL,
  attack INTEGER NOT NULL,
  defense INTEGER NOT NULL,
  experience_reward INTEGER NOT NULL,
  gold_min INTEGER NOT NULL,
  gold_max INTEGER NOT NULL,
  loot_table JSONB DEFAULT '{}',
  required_player_level INTEGER DEFAULT 1,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT positive_level CHECK (level > 0),
  CONSTRAINT positive_health CHECK (health > 0),
  CONSTRAINT positive_attack CHECK (attack >= 0),
  CONSTRAINT positive_defense CHECK (defense >= 0),
  CONSTRAINT positive_experience CHECK (experience_reward >= 0),
  CONSTRAINT valid_gold_range CHECK (gold_min >= 0 AND gold_max >= gold_min),
  CONSTRAINT valid_required_level CHECK (required_player_level > 0)
);

-- Enemies table is readable by all authenticated users (no RLS needed for enemy catalog)
ALTER TABLE enemies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view enemies"
  ON enemies FOR SELECT
  TO authenticated
  USING (true);

-- =====================================================
-- COMBAT_LOGS TABLE - Battle History
-- =====================================================
CREATE TABLE combat_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  character_id UUID REFERENCES characters(id) ON DELETE CASCADE NOT NULL,
  enemy_id TEXT REFERENCES enemies(id) NOT NULL,
  victory BOOLEAN NOT NULL,
  turns_taken INTEGER DEFAULT 0,
  damage_dealt INTEGER DEFAULT 0,
  damage_taken INTEGER DEFAULT 0,
  experience_gained INTEGER DEFAULT 0,
  gold_gained INTEGER DEFAULT 0,
  items_looted JSONB DEFAULT '[]',
  combat_duration_ms INTEGER,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT positive_turns CHECK (turns_taken >= 0),
  CONSTRAINT positive_damage CHECK (damage_dealt >= 0 AND damage_taken >= 0),
  CONSTRAINT positive_rewards CHECK (experience_gained >= 0 AND gold_gained >= 0)
);

-- Index for querying player combat history
CREATE INDEX idx_combat_logs_character ON combat_logs(character_id, ended_at DESC);
CREATE INDEX idx_combat_logs_enemy ON combat_logs(enemy_id);

-- RLS Policies for combat_logs
ALTER TABLE combat_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own combat logs"
  ON combat_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM characters
      WHERE characters.id = combat_logs.character_id
      AND characters.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own combat logs"
  ON combat_logs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM characters
      WHERE characters.id = combat_logs.character_id
      AND characters.user_id = auth.uid()
    )
  );

-- =====================================================
-- ACTIVE_COMBAT TABLE - Current Battle State
-- =====================================================
CREATE TABLE active_combat (
  character_id UUID PRIMARY KEY REFERENCES characters(id) ON DELETE CASCADE,
  enemy_id TEXT REFERENCES enemies(id) NOT NULL,
  player_current_health INTEGER NOT NULL,
  enemy_current_health INTEGER NOT NULL,
  turn_number INTEGER DEFAULT 1,
  combat_log JSONB DEFAULT '[]',
  started_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT positive_health_values CHECK (player_current_health >= 0 AND enemy_current_health >= 0),
  CONSTRAINT positive_turn CHECK (turn_number > 0)
);

-- RLS Policies for active_combat
ALTER TABLE active_combat ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own active combat"
  ON active_combat FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM characters
      WHERE characters.id = active_combat.character_id
      AND characters.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage own active combat"
  ON active_combat FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM characters
      WHERE characters.id = active_combat.character_id
      AND characters.user_id = auth.uid()
    )
  );

-- =====================================================
-- INSERT STARTER ENEMIES
-- =====================================================

-- Tier 1: Beginner Enemies (Level 1-3)
INSERT INTO enemies (id, name, description, level, health, attack, defense, experience_reward, gold_min, gold_max, loot_table, required_player_level) VALUES
(
  'slime',
  'Slime',
  'A gelatinous blob that jiggles menacingly. Weak but numerous.',
  1,
  30,
  5,
  2,
  15,
  10,
  20,
  '{"health_potion": 0.20}',
  1
),
(
  'goblin_scout',
  'Goblin Scout',
  'A small, crafty goblin armed with a rusty dagger. Quick but fragile.',
  2,
  50,
  8,
  3,
  25,
  15,
  30,
  '{"health_potion": 0.15, "wooden_sword": 0.10, "leather_armor": 0.05}',
  1
),
(
  'wild_wolf',
  'Wild Wolf',
  'A fierce wolf with sharp fangs. Fast and aggressive.',
  3,
  70,
  12,
  4,
  40,
  25,
  40,
  '{"health_potion": 0.30, "mana_potion": 0.10}',
  2
);

-- Tier 2: Intermediate Enemies (Level 4-6)
INSERT INTO enemies (id, name, description, level, health, attack, defense, experience_reward, gold_min, gold_max, loot_table, required_player_level) VALUES
(
  'orc_warrior',
  'Orc Warrior',
  'A brutal orc wielding a heavy axe. Strong and resilient.',
  5,
  120,
  18,
  8,
  80,
  50,
  80,
  '{"health_potion": 0.25, "iron_sword": 0.15, "iron_armor": 0.10}',
  4
),
(
  'dark_mage',
  'Dark Mage',
  'A robed figure crackling with dark energy. High damage, low defense.',
  6,
  100,
  25,
  5,
  100,
  60,
  100,
  '{"mana_potion": 0.40, "health_potion": 0.20}',
  5
);

-- Tier 3: Advanced Enemies (Level 7-10)
INSERT INTO enemies (id, name, description, level, health, attack, defense, experience_reward, gold_min, gold_max, loot_table, required_player_level) VALUES
(
  'troll',
  'Troll',
  'A massive troll with incredible strength and regeneration. Very tough.',
  8,
  200,
  30,
  15,
  180,
  100,
  150,
  '{"health_potion": 0.35, "steel_sword": 0.20, "steel_armor": 0.15}',
  7
),
(
  'dragon_whelp',
  'Dragon Whelp',
  'A young dragon with fiery breath. Dangerous and valuable.',
  10,
  250,
  40,
  20,
  300,
  200,
  300,
  '{"health_potion": 0.30, "mana_potion": 0.25, "steel_sword": 0.10, "steel_armor": 0.10}',
  9
);

-- =====================================================
-- FUNCTIONS FOR COMBAT
-- =====================================================

-- Function to clean up stale active combat sessions (older than 1 hour)
CREATE OR REPLACE FUNCTION cleanup_stale_combat()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM active_combat
  WHERE updated_at < NOW() - INTERVAL '1 hour';
END;
$$;

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX idx_enemies_level ON enemies(level);
CREATE INDEX idx_enemies_required_level ON enemies(required_player_level);
CREATE INDEX idx_active_combat_updated ON active_combat(updated_at);

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE enemies IS 'Catalog of all enemies in the game with stats and loot tables';
COMMENT ON TABLE combat_logs IS 'Historical record of all combat encounters';
COMMENT ON TABLE active_combat IS 'Current ongoing combat sessions (one per character)';

COMMENT ON COLUMN enemies.loot_table IS 'JSON object mapping item_id to drop probability (0.0-1.0)';
COMMENT ON COLUMN combat_logs.items_looted IS 'JSON array of item_ids that dropped during combat';
COMMENT ON COLUMN active_combat.combat_log IS 'JSON array of turn-by-turn combat actions';
