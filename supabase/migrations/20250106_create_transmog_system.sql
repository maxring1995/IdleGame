-- Transmogrification System
-- Allows players to change the appearance of their equipment while keeping stats

CREATE TABLE IF NOT EXISTS transmogrifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  slot VARCHAR(50) NOT NULL, -- weapon, helmet, chest, etc.
  actual_item_id VARCHAR(100) NOT NULL REFERENCES items(id), -- item providing stats
  visual_item_id VARCHAR(100) NOT NULL REFERENCES items(id), -- item providing appearance
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(character_id, slot)
);

-- Transmog collection (unlocked appearances)
CREATE TABLE IF NOT EXISTS transmog_collection (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  item_id VARCHAR(100) NOT NULL REFERENCES items(id),
  unlocked_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(character_id, item_id)
);

-- Add indexes
CREATE INDEX idx_transmogrifications_character ON transmogrifications(character_id);
CREATE INDEX idx_transmog_collection_character ON transmog_collection(character_id);
CREATE INDEX idx_transmog_collection_item ON transmog_collection(item_id);

-- RLS policies
ALTER TABLE transmogrifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE transmog_collection ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own transmogs"
  ON transmogrifications FOR SELECT
  USING (character_id IN (
    SELECT id FROM characters WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can insert own transmogs"
  ON transmogrifications FOR INSERT
  WITH CHECK (character_id IN (
    SELECT id FROM characters WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can update own transmogs"
  ON transmogrifications FOR UPDATE
  USING (character_id IN (
    SELECT id FROM characters WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can delete own transmogs"
  ON transmogrifications FOR DELETE
  USING (character_id IN (
    SELECT id FROM characters WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can view own collection"
  ON transmog_collection FOR SELECT
  USING (character_id IN (
    SELECT id FROM characters WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can insert own collection"
  ON transmog_collection FOR INSERT
  WITH CHECK (character_id IN (
    SELECT id FROM characters WHERE user_id = auth.uid()
  ));

-- Function to unlock transmog appearance (costs gold based on rarity)
CREATE OR REPLACE FUNCTION unlock_transmog_appearance(char_id UUID, item_to_unlock VARCHAR(100))
RETURNS BOOLEAN AS $$
DECLARE
  current_gold INTEGER;
  item_rarity VARCHAR(50);
  unlock_cost INTEGER;
BEGIN
  -- Get item rarity
  SELECT rarity INTO item_rarity FROM items WHERE id = item_to_unlock;

  -- Calculate cost based on rarity
  unlock_cost := CASE item_rarity
    WHEN 'common' THEN 10
    WHEN 'uncommon' THEN 25
    WHEN 'rare' THEN 50
    WHEN 'epic' THEN 100
    WHEN 'legendary' THEN 250
    ELSE 10
  END;

  -- Get current gold
  SELECT gold INTO current_gold FROM characters WHERE id = char_id;

  -- Check if enough gold
  IF current_gold < unlock_cost THEN
    RAISE EXCEPTION 'Not enough gold. Need % gold.', unlock_cost;
  END IF;

  -- Check if already unlocked
  IF EXISTS (SELECT 1 FROM transmog_collection WHERE character_id = char_id AND item_id = item_to_unlock) THEN
    RAISE EXCEPTION 'Appearance already unlocked.';
  END IF;

  -- Deduct gold and unlock appearance
  UPDATE characters SET gold = gold - unlock_cost WHERE id = char_id;

  INSERT INTO transmog_collection (character_id, item_id)
  VALUES (char_id, item_to_unlock);

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to apply transmog (costs 5 gold per application)
CREATE OR REPLACE FUNCTION apply_transmog(char_id UUID, equip_slot VARCHAR(50), visual_item VARCHAR(100))
RETURNS BOOLEAN AS $$
DECLARE
  current_gold INTEGER;
  transmog_cost INTEGER := 5;
BEGIN
  -- Get current gold
  SELECT gold INTO current_gold FROM characters WHERE id = char_id;

  -- Check if enough gold
  IF current_gold < transmog_cost THEN
    RAISE EXCEPTION 'Not enough gold. Need % gold.', transmog_cost;
  END IF;

  -- Check if appearance is unlocked
  IF NOT EXISTS (SELECT 1 FROM transmog_collection WHERE character_id = char_id AND item_id = visual_item) THEN
    RAISE EXCEPTION 'Appearance not unlocked. Visit transmog vendor to unlock.';
  END IF;

  -- Deduct gold
  UPDATE characters SET gold = gold - transmog_cost WHERE id = char_id;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
