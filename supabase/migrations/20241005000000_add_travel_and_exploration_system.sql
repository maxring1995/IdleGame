-- Phase 5B: Travel & Exploration System
-- Create tables for active travel sessions, exploration sessions, and travel logs

-- Active Travels Table
CREATE TABLE IF NOT EXISTS active_travels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  from_zone_id UUID NOT NULL REFERENCES world_zones(id),
  to_zone_id UUID NOT NULL REFERENCES world_zones(id),
  connection_id UUID NOT NULL REFERENCES zone_connections(id),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  estimated_arrival TIMESTAMPTZ NOT NULL,
  actual_travel_time INTEGER NOT NULL, -- in seconds
  status TEXT NOT NULL DEFAULT 'traveling' CHECK (status IN ('traveling', 'encounter', 'completed')),
  can_cancel BOOLEAN NOT NULL DEFAULT true,
  encounter_rolled BOOLEAN NOT NULL DEFAULT false,
  encounter_type TEXT CHECK (encounter_type IN ('combat', 'loot', 'merchant', 'lore')),
  encounter_data JSONB,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(character_id) -- Only one active travel per character
);

-- Active Explorations Table
CREATE TABLE IF NOT EXISTS active_explorations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  zone_id UUID NOT NULL REFERENCES world_zones(id),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  exploration_progress INTEGER NOT NULL DEFAULT 0 CHECK (exploration_progress >= 0 AND exploration_progress <= 100),
  discoveries_found INTEGER NOT NULL DEFAULT 0,
  is_auto BOOLEAN NOT NULL DEFAULT false,
  auto_stop_at INTEGER CHECK (auto_stop_at >= 0 AND auto_stop_at <= 100),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(character_id) -- Only one active exploration per character
);

-- Travel Log Table
CREATE TABLE IF NOT EXISTS travel_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  zone_id UUID REFERENCES world_zones(id),
  entry_type TEXT NOT NULL CHECK (entry_type IN ('travel_started', 'travel_completed', 'travel_cancelled', 'encounter', 'exploration_started', 'exploration_completed', 'discovery')),
  entry_text TEXT NOT NULL,
  entry_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_active_travels_character ON active_travels(character_id);
CREATE INDEX IF NOT EXISTS idx_active_travels_status ON active_travels(status);
CREATE INDEX IF NOT EXISTS idx_active_explorations_character ON active_explorations(character_id);
CREATE INDEX IF NOT EXISTS idx_travel_log_character ON travel_log(character_id);
CREATE INDEX IF NOT EXISTS idx_travel_log_created ON travel_log(created_at DESC);

-- Enable Row Level Security
ALTER TABLE active_travels ENABLE ROW LEVEL SECURITY;
ALTER TABLE active_explorations ENABLE ROW LEVEL SECURITY;
ALTER TABLE travel_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for active_travels
CREATE POLICY "Users can view their own active travels"
  ON active_travels FOR SELECT
  USING (character_id IN (
    SELECT id FROM characters WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can create their own active travels"
  ON active_travels FOR INSERT
  WITH CHECK (character_id IN (
    SELECT id FROM characters WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can update their own active travels"
  ON active_travels FOR UPDATE
  USING (character_id IN (
    SELECT id FROM characters WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can delete their own active travels"
  ON active_travels FOR DELETE
  USING (character_id IN (
    SELECT id FROM characters WHERE user_id = auth.uid()
  ));

-- RLS Policies for active_explorations
CREATE POLICY "Users can view their own active explorations"
  ON active_explorations FOR SELECT
  USING (character_id IN (
    SELECT id FROM characters WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can create their own active explorations"
  ON active_explorations FOR INSERT
  WITH CHECK (character_id IN (
    SELECT id FROM characters WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can update their own active explorations"
  ON active_explorations FOR UPDATE
  USING (character_id IN (
    SELECT id FROM characters WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can delete their own active explorations"
  ON active_explorations FOR DELETE
  USING (character_id IN (
    SELECT id FROM characters WHERE user_id = auth.uid()
  ));

-- RLS Policies for travel_log
CREATE POLICY "Users can view their own travel log"
  ON travel_log FOR SELECT
  USING (character_id IN (
    SELECT id FROM characters WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can create their own travel log entries"
  ON travel_log FOR INSERT
  WITH CHECK (character_id IN (
    SELECT id FROM characters WHERE user_id = auth.uid()
  ));
