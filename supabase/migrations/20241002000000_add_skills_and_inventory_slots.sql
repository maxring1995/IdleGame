-- =====================================================
-- Eternal Realms - Skills and Inventory Slots
-- =====================================================

-- Add slot column to inventory table
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS slot INTEGER;

-- Create unique constraint for slots
CREATE UNIQUE INDEX IF NOT EXISTS idx_inventory_character_slot
  ON inventory(character_id, slot)
  WHERE slot IS NOT NULL;

-- =====================================================
-- CHARACTER SKILLS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS character_skills (
  character_id UUID REFERENCES characters(id) ON DELETE CASCADE NOT NULL,
  skill_type TEXT NOT NULL,
  level INTEGER DEFAULT 1,
  experience BIGINT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (character_id, skill_type)
);

-- RLS Policies for character_skills
ALTER TABLE character_skills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own skills"
  ON character_skills FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM characters
      WHERE characters.id = character_skills.character_id
      AND characters.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage own skills"
  ON character_skills FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM characters
      WHERE characters.id = character_skills.character_id
      AND characters.user_id = auth.uid()
    )
  );

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_skills_character ON character_skills(character_id);

-- =====================================================
-- ITEMS DEFINITIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS items (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('weapon', 'armor', 'consumable', 'material', 'quest')),
  rarity TEXT DEFAULT 'common' CHECK (rarity IN ('common', 'uncommon', 'rare', 'epic', 'legendary')),

  -- Equipment stats (NULL for non-equipment)
  attack_bonus INTEGER DEFAULT 0,
  defense_bonus INTEGER DEFAULT 0,
  health_bonus INTEGER DEFAULT 0,
  mana_bonus INTEGER DEFAULT 0,

  -- Equipment slot (NULL for non-equipment)
  equipment_slot TEXT CHECK (equipment_slot IN ('weapon', 'helmet', 'chest', 'legs', 'boots', 'gloves', 'ring', 'amulet')),

  -- Requirements
  required_level INTEGER DEFAULT 1,

  -- Value
  sell_price INTEGER DEFAULT 1,

  -- Metadata
  stackable BOOLEAN DEFAULT false,
  max_stack INTEGER DEFAULT 1,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert some starter items
INSERT INTO items (id, name, description, type, rarity, attack_bonus, equipment_slot, required_level, sell_price) VALUES
  ('wooden_sword', 'Wooden Sword', 'A simple wooden training sword', 'weapon', 'common', 5, 'weapon', 1, 10),
  ('iron_sword', 'Iron Sword', 'A sturdy iron blade', 'weapon', 'common', 12, 'weapon', 5, 50),
  ('steel_sword', 'Steel Sword', 'A well-crafted steel weapon', 'weapon', 'uncommon', 25, 'weapon', 10, 150)
ON CONFLICT (id) DO NOTHING;

INSERT INTO items (id, name, description, type, rarity, defense_bonus, equipment_slot, required_level, sell_price) VALUES
  ('leather_armor', 'Leather Armor', 'Basic leather protection', 'armor', 'common', 3, 'chest', 1, 15),
  ('iron_armor', 'Iron Armor', 'Solid iron plating', 'armor', 'common', 8, 'chest', 5, 75),
  ('steel_armor', 'Steel Armor', 'Heavy steel protection', 'armor', 'uncommon', 15, 'chest', 10, 200)
ON CONFLICT (id) DO NOTHING;

INSERT INTO items (id, name, description, type, rarity, stackable, max_stack, sell_price) VALUES
  ('health_potion', 'Health Potion', 'Restores 50 HP', 'consumable', 'common', true, 99, 25),
  ('mana_potion', 'Mana Potion', 'Restores 30 MP', 'consumable', 'common', true, 99, 20),
  ('gold_coin', 'Gold Coin', 'Currency of the realm', 'material', 'common', true, 999999, 1)
ON CONFLICT (id) DO NOTHING;

-- RLS for items (read-only for all authenticated users)
ALTER TABLE items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Items are viewable by everyone"
  ON items FOR SELECT
  USING (auth.role() = 'authenticated');

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_items_type ON items(type);
CREATE INDEX IF NOT EXISTS idx_items_rarity ON items(rarity);
CREATE INDEX IF NOT EXISTS idx_items_equipment_slot ON items(equipment_slot) WHERE equipment_slot IS NOT NULL;

-- =====================================================
-- UPDATE INVENTORY TABLE
-- =====================================================

-- Add item metadata columns
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS enchantment_level INTEGER DEFAULT 0;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS durability INTEGER DEFAULT 100;

-- Trigger to update updated_at on character_skills
CREATE TRIGGER update_character_skills_updated_at BEFORE UPDATE ON character_skills
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
