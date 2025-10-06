-- Dual Specialization System
-- Allows players to switch between two talent specializations

-- Add dual spec columns to characters
ALTER TABLE characters
ADD COLUMN IF NOT EXISTS active_spec INTEGER DEFAULT 1 CHECK (active_spec IN (1, 2)),
ADD COLUMN IF NOT EXISTS spec_1_name VARCHAR(50) DEFAULT 'Primary',
ADD COLUMN IF NOT EXISTS spec_2_name VARCHAR(50) DEFAULT 'Secondary',
ADD COLUMN IF NOT EXISTS dual_spec_unlocked BOOLEAN DEFAULT false;

-- Create table to store talent points for each spec
CREATE TABLE IF NOT EXISTS character_talents_spec (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  spec_number INTEGER NOT NULL CHECK (spec_number IN (1, 2)),
  talent_id UUID NOT NULL REFERENCES talent_nodes(id) ON DELETE CASCADE,
  points_spent INTEGER NOT NULL DEFAULT 1,
  learned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(character_id, spec_number, talent_id)
);

-- Add indexes
CREATE INDEX idx_character_talents_spec_character ON character_talents_spec(character_id);
CREATE INDEX idx_character_talents_spec_spec ON character_talents_spec(spec_number);
CREATE INDEX idx_character_talents_spec_talent ON character_talents_spec(talent_id);

-- RLS policies
ALTER TABLE character_talents_spec ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own spec talents"
  ON character_talents_spec FOR SELECT
  USING (character_id IN (
    SELECT id FROM characters WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can insert own spec talents"
  ON character_talents_spec FOR INSERT
  WITH CHECK (character_id IN (
    SELECT id FROM characters WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can update own spec talents"
  ON character_talents_spec FOR UPDATE
  USING (character_id IN (
    SELECT id FROM characters WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can delete own spec talents"
  ON character_talents_spec FOR DELETE
  USING (character_id IN (
    SELECT id FROM characters WHERE user_id = auth.uid()
  ));

-- Function to unlock dual spec (costs 1000 gold)
CREATE OR REPLACE FUNCTION unlock_dual_spec(char_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  current_gold INTEGER;
  dual_spec_cost INTEGER := 1000;
BEGIN
  -- Get current gold
  SELECT gold INTO current_gold FROM characters WHERE id = char_id;

  -- Check if enough gold
  IF current_gold < dual_spec_cost THEN
    RAISE EXCEPTION 'Not enough gold. Need % gold.', dual_spec_cost;
  END IF;

  -- Deduct gold and unlock dual spec
  UPDATE characters
  SET gold = gold - dual_spec_cost,
      dual_spec_unlocked = true
  WHERE id = char_id;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
