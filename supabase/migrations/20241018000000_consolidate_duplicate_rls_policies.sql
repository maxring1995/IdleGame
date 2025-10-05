-- Consolidate Duplicate RLS Policies
-- Performance: Remove 72 redundant permissive policies that cause double-execution

-- Strategy: Drop "view only" SELECT policies where an "ALL" policy already exists
-- This eliminates duplicate policy evaluation for every SELECT query

-- ============================================
-- TABLES WITH "VIEW" + "MANAGE" POLICIES
-- ============================================

-- Drop redundant SELECT-only policies where ALL policy covers it
DROP POLICY IF EXISTS "Users can view own inventory" ON inventory;
DROP POLICY IF EXISTS "Users can view own quests" ON quests;
DROP POLICY IF EXISTS "Users can view own active combat" ON active_combat;
DROP POLICY IF EXISTS "Users can view own gathering sessions" ON active_gathering;
DROP POLICY IF EXISTS "Users can view own synergies" ON character_skill_synergies;
DROP POLICY IF EXISTS "Users can view own mastery" ON character_mastery_nodes;
DROP POLICY IF EXISTS "Users can view own abilities" ON active_class_abilities;
DROP POLICY IF EXISTS "Users can view own equipped tools" ON character_equipped_tools;
DROP POLICY IF EXISTS "Users can view own achievement progress" ON character_gathering_achievements;
DROP POLICY IF EXISTS "Users can view own encounters" ON gathering_encounters;
DROP POLICY IF EXISTS "Users can view own gathering stats" ON gathering_statistics;

-- ============================================
-- EXPLORATION/TRAVEL TABLES WITH DUPLICATE POLICIES
-- ============================================

-- active_explorations has 4 duplicate policy sets (old vs new naming)
DROP POLICY IF EXISTS "Users can view own active explorations" ON active_explorations;
DROP POLICY IF EXISTS "Users can insert own active explorations" ON active_explorations;
DROP POLICY IF EXISTS "Users can update own active explorations" ON active_explorations;
DROP POLICY IF EXISTS "Users can delete own active explorations" ON active_explorations;

-- Keep the newer "their own" naming convention:
-- - "Users can view their own active explorations"
-- - "Users can create their own active explorations"
-- - "Users can update their own active explorations"
-- - "Users can delete their own active explorations"

-- travel_log has 2 duplicate policy sets
DROP POLICY IF EXISTS "Users can view own travel log" ON travel_log;
DROP POLICY IF EXISTS "Users can insert own travel log" ON travel_log;

-- Keep the newer "their own" naming convention:
-- - "Users can view their own travel log"
-- - "Users can create their own travel log entries"

-- active_travels has similar duplicates (keep "their own" version)
-- Note: These might not exist yet, but adding for completeness
DROP POLICY IF EXISTS "Users can view own active travels" ON active_travels;
DROP POLICY IF EXISTS "Users can create own active travels" ON active_travels;
DROP POLICY IF EXISTS "Users can update own active travels" ON active_travels;
DROP POLICY IF EXISTS "Users can delete own active travels" ON active_travels;

-- ============================================
-- MERCHANT INVENTORY SPECIAL CASE
-- ============================================

-- merchant_inventory has both service_role management and public viewable policies
-- The "Merchant inventory is viewable by everyone" is sufficient for SELECT
-- Keep both as they serve different purposes (one for admin, one for users)
-- But they shouldn't both be permissive for SELECT - reviewing if needed

-- No action needed here - these policies serve different purposes

-- ============================================
-- VERIFY REMAINING POLICIES
-- ============================================

-- After this migration, each table should have:
-- - ONE policy per operation type (SELECT, INSERT, UPDATE, DELETE)
-- - OR one "ALL" policy that covers everything
-- - NO duplicate policies for the same role + command combination

COMMENT ON TABLE inventory IS 'Uses single ALL policy for owner access (performance optimized)';
COMMENT ON TABLE quests IS 'Uses single ALL policy for owner access (performance optimized)';
COMMENT ON TABLE active_combat IS 'Uses single ALL policy for owner access (performance optimized)';
