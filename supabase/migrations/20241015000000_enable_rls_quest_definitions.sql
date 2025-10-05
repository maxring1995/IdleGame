-- Enable RLS on quest_definitions table
-- Security fix: quest_definitions was exposed without RLS protection

-- Enable RLS
ALTER TABLE quest_definitions ENABLE ROW LEVEL SECURITY;

-- Policy: Allow all authenticated users to read quest definitions
-- Quest definitions are game content that all players should be able to see
CREATE POLICY "Quest definitions are viewable by all authenticated users"
  ON quest_definitions
  FOR SELECT
  TO authenticated
  USING (true);

-- No INSERT/UPDATE/DELETE policies for players
-- Quest definitions should only be modified via migrations or admin tools
-- This prevents players from tampering with quest data

-- Add comment for documentation
COMMENT ON TABLE quest_definitions IS 'Quest catalog - read-only for players, managed via migrations';
