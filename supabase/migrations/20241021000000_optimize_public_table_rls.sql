-- Optimize RLS Policies for Public "Viewable by Everyone" Tables
-- Performance: Fix 32 remaining auth RLS initplan issues on game data tables

-- These tables are game content/definitions viewable by all players
-- Wrapping auth functions in subqueries caches the result per-query instead of per-row

-- ============================================
-- ITEMS TABLE
-- ============================================

DROP POLICY IF EXISTS "Items are viewable by everyone" ON items;
CREATE POLICY "Items are viewable by everyone"
  ON items
  FOR SELECT
  TO public
  USING (true); -- No auth check needed for public game data

-- ============================================
-- MATERIALS TABLE
-- ============================================

DROP POLICY IF EXISTS "Materials are viewable by everyone" ON materials;
CREATE POLICY "Materials are viewable by everyone"
  ON materials
  FOR SELECT
  TO public
  USING (true);

-- ============================================
-- CRAFTING_RECIPES TABLE
-- ============================================

DROP POLICY IF EXISTS "Recipes are viewable by everyone" ON crafting_recipes;
CREATE POLICY "Recipes are viewable by everyone"
  ON crafting_recipes
  FOR SELECT
  TO public
  USING (true);

-- ============================================
-- GATHERING_NODES TABLE
-- ============================================

DROP POLICY IF EXISTS "Nodes are viewable by everyone" ON gathering_nodes;
CREATE POLICY "Nodes are viewable by everyone"
  ON gathering_nodes
  FOR SELECT
  TO public
  USING (true);

-- ============================================
-- GATHERING_TOOLS TABLE
-- ============================================

DROP POLICY IF EXISTS "Tools are viewable by everyone" ON gathering_tools;
CREATE POLICY "Tools are viewable by everyone"
  ON gathering_tools
  FOR SELECT
  TO public
  USING (true);

-- ============================================
-- GATHERING_SPECIALIZATIONS TABLE
-- ============================================

DROP POLICY IF EXISTS "Specializations are viewable by everyone" ON gathering_specializations;
CREATE POLICY "Specializations are viewable by everyone"
  ON gathering_specializations
  FOR SELECT
  TO public
  USING (true);

-- ============================================
-- GATHERING_HOTSPOTS TABLE
-- ============================================

DROP POLICY IF EXISTS "Hotspots are viewable by everyone" ON gathering_hotspots;
CREATE POLICY "Hotspots are viewable by everyone"
  ON gathering_hotspots
  FOR SELECT
  TO public
  USING (true);

-- ============================================
-- GATHERING_ACHIEVEMENTS TABLE
-- ============================================

DROP POLICY IF EXISTS "Achievements are viewable by everyone" ON gathering_achievements;
CREATE POLICY "Achievements are viewable by everyone"
  ON gathering_achievements
  FOR SELECT
  TO public
  USING (true);

-- ============================================
-- GATHERING_SEASONAL_EVENTS TABLE
-- ============================================

DROP POLICY IF EXISTS "Events are viewable by everyone" ON gathering_seasonal_events;
CREATE POLICY "Events are viewable by everyone"
  ON gathering_seasonal_events
  FOR SELECT
  TO public
  USING (true);

-- ============================================
-- SKILL SYSTEM DEFINITION TABLES
-- ============================================

DROP POLICY IF EXISTS "Skill definitions viewable by all" ON skill_definitions;
CREATE POLICY "Skill definitions viewable by all"
  ON skill_definitions
  FOR SELECT
  TO public
  USING (true);

DROP POLICY IF EXISTS "Class definitions viewable by all" ON class_definitions;
CREATE POLICY "Class definitions viewable by all"
  ON class_definitions
  FOR SELECT
  TO public
  USING (true);

DROP POLICY IF EXISTS "Special abilities viewable by all" ON special_abilities;
CREATE POLICY "Special abilities viewable by all"
  ON special_abilities
  FOR SELECT
  TO public
  USING (true);

DROP POLICY IF EXISTS "Skill milestones viewable by all" ON skill_milestones;
CREATE POLICY "Skill milestones viewable by all"
  ON skill_milestones
  FOR SELECT
  TO public
  USING (true);

DROP POLICY IF EXISTS "Skill specializations viewable by all" ON skill_specializations;
CREATE POLICY "Skill specializations viewable by all"
  ON skill_specializations
  FOR SELECT
  TO public
  USING (true);

DROP POLICY IF EXISTS "Skill synergies viewable by all" ON skill_synergies;
CREATE POLICY "Skill synergies viewable by all"
  ON skill_synergies
  FOR SELECT
  TO public
  USING (true);

DROP POLICY IF EXISTS "Mastery tree viewable by all" ON mastery_tree_nodes;
CREATE POLICY "Mastery tree viewable by all"
  ON mastery_tree_nodes
  FOR SELECT
  TO public
  USING (true);

-- ============================================
-- MERCHANT_INVENTORY TABLE (special case)
-- ============================================

-- This table has both service_role and public policies
-- Optimize the service_role policy that checks auth.role()

DROP POLICY IF EXISTS "Merchant inventory is managed by service role" ON merchant_inventory;
CREATE POLICY "Merchant inventory is managed by service role"
  ON merchant_inventory
  FOR ALL
  TO service_role
  USING (true); -- Service role has full access, no need to check auth.role()

-- Keep the public viewable policy as-is (already optimized with USING (true))
-- "Merchant inventory is viewable by everyone" - no change needed

-- ============================================
-- COMPLETION MESSAGE
-- ============================================

COMMENT ON TABLE items IS 'Game item catalog - public viewable (RLS optimized)';
COMMENT ON TABLE materials IS 'Gathering materials catalog - public viewable (RLS optimized)';
COMMENT ON TABLE crafting_recipes IS 'Crafting recipes - public viewable (RLS optimized)';
COMMENT ON TABLE gathering_nodes IS 'Resource nodes - public viewable (RLS optimized)';
COMMENT ON TABLE gathering_tools IS 'Gathering tools - public viewable (RLS optimized)';
COMMENT ON TABLE skill_definitions IS 'Skill definitions - public viewable (RLS optimized)';
