-- ============================================
-- BALANCE MIGRATION: Economy Overhaul
-- Date: 2025-01-06
-- Phase: 2 (Major)
-- ============================================
-- CHANGES:
-- 1. Increase merchant markup (1.5x → 2-4x)
-- 2. Add equipment durability system
-- 3. Increase crafted item values (+50%)
-- 4. Add gold sink features
-- ============================================

-- ============================================
-- PART 1: BACKUP EXISTING DATA
-- ============================================

CREATE TABLE IF NOT EXISTS _backup_merchant_inventory_20250106 AS
SELECT * FROM merchant_inventory;

CREATE TABLE IF NOT EXISTS _backup_items_20250106 AS
SELECT * FROM items;

-- ============================================
-- PART 2: MERCHANT PRICE OVERHAUL
-- ============================================

-- Update merchant markup based on tier
UPDATE merchant_inventory
SET
  price_multiplier = CASE
    WHEN merchant_tier = 1 THEN 2.0   -- Tier 1: 2x markup
    WHEN merchant_tier = 2 THEN 2.5   -- Tier 2: 2.5x markup
    WHEN merchant_tier = 3 THEN 3.0   -- Tier 3: 3x markup
    WHEN merchant_tier = 4 THEN 3.5   -- Tier 4: 3.5x markup
    WHEN merchant_tier = 5 THEN 4.0   -- Tier 5: 4x markup
    ELSE 2.0
  END;

-- Recalculate buy prices based on new multipliers
UPDATE merchant_inventory mi
SET buy_price = GREATEST(
  FLOOR((SELECT sell_price FROM items WHERE id = mi.item_id) * mi.price_multiplier),
  10  -- Minimum 10 gold
);

-- Materials should have lower markup (1.5x instead of 2-4x)
UPDATE merchant_inventory mi
SET
  price_multiplier = 1.5,
  buy_price = GREATEST(
    FLOOR((SELECT sell_price FROM items WHERE id = mi.item_id) * 1.5),
    5
  )
WHERE item_id IN (SELECT id FROM items WHERE type = 'material');

-- ============================================
-- PART 3: EQUIPMENT DURABILITY SYSTEM
-- ============================================

-- Add durability tracking to inventory
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS current_durability INTEGER;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS last_repair_cost INTEGER DEFAULT 0;

-- Set initial durability for all existing equipment
UPDATE inventory inv
SET current_durability = (
  SELECT max_durability
  FROM items
  WHERE id = inv.item_id
)
WHERE current_durability IS NULL
  AND EXISTS (
    SELECT 1 FROM items
    WHERE id = inv.item_id
    AND max_durability IS NOT NULL
  );

-- ============================================
-- PART 4: REPAIR COST CALCULATION
-- ============================================

-- Calculate repair cost based on durability lost and item value
CREATE OR REPLACE FUNCTION calculate_repair_cost(
  item_id TEXT,
  current_durability INTEGER,
  max_durability INTEGER
)
RETURNS INTEGER
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  item_value INTEGER;
  durability_lost NUMERIC;
  repair_cost INTEGER;
BEGIN
  -- Get item sell price as base value
  SELECT sell_price INTO item_value
  FROM items
  WHERE id = calculate_repair_cost.item_id;

  IF item_value IS NULL THEN
    RETURN 0;
  END IF;

  -- Calculate percentage of durability lost
  durability_lost := (max_durability - current_durability)::NUMERIC / max_durability::NUMERIC;

  -- Repair cost = 10% of item value per 10% durability lost
  repair_cost := FLOOR(item_value * durability_lost * 0.10);

  -- Minimum 1 gold if any repair needed
  IF current_durability < max_durability THEN
    RETURN GREATEST(repair_cost, 1);
  END IF;

  RETURN 0;
END;
$$;

-- ============================================
-- PART 5: CRAFTED ITEM VALUE INCREASE
-- ============================================

-- Increase sell price for all craftable items (+50%)
UPDATE items
SET sell_price = FLOOR(sell_price * 1.5)
WHERE id IN (
  SELECT result_item_id FROM crafting_recipes
);

-- ============================================
-- PART 6: ADD GOLD SINK TABLES
-- ============================================

-- Training costs table (pay gold for XP boost)
CREATE TABLE IF NOT EXISTS skill_training_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  skill_type TEXT NOT NULL,
  cost INTEGER NOT NULL,
  xp_multiplier NUMERIC NOT NULL DEFAULT 1.25,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_training_sessions_character ON skill_training_sessions(character_id);
CREATE INDEX IF NOT EXISTS idx_training_sessions_expires ON skill_training_sessions(expires_at);

-- Equipment repair log
CREATE TABLE IF NOT EXISTS equipment_repairs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  inventory_id UUID NOT NULL REFERENCES inventory(id) ON DELETE CASCADE,
  repair_cost INTEGER NOT NULL,
  durability_restored INTEGER NOT NULL,
  repaired_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_repairs_character ON equipment_repairs(character_id);

-- ============================================
-- PART 7: CALCULATE TRAINING COSTS
-- ============================================

-- Training cost based on skill level
CREATE OR REPLACE FUNCTION calculate_training_cost(skill_level INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  -- Cost = skill_level * 1000
  -- Level 50: 50,000 gold
  -- Level 99: 99,000 gold
  RETURN skill_level * 1000;
END;
$$;

-- ============================================
-- PART 8: VALIDATION QUERIES
-- ============================================

DO $$
DECLARE
  item_record RECORD;
  tier_num INTEGER;
BEGIN
  RAISE NOTICE '=== ECONOMY BALANCE CHANGES ===';
  RAISE NOTICE '';

  RAISE NOTICE 'MERCHANT PRICES BY TIER:';
  FOR tier_num IN 1..5 LOOP
    SELECT * INTO item_record
    FROM merchant_inventory mi
    JOIN items i ON i.id = mi.item_id
    WHERE mi.merchant_tier = tier_num
    ORDER BY mi.buy_price
    LIMIT 1;

    IF FOUND THEN
      RAISE NOTICE '  Tier %: %x markup | Example: % (% gold → % gold)',
        tier_num,
        item_record.price_multiplier,
        item_record.name,
        item_record.sell_price,
        item_record.buy_price;
    END IF;
  END LOOP;

  RAISE NOTICE '';
  RAISE NOTICE 'REPAIR COSTS (Sample):';
  RAISE NOTICE '  Legendary sword (2000 gold value):';
  RAISE NOTICE '    90%% durability: % gold to repair',
    calculate_repair_cost('rune_sword', 90, 100);
  RAISE NOTICE '    50%% durability: % gold to repair',
    calculate_repair_cost('rune_sword', 50, 100);
  RAISE NOTICE '    10%% durability: % gold to repair',
    calculate_repair_cost('rune_sword', 10, 100);

  RAISE NOTICE '';
  RAISE NOTICE 'TRAINING COSTS:';
  RAISE NOTICE '  Level 25 skill: % gold for +25%% XP (1 hour)',
    calculate_training_cost(25);
  RAISE NOTICE '  Level 50 skill: % gold for +25%% XP (1 hour)',
    calculate_training_cost(50);
  RAISE NOTICE '  Level 75 skill: % gold for +25%% XP (1 hour)',
    calculate_training_cost(75);
  RAISE NOTICE '  Level 99 skill: % gold for +25%% XP (1 hour)',
    calculate_training_cost(99);

  RAISE NOTICE '';
  RAISE NOTICE 'CRAFTED ITEM VALUES (+50%%):';
  FOR item_record IN
    SELECT i.* FROM items i
    WHERE i.id IN (SELECT result_item_id FROM crafting_recipes)
    ORDER BY i.sell_price DESC
    LIMIT 5
  LOOP
    RAISE NOTICE '  %: % gold (was % gold)',
      item_record.name,
      item_record.sell_price,
      FLOOR(item_record.sell_price / 1.5);
  END LOOP;
END $$;

-- ============================================
-- PART 9: DOCUMENTATION
-- ============================================

COMMENT ON FUNCTION calculate_repair_cost IS
'Calculates gold cost to repair equipment: 10% of item value per 10% durability lost';

COMMENT ON FUNCTION calculate_training_cost IS
'Calculates gold cost for 1-hour skill training boost (+25% XP): skill_level * 1000';

COMMENT ON TABLE skill_training_sessions IS
'Active skill training sessions (pay gold for temporary XP boost)';

COMMENT ON TABLE equipment_repairs IS
'Log of all equipment repairs performed';

COMMENT ON COLUMN merchant_inventory.price_multiplier IS
'Markup multiplier (2-4x based on tier, 1.5x for materials)';

COMMENT ON COLUMN inventory.current_durability IS
'Current durability (decreases with use, repaired with gold)';

-- ============================================
-- PART 10: ENABLE RLS ON NEW TABLES
-- ============================================

ALTER TABLE skill_training_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_repairs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own training sessions"
  ON skill_training_sessions FOR SELECT
  USING (character_id IN (
    SELECT id FROM characters WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can create own training sessions"
  ON skill_training_sessions FOR INSERT
  WITH CHECK (character_id IN (
    SELECT id FROM characters WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can view own repair history"
  ON equipment_repairs FOR SELECT
  USING (character_id IN (
    SELECT id FROM characters WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can log own repairs"
  ON equipment_repairs FOR INSERT
  WITH CHECK (character_id IN (
    SELECT id FROM characters WHERE user_id = auth.uid()
  ));

-- ============================================
-- PART 11: CODE CHANGES REQUIRED
-- ============================================

-- NOTE: Implement durability loss in combat and gathering:

/*
REQUIRED CODE CHANGES:

1. lib/combat.ts - Reduce weapon/armor durability on use
   After each combat turn:
     // Reduce weapon durability by 1
     await supabase
       .from('inventory')
       .update({ current_durability: current_durability - 1 })
       .eq('character_id', characterId)
       .eq('equipped', true)
       .eq('item.equipment_slot', 'weapon')
       .gt('current_durability', 0)

2. lib/gathering.ts - Reduce tool durability on gather
   After gathering completes:
     // Reduce tool durability by 1
     // (if using specific gathering tools)

3. Create new file: lib/economy.ts
   export async function repairEquipment(
     characterId: string,
     inventoryId: string
   ) {
     // Get item details
     const { data: invItem } = await supabase
       .from('inventory')
       .select('*, item:items(*)')
       .eq('id', inventoryId)
       .single()

     // Calculate repair cost
     const repairCost = calculate_repair_cost(
       invItem.item_id,
       invItem.current_durability,
       invItem.item.max_durability
     )

     // Deduct gold
     // Restore durability
     // Log repair
   }

   export async function startSkillTraining(
     characterId: string,
     skillType: string
   ) {
     // Get skill level
     // Calculate cost
     // Deduct gold
     // Create training session (1 hour duration)
   }
*/

-- ============================================
-- MIGRATION COMPLETE
-- ============================================

INSERT INTO _migration_log (migration_name, applied_at, description) VALUES
  ('20250106000004_balance_economy', NOW(), 'Merchant markup 2-4x, equipment durability system, +50% crafted item value, gold sinks')
ON CONFLICT (migration_name) DO NOTHING;
