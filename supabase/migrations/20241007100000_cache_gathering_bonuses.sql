-- Add caching columns to active_gathering table to eliminate repeated bonus calculations
-- This prevents the need to recalculate zone modifiers, speed bonuses, etc. on every progress check

-- Add caching columns
ALTER TABLE active_gathering
ADD COLUMN IF NOT EXISTS cached_gathering_time_ms INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS cached_spawn_rate_modifier NUMERIC DEFAULT NULL,
ADD COLUMN IF NOT EXISTS cached_zone_xp_bonus NUMERIC DEFAULT NULL;

-- Add comment explaining the optimization
COMMENT ON COLUMN active_gathering.cached_gathering_time_ms IS 'Cached gathering time per unit (ms) with all bonuses applied. Prevents recalculating on every progress check.';
COMMENT ON COLUMN active_gathering.cached_spawn_rate_modifier IS 'Cached zone spawn rate modifier. Set when gathering starts.';
COMMENT ON COLUMN active_gathering.cached_zone_xp_bonus IS 'Cached zone XP bonus. Applied when collecting materials.';
