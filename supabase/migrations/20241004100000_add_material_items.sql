-- =====================================================
-- Add gatherable materials as items in the items table
-- This allows materials to be stored in character inventory
-- =====================================================

-- Insert all materials as items with type 'material'
-- These are references to materials in the materials table

-- WOODCUTTING MATERIALS
INSERT INTO items (id, name, description, type, rarity, stackable, max_stack, sell_price) VALUES
  ('oak_log', 'Oak Log', 'Sturdy wood from oak trees', 'material', 'common', true, 1000, 5),
  ('willow_log', 'Willow Log', 'Flexible wood perfect for bows', 'material', 'common', true, 1000, 15),
  ('maple_log', 'Maple Log', 'High-quality hardwood', 'material', 'uncommon', true, 1000, 35),
  ('yew_log', 'Yew Log', 'Prized wood for longbows', 'material', 'rare', true, 1000, 75),
  ('magic_log', 'Magic Log', 'Infused with arcane energy', 'material', 'epic', true, 1000, 200)
ON CONFLICT (id) DO NOTHING;

-- MINING MATERIALS
INSERT INTO items (id, name, description, type, rarity, stackable, max_stack, sell_price) VALUES
  ('copper_ore', 'Copper Ore', 'Basic metallic ore', 'material', 'common', true, 1000, 8),
  ('tin_ore', 'Tin Ore', 'Used in bronze alloys', 'material', 'common', true, 1000, 8),
  ('iron_ore', 'Iron Ore', 'Common and versatile ore', 'material', 'common', true, 1000, 20),
  ('coal', 'Coal', 'Essential fuel for smelting', 'material', 'common', true, 1000, 15),
  ('mithril_ore', 'Mithril Ore', 'Lightweight and strong', 'material', 'uncommon', true, 1000, 80),
  ('adamantite_ore', 'Adamantite Ore', 'Extremely durable ore', 'material', 'rare', true, 1000, 150),
  ('runite_ore', 'Runite Ore', 'Legendary metal infused with magic', 'material', 'epic', true, 1000, 400)
ON CONFLICT (id) DO NOTHING;

-- GEMS
INSERT INTO items (id, name, description, type, rarity, stackable, max_stack, sell_price) VALUES
  ('sapphire', 'Sapphire', 'Blue precious gem', 'material', 'uncommon', true, 100, 50),
  ('emerald', 'Emerald', 'Green precious gem', 'material', 'rare', true, 100, 100),
  ('ruby', 'Ruby', 'Red precious gem', 'material', 'rare', true, 100, 200),
  ('diamond', 'Diamond', 'Crystal clear gem of immense value', 'material', 'epic', true, 100, 500),
  ('dragonstone', 'Dragonstone', 'Legendary gem from dragon lairs', 'material', 'legendary', true, 50, 1500)
ON CONFLICT (id) DO NOTHING;

-- FISHING MATERIALS
INSERT INTO items (id, name, description, type, rarity, stackable, max_stack, sell_price) VALUES
  ('raw_shrimp', 'Raw Shrimp', 'Small crustacean', 'material', 'common', true, 1000, 3),
  ('raw_sardine', 'Raw Sardine', 'Common small fish', 'material', 'common', true, 1000, 5),
  ('raw_trout', 'Raw Trout', 'Freshwater fish', 'material', 'common', true, 1000, 15),
  ('raw_salmon', 'Raw Salmon', 'Prized river fish', 'material', 'uncommon', true, 1000, 30),
  ('raw_lobster', 'Raw Lobster', 'Delicious crustacean', 'material', 'uncommon', true, 1000, 60),
  ('raw_swordfish', 'Raw Swordfish', 'Large ocean predator', 'material', 'rare', true, 1000, 100),
  ('raw_shark', 'Raw Shark', 'Dangerous apex predator', 'material', 'rare', true, 1000, 180),
  ('raw_manta_ray', 'Raw Manta Ray', 'Graceful giant of the deep', 'material', 'epic', true, 1000, 350)
ON CONFLICT (id) DO NOTHING;

-- HUNTING MATERIALS
INSERT INTO items (id, name, description, type, rarity, stackable, max_stack, sell_price) VALUES
  ('rabbit_meat', 'Rabbit Meat', 'Lean meat from rabbits', 'material', 'common', true, 1000, 6),
  ('wolf_pelt', 'Wolf Pelt', 'Thick fur from wolves', 'material', 'common', true, 1000, 20),
  ('bear_hide', 'Bear Hide', 'Tough leather from bears', 'material', 'uncommon', true, 1000, 50),
  ('deer_antlers', 'Deer Antlers', 'Majestic antlers', 'material', 'uncommon', true, 1000, 45),
  ('drake_scales', 'Drake Scales', 'Armored scales from drakes', 'material', 'rare', true, 1000, 120),
  ('chimera_fur', 'Chimera Fur', 'Magical beast pelt', 'material', 'rare', true, 1000, 200),
  ('dragon_hide', 'Dragon Hide', 'Ultimate armor material', 'material', 'epic', true, 1000, 450),
  ('phoenix_feather', 'Phoenix Feather', 'Rare enchantment component', 'material', 'legendary', true, 1000, 1000)
ON CONFLICT (id) DO NOTHING;

-- ALCHEMY MATERIALS (Herbs)
INSERT INTO items (id, name, description, type, rarity, stackable, max_stack, sell_price) VALUES
  ('guam_leaf', 'Guam Leaf', 'Common medicinal herb', 'material', 'common', true, 1000, 4),
  ('marrentill', 'Marrentill', 'Bitter herb for potions', 'material', 'common', true, 1000, 6),
  ('tarromin', 'Tarromin', 'Pungent green herb', 'material', 'common', true, 1000, 10),
  ('harralander', 'Harralander', 'Restorative herb', 'material', 'uncommon', true, 1000, 25),
  ('ranarr_weed', 'Ranarr Weed', 'Valuable prayer herb', 'material', 'uncommon', true, 1000, 50),
  ('irit_leaf', 'Irit Leaf', 'Strength-enhancing herb', 'material', 'rare', true, 1000, 80),
  ('avantoe', 'Avantoe', 'Rare fishing enhancement', 'material', 'rare', true, 1000, 120),
  ('kwuarm', 'Kwuarm', 'Combat enhancement herb', 'material', 'rare', true, 1000, 180),
  ('snapdragon', 'Snapdragon', 'Premium restorative', 'material', 'epic', true, 1000, 280),
  ('torstol', 'Torstol', 'Ultimate potion ingredient', 'material', 'epic', true, 1000, 600)
ON CONFLICT (id) DO NOTHING;

-- MAGIC MATERIALS (Essences & Runes)
INSERT INTO items (id, name, description, type, rarity, stackable, max_stack, sell_price) VALUES
  ('air_essence', 'Air Essence', 'Elemental air energy', 'material', 'common', true, 1000, 3),
  ('water_essence', 'Water Essence', 'Elemental water energy', 'material', 'common', true, 1000, 3),
  ('earth_essence', 'Earth Essence', 'Elemental earth energy', 'material', 'common', true, 1000, 8),
  ('fire_essence', 'Fire Essence', 'Elemental fire energy', 'material', 'common', true, 1000, 8),
  ('nature_rune', 'Nature Rune', 'Rune of natural magic', 'material', 'uncommon', true, 1000, 40),
  ('chaos_rune', 'Chaos Rune', 'Rune of chaotic magic', 'material', 'rare', true, 1000, 70),
  ('death_rune', 'Death Rune', 'Rune of dark magic', 'material', 'rare', true, 1000, 120),
  ('blood_rune', 'Blood Rune', 'Rune of blood magic', 'material', 'epic', true, 1000, 200),
  ('soul_rune', 'Soul Rune', 'Ultimate enchantment rune', 'material', 'legendary', true, 1000, 500)
ON CONFLICT (id) DO NOTHING;

-- Create index for material-type items
CREATE INDEX IF NOT EXISTS idx_items_material_type ON items(type) WHERE type = 'material';

COMMENT ON COLUMN items.type IS 'Item type: weapon, armor, consumable, material, quest';
