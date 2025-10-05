-- Remove Duplicate and Redundant Indexes
-- Cleanup: Remove indexes that are duplicates or truly unused to reduce storage overhead

-- travel_log has two sets of duplicate indexes (likely created during development)
-- Keep the newer naming convention and remove the older ones

-- Remove old character index (keep idx_travel_log_character_id)
DROP INDEX IF EXISTS idx_travel_log_character;

-- Remove old created_at index (keep idx_travel_log_created_at)
DROP INDEX IF EXISTS idx_travel_log_created;

-- Note: All other "unused" indexes are being kept because:
-- 1. This is an active development project - features may not be fully implemented yet
-- 2. Zone system, class system, and skill specializations are planned features
-- 3. These indexes will be used once those features are active
-- 4. The storage cost is minimal compared to the performance benefit when needed
-- 5. Re-creating them later would be more disruptive than keeping them now

-- Index retention strategy:
-- - Combat/gathering/crafting indexes: Active features, queries will use these
-- - Zone/merchant indexes: Zone system in development, will be used soon
-- - Class/mastery/synergy indexes: Future features, keep for when implemented
-- - Skill milestone/specialization indexes: Planned features at levels 50+
