-- Fix Function Search Paths
-- Security hardening: Set explicit search_path on all functions to prevent schema poisoning attacks

-- Reference: https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable

-- Strategy: Use ALTER FUNCTION to set search_path without recreating functions
-- This is safer and preserves existing function logic

-- Trigger functions
ALTER FUNCTION update_updated_at_column() SET search_path = public, pg_temp;
ALTER FUNCTION cleanup_stale_combat() SET search_path = public, pg_temp;
ALTER FUNCTION auto_unlock_synergies() SET search_path = public, pg_temp;
ALTER FUNCTION grant_mastery_points() SET search_path = public, pg_temp;
ALTER FUNCTION track_gather_quest_progress() SET search_path = public, pg_temp;

-- Zone assignment functions
ALTER FUNCTION assign_zone_specific_merchant_inventory() SET search_path = public, pg_temp;
ALTER FUNCTION assign_zone_specific_enemies() SET search_path = public, pg_temp;
ALTER FUNCTION assign_zone_specific_materials() SET search_path = public, pg_temp;

-- Calculation functions
ALTER FUNCTION calculate_xp_for_level(INTEGER) SET search_path = public, pg_temp;
ALTER FUNCTION calculate_level_from_xp(BIGINT) SET search_path = public, pg_temp;

-- Synergy check function
ALTER FUNCTION check_synergy_unlock(UUID, TEXT) SET search_path = public, pg_temp;

-- Merchant seed function
ALTER FUNCTION seed_merchant_inventory() SET search_path = public, pg_temp;

-- Buff cleanup function (if exists - may have been created outside migrations)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'clean_expired_buffs'
  ) THEN
    EXECUTE 'ALTER FUNCTION clean_expired_buffs() SET search_path = public, pg_temp';
  END IF;
END $$;

-- What this does:
-- - Sets explicit search_path = public, pg_temp on all functions
-- - public: The schema where our tables live
-- - pg_temp: Temporary tables schema (required for some operations)
-- - This prevents attackers from creating malicious schemas that could intercept function calls

-- Why this matters:
-- - Without explicit search_path, functions use the caller's search_path
-- - Attackers could create fake schemas/tables to poison function behavior
-- - Setting search_path locks down the schema resolution

-- No functional changes to game logic - purely a security hardening measure
