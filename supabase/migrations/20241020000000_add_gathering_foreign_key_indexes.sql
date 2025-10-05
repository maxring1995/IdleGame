-- Add Missing Foreign Key Indexes for Gathering System
-- Performance: Add 13 missing foreign key indexes that can impact JOIN performance

-- ============================================
-- CHARACTER_EQUIPPED_TOOLS TABLE (6 indexes)
-- ============================================
-- This table has 6 tool slots, each referencing inventory items

CREATE INDEX IF NOT EXISTS idx_character_equipped_tools_axe_id
  ON character_equipped_tools(axe_id);

CREATE INDEX IF NOT EXISTS idx_character_equipped_tools_pickaxe_id
  ON character_equipped_tools(pickaxe_id);

CREATE INDEX IF NOT EXISTS idx_character_equipped_tools_fishing_rod_id
  ON character_equipped_tools(fishing_rod_id);

CREATE INDEX IF NOT EXISTS idx_character_equipped_tools_hunting_knife_id
  ON character_equipped_tools(hunting_knife_id);

CREATE INDEX IF NOT EXISTS idx_character_equipped_tools_herbalism_sickle_id
  ON character_equipped_tools(herbalism_sickle_id);

CREATE INDEX IF NOT EXISTS idx_character_equipped_tools_divination_staff_id
  ON character_equipped_tools(divination_staff_id);

-- ============================================
-- CHARACTER_GATHERING_ACHIEVEMENTS TABLE
-- ============================================
-- Character's progress on gathering achievements

CREATE INDEX IF NOT EXISTS idx_character_gathering_achievements_achievement_id
  ON character_gathering_achievements(achievement_id);

-- ============================================
-- GATHERING_ACHIEVEMENTS TABLE
-- ============================================
-- Achievement definitions with item rewards

CREATE INDEX IF NOT EXISTS idx_gathering_achievements_reward_item_id
  ON gathering_achievements(reward_item_id);

-- ============================================
-- GATHERING_ENCOUNTERS TABLE
-- ============================================
-- Random encounters while gathering

CREATE INDEX IF NOT EXISTS idx_gathering_encounters_character_id
  ON gathering_encounters(character_id);

CREATE INDEX IF NOT EXISTS idx_gathering_encounters_material_id
  ON gathering_encounters(material_id);

-- ============================================
-- GATHERING_HOTSPOTS TABLE
-- ============================================
-- Special high-yield gathering locations

CREATE INDEX IF NOT EXISTS idx_gathering_hotspots_material_id
  ON gathering_hotspots(material_id);

-- ============================================
-- GATHERING_NODES TABLE
-- ============================================
-- World resource nodes with respawn tracking

CREATE INDEX IF NOT EXISTS idx_gathering_nodes_last_harvested_by
  ON gathering_nodes(last_harvested_by);

-- ============================================
-- GATHERING_TOOLS TABLE
-- ============================================
-- Tool definitions that link to inventory items

CREATE INDEX IF NOT EXISTS idx_gathering_tools_item_id
  ON gathering_tools(item_id);

-- ============================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================

COMMENT ON INDEX idx_character_equipped_tools_axe_id IS 'Index on axe_id for tool lookups';
COMMENT ON INDEX idx_character_equipped_tools_pickaxe_id IS 'Index on pickaxe_id for tool lookups';
COMMENT ON INDEX idx_character_equipped_tools_fishing_rod_id IS 'Index on fishing_rod_id for tool lookups';
COMMENT ON INDEX idx_character_equipped_tools_hunting_knife_id IS 'Index on hunting_knife_id for tool lookups';
COMMENT ON INDEX idx_character_equipped_tools_herbalism_sickle_id IS 'Index on herbalism_sickle_id for tool lookups';
COMMENT ON INDEX idx_character_equipped_tools_divination_staff_id IS 'Index on divination_staff_id for tool lookups';
COMMENT ON INDEX idx_character_gathering_achievements_achievement_id IS 'Index on achievement_id for progress queries';
COMMENT ON INDEX idx_gathering_achievements_reward_item_id IS 'Index on reward_item_id for reward lookups';
COMMENT ON INDEX idx_gathering_encounters_character_id IS 'Index on character_id for encounter history';
COMMENT ON INDEX idx_gathering_encounters_material_id IS 'Index on material_id for encounter filtering';
COMMENT ON INDEX idx_gathering_hotspots_material_id IS 'Index on material_id for hotspot queries';
COMMENT ON INDEX idx_gathering_nodes_last_harvested_by IS 'Index on last_harvested_by for tracking';
COMMENT ON INDEX idx_gathering_tools_item_id IS 'Index on item_id for tool item joins';
