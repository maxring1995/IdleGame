-- =====================================================
-- Eternal Realms - Phase 4: Boss Enemies
-- =====================================================

-- Add is_boss column to enemies table
ALTER TABLE enemies
ADD COLUMN is_boss BOOLEAN DEFAULT false;

-- Add boss-specific columns
ALTER TABLE enemies
ADD COLUMN boss_abilities JSONB DEFAULT '[]';

-- Create index for boss queries
CREATE INDEX idx_enemies_is_boss ON enemies(is_boss);

-- =====================================================
-- INSERT BOSS ENEMIES
-- =====================================================

-- Tier 1 Boss: Forest Guardian (Level 5)
INSERT INTO enemies (id, name, description, level, health, attack, defense, experience_reward, gold_min, gold_max, loot_table, required_player_level, is_boss, boss_abilities) VALUES
(
  'forest_guardian',
  'Forest Guardian',
  'An ancient treant that protects the forest. Its thick bark provides immense defense.',
  5,
  300,
  20,
  25,
  250,
  150,
  250,
  '{"health_potion": 0.80, "mana_potion": 0.60, "iron_sword": 0.30, "iron_armor": 0.25, "steel_sword": 0.05}',
  4,
  true,
  '["Regeneration: Heals 10 HP per turn", "Thick Bark: High defense"]'
);

-- Tier 2 Boss: Goblin King (Level 8)
INSERT INTO enemies (id, name, description, level, health, attack, defense, experience_reward, gold_min, gold_max, loot_table, required_player_level, is_boss, boss_abilities) VALUES
(
  'goblin_king',
  'Goblin King',
  'The ruthless leader of the goblin tribes. Commands respect through fear and strength.',
  8,
  400,
  35,
  18,
  400,
  250,
  400,
  '{"health_potion": 0.70, "mana_potion": 0.50, "steel_sword": 0.35, "steel_armor": 0.30}',
  7,
  true,
  '["Battle Cry: Increases attack by 20%", "Goblin Horde: Summons minions (cosmetic)"]'
);

-- Tier 3 Boss: Ancient Dragon (Level 12)
INSERT INTO enemies (id, name, description, level, health, attack, defense, experience_reward, gold_min, gold_max, loot_table, required_player_level, is_boss, boss_abilities) VALUES
(
  'ancient_dragon',
  'Ancient Dragon',
  'A legendary dragon that has terrorized the realm for centuries. Immense power and wisdom.',
  12,
  800,
  60,
  30,
  1000,
  500,
  1000,
  '{"health_potion": 0.90, "mana_potion": 0.80, "steel_sword": 0.50, "steel_armor": 0.45}',
  10,
  true,
  '["Dragon Breath: Deals massive fire damage", "Ancient Scales: Very high defense", "Flight: Can dodge attacks"]'
);

-- Tier 4 Boss: Lich Lord (Level 15)
INSERT INTO enemies (id, name, description, level, health, attack, defense, experience_reward, gold_min, gold_max, loot_table, required_player_level, is_boss, boss_abilities) VALUES
(
  'lich_lord',
  'Lich Lord',
  'An immortal necromancer who has transcended death itself. Master of dark magic.',
  15,
  1200,
  80,
  40,
  2000,
  800,
  1500,
  '{"health_potion": 1.00, "mana_potion": 1.00, "steel_sword": 0.60, "steel_armor": 0.55}',
  13,
  true,
  '["Life Drain: Steals health from enemies", "Undead Armor: Reduced physical damage", "Soul Harvest: Gains power from defeating foes"]'
);

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON COLUMN enemies.is_boss IS 'Indicates if this enemy is a boss-level encounter';
COMMENT ON COLUMN enemies.boss_abilities IS 'JSON array of special boss abilities (descriptive only)';
