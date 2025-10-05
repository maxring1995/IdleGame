-- Add Missing Foreign Key Indexes
-- Performance optimization: Add indexes to foreign key columns to improve JOIN performance

-- CRITICAL: High-traffic tables that are frequently queried

-- inventory.item_id - Used in almost every inventory JOIN
CREATE INDEX IF NOT EXISTS idx_inventory_item_id ON inventory(item_id);

-- active_combat.enemy_id - Used in combat loops
CREATE INDEX IF NOT EXISTS idx_active_combat_enemy_id ON active_combat(enemy_id);

-- active_crafting.recipe_id - Used in crafting sessions
CREATE INDEX IF NOT EXISTS idx_active_crafting_recipe_id ON active_crafting(recipe_id);

-- crafting_recipes.result_item_id - Used when looking up craftable items
CREATE INDEX IF NOT EXISTS idx_crafting_recipes_result_item_id ON crafting_recipes(result_item_id);

-- quests.quest_id - Used for quest lookups
CREATE INDEX IF NOT EXISTS idx_quests_quest_id ON quests(quest_id);

-- active_gathering.material_id - Used in gathering sessions
CREATE INDEX IF NOT EXISTS idx_active_gathering_material_id ON active_gathering(material_id);

-- merchant_transactions.item_id - Used in transaction history
CREATE INDEX IF NOT EXISTS idx_merchant_transactions_item_id ON merchant_transactions(item_id);

-- MEDIUM: Session and activity tables

-- active_travels - Travel system queries
CREATE INDEX IF NOT EXISTS idx_active_travels_from_zone_id ON active_travels(from_zone_id);
CREATE INDEX IF NOT EXISTS idx_active_travels_to_zone_id ON active_travels(to_zone_id);
CREATE INDEX IF NOT EXISTS idx_active_travels_connection_id ON active_travels(connection_id);

-- active_explorations.zone_id - Exploration queries
CREATE INDEX IF NOT EXISTS idx_active_explorations_zone_id ON active_explorations(zone_id);

-- character_landmark_discoveries.landmark_id - Discovery tracking
CREATE INDEX IF NOT EXISTS idx_character_landmark_discoveries_landmark_id ON character_landmark_discoveries(landmark_id);

-- world_zones.parent_zone_id - Zone hierarchy queries
CREATE INDEX IF NOT EXISTS idx_world_zones_parent_zone_id ON world_zones(parent_zone_id);

-- zone_exclusive_items.item_id - Zone-specific items
CREATE INDEX IF NOT EXISTS idx_zone_exclusive_items_item_id ON zone_exclusive_items(item_id);

-- travel_log.zone_id - Travel history lookups
CREATE INDEX IF NOT EXISTS idx_travel_log_zone_id ON travel_log(zone_id);

-- LOW: Future feature tables (class/mastery system)

-- character_mastery_nodes.node_id - Mastery tree lookups
CREATE INDEX IF NOT EXISTS idx_character_mastery_nodes_node_id ON character_mastery_nodes(node_id);

-- character_skill_synergies.synergy_id - Synergy lookups
CREATE INDEX IF NOT EXISTS idx_character_skill_synergies_synergy_id ON character_skill_synergies(synergy_id);

-- skill_specializations.skill_type - Specialization lookups
CREATE INDEX IF NOT EXISTS idx_skill_specializations_skill_type ON skill_specializations(skill_type);

-- active_class_abilities.ability_id - Ability lookups
CREATE INDEX IF NOT EXISTS idx_active_class_abilities_ability_id ON active_class_abilities(ability_id);

-- Add comments for documentation
COMMENT ON INDEX idx_inventory_item_id IS 'Improves performance of inventory JOINs with items table';
COMMENT ON INDEX idx_active_combat_enemy_id IS 'Improves performance of combat queries with enemy lookups';
COMMENT ON INDEX idx_active_crafting_recipe_id IS 'Improves performance of crafting session queries';
COMMENT ON INDEX idx_crafting_recipes_result_item_id IS 'Improves performance of reverse recipe lookups';
