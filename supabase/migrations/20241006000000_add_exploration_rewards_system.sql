-- ============================================================================
-- Migration: Add Exploration Rewards System
-- Description: Adds per-percent reward chances and 200+ unique adventure items
-- ============================================================================

-- ============================================================================
-- Exploration Rewards Configuration Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS exploration_rewards_config (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  zone_id UUID REFERENCES world_zones(id) ON DELETE CASCADE,
  progress_percent INTEGER NOT NULL CHECK (progress_percent >= 1 AND progress_percent <= 100),
  reward_chance NUMERIC(4,3) NOT NULL CHECK (reward_chance >= 0 AND reward_chance <= 1),
  loot_table JSONB NOT NULL DEFAULT '{}'::jsonb,
  gold_min INTEGER DEFAULT 0,
  gold_max INTEGER DEFAULT 0,
  xp_min INTEGER DEFAULT 0,
  xp_max INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE exploration_rewards_config IS 'Reward configuration for each percent of exploration progress';
COMMENT ON COLUMN exploration_rewards_config.progress_percent IS 'Exploration progress percent (1-100) when this reward can trigger';
COMMENT ON COLUMN exploration_rewards_config.reward_chance IS 'Probability (0.0-1.0) that a reward is given at this percent';
COMMENT ON COLUMN exploration_rewards_config.loot_table IS 'Item drop table: {item_id: drop_weight}';

CREATE INDEX idx_exploration_rewards_zone ON exploration_rewards_config(zone_id);
CREATE INDEX idx_exploration_rewards_progress ON exploration_rewards_config(progress_percent);

-- ============================================================================
-- Exploration Rewards Log Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS exploration_rewards_log (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  zone_id UUID NOT NULL REFERENCES world_zones(id),
  progress_percent INTEGER NOT NULL,
  items_received JSONB DEFAULT '[]'::jsonb,
  gold_received INTEGER DEFAULT 0,
  xp_received INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE exploration_rewards_log IS 'Historical log of all rewards received during exploration';

CREATE INDEX idx_exploration_rewards_log_character ON exploration_rewards_log(character_id);
CREATE INDEX idx_exploration_rewards_log_zone ON exploration_rewards_log(zone_id);

-- ============================================================================
-- 200+ Unique Adventure-Specific Items
-- ============================================================================

-- ====================================
-- WEAPONS (50 items)
-- ====================================

-- Zone 1 (Havenbrook) - Levels 1-5
INSERT INTO items (id, name, description, type, rarity, attack_bonus, equipment_slot, required_level, sell_price) VALUES
('adv_wooden_club', 'Traveler''s Club', 'A sturdy wooden club perfect for aspiring adventurers.', 'weapon', 'common', 8, 'weapon', 1, 15),
('adv_rusty_dagger', 'Rusty Dagger', 'An old dagger found during exploration, still sharp enough to use.', 'weapon', 'common', 10, 'weapon', 1, 20),
('adv_apprentice_staff', 'Apprentice''s Staff', 'A simple wooden staff imbued with minor magic.', 'weapon', 'uncommon', 12, 'weapon', 2, 35),
('adv_bronze_shortsword', 'Bronze Shortsword', 'A well-crafted shortsword found in ancient ruins.', 'weapon', 'uncommon', 15, 'weapon', 3, 50),
('adv_hunter_bow', 'Hunter''s Bow', 'A reliable bow used by woodland hunters.', 'weapon', 'uncommon', 18, 'weapon', 4, 65),

-- Zone 2 (Whispering Woods) - Levels 5-10
('adv_elven_blade', 'Elven Longblade', 'A graceful blade forged by ancient elves.', 'weapon', 'rare', 25, 'weapon', 5, 100),
('adv_forest_spear', 'Forest Guardian Spear', 'A spear blessed by the spirits of the woods.', 'weapon', 'rare', 28, 'weapon', 6, 125),
('adv_mystic_wand', 'Mystic Wand', 'A wand crackling with arcane energy.', 'weapon', 'rare', 30, 'weapon', 7, 150),
('adv_iron_mace', 'Iron Mace', 'A heavy mace that crushes enemies.', 'weapon', 'uncommon', 22, 'weapon', 6, 85),
('adv_enchanted_dagger', 'Enchanted Dagger', 'A dagger with a faint magical glow.', 'weapon', 'rare', 26, 'weapon', 8, 140),

-- Zone 3 (Ironpeak Foothills) - Levels 10-15
('adv_mountain_axe', 'Mountain Cleaver', 'A massive axe used by mountain warriors.', 'weapon', 'rare', 35, 'weapon', 10, 200),
('adv_steel_longsword', 'Steel Longsword', 'A finely balanced longsword of superior quality.', 'weapon', 'rare', 38, 'weapon', 11, 225),
('adv_battle_hammer', 'Battle Hammer', 'A war hammer that strikes with devastating force.', 'weapon', 'rare', 40, 'weapon', 12, 250),
('adv_ranger_longbow', 'Ranger''s Longbow', 'A longbow with exceptional range and accuracy.', 'weapon', 'epic', 42, 'weapon', 13, 300),
('adv_flame_sword', 'Flamebrand', 'A sword wreathed in magical flames.', 'weapon', 'epic', 45, 'weapon', 14, 350),

-- Zone 4 (Crystalmere Lake) - Levels 15-20
('adv_crystal_staff', 'Crystal Staff', 'A staff topped with a glowing crystal.', 'weapon', 'epic', 50, 'weapon', 15, 400),
('adv_tidal_trident', 'Tidal Trident', 'A trident that commands the power of water.', 'weapon', 'epic', 52, 'weapon', 16, 450),
('adv_silver_rapier', 'Silver Rapier', 'An elegant rapier perfect for precise strikes.', 'weapon', 'epic', 54, 'weapon', 17, 500),
('adv_mithril_sword', 'Mithril Blade', 'A lightweight yet incredibly strong sword.', 'weapon', 'epic', 56, 'weapon', 18, 550),
('adv_lightning_bow', 'Lightning Bow', 'A bow that shoots arrows charged with lightning.', 'weapon', 'legendary', 60, 'weapon', 19, 650),

-- Zone 5 (Shadowfen Marsh) - Levels 20-25
('adv_venomous_blade', 'Venomous Fang', 'A blade coated in deadly poison.', 'weapon', 'epic', 58, 'weapon', 20, 600),
('adv_shadow_dagger', 'Shadow Whisper', 'A dagger that strikes from the shadows.', 'weapon', 'legendary', 62, 'weapon', 21, 700),
('adv_cursed_staff', 'Cursed Staff of Darkness', 'A staff radiating dark energy.', 'weapon', 'legendary', 65, 'weapon', 22, 750),
('adv_plague_mace', 'Plague Mace', 'A mace that spreads disease on impact.', 'weapon', 'epic', 60, 'weapon', 21, 650),
('adv_swamp_spear', 'Swamp Stalker', 'A spear designed for fighting in marshlands.', 'weapon', 'rare', 55, 'weapon', 20, 550),

-- Zone 6 (Thornveil Thicket) - Levels 25-30
('adv_thorn_blade', 'Thornblade', 'A sword with thorns growing along its edge.', 'weapon', 'epic', 68, 'weapon', 25, 800),
('adv_nature_staff', 'Staff of Nature''s Wrath', 'A staff channeling the fury of nature.', 'weapon', 'legendary', 72, 'weapon', 26, 900),
('adv_vine_whip', 'Vine Lash', 'A whip made of enchanted vines.', 'weapon', 'epic', 65, 'weapon', 25, 750),
('adv_wooden_greatbow', 'Ancient Greatbow', 'A massive bow carved from ancient wood.', 'weapon', 'legendary', 75, 'weapon', 27, 950),
('adv_druid_scimitar', 'Druid''s Scimitar', 'A curved blade blessed by druids.', 'weapon', 'epic', 70, 'weapon', 26, 850),

-- Zone 7 (Emberforge Depths) - Levels 30+
('adv_lava_axe', 'Molten Destroyer', 'An axe forged in volcanic fire.', 'weapon', 'legendary', 80, 'weapon', 30, 1200),
('adv_inferno_sword', 'Inferno Blade', 'A sword burning with eternal flames.', 'weapon', 'legendary', 85, 'weapon', 31, 1300),
('adv_phoenix_staff', 'Phoenix Staff', 'A staff containing the essence of a phoenix.', 'weapon', 'legendary', 90, 'weapon', 32, 1500),
('adv_volcanic_hammer', 'Volcanic Crusher', 'A hammer that erupts with lava on impact.', 'weapon', 'legendary', 88, 'weapon', 31, 1400),
('adv_dragon_slayer', 'Dragonslayer Greatsword', 'A legendary sword forged to slay dragons.', 'weapon', 'legendary', 95, 'weapon', 33, 1800),

-- Additional Rare/Epic Weapons (Mix of all zones)
('adv_blessed_mace', 'Blessed Mace', 'A mace blessed by holy light.', 'weapon', 'rare', 32, 'weapon', 10, 180),
('adv_rune_sword', 'Runic Blade', 'A sword inscribed with ancient runes.', 'weapon', 'epic', 48, 'weapon', 15, 380),
('adv_spectral_bow', 'Spectral Bow', 'A bow that fires ghostly arrows.', 'weapon', 'epic', 58, 'weapon', 20, 580),
('adv_chaos_staff', 'Chaos Staff', 'A staff of unpredictable magic.', 'weapon', 'legendary', 78, 'weapon', 28, 1100),
('adv_void_dagger', 'Void Dagger', 'A dagger that cuts through reality itself.', 'weapon', 'legendary', 70, 'weapon', 25, 950),
('adv_thunder_hammer', 'Thunder Hammer', 'A hammer that strikes with the force of thunder.', 'weapon', 'epic', 64, 'weapon', 22, 720),
('adv_frost_spear', 'Frost Spear', 'A spear that freezes on contact.', 'weapon', 'epic', 56, 'weapon', 18, 530),
('adv_soul_reaver', 'Soul Reaver', 'A cursed blade that steals souls.', 'weapon', 'legendary', 82, 'weapon', 29, 1250),
('adv_arcane_scepter', 'Arcane Scepter', 'A scepter pulsing with raw arcane power.', 'weapon', 'epic', 66, 'weapon', 23, 780),
('adv_holy_sword', 'Holy Avenger', 'A sword blessed by divine power.', 'weapon', 'legendary', 92, 'weapon', 32, 1600),
('adv_demon_axe', 'Demon''s Bane', 'An axe forged to destroy demons.', 'weapon', 'epic', 74, 'weapon', 27, 980),
('adv_star_bow', 'Starfall Bow', 'A bow that shoots arrows of starlight.', 'weapon', 'legendary', 88, 'weapon', 30, 1350),
('adv_death_scythe', 'Death''s Scythe', 'A scythe wielded by death itself.', 'weapon', 'legendary', 100, 'weapon', 35, 2000);

-- ====================================
-- ARMOR - HELMETS (20 items)
-- ====================================
INSERT INTO items (id, name, description, type, rarity, defense_bonus, equipment_slot, required_level, sell_price) VALUES
('adv_leather_cap', 'Explorer''s Cap', 'A simple leather cap for adventurers.', 'armor', 'common', 3, 'helmet', 1, 10),
('adv_bronze_helm', 'Bronze Helm', 'A basic helm offering decent protection.', 'armor', 'uncommon', 5, 'helmet', 3, 25),
('adv_iron_helmet', 'Iron Helmet', 'A sturdy iron helmet.', 'armor', 'uncommon', 8, 'helmet', 6, 45),
('adv_steel_helm', 'Steel Greathelm', 'A heavy helm of excellent craftsmanship.', 'armor', 'rare', 12, 'helmet', 10, 100),
('adv_elven_circlet', 'Elven Circlet', 'A delicate circlet worn by elven rangers.', 'armor', 'rare', 10, 'helmet', 8, 85),
('adv_mithril_helm', 'Mithril Crown', 'A lightweight yet strong helm.', 'armor', 'epic', 16, 'helmet', 15, 200),
('adv_crystal_tiara', 'Crystal Tiara', 'A tiara adorned with magical crystals.', 'armor', 'epic', 14, 'helmet', 13, 175),
('adv_shadow_hood', 'Shadow Hood', 'A hood that conceals the wearer.', 'armor', 'epic', 15, 'helmet', 18, 220),
('adv_flame_crown', 'Crown of Flames', 'A crown wreathed in eternal fire.', 'armor', 'legendary', 20, 'helmet', 22, 350),
('adv_dragon_helm', 'Dragonbone Helm', 'A helm crafted from dragon bones.', 'armor', 'legendary', 25, 'helmet', 28, 500),
('adv_royal_crown', 'Royal Crown', 'A crown fit for royalty.', 'armor', 'epic', 18, 'helmet', 20, 280),
('adv_battle_helm', 'Battle-Worn Helm', 'A helm showing signs of many battles.', 'armor', 'rare', 11, 'helmet', 9, 90),
('adv_sacred_helm', 'Sacred Helm', 'A helm blessed by divine power.', 'armor', 'epic', 17, 'helmet', 19, 260),
('adv_demon_mask', 'Demon Mask', 'A terrifying mask that instills fear.', 'armor', 'legendary', 22, 'helmet', 25, 400),
('adv_phoenix_helm', 'Phoenix Helm', 'A helm adorned with phoenix feathers.', 'armor', 'legendary', 24, 'helmet', 27, 450),
('adv_void_helm', 'Void Helm', 'A helm from beyond reality.', 'armor', 'legendary', 28, 'helmet', 30, 600),
('adv_nature_wreath', 'Nature''s Wreath', 'A living crown of vines and flowers.', 'armor', 'epic', 16, 'helmet', 16, 230),
('adv_ice_crown', 'Frozen Crown', 'A crown of eternal ice.', 'armor', 'legendary', 23, 'helmet', 26, 420),
('adv_thunder_helm', 'Thunder Helm', 'A helm crackling with lightning.', 'armor', 'epic', 19, 'helmet', 21, 300),
('adv_ancient_mask', 'Ancient Warlord Mask', 'A mask worn by ancient warlords.', 'armor', 'legendary', 30, 'helmet', 32, 700);

-- ====================================
-- ARMOR - CHEST (25 items)
-- ====================================
INSERT INTO items (id, name, description, type, rarity, defense_bonus, equipment_slot, required_level, sell_price) VALUES
('adv_cloth_tunic', 'Traveler''s Tunic', 'A simple cloth tunic for travel.', 'armor', 'common', 5, 'chest', 1, 15),
('adv_leather_vest', 'Leather Vest', 'A sturdy leather vest.', 'armor', 'uncommon', 8, 'chest', 3, 35),
('adv_bronze_chestplate', 'Bronze Chestplate', 'A basic metal chestplate.', 'armor', 'uncommon', 12, 'chest', 5, 60),
('adv_iron_armor', 'Iron Plate Armor', 'Heavy iron armor offering great protection.', 'armor', 'rare', 18, 'chest', 8, 120),
('adv_elven_chainmail', 'Elven Chainmail', 'Lightweight yet strong chainmail.', 'armor', 'rare', 16, 'chest', 7, 100),
('adv_steel_breastplate', 'Steel Breastplate', 'A finely crafted steel breastplate.', 'armor', 'rare', 22, 'chest', 11, 180),
('adv_mithril_armor', 'Mithril Plate', 'Exceptionally light and strong armor.', 'armor', 'epic', 28, 'chest', 15, 300),
('adv_dragonscale_armor', 'Dragonscale Armor', 'Armor made from dragon scales.', 'armor', 'epic', 32, 'chest', 18, 400),
('adv_crystal_armor', 'Crystal Plate', 'Armor infused with magical crystals.', 'armor', 'epic', 30, 'chest', 16, 350),
('adv_shadow_robe', 'Shadow Robe', 'A robe that blends with darkness.', 'armor', 'epic', 25, 'chest', 14, 280),
('adv_flame_armor', 'Flame Plate', 'Armor wreathed in protective flames.', 'armor', 'legendary', 38, 'chest', 22, 600),
('adv_frost_armor', 'Frost Plate', 'Armor radiating freezing cold.', 'armor', 'legendary', 36, 'chest', 21, 550),
('adv_nature_armor', 'Living Armor', 'Armor made from living wood and vines.', 'armor', 'epic', 29, 'chest', 17, 380),
('adv_holy_armor', 'Holy Plate', 'Armor blessed by divine light.', 'armor', 'legendary', 40, 'chest', 24, 700),
('adv_demon_armor', 'Demon Plate', 'Dark armor infused with demonic power.', 'armor', 'legendary', 42, 'chest', 26, 750),
('adv_phoenix_armor', 'Phoenix Plate', 'Armor that resurrects its wearer.', 'armor', 'legendary', 45, 'chest', 28, 850),
('adv_void_armor', 'Void Plate', 'Armor from beyond the void.', 'armor', 'legendary', 48, 'chest', 30, 1000),
('adv_ancient_armor', 'Ancient Warlord Plate', 'Armor worn by legendary warriors.', 'armor', 'legendary', 50, 'chest', 32, 1200),
('adv_battle_plate', 'Battle-Scarred Plate', 'Armor showing signs of countless battles.', 'armor', 'rare', 20, 'chest', 10, 160),
('adv_royal_armor', 'Royal Plate', 'Ornate armor fit for royalty.', 'armor', 'epic', 34, 'chest', 19, 450),
('adv_thunder_armor', 'Thunder Plate', 'Armor crackling with electricity.', 'armor', 'legendary', 44, 'chest', 27, 800),
('adv_arcane_robe', 'Arcane Robe', 'A robe pulsing with magical energy.', 'armor', 'epic', 26, 'chest', 15, 320),
('adv_blessed_armor', 'Blessed Armor', 'Armor blessed by ancient priests.', 'armor', 'rare', 24, 'chest', 12, 200),
('adv_cursed_armor', 'Cursed Plate', 'Armor with a dark curse.', 'armor', 'epic', 33, 'chest', 20, 420),
('adv_star_armor', 'Starforged Armor', 'Armor forged from fallen stars.', 'armor', 'legendary', 52, 'chest', 34, 1400);

-- ====================================
-- ARMOR - LEGS (18 items)
-- ====================================
INSERT INTO items (id, name, description, type, rarity, defense_bonus, equipment_slot, required_level, sell_price) VALUES
('adv_cloth_pants', 'Traveler''s Pants', 'Simple cloth pants.', 'armor', 'common', 3, 'legs', 1, 10),
('adv_leather_leggings', 'Leather Leggings', 'Sturdy leather leg protection.', 'armor', 'uncommon', 6, 'legs', 3, 25),
('adv_bronze_greaves', 'Bronze Greaves', 'Basic metal leg armor.', 'armor', 'uncommon', 9, 'legs', 5, 45),
('adv_iron_legplates', 'Iron Legplates', 'Heavy iron leg armor.', 'armor', 'rare', 14, 'legs', 8, 90),
('adv_steel_greaves', 'Steel Greaves', 'Well-crafted steel leg armor.', 'armor', 'rare', 17, 'legs', 11, 140),
('adv_mithril_legs', 'Mithril Legplates', 'Lightweight yet strong leg armor.', 'armor', 'epic', 22, 'legs', 15, 250),
('adv_dragonscale_legs', 'Dragonscale Greaves', 'Leg armor made from dragon scales.', 'armor', 'epic', 25, 'legs', 18, 320),
('adv_crystal_legs', 'Crystal Legplates', 'Leg armor infused with crystals.', 'armor', 'epic', 23, 'legs', 16, 280),
('adv_shadow_leggings', 'Shadow Leggings', 'Leggings that blend with darkness.', 'armor', 'epic', 20, 'legs', 14, 220),
('adv_flame_greaves', 'Flame Greaves', 'Leg armor wreathed in flames.', 'armor', 'legendary', 30, 'legs', 22, 450),
('adv_frost_greaves', 'Frost Greaves', 'Leg armor radiating cold.', 'armor', 'legendary', 28, 'legs', 21, 400),
('adv_holy_greaves', 'Holy Greaves', 'Blessed leg armor.', 'armor', 'legendary', 32, 'legs', 24, 500),
('adv_demon_greaves', 'Demon Greaves', 'Dark demonic leg armor.', 'armor', 'legendary', 34, 'legs', 26, 550),
('adv_void_greaves', 'Void Greaves', 'Leg armor from the void.', 'armor', 'legendary', 38, 'legs', 30, 700),
('adv_battle_greaves', 'Battle Greaves', 'Battle-worn leg armor.', 'armor', 'rare', 15, 'legs', 10, 120),
('adv_royal_greaves', 'Royal Greaves', 'Ornate royal leg armor.', 'armor', 'epic', 26, 'legs', 19, 350),
('adv_thunder_greaves', 'Thunder Greaves', 'Leg armor crackling with lightning.', 'armor', 'legendary', 35, 'legs', 27, 600),
('adv_ancient_greaves', 'Ancient Warlord Greaves', 'Legendary leg armor.', 'armor', 'legendary', 40, 'legs', 32, 800);

-- ====================================
-- ARMOR - BOOTS (18 items)
-- ====================================
INSERT INTO items (id, name, description, type, rarity, defense_bonus, equipment_slot, required_level, sell_price) VALUES
('adv_cloth_shoes', 'Traveler''s Shoes', 'Simple cloth shoes.', 'armor', 'common', 2, 'boots', 1, 8),
('adv_leather_boots', 'Leather Boots', 'Sturdy leather boots.', 'armor', 'uncommon', 4, 'boots', 3, 20),
('adv_bronze_boots', 'Bronze Sabatons', 'Basic metal boots.', 'armor', 'uncommon', 6, 'boots', 5, 35),
('adv_iron_boots', 'Iron Sabatons', 'Heavy iron boots.', 'armor', 'rare', 10, 'boots', 8, 70),
('adv_steel_boots', 'Steel Sabatons', 'Well-crafted steel boots.', 'armor', 'rare', 13, 'boots', 11, 110),
('adv_mithril_boots', 'Mithril Sabatons', 'Lightweight yet strong boots.', 'armor', 'epic', 18, 'boots', 15, 200),
('adv_dragonscale_boots', 'Dragonscale Sabatons', 'Boots made from dragon scales.', 'armor', 'epic', 20, 'boots', 18, 260),
('adv_crystal_boots', 'Crystal Sabatons', 'Boots infused with crystals.', 'armor', 'epic', 19, 'boots', 16, 230),
('adv_shadow_boots', 'Shadow Boots', 'Boots that silence footsteps.', 'armor', 'epic', 16, 'boots', 14, 180),
('adv_flame_boots', 'Flame Sabatons', 'Boots wreathed in flames.', 'armor', 'legendary', 24, 'boots', 22, 360),
('adv_frost_boots', 'Frost Sabatons', 'Boots radiating cold.', 'armor', 'legendary', 22, 'boots', 21, 320),
('adv_holy_boots', 'Holy Sabatons', 'Blessed boots.', 'armor', 'legendary', 26, 'boots', 24, 400),
('adv_demon_boots', 'Demon Sabatons', 'Dark demonic boots.', 'armor', 'legendary', 28, 'boots', 26, 440),
('adv_void_boots', 'Void Sabatons', 'Boots from the void.', 'armor', 'legendary', 30, 'boots', 30, 560),
('adv_battle_boots', 'Battle Boots', 'Battle-worn boots.', 'armor', 'rare', 12, 'boots', 10, 95),
('adv_royal_boots', 'Royal Sabatons', 'Ornate royal boots.', 'armor', 'epic', 21, 'boots', 19, 280),
('adv_thunder_boots', 'Thunder Sabatons', 'Boots crackling with lightning.', 'armor', 'legendary', 27, 'boots', 27, 480),
('adv_ancient_boots', 'Ancient Warlord Sabatons', 'Legendary boots.', 'armor', 'legendary', 32, 'boots', 32, 640);

-- ====================================
-- ARMOR - GLOVES (18 items)
-- ====================================
INSERT INTO items (id, name, description, type, rarity, defense_bonus, equipment_slot, required_level, sell_price) VALUES
('adv_cloth_gloves', 'Traveler''s Gloves', 'Simple cloth gloves.', 'armor', 'common', 2, 'gloves', 1, 8),
('adv_leather_gloves', 'Leather Gloves', 'Sturdy leather gloves.', 'armor', 'uncommon', 4, 'gloves', 3, 20),
('adv_bronze_gauntlets', 'Bronze Gauntlets', 'Basic metal gauntlets.', 'armor', 'uncommon', 6, 'gloves', 5, 35),
('adv_iron_gauntlets', 'Iron Gauntlets', 'Heavy iron gauntlets.', 'armor', 'rare', 10, 'gloves', 8, 70),
('adv_steel_gauntlets', 'Steel Gauntlets', 'Well-crafted steel gauntlets.', 'armor', 'rare', 13, 'gloves', 11, 110),
('adv_mithril_gauntlets', 'Mithril Gauntlets', 'Lightweight yet strong gauntlets.', 'armor', 'epic', 18, 'gloves', 15, 200),
('adv_dragonscale_gauntlets', 'Dragonscale Gauntlets', 'Gauntlets made from dragon scales.', 'armor', 'epic', 20, 'gloves', 18, 260),
('adv_crystal_gauntlets', 'Crystal Gauntlets', 'Gauntlets infused with crystals.', 'armor', 'epic', 19, 'gloves', 16, 230),
('adv_shadow_gloves', 'Shadow Gloves', 'Gloves that enhance stealth.', 'armor', 'epic', 16, 'gloves', 14, 180),
('adv_flame_gauntlets', 'Flame Gauntlets', 'Gauntlets wreathed in flames.', 'armor', 'legendary', 24, 'gloves', 22, 360),
('adv_frost_gauntlets', 'Frost Gauntlets', 'Gauntlets radiating cold.', 'armor', 'legendary', 22, 'gloves', 21, 320),
('adv_holy_gauntlets', 'Holy Gauntlets', 'Blessed gauntlets.', 'armor', 'legendary', 26, 'gloves', 24, 400),
('adv_demon_gauntlets', 'Demon Gauntlets', 'Dark demonic gauntlets.', 'armor', 'legendary', 28, 'gloves', 26, 440),
('adv_void_gauntlets', 'Void Gauntlets', 'Gauntlets from the void.', 'armor', 'legendary', 30, 'gloves', 30, 560),
('adv_battle_gauntlets', 'Battle Gauntlets', 'Battle-worn gauntlets.', 'armor', 'rare', 12, 'gloves', 10, 95),
('adv_royal_gauntlets', 'Royal Gauntlets', 'Ornate royal gauntlets.', 'armor', 'epic', 21, 'gloves', 19, 280),
('adv_thunder_gauntlets', 'Thunder Gauntlets', 'Gauntlets crackling with lightning.', 'armor', 'legendary', 27, 'gloves', 27, 480),
('adv_ancient_gauntlets', 'Ancient Warlord Gauntlets', 'Legendary gauntlets.', 'armor', 'legendary', 32, 'gloves', 32, 640);

-- ====================================
-- ACCESSORIES - RINGS (15 items)
-- ====================================
INSERT INTO items (id, name, description, type, rarity, attack_bonus, defense_bonus, health_bonus, mana_bonus, equipment_slot, required_level, sell_price) VALUES
('adv_copper_ring', 'Copper Ring', 'A simple copper ring.', 'armor', 'common', 2, 1, 5, 0, 'ring', 1, 15),
('adv_silver_ring', 'Silver Ring', 'A polished silver ring.', 'armor', 'uncommon', 4, 2, 10, 5, 'ring', 5, 50),
('adv_gold_ring', 'Gold Ring', 'An ornate gold ring.', 'armor', 'rare', 6, 4, 20, 10, 'ring', 10, 120),
('adv_power_ring', 'Ring of Power', 'A ring that enhances strength.', 'armor', 'epic', 10, 0, 0, 0, 'ring', 15, 250),
('adv_protection_ring', 'Ring of Protection', 'A ring that enhances defense.', 'armor', 'epic', 0, 12, 0, 0, 'ring', 15, 250),
('adv_vitality_ring', 'Ring of Vitality', 'A ring that enhances health.', 'armor', 'epic', 0, 0, 50, 0, 'ring', 18, 300),
('adv_wisdom_ring', 'Ring of Wisdom', 'A ring that enhances mana.', 'armor', 'epic', 0, 0, 0, 30, 'ring', 18, 300),
('adv_dragon_ring', 'Dragonbone Ring', 'A ring carved from dragon bone.', 'armor', 'legendary', 12, 8, 40, 20, 'ring', 22, 500),
('adv_phoenix_ring', 'Phoenix Ring', 'A ring containing phoenix essence.', 'armor', 'legendary', 15, 10, 60, 30, 'ring', 26, 650),
('adv_void_ring', 'Void Ring', 'A ring from beyond reality.', 'armor', 'legendary', 18, 12, 80, 40, 'ring', 30, 800),
('adv_shadow_ring', 'Shadow Ring', 'A ring that enhances stealth attacks.', 'armor', 'epic', 8, 6, 15, 15, 'ring', 20, 380),
('adv_flame_ring', 'Flame Ring', 'A ring burning with eternal fire.', 'armor', 'legendary', 14, 9, 50, 25, 'ring', 24, 580),
('adv_frost_ring', 'Frost Ring', 'A ring of eternal ice.', 'armor', 'legendary', 13, 11, 45, 28, 'ring', 25, 620),
('adv_holy_ring', 'Holy Ring', 'A ring blessed by divine power.', 'armor', 'legendary', 16, 13, 70, 35, 'ring', 28, 750),
('adv_ancient_ring', 'Ancient Warlord Ring', 'A ring worn by legendary warriors.', 'armor', 'legendary', 20, 15, 100, 50, 'ring', 32, 1000);

-- ====================================
-- ACCESSORIES - AMULETS (15 items)
-- ====================================
INSERT INTO items (id, name, description, type, rarity, attack_bonus, defense_bonus, health_bonus, mana_bonus, equipment_slot, required_level, sell_price) VALUES
('adv_wooden_amulet', 'Wooden Amulet', 'A simple wooden charm.', 'armor', 'common', 1, 2, 10, 5, 'amulet', 1, 20),
('adv_bone_amulet', 'Bone Amulet', 'An amulet carved from bone.', 'armor', 'uncommon', 3, 4, 15, 8, 'amulet', 5, 60),
('adv_jade_amulet', 'Jade Amulet', 'A beautiful jade amulet.', 'armor', 'rare', 5, 6, 25, 15, 'amulet', 10, 140),
('adv_ruby_amulet', 'Ruby Amulet', 'An amulet with a glowing ruby.', 'armor', 'epic', 8, 8, 40, 20, 'amulet', 15, 280),
('adv_sapphire_amulet', 'Sapphire Amulet', 'An amulet with a deep blue sapphire.', 'armor', 'epic', 7, 9, 35, 25, 'amulet', 16, 300),
('adv_emerald_amulet', 'Emerald Amulet', 'An amulet with a brilliant emerald.', 'armor', 'epic', 6, 10, 45, 18, 'amulet', 17, 320),
('adv_diamond_amulet', 'Diamond Amulet', 'An amulet with a flawless diamond.', 'armor', 'legendary', 12, 12, 60, 30, 'amulet', 22, 550),
('adv_dragon_amulet', 'Dragon Amulet', 'An amulet containing dragon essence.', 'armor', 'legendary', 14, 14, 80, 40, 'amulet', 26, 700),
('adv_phoenix_amulet', 'Phoenix Amulet', 'An amulet with phoenix feathers.', 'armor', 'legendary', 16, 16, 100, 50, 'amulet', 28, 850),
('adv_void_amulet', 'Void Amulet', 'An amulet from the void.', 'armor', 'legendary', 18, 18, 120, 60, 'amulet', 30, 1000),
('adv_shadow_amulet', 'Shadow Amulet', 'An amulet of darkness.', 'armor', 'epic', 9, 11, 50, 28, 'amulet', 20, 420),
('adv_flame_amulet', 'Flame Amulet', 'An amulet burning with fire.', 'armor', 'legendary', 15, 15, 90, 45, 'amulet', 24, 650),
('adv_frost_amulet', 'Frost Amulet', 'An amulet of eternal ice.', 'armor', 'legendary', 13, 17, 85, 48, 'amulet', 25, 680),
('adv_holy_amulet', 'Holy Amulet', 'An amulet blessed by divine light.', 'armor', 'legendary', 17, 19, 110, 55, 'amulet', 28, 900),
('adv_ancient_amulet', 'Ancient Warlord Amulet', 'An amulet of legendary power.', 'armor', 'legendary', 20, 20, 150, 75, 'amulet', 32, 1200);

-- ====================================
-- CONSUMABLES (20 items)
-- ====================================
INSERT INTO items (id, name, description, type, rarity, health_bonus, mana_bonus, stackable, max_stack, required_level, sell_price) VALUES
('adv_berry', 'Wild Berry', 'A nutritious berry found while exploring.', 'consumable', 'common', 25, 0, true, 99, 1, 5),
('adv_mushroom', 'Glowing Mushroom', 'A mushroom that restores mana.', 'consumable', 'common', 0, 20, true, 99, 1, 5),
('adv_herb', 'Healing Herb', 'An herb with healing properties.', 'consumable', 'uncommon', 50, 0, true, 50, 3, 15),
('adv_crystal_shard', 'Mana Crystal Shard', 'A crystal that restores mana.', 'consumable', 'uncommon', 0, 40, true, 50, 3, 15),
('adv_honey', 'Forest Honey', 'Sweet honey that heals wounds.', 'consumable', 'uncommon', 75, 10, true, 30, 5, 25),
('adv_elixir', 'Adventurer''s Elixir', 'A balanced restorative elixir.', 'consumable', 'rare', 100, 50, true, 20, 8, 50),
('adv_greater_potion', 'Greater Health Potion', 'A powerful healing potion.', 'consumable', 'rare', 150, 0, true, 20, 10, 75),
('adv_mana_potion', 'Greater Mana Potion', 'A powerful mana potion.', 'consumable', 'rare', 0, 100, true, 20, 10, 75),
('adv_rejuv_potion', 'Rejuvenation Potion', 'Fully restores health and mana.', 'consumable', 'epic', 300, 150, true, 10, 15, 200),
('adv_phoenix_tear', 'Phoenix Tear', 'A legendary healing item.', 'consumable', 'legendary', 500, 250, true, 5, 22, 500),
('adv_ambrosia', 'Ambrosia', 'Food of the gods.', 'consumable', 'legendary', 1000, 500, true, 3, 30, 1000),
('adv_strength_potion', 'Strength Potion', 'Temporarily increases attack (item gives bonus).', 'consumable', 'uncommon', 0, 0, true, 20, 8, 30),
('adv_defense_potion', 'Defense Potion', 'Temporarily increases defense (item gives bonus).', 'consumable', 'uncommon', 0, 0, true, 20, 8, 30),
('adv_speed_potion', 'Speed Potion', 'Increases movement speed (cosmetic).', 'consumable', 'uncommon', 0, 0, true, 20, 6, 25),
('adv_luck_potion', 'Luck Potion', 'Increases loot chance (cosmetic).', 'consumable', 'rare', 0, 0, true, 10, 12, 80),
('adv_exp_potion', 'Experience Potion', 'Increases XP gain (cosmetic).', 'consumable', 'rare', 0, 0, true, 10, 10, 100),
('adv_gold_potion', 'Gold Fortune Potion', 'Increases gold drops (cosmetic).', 'consumable', 'rare', 0, 0, true, 10, 10, 90),
('adv_resist_potion', 'Resistance Potion', 'Increases elemental resistance (cosmetic).', 'consumable', 'epic', 0, 0, true, 8, 15, 150),
('adv_titan_potion', 'Titan Strength Potion', 'Massively increases power (cosmetic).', 'consumable', 'epic', 200, 100, true, 5, 20, 300),
('adv_immortal_potion', 'Immortality Elixir', 'Prevents death once (cosmetic).', 'consumable', 'legendary', 500, 250, true, 1, 25, 2000);

-- ============================================================================
-- Default Reward Configurations for Each Zone
-- ============================================================================

-- Zone 1: Havenbrook (Levels 1-5) - Safe Haven, Low Rewards
DO $$
DECLARE
  zone_id_val UUID := '00000000-0000-0000-0000-000000000001';
  i INTEGER;
BEGIN
  FOR i IN 1..100 LOOP
    INSERT INTO exploration_rewards_config (zone_id, progress_percent, reward_chance, loot_table, gold_min, gold_max, xp_min, xp_max)
    VALUES (
      zone_id_val,
      i,
      LEAST(0.05 + (i * 0.003), 0.35), -- 5% at 1%, increases to 35% at 100%
      jsonb_build_object(
        'adv_berry', 100,
        'adv_mushroom', 100,
        'adv_wooden_club', 5,
        'adv_rusty_dagger', 5,
        'adv_cloth_tunic', 10,
        'adv_leather_cap', 10,
        'adv_copper_ring', 3,
        'adv_wooden_amulet', 3
      ),
      2 + (i * 2), -- 2-200 gold scaling
      5 + (i * 3),
      5 + (i * 3), -- 5-300 XP scaling
      10 + (i * 5)
    );
  END LOOP;
END $$;

-- Zone 2: Whispering Woods (Levels 5-10) - Wilderness, Medium Rewards
DO $$
DECLARE
  zone_id_val UUID := '00000000-0000-0000-0000-000000000002';
  i INTEGER;
BEGIN
  FOR i IN 1..100 LOOP
    INSERT INTO exploration_rewards_config (zone_id, progress_percent, reward_chance, loot_table, gold_min, gold_max, xp_min, xp_max)
    VALUES (
      zone_id_val,
      i,
      LEAST(0.08 + (i * 0.004), 0.45), -- 8% at 1%, increases to 45% at 100%
      jsonb_build_object(
        'adv_herb', 80,
        'adv_honey', 60,
        'adv_elven_blade', 8,
        'adv_forest_spear', 8,
        'adv_mystic_wand', 10,
        'adv_elven_chainmail', 12,
        'adv_elven_circlet', 10,
        'adv_silver_ring', 6,
        'adv_bone_amulet', 6,
        'adv_bronze_chestplate', 15,
        'adv_leather_boots', 20
      ),
      10 + (i * 5),
      20 + (i * 8),
      15 + (i * 8),
      30 + (i * 12)
    );
  END LOOP;
END $$;

-- Zone 3: Ironpeak Foothills (Levels 10-15) - Mountain, Good Rewards
DO $$
DECLARE
  zone_id_val UUID := '00000000-0000-0000-0000-000000000003';
  i INTEGER;
BEGIN
  FOR i IN 1..100 LOOP
    INSERT INTO exploration_rewards_config (zone_id, progress_percent, reward_chance, loot_table, gold_min, gold_max, xp_min, xp_max)
    VALUES (
      zone_id_val,
      i,
      LEAST(0.10 + (i * 0.005), 0.55), -- 10% at 1%, increases to 55% at 100%
      jsonb_build_object(
        'adv_elixir', 70,
        'adv_greater_potion', 50,
        'adv_mountain_axe', 12,
        'adv_steel_longsword', 12,
        'adv_battle_hammer', 10,
        'adv_ranger_longbow', 8,
        'adv_flame_sword', 6,
        'adv_steel_breastplate', 15,
        'adv_steel_helm', 12,
        'adv_gold_ring', 8,
        'adv_jade_amulet', 8,
        'adv_iron_armor', 20
      ),
      25 + (i * 10),
      50 + (i * 15),
      30 + (i * 15),
      60 + (i * 25)
    );
  END LOOP;
END $$;

-- Zone 4: Crystalmere Lake (Levels 15-20) - Magical Zone, Great Rewards
DO $$
DECLARE
  zone_id_val UUID := '00000000-0000-0000-0000-000000000004';
  i INTEGER;
BEGIN
  FOR i IN 1..100 LOOP
    INSERT INTO exploration_rewards_config (zone_id, progress_percent, reward_chance, loot_table, gold_min, gold_max, xp_min, xp_max)
    VALUES (
      zone_id_val,
      i,
      LEAST(0.12 + (i * 0.006), 0.65), -- 12% at 1%, increases to 65% at 100%
      jsonb_build_object(
        'adv_rejuv_potion', 40,
        'adv_mana_potion', 60,
        'adv_crystal_staff', 10,
        'adv_tidal_trident', 10,
        'adv_silver_rapier', 12,
        'adv_mithril_sword', 12,
        'adv_lightning_bow', 6,
        'adv_mithril_armor', 12,
        'adv_crystal_armor', 10,
        'adv_mithril_helm', 10,
        'adv_ruby_amulet', 8,
        'adv_power_ring', 6,
        'adv_dragonscale_armor', 8
      ),
      50 + (i * 20),
      100 + (i * 30),
      60 + (i * 30),
      120 + (i * 50)
    );
  END LOOP;
END $$;

-- Zone 5: Shadowfen Marsh (Levels 20-25) - Dangerous, Epic Rewards
DO $$
DECLARE
  zone_id_val UUID := '00000000-0000-0000-0000-000000000005';
  i INTEGER;
BEGIN
  FOR i IN 1..100 LOOP
    INSERT INTO exploration_rewards_config (zone_id, progress_percent, reward_chance, loot_table, gold_min, gold_max, xp_min, xp_max)
    VALUES (
      zone_id_val,
      i,
      LEAST(0.15 + (i * 0.007), 0.75), -- 15% at 1%, increases to 75% at 100%
      jsonb_build_object(
        'adv_phoenix_tear', 20,
        'adv_titan_potion', 30,
        'adv_venomous_blade', 12,
        'adv_shadow_dagger', 8,
        'adv_cursed_staff', 8,
        'adv_shadow_robe', 12,
        'adv_shadow_hood', 10,
        'adv_shadow_ring', 8,
        'adv_shadow_amulet', 8,
        'adv_flame_sword', 10,
        'adv_demon_armor', 6,
        'adv_dragon_ring', 5,
        'adv_diamond_amulet', 5
      ),
      100 + (i * 30),
      200 + (i * 50),
      100 + (i * 50),
      200 + (i * 80)
    );
  END LOOP;
END $$;

-- Zone 6: Thornveil Thicket (Levels 25-30) - Very Dangerous, Legendary Rewards
DO $$
DECLARE
  zone_id_val UUID := '00000000-0000-0000-0000-000000000006';
  i INTEGER;
BEGIN
  FOR i IN 1..100 LOOP
    INSERT INTO exploration_rewards_config (zone_id, progress_percent, reward_chance, loot_table, gold_min, gold_max, xp_min, xp_max)
    VALUES (
      zone_id_val,
      i,
      LEAST(0.18 + (i * 0.008), 0.85), -- 18% at 1%, increases to 85% at 100%
      jsonb_build_object(
        'adv_phoenix_tear', 40,
        'adv_ambrosia', 10,
        'adv_thorn_blade', 12,
        'adv_nature_staff', 8,
        'adv_wooden_greatbow', 8,
        'adv_druid_scimitar', 10,
        'adv_nature_armor', 12,
        'adv_nature_wreath', 10,
        'adv_phoenix_ring', 6,
        'adv_phoenix_amulet', 6,
        'adv_void_ring', 4,
        'adv_void_amulet', 4,
        'adv_holy_armor', 8
      ),
      200 + (i * 50),
      400 + (i * 80),
      200 + (i * 80),
      400 + (i * 120)
    );
  END LOOP;
END $$;

-- Zone 7: Emberforge Depths (Levels 30+) - Extreme Danger, Best Rewards
DO $$
DECLARE
  zone_id_val UUID := '00000000-0000-0000-0000-000000000007';
  i INTEGER;
BEGIN
  FOR i IN 1..100 LOOP
    INSERT INTO exploration_rewards_config (zone_id, progress_percent, reward_chance, loot_table, gold_min, gold_max, xp_min, xp_max)
    VALUES (
      zone_id_val,
      i,
      LEAST(0.20 + (i * 0.010), 0.95), -- 20% at 1%, increases to 95% at 100%
      jsonb_build_object(
        'adv_ambrosia', 30,
        'adv_immortal_potion', 5,
        'adv_lava_axe', 10,
        'adv_inferno_sword', 10,
        'adv_phoenix_staff', 8,
        'adv_volcanic_hammer', 10,
        'adv_dragon_slayer', 6,
        'adv_flame_armor', 10,
        'adv_flame_crown', 8,
        'adv_dragon_helm', 8,
        'adv_void_armor', 6,
        'adv_ancient_armor', 4,
        'adv_void_ring', 8,
        'adv_ancient_ring', 4,
        'adv_holy_amulet', 6,
        'adv_ancient_amulet', 3,
        'adv_star_armor', 3
      ),
      500 + (i * 100),
      1000 + (i * 150),
      500 + (i * 150),
      1000 + (i * 250)
    );
  END LOOP;
END $$;

-- ============================================================================
-- Update active_explorations table to track last_reward_percent
-- ============================================================================
ALTER TABLE active_explorations
ADD COLUMN IF NOT EXISTS last_reward_percent INTEGER DEFAULT 0;

COMMENT ON COLUMN active_explorations.last_reward_percent IS 'Last progress percent where rewards were checked';

-- ============================================================================
-- Row Level Security
-- ============================================================================
ALTER TABLE exploration_rewards_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE exploration_rewards_log ENABLE ROW LEVEL SECURITY;

-- Anyone can read reward configs
CREATE POLICY exploration_rewards_config_select ON exploration_rewards_config
  FOR SELECT USING (true);

-- Users can only see their own reward logs
CREATE POLICY exploration_rewards_log_select ON exploration_rewards_log
  FOR SELECT USING (auth.uid() = (
    SELECT user_id FROM characters WHERE id = character_id
  ));

-- System can insert reward logs
CREATE POLICY exploration_rewards_log_insert ON exploration_rewards_log
  FOR INSERT WITH CHECK (auth.uid() = (
    SELECT user_id FROM characters WHERE id = character_id
  ));

-- ============================================================================
-- Indexes for Performance
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_active_explorations_last_reward ON active_explorations(last_reward_percent);
