-- =====================================================
-- Eternal Realms - Phase 4: Gathering & Crafting System
-- =====================================================

-- =====================================================
-- MATERIALS TABLE - All gatherable resources
-- =====================================================
CREATE TABLE IF NOT EXISTS materials (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('wood', 'ore', 'fish', 'meat', 'pelt', 'herb', 'essence', 'rune', 'gem')),
  tier INTEGER NOT NULL CHECK (tier >= 1 AND tier <= 10),

  -- Gathering requirements
  required_skill_type TEXT NOT NULL CHECK (required_skill_type IN ('woodcutting', 'mining', 'fishing', 'hunting', 'alchemy', 'magic')),
  required_skill_level INTEGER DEFAULT 1,

  -- Gathering mechanics
  gathering_time_ms INTEGER DEFAULT 3000, -- Base time to gather one unit
  experience_reward INTEGER DEFAULT 10,

  -- Economy
  sell_price INTEGER DEFAULT 1,

  -- Rarity and stacking
  rarity TEXT DEFAULT 'common' CHECK (rarity IN ('common', 'uncommon', 'rare', 'epic', 'legendary')),
  stackable BOOLEAN DEFAULT true,
  max_stack INTEGER DEFAULT 1000,

  -- World zone requirement
  required_zone_level INTEGER DEFAULT 1, -- Character level needed to access this material's zone

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for materials (read-only for authenticated users)
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Materials are viewable by everyone"
  ON materials FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE INDEX IF NOT EXISTS idx_materials_type ON materials(type);
CREATE INDEX IF NOT EXISTS idx_materials_tier ON materials(tier);
CREATE INDEX IF NOT EXISTS idx_materials_skill ON materials(required_skill_type, required_skill_level);

-- =====================================================
-- GATHERING NODES TABLE - Resource spawn locations
-- =====================================================
CREATE TABLE IF NOT EXISTS gathering_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  node_type TEXT NOT NULL CHECK (node_type IN ('tree', 'ore_vein', 'fishing_spot', 'hunting_ground', 'herb_patch', 'ley_line')),
  material_id TEXT NOT NULL REFERENCES materials(id) ON DELETE CASCADE,

  -- World placement
  world_zone TEXT NOT NULL, -- 'starter_forest', 'iron_hills', 'deep_ocean', etc.
  required_zone_level INTEGER DEFAULT 1,

  -- Respawn mechanics
  respawn_time_ms INTEGER DEFAULT 60000, -- 1 minute default

  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE gathering_nodes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Nodes are viewable by everyone"
  ON gathering_nodes FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE INDEX IF NOT EXISTS idx_nodes_zone ON gathering_nodes(world_zone);
CREATE INDEX IF NOT EXISTS idx_nodes_material ON gathering_nodes(material_id);

-- =====================================================
-- CRAFTING RECIPES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS crafting_recipes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,

  -- Result
  result_item_id TEXT REFERENCES items(id) ON DELETE CASCADE,
  result_quantity INTEGER DEFAULT 1,

  -- Requirements
  required_crafting_level INTEGER DEFAULT 1,
  required_skill_type TEXT DEFAULT 'crafting' CHECK (required_skill_type IN ('crafting', 'alchemy', 'magic')),

  -- Ingredients (JSONB: { material_id: quantity })
  ingredients JSONB NOT NULL DEFAULT '{}',

  -- Crafting mechanics
  crafting_time_ms INTEGER DEFAULT 5000,
  experience_reward INTEGER DEFAULT 50,

  -- Category
  recipe_category TEXT DEFAULT 'general' CHECK (recipe_category IN ('weapon', 'armor', 'consumable', 'tool', 'general')),

  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE crafting_recipes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Recipes are viewable by everyone"
  ON crafting_recipes FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE INDEX IF NOT EXISTS idx_recipes_skill ON crafting_recipes(required_skill_type, required_crafting_level);
CREATE INDEX IF NOT EXISTS idx_recipes_category ON crafting_recipes(recipe_category);

-- =====================================================
-- ACTIVE GATHERING TABLE - Current gathering sessions
-- =====================================================
CREATE TABLE IF NOT EXISTS active_gathering (
  character_id UUID PRIMARY KEY REFERENCES characters(id) ON DELETE CASCADE,

  -- Session details
  skill_type TEXT NOT NULL,
  material_id TEXT NOT NULL REFERENCES materials(id) ON DELETE CASCADE,

  -- Progress
  quantity_goal INTEGER DEFAULT 1,
  quantity_gathered INTEGER DEFAULT 0,

  -- Timing
  started_at TIMESTAMPTZ DEFAULT NOW(),
  last_gathered_at TIMESTAMPTZ DEFAULT NOW(),

  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE active_gathering ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own gathering sessions"
  ON active_gathering FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM characters
      WHERE characters.id = active_gathering.character_id
      AND characters.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage own gathering sessions"
  ON active_gathering FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM characters
      WHERE characters.id = active_gathering.character_id
      AND characters.user_id = auth.uid()
    )
  );

-- Trigger for updated_at
CREATE TRIGGER update_active_gathering_updated_at BEFORE UPDATE ON active_gathering
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- SEED DATA: MATERIALS
-- =====================================================

-- ===== WOODCUTTING MATERIALS =====
INSERT INTO materials (id, name, description, type, tier, required_skill_type, required_skill_level, gathering_time_ms, experience_reward, sell_price, required_zone_level) VALUES
  ('oak_log', 'Oak Log', 'Sturdy wood from oak trees', 'wood', 1, 'woodcutting', 1, 3000, 25, 5, 1),
  ('willow_log', 'Willow Log', 'Flexible wood perfect for bows', 'wood', 2, 'woodcutting', 15, 4000, 50, 15, 11),
  ('maple_log', 'Maple Log', 'High-quality hardwood', 'wood', 3, 'woodcutting', 30, 5000, 100, 35, 25),
  ('yew_log', 'Yew Log', 'Prized wood for longbows', 'wood', 4, 'woodcutting', 45, 6000, 200, 75, 40),
  ('magic_log', 'Magic Log', 'Infused with arcane energy', 'wood', 5, 'woodcutting', 75, 8000, 500, 200, 70)
ON CONFLICT (id) DO NOTHING;

-- ===== MINING MATERIALS =====
INSERT INTO materials (id, name, description, type, tier, required_skill_type, required_skill_level, gathering_time_ms, experience_reward, sell_price, required_zone_level) VALUES
  ('copper_ore', 'Copper Ore', 'Basic metallic ore', 'ore', 1, 'mining', 1, 3500, 30, 8, 1),
  ('tin_ore', 'Tin Ore', 'Used in bronze alloys', 'ore', 1, 'mining', 1, 3500, 30, 8, 1),
  ('iron_ore', 'Iron Ore', 'Common and versatile ore', 'ore', 2, 'mining', 15, 4500, 60, 20, 11),
  ('coal', 'Coal', 'Essential fuel for smelting', 'ore', 2, 'mining', 20, 4000, 50, 15, 15),
  ('mithril_ore', 'Mithril Ore', 'Lightweight and strong', 'ore', 3, 'mining', 50, 6000, 150, 80, 45),
  ('adamantite_ore', 'Adamantite Ore', 'Extremely durable ore', 'ore', 4, 'mining', 70, 7500, 300, 150, 65),
  ('runite_ore', 'Runite Ore', 'Legendary metal infused with magic', 'ore', 5, 'mining', 85, 10000, 800, 400, 80)
ON CONFLICT (id) DO NOTHING;

-- ===== GEMS (Mining sub-category) =====
INSERT INTO materials (id, name, description, type, tier, required_skill_type, required_skill_level, gathering_time_ms, experience_reward, sell_price, rarity, stackable, max_stack, required_zone_level) VALUES
  ('sapphire', 'Sapphire', 'Blue precious gem', 'gem', 2, 'mining', 20, 8000, 100, 50, 'uncommon', true, 100, 15),
  ('emerald', 'Emerald', 'Green precious gem', 'gem', 3, 'mining', 30, 9000, 150, 100, 'rare', true, 100, 25),
  ('ruby', 'Ruby', 'Red precious gem', 'gem', 4, 'mining', 40, 10000, 200, 200, 'rare', true, 100, 35),
  ('diamond', 'Diamond', 'Crystal clear gem of immense value', 'gem', 5, 'mining', 60, 12000, 400, 500, 'epic', true, 100, 55),
  ('dragonstone', 'Dragonstone', 'Legendary gem from dragon lairs', 'gem', 6, 'mining', 85, 15000, 800, 1500, 'legendary', true, 50, 80)
ON CONFLICT (id) DO NOTHING;

-- ===== FISHING MATERIALS =====
INSERT INTO materials (id, name, description, type, tier, required_skill_type, required_skill_level, gathering_time_ms, experience_reward, sell_price, required_zone_level) VALUES
  ('raw_shrimp', 'Raw Shrimp', 'Small crustacean', 'fish', 1, 'fishing', 1, 2500, 20, 3, 1),
  ('raw_sardine', 'Raw Sardine', 'Common small fish', 'fish', 1, 'fishing', 5, 2800, 25, 5, 1),
  ('raw_trout', 'Raw Trout', 'Freshwater fish', 'fish', 2, 'fishing', 20, 3500, 60, 15, 15),
  ('raw_salmon', 'Raw Salmon', 'Prized river fish', 'fish', 3, 'fishing', 30, 4500, 100, 30, 25),
  ('raw_lobster', 'Raw Lobster', 'Delicious crustacean', 'fish', 4, 'fishing', 40, 5500, 150, 60, 35),
  ('raw_swordfish', 'Raw Swordfish', 'Large ocean predator', 'fish', 5, 'fishing', 50, 6500, 200, 100, 45),
  ('raw_shark', 'Raw Shark', 'Dangerous apex predator', 'fish', 6, 'fishing', 60, 8000, 300, 180, 55),
  ('raw_manta_ray', 'Raw Manta Ray', 'Graceful giant of the deep', 'fish', 7, 'fishing', 81, 10000, 500, 350, 75)
ON CONFLICT (id) DO NOTHING;

-- ===== HUNTING MATERIALS =====
INSERT INTO materials (id, name, description, type, tier, required_skill_type, required_skill_level, gathering_time_ms, experience_reward, sell_price, required_zone_level) VALUES
  ('rabbit_meat', 'Rabbit Meat', 'Lean meat from rabbits', 'meat', 1, 'hunting', 1, 3000, 25, 6, 1),
  ('wolf_pelt', 'Wolf Pelt', 'Thick fur from wolves', 'pelt', 2, 'hunting', 10, 4000, 50, 20, 8),
  ('bear_hide', 'Bear Hide', 'Tough leather from bears', 'pelt', 3, 'hunting', 25, 5500, 120, 50, 20),
  ('deer_antlers', 'Deer Antlers', 'Majestic antlers', 'meat', 3, 'hunting', 30, 5000, 100, 45, 25),
  ('drake_scales', 'Drake Scales', 'Armored scales from drakes', 'pelt', 4, 'hunting', 50, 7000, 250, 120, 45),
  ('chimera_fur', 'Chimera Fur', 'Magical beast pelt', 'pelt', 5, 'hunting', 60, 8500, 400, 200, 55),
  ('dragon_hide', 'Dragon Hide', 'Ultimate armor material', 'pelt', 6, 'hunting', 75, 11000, 800, 450, 70),
  ('phoenix_feather', 'Phoenix Feather', 'Rare enchantment component', 'pelt', 7, 'hunting', 90, 15000, 1500, 1000, 85)
ON CONFLICT (id) DO NOTHING;

-- ===== ALCHEMY MATERIALS (Herbs) =====
INSERT INTO materials (id, name, description, type, tier, required_skill_type, required_skill_level, gathering_time_ms, experience_reward, sell_price, required_zone_level) VALUES
  ('guam_leaf', 'Guam Leaf', 'Common medicinal herb', 'herb', 1, 'alchemy', 1, 2500, 20, 4, 1),
  ('marrentill', 'Marrentill', 'Bitter herb for potions', 'herb', 1, 'alchemy', 5, 2800, 25, 6, 1),
  ('tarromin', 'Tarromin', 'Pungent green herb', 'herb', 2, 'alchemy', 10, 3200, 35, 10, 8),
  ('harralander', 'Harralander', 'Restorative herb', 'herb', 3, 'alchemy', 20, 4000, 70, 25, 15),
  ('ranarr_weed', 'Ranarr Weed', 'Valuable prayer herb', 'herb', 4, 'alchemy', 30, 5000, 120, 50, 25),
  ('irit_leaf', 'Irit Leaf', 'Strength-enhancing herb', 'herb', 5, 'alchemy', 40, 6000, 180, 80, 35),
  ('avantoe', 'Avantoe', 'Rare fishing enhancement', 'herb', 6, 'alchemy', 50, 7000, 250, 120, 45),
  ('kwuarm', 'Kwuarm', 'Combat enhancement herb', 'herb', 7, 'alchemy', 60, 8500, 350, 180, 55),
  ('snapdragon', 'Snapdragon', 'Premium restorative', 'herb', 8, 'alchemy', 70, 10000, 500, 280, 65),
  ('torstol', 'Torstol', 'Ultimate potion ingredient', 'herb', 9, 'alchemy', 85, 13000, 1000, 600, 80)
ON CONFLICT (id) DO NOTHING;

-- ===== MAGIC MATERIALS (Essences & Runes) =====
INSERT INTO materials (id, name, description, type, tier, required_skill_type, required_skill_level, gathering_time_ms, experience_reward, sell_price, required_zone_level) VALUES
  ('air_essence', 'Air Essence', 'Elemental air energy', 'essence', 1, 'magic', 1, 2000, 15, 3, 1),
  ('water_essence', 'Water Essence', 'Elemental water energy', 'essence', 1, 'magic', 5, 2000, 15, 3, 1),
  ('earth_essence', 'Earth Essence', 'Elemental earth energy', 'essence', 2, 'magic', 15, 2500, 30, 8, 11),
  ('fire_essence', 'Fire Essence', 'Elemental fire energy', 'essence', 2, 'magic', 20, 2500, 30, 8, 15),
  ('nature_rune', 'Nature Rune', 'Rune of natural magic', 'rune', 3, 'magic', 40, 4000, 100, 40, 35),
  ('chaos_rune', 'Chaos Rune', 'Rune of chaotic magic', 'rune', 4, 'magic', 50, 5000, 150, 70, 45),
  ('death_rune', 'Death Rune', 'Rune of dark magic', 'rune', 5, 'magic', 65, 6500, 250, 120, 60),
  ('blood_rune', 'Blood Rune', 'Rune of blood magic', 'rune', 6, 'magic', 77, 8000, 400, 200, 72),
  ('soul_rune', 'Soul Rune', 'Ultimate enchantment rune', 'rune', 7, 'magic', 90, 12000, 800, 500, 85)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- SEED DATA: GATHERING NODES
-- =====================================================

-- Starter Forest (Character Level 1-10)
INSERT INTO gathering_nodes (node_type, material_id, world_zone, required_zone_level, respawn_time_ms) VALUES
  ('tree', 'oak_log', 'starter_forest', 1, 60000),
  ('ore_vein', 'copper_ore', 'starter_forest', 1, 90000),
  ('ore_vein', 'tin_ore', 'starter_forest', 1, 90000),
  ('fishing_spot', 'raw_shrimp', 'starter_river', 1, 30000),
  ('fishing_spot', 'raw_sardine', 'starter_river', 1, 45000),
  ('hunting_ground', 'rabbit_meat', 'starter_forest', 1, 120000),
  ('herb_patch', 'guam_leaf', 'starter_forest', 1, 60000),
  ('herb_patch', 'marrentill', 'starter_forest', 1, 75000),
  ('ley_line', 'air_essence', 'starter_forest', 1, 40000),
  ('ley_line', 'water_essence', 'starter_river', 1, 40000)
ON CONFLICT DO NOTHING;

-- Intermediate Zones (Character Level 11-30)
INSERT INTO gathering_nodes (node_type, material_id, world_zone, required_zone_level, respawn_time_ms) VALUES
  ('tree', 'willow_log', 'willow_grove', 11, 75000),
  ('ore_vein', 'iron_ore', 'iron_hills', 11, 120000),
  ('ore_vein', 'coal', 'iron_hills', 15, 100000),
  ('fishing_spot', 'raw_trout', 'mountain_stream', 15, 60000),
  ('fishing_spot', 'raw_salmon', 'mountain_stream', 25, 80000),
  ('hunting_ground', 'wolf_pelt', 'dark_woods', 8, 180000),
  ('hunting_ground', 'deer_antlers', 'meadowlands', 25, 200000),
  ('herb_patch', 'tarromin', 'willow_grove', 8, 90000),
  ('herb_patch', 'harralander', 'meadowlands', 15, 120000),
  ('ley_line', 'earth_essence', 'iron_hills', 11, 60000),
  ('ley_line', 'fire_essence', 'volcanic_ridge', 15, 60000)
ON CONFLICT DO NOTHING;

-- Advanced Zones (Character Level 31-50)
INSERT INTO gathering_nodes (node_type, material_id, world_zone, required_zone_level, respawn_time_ms) VALUES
  ('tree', 'maple_log', 'maple_forest', 25, 100000),
  ('tree', 'yew_log', 'ancient_grove', 40, 150000),
  ('ore_vein', 'mithril_ore', 'mithril_caverns', 45, 180000),
  ('fishing_spot', 'raw_lobster', 'coastal_waters', 35, 120000),
  ('fishing_spot', 'raw_swordfish', 'deep_ocean', 45, 150000),
  ('hunting_ground', 'bear_hide', 'mountain_peaks', 20, 240000),
  ('hunting_ground', 'drake_scales', 'drake_valley', 45, 300000),
  ('herb_patch', 'ranarr_weed', 'herb_garden', 25, 150000),
  ('herb_patch', 'irit_leaf', 'jungle_ruins', 35, 180000),
  ('ley_line', 'nature_rune', 'ancient_grove', 35, 100000)
ON CONFLICT DO NOTHING;

-- Expert Zones (Character Level 51-70)
INSERT INTO gathering_nodes (node_type, material_id, world_zone, required_zone_level, respawn_time_ms) VALUES
  ('ore_vein', 'adamantite_ore', 'adamant_mines', 65, 240000),
  ('fishing_spot', 'raw_shark', 'shark_bay', 55, 200000),
  ('hunting_ground', 'chimera_fur', 'chimera_lair', 55, 360000),
  ('hunting_ground', 'dragon_hide', 'dragon_peaks', 70, 480000),
  ('herb_patch', 'avantoe', 'highland_plateau', 45, 210000),
  ('herb_patch', 'kwuarm', 'shadow_vale', 55, 240000),
  ('ley_line', 'chaos_rune', 'chaos_altar', 45, 150000),
  ('ley_line', 'death_rune', 'death_altar', 60, 200000)
ON CONFLICT DO NOTHING;

-- Master Zones (Character Level 71+)
INSERT INTO gathering_nodes (node_type, material_id, world_zone, required_zone_level, respawn_time_ms) VALUES
  ('tree', 'magic_log', 'enchanted_forest', 70, 240000),
  ('ore_vein', 'runite_ore', 'runite_caverns', 80, 360000),
  ('fishing_spot', 'raw_manta_ray', 'abyssal_trench', 75, 300000),
  ('hunting_ground', 'phoenix_feather', 'phoenix_sanctuary', 85, 600000),
  ('herb_patch', 'snapdragon', 'crystal_gardens', 65, 300000),
  ('herb_patch', 'torstol', 'toxic_swamp', 80, 420000),
  ('ley_line', 'blood_rune', 'blood_altar', 72, 300000),
  ('ley_line', 'soul_rune', 'soul_altar', 85, 480000)
ON CONFLICT DO NOTHING;

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================
COMMENT ON TABLE materials IS 'All gatherable resources in the game with skill requirements and rewards';
COMMENT ON TABLE gathering_nodes IS 'Resource spawn locations across different world zones';
COMMENT ON TABLE crafting_recipes IS 'Recipes for crafting items from materials';
COMMENT ON TABLE active_gathering IS 'Tracks ongoing gathering sessions for characters';

COMMENT ON COLUMN materials.gathering_time_ms IS 'Base time in milliseconds to gather one unit (modified by skill level)';
COMMENT ON COLUMN materials.required_zone_level IS 'Character level required to access the zone where this material spawns';
COMMENT ON COLUMN crafting_recipes.ingredients IS 'JSONB object mapping material_id to required quantity';
