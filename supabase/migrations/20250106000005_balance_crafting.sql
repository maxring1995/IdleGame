-- ============================================
-- BALANCE MIGRATION: Crafting System Balance
-- Date: 2025-01-06
-- Phase: 3 (Polish)
-- ============================================
-- CHANGES:
-- 1. Increase crafting XP (+50%)
-- 2. Rebalance recipe material costs
-- 3. Add bulk crafting efficiency bonuses
-- 4. Make crafting profitable
-- ============================================

-- ============================================
-- PART 1: BACKUP EXISTING DATA
-- ============================================

CREATE TABLE IF NOT EXISTS _backup_crafting_recipes_20250106 AS
SELECT * FROM crafting_recipes;

-- ============================================
-- PART 2: INCREASE CRAFTING XP (+50%)
-- ============================================

-- Boost all crafting XP rewards by 50%
UPDATE crafting_recipes
SET experience_reward = FLOOR(experience_reward * 1.5);

-- ============================================
-- PART 3: BULK CRAFTING SYSTEM
-- ============================================

-- Add bulk crafting columns to active_crafting
ALTER TABLE active_crafting ADD COLUMN IF NOT EXISTS bulk_efficiency_bonus NUMERIC DEFAULT 0;

COMMENT ON COLUMN active_crafting.bulk_efficiency_bonus IS
'Time efficiency bonus for bulk crafting (20% faster when crafting multiple items)';

-- ============================================
-- PART 4: RECIPE MATERIAL COST BALANCE
-- ============================================

-- Some recipes require too many materials, making them unprofitable
-- Reduce coal requirements for smelting
UPDATE crafting_recipes
SET ingredients = jsonb_set(
  ingredients,
  '{coal}',
  to_jsonb(GREATEST((ingredients->>'coal')::INTEGER - 1, 1))
)
WHERE ingredients ? 'coal'
  AND (ingredients->>'coal')::INTEGER > 2;

-- Reduce high-tier material requirements
UPDATE crafting_recipes
SET ingredients = jsonb_set(
  ingredients,
  '{runite_bar}',
  to_jsonb(GREATEST((ingredients->>'runite_bar')::INTEGER - 1, 2))
)
WHERE ingredients ? 'runite_bar'
  AND (ingredients->>'runite_bar')::INTEGER > 3;

-- ============================================
-- PART 5: CRAFTING PROFITABILITY ANALYSIS
-- ============================================

-- Calculate profit margin for each recipe
CREATE OR REPLACE VIEW crafting_profitability AS
SELECT
  cr.id AS recipe_id,
  cr.name AS recipe_name,
  cr.result_item_id,
  result.name AS result_item_name,
  result.sell_price AS result_value,

  -- Calculate material cost
  (
    SELECT SUM((value::text)::INTEGER * i.sell_price)
    FROM jsonb_each(cr.ingredients)
    JOIN items i ON i.id = key
  ) AS material_cost,

  -- Profit per craft
  result.sell_price - (
    SELECT SUM((value::text)::INTEGER * i.sell_price)
    FROM jsonb_each(cr.ingredients)
    JOIN items i ON i.id = key
  ) AS profit_per_craft,

  -- Profit margin percentage
  ROUND(
    ((result.sell_price::NUMERIC - (
      SELECT SUM((value::text)::INTEGER * i.sell_price)
      FROM jsonb_each(cr.ingredients)
      JOIN items i ON i.id = key
    )::NUMERIC) / result.sell_price::NUMERIC * 100),
    1
  ) AS profit_margin_percent,

  cr.experience_reward,
  cr.crafting_time_ms,
  cr.required_crafting_level

FROM crafting_recipes cr
JOIN items result ON result.id = cr.result_item_id
WHERE cr.recipe_category IN ('weapon', 'armor', 'consumable')
ORDER BY profit_per_craft DESC;

COMMENT ON VIEW crafting_profitability IS
'Analyzes profit margins for all crafting recipes';

-- ============================================
-- PART 6: FIX UNPROFITABLE RECIPES
-- ============================================

-- Increase result quantity for unprofitable consumables
UPDATE crafting_recipes
SET result_quantity = 2
WHERE recipe_category = 'consumable'
  AND id IN (
    SELECT recipe_id
    FROM crafting_profitability
    WHERE profit_per_craft < 0
  );

-- ============================================
-- PART 7: CRAFTING SPEED BONUSES
-- ============================================

-- Calculate crafting speed reduction from skill level
CREATE OR REPLACE FUNCTION calculate_crafting_speed_bonus(skill_level INTEGER)
RETURNS NUMERIC
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  -- 0.5% speed increase per skill level (max 49.5% at level 99)
  RETURN LEAST(skill_level * 0.005, 0.495);
END;
$$;

-- Calculate bulk crafting time efficiency
CREATE OR REPLACE FUNCTION calculate_bulk_crafting_time(
  base_time_ms INTEGER,
  quantity INTEGER,
  skill_level INTEGER
)
RETURNS INTEGER
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  speed_bonus NUMERIC;
  bulk_bonus NUMERIC := 0.20; -- 20% faster when crafting in bulk
  effective_time NUMERIC;
BEGIN
  speed_bonus := calculate_crafting_speed_bonus(skill_level);

  -- Apply both skill speed bonus and bulk bonus
  effective_time := base_time_ms * quantity;
  effective_time := effective_time * (1 - speed_bonus); -- Skill bonus
  effective_time := effective_time * (1 - bulk_bonus);  -- Bulk bonus

  RETURN FLOOR(effective_time);
END;
$$;

-- Calculate bulk crafting XP bonus
CREATE OR REPLACE FUNCTION calculate_bulk_crafting_xp(
  base_xp INTEGER,
  quantity INTEGER
)
RETURNS INTEGER
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  bulk_xp_bonus NUMERIC := 0.10; -- 10% XP bonus for bulk crafting
BEGIN
  RETURN FLOOR(base_xp * quantity * (1 + bulk_xp_bonus));
END;
$$;

-- ============================================
-- PART 8: VALIDATION QUERIES
-- ============================================

DO $$
DECLARE
  recipe_record RECORD;
  profit_record RECORD;
BEGIN
  RAISE NOTICE '=== CRAFTING BALANCE CHANGES ===';
  RAISE NOTICE '';

  RAISE NOTICE 'XP INCREASES (+50%%):';
  FOR recipe_record IN
    SELECT * FROM crafting_recipes
    ORDER BY experience_reward DESC
    LIMIT 5
  LOOP
    RAISE NOTICE '  %: % XP (was % XP)',
      recipe_record.name,
      recipe_record.experience_reward,
      FLOOR(recipe_record.experience_reward / 1.5);
  END LOOP;

  RAISE NOTICE '';
  RAISE NOTICE 'CRAFTING SPEED BONUSES:';
  RAISE NOTICE '  Level 25: %% faster',
    ROUND((calculate_crafting_speed_bonus(25) * 100)::numeric, 1);
  RAISE NOTICE '  Level 50: %% faster',
    ROUND((calculate_crafting_speed_bonus(50) * 100)::numeric, 1);
  RAISE NOTICE '  Level 75: %% faster',
    ROUND((calculate_crafting_speed_bonus(75) * 100)::numeric, 1);
  RAISE NOTICE '  Level 99: %% faster',
    ROUND((calculate_crafting_speed_bonus(99) * 100)::numeric, 1);

  RAISE NOTICE '';
  RAISE NOTICE 'BULK CRAFTING BONUSES:';
  RAISE NOTICE '  Time: 20%% faster when crafting multiple items';
  RAISE NOTICE '  XP: +10%% bonus XP for bulk crafting';

  RAISE NOTICE '';
  RAISE NOTICE 'MOST PROFITABLE RECIPES:';
  FOR profit_record IN
    SELECT * FROM crafting_profitability
    WHERE profit_per_craft > 0
    ORDER BY profit_margin_percent DESC
    LIMIT 5
  LOOP
    RAISE NOTICE '  %: % gold profit (%%% margin)',
      profit_record.recipe_name,
      profit_record.profit_per_craft,
      profit_record.profit_margin_percent;
  END LOOP;

  RAISE NOTICE '';
  RAISE NOTICE 'UNPROFITABLE RECIPES (Fixed):';
  FOR profit_record IN
    SELECT * FROM crafting_profitability
    WHERE profit_per_craft <= 0
    LIMIT 3
  LOOP
    RAISE NOTICE '  WARNING: % still unprofitable (% gold loss)',
      profit_record.recipe_name,
      profit_record.profit_per_craft;
  END LOOP;
END $$;

-- ============================================
-- PART 9: DOCUMENTATION
-- ============================================

COMMENT ON FUNCTION calculate_crafting_speed_bonus IS
'Returns crafting speed reduction from skill level (0.5% per level, max 49.5%)';

COMMENT ON FUNCTION calculate_bulk_crafting_time IS
'Calculates total time for bulk crafting with skill and bulk bonuses';

COMMENT ON FUNCTION calculate_bulk_crafting_xp IS
'Calculates total XP for bulk crafting with 10% bonus';

-- ============================================
-- PART 10: CODE CHANGES REQUIRED
-- ============================================

-- NOTE: Implement bulk crafting in lib/crafting.ts:

/*
REQUIRED CODE CHANGES in lib/crafting.ts:

1. Add bulk crafting support to startCrafting():
   export async function startCrafting(
     characterId: string,
     recipeId: string,
     quantity: number = 1  // NEW PARAMETER
   ) {
     // Validate materials for quantity
     // Calculate bulk time and XP
     // Create active_crafting session with quantity
   }

2. Update craft time calculation:
   const skillLevel = await getSkillLevel(characterId, recipe.required_skill_type)
   const totalTime = calculate_bulk_crafting_time(
     recipe.crafting_time_ms,
     quantity,
     skillLevel
   )

3. Update XP reward calculation:
   const totalXP = calculate_bulk_crafting_xp(
     recipe.experience_reward,
     quantity
   )

4. Add progress tracking:
   // Track how many items have been crafted out of quantity_goal
   UPDATE active_crafting SET
     quantity_crafted = quantity_crafted + 1
   WHERE character_id = $1
*/

-- ============================================
-- MIGRATION COMPLETE
-- ============================================

INSERT INTO _migration_log (migration_name, applied_at, description) VALUES
  ('20250106000005_balance_crafting', NOW(), '+50% crafting XP, bulk crafting system, profitability fixes, speed bonuses')
ON CONFLICT (migration_name) DO NOTHING;
