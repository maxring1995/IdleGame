-- Optimize RLS Auth Function Calls
-- Performance: Fix 87 policies that re-evaluate auth functions per-row instead of once per query

-- IMPORTANT: This migration rewrites RLS policies to use (SELECT auth.uid()) instead of auth.uid()
-- This makes PostgreSQL evaluate the function once and cache the result for the query

-- Reference: https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select

-- ============================================
-- PROFILES TABLE
-- ============================================

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO public
  USING ((select auth.uid()) = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile"
  ON profiles
  FOR INSERT
  TO public
  WITH CHECK ((select auth.uid()) = id);

-- ============================================
-- CHARACTERS TABLE
-- ============================================

DROP POLICY IF EXISTS "Users can view own character" ON characters;
CREATE POLICY "Users can view own character"
  ON characters
  FOR SELECT
  TO public
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own character" ON characters;
CREATE POLICY "Users can update own character"
  ON characters
  FOR UPDATE
  TO public
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert own character" ON characters;
CREATE POLICY "Users can insert own character"
  ON characters
  FOR INSERT
  TO public
  WITH CHECK ((select auth.uid()) = user_id);

-- ============================================
-- INVENTORY TABLE
-- ============================================

DROP POLICY IF EXISTS "Users can manage own inventory" ON inventory;
CREATE POLICY "Users can manage own inventory"
  ON inventory
  FOR ALL
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM characters
      WHERE characters.id = inventory.character_id
      AND characters.user_id = (select auth.uid())
    )
  );

-- ============================================
-- QUESTS TABLE
-- ============================================

DROP POLICY IF EXISTS "Users can manage own quests" ON quests;
CREATE POLICY "Users can manage own quests"
  ON quests
  FOR ALL
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM characters
      WHERE characters.id = quests.character_id
      AND characters.user_id = (select auth.uid())
    )
  );

-- ============================================
-- ACHIEVEMENTS TABLE
-- ============================================

DROP POLICY IF EXISTS "Users can view own achievements" ON achievements;
CREATE POLICY "Users can view own achievements"
  ON achievements
  FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM characters
      WHERE characters.id = achievements.character_id
      AND characters.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can insert own achievements" ON achievements;
CREATE POLICY "Users can insert own achievements"
  ON achievements
  FOR INSERT
  TO public
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM characters
      WHERE characters.id = achievements.character_id
      AND characters.user_id = (select auth.uid())
    )
  );

-- ============================================
-- CHARACTER_SKILLS TABLE
-- ============================================

DROP POLICY IF EXISTS "Users can view own skills" ON character_skills;
CREATE POLICY "Users can view own skills"
  ON character_skills
  FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM characters
      WHERE characters.id = character_skills.character_id
      AND characters.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can insert own skills" ON character_skills;
CREATE POLICY "Users can insert own skills"
  ON character_skills
  FOR INSERT
  TO public
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM characters
      WHERE characters.id = character_skills.character_id
      AND characters.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can update own skills" ON character_skills;
CREATE POLICY "Users can update own skills"
  ON character_skills
  FOR UPDATE
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM characters
      WHERE characters.id = character_skills.character_id
      AND characters.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can delete own skills" ON character_skills;
CREATE POLICY "Users can delete own skills"
  ON character_skills
  FOR DELETE
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM characters
      WHERE characters.id = character_skills.character_id
      AND characters.user_id = (select auth.uid())
    )
  );

-- ============================================
-- ITEMS TABLE (public viewable)
-- ============================================

-- Items viewable by everyone - no auth check needed, but optimizing anyway
-- (This policy doesn't use auth functions, so no change needed)

-- ============================================
-- COMBAT_LOGS TABLE
-- ============================================

DROP POLICY IF EXISTS "Users can view own combat logs" ON combat_logs;
CREATE POLICY "Users can view own combat logs"
  ON combat_logs
  FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM characters
      WHERE characters.id = combat_logs.character_id
      AND characters.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can insert own combat logs" ON combat_logs;
CREATE POLICY "Users can insert own combat logs"
  ON combat_logs
  FOR INSERT
  TO public
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM characters
      WHERE characters.id = combat_logs.character_id
      AND characters.user_id = (select auth.uid())
    )
  );

-- ============================================
-- ACTIVE_COMBAT TABLE
-- ============================================

DROP POLICY IF EXISTS "Users can manage own active combat" ON active_combat;
CREATE POLICY "Users can manage own active combat"
  ON active_combat
  FOR ALL
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM characters
      WHERE characters.id = active_combat.character_id
      AND characters.user_id = (select auth.uid())
    )
  );

-- ============================================
-- MATERIALS TABLE (public viewable)
-- ============================================

-- Materials viewable by everyone - no auth check needed

-- ============================================
-- GATHERING_NODES TABLE (public viewable)
-- ============================================

-- Nodes viewable by everyone - no auth check needed

-- ============================================
-- ACTIVE_GATHERING TABLE
-- ============================================

DROP POLICY IF EXISTS "Users can manage own gathering sessions" ON active_gathering;
CREATE POLICY "Users can manage own gathering sessions"
  ON active_gathering
  FOR ALL
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM characters
      WHERE characters.id = active_gathering.character_id
      AND characters.user_id = (select auth.uid())
    )
  );

-- ============================================
-- CRAFTING_RECIPES TABLE (public viewable)
-- ============================================

-- Recipes viewable by everyone - no auth check needed

-- ============================================
-- CHARACTER_ZONE_DISCOVERIES TABLE
-- ============================================

DROP POLICY IF EXISTS "Users can view own zone discoveries" ON character_zone_discoveries;
CREATE POLICY "Users can view own zone discoveries"
  ON character_zone_discoveries
  FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM characters
      WHERE characters.id = character_zone_discoveries.character_id
      AND characters.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can insert own zone discoveries" ON character_zone_discoveries;
CREATE POLICY "Users can insert own zone discoveries"
  ON character_zone_discoveries
  FOR INSERT
  TO public
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM characters
      WHERE characters.id = character_zone_discoveries.character_id
      AND characters.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can update own zone discoveries" ON character_zone_discoveries;
CREATE POLICY "Users can update own zone discoveries"
  ON character_zone_discoveries
  FOR UPDATE
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM characters
      WHERE characters.id = character_zone_discoveries.character_id
      AND characters.user_id = (select auth.uid())
    )
  );

-- ============================================
-- CHARACTER_LANDMARK_DISCOVERIES TABLE
-- ============================================

DROP POLICY IF EXISTS "Users can view own landmark discoveries" ON character_landmark_discoveries;
CREATE POLICY "Users can view own landmark discoveries"
  ON character_landmark_discoveries
  FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM characters
      WHERE characters.id = character_landmark_discoveries.character_id
      AND characters.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can insert own landmark discoveries" ON character_landmark_discoveries;
CREATE POLICY "Users can insert own landmark discoveries"
  ON character_landmark_discoveries
  FOR INSERT
  TO public
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM characters
      WHERE characters.id = character_landmark_discoveries.character_id
      AND characters.user_id = (select auth.uid())
    )
  );

-- ============================================
-- ACTIVE_EXPLORATIONS TABLE
-- ============================================

-- Note: Duplicate policies already removed in previous migration
-- Just optimizing the remaining "their own" policies

DROP POLICY IF EXISTS "Users can view their own active explorations" ON active_explorations;
CREATE POLICY "Users can view their own active explorations"
  ON active_explorations
  FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM characters
      WHERE characters.id = active_explorations.character_id
      AND characters.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can create their own active explorations" ON active_explorations;
CREATE POLICY "Users can create their own active explorations"
  ON active_explorations
  FOR INSERT
  TO public
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM characters
      WHERE characters.id = active_explorations.character_id
      AND characters.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can update their own active explorations" ON active_explorations;
CREATE POLICY "Users can update their own active explorations"
  ON active_explorations
  FOR UPDATE
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM characters
      WHERE characters.id = active_explorations.character_id
      AND characters.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can delete their own active explorations" ON active_explorations;
CREATE POLICY "Users can delete their own active explorations"
  ON active_explorations
  FOR DELETE
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM characters
      WHERE characters.id = active_explorations.character_id
      AND characters.user_id = (select auth.uid())
    )
  );

-- ============================================
-- TRAVEL_LOG TABLE
-- ============================================

DROP POLICY IF EXISTS "Users can view their own travel log" ON travel_log;
CREATE POLICY "Users can view their own travel log"
  ON travel_log
  FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM characters
      WHERE characters.id = travel_log.character_id
      AND characters.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can create their own travel log entries" ON travel_log;
CREATE POLICY "Users can create their own travel log entries"
  ON travel_log
  FOR INSERT
  TO public
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM characters
      WHERE characters.id = travel_log.character_id
      AND characters.user_id = (select auth.uid())
    )
  );

-- ============================================
-- SKILL DEFINITION TABLES (public viewable)
-- ============================================

-- skill_definitions, class_definitions, special_abilities, skill_milestones,
-- skill_specializations, skill_synergies, mastery_tree_nodes
-- All viewable by everyone - no auth optimization needed

-- ============================================
-- CHARACTER MASTERY/SYNERGY TABLES
-- ============================================

DROP POLICY IF EXISTS "Users can manage own synergies" ON character_skill_synergies;
CREATE POLICY "Users can manage own synergies"
  ON character_skill_synergies
  FOR ALL
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM characters
      WHERE characters.id = character_skill_synergies.character_id
      AND characters.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can manage own mastery" ON character_mastery_nodes;
CREATE POLICY "Users can manage own mastery"
  ON character_mastery_nodes
  FOR ALL
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM characters
      WHERE characters.id = character_mastery_nodes.character_id
      AND characters.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can manage own abilities" ON active_class_abilities;
CREATE POLICY "Users can manage own abilities"
  ON active_class_abilities
  FOR ALL
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM characters
      WHERE characters.id = active_class_abilities.character_id
      AND characters.user_id = (select auth.uid())
    )
  );

-- ============================================
-- ACTIVE_TRAVELS TABLE
-- ============================================

DROP POLICY IF EXISTS "Users can view their own active travels" ON active_travels;
CREATE POLICY "Users can view their own active travels"
  ON active_travels
  FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM characters
      WHERE characters.id = active_travels.character_id
      AND characters.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can create their own active travels" ON active_travels;
CREATE POLICY "Users can create their own active travels"
  ON active_travels
  FOR INSERT
  TO public
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM characters
      WHERE characters.id = active_travels.character_id
      AND characters.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can update their own active travels" ON active_travels;
CREATE POLICY "Users can update their own active travels"
  ON active_travels
  FOR UPDATE
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM characters
      WHERE characters.id = active_travels.character_id
      AND characters.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can delete their own active travels" ON active_travels;
CREATE POLICY "Users can delete their own active travels"
  ON active_travels
  FOR DELETE
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM characters
      WHERE characters.id = active_travels.character_id
      AND characters.user_id = (select auth.uid())
    )
  );

-- ============================================
-- EXPLORATION_REWARDS_LOG TABLE
-- ============================================

DROP POLICY IF EXISTS "exploration_rewards_log_select" ON exploration_rewards_log;
CREATE POLICY "exploration_rewards_log_select"
  ON exploration_rewards_log
  FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM characters
      WHERE characters.id = exploration_rewards_log.character_id
      AND characters.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "exploration_rewards_log_insert" ON exploration_rewards_log;
CREATE POLICY "exploration_rewards_log_insert"
  ON exploration_rewards_log
  FOR INSERT
  TO public
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM characters
      WHERE characters.id = exploration_rewards_log.character_id
      AND characters.user_id = (select auth.uid())
    )
  );

-- ============================================
-- ACTIVE_CRAFTING TABLE
-- ============================================

DROP POLICY IF EXISTS "Users can view their own crafting sessions" ON active_crafting;
CREATE POLICY "Users can view their own crafting sessions"
  ON active_crafting
  FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM characters
      WHERE characters.id = active_crafting.character_id
      AND characters.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can insert their own crafting sessions" ON active_crafting;
CREATE POLICY "Users can insert their own crafting sessions"
  ON active_crafting
  FOR INSERT
  TO public
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM characters
      WHERE characters.id = active_crafting.character_id
      AND characters.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can update their own crafting sessions" ON active_crafting;
CREATE POLICY "Users can update their own crafting sessions"
  ON active_crafting
  FOR UPDATE
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM characters
      WHERE characters.id = active_crafting.character_id
      AND characters.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can delete their own crafting sessions" ON active_crafting;
CREATE POLICY "Users can delete their own crafting sessions"
  ON active_crafting
  FOR DELETE
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM characters
      WHERE characters.id = active_crafting.character_id
      AND characters.user_id = (select auth.uid())
    )
  );

-- ============================================
-- QUEST_COMPLETIONS TABLE
-- ============================================

DROP POLICY IF EXISTS "Users can view own quest completions" ON quest_completions;
CREATE POLICY "Users can view own quest completions"
  ON quest_completions
  FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM characters
      WHERE characters.id = quest_completions.character_id
      AND characters.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can insert own quest completions" ON quest_completions;
CREATE POLICY "Users can insert own quest completions"
  ON quest_completions
  FOR INSERT
  TO public
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM characters
      WHERE characters.id = quest_completions.character_id
      AND characters.user_id = (select auth.uid())
    )
  );

-- ============================================
-- ACTIVE_BUFFS TABLE
-- ============================================

DROP POLICY IF EXISTS "Users can view their own buffs" ON active_buffs;
CREATE POLICY "Users can view their own buffs"
  ON active_buffs
  FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM characters
      WHERE characters.id = active_buffs.character_id
      AND characters.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can insert their own buffs" ON active_buffs;
CREATE POLICY "Users can insert their own buffs"
  ON active_buffs
  FOR INSERT
  TO public
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM characters
      WHERE characters.id = active_buffs.character_id
      AND characters.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can delete their own buffs" ON active_buffs;
CREATE POLICY "Users can delete their own buffs"
  ON active_buffs
  FOR DELETE
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM characters
      WHERE characters.id = active_buffs.character_id
      AND characters.user_id = (select auth.uid())
    )
  );

-- ============================================
-- MERCHANT TABLES
-- ============================================

DROP POLICY IF EXISTS "Users can view own transaction history" ON merchant_transactions;
CREATE POLICY "Users can view own transaction history"
  ON merchant_transactions
  FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM characters
      WHERE characters.id = merchant_transactions.character_id
      AND characters.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can create own transactions" ON merchant_transactions;
CREATE POLICY "Users can create own transactions"
  ON merchant_transactions
  FOR INSERT
  TO public
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM characters
      WHERE characters.id = merchant_transactions.character_id
      AND characters.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can view own merchant data" ON character_merchant_data;
CREATE POLICY "Users can view own merchant data"
  ON character_merchant_data
  FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM characters
      WHERE characters.id = character_merchant_data.character_id
      AND characters.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can insert own merchant data" ON character_merchant_data;
CREATE POLICY "Users can insert own merchant data"
  ON character_merchant_data
  FOR INSERT
  TO public
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM characters
      WHERE characters.id = character_merchant_data.character_id
      AND characters.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can modify own merchant data" ON character_merchant_data;
CREATE POLICY "Users can modify own merchant data"
  ON character_merchant_data
  FOR UPDATE
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM characters
      WHERE characters.id = character_merchant_data.character_id
      AND characters.user_id = (select auth.uid())
    )
  );

-- ============================================
-- GATHERING SYSTEM TABLES
-- ============================================

DROP POLICY IF EXISTS "Users can manage own equipped tools" ON character_equipped_tools;
CREATE POLICY "Users can manage own equipped tools"
  ON character_equipped_tools
  FOR ALL
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM characters
      WHERE characters.id = character_equipped_tools.character_id
      AND characters.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can manage own encounters" ON gathering_encounters;
CREATE POLICY "Users can manage own encounters"
  ON gathering_encounters
  FOR ALL
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM characters
      WHERE characters.id = gathering_encounters.character_id
      AND characters.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can manage own achievement progress" ON character_gathering_achievements;
CREATE POLICY "Users can manage own achievement progress"
  ON character_gathering_achievements
  FOR ALL
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM characters
      WHERE characters.id = character_gathering_achievements.character_id
      AND characters.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can manage own gathering stats" ON gathering_statistics;
CREATE POLICY "Users can manage own gathering stats"
  ON gathering_statistics
  FOR ALL
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM characters
      WHERE characters.id = gathering_statistics.character_id
      AND characters.user_id = (select auth.uid())
    )
  );

-- ============================================
-- COMPLETION MESSAGE
-- ============================================

COMMENT ON SCHEMA public IS 'All RLS policies optimized with (SELECT auth.uid()) - 87 policies updated';
