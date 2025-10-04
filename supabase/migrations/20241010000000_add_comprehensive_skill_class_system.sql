-- =====================================================
-- Eternal Realms - Comprehensive Skill & Class System
-- Inspired by Runescape with enhanced features
-- =====================================================

-- =====================================================
-- SKILL DEFINITIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS skill_definitions (
  skill_type TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('combat', 'gathering', 'artisan', 'support')),
  description TEXT,
  icon TEXT DEFAULT '⚔️',
  base_stat_affected TEXT, -- 'attack', 'defense', 'health', etc.
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert all 20 skills
INSERT INTO skill_definitions (skill_type, display_name, category, description, icon, base_stat_affected) VALUES
  -- Combat Skills (6)
  ('attack', 'Attack', 'combat', 'Melee accuracy and hit chance', '⚔️', 'attack'),
  ('strength', 'Strength', 'combat', 'Melee damage output', '💪', 'attack'),
  ('defense', 'Defense', 'combat', 'Damage reduction and armor effectiveness', '🛡️', 'defense'),
  ('magic', 'Magic', 'combat', 'Spell power and magical accuracy', '✨', 'mana'),
  ('ranged', 'Ranged', 'combat', 'Bow and throwing weapon effectiveness', '🏹', 'attack'),
  ('constitution', 'Constitution', 'combat', 'Health points and vitality', '❤️', 'health'),

  -- Gathering Skills (5)
  ('mining', 'Mining', 'gathering', 'Extract ores and gems from rocks', '⛏️', NULL),
  ('woodcutting', 'Woodcutting', 'gathering', 'Harvest timber from trees', '🪓', NULL),
  ('fishing', 'Fishing', 'gathering', 'Catch fish and aquatic resources', '🎣', NULL),
  ('farming', 'Farming', 'gathering', 'Cultivate crops and herbs', '🌾', NULL),
  ('hunting', 'Hunter', 'gathering', 'Track and trap creatures', '🏹', NULL),

  -- Artisan Skills (6)
  ('smithing', 'Smithing', 'artisan', 'Forge metal equipment and weapons', '🔨', NULL),
  ('crafting', 'Crafting', 'artisan', 'Create leather and cloth items', '🧵', NULL),
  ('fletching', 'Fletching', 'artisan', 'Craft ranged weapons and ammunition', '🎯', NULL),
  ('alchemy', 'Herblore', 'artisan', 'Brew potions and elixirs', '🧪', NULL),
  ('cooking', 'Cooking', 'artisan', 'Prepare food and consumables', '🍖', NULL),
  ('runecrafting', 'Runecrafting', 'artisan', 'Create magical runes and enchantments', '🔮', NULL),

  -- Support Skills (3)
  ('agility', 'Agility', 'support', 'Movement speed and stamina regeneration', '🏃', NULL),
  ('thieving', 'Thieving', 'support', 'Pickpocketing and lockpicking', '🗝️', NULL),
  ('slayer', 'Slayer', 'support', 'Bonus damage versus specific monsters', '💀', NULL)
ON CONFLICT (skill_type) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  category = EXCLUDED.category,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  base_stat_affected = EXCLUDED.base_stat_affected;

-- =====================================================
-- CLASS DEFINITIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS class_definitions (
  class_id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT '⚔️',
  primary_stats JSONB DEFAULT '{}'::jsonb, -- {stat_name: bonus_value}
  skill_bonuses JSONB DEFAULT '{}'::jsonb, -- {skill_type: xp_multiplier}
  special_ability_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert 6 starting classes
INSERT INTO class_definitions (class_id, display_name, description, icon, primary_stats, skill_bonuses, special_ability_id) VALUES
  ('warrior', 'Warrior', 'Tank and melee damage dealer with enhanced survivability', '⚔️',
    '{"strength": 5, "defense": 3, "constitution": 2}'::jsonb,
    '{"attack": 1.10, "strength": 1.10}'::jsonb,
    'berserker_rage'),

  ('mage', 'Mage', 'Master of arcane arts and spellcasting', '🧙',
    '{"magic": 8, "runecrafting": 2}'::jsonb,
    '{"magic": 1.15, "runecrafting": 1.15}'::jsonb,
    'mana_surge'),

  ('ranger', 'Ranger', 'Expert marksman and wilderness scout', '🏹',
    '{"ranged": 5, "agility": 3, "hunting": 2}'::jsonb,
    '{"ranged": 1.10, "fletching": 1.10}'::jsonb,
    'eagle_eye'),

  ('artisan', 'Artisan', 'Master craftsman and economy specialist', '🔨',
    '{"smithing": 3, "crafting": 3, "alchemy": 3}'::jsonb,
    '{"smithing": 1.20, "crafting": 1.20, "fletching": 1.20, "alchemy": 1.20, "cooking": 1.20, "runecrafting": 1.20}'::jsonb,
    'masters_touch'),

  ('rogue', 'Rogue', 'Stealthy operative with enhanced mobility', '🗡️',
    '{"thieving": 5, "agility": 5}'::jsonb,
    '{"agility": 1.15, "thieving": 1.15}'::jsonb,
    'shadow_step'),

  ('druid', 'Druid', 'Nature-focused hybrid with gathering expertise', '🌿',
    '{"alchemy": 3, "farming": 3, "hunting": 2}'::jsonb,
    '{"alchemy": 1.10, "farming": 1.10, "hunting": 1.10, "fishing": 1.10}'::jsonb,
    'natures_blessing')
ON CONFLICT (class_id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  primary_stats = EXCLUDED.primary_stats,
  skill_bonuses = EXCLUDED.skill_bonuses,
  special_ability_id = EXCLUDED.special_ability_id;

-- =====================================================
-- SPECIAL ABILITIES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS special_abilities (
  ability_id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  description TEXT,
  cooldown_seconds INTEGER DEFAULT 300, -- 5 minutes default
  duration_seconds INTEGER DEFAULT 30,
  effect_type TEXT, -- 'damage_buff', 'defense_buff', 'utility', etc.
  effect_data JSONB DEFAULT '{}'::jsonb,
  icon TEXT DEFAULT '⚡',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert special abilities for each class
INSERT INTO special_abilities (ability_id, display_name, description, cooldown_seconds, duration_seconds, effect_type, effect_data, icon) VALUES
  ('berserker_rage', 'Berserker Rage', 'Enter a rage, increasing damage by 50% for 30 seconds', 300, 30, 'damage_buff', '{"damage_multiplier": 1.5}'::jsonb, '😡'),
  ('mana_surge', 'Mana Surge', 'Channel pure magic energy, spell costs reduced to 0 for 30 seconds', 600, 30, 'resource_buff', '{"mana_cost_multiplier": 0}'::jsonb, '💫'),
  ('eagle_eye', 'Eagle Eye', 'Focus your vision, increasing accuracy and critical chance by 25%', 300, 45, 'accuracy_buff', '{"accuracy_bonus": 25, "crit_chance_bonus": 25}'::jsonb, '🦅'),
  ('masters_touch', 'Master''s Touch', 'Channel your expertise, 50% chance to not consume materials when crafting', 900, 60, 'crafting_buff', '{"material_save_chance": 0.5}'::jsonb, '✨'),
  ('shadow_step', 'Shadow Step', 'Become one with shadows, gaining brief invisibility and 100% dodge', 240, 15, 'utility', '{"dodge_chance": 1.0, "invisible": true}'::jsonb, '🌑'),
  ('natures_blessing', 'Nature''s Blessing', 'Invoke nature''s power, regenerating 5% HP and MP per second', 450, 20, 'regeneration', '{"hp_regen_percent": 5, "mp_regen_percent": 5}'::jsonb, '🌿')
ON CONFLICT (ability_id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  cooldown_seconds = EXCLUDED.cooldown_seconds,
  duration_seconds = EXCLUDED.duration_seconds,
  effect_type = EXCLUDED.effect_type,
  effect_data = EXCLUDED.effect_data,
  icon = EXCLUDED.icon;

-- =====================================================
-- UPDATE CHARACTERS TABLE
-- =====================================================
ALTER TABLE characters ADD COLUMN IF NOT EXISTS class_id TEXT REFERENCES class_definitions(class_id);
ALTER TABLE characters ADD COLUMN IF NOT EXISTS mastery_points INTEGER DEFAULT 0;

-- =====================================================
-- UPDATE CHARACTER_SKILLS TABLE
-- =====================================================
ALTER TABLE character_skills ADD COLUMN IF NOT EXISTS prestige_level INTEGER DEFAULT 0;
ALTER TABLE character_skills ADD COLUMN IF NOT EXISTS total_experience BIGINT DEFAULT 0; -- Tracks all XP ever earned (including prestige resets)
ALTER TABLE character_skills ADD COLUMN IF NOT EXISTS specialization_id TEXT;

-- =====================================================
-- SKILL MILESTONES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS skill_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_type TEXT NOT NULL REFERENCES skill_definitions(skill_type),
  milestone_level INTEGER NOT NULL CHECK (milestone_level > 0 AND milestone_level <= 99),
  reward_type TEXT NOT NULL CHECK (reward_type IN ('gold', 'item', 'ability', 'stat_boost', 'mastery_point')),
  reward_data JSONB DEFAULT '{}'::jsonb,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(skill_type, milestone_level)
);

-- Insert milestone rewards for key levels (10, 25, 50, 75, 99)
INSERT INTO skill_milestones (skill_type, milestone_level, reward_type, reward_data, description) VALUES
  -- Attack milestones
  ('attack', 10, 'stat_boost', '{"attack": 5}'::jsonb, 'Unlock power attack technique'),
  ('attack', 25, 'gold', '{"amount": 1000}'::jsonb, 'Bonus gold for mastering basic combat'),
  ('attack', 50, 'mastery_point', '{"points": 1}'::jsonb, 'Earn 1 Mastery Point'),
  ('attack', 75, 'stat_boost', '{"attack": 10}'::jsonb, 'Master-level attack prowess'),
  ('attack', 99, 'mastery_point', '{"points": 3}'::jsonb, 'Peak attack mastery - 3 Mastery Points'),

  -- Strength milestones
  ('strength', 10, 'stat_boost', '{"attack": 3}'::jsonb, 'Increased damage output'),
  ('strength', 25, 'gold', '{"amount": 1000}'::jsonb, 'Bonus gold for raw power'),
  ('strength', 50, 'mastery_point', '{"points": 1}'::jsonb, 'Earn 1 Mastery Point'),
  ('strength', 75, 'stat_boost', '{"attack": 8}'::jsonb, 'Superior strength'),
  ('strength', 99, 'mastery_point', '{"points": 3}'::jsonb, 'Peak strength - 3 Mastery Points'),

  -- Defense milestones
  ('defense', 10, 'stat_boost', '{"defense": 5}'::jsonb, 'Improved armor techniques'),
  ('defense', 25, 'gold', '{"amount": 1000}'::jsonb, 'Bonus gold for resilience'),
  ('defense', 50, 'mastery_point', '{"points": 1}'::jsonb, 'Earn 1 Mastery Point'),
  ('defense', 75, 'stat_boost', '{"defense": 10}'::jsonb, 'Master defender'),
  ('defense', 99, 'mastery_point', '{"points": 3}'::jsonb, 'Peak defense - 3 Mastery Points'),

  -- Magic milestones
  ('magic', 10, 'stat_boost', '{"max_mana": 50}'::jsonb, 'Expanded mana pool'),
  ('magic', 25, 'gold', '{"amount": 1500}'::jsonb, 'Arcane knowledge bonus'),
  ('magic', 50, 'mastery_point', '{"points": 1}'::jsonb, 'Earn 1 Mastery Point'),
  ('magic', 75, 'stat_boost', '{"max_mana": 100}'::jsonb, 'Archmage potential'),
  ('magic', 99, 'mastery_point', '{"points": 3}'::jsonb, 'Peak magic mastery - 3 Mastery Points')
ON CONFLICT (skill_type, milestone_level) DO NOTHING;

-- =====================================================
-- SKILL SPECIALIZATIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS skill_specializations (
  specialization_id TEXT PRIMARY KEY,
  skill_type TEXT NOT NULL REFERENCES skill_definitions(skill_type),
  display_name TEXT NOT NULL,
  description TEXT,
  unlock_level INTEGER DEFAULT 50,
  bonuses JSONB DEFAULT '{}'::jsonb, -- Passive bonuses granted
  special_effect TEXT, -- Description of special mechanics
  icon TEXT DEFAULT '🌟',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert specializations for each skill (2-3 per skill)
INSERT INTO skill_specializations (specialization_id, skill_type, display_name, description, unlock_level, bonuses, special_effect, icon) VALUES
  -- Attack specializations
  ('attack_precision', 'attack', 'Precision', 'Focus on critical hits and accuracy', 50, '{"crit_chance": 15, "accuracy": 10}'::jsonb, 'Each attack has 15% higher crit chance', '🎯'),
  ('attack_brutality', 'attack', 'Brutality', 'Maximize raw damage output', 50, '{"damage_bonus": 25}'::jsonb, 'All attacks deal 25% more damage', '💥'),

  -- Magic specializations
  ('magic_elementalist', 'magic', 'Elementalist', 'Master of elemental forces', 50, '{"elemental_damage": 30}'::jsonb, 'Fire, ice, and lightning spells deal bonus damage', '🔥'),
  ('magic_necromancer', 'magic', 'Necromancer', 'Command the powers of death', 50, '{"lifesteal": 15}'::jsonb, 'Drain life from enemies with spells', '💀'),
  ('magic_enchanter', 'magic', 'Enchanter', 'Enhance equipment and allies', 50, '{"enchant_power": 25}'::jsonb, 'Enchantments are 25% more powerful', '✨'),

  -- Mining specializations
  ('mining_speed', 'mining', 'Speed Miner', 'Gather resources faster', 50, '{"gather_speed": 30}'::jsonb, 'Mining 30% faster', '⚡'),
  ('mining_fortune', 'mining', 'Fortune Seeker', 'Find rare materials more often', 50, '{"rare_find_chance": 20}'::jsonb, '20% increased chance for rare ores and gems', '💎'),

  -- Woodcutting specializations
  ('woodcutting_logger', 'woodcutting', 'Master Logger', 'Efficient wood harvesting', 50, '{"gather_speed": 25, "yield_bonus": 10}'::jsonb, 'Faster cutting with bonus logs', '🪵'),
  ('woodcutting_forester', 'woodcutting', 'Forester', 'Find special tree types', 50, '{"rare_tree_chance": 15}'::jsonb, 'Discover rare and ancient trees', '🌲'),

  -- Smithing specializations
  ('smithing_weaponsmith', 'smithing', 'Weaponsmith', 'Specialize in forging weapons', 50, '{"weapon_quality": 20}'::jsonb, 'Weapons have 20% better stats', '⚔️'),
  ('smithing_armorsmith', 'smithing', 'Armorsmith', 'Specialize in crafting armor', 50, '{"armor_quality": 20}'::jsonb, 'Armor has 20% better stats', '🛡️'),

  -- Thieving specializations
  ('thieving_pickpocket', 'thieving', 'Master Pickpocket', 'Expert at stealing from NPCs', 50, '{"steal_success": 25, "loot_value": 15}'::jsonb, 'Better success and more valuable loot', '👛'),
  ('thieving_lockpick', 'thieving', 'Lockbreaker', 'Open any lock with ease', 50, '{"lockpick_speed': 40}'::jsonb, 'Pick locks 40% faster', '🔓')
ON CONFLICT (specialization_id) DO NOTHING;

-- =====================================================
-- SKILL SYNERGIES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS skill_synergies (
  synergy_id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  description TEXT,
  required_skills JSONB NOT NULL, -- {skill_type: min_level}
  bonus_type TEXT NOT NULL,
  bonus_data JSONB DEFAULT '{}'::jsonb,
  icon TEXT DEFAULT '🔗',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert skill synergies
INSERT INTO skill_synergies (synergy_id, display_name, description, required_skills, bonus_type, bonus_data, icon) VALUES
  ('efficient_smelting', 'Efficient Smelting', 'Combine mining knowledge with smithing expertise',
    '{"mining": 50, "smithing": 50}'::jsonb, 'resource_efficiency', '{"ore_reduction": 0.15}'::jsonb, '🔥'),

  ('divine_magic', 'Divine Magic', 'Blend magic with spiritual power',
    '{"magic": 60}'::jsonb, 'hybrid_spells', '{"heal_power": 20, "damage_power": 10}'::jsonb, '✨'),

  ('shadowdancer', 'Shadowdancer', 'Perfect combination of stealth and mobility',
    '{"agility": 70, "thieving": 70}'::jsonb, 'movement', '{"dodge_chance": 15, "move_speed": 25}'::jsonb, '🌙'),

  ('hunter_gatherer', 'Hunter Gatherer', 'Master of wilderness survival',
    '{"hunting": 40, "farming": 40, "fishing": 40}'::jsonb, 'gathering', '{"gather_speed": 20, "yield_bonus": 10}'::jsonb, '🏕️'),

  ('combat_medic', 'Combat Medic', 'Combine combat prowess with healing',
    '{"constitution": 50, "alchemy": 50}'::jsonb, 'combat_healing', '{"heal_effectiveness": 30, "potion_power": 20}'::jsonb, '⚕️'),

  ('arcane_fletcher', 'Arcane Fletcher', 'Infuse ranged weapons with magic',
    '{"fletching": 60, "magic": 60}'::jsonb, 'enchanted_ammunition', '{"arrow_damage": 25, "magic_arrows": true}'::jsonb, '🏹'),

  ('master_artisan', 'Master Artisan', 'Ultimate crafting expertise',
    '{"smithing": 75, "crafting": 75, "fletching": 75}'::jsonb, 'master_crafting', '{"quality_bonus": 20, "material_save_chance": 0.10}'::jsonb, '🔨')
ON CONFLICT (synergy_id) DO NOTHING;

-- =====================================================
-- CHARACTER SKILL SYNERGIES (unlocked synergies)
-- =====================================================
CREATE TABLE IF NOT EXISTS character_skill_synergies (
  character_id UUID REFERENCES characters(id) ON DELETE CASCADE,
  synergy_id TEXT REFERENCES skill_synergies(synergy_id),
  unlocked_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (character_id, synergy_id)
);

-- =====================================================
-- MASTERY TREE TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS mastery_tree_nodes (
  node_id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN ('combat', 'gathering', 'artisan', 'support', 'universal')),
  cost INTEGER DEFAULT 1, -- Mastery points required
  requirements JSONB DEFAULT '{}'::jsonb, -- Prerequisites
  bonuses JSONB DEFAULT '{}'::jsonb,
  icon TEXT DEFAULT '🌟',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert mastery tree nodes
INSERT INTO mastery_tree_nodes (node_id, display_name, description, category, cost, requirements, bonuses, icon) VALUES
  -- Universal nodes
  ('mastery_health', 'Vitality', 'Permanently increase max health', 'universal', 1, '{}'::jsonb, '{"max_health": 50}'::jsonb, '❤️'),
  ('mastery_mana', 'Arcane Reservoir', 'Permanently increase max mana', 'universal', 1, '{}'::jsonb, '{"max_mana": 30}'::jsonb, '💧'),
  ('mastery_gold_find', 'Fortune', 'Increase gold drops by 10%', 'universal', 1, '{}'::jsonb, '{"gold_multiplier": 1.10}'::jsonb, '💰'),
  ('mastery_xp_boost', 'Quick Learner', 'Gain 5% more XP in all skills', 'universal', 2, '{}'::jsonb, '{"xp_multiplier": 1.05}'::jsonb, '📚'),

  -- Combat nodes
  ('mastery_crit_chance', 'Deadly Precision', 'Increase critical hit chance by 5%', 'combat', 1, '{}'::jsonb, '{"crit_chance": 5}'::jsonb, '💥'),
  ('mastery_damage', 'Raw Power', 'Increase all damage by 10%', 'combat', 2, '{"mastery_crit_chance": true}'::jsonb, '{"damage_multiplier": 1.10}'::jsonb, '⚔️'),
  ('mastery_defense', 'Iron Skin', 'Reduce incoming damage by 8%', 'combat', 2, '{}'::jsonb, '{"damage_reduction": 0.08}'::jsonb, '🛡️'),

  -- Gathering nodes
  ('mastery_gather_speed', 'Swift Hands', 'Gather resources 15% faster', 'gathering', 1, '{}'::jsonb, '{"gather_speed_multiplier": 1.15}'::jsonb, '⚡'),
  ('mastery_double_gather', 'Bountiful Harvest', '10% chance to gather double resources', 'gathering', 2, '{"mastery_gather_speed": true}'::jsonb, '{"double_gather_chance": 0.10}'::jsonb, '🌾'),

  -- Artisan nodes
  ('mastery_craft_speed', 'Efficient Crafter', 'Craft items 20% faster', 'artisan', 1, '{}'::jsonb, '{"craft_speed_multiplier": 1.20}'::jsonb, '🔨'),
  ('mastery_quality_craft', 'Quality Control', 'Crafted items have 10% better stats', 'artisan', 2, '{"mastery_craft_speed": true}'::jsonb, '{"craft_quality_bonus": 0.10}'::jsonb, '✨')
ON CONFLICT (node_id) DO NOTHING;

-- =====================================================
-- CHARACTER MASTERY NODES (purchased nodes)
-- =====================================================
CREATE TABLE IF NOT EXISTS character_mastery_nodes (
  character_id UUID REFERENCES characters(id) ON DELETE CASCADE,
  node_id TEXT REFERENCES mastery_tree_nodes(node_id),
  purchased_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (character_id, node_id)
);

-- =====================================================
-- ACTIVE ABILITIES (ability cooldowns and usage)
-- =====================================================
CREATE TABLE IF NOT EXISTS active_class_abilities (
  character_id UUID REFERENCES characters(id) ON DELETE CASCADE,
  ability_id TEXT REFERENCES special_abilities(ability_id),
  last_used_at TIMESTAMPTZ,
  active_until TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT false,
  uses_count INTEGER DEFAULT 0,
  PRIMARY KEY (character_id, ability_id)
);

-- =====================================================
-- RLS POLICIES
-- =====================================================
ALTER TABLE skill_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE special_abilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill_specializations ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill_synergies ENABLE ROW LEVEL SECURITY;
ALTER TABLE mastery_tree_nodes ENABLE ROW LEVEL SECURITY;

-- Read-only policies for definition tables
CREATE POLICY "Skill definitions viewable by all" ON skill_definitions FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Class definitions viewable by all" ON class_definitions FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Special abilities viewable by all" ON special_abilities FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Skill milestones viewable by all" ON skill_milestones FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Skill specializations viewable by all" ON skill_specializations FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Skill synergies viewable by all" ON skill_synergies FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Mastery tree viewable by all" ON mastery_tree_nodes FOR SELECT USING (auth.role() = 'authenticated');

-- Character-specific tables
ALTER TABLE character_skill_synergies ENABLE ROW LEVEL SECURITY;
ALTER TABLE character_mastery_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE active_class_abilities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own synergies" ON character_skill_synergies FOR SELECT
  USING (EXISTS (SELECT 1 FROM characters WHERE characters.id = character_skill_synergies.character_id AND characters.user_id = auth.uid()));

CREATE POLICY "Users can manage own synergies" ON character_skill_synergies FOR ALL
  USING (EXISTS (SELECT 1 FROM characters WHERE characters.id = character_skill_synergies.character_id AND characters.user_id = auth.uid()));

CREATE POLICY "Users can view own mastery" ON character_mastery_nodes FOR SELECT
  USING (EXISTS (SELECT 1 FROM characters WHERE characters.id = character_mastery_nodes.character_id AND characters.user_id = auth.uid()));

CREATE POLICY "Users can manage own mastery" ON character_mastery_nodes FOR ALL
  USING (EXISTS (SELECT 1 FROM characters WHERE characters.id = character_mastery_nodes.character_id AND characters.user_id = auth.uid()));

CREATE POLICY "Users can view own abilities" ON active_class_abilities FOR SELECT
  USING (EXISTS (SELECT 1 FROM characters WHERE characters.id = active_class_abilities.character_id AND characters.user_id = auth.uid()));

CREATE POLICY "Users can manage own abilities" ON active_class_abilities FOR ALL
  USING (EXISTS (SELECT 1 FROM characters WHERE characters.id = active_class_abilities.character_id AND characters.user_id = auth.uid()));

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_character_class ON characters(class_id) WHERE class_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_skill_specialization ON character_skills(specialization_id) WHERE specialization_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_skill_prestige ON character_skills(prestige_level) WHERE prestige_level > 0;
CREATE INDEX IF NOT EXISTS idx_synergies_character ON character_skill_synergies(character_id);
CREATE INDEX IF NOT EXISTS idx_mastery_character ON character_mastery_nodes(character_id);
CREATE INDEX IF NOT EXISTS idx_abilities_character ON active_class_abilities(character_id);
CREATE INDEX IF NOT EXISTS idx_abilities_active ON active_class_abilities(character_id, is_active) WHERE is_active = true;

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Calculate XP required for a level (Runescape-inspired exponential curve)
CREATE OR REPLACE FUNCTION calculate_xp_for_level(target_level INTEGER)
RETURNS BIGINT AS $$
DECLARE
  total_xp BIGINT := 0;
  level_xp BIGINT;
  lvl INTEGER;
BEGIN
  -- Level 1 = 0 XP, Level 2 = 83 XP
  IF target_level <= 1 THEN
    RETURN 0;
  END IF;

  -- Calculate cumulative XP using Runescape formula
  FOR lvl IN 2..target_level LOOP
    level_xp := FLOOR(lvl + 300 * POWER(2, lvl / 7.0));
    total_xp := total_xp + level_xp;
  END LOOP;

  RETURN FLOOR(total_xp / 4);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Get current level from XP
CREATE OR REPLACE FUNCTION calculate_level_from_xp(current_xp BIGINT)
RETURNS INTEGER AS $$
DECLARE
  level INTEGER := 1;
BEGIN
  WHILE level < 99 AND current_xp >= calculate_xp_for_level(level + 1) LOOP
    level := level + 1;
  END LOOP;

  RETURN level;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Check if character has unlocked a synergy
CREATE OR REPLACE FUNCTION check_synergy_unlock(char_id UUID, syn_id TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  required_skills JSONB;
  skill_record RECORD;
  skill_name TEXT;
  required_level INTEGER;
BEGIN
  -- Get synergy requirements
  SELECT required_skills INTO required_skills
  FROM skill_synergies
  WHERE synergy_id = syn_id;

  -- Check each required skill
  FOR skill_name, required_level IN SELECT * FROM jsonb_each_text(required_skills) LOOP
    -- Check if character has this skill at required level
    IF NOT EXISTS (
      SELECT 1 FROM character_skills
      WHERE character_id = char_id
      AND skill_type = skill_name
      AND level >= required_level::INTEGER
    ) THEN
      RETURN false;
    END IF;
  END LOOP;

  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-unlock synergies when skill levels up
CREATE OR REPLACE FUNCTION auto_unlock_synergies()
RETURNS TRIGGER AS $$
DECLARE
  synergy RECORD;
BEGIN
  -- Check all synergies
  FOR synergy IN SELECT synergy_id FROM skill_synergies LOOP
    -- If character meets requirements and doesn't have it yet
    IF check_synergy_unlock(NEW.character_id, synergy.synergy_id) AND
       NOT EXISTS (
         SELECT 1 FROM character_skill_synergies
         WHERE character_id = NEW.character_id AND synergy_id = synergy.synergy_id
       ) THEN
      -- Unlock the synergy
      INSERT INTO character_skill_synergies (character_id, synergy_id)
      VALUES (NEW.character_id, synergy.synergy_id);
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on character_skills
DROP TRIGGER IF EXISTS trigger_auto_unlock_synergies ON character_skills;
CREATE TRIGGER trigger_auto_unlock_synergies
  AFTER UPDATE OF level ON character_skills
  FOR EACH ROW
  WHEN (NEW.level > OLD.level)
  EXECUTE FUNCTION auto_unlock_synergies();

-- Grant mastery points every 10 levels
CREATE OR REPLACE FUNCTION grant_mastery_points()
RETURNS TRIGGER AS $$
BEGIN
  -- Grant 1 mastery point for every 10 levels gained
  IF NEW.level >= 10 AND (NEW.level % 10 = 0) AND NEW.level > OLD.level THEN
    UPDATE characters
    SET mastery_points = mastery_points + 1
    WHERE id = NEW.character_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_grant_mastery_points ON character_skills;
CREATE TRIGGER trigger_grant_mastery_points
  AFTER UPDATE OF level ON character_skills
  FOR EACH ROW
  EXECUTE FUNCTION grant_mastery_points();

COMMENT ON TABLE skill_definitions IS 'Defines all 20 skills in the game with categories and base attributes';
COMMENT ON TABLE class_definitions IS 'Defines the 6 starting classes with stat bonuses and XP multipliers';
COMMENT ON TABLE special_abilities IS 'Class-specific special abilities with cooldowns and effects';
COMMENT ON TABLE skill_milestones IS 'Rewards granted at milestone levels (10, 25, 50, 75, 99)';
COMMENT ON TABLE skill_specializations IS 'Specialization choices available at level 50 for each skill';
COMMENT ON TABLE skill_synergies IS 'Bonuses unlocked by combining specific skill levels';
COMMENT ON TABLE mastery_tree_nodes IS 'Passive bonuses purchasable with mastery points';
COMMENT ON TABLE character_skill_synergies IS 'Tracks which synergies each character has unlocked';
COMMENT ON TABLE character_mastery_nodes IS 'Tracks which mastery nodes each character has purchased';
COMMENT ON TABLE active_class_abilities IS 'Tracks cooldowns and active status of class abilities';
