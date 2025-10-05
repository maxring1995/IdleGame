-- =====================================================
-- Eternal Realms - Deep Gathering System (Sprint 1-5)
-- =====================================================
-- This migration transforms the gathering system into a deep, engaging MMORPG-style
-- resource collection experience with nodes, tools, specializations, and dynamic events.

-- =====================================================
-- PART 1: Enhanced Gathering Nodes
-- =====================================================

-- Add new columns to gathering_nodes for node-based gameplay
ALTER TABLE gathering_nodes
ADD COLUMN IF NOT EXISTS quality_tier TEXT DEFAULT 'standard' CHECK (quality_tier IN ('poor', 'standard', 'rich')),
ADD COLUMN IF NOT EXISTS max_health INTEGER DEFAULT 3,
ADD COLUMN IF NOT EXISTS current_health INTEGER DEFAULT 3,
ADD COLUMN IF NOT EXISTS last_harvested_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_harvested_by UUID REFERENCES characters(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS spawn_position JSONB DEFAULT '{"x": 0, "y": 0}',
ADD COLUMN IF NOT EXISTS respawn_variance FLOAT DEFAULT 0.2; -- 20% variance in respawn time

-- Index for finding active nodes in zones
CREATE INDEX IF NOT EXISTS idx_gathering_nodes_active_zone ON gathering_nodes(world_zone, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_gathering_nodes_respawn ON gathering_nodes(last_harvested_at) WHERE is_active = false;

-- =====================================================
-- PART 2: Gathering Tools System
-- =====================================================

CREATE TABLE IF NOT EXISTS gathering_tools (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,

  -- Tool classification
  tool_type TEXT NOT NULL CHECK (tool_type IN ('axe', 'pickaxe', 'fishing_rod', 'hunting_knife', 'herbalism_sickle', 'divination_staff')),
  tier INTEGER NOT NULL CHECK (tier >= 1 AND tier <= 10),

  -- Gathering stats
  gathering_power FLOAT DEFAULT 1.0, -- Speed multiplier (1.0 = base, 2.0 = 2x faster)
  bonus_yield_chance FLOAT DEFAULT 0.0, -- Chance for extra material (0.0 - 1.0)
  bonus_yield_amount INTEGER DEFAULT 1, -- How many extra materials on bonus
  durability_max INTEGER DEFAULT 100,

  -- Special bonuses (JSONB for flexibility)
  special_bonuses JSONB DEFAULT '{}', -- {"gem_find": 0.15, "save_node_health": 0.10}

  -- Requirements
  required_level INTEGER DEFAULT 1,
  required_skill_type TEXT NOT NULL,

  -- Economy
  item_id TEXT REFERENCES items(id) ON DELETE SET NULL, -- Links to items table for inventory

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for tools
ALTER TABLE gathering_tools ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tools are viewable by everyone"
  ON gathering_tools FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE INDEX IF NOT EXISTS idx_tools_type_tier ON gathering_tools(tool_type, tier);

-- =====================================================
-- PART 3: Character Tool Equipment
-- =====================================================

CREATE TABLE IF NOT EXISTS character_equipped_tools (
  character_id UUID PRIMARY KEY REFERENCES characters(id) ON DELETE CASCADE,

  -- Tool slots
  axe_id TEXT REFERENCES gathering_tools(id) ON DELETE SET NULL,
  axe_durability INTEGER DEFAULT 0,

  pickaxe_id TEXT REFERENCES gathering_tools(id) ON DELETE SET NULL,
  pickaxe_durability INTEGER DEFAULT 0,

  fishing_rod_id TEXT REFERENCES gathering_tools(id) ON DELETE SET NULL,
  fishing_rod_durability INTEGER DEFAULT 0,

  hunting_knife_id TEXT REFERENCES gathering_tools(id) ON DELETE SET NULL,
  hunting_knife_durability INTEGER DEFAULT 0,

  herbalism_sickle_id TEXT REFERENCES gathering_tools(id) ON DELETE SET NULL,
  herbalism_sickle_durability INTEGER DEFAULT 0,

  divination_staff_id TEXT REFERENCES gathering_tools(id) ON DELETE SET NULL,
  divination_staff_durability INTEGER DEFAULT 0,

  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE character_equipped_tools ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own equipped tools"
  ON character_equipped_tools FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM characters
      WHERE characters.id = character_equipped_tools.character_id
      AND characters.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage own equipped tools"
  ON character_equipped_tools FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM characters
      WHERE characters.id = character_equipped_tools.character_id
      AND characters.user_id = auth.uid()
    )
  );

-- =====================================================
-- PART 4: Skill Specializations
-- =====================================================

CREATE TABLE IF NOT EXISTS gathering_specializations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,

  skill_type TEXT NOT NULL CHECK (skill_type IN ('woodcutting', 'mining', 'fishing', 'hunting', 'alchemy', 'magic')),

  -- Bonuses (JSONB for flexibility)
  bonuses JSONB NOT NULL DEFAULT '{}',
  -- Example: {"yield_multiplier": 1.5, "rare_find_chance": 0.10, "special_ability": "auto_smelt"}

  -- Requirements
  required_skill_level INTEGER DEFAULT 50,

  -- Visual
  icon TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE gathering_specializations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Specializations are viewable by everyone"
  ON gathering_specializations FOR SELECT
  USING (auth.role() = 'authenticated');

-- Add specialization to character_skills
ALTER TABLE character_skills
ADD COLUMN IF NOT EXISTS specialization_id TEXT REFERENCES gathering_specializations(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS specialization_unlocked_at TIMESTAMPTZ;

-- =====================================================
-- PART 5: Resource Hotspots & Dynamic Events
-- =====================================================

CREATE TABLE IF NOT EXISTS gathering_hotspots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Location
  world_zone TEXT NOT NULL,
  material_id TEXT NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
  position JSONB DEFAULT '{"x": 0, "y": 0}',

  -- Hotspot properties
  yield_multiplier FLOAT DEFAULT 3.0, -- 3x normal yield
  duration_minutes INTEGER DEFAULT 5,
  max_harvesters INTEGER DEFAULT 10, -- How many players can use it
  current_harvesters INTEGER DEFAULT 0,

  -- Timing
  spawned_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,

  -- Status
  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE gathering_hotspots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hotspots are viewable by everyone"
  ON gathering_hotspots FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE INDEX IF NOT EXISTS idx_hotspots_active ON gathering_hotspots(is_active, expires_at) WHERE is_active = true;

-- =====================================================
-- PART 6: Gathering Encounters
-- =====================================================

CREATE TABLE IF NOT EXISTS gathering_encounters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,

  -- Encounter details
  encounter_type TEXT NOT NULL CHECK (encounter_type IN ('treasure', 'rare_spawn', 'monster', 'wanderer', 'rune_discovery')),
  encounter_data JSONB NOT NULL DEFAULT '{}',

  -- Context
  triggered_at TIMESTAMPTZ DEFAULT NOW(),
  material_id TEXT REFERENCES materials(id) ON DELETE SET NULL,
  world_zone TEXT,

  -- Resolution
  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  resolution_action TEXT, -- 'claimed', 'fled', 'fought', etc.
  rewards_granted JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE gathering_encounters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own encounters"
  ON gathering_encounters FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM characters
      WHERE characters.id = gathering_encounters.character_id
      AND characters.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage own encounters"
  ON gathering_encounters FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM characters
      WHERE characters.id = gathering_encounters.character_id
      AND characters.user_id = auth.uid()
    )
  );

-- =====================================================
-- PART 7: Gathering Achievements
-- =====================================================

CREATE TABLE IF NOT EXISTS gathering_achievements (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN ('woodcutting', 'mining', 'fishing', 'hunting', 'alchemy', 'magic', 'general')),

  -- Requirements
  requirement_type TEXT NOT NULL, -- 'gather_count', 'rare_find', 'skill_level', etc.
  requirement_data JSONB NOT NULL DEFAULT '{}',

  -- Rewards
  title TEXT, -- "Lumberjack", "Master Angler"
  reward_item_id TEXT REFERENCES items(id) ON DELETE SET NULL,
  reward_gold INTEGER DEFAULT 0,

  -- Sorting
  sort_order INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE gathering_achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Achievements are viewable by everyone"
  ON gathering_achievements FOR SELECT
  USING (auth.role() = 'authenticated');

-- Track player achievement unlocks
CREATE TABLE IF NOT EXISTS character_gathering_achievements (
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  achievement_id TEXT NOT NULL REFERENCES gathering_achievements(id) ON DELETE CASCADE,

  unlocked_at TIMESTAMPTZ DEFAULT NOW(),
  progress JSONB DEFAULT '{}', -- Track progress toward achievement

  PRIMARY KEY (character_id, achievement_id)
);

ALTER TABLE character_gathering_achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own achievement progress"
  ON character_gathering_achievements FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM characters
      WHERE characters.id = character_gathering_achievements.character_id
      AND characters.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage own achievement progress"
  ON character_gathering_achievements FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM characters
      WHERE characters.id = character_gathering_achievements.character_id
      AND characters.user_id = auth.uid()
    )
  );

-- =====================================================
-- PART 8: Gathering Statistics Tracking
-- =====================================================

CREATE TABLE IF NOT EXISTS gathering_statistics (
  character_id UUID PRIMARY KEY REFERENCES characters(id) ON DELETE CASCADE,

  -- Per-skill totals
  total_wood_gathered INTEGER DEFAULT 0,
  total_ore_gathered INTEGER DEFAULT 0,
  total_fish_gathered INTEGER DEFAULT 0,
  total_meat_gathered INTEGER DEFAULT 0,
  total_herbs_gathered INTEGER DEFAULT 0,
  total_essence_gathered INTEGER DEFAULT 0,

  -- Special finds
  total_gems_found INTEGER DEFAULT 0,
  total_rare_spawns_found INTEGER DEFAULT 0,
  total_treasures_found INTEGER DEFAULT 0,

  -- Efficiency
  fastest_gather_time_ms INTEGER,
  total_nodes_depleted INTEGER DEFAULT 0,
  total_hotspots_claimed INTEGER DEFAULT 0,

  -- Encounters
  total_encounters INTEGER DEFAULT 0,
  total_monsters_fought INTEGER DEFAULT 0,
  total_wanderers_met INTEGER DEFAULT 0,

  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE gathering_statistics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own gathering stats"
  ON gathering_statistics FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM characters
      WHERE characters.id = gathering_statistics.character_id
      AND characters.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage own gathering stats"
  ON gathering_statistics FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM characters
      WHERE characters.id = gathering_statistics.character_id
      AND characters.user_id = auth.uid()
    )
  );

-- =====================================================
-- PART 9: Seasonal Events
-- =====================================================

CREATE TABLE IF NOT EXISTS gathering_seasonal_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  event_name TEXT NOT NULL,
  event_type TEXT NOT NULL, -- 'spring_growth', 'summer_fishing', 'autumn_harvest', 'winter_mining'

  -- Bonuses
  affected_skills TEXT[] NOT NULL, -- Array of skill types
  bonus_multipliers JSONB NOT NULL DEFAULT '{}', -- {"yield": 1.5, "xp": 2.0}

  -- Timing
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,

  -- Status
  is_active BOOLEAN DEFAULT true,

  -- Description
  description TEXT,
  announcement_text TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE gathering_seasonal_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Events are viewable by everyone"
  ON gathering_seasonal_events FOR SELECT
  USING (auth.role() = 'authenticated');

-- =====================================================
-- PART 10: Seed Data - Starter Tools
-- =====================================================

-- Basic tools for each gathering skill
INSERT INTO gathering_tools (id, name, description, tool_type, tier, gathering_power, bonus_yield_chance, required_level, required_skill_type) VALUES
  -- Woodcutting
  ('bronze_axe', 'Bronze Axe', 'A basic axe for cutting trees', 'axe', 1, 1.0, 0.05, 1, 'woodcutting'),
  ('iron_axe', 'Iron Axe', 'A sturdy iron axe', 'axe', 2, 1.2, 0.08, 15, 'woodcutting'),
  ('steel_axe', 'Steel Axe', 'A sharp steel axe', 'axe', 3, 1.4, 0.12, 30, 'woodcutting'),
  ('mithril_axe', 'Mithril Axe', 'Lightweight and fast', 'axe', 4, 1.7, 0.18, 50, 'woodcutting'),
  ('dragon_axe', 'Dragon Axe', 'Legendary woodcutting tool', 'axe', 5, 2.0, 0.30, 75, 'woodcutting'),

  -- Mining
  ('bronze_pickaxe', 'Bronze Pickaxe', 'A basic mining tool', 'pickaxe', 1, 1.0, 0.05, 1, 'mining'),
  ('iron_pickaxe', 'Iron Pickaxe', 'Reliable for harder ores', 'pickaxe', 2, 1.3, 0.10, 15, 'mining'),
  ('steel_pickaxe', 'Steel Pickaxe', 'Enhanced mining speed', 'pickaxe', 3, 1.5, 0.15, 30, 'mining'),
  ('mithril_pickaxe', 'Mithril Pickaxe', 'Increased gem find rate', 'pickaxe', 4, 1.8, 0.22, 50, 'mining'),
  ('dragon_pickaxe', 'Dragon Pickaxe', 'Ultimate mining power', 'pickaxe', 5, 2.2, 0.35, 75, 'mining'),

  -- Fishing
  ('basic_fishing_rod', 'Basic Fishing Rod', 'Simple fishing rod', 'fishing_rod', 1, 1.0, 0.03, 1, 'fishing'),
  ('fly_fishing_rod', 'Fly Fishing Rod', 'Good for rivers', 'fishing_rod', 2, 1.2, 0.07, 20, 'fishing'),
  ('deep_sea_rod', 'Deep Sea Rod', 'Built for ocean fishing', 'fishing_rod', 3, 1.5, 0.12, 40, 'fishing'),
  ('legendary_rod', 'Legendary Rod', 'Catches the rarest fish', 'fishing_rod', 4, 2.0, 0.25, 70, 'fishing'),

  -- Hunting
  ('stone_knife', 'Stone Hunting Knife', 'Primitive but effective', 'hunting_knife', 1, 1.0, 0.04, 1, 'hunting'),
  ('steel_knife', 'Steel Hunting Knife', 'Sharp and precise', 'hunting_knife', 2, 1.3, 0.10, 20, 'hunting'),
  ('masters_knife', 'Master''s Hunting Knife', 'Expertly crafted', 'hunting_knife', 3, 1.7, 0.20, 50, 'hunting'),

  -- Alchemy
  ('rusty_sickle', 'Rusty Sickle', 'Basic herb gathering', 'herbalism_sickle', 1, 1.0, 0.05, 1, 'alchemy'),
  ('silver_sickle', 'Silver Sickle', 'Better herb preservation', 'herbalism_sickle', 2, 1.4, 0.15, 25, 'alchemy'),
  ('enchanted_sickle', 'Enchanted Sickle', 'Magical herb enhancement', 'herbalism_sickle', 3, 1.8, 0.25, 60, 'alchemy'),

  -- Magic
  ('apprentice_staff', 'Apprentice Divination Staff', 'Channels essence', 'divination_staff', 1, 1.0, 0.06, 1, 'magic'),
  ('adept_staff', 'Adept Divination Staff', 'Improved essence channeling', 'divination_staff', 2, 1.3, 0.12, 30, 'magic'),
  ('archmage_staff', 'Archmage Divination Staff', 'Master of essence', 'divination_staff', 3, 1.8, 0.22, 70, 'magic')
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- PART 11: Seed Data - Specializations
-- =====================================================

INSERT INTO gathering_specializations (id, name, description, skill_type, bonuses, required_skill_level, icon) VALUES
  -- Woodcutting
  ('spec_lumberjack', 'Lumberjack', 'Master of timber. +50% wood yield and chance for double logs.', 'woodcutting',
   '{"yield_multiplier": 1.5, "double_drop_chance": 0.25}', 50, '🪵'),
  ('spec_forester', 'Forester', 'One with nature. See rare trees and find nature runes.', 'woodcutting',
   '{"rare_node_vision": true, "nature_rune_chance": 0.15}', 50, '🌳'),

  -- Mining
  ('spec_prospector', 'Prospector', 'Gem hunter. Double gem find chance and identify ore quality.', 'mining',
   '{"gem_find_multiplier": 2.0, "quality_vision": true}', 50, '💎'),
  ('spec_smelter', 'Smelter', 'Auto-smelts ores into bars instantly.', 'mining',
   '{"auto_smelt": true, "bar_yield_bonus": 0.10}', 50, '🔥'),

  -- Fishing
  ('spec_deep_sea', 'Deep Sea Fisher', 'Access deep ocean spots and legendary fish.', 'fishing',
   '{"deep_ocean_access": true, "legendary_fish_chance": 0.10}', 50, '🌊'),
  ('spec_fish_monger', 'Fish Monger', '+50% gold from fish sales, catch 2 fish per action.', 'fishing',
   '{"sell_price_multiplier": 1.5, "double_catch_chance": 0.30}', 50, '🐟'),

  -- Hunting
  ('spec_tracker', 'Tracker', 'See animal migrations, +100% rare pelt chance.', 'hunting',
   '{"migration_vision": true, "rare_pelt_multiplier": 2.0}', 50, '👣'),
  ('spec_beastmaster', 'Beastmaster', 'Chance to tame creatures as gathering pets.', 'hunting',
   '{"tame_chance": 0.05, "pet_gathering_bonus": 0.20}', 50, '🐻'),

  -- Alchemy
  ('spec_herbologist', 'Herbologist', 'Never fail herb gathering, +20% herb yield.', 'alchemy',
   '{"failure_immunity": true, "yield_multiplier": 1.2}', 50, '🌿'),
  ('spec_potioneer', 'Potioneer', 'Herbs have chance to be pre-processed for potions.', 'alchemy',
   '{"auto_process_chance": 0.25, "potion_bonus": 0.15}', 50, '⚗️'),

  -- Magic
  ('spec_elementalist', 'Elementalist', 'Gather all elemental essences 50% faster.', 'magic',
   '{"elemental_speed": 1.5, "essence_purity_bonus": 0.10}', 50, '⚡'),
  ('spec_runecrafter', 'Runecrafter', 'Runes yield 2x and unlock ancient rune crafting.', 'magic',
   '{"rune_yield_multiplier": 2.0, "ancient_rune_access": true}', 50, '🔮')
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- PART 12: Seed Data - Sample Achievements
-- =====================================================

INSERT INTO gathering_achievements (id, name, description, category, requirement_type, requirement_data, title, reward_gold, sort_order) VALUES
  ('achieve_woodcutter', 'Woodcutter', 'Cut 100 trees', 'woodcutting', 'gather_count', '{"material_type": "wood", "count": 100}', 'Woodcutter', 500, 1),
  ('achieve_lumberjack', 'Lumberjack', 'Cut 1000 trees', 'woodcutting', 'gather_count', '{"material_type": "wood", "count": 1000}', 'Lumberjack', 5000, 2),
  ('achieve_timber_lord', 'Timber Lord', 'Reach level 99 Woodcutting', 'woodcutting', 'skill_level', '{"skill": "woodcutting", "level": 99}', 'Timber Lord', 50000, 3),

  ('achieve_miner', 'Miner', 'Mine 100 ores', 'mining', 'gather_count', '{"material_type": "ore", "count": 100}', 'Miner', 500, 4),
  ('achieve_prospector', 'Prospector', 'Find 100 gems', 'mining', 'gather_count', '{"material_type": "gem", "count": 100}', 'Prospector', 10000, 5),

  ('achieve_angler', 'Angler', 'Catch 100 fish', 'fishing', 'gather_count', '{"material_type": "fish", "count": 100}', 'Angler', 500, 6),
  ('achieve_master_angler', 'Master Angler', 'Catch every type of fish', 'fishing', 'collection_complete', '{"material_type": "fish"}', 'Master Angler', 25000, 7),

  ('achieve_hunter', 'Hunter', 'Hunt 50 creatures', 'hunting', 'gather_count', '{"material_type": "meat", "count": 50}', 'Hunter', 500, 8),
  ('achieve_pelt_collector', 'Pelt Collector', 'Gather 100 pelts', 'hunting', 'gather_count', '{"material_type": "pelt", "count": 100}', 'Pelt Collector', 2500, 9),

  ('achieve_herbalist', 'Herbalist', 'Gather 200 herbs', 'alchemy', 'gather_count', '{"material_type": "herb", "count": 200}', 'Herbalist', 1000, 10),

  ('achieve_essence_gatherer', 'Essence Gatherer', 'Gather 300 essences', 'magic', 'gather_count', '{"material_type": "essence", "count": 300}', 'Essence Gatherer', 1500, 11),

  ('achieve_resource_lord', 'Resource Lord', 'Reach level 99 in all gathering skills', 'general', 'all_skills_max', '{"level": 99}', 'Resource Lord', 100000, 99)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================
COMMENT ON TABLE gathering_tools IS 'Tools that enhance gathering speed, yield, and provide special bonuses';
COMMENT ON TABLE gathering_hotspots IS 'Temporary high-yield resource spawns that create dynamic player events';
COMMENT ON TABLE gathering_encounters IS 'Random events that occur during gathering (treasure, monsters, NPCs, etc.)';
COMMENT ON TABLE gathering_specializations IS 'Advanced specialization paths for gathering skills unlocked at level 50';
COMMENT ON TABLE gathering_achievements IS 'Long-term gathering goals that reward titles and items';
COMMENT ON TABLE gathering_statistics IS 'Comprehensive tracking of player gathering activity';
