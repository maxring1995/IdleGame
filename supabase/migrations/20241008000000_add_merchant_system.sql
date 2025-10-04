-- Migration: Add Merchant System
-- This migration adds merchant inventory, transactions, and shop mechanics

-- Merchant inventory table (what the merchant has for sale)
CREATE TABLE IF NOT EXISTS merchant_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  stock_quantity INTEGER NOT NULL DEFAULT -1, -- -1 = unlimited
  buy_price INTEGER NOT NULL, -- Price player pays (higher than sell_price)
  price_multiplier DECIMAL(3,2) NOT NULL DEFAULT 1.50, -- 150% of sell_price
  available_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  available_until TIMESTAMPTZ, -- NULL = always available
  merchant_tier INTEGER NOT NULL DEFAULT 1, -- 1-5, unlocks at character levels
  required_character_level INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Transaction history
CREATE TABLE IF NOT EXISTS merchant_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('buy', 'sell')),
  item_id TEXT NOT NULL REFERENCES items(id),
  quantity INTEGER NOT NULL DEFAULT 1,
  price_per_unit INTEGER NOT NULL,
  total_price INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Character merchant progress (unlocked tiers, last refresh, etc.)
CREATE TABLE IF NOT EXISTS character_merchant_data (
  character_id UUID PRIMARY KEY REFERENCES characters(id) ON DELETE CASCADE,
  unlocked_tier INTEGER NOT NULL DEFAULT 1,
  last_inventory_refresh TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  total_purchases INTEGER NOT NULL DEFAULT 0,
  total_sales INTEGER NOT NULL DEFAULT 0,
  lifetime_gold_spent INTEGER NOT NULL DEFAULT 0,
  lifetime_gold_earned INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_merchant_inventory_tier ON merchant_inventory(merchant_tier, required_character_level);
CREATE INDEX IF NOT EXISTS idx_merchant_inventory_item ON merchant_inventory(item_id);
CREATE INDEX IF NOT EXISTS idx_merchant_transactions_character ON merchant_transactions(character_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_character_merchant_data_character ON character_merchant_data(character_id);

-- RLS Policies
ALTER TABLE merchant_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE merchant_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE character_merchant_data ENABLE ROW LEVEL SECURITY;

-- Everyone can view merchant inventory
CREATE POLICY "Merchant inventory is viewable by everyone"
  ON merchant_inventory FOR SELECT
  USING (true);

-- Only system can manage merchant inventory (admin only)
CREATE POLICY "Merchant inventory is managed by service role"
  ON merchant_inventory FOR ALL
  USING (auth.role() = 'service_role');

-- Users can view their own transaction history
CREATE POLICY "Users can view own transaction history"
  ON merchant_transactions FOR SELECT
  USING (auth.uid()::text IN (
    SELECT user_id::text FROM characters WHERE id = character_id
  ));

-- Users can insert their own transactions (via server actions)
CREATE POLICY "Users can create own transactions"
  ON merchant_transactions FOR INSERT
  WITH CHECK (auth.uid()::text IN (
    SELECT user_id::text FROM characters WHERE id = character_id
  ));

-- Users can view their own merchant data
CREATE POLICY "Users can view own merchant data"
  ON character_merchant_data FOR SELECT
  USING (auth.uid()::text IN (
    SELECT user_id::text FROM characters WHERE id = character_id
  ));

-- Users can update their own merchant data
CREATE POLICY "Users can update own merchant data"
  ON character_merchant_data FOR INSERT
  WITH CHECK (auth.uid()::text IN (
    SELECT user_id::text FROM characters WHERE id = character_id
  ));

CREATE POLICY "Users can modify own merchant data"
  ON character_merchant_data FOR UPDATE
  USING (auth.uid()::text IN (
    SELECT user_id::text FROM characters WHERE id = character_id
  ));

-- Function to seed initial merchant inventory
CREATE OR REPLACE FUNCTION seed_merchant_inventory()
RETURNS void AS $$
BEGIN
  -- Clear existing inventory
  TRUNCATE merchant_inventory;

  -- Insert starter items (tier 1, level 1-10)
  INSERT INTO merchant_inventory (item_id, stock_quantity, buy_price, price_multiplier, merchant_tier, required_character_level)
  SELECT
    id,
    -1, -- unlimited stock
    GREATEST(sell_price * 1.5, 10)::int, -- 150% markup, minimum 10 gold
    1.50,
    CASE
      WHEN required_level <= 5 THEN 1
      WHEN required_level <= 15 THEN 2
      WHEN required_level <= 30 THEN 3
      WHEN required_level <= 50 THEN 4
      ELSE 5
    END,
    required_level
  FROM items
  WHERE type IN ('weapon', 'armor', 'consumable')
    AND rarity IN ('common', 'uncommon', 'rare')
  ORDER BY required_level, rarity;

  -- Add some basic materials at lower prices
  INSERT INTO merchant_inventory (item_id, stock_quantity, buy_price, price_multiplier, merchant_tier, required_character_level)
  SELECT
    id,
    -1,
    GREATEST(sell_price * 1.2, 5)::int, -- 120% markup for materials
    1.20,
    1,
    0
  FROM items
  WHERE type = 'material'
    AND rarity = 'common'
  LIMIT 20;
END;
$$ LANGUAGE plpgsql;

-- Run the seed function
SELECT seed_merchant_inventory();

COMMENT ON TABLE merchant_inventory IS 'Items available for purchase from the merchant';
COMMENT ON TABLE merchant_transactions IS 'History of all buy/sell transactions';
COMMENT ON TABLE character_merchant_data IS 'Per-character merchant progression and statistics';
