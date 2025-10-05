-- =====================================================
-- Comprehensive Item Stats Update and Balance
-- Updates all items with balanced stats based on:
-- - 20-skill system progression
-- - Zone-based difficulty tiers
-- - Rarity-based power scaling
-- - Level requirements
-- - Durability system
-- =====================================================

-- =====================================================
-- PART 1: ADD DURABILITY TO EXISTING ITEMS
-- =====================================================

-- Add max_durability column to items table if not exists
ALTER TABLE items ADD COLUMN IF NOT EXISTS max_durability INTEGER;
ALTER TABLE items ADD COLUMN IF NOT EXISTS tier INTEGER;
ALTER TABLE items ADD COLUMN IF NOT EXISTS zone_tier INTEGER;

-- =====================================================
-- PART 2: UPDATE WEAPON STATS WITH BALANCED SCALING
-- =====================================================

-- Common Weapons (Tier 1, Levels 1-10)
UPDATE items SET
  attack_bonus = 8,
  defense_bonus = 0,
  health_bonus = 0,
  mana_bonus = 0,
  required_level = 1,
  sell_price = 15,
  max_durability = 100,
  tier = 1,
  zone_tier = 1
WHERE id = 'wooden_sword';

UPDATE items SET
  attack_bonus = 15,
  defense_bonus = 0,
  health_bonus = 0,
  mana_bonus = 0,
  required_level = 3,
  sell_price = 40,
  max_durability = 120,
  tier = 1,
  zone_tier = 1
WHERE id = 'bronze_sword';

UPDATE items SET
  attack_bonus = 18,
  defense_bonus = 0,
  health_bonus = 5,
  mana_bonus = 0,
  required_level = 5,
  sell_price = 50,
  max_durability = 120,
  tier = 1,
  zone_tier = 1
WHERE id = 'bronze_axe';

-- Uncommon Weapons (Tier 2, Levels 10-25)
UPDATE items SET
  attack_bonus = 28,
  defense_bonus = 2,
  health_bonus = 10,
  mana_bonus = 0,
  required_level = 10,
  sell_price = 120,
  max_durability = 150,
  tier = 2,
  zone_tier = 2
WHERE id = 'iron_sword';

UPDATE items SET
  attack_bonus = 32,
  defense_bonus = 0,
  health_bonus = 15,
  mana_bonus = 0,
  required_level = 12,
  sell_price = 150,
  max_durability = 150,
  tier = 2,
  zone_tier = 2
WHERE id = 'iron_battleaxe';

UPDATE items SET
  attack_bonus = 35,
  defense_bonus = 3,
  health_bonus = 20,
  mana_bonus = 10,
  required_level = 15,
  sell_price = 180,
  max_durability = 160,
  tier = 2,
  zone_tier = 2
WHERE id = 'oak_longbow';

-- Rare Weapons (Tier 3, Levels 25-40)
UPDATE items SET
  attack_bonus = 45,
  defense_bonus = 5,
  health_bonus = 25,
  mana_bonus = 15,
  required_level = 25,
  sell_price = 350,
  max_durability = 200,
  tier = 3,
  zone_tier = 3
WHERE id = 'steel_sword';

UPDATE items SET
  attack_bonus = 48,
  defense_bonus = 3,
  health_bonus = 30,
  mana_bonus = 10,
  required_level = 28,
  sell_price = 400,
  max_durability = 200,
  tier = 3,
  zone_tier = 3
WHERE id = 'steel_longsword';

UPDATE items SET
  attack_bonus = 52,
  defense_bonus = 0,
  health_bonus = 35,
  mana_bonus = 0,
  required_level = 30,
  sell_price = 450,
  max_durability = 200,
  tier = 3,
  zone_tier = 3
WHERE id = 'steel_warhammer';

UPDATE items SET
  attack_bonus = 42,
  defense_bonus = 8,
  health_bonus = 20,
  mana_bonus = 25,
  required_level = 32,
  sell_price = 420,
  max_durability = 180,
  tier = 3,
  zone_tier = 3
WHERE id = 'willow_comp_bow';

-- Epic Weapons (Tier 4, Levels 40-60)
UPDATE items SET
  attack_bonus = 68,
  defense_bonus = 10,
  health_bonus = 40,
  mana_bonus = 30,
  required_level = 40,
  sell_price = 800,
  max_durability = 250,
  tier = 4,
  zone_tier = 4
WHERE id = 'mithril_scimitar';

UPDATE items SET
  attack_bonus = 75,
  defense_bonus = 5,
  health_bonus = 50,
  mana_bonus = 20,
  required_level = 45,
  sell_price = 950,
  max_durability = 250,
  tier = 4,
  zone_tier = 4
WHERE id = 'mithril_greataxe';

UPDATE items SET
  attack_bonus = 65,
  defense_bonus = 12,
  health_bonus = 35,
  mana_bonus = 40,
  required_level = 42,
  sell_price = 850,
  max_durability = 230,
  tier = 4,
  zone_tier = 4
WHERE id = 'maple_longbow';

UPDATE items SET
  attack_bonus = 85,
  defense_bonus = 15,
  health_bonus = 60,
  mana_bonus = 35,
  required_level = 55,
  sell_price = 1800,
  max_durability = 280,
  tier = 4,
  zone_tier = 4
WHERE id = 'adamant_sword';

UPDATE items SET
  attack_bonus = 78,
  defense_bonus = 18,
  health_bonus = 45,
  mana_bonus = 50,
  required_level = 50,
  sell_price = 1500,
  max_durability = 250,
  tier = 4,
  zone_tier = 4
WHERE id = 'yew_longbow';

-- Legendary Weapons (Tier 5, Levels 60+)
UPDATE items SET
  attack_bonus = 110,
  defense_bonus = 20,
  health_bonus = 80,
  mana_bonus = 60,
  required_level = 65,
  sell_price = 4000,
  max_durability = 350,
  tier = 5,
  zone_tier = 5
WHERE id = 'rune_sword';

UPDATE items SET
  attack_bonus = 100,
  defense_bonus = 25,
  health_bonus = 70,
  mana_bonus = 80,
  required_level = 70,
  sell_price = 3500,
  max_durability = 320,
  tier = 5,
  zone_tier = 5
WHERE id = 'magic_longbow';

-- =====================================================
-- PART 3: UPDATE ARMOR STATS WITH BALANCED SCALING
-- =====================================================

-- Common Armor (Tier 1, Levels 1-10)
UPDATE items SET
  attack_bonus = 0,
  defense_bonus = 5,
  health_bonus = 15,
  mana_bonus = 0,
  required_level = 1,
  sell_price = 20,
  max_durability = 100,
  tier = 1,
  zone_tier = 1
WHERE id = 'leather_armor';

UPDATE items SET
  attack_bonus = 0,
  defense_bonus = 8,
  health_bonus = 20,
  mana_bonus = 5,
  required_level = 1,
  sell_price = 25,
  max_durability = 120,
  tier = 1,
  zone_tier = 1
WHERE id = 'bronze_helm';

UPDATE items SET
  attack_bonus = 0,
  defense_bonus = 12,
  health_bonus = 30,
  mana_bonus = 5,
  required_level = 3,
  sell_price = 45,
  max_durability = 120,
  tier = 1,
  zone_tier = 1
WHERE id = 'bronze_platebody';

UPDATE items SET
  attack_bonus = 0,
  defense_bonus = 10,
  health_bonus = 25,
  mana_bonus = 5,
  required_level = 2,
  sell_price = 35,
  max_durability = 120,
  tier = 1,
  zone_tier = 1
WHERE id = 'bronze_platelegs';

-- Uncommon Armor (Tier 2, Levels 10-25)
UPDATE items SET
  attack_bonus = 0,
  defense_bonus = 18,
  health_bonus = 35,
  mana_bonus = 10,
  required_level = 10,
  sell_price = 100,
  max_durability = 150,
  tier = 2,
  zone_tier = 2
WHERE id = 'iron_armor';

UPDATE items SET
  attack_bonus = 0,
  defense_bonus = 15,
  health_bonus = 30,
  mana_bonus = 10,
  required_level = 10,
  sell_price = 80,
  max_durability = 150,
  tier = 2,
  zone_tier = 2
WHERE id = 'iron_helm';

UPDATE items SET
  attack_bonus = 0,
  defense_bonus = 22,
  health_bonus = 45,
  mana_bonus = 15,
  required_level = 12,
  sell_price = 140,
  max_durability = 150,
  tier = 2,
  zone_tier = 2
WHERE id = 'iron_platebody';

UPDATE items SET
  attack_bonus = 0,
  defense_bonus = 18,
  health_bonus = 40,
  mana_bonus = 10,
  required_level = 11,
  sell_price = 110,
  max_durability = 150,
  tier = 2,
  zone_tier = 2
WHERE id = 'iron_platelegs';

-- Rare Armor (Tier 3, Levels 25-40)
UPDATE items SET
  attack_bonus = 0,
  defense_bonus = 32,
  health_bonus = 60,
  mana_bonus = 25,
  required_level = 25,
  sell_price = 280,
  max_durability = 200,
  tier = 3,
  zone_tier = 3
WHERE id = 'steel_armor';

UPDATE items SET
  attack_bonus = 0,
  defense_bonus = 28,
  health_bonus = 50,
  mana_bonus = 20,
  required_level = 25,
  sell_price = 220,
  max_durability = 200,
  tier = 3,
  zone_tier = 3
WHERE id = 'steel_helm';

UPDATE items SET
  attack_bonus = 0,
  defense_bonus = 38,
  health_bonus = 75,
  mana_bonus = 30,
  required_level = 28,
  sell_price = 380,
  max_durability = 200,
  tier = 3,
  zone_tier = 3
WHERE id = 'steel_platebody';

UPDATE items SET
  attack_bonus = 0,
  defense_bonus = 32,
  health_bonus = 65,
  mana_bonus = 25,
  required_level = 26,
  sell_price = 300,
  max_durability = 200,
  tier = 3,
  zone_tier = 3
WHERE id = 'steel_platelegs';

-- Epic Armor (Tier 4, Levels 40-60)
UPDATE items SET
  attack_bonus = 5,
  defense_bonus = 48,
  health_bonus = 90,
  mana_bonus = 40,
  required_level = 40,
  sell_price = 600,
  max_durability = 250,
  tier = 4,
  zone_tier = 4
WHERE id = 'mithril_helm';

UPDATE items SET
  attack_bonus = 5,
  defense_bonus = 65,
  health_bonus = 120,
  mana_bonus = 50,
  required_level = 45,
  sell_price = 1000,
  max_durability = 250,
  tier = 4,
  zone_tier = 4
WHERE id = 'mithril_platebody';

UPDATE items SET
  attack_bonus = 10,
  defense_bonus = 85,
  health_bonus = 150,
  mana_bonus = 60,
  required_level = 55,
  sell_price = 2500,
  max_durability = 280,
  tier = 4,
  zone_tier = 4
WHERE id = 'adamant_platebody';

-- Legendary Armor (Tier 5, Levels 60+)
UPDATE items SET
  attack_bonus = 15,
  defense_bonus = 115,
  health_bonus = 200,
  mana_bonus = 80,
  required_level = 65,
  sell_price = 5500,
  max_durability = 350,
  tier = 5,
  zone_tier = 5
WHERE id = 'rune_platebody';

-- =====================================================
-- PART 4: UPDATE CONSUMABLES WITH SCALING EFFECTS
-- =====================================================

UPDATE items SET
  health_bonus = 50,
  mana_bonus = 0,
  required_level = 1,
  sell_price = 25,
  max_durability = NULL,
  tier = 1
WHERE id = 'health_potion';

UPDATE items SET
  health_bonus = 0,
  mana_bonus = 30,
  required_level = 1,
  sell_price = 20,
  max_durability = NULL,
  tier = 1
WHERE id = 'mana_potion';

UPDATE items SET
  health_bonus = 50,
  mana_bonus = 0,
  required_level = 1,
  sell_price = 15,
  max_durability = NULL,
  tier = 1
WHERE id = 'lesser_health_potion';

UPDATE items SET
  health_bonus = 200,
  mana_bonus = 0,
  required_level = 20,
  sell_price = 100,
  max_durability = NULL,
  tier = 3
WHERE id = 'greater_health_potion';

UPDATE items SET
  health_bonus = 400,
  mana_bonus = 0,
  required_level = 40,
  sell_price = 250,
  max_durability = NULL,
  tier = 4
WHERE id = 'super_health_potion';

UPDATE items SET
  health_bonus = 0,
  mana_bonus = 30,
  required_level = 1,
  sell_price = 12,
  max_durability = NULL,
  tier = 1
WHERE id = 'lesser_mana_potion';

UPDATE items SET
  health_bonus = 0,
  mana_bonus = 120,
  required_level = 20,
  sell_price = 85,
  max_durability = NULL,
  tier = 3
WHERE id = 'greater_mana_potion';

UPDATE items SET
  health_bonus = 0,
  mana_bonus = 250,
  required_level = 40,
  sell_price = 220,
  max_durability = NULL,
  tier = 4
WHERE id = 'super_mana_potion';

UPDATE items SET
  health_bonus = 300,
  mana_bonus = 150,
  required_level = 50,
  sell_price = 500,
  max_durability = NULL,
  tier = 4
WHERE id = 'elixir_of_vitality';

UPDATE items SET
  health_bonus = 999,
  mana_bonus = 999,
  required_level = 70,
  sell_price = 1500,
  max_durability = NULL,
  tier = 5
WHERE id = 'supreme_elixir';

-- =====================================================
-- PART 5: UPDATE ACCESSORIES WITH BALANCED STATS
-- =====================================================

-- Rings
UPDATE items SET
  attack_bonus = 1,
  defense_bonus = 3,
  health_bonus = 10,
  mana_bonus = 5,
  required_level = 1,
  sell_price = 20,
  max_durability = NULL,
  tier = 1
WHERE id = 'copper_ring';

UPDATE items SET
  attack_bonus = 3,
  defense_bonus = 8,
  health_bonus = 25,
  mana_bonus = 20,
  required_level = 15,
  sell_price = 120,
  max_durability = NULL,
  tier = 2
WHERE id = 'sapphire_ring';

UPDATE items SET
  attack_bonus = 5,
  defense_bonus = 12,
  health_bonus = 40,
  mana_bonus = 35,
  required_level = 25,
  sell_price = 280,
  max_durability = NULL,
  tier = 3
WHERE id = 'emerald_ring';

UPDATE items SET
  attack_bonus = 8,
  defense_bonus = 18,
  health_bonus = 60,
  mana_bonus = 50,
  required_level = 40,
  sell_price = 600,
  max_durability = NULL,
  tier = 4
WHERE id = 'ruby_ring';

UPDATE items SET
  attack_bonus = 12,
  defense_bonus = 25,
  health_bonus = 90,
  mana_bonus = 80,
  required_level = 60,
  sell_price = 1800,
  max_durability = NULL,
  tier = 5
WHERE id = 'diamond_ring';

-- Amulets
UPDATE items SET
  attack_bonus = 2,
  defense_bonus = 4,
  health_bonus = 15,
  mana_bonus = 8,
  required_level = 1,
  sell_price = 25,
  max_durability = NULL,
  tier = 1
WHERE id = 'copper_amulet';

UPDATE items SET
  attack_bonus = 4,
  defense_bonus = 10,
  health_bonus = 30,
  mana_bonus = 25,
  required_level = 15,
  sell_price = 150,
  max_durability = NULL,
  tier = 2
WHERE id = 'sapphire_amulet';

UPDATE items SET
  attack_bonus = 6,
  defense_bonus = 15,
  health_bonus = 50,
  mana_bonus = 40,
  required_level = 25,
  sell_price = 350,
  max_durability = NULL,
  tier = 3
WHERE id = 'emerald_amulet';

UPDATE items SET
  attack_bonus = 10,
  defense_bonus = 22,
  health_bonus = 75,
  mana_bonus = 60,
  required_level = 40,
  sell_price = 750,
  max_durability = NULL,
  tier = 4
WHERE id = 'ruby_amulet';

UPDATE items SET
  attack_bonus = 15,
  defense_bonus = 30,
  health_bonus = 110,
  mana_bonus = 100,
  required_level = 60,
  sell_price = 2200,
  max_durability = NULL,
  tier = 5
WHERE id = 'diamond_amulet';

-- =====================================================
-- PART 6: ADD NEW BOSS REWARD ITEMS
-- =====================================================

-- Forest Guardian Rewards
INSERT INTO items (id, name, description, type, rarity, equipment_slot, attack_bonus, defense_bonus, health_bonus, mana_bonus, required_level, sell_price, max_durability, tier, zone_tier) VALUES
  ('guardian_blade', 'Guardian Blade', '⚔️ A blade blessed by the ancient forest spirits', 'weapon', 'rare', 'weapon', 40, 8, 35, 20, 20, 500, 220, 3, 2),
  ('bark_shield', 'Bark Shield', '🛡️ Shield crafted from ancient treant bark', 'armor', 'rare', 'shield', 0, 35, 50, 15, 20, 450, 220, 3, 2),
  ('nature_crown', 'Nature''s Crown', '👑 A crown woven from living vines', 'armor', 'rare', 'helmet', 3, 25, 40, 30, 22, 480, 200, 3, 2)
ON CONFLICT (id) DO NOTHING;

-- Goblin King Rewards
INSERT INTO items (id, name, description, type, rarity, equipment_slot, attack_bonus, defense_bonus, health_bonus, mana_bonus, required_level, sell_price, max_durability, tier, zone_tier) VALUES
  ('goblin_scepter', 'Goblin King''s Scepter', '👑 Symbol of goblin leadership', 'weapon', 'epic', 'weapon', 60, 12, 45, 40, 35, 1200, 260, 4, 3),
  ('crown_of_greed', 'Crown of Greed', '👑 Increases gold find by 20%', 'armor', 'epic', 'helmet', 5, 42, 60, 35, 35, 1100, 250, 4, 3),
  ('tribal_warboots', 'Tribal Warboots', '👢 Boots worn by goblin commanders', 'armor', 'epic', 'boots', 8, 38, 55, 20, 33, 950, 240, 4, 3)
ON CONFLICT (id) DO NOTHING;

-- Ancient Dragon Rewards
INSERT INTO items (id, name, description, type, rarity, equipment_slot, attack_bonus, defense_bonus, health_bonus, mana_bonus, required_level, sell_price, max_durability, tier, zone_tier) VALUES
  ('dragon_fang', 'Dragon Fang Blade', '🗡️ Forged from an ancient dragon''s fang', 'weapon', 'epic', 'weapon', 95, 20, 80, 50, 50, 3000, 300, 4, 4),
  ('dragonscale_mail', 'Dragonscale Mail', '🛡️ Armor crafted from dragon scales', 'armor', 'epic', 'chest', 12, 95, 140, 65, 52, 3200, 300, 4, 4),
  ('wyrm_heart_amulet', 'Wyrm Heart Amulet', '💎 Contains the essence of dragon fire', 'armor', 'epic', 'amulet', 18, 35, 100, 80, 50, 2800, NULL, 4, 4)
ON CONFLICT (id) DO NOTHING;

-- Lich Lord Rewards
INSERT INTO items (id, name, description, type, rarity, equipment_slot, attack_bonus, defense_bonus, health_bonus, mana_bonus, required_level, sell_price, max_durability, tier, zone_tier) VALUES
  ('soul_reaver', 'Soul Reaver', '💀 Weapon that drains life essence', 'weapon', 'legendary', 'weapon', 125, 30, 100, 90, 65, 6000, 380, 5, 5),
  ('lich_crown', 'Crown of the Lich', '👑 Grants mastery over death magic', 'armor', 'legendary', 'helmet', 20, 80, 120, 150, 65, 5500, 350, 5, 5),
  ('phylactery', 'Phylactery', '💎 Contains bound souls for power', 'armor', 'legendary', 'amulet', 25, 45, 150, 200, 68, 7000, NULL, 5, 5),
  ('deathguard_plate', 'Deathguard Platebody', '💀 Armor infused with necromantic energy', 'armor', 'legendary', 'chest', 20, 130, 220, 100, 70, 8000, 400, 5, 5)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- PART 7: ADD RARE GATHERING TOOL UPGRADES
-- =====================================================

INSERT INTO items (id, name, description, type, rarity, equipment_slot, attack_bonus, defense_bonus, health_bonus, mana_bonus, required_level, sell_price, max_durability, tier, zone_tier) VALUES
  -- Woodcutting Tools
  ('mithril_hatchet', 'Mithril Hatchet', '🪓 Increases woodcutting speed by 15%', 'weapon', 'epic', 'weapon', 30, 5, 20, 10, 35, 800, 250, 4, 3),
  ('rune_hatchet', 'Rune Hatchet', '🪓 Increases woodcutting speed by 25%', 'weapon', 'legendary', 'weapon', 45, 10, 30, 20, 60, 2500, 350, 5, 5),

  -- Mining Tools
  ('mithril_pickaxe', 'Mithril Pickaxe', '⛏️ Increases mining speed by 15%', 'weapon', 'epic', 'weapon', 25, 8, 25, 5, 35, 750, 250, 4, 3),
  ('rune_pickaxe', 'Rune Pickaxe', '⛏️ Increases mining speed by 25%', 'weapon', 'legendary', 'weapon', 40, 15, 40, 10, 60, 2400, 350, 5, 5),

  -- Fishing Tools
  ('enchanted_rod', 'Enchanted Fishing Rod', '🎣 Increases fishing speed by 20%', 'weapon', 'epic', 'weapon', 5, 0, 15, 30, 30, 600, 200, 4, 3),
  ('master_rod', 'Master Angler''s Rod', '🎣 Increases fishing speed by 30%', 'weapon', 'legendary', 'weapon', 10, 0, 25, 50, 55, 2000, 300, 5, 5),

  -- Alchemy Tools
  ('alchemist_gloves', 'Alchemist''s Gloves', '🧤 Increases alchemy success by 10%', 'armor', 'epic', 'gloves', 0, 15, 20, 40, 30, 650, 200, 4, 3),
  ('master_alembic', 'Master Alembic', '🧪 Portable alchemy lab, +20% success', 'armor', 'legendary', 'amulet', 5, 20, 30, 80, 55, 2200, NULL, 5, 5)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- PART 8: ADD SPECIAL EVENT ITEMS
-- =====================================================

INSERT INTO items (id, name, description, type, rarity, equipment_slot, attack_bonus, defense_bonus, health_bonus, mana_bonus, required_level, sell_price, max_durability, tier, zone_tier) VALUES
  -- Seasonal/Event Items
  ('harvest_scythe', 'Harvest Scythe', '🌾 Special autumn event weapon', 'weapon', 'epic', 'weapon', 70, 15, 50, 35, 40, 1500, 275, 4, 4),
  ('frost_blade', 'Frost Blade', '❄️ Winter event sword with ice damage', 'weapon', 'epic', 'weapon', 75, 10, 40, 45, 42, 1600, 275, 4, 4),
  ('spring_bloom_staff', 'Spring Bloom Staff', '🌸 Spring event staff of renewal', 'weapon', 'epic', 'weapon', 50, 25, 60, 70, 38, 1400, 260, 4, 3),
  ('summer_sun_shield', 'Summer Sun Shield', '☀️ Summer event shield of radiance', 'armor', 'epic', 'shield', 5, 65, 80, 40, 40, 1450, 270, 4, 4)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- PART 9: ADD PVP/ACHIEVEMENT REWARD ITEMS
-- =====================================================

INSERT INTO items (id, name, description, type, rarity, equipment_slot, attack_bonus, defense_bonus, health_bonus, mana_bonus, required_level, sell_price, max_durability, tier, zone_tier) VALUES
  -- Achievement Rewards
  ('veteran_blade', 'Veteran''s Blade', '⚔️ Awarded for 100 victories', 'weapon', 'epic', 'weapon', 80, 18, 60, 30, 45, 2000, 280, 4, 4),
  ('explorer_boots', 'Explorer''s Boots', '👢 Awarded for discovering all zones', 'armor', 'epic', 'boots', 10, 45, 70, 35, 40, 1800, 260, 4, 4),
  ('master_crafter_hammer', 'Master Crafter''s Hammer', '🔨 Awarded for crafting mastery', 'weapon', 'legendary', 'weapon', 90, 25, 70, 60, 60, 3500, 340, 5, 5),
  ('champion_crown', 'Champion''s Crown', '👑 Awarded for reaching max level', 'armor', 'legendary', 'helmet', 22, 75, 130, 110, 70, 5000, 380, 5, 5)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- PART 10: UPDATE EQUIPMENT SLOT FOR WEAPONS
-- =====================================================

-- Ensure all shields have proper slot designation
UPDATE items SET equipment_slot = 'shield' WHERE id IN ('bark_shield', 'summer_sun_shield') AND type = 'armor';

-- Add gloves and boots slots where missing
ALTER TABLE items ADD CONSTRAINT valid_equipment_slot CHECK (
  equipment_slot IS NULL OR equipment_slot IN (
    'weapon', 'helmet', 'chest', 'legs', 'boots',
    'gloves', 'ring', 'amulet', 'shield'
  )
);

-- =====================================================
-- PART 11: CREATE ITEM SET BONUSES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS item_sets (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  items JSONB NOT NULL, -- Array of item IDs in the set
  bonuses JSONB NOT NULL, -- Bonuses for wearing 2, 3, 4, etc pieces
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE item_sets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Item sets are viewable by everyone"
  ON item_sets FOR SELECT
  TO authenticated
  USING (true);

-- Insert some item sets
INSERT INTO item_sets (id, name, description, items, bonuses) VALUES
  ('bronze_starter', 'Bronze Warrior Set', 'Basic bronze equipment for beginners',
   '["bronze_helm", "bronze_platebody", "bronze_platelegs", "bronze_sword"]',
   '{"2": {"defense_bonus": 5, "health_bonus": 20}, "3": {"defense_bonus": 10, "health_bonus": 40}, "4": {"defense_bonus": 15, "health_bonus": 60, "attack_bonus": 10}}'),

  ('dragon_slayer', 'Dragon Slayer Set', 'Equipment forged from dragon parts',
   '["dragon_fang", "dragonscale_mail", "wyrm_heart_amulet"]',
   '{"2": {"attack_bonus": 15, "health_bonus": 50}, "3": {"attack_bonus": 30, "health_bonus": 100, "mana_bonus": 50, "defense_bonus": 20}}'),

  ('lich_eternal', 'Eternal Darkness Set', 'The Lich Lord''s complete regalia',
   '["soul_reaver", "lich_crown", "phylactery", "deathguard_plate"]',
   '{"2": {"mana_bonus": 50, "health_bonus": 50}, "3": {"mana_bonus": 100, "health_bonus": 100, "attack_bonus": 20}, "4": {"mana_bonus": 200, "health_bonus": 200, "attack_bonus": 40, "defense_bonus": 40}}')
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- PART 12: ADD CRAFTING MATERIAL METADATA
-- =====================================================

-- Update material items with crafting skill associations
UPDATE items SET zone_tier = 1 WHERE id IN ('oak_log', 'copper_ore', 'tin_ore', 'raw_shrimp', 'rabbit_meat', 'guam_leaf', 'air_essence', 'water_essence');
UPDATE items SET zone_tier = 2 WHERE id IN ('willow_log', 'iron_ore', 'coal', 'raw_trout', 'wolf_pelt', 'harralander', 'earth_essence', 'fire_essence');
UPDATE items SET zone_tier = 3 WHERE id IN ('maple_log', 'mithril_ore', 'raw_salmon', 'bear_hide', 'ranarr_weed', 'nature_rune');
UPDATE items SET zone_tier = 4 WHERE id IN ('yew_log', 'adamantite_ore', 'raw_swordfish', 'drake_scales', 'kwuarm', 'chaos_rune', 'death_rune');
UPDATE items SET zone_tier = 5 WHERE id IN ('magic_log', 'runite_ore', 'raw_manta_ray', 'dragon_hide', 'torstol', 'soul_rune', 'blood_rune');

-- =====================================================
-- PART 13: CREATE INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_items_tier ON items(tier) WHERE tier IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_items_zone_tier ON items(zone_tier) WHERE zone_tier IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_items_required_level ON items(required_level);
CREATE INDEX IF NOT EXISTS idx_items_max_durability ON items(max_durability) WHERE max_durability IS NOT NULL;

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON COLUMN items.max_durability IS 'Maximum durability for equipment items (NULL for consumables/materials)';
COMMENT ON COLUMN items.tier IS 'Item power tier (1-5) for progression balancing';
COMMENT ON COLUMN items.zone_tier IS 'Zone difficulty tier (1-5) where item is commonly found';
COMMENT ON TABLE item_sets IS 'Defines equipment sets with cumulative bonuses for wearing multiple pieces';

-- =====================================================
-- FINAL CLEANUP - Fix any NULL values for existing items
-- =====================================================

-- Set default tier for items without one
UPDATE items SET tier = 1 WHERE tier IS NULL AND rarity = 'common';
UPDATE items SET tier = 2 WHERE tier IS NULL AND rarity = 'uncommon';
UPDATE items SET tier = 3 WHERE tier IS NULL AND rarity = 'rare';
UPDATE items SET tier = 4 WHERE tier IS NULL AND rarity = 'epic';
UPDATE items SET tier = 5 WHERE tier IS NULL AND rarity = 'legendary';

-- Set default zone_tier based on required level
UPDATE items SET zone_tier = 1 WHERE zone_tier IS NULL AND required_level < 10;
UPDATE items SET zone_tier = 2 WHERE zone_tier IS NULL AND required_level >= 10 AND required_level < 25;
UPDATE items SET zone_tier = 3 WHERE zone_tier IS NULL AND required_level >= 25 AND required_level < 40;
UPDATE items SET zone_tier = 4 WHERE zone_tier IS NULL AND required_level >= 40 AND required_level < 60;
UPDATE items SET zone_tier = 5 WHERE zone_tier IS NULL AND required_level >= 60;

-- Set durability for equipment that doesn't have it
UPDATE items SET max_durability = 100 WHERE max_durability IS NULL AND type = 'weapon' AND rarity = 'common';
UPDATE items SET max_durability = 150 WHERE max_durability IS NULL AND type = 'weapon' AND rarity = 'uncommon';
UPDATE items SET max_durability = 200 WHERE max_durability IS NULL AND type = 'weapon' AND rarity = 'rare';
UPDATE items SET max_durability = 250 WHERE max_durability IS NULL AND type = 'weapon' AND rarity = 'epic';
UPDATE items SET max_durability = 350 WHERE max_durability IS NULL AND type = 'weapon' AND rarity = 'legendary';

UPDATE items SET max_durability = 100 WHERE max_durability IS NULL AND type = 'armor' AND rarity = 'common';
UPDATE items SET max_durability = 150 WHERE max_durability IS NULL AND type = 'armor' AND rarity = 'uncommon';
UPDATE items SET max_durability = 200 WHERE max_durability IS NULL AND type = 'armor' AND rarity = 'rare';
UPDATE items SET max_durability = 250 WHERE max_durability IS NULL AND type = 'armor' AND rarity = 'epic';
UPDATE items SET max_durability = 350 WHERE max_durability IS NULL AND type = 'armor' AND rarity = 'legendary';