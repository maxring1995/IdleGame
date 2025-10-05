-- Remove Duplicate Indexes
-- Performance: Remove 3 sets of duplicate indexes that waste storage and slow query planning

-- crafting_recipes: Keep newer naming convention (idx_crafting_recipes_*)
DROP INDEX IF EXISTS idx_recipes_category;
DROP INDEX IF EXISTS idx_recipes_skill;

-- active_explorations: Keep the more descriptive name
DROP INDEX IF EXISTS idx_active_explorations_character;

COMMENT ON INDEX idx_crafting_recipes_category IS 'Index on recipe_category for filtering recipes';
COMMENT ON INDEX idx_crafting_recipes_skill IS 'Index on required_skill_type for skill-based queries';
COMMENT ON INDEX idx_active_explorations_character_id IS 'Index on character_id for player exploration lookups';
