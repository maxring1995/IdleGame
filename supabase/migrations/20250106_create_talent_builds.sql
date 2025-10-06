-- Talent Builds/Templates System
-- Allows players to save, load, and share talent builds

CREATE TABLE IF NOT EXISTS talent_builds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  class_id VARCHAR(50) NOT NULL REFERENCES classes(id),
  spec_type VARCHAR(50) NOT NULL, -- which tree this build focuses on
  talent_data JSONB NOT NULL, -- stores talent_id -> points_spent mapping
  is_active BOOLEAN DEFAULT false,
  is_public BOOLEAN DEFAULT false, -- allow sharing builds
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes
CREATE INDEX idx_talent_builds_character ON talent_builds(character_id);
CREATE INDEX idx_talent_builds_class ON talent_builds(class_id);
CREATE INDEX idx_talent_builds_public ON talent_builds(is_public);

-- RLS policies
ALTER TABLE talent_builds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own builds"
  ON talent_builds FOR SELECT
  USING (character_id IN (
    SELECT id FROM characters WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can view public builds"
  ON talent_builds FOR SELECT
  USING (is_public = true);

CREATE POLICY "Users can insert own builds"
  ON talent_builds FOR INSERT
  WITH CHECK (character_id IN (
    SELECT id FROM characters WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can update own builds"
  ON talent_builds FOR UPDATE
  USING (character_id IN (
    SELECT id FROM characters WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can delete own builds"
  ON talent_builds FOR DELETE
  USING (character_id IN (
    SELECT id FROM characters WHERE user_id = auth.uid()
  ));
