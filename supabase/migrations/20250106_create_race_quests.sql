-- Race-Specific Quests
-- Quests that are only available to specific races

-- Add race_requirement column to quests table
ALTER TABLE quest_definitions
ADD COLUMN IF NOT EXISTS race_requirement VARCHAR(50) REFERENCES races(id);

-- Insert 24 race-specific quests (4 per race)

-- Human Quests
INSERT INTO quest_definitions (id, name, description, quest_type, requirements, rewards, race_requirement) VALUES
('race_human_diplomat', 'Diplomatic Mission', 'As a human, your natural charisma makes you perfect for diplomatic work. Negotiate a trade agreement with the dwarves.', 'special', '{"type": "talk_to_npc", "npc": "Dwarf Merchant", "count": 1}', '{"xp": 500, "gold": 250, "items": [{"item_id": "diplomat_badge", "quantity": 1}]}', 'human'),
('race_human_explorer', 'Human Ambition', 'Humans are known for their ambition. Explore 3 different zones to prove your adventurous spirit.', 'special', '{"type": "explore_zones", "zones": ["havenbrook_village", "whispering_woods", "ironpeak_mountains"], "count": 3}', '{"xp": 1000, "gold": 500}', 'human'),
('race_human_versatile', 'Jack of All Trades', 'Humans excel at everything they try. Reach level 10 in any 3 different skills.', 'skill', '{"type": "skills_level_10", "count": 3}', '{"xp": 1500, "gold": 750}', 'human'),
('race_human_unity', 'Human Unity', 'Humans work well together. Complete 5 quests to demonstrate cooperation.', 'special', '{"type": "complete_quests", "count": 5}', '{"xp": 800, "gold": 400, "items": [{"item_id": "unity_ring", "quantity": 1}]}', 'human'),

-- Elf Quests
('race_elf_nature', 'Guardian of Nature', 'As an elf, you have a deep connection to nature. Plant 10 magical seeds in the Whispering Woods.', 'special', '{"type": "plant_seeds", "location": "whispering_woods", "count": 10}', '{"xp": 600, "gold": 200, "items": [{"item_id": "nature_amulet", "quantity": 1}]}', 'elf'),
('race_elf_archery', 'Elven Marksmanship', 'Elves are natural archers. Defeat 20 enemies using ranged attacks.', 'kill', '{"type": "kill_with_ranged", "count": 20}', '{"xp": 1200, "gold": 600}', 'elf'),
('race_elf_magic', 'Arcane Heritage', 'Your elven blood carries ancient magic. Gather 15 magical essence from any source.', 'gather', '{"type": "gather_essence", "count": 15}', '{"xp": 1000, "gold": 500, "items": [{"item_id": "elven_circlet", "quantity": 1}]}', 'elf'),
('race_elf_wisdom', 'Ancient Wisdom', 'Elves live for centuries. Meditate at 5 ancient locations to gain wisdom.', 'special', '{"type": "meditate_locations", "count": 5}', '{"xp": 1500, "gold": 750}', 'elf'),

-- Dwarf Quests
('race_dwarf_mining', 'Master of the Mountain', 'Dwarves are born miners. Mine 50 ore of any type to honor your heritage.', 'gather', '{"type": "gather_ore", "count": 50}', '{"xp": 800, "gold": 400, "items": [{"item_id": "mining_pick_legendary", "quantity": 1}]}', 'dwarf'),
('race_dwarf_crafting', 'Forge Master', 'Dwarven craftsmanship is legendary. Craft 10 weapons or armor pieces.', 'craft', '{"type": "craft_equipment", "count": 10}', '{"xp": 1500, "gold": 800}', 'dwarf'),
('race_dwarf_ale', 'Brew of the Ancestors', 'Every dwarf appreciates a good brew. Collect 20 Ale Ingredients.', 'gather', '{"type": "gather_ale_ingredients", "count": 20}', '{"xp": 600, "gold": 300, "items": [{"item_id": "ancestral_tankard", "quantity": 1}]}', 'dwarf'),
('race_dwarf_defense', 'Unyielding Defense', 'Dwarves never retreat. Block or mitigate 1000 damage in combat.', 'special', '{"type": "mitigate_damage", "amount": 1000}', '{"xp": 1200, "gold": 600}', 'dwarf'),

-- Orc Quests
('race_orc_warrior', 'Blood of the Horde', 'Orcs are born warriors. Defeat 30 enemies in honorable combat.', 'kill', '{"type": "kill_honorably", "count": 30}', '{"xp": 1000, "gold": 500, "items": [{"item_id": "war_paint", "quantity": 1}]}', 'orc'),
('race_orc_strength', 'Trials of Strength', 'Prove your orcish strength by dealing 5000 total damage.', 'special', '{"type": "deal_damage", "amount": 5000}', '{"xp": 1200, "gold": 600}', 'orc'),
('race_orc_hunt', 'The Great Hunt', 'Join the hunt! Defeat 10 boss enemies to prove your prowess.', 'kill', '{"type": "kill_bosses", "count": 10}', '{"xp": 2000, "gold": 1000, "items": [{"item_id": "hunters_trophy", "quantity": 1}]}', 'orc'),
('race_orc_fearless', 'Fearless Warrior', 'Orcs fear nothing. Complete 3 quests without dying once.', 'special', '{"type": "no_death_quests", "count": 3}', '{"xp": 1500, "gold": 750}', 'orc'),

-- Dark Elf Quests
('race_darkelf_shadow', 'Embrace the Shadows', 'Dark elves thrive in darkness. Complete 15 quests at night.', 'special', '{"type": "night_quests", "count": 15}', '{"xp": 1000, "gold": 500, "items": [{"item_id": "shadow_cloak", "quantity": 1}]}', 'dark_elf'),
('race_darkelf_magic', 'Shadow Magic Mastery', 'Master the dark arts. Cast 100 shadow-type spells.', 'special', '{"type": "cast_shadow_spells", "count": 100}', '{"xp": 1500, "gold": 800}', 'dark_elf'),
('race_darkelf_underground', 'Secrets of the Underdark', 'Explore 5 underground caverns to uncover ancient secrets.', 'special', '{"type": "explore_caverns", "count": 5}', '{"xp": 1200, "gold": 600, "items": [{"item_id": "underdark_map", "quantity": 1}]}', 'dark_elf'),
('race_darkelf_poison', 'Poisonous Intent', 'Dark elves are masters of poison. Apply poison to enemies 50 times.', 'special', '{"type": "apply_poison", "count": 50}', '{"xp": 1000, "gold": 500}', 'dark_elf'),

-- Beast-kin Quests
('race_beastkin_primal', 'Call of the Wild', 'Embrace your primal nature. Defeat 25 enemies using only melee attacks.', 'kill', '{"type": "kill_melee_only", "count": 25}', '{"xp": 1000, "gold": 500, "items": [{"item_id": "primal_pendant", "quantity": 1}]}', 'beast_kin'),
('race_beastkin_hunt', 'Alpha Predator', 'Prove you are the alpha. Hunt and defeat 15 beast-type enemies.', 'kill', '{"type": "kill_beasts", "count": 15}', '{"xp": 1200, "gold": 600}', 'beast_kin'),
('race_beastkin_tracking', 'Master Tracker', 'Beast-kin have enhanced senses. Track and find 20 hidden objects.', 'special', '{"type": "find_hidden", "count": 20}', '{"xp": 1500, "gold": 750, "items": [{"item_id": "tracking_boots", "quantity": 1}]}', 'beast_kin'),
('race_beastkin_nature', 'One with Nature', 'Connect with nature. Spend 60 minutes in natural zones without combat.', 'special', '{"type": "peaceful_time", "minutes": 60}', '{"xp": 800, "gold": 400}', 'beast_kin');

-- Add index for race requirement
CREATE INDEX IF NOT EXISTS idx_quest_definitions_race ON quest_definitions(race_requirement);
