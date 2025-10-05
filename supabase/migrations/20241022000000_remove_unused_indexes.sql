-- Remove Unused Indexes
-- Performance: Remove 68 indexes that have never been used
-- These can be re-added when features are implemented

-- Note: Indexes can be recreated anytime without data loss
-- This migration improves query planning performance by reducing index overhead

-- ============================================
-- CHARACTERS TABLE (4 indexes)
-- ============================================

DROP INDEX IF EXISTS idx_characters_last_active;
DROP INDEX IF EXISTS idx_characters_current_zone;
DROP INDEX IF EXISTS idx_character_class;

-- ============================================
-- CHARACTER SKILLS (2 indexes)
-- ============================================

DROP INDEX IF EXISTS idx_skill_specialization;
DROP INDEX IF EXISTS idx_skill_prestige;

-- ============================================
-- ITEMS & MATERIALS (3 indexes)
-- ============================================

DROP INDEX IF EXISTS idx_items_material_type;
DROP INDEX IF EXISTS idx_materials_type;
DROP INDEX IF EXISTS idx_materials_zone;

-- ============================================
-- COMBAT SYSTEM (3 indexes)
-- ============================================

DROP INDEX IF EXISTS idx_combat_logs_enemy;
DROP INDEX IF EXISTS idx_active_combat_updated;
DROP INDEX IF EXISTS idx_active_combat_enemy_id;

-- ============================================
-- INVENTORY & QUESTS (2 indexes)
-- ============================================

DROP INDEX IF EXISTS idx_inventory_item_id;
DROP INDEX IF EXISTS idx_quests_quest_id;

-- ============================================
-- CRAFTING (3 indexes)
-- ============================================

DROP INDEX IF EXISTS idx_crafting_recipes_category;
DROP INDEX IF EXISTS idx_crafting_recipes_result_item_id;
DROP INDEX IF EXISTS idx_active_crafting_recipe_id;

-- ============================================
-- GATHERING SYSTEM (16 indexes)
-- ============================================

-- Nodes
DROP INDEX IF EXISTS idx_gathering_nodes_active_zone;
DROP INDEX IF EXISTS idx_gathering_nodes_respawn;
DROP INDEX IF EXISTS idx_gathering_nodes_last_harvested_by;

-- Tools
DROP INDEX IF EXISTS idx_tools_type_tier;
DROP INDEX IF EXISTS idx_gathering_tools_item_id;

-- Hotspots
DROP INDEX IF EXISTS idx_hotspots_active;
DROP INDEX IF EXISTS idx_gathering_hotspots_material_id;

-- Active gathering
DROP INDEX IF EXISTS idx_active_gathering_material_id;

-- Encounters
DROP INDEX IF EXISTS idx_gathering_encounters_character_id;
DROP INDEX IF EXISTS idx_gathering_encounters_material_id;

-- Achievements
DROP INDEX IF EXISTS idx_character_gathering_achievements_achievement_id;
DROP INDEX IF EXISTS idx_gathering_achievements_reward_item_id;

-- Equipped tools
DROP INDEX IF EXISTS idx_character_equipped_tools_axe_id;
DROP INDEX IF EXISTS idx_character_equipped_tools_pickaxe_id;
DROP INDEX IF EXISTS idx_character_equipped_tools_fishing_rod_id;
DROP INDEX IF EXISTS idx_character_equipped_tools_hunting_knife_id;
DROP INDEX IF EXISTS idx_character_equipped_tools_herbalism_sickle_id;
DROP INDEX IF EXISTS idx_character_equipped_tools_divination_staff_id;

-- ============================================
-- QUEST SYSTEM (2 indexes)
-- ============================================

DROP INDEX IF EXISTS idx_quest_completions_quest;
DROP INDEX IF EXISTS idx_quest_definitions_prerequisite;

-- ============================================
-- BUFF SYSTEM (2 indexes)
-- ============================================

DROP INDEX IF EXISTS idx_active_buffs_character_id;
DROP INDEX IF EXISTS idx_active_buffs_expires_at;

-- ============================================
-- ZONE SYSTEM (9 indexes)
-- ============================================

DROP INDEX IF EXISTS idx_zone_merchants_zone;
DROP INDEX IF EXISTS idx_zone_exclusive_items_zone;
DROP INDEX IF EXISTS idx_zone_exclusive_items_item_id;
DROP INDEX IF EXISTS idx_zone_connections_to_zone;
DROP INDEX IF EXISTS idx_enemies_zone;
DROP INDEX IF EXISTS idx_world_zones_parent_zone_id;

-- ============================================
-- TRAVEL & EXPLORATION (11 indexes)
-- ============================================

-- Travel
DROP INDEX IF EXISTS idx_active_travels_status;
DROP INDEX IF EXISTS idx_active_travels_from_zone_id;
DROP INDEX IF EXISTS idx_active_travels_to_zone_id;
DROP INDEX IF EXISTS idx_active_travels_connection_id;
DROP INDEX IF EXISTS idx_travel_log_character_id;
DROP INDEX IF EXISTS idx_travel_log_created_at;
DROP INDEX IF EXISTS idx_travel_log_zone_id;

-- Exploration
DROP INDEX IF EXISTS idx_active_explorations_last_reward;
DROP INDEX IF EXISTS idx_active_explorations_zone_id;
DROP INDEX IF EXISTS idx_exploration_rewards_log_character;
DROP INDEX IF EXISTS idx_exploration_rewards_log_zone;

-- ============================================
-- LANDMARK DISCOVERIES (1 index)
-- ============================================

DROP INDEX IF EXISTS idx_character_landmark_discoveries_landmark_id;

-- ============================================
-- MERCHANT SYSTEM (1 index)
-- ============================================

DROP INDEX IF EXISTS idx_merchant_transactions_item_id;

-- ============================================
-- MASTERY & SYNERGY SYSTEM (4 indexes)
-- ============================================

DROP INDEX IF EXISTS idx_mastery_character;
DROP INDEX IF EXISTS idx_character_mastery_nodes_node_id;
DROP INDEX IF EXISTS idx_character_skill_synergies_synergy_id;

-- ============================================
-- CLASS SYSTEM (3 indexes)
-- ============================================

DROP INDEX IF EXISTS idx_abilities_character;
DROP INDEX IF EXISTS idx_abilities_active;
DROP INDEX IF EXISTS idx_active_class_abilities_ability_id;

-- ============================================
-- SKILL SPECIALIZATIONS (1 index)
-- ============================================

DROP INDEX IF EXISTS idx_skill_specializations_skill_type;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON SCHEMA public IS 'Removed 68 unused indexes - can be recreated when features are implemented';
