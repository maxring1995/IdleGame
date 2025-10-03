-- Phase 6: Crafting System - Recipes and Active Crafting
-- Add crafting recipes spanning multiple skills and tiers
-- Add active crafting session tracking

-- =====================================================
-- PART 1: ACTIVE CRAFTING TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS active_crafting (
  character_id UUID PRIMARY KEY REFERENCES characters(id) ON DELETE CASCADE,
  recipe_id TEXT NOT NULL REFERENCES crafting_recipes(id),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  estimated_completion TIMESTAMPTZ NOT NULL,
  quantity_goal INTEGER NOT NULL DEFAULT 1 CHECK (quantity_goal > 0),
  quantity_crafted INTEGER NOT NULL DEFAULT 0 CHECK (quantity_crafted >= 0),
  is_auto BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE active_crafting IS 'Tracks ongoing crafting sessions (async crafting with progress)';

-- Enable RLS
ALTER TABLE active_crafting ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own crafting sessions"
  ON active_crafting FOR SELECT
  USING (character_id IN (
    SELECT id FROM characters WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can insert their own crafting sessions"
  ON active_crafting FOR INSERT
  WITH CHECK (character_id IN (
    SELECT id FROM characters WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can update their own crafting sessions"
  ON active_crafting FOR UPDATE
  USING (character_id IN (
    SELECT id FROM characters WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can delete their own crafting sessions"
  ON active_crafting FOR DELETE
  USING (character_id IN (
    SELECT id FROM characters WHERE user_id = auth.uid()
  ));

-- =====================================================
-- PART 2: CRAFTABLE ITEMS (with unique icons)
-- =====================================================

-- Blacksmithing Items (Metal Bars - intermediate materials)
INSERT INTO items (id, name, description, type, rarity, sell_price, stackable, max_stack) VALUES
  ('copper_bar', 'Copper Bar', 'A refined copper ingot, ready for crafting.', 'material', 'common', 5, true, 1000),
  ('bronze_bar', 'Bronze Bar', 'An alloy of copper and tin, stronger than either alone.', 'material', 'uncommon', 15, true, 1000),
  ('iron_bar', 'Iron Bar', 'A solid iron ingot, essential for quality equipment.', 'material', 'uncommon', 25, true, 1000),
  ('steel_bar', 'Steel Bar', 'Carbon-hardened iron, the foundation of superior arms.', 'material', 'rare', 50, true, 1000),
  ('mithril_bar', 'Mithril Bar', 'A lightweight yet incredibly strong mystical metal.', 'material', 'epic', 150, true, 1000),
  ('adamantite_bar', 'Adamantite Bar', 'Nearly indestructible green-tinged metal from deep mines.', 'material', 'epic', 300, true, 500),
  ('runite_bar', 'Runite Bar', 'The finest smithable metal, infused with magical properties.', 'material', 'legendary', 800, true, 250)
ON CONFLICT (id) DO NOTHING;

-- Blacksmithing Weapons
INSERT INTO items (id, name, description, type, rarity, equipment_slot, attack_bonus, defense_bonus, required_level, sell_price) VALUES
  ('bronze_sword', 'Bronze Sword', '⚔️ A basic bronze blade, suitable for beginners.', 'weapon', 'common', 'weapon', 15, 0, 1, 20),
  ('bronze_axe', 'Bronze Axe', '🪓 A simple bronze axe for combat and woodcutting.', 'weapon', 'common', 'weapon', 18, 0, 3, 25),
  ('iron_sword', 'Iron Sword', '⚔️ A sturdy iron blade with reliable cutting power.', 'weapon', 'uncommon', 'weapon', 28, 0, 10, 80),
  ('iron_battleaxe', 'Iron Battleaxe', '🪓 A heavy iron axe that cleaves through armor.', 'weapon', 'uncommon', 'weapon', 32, 0, 12, 90),
  ('steel_longsword', 'Steel Longsword', '⚔️ An expertly forged steel blade with perfect balance.', 'weapon', 'rare', 'weapon', 45, 0, 20, 200),
  ('steel_warhammer', 'Steel Warhammer', '🔨 A crushing steel hammer that shatters defenses.', 'weapon', 'rare', 'weapon', 50, 0, 22, 220),
  ('mithril_scimitar', 'Mithril Scimitar', '🗡️ A curved mithril blade, swift and deadly.', 'weapon', 'epic', 'weapon', 68, 0, 35, 500),
  ('mithril_greataxe', 'Mithril Greataxe', '🪓 A massive mithril axe for devastating strikes.', 'weapon', 'epic', 'weapon', 72, 0, 38, 550),
  ('adamant_sword', 'Adamantite Sword', '⚔️ A green-tinged blade of legendary sharpness.', 'weapon', 'epic', 'weapon', 85, 0, 50, 1200),
  ('rune_sword', 'Rune Sword', '⚔️ A blade infused with runic power.', 'weapon', 'legendary', 'weapon', 110, 0, 65, 3000)
ON CONFLICT (id) DO NOTHING;

-- Blacksmithing Armor
INSERT INTO items (id, name, description, type, rarity, equipment_slot, attack_bonus, defense_bonus, required_level, sell_price) VALUES
  ('bronze_helm', 'Bronze Helmet', '🪖 Basic bronze head protection.', 'armor', 'common', 'helmet', 0, 8, 1, 15),
  ('bronze_platebody', 'Bronze Platebody', '🛡️ A solid bronze chestplate.', 'armor', 'common', 'chest', 0, 12, 1, 30),
  ('bronze_platelegs', 'Bronze Platelegs', '🦵 Bronze leg armor for basic protection.', 'armor', 'common', 'legs', 0, 10, 1, 25),
  ('iron_helm', 'Iron Helmet', '🪖 Sturdy iron helmet with good coverage.', 'armor', 'uncommon', 'helmet', 0, 18, 10, 60),
  ('iron_platebody', 'Iron Platebody', '🛡️ Heavy iron armor plating.', 'armor', 'uncommon', 'chest', 0, 25, 10, 100),
  ('iron_platelegs', 'Iron Platelegs', '🦵 Iron leg guards that deflect blows.', 'armor', 'uncommon', 'legs', 0, 20, 10, 80),
  ('steel_helm', 'Steel Helmet', '🪖 Expertly crafted steel headgear.', 'armor', 'rare', 'helmet', 0, 32, 20, 180),
  ('steel_platebody', 'Steel Platebody', '🛡️ Master-forged steel armor of superior quality.', 'armor', 'rare', 'chest', 0, 45, 20, 300),
  ('steel_platelegs', 'Steel Platelegs', '🦵 Steel leg armor with reinforced joints.', 'armor', 'rare', 'legs', 0, 35, 20, 220),
  ('mithril_helm', 'Mithril Helmet', '🪖 Lightweight mithril helm with mystic etchings.', 'armor', 'epic', 'helmet', 0, 50, 35, 450),
  ('mithril_platebody', 'Mithril Platebody', '🛡️ Gleaming mithril armor that moves like silk.', 'armor', 'epic', 'chest', 0, 68, 35, 700),
  ('adamant_platebody', 'Adamantite Platebody', '🛡️ Near-impenetrable adamantite plate armor.', 'armor', 'epic', 'chest', 0, 88, 50, 2000),
  ('rune_platebody', 'Rune Platebody', '🛡️ Magically-enhanced plate armor of runic metal.', 'armor', 'legendary', 'chest', 0, 115, 65, 5000)
ON CONFLICT (id) DO NOTHING;

-- Fletching Items
INSERT INTO items (id, name, description, type, rarity, equipment_slot, attack_bonus, defense_bonus, required_level, sell_price) VALUES
  ('shortbow', 'Shortbow', '🏹 A basic wooden bow for hunting.', 'weapon', 'common', 'weapon', 12, 0, 1, 15),
  ('oak_longbow', 'Oak Longbow', '🏹 A sturdy oak bow with good range.', 'weapon', 'uncommon', 'weapon', 22, 0, 10, 60),
  ('willow_comp_bow', 'Willow Composite Bow', '🏹 A flexible willow bow with excellent draw.', 'weapon', 'rare', 'weapon', 38, 0, 20, 180),
  ('maple_longbow', 'Maple Longbow', '🏹 A powerful maple bow for skilled archers.', 'weapon', 'epic', 'weapon', 58, 0, 35, 450),
  ('yew_longbow', 'Yew Longbow', '🏹 A masterwork yew bow of legendary accuracy.', 'weapon', 'epic', 'weapon', 75, 0, 50, 1100),
  ('magic_longbow', 'Magic Longbow', '🏹 A bow carved from enchanted wood, never misses.', 'weapon', 'legendary', 'weapon', 95, 0, 65, 2800)
ON CONFLICT (id) DO NOTHING;

-- Alchemy Potions
INSERT INTO items (id, name, description, type, rarity, stackable, max_stack, health_bonus, mana_bonus, required_level, sell_price) VALUES
  ('lesser_health_potion', 'Lesser Health Potion', '🧪 Restores 50 health.', 'consumable', 'common', true, 100, 50, 0, 1, 10),
  ('health_potion', 'Health Potion', '🧪 Restores 100 health.', 'consumable', 'uncommon', true, 100, 100, 0, 10, 30),
  ('greater_health_potion', 'Greater Health Potion', '🧪 Restores 200 health.', 'consumable', 'rare', true, 100, 200, 0, 20, 80),
  ('super_health_potion', 'Super Health Potion', '🧪 Restores 400 health.', 'consumable', 'epic', true, 50, 400, 0, 40, 200),
  ('lesser_mana_potion', 'Lesser Mana Potion', '💧 Restores 30 mana.', 'consumable', 'common', true, 100, 0, 30, 1, 8),
  ('mana_potion', 'Mana Potion', '💧 Restores 60 mana.', 'consumable', 'uncommon', true, 100, 0, 60, 10, 25),
  ('greater_mana_potion', 'Greater Mana Potion', '💧 Restores 120 mana.', 'consumable', 'rare', true, 100, 0, 120, 20, 70),
  ('super_mana_potion', 'Super Mana Potion', '💧 Restores 250 mana.', 'consumable', 'epic', true, 50, 0, 250, 40, 180),
  ('elixir_of_vitality', 'Elixir of Vitality', '✨ Restores 300 HP and 150 MP.', 'consumable', 'epic', true, 30, 300, 150, 50, 400),
  ('supreme_elixir', 'Supreme Elixir', '✨ Fully restores HP and MP.', 'consumable', 'legendary', true, 10, 999, 999, 70, 1000)
ON CONFLICT (id) DO NOTHING;

-- Jewelcrafting Accessories
INSERT INTO items (id, name, description, type, rarity, equipment_slot, attack_bonus, defense_bonus, mana_bonus, required_level, sell_price) VALUES
  ('copper_ring', 'Copper Ring', '💍 A simple copper band.', 'armor', 'common', 'ring', 0, 3, 5, 1, 12),
  ('sapphire_ring', 'Sapphire Ring', '💍 A ring set with a brilliant sapphire.', 'armor', 'uncommon', 'ring', 0, 8, 20, 15, 80),
  ('emerald_ring', 'Emerald Ring', '💍 A ring with a lustrous emerald stone.', 'armor', 'rare', 'ring', 0, 12, 35, 25, 180),
  ('ruby_ring', 'Ruby Ring', '💍 A ring blazing with a fiery ruby.', 'armor', 'epic', 'ring', 5, 15, 50, 40, 400),
  ('diamond_ring', 'Diamond Ring', '💍 A ring crowned with a flawless diamond.', 'armor', 'legendary', 'ring', 10, 25, 80, 60, 1200),
  ('copper_amulet', 'Copper Amulet', '📿 A basic copper pendant.', 'armor', 'common', 'amulet', 0, 4, 8, 1, 15),
  ('sapphire_amulet', 'Sapphire Amulet', '📿 An amulet with a sapphire centerpiece.', 'armor', 'uncommon', 'amulet', 0, 10, 25, 15, 90),
  ('emerald_amulet', 'Emerald Amulet', '📿 An amulet radiating emerald energy.', 'armor', 'rare', 'amulet', 0, 15, 40, 25, 200),
  ('ruby_amulet', 'Ruby Amulet', '📿 An amulet pulsing with ruby power.', 'armor', 'epic', 'amulet', 8, 20, 60, 40, 450),
  ('diamond_amulet', 'Diamond Amulet', '📿 A legendary amulet of pure diamond.', 'armor', 'legendary', 'amulet', 15, 30, 100, 60, 1500)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- PART 3: CRAFTING RECIPES
-- =====================================================

-- BLACKSMITHING - Metal Bars (Smelting)
INSERT INTO crafting_recipes (id, name, description, result_item_id, result_quantity, required_skill_type, required_crafting_level, ingredients, crafting_time_ms, experience_reward, recipe_category) VALUES
  ('smelt_copper_bar', 'Smelt Copper Bar', 'Smelt copper ore into a refined bar.', 'copper_bar', 1, 'crafting', 1, '{"copper_ore": 1}', 3000, 10, 'general'),
  ('smelt_bronze_bar', 'Smelt Bronze Bar', 'Alloy copper and tin into bronze.', 'bronze_bar', 1, 'crafting', 1, '{"copper_ore": 1, "tin_ore": 1}', 4000, 20, 'general'),
  ('smelt_iron_bar', 'Smelt Iron Bar', 'Smelt iron ore with coal for purity.', 'iron_bar', 1, 'crafting', 15, '{"iron_ore": 1, "coal": 1}', 5000, 40, 'general'),
  ('smelt_steel_bar', 'Smelt Steel Bar', 'Create hardened steel from iron and coal.', 'steel_bar', 1, 'crafting', 30, '{"iron_ore": 2, "coal": 2}', 7000, 80, 'general'),
  ('smelt_mithril_bar', 'Smelt Mithril Bar', 'Forge mystical mithril from ore.', 'mithril_bar', 1, 'crafting', 50, '{"mithril_ore": 1, "coal": 4}', 10000, 150, 'general'),
  ('smelt_adamantite_bar', 'Smelt Adamantite Bar', 'Forge near-indestructible adamantite.', 'adamantite_bar', 1, 'crafting', 70, '{"adamantite_ore": 1, "coal": 6}', 12000, 250, 'general'),
  ('smelt_runite_bar', 'Smelt Runite Bar', 'Forge the legendary runite metal.', 'runite_bar', 1, 'crafting', 85, '{"runite_ore": 1, "coal": 8}', 15000, 400, 'general')
ON CONFLICT (id) DO NOTHING;

-- BLACKSMITHING - Weapons
INSERT INTO crafting_recipes (id, name, description, result_item_id, result_quantity, required_skill_type, required_crafting_level, ingredients, crafting_time_ms, experience_reward, recipe_category) VALUES
  ('craft_bronze_sword', 'Craft Bronze Sword', 'Forge a basic bronze sword.', 'bronze_sword', 1, 'crafting', 1, '{"bronze_bar": 1}', 5000, 25, 'weapon'),
  ('craft_bronze_axe', 'Craft Bronze Axe', 'Forge a bronze axe.', 'bronze_axe', 1, 'crafting', 3, '{"bronze_bar": 1, "oak_log": 1}', 5000, 30, 'weapon'),
  ('craft_iron_sword', 'Craft Iron Sword', 'Forge a sturdy iron sword.', 'iron_sword', 1, 'crafting', 15, '{"iron_bar": 2}', 8000, 60, 'weapon'),
  ('craft_iron_battleaxe', 'Craft Iron Battleaxe', 'Forge a heavy iron battleaxe.', 'iron_battleaxe', 1, 'crafting', 18, '{"iron_bar": 3, "willow_log": 1}', 8000, 70, 'weapon'),
  ('craft_steel_longsword', 'Craft Steel Longsword', 'Forge an expertly balanced steel sword.', 'steel_longsword', 1, 'crafting', 30, '{"steel_bar": 2}', 10000, 120, 'weapon'),
  ('craft_steel_warhammer', 'Craft Steel Warhammer', 'Forge a crushing steel warhammer.', 'steel_warhammer', 1, 'crafting', 33, '{"steel_bar": 3, "maple_log": 1}', 10000, 140, 'weapon'),
  ('craft_mithril_scimitar', 'Craft Mithril Scimitar', 'Forge a swift mithril scimitar.', 'mithril_scimitar', 1, 'crafting', 50, '{"mithril_bar": 2}', 15000, 220, 'weapon'),
  ('craft_mithril_greataxe', 'Craft Mithril Greataxe', 'Forge a massive mithril greataxe.', 'mithril_greataxe', 1, 'crafting', 55, '{"mithril_bar": 3, "yew_log": 1}', 15000, 250, 'weapon'),
  ('craft_adamant_sword', 'Craft Adamantite Sword', 'Forge a legendary adamantite blade.', 'adamant_sword', 1, 'crafting', 70, '{"adamantite_bar": 3}', 20000, 400, 'weapon'),
  ('craft_rune_sword', 'Craft Rune Sword', 'Forge a runic blade of ultimate power.', 'rune_sword', 1, 'crafting', 85, '{"runite_bar": 3, "soul_rune": 1}', 25000, 600, 'weapon')
ON CONFLICT (id) DO NOTHING;

-- BLACKSMITHING - Armor
INSERT INTO crafting_recipes (id, name, description, result_item_id, result_quantity, required_skill_type, required_crafting_level, ingredients, crafting_time_ms, experience_reward, recipe_category) VALUES
  ('craft_bronze_helm', 'Craft Bronze Helmet', 'Forge a bronze helmet.', 'bronze_helm', 1, 'crafting', 1, '{"bronze_bar": 1}', 5000, 20, 'armor'),
  ('craft_bronze_platebody', 'Craft Bronze Platebody', 'Forge bronze plate armor.', 'bronze_platebody', 1, 'crafting', 5, '{"bronze_bar": 5}', 8000, 50, 'armor'),
  ('craft_bronze_platelegs', 'Craft Bronze Platelegs', 'Forge bronze leg armor.', 'bronze_platelegs', 1, 'crafting', 3, '{"bronze_bar": 3}', 6000, 35, 'armor'),
  ('craft_iron_helm', 'Craft Iron Helmet', 'Forge an iron helmet.', 'iron_helm', 1, 'crafting', 15, '{"iron_bar": 2}', 8000, 60, 'armor'),
  ('craft_iron_platebody', 'Craft Iron Platebody', 'Forge heavy iron plate armor.', 'iron_platebody', 1, 'crafting', 20, '{"iron_bar": 5}', 12000, 100, 'armor'),
  ('craft_iron_platelegs', 'Craft Iron Platelegs', 'Forge iron leg guards.', 'iron_platelegs', 1, 'crafting', 18, '{"iron_bar": 3}', 10000, 80, 'armor'),
  ('craft_steel_helm', 'Craft Steel Helmet', 'Forge a steel helmet.', 'steel_helm', 1, 'crafting', 30, '{"steel_bar": 2}', 10000, 120, 'armor'),
  ('craft_steel_platebody', 'Craft Steel Platebody', 'Forge master-quality steel armor.', 'steel_platebody', 1, 'crafting', 35, '{"steel_bar": 5}', 15000, 200, 'armor'),
  ('craft_steel_platelegs', 'Craft Steel Platelegs', 'Forge reinforced steel leg armor.', 'steel_platelegs', 1, 'crafting', 33, '{"steel_bar": 3}', 12000, 160, 'armor'),
  ('craft_mithril_helm', 'Craft Mithril Helmet', 'Forge a lightweight mithril helm.', 'mithril_helm', 1, 'crafting', 50, '{"mithril_bar": 2}', 15000, 220, 'armor'),
  ('craft_mithril_platebody', 'Craft Mithril Platebody', 'Forge gleaming mithril armor.', 'mithril_platebody', 1, 'crafting', 55, '{"mithril_bar": 5}', 20000, 350, 'armor'),
  ('craft_adamant_platebody', 'Craft Adamantite Platebody', 'Forge near-impenetrable adamantite armor.', 'adamant_platebody', 1, 'crafting', 70, '{"adamantite_bar": 5}', 25000, 500, 'armor'),
  ('craft_rune_platebody', 'Craft Rune Platebody', 'Forge legendary runic plate armor.', 'rune_platebody', 1, 'crafting', 85, '{"runite_bar": 5, "soul_rune": 2}', 30000, 800, 'armor')
ON CONFLICT (id) DO NOTHING;

-- FLETCHING - Bows
INSERT INTO crafting_recipes (id, name, description, result_item_id, result_quantity, required_skill_type, required_crafting_level, ingredients, crafting_time_ms, experience_reward, recipe_category) VALUES
  ('craft_shortbow', 'Craft Shortbow', 'Craft a basic shortbow from oak.', 'shortbow', 1, 'crafting', 1, '{"oak_log": 1}', 4000, 15, 'weapon'),
  ('craft_oak_longbow', 'Craft Oak Longbow', 'Craft a sturdy oak longbow.', 'oak_longbow', 1, 'crafting', 10, '{"oak_log": 2}', 6000, 40, 'weapon'),
  ('craft_willow_comp_bow', 'Craft Willow Composite Bow', 'Craft a flexible willow bow.', 'willow_comp_bow', 1, 'crafting', 20, '{"willow_log": 2}', 8000, 80, 'weapon'),
  ('craft_maple_longbow', 'Craft Maple Longbow', 'Craft a powerful maple bow.', 'maple_longbow', 1, 'crafting', 35, '{"maple_log": 2}', 12000, 150, 'weapon'),
  ('craft_yew_longbow', 'Craft Yew Longbow', 'Craft a masterwork yew bow.', 'yew_longbow', 1, 'crafting', 50, '{"yew_log": 2}', 18000, 280, 'weapon'),
  ('craft_magic_longbow', 'Craft Magic Longbow', 'Craft a legendary enchanted bow.', 'magic_longbow', 1, 'crafting', 70, '{"magic_log": 2, "nature_rune": 10}', 25000, 500, 'weapon')
ON CONFLICT (id) DO NOTHING;

-- ALCHEMY - Potions
INSERT INTO crafting_recipes (id, name, description, result_item_id, result_quantity, required_skill_type, required_crafting_level, ingredients, crafting_time_ms, experience_reward, recipe_category) VALUES
  ('brew_lesser_health_potion', 'Brew Lesser Health Potion', 'Brew a basic healing potion.', 'lesser_health_potion', 1, 'alchemy', 1, '{"guam": 1, "water_essence": 1}', 3000, 15, 'consumable'),
  ('brew_health_potion', 'Brew Health Potion', 'Brew a standard healing potion.', 'health_potion', 1, 'alchemy', 15, '{"harralander": 1, "water_essence": 2}', 5000, 40, 'consumable'),
  ('brew_greater_health_potion', 'Brew Greater Health Potion', 'Brew a potent healing potion.', 'greater_health_potion', 1, 'alchemy', 30, '{"ranarr": 1, "water_essence": 3, "emerald": 1}', 8000, 100, 'consumable'),
  ('brew_super_health_potion', 'Brew Super Health Potion', 'Brew an extremely potent healing potion.', 'super_health_potion', 1, 'alchemy', 50, '{"kwuarm": 1, "water_essence": 5, "ruby": 1}', 12000, 200, 'consumable'),
  ('brew_lesser_mana_potion', 'Brew Lesser Mana Potion', 'Brew a basic mana potion.', 'lesser_mana_potion', 1, 'alchemy', 1, '{"guam": 1, "air_essence": 1}', 3000, 12, 'consumable'),
  ('brew_mana_potion', 'Brew Mana Potion', 'Brew a standard mana potion.', 'mana_potion', 1, 'alchemy', 15, '{"harralander": 1, "air_essence": 2}', 5000, 35, 'consumable'),
  ('brew_greater_mana_potion', 'Brew Greater Mana Potion', 'Brew a potent mana potion.', 'greater_mana_potion', 1, 'alchemy', 30, '{"ranarr": 1, "air_essence": 3, "sapphire": 1}', 8000, 90, 'consumable'),
  ('brew_super_mana_potion', 'Brew Super Mana Potion', 'Brew an extremely potent mana potion.', 'super_mana_potion', 1, 'alchemy', 50, '{"kwuarm": 1, "air_essence": 5, "sapphire": 2}', 12000, 180, 'consumable'),
  ('brew_elixir_of_vitality', 'Brew Elixir of Vitality', 'Brew a dual-purpose restoration elixir.', 'elixir_of_vitality', 1, 'alchemy', 60, '{"torstol": 1, "water_essence": 5, "air_essence": 5, "ruby": 1}', 15000, 300, 'consumable'),
  ('brew_supreme_elixir', 'Brew Supreme Elixir', 'Brew the ultimate restoration elixir.', 'supreme_elixir', 1, 'alchemy', 80, '{"torstol": 2, "soul_rune": 1, "diamond": 1}', 20000, 500, 'consumable')
ON CONFLICT (id) DO NOTHING;

-- JEWELCRAFTING - Rings
INSERT INTO crafting_recipes (id, name, description, result_item_id, result_quantity, required_skill_type, required_crafting_level, ingredients, crafting_time_ms, experience_reward, recipe_category) VALUES
  ('craft_copper_ring', 'Craft Copper Ring', 'Craft a simple copper ring.', 'copper_ring', 1, 'crafting', 1, '{"copper_bar": 1}', 4000, 15, 'armor'),
  ('craft_sapphire_ring', 'Craft Sapphire Ring', 'Craft a ring set with a sapphire.', 'sapphire_ring', 1, 'crafting', 20, '{"iron_bar": 1, "sapphire": 1}', 8000, 80, 'armor'),
  ('craft_emerald_ring', 'Craft Emerald Ring', 'Craft a ring with an emerald.', 'emerald_ring', 1, 'crafting', 30, '{"steel_bar": 1, "emerald": 1}', 10000, 120, 'armor'),
  ('craft_ruby_ring', 'Craft Ruby Ring', 'Craft a ring blazing with ruby.', 'ruby_ring', 1, 'crafting', 45, '{"mithril_bar": 1, "ruby": 1}', 14000, 200, 'armor'),
  ('craft_diamond_ring', 'Craft Diamond Ring', 'Craft a ring crowned with diamond.', 'diamond_ring', 1, 'crafting', 65, '{"adamantite_bar": 1, "diamond": 1}', 20000, 400, 'armor')
ON CONFLICT (id) DO NOTHING;

-- JEWELCRAFTING - Amulets
INSERT INTO crafting_recipes (id, name, description, result_item_id, result_quantity, required_skill_type, required_crafting_level, ingredients, crafting_time_ms, experience_reward, recipe_category) VALUES
  ('craft_copper_amulet', 'Craft Copper Amulet', 'Craft a basic copper amulet.', 'copper_amulet', 1, 'crafting', 1, '{"copper_bar": 1}', 4000, 18, 'armor'),
  ('craft_sapphire_amulet', 'Craft Sapphire Amulet', 'Craft an amulet with a sapphire centerpiece.', 'sapphire_amulet', 1, 'crafting', 25, '{"iron_bar": 1, "sapphire": 1, "air_essence": 5}', 10000, 100, 'armor'),
  ('craft_emerald_amulet', 'Craft Emerald Amulet', 'Craft an amulet radiating emerald energy.', 'emerald_amulet', 1, 'crafting', 35, '{"steel_bar": 1, "emerald": 1, "earth_essence": 5}', 12000, 150, 'armor'),
  ('craft_ruby_amulet', 'Craft Ruby Amulet', 'Craft an amulet pulsing with ruby power.', 'ruby_amulet', 1, 'crafting', 50, '{"mithril_bar": 1, "ruby": 1, "fire_essence": 5}', 16000, 250, 'armor'),
  ('craft_diamond_amulet', 'Craft Diamond Amulet', 'Craft a legendary diamond amulet.', 'diamond_amulet', 1, 'crafting', 70, '{"adamantite_bar": 1, "diamond": 1, "soul_rune": 1}', 22000, 500, 'armor')
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- PART 4: INDEXES FOR PERFORMANCE
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_active_crafting_character ON active_crafting(character_id);
CREATE INDEX IF NOT EXISTS idx_crafting_recipes_skill ON crafting_recipes(required_skill_type, required_crafting_level);
CREATE INDEX IF NOT EXISTS idx_crafting_recipes_category ON crafting_recipes(recipe_category);
