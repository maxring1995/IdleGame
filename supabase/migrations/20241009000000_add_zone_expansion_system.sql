-- Migration: Zone Expansion System
-- Adds zone-specific merchants, monsters, materials, and items for immersive gameplay

-- Add zone_id to merchant_inventory for zone-specific merchants
ALTER TABLE merchant_inventory ADD COLUMN IF NOT EXISTS zone_id UUID REFERENCES world_zones(id);
ALTER TABLE merchant_inventory ADD COLUMN IF NOT EXISTS merchant_name TEXT;
ALTER TABLE merchant_inventory ADD COLUMN IF NOT EXISTS merchant_description TEXT;

-- Add zone_id to enemies for zone-specific monsters
ALTER TABLE enemies ADD COLUMN IF NOT EXISTS zone_id UUID REFERENCES world_zones(id);

-- Add zone_id to materials for zone-specific gathering
ALTER TABLE materials ADD COLUMN IF NOT EXISTS zone_id UUID REFERENCES world_zones(id);

-- Create zone_merchants table to track unique merchants per zone
CREATE TABLE IF NOT EXISTS zone_merchants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id UUID NOT NULL REFERENCES world_zones(id),
  merchant_name TEXT NOT NULL,
  merchant_type TEXT NOT NULL, -- 'general', 'weapons', 'armor', 'potions', 'materials', 'specialty'
  description TEXT,
  greeting_message TEXT,
  personality TEXT, -- 'friendly', 'gruff', 'mysterious', 'cheerful', 'suspicious'
  icon TEXT DEFAULT '🏪',
  discount_multiplier DECIMAL(3,2) DEFAULT 1.00, -- 0.9 = 10% discount, 1.1 = 10% markup
  unlocked_at_reputation INTEGER DEFAULT 0, -- Future: reputation system
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(zone_id, merchant_name)
);

-- Create zone_exclusive_items table for special zone items
CREATE TABLE IF NOT EXISTS zone_exclusive_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id UUID NOT NULL REFERENCES world_zones(id),
  item_id TEXT NOT NULL REFERENCES items(id),
  is_exclusive BOOLEAN DEFAULT true, -- If true, only available in this zone
  discovery_required BOOLEAN DEFAULT false, -- Must discover zone first
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(zone_id, item_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_merchant_inventory_zone ON merchant_inventory(zone_id) WHERE zone_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_enemies_zone ON enemies(zone_id) WHERE zone_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_materials_zone ON materials(zone_id) WHERE zone_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_zone_merchants_zone ON zone_merchants(zone_id);
CREATE INDEX IF NOT EXISTS idx_zone_exclusive_items_zone ON zone_exclusive_items(zone_id);

-- RLS Policies
ALTER TABLE zone_merchants ENABLE ROW LEVEL SECURITY;
ALTER TABLE zone_exclusive_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Zone merchants viewable by everyone"
  ON zone_merchants FOR SELECT
  USING (true);

CREATE POLICY "Zone exclusive items viewable by everyone"
  ON zone_exclusive_items FOR SELECT
  USING (true);

-- Seed Zone Merchants
INSERT INTO zone_merchants (zone_id, merchant_name, merchant_type, description, greeting_message, personality, icon) VALUES
-- Havenbrook Village (Starter Zone)
('00000000-0000-0000-0000-000000000001', 'Merchant Aldric', 'general', 'A kind-hearted general merchant who''s been trading in Havenbrook for decades', 'Welcome, traveler! Looking for supplies?', 'friendly', '👨‍💼'),
('00000000-0000-0000-0000-000000000001', 'Blacksmith Gerta', 'weapons', 'A master blacksmith known for crafting reliable starter weapons', 'Need a good blade? I''ve got just the thing!', 'gruff', '⚒️'),
('00000000-0000-0000-0000-000000000001', 'Apothecary Finn', 'potions', 'A cheerful alchemist specializing in basic healing potions', 'Potions and remedies! Fresh today!', 'cheerful', '🧪'),

-- Whispering Woods (Level 1+)
('00000000-0000-0000-0000-000000000002', 'Ranger Sylva', 'materials', 'A mysterious ranger who trades in forest materials and rare herbs', 'The woods provide... for those who respect them.', 'mysterious', '🏹'),
('00000000-0000-0000-0000-000000000002', 'Wandering Trader Orin', 'general', 'A traveling merchant who sets up shop at the forest edge', 'Come! Come! Treasures from afar!', 'cheerful', '🎒'),

-- Ironpeak Foothills (Level 10+)
('00000000-0000-0000-0000-000000000003', 'Dwarf Merchant Thorin', 'weapons', 'A stout dwarf who deals in mountain-forged weapons', 'Mountain steel! Best in the realm!', 'gruff', '🪓'),
('00000000-0000-0000-0000-000000000003', 'Gemcutter Mira', 'materials', 'An expert in precious stones and mountain minerals', 'Ah, a fellow admirer of earth''s treasures!', 'friendly', '💎'),

-- Shadowfen Marsh (Level 20+)
('00000000-0000-0000-0000-000000000004', 'Swamp Witch Morgana', 'potions', 'A peculiar witch selling strange concoctions and dark remedies', 'Hehehe... what brings you to my bog?', 'suspicious', '🧙‍♀️'),
('00000000-0000-0000-0000-000000000004', 'Scavenger Rask', 'general', 'A shadowy figure trading in swamp-salvaged goods', 'Got coin? I got goods. No questions.', 'suspicious', '🦎'),

-- Emberpeak Mines (Level 25+)
('00000000-0000-0000-0000-000000000005', 'Forgemaster Vulcan', 'weapons', 'A legendary smith who works near rivers of lava', 'Fire-forged weapons! Unbreakable!', 'gruff', '🔥'),
('00000000-0000-0000-0000-000000000005', 'Ore Trader Krag', 'materials', 'A tough merchant specializing in rare ores and metals', 'These ores ain''t gonna sell themselves!', 'gruff', '⛏️'),

-- Frostspire Mountains (Level 40+)
('00000000-0000-0000-0000-000000000006', 'Ice Merchant Elara', 'specialty', 'An elegant merchant dealing in frost-enchanted gear', 'Welcome to my frozen emporium.', 'mysterious', '❄️'),
('00000000-0000-0000-0000-000000000006', 'Mountain Hermit Bjorn', 'potions', 'A reclusive alchemist with powerful frost resistance potions', 'Hmph. You made it this far. Impressive.', 'gruff', '🧔'),

-- The Shattered Wastes (Level 50+)
('00000000-0000-0000-0000-000000000007', 'Demon Merchant Azrael', 'specialty', 'A charismatic demon trading in cursed and legendary items', 'Mortal! I have wares that will change your fate...', 'suspicious', '😈'),
('00000000-0000-0000-0000-000000000007', 'Soul Trader Vex', 'weapons', 'A mysterious entity offering weapons of immense power', 'Power... for a price. Always a price.', 'mysterious', '💀');

-- Add zone-specific items to existing items table (we'll do this via separate function)
-- These will reference the items table and link them to zones

-- Function to assign zone-specific items to merchants
CREATE OR REPLACE FUNCTION assign_zone_specific_merchant_inventory()
RETURNS void AS $$
BEGIN
  -- Clear zone-specific merchant inventory
  DELETE FROM merchant_inventory WHERE zone_id IS NOT NULL;

  -- Havenbrook Village - Starter gear (Level 1-5)
  INSERT INTO merchant_inventory (item_id, zone_id, merchant_name, buy_price, merchant_tier, required_character_level)
  SELECT
    i.id,
    '00000000-0000-0000-0000-000000000001',
    CASE
      WHEN i.type = 'weapon' THEN 'Blacksmith Gerta'
      WHEN i.type = 'consumable' THEN 'Apothecary Finn'
      ELSE 'Merchant Aldric'
    END,
    GREATEST(i.sell_price * 1.5, 10)::int,
    1,
    i.required_level
  FROM items i
  WHERE i.required_level <= 5
    AND i.type IN ('weapon', 'armor', 'consumable')
    AND i.rarity IN ('common', 'uncommon');

  -- Whispering Woods - Forest materials and leather gear (Level 1-15)
  INSERT INTO merchant_inventory (item_id, zone_id, merchant_name, buy_price, merchant_tier, required_character_level)
  SELECT
    i.id,
    '00000000-0000-0000-0000-000000000002',
    CASE
      WHEN i.type = 'material' THEN 'Ranger Sylva'
      ELSE 'Wandering Trader Orin'
    END,
    GREATEST(i.sell_price * 1.3, 8)::int,
    1,
    i.required_level
  FROM items i
  WHERE (i.name ILIKE '%wood%' OR i.name ILIKE '%leather%' OR i.name ILIKE '%bow%' OR i.name ILIKE '%herb%')
    AND i.required_level <= 15;

  -- Ironpeak Foothills - Mountain gear and ores (Level 10-25)
  INSERT INTO merchant_inventory (item_id, zone_id, merchant_name, buy_price, merchant_tier, required_character_level)
  SELECT
    i.id,
    '00000000-0000-0000-0000-000000000003',
    CASE
      WHEN i.type = 'weapon' THEN 'Dwarf Merchant Thorin'
      WHEN i.type = 'material' THEN 'Gemcutter Mira'
      ELSE 'Dwarf Merchant Thorin'
    END,
    GREATEST(i.sell_price * 1.4, 15)::int,
    2,
    i.required_level
  FROM items i
  WHERE (i.name ILIKE '%iron%' OR i.name ILIKE '%steel%' OR i.name ILIKE '%mithril%' OR i.name ILIKE '%ore%' OR i.name ILIKE '%gem%')
    AND i.required_level BETWEEN 10 AND 25;

  -- Shadowfen Marsh - Dark/poison items (Level 20-35)
  INSERT INTO merchant_inventory (item_id, zone_id, merchant_name, buy_price, merchant_tier, required_character_level)
  SELECT
    i.id,
    '00000000-0000-0000-0000-000000000004',
    CASE
      WHEN i.type = 'consumable' THEN 'Swamp Witch Morgana'
      ELSE 'Scavenger Rask'
    END,
    GREATEST(i.sell_price * 1.6, 25)::int,
    3,
    i.required_level
  FROM items i
  WHERE i.required_level BETWEEN 20 AND 35
    AND i.rarity IN ('uncommon', 'rare');

  -- Emberpeak Mines - Fire gear and rare ores (Level 25-45)
  INSERT INTO merchant_inventory (item_id, zone_id, merchant_name, buy_price, merchant_tier, required_character_level)
  SELECT
    i.id,
    '00000000-0000-0000-0000-000000000005',
    CASE
      WHEN i.type = 'weapon' THEN 'Forgemaster Vulcan'
      WHEN i.type = 'material' THEN 'Ore Trader Krag'
      ELSE 'Forgemaster Vulcan'
    END,
    GREATEST(i.sell_price * 1.7, 50)::int,
    4,
    i.required_level
  FROM items i
  WHERE (i.name ILIKE '%adamant%' OR i.name ILIKE '%rune%' OR i.name ILIKE '%coal%')
    AND i.required_level BETWEEN 25 AND 45;

  -- Frostspire Mountains - Ice/frost gear (Level 40-55)
  INSERT INTO merchant_inventory (item_id, zone_id, merchant_name, buy_price, merchant_tier, required_character_level)
  SELECT
    i.id,
    '00000000-0000-0000-0000-000000000006',
    CASE
      WHEN i.type = 'consumable' THEN 'Mountain Hermit Bjorn'
      ELSE 'Ice Merchant Elara'
    END,
    GREATEST(i.sell_price * 2.0, 100)::int,
    5,
    i.required_level
  FROM items i
  WHERE i.required_level BETWEEN 40 AND 55
    AND i.rarity IN ('rare', 'epic');

  -- The Shattered Wastes - Legendary/cursed gear (Level 50+)
  INSERT INTO merchant_inventory (item_id, zone_id, merchant_name, buy_price, merchant_tier, required_character_level)
  SELECT
    i.id,
    '00000000-0000-0000-0000-000000000007',
    CASE
      WHEN i.type = 'weapon' THEN 'Soul Trader Vex'
      ELSE 'Demon Merchant Azrael'
    END,
    GREATEST(i.sell_price * 3.0, 500)::int,
    5,
    i.required_level
  FROM items i
  WHERE i.required_level >= 50
    AND i.rarity IN ('epic', 'legendary');

END;
$$ LANGUAGE plpgsql;

-- Function to assign zone-specific enemies
CREATE OR REPLACE FUNCTION assign_zone_specific_enemies()
RETURNS void AS $$
BEGIN
  -- Update existing enemies with zone associations
  UPDATE enemies SET zone_id = '00000000-0000-0000-0000-000000000002' WHERE required_player_level BETWEEN 1 AND 9;   -- Whispering Woods
  UPDATE enemies SET zone_id = '00000000-0000-0000-0000-000000000003' WHERE required_player_level BETWEEN 10 AND 19; -- Ironpeak Foothills
  UPDATE enemies SET zone_id = '00000000-0000-0000-0000-000000000004' WHERE required_player_level BETWEEN 20 AND 29; -- Shadowfen Marsh
  UPDATE enemies SET zone_id = '00000000-0000-0000-0000-000000000005' WHERE required_player_level BETWEEN 30 AND 39; -- Emberpeak Mines
  UPDATE enemies SET zone_id = '00000000-0000-0000-0000-000000000006' WHERE required_player_level BETWEEN 40 AND 49; -- Frostspire Mountains
  UPDATE enemies SET zone_id = '00000000-0000-0000-0000-000000000007' WHERE required_player_level >= 50;             -- The Shattered Wastes
END;
$$ LANGUAGE plpgsql;

-- Function to assign zone-specific materials
CREATE OR REPLACE FUNCTION assign_zone_specific_materials()
RETURNS void AS $$
BEGIN
  -- Update materials with zone associations based on tier/level
  UPDATE materials SET zone_id = '00000000-0000-0000-0000-000000000002' WHERE required_zone_level BETWEEN 1 AND 9;   -- Whispering Woods
  UPDATE materials SET zone_id = '00000000-0000-0000-0000-000000000003' WHERE required_zone_level BETWEEN 10 AND 19; -- Ironpeak Foothills
  UPDATE materials SET zone_id = '00000000-0000-0000-0000-000000000004' WHERE required_zone_level BETWEEN 20 AND 29; -- Shadowfen Marsh
  UPDATE materials SET zone_id = '00000000-0000-0000-0000-000000000005' WHERE required_zone_level BETWEEN 30 AND 39; -- Emberpeak Mines
  UPDATE materials SET zone_id = '00000000-0000-0000-0000-000000000006' WHERE required_zone_level BETWEEN 40 AND 49; -- Frostspire Mountains
  UPDATE materials SET zone_id = '00000000-0000-0000-0000-000000000007' WHERE required_zone_level >= 50;             -- The Shattered Wastes
END;
$$ LANGUAGE plpgsql;

-- Run the assignment functions
SELECT assign_zone_specific_merchant_inventory();
SELECT assign_zone_specific_enemies();
SELECT assign_zone_specific_materials();

COMMENT ON TABLE zone_merchants IS 'Unique merchants with personalities located in specific zones';
COMMENT ON TABLE zone_exclusive_items IS 'Items that are exclusive to specific zones';
COMMENT ON COLUMN merchant_inventory.zone_id IS 'Links merchant inventory to specific zones (NULL = global merchant)';
COMMENT ON COLUMN merchant_inventory.merchant_name IS 'Name of the specific merchant selling this item';
COMMENT ON COLUMN enemies.zone_id IS 'Links enemies to specific zones for immersive combat';
COMMENT ON COLUMN materials.zone_id IS 'Links materials to specific zones for zone-based gathering';
