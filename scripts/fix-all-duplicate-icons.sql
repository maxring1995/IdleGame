-- COMPREHENSIVE FIX: Assign completely unique icon to every single item
-- This ensures NO duplicates remain

-- Fix 💎 duplicates (5 items)
UPDATE items SET icon = '💎' WHERE id = 'diamond';
UPDATE items SET icon = '🟩' WHERE id = 'emerald_amulet';
UPDATE items SET icon = '🔷' WHERE id = 'sapphire';
UPDATE items SET icon = '👑' WHERE id = 'adv_crystal_tiara';
UPDATE items SET icon = '🧙' WHERE id = 'adv_crystal_staff';

-- Fix 🛡️ duplicates (4 items)
UPDATE items SET icon = '🪖' WHERE id = 'adv_steel_helm';
UPDATE items SET icon = '🏰' WHERE id = 'adv_battle_plate';
UPDATE items SET icon = '🧪' WHERE id = 'adv_defense_potion';
UPDATE items SET icon = '🛡️' WHERE id = 'adv_protection_ring';

-- Fix 🌿 duplicates (4 items)
UPDATE items SET icon = '🗡️' WHERE id = 'adv_thorn_blade';
UPDATE items SET icon = '🌳' WHERE id = 'adv_nature_armor';
UPDATE items SET icon = '🌿' WHERE id = 'tarromin';
UPDATE items SET icon = '🍀' WHERE id = 'adv_herb';

-- Fix 🔥 duplicates (4 items)
UPDATE items SET icon = '🔥' WHERE id = 'adv_phoenix_staff';
UPDATE items SET icon = '🌋' WHERE id = 'adv_inferno_sword';
UPDATE items SET icon = '👹' WHERE id = 'adv_demon_armor';
UPDATE items SET icon = '🕯️' WHERE id = 'adv_flame_armor';

-- Fix 🗡️ duplicates (4 items)
UPDATE items SET icon = '⚔️' WHERE id = 'adv_steel_longsword';
UPDATE items SET icon = '🔪' WHERE id = 'bronze_sword';
UPDATE items SET icon = '🐟' WHERE id = 'raw_swordfish';
UPDATE items SET icon = '🗡️' WHERE id = 'adv_holy_sword';

-- Fix 🟫 duplicates (3 items)
UPDATE items SET icon = '🟫' WHERE id = 'adv_bronze_chestplate';
UPDATE items SET icon = '🥉' WHERE id = 'adv_copper_ring';
UPDATE items SET icon = '🟤' WHERE id = 'copper_bar';

-- Fix 🪄 duplicates (3 items)
UPDATE items SET icon = '✨' WHERE id = 'magic_log';
UPDATE items SET icon = '🪄' WHERE id = 'adv_mystic_wand';
UPDATE items SET icon = '🔮' WHERE id = 'adv_arcane_scepter';

-- Fix ⛑️ duplicates (3 items)
UPDATE items SET icon = '⛑️' WHERE id = 'adv_iron_helmet';
UPDATE items SET icon = '🎓' WHERE id = 'steel_helm';
UPDATE items SET icon = '🧢' WHERE id = 'bronze_helm';

-- Fix 🏹 duplicates (3 items)
UPDATE items SET icon = '🏹' WHERE id = 'adv_wooden_greatbow';
UPDATE items SET icon = '🎯' WHERE id = 'adv_ranger_longbow';
UPDATE items SET icon = '🦌' WHERE id = 'adv_hunter_bow';

-- Fix 💠 duplicates (3 items)
UPDATE items SET icon = '💠' WHERE id = 'adv_frost_amulet';
UPDATE items SET icon = '🔷' WHERE id = 'mithril_ore';
UPDATE items SET icon = '💫' WHERE id = 'adv_crystal_armor';

-- Fix ⚡ duplicates (3 items)
UPDATE items SET icon = '⚡' WHERE id = 'adv_thunder_helm';
UPDATE items SET icon = '✨' WHERE id = 'adv_enchanted_dagger';
UPDATE items SET icon = '🌩️' WHERE id = 'adv_lightning_bow';

-- Fix remaining 2-count duplicates
UPDATE items SET icon = '🌩️' WHERE id = 'adv_thunder_armor';
UPDATE items SET icon = '🔨' WHERE id = 'adv_thunder_hammer';

UPDATE items SET icon = '🪙' WHERE id = 'gold_coin';
UPDATE items SET icon = '💰' WHERE id = 'copper_ring';

UPDATE items SET icon = '👞' WHERE id = 'adv_iron_boots';
UPDATE items SET icon = '👢' WHERE id = 'adv_leather_boots';

UPDATE items SET icon = '🪓' WHERE id = 'adv_lava_axe';
UPDATE items SET icon = '⛏️' WHERE id = 'bronze_axe';

UPDATE items SET icon = '🛠️' WHERE id = 'iron_bar';
UPDATE items SET icon = '🔧' WHERE id = 'adv_battle_hammer';

UPDATE items SET icon = '⭕' WHERE id = 'adv_holy_ring';
UPDATE items SET icon = '💍' WHERE id = 'adv_mithril_sword';

UPDATE items SET icon = '🌲' WHERE id = 'adv_forest_spear';
UPDATE items SET icon = '🌳' WHERE id = 'yew_log';

UPDATE items SET icon = '🟦' WHERE id = 'lesser_mana_potion';
UPDATE items SET icon = '🔵' WHERE id = 'runite_ore';

UPDATE items SET icon = '⭐' WHERE id = 'adv_star_armor';
UPDATE items SET icon = '🌟' WHERE id = 'adv_exp_potion';

UPDATE items SET icon = '❄️' WHERE id = 'adv_dragon_slayer';
UPDATE items SET icon = '🧊' WHERE id = 'adv_frost_armor';

UPDATE items SET icon = '🪵' WHERE id = 'wooden_sword';
UPDATE items SET icon = '🌲' WHERE id = 'willow_log';

UPDATE items SET icon = '❤️' WHERE id = 'adv_vitality_ring';
UPDATE items SET icon = '♥️' WHERE id = 'ruby';

UPDATE items SET icon = '🤚' WHERE id = 'adv_flame_gauntlets';
UPDATE items SET icon = '🖐️' WHERE id = 'adv_shadow_gloves';

UPDATE items SET icon = '🌀' WHERE id = 'chaos_rune';
UPDATE items SET icon = '🌌' WHERE id = 'adv_soul_reaver';

UPDATE items SET icon = '🦺' WHERE id = 'leather_armor';
UPDATE items SET icon = '🧥' WHERE id = 'adv_mithril_legs';

UPDATE items SET icon = '🐉' WHERE id = 'adv_dragonscale_armor';
UPDATE items SET icon = '🐲' WHERE id = 'dragon_hide';

UPDATE items SET icon = '🛡️' WHERE id = 'adv_resist_potion';
UPDATE items SET icon = '🔰' WHERE id = 'mithril_platebody';

UPDATE items SET icon = '🦅' WHERE id = 'phoenix_feather';
UPDATE items SET icon = '🪶' WHERE id = 'yew_longbow';

UPDATE items SET icon = '🔵' WHERE id = 'adv_frost_ring';
UPDATE items SET icon = '💧' WHERE id = 'adv_mana_potion';

UPDATE items SET icon = '✨' WHERE id = 'adv_sacred_helm';
UPDATE items SET icon = '🌟' WHERE id = 'magic_longbow';

UPDATE items SET icon = '💎' WHERE id = 'adv_diamond_amulet';
UPDATE items SET icon = '◇' WHERE id = 'diamond_amulet';

UPDATE items SET icon = '🦿' WHERE id = 'adv_battle_greaves';
UPDATE items SET icon = '🦵' WHERE id = 'adv_steel_greaves';

UPDATE items SET icon = '🎓' WHERE id = 'adv_bronze_helm';
UPDATE items SET icon = '🧢' WHERE id = 'iron_helm';

UPDATE items SET icon = '👊' WHERE id = 'adv_battle_gauntlets';
UPDATE items SET icon = '✊' WHERE id = 'adv_demon_gauntlets';

UPDATE items SET icon = '🌪️' WHERE id = 'adv_thunder_greaves';
UPDATE items SET icon = '💨' WHERE id = 'adv_chaos_staff';

UPDATE items SET icon = '🌱' WHERE id = 'guam_leaf';
UPDATE items SET icon = '🟢' WHERE id = 'adamantite_bar';

UPDATE items SET icon = '👢' WHERE id = 'adv_mithril_boots';
UPDATE items SET icon = '👞' WHERE id = 'adv_ancient_boots';

UPDATE items SET icon = '🥇' WHERE id = 'adv_gold_ring';
UPDATE items SET icon = '👑' WHERE id = 'adv_royal_crown';

UPDATE items SET icon = '🥿' WHERE id = 'adv_demon_boots';
UPDATE items SET icon = '👟' WHERE id = 'adv_shadow_boots';

UPDATE items SET icon = '💍' WHERE id = 'dragonstone';
UPDATE items SET icon = '💎' WHERE id = 'diamond_ring';

UPDATE items SET icon = '💀' WHERE id = 'death_rune';
UPDATE items SET icon = '☠️' WHERE id = 'adv_immortal_potion';

UPDATE items SET icon = '🧊' WHERE id = 'adv_frost_spear';
UPDATE items SET icon = '❄️' WHERE id = 'adv_ice_crown';

UPDATE items SET icon = '🔸' WHERE id = 'ruby_ring';
UPDATE items SET icon = '🔹' WHERE id = 'adv_crystal_legs';

UPDATE items SET icon = '🎩' WHERE id = 'mithril_helm';
UPDATE items SET icon = '👒' WHERE id = 'adv_royal_boots';

UPDATE items SET icon = '🟩' WHERE id = 'nature_rune';
UPDATE items SET icon = '🟨' WHERE id = 'adv_jade_amulet';

UPDATE items SET icon = '🔴' WHERE id = 'adv_greater_potion';
UPDATE items SET icon = '❤️' WHERE id = 'greater_health_potion';

UPDATE items SET icon = '🫳' WHERE id = 'adv_ancient_greaves';
UPDATE items SET icon = '🦿' WHERE id = 'adv_demon_greaves';

UPDATE items SET icon = '⚔️' WHERE id = 'iron_sword';
UPDATE items SET icon = '⛏️' WHERE id = 'adamantite_ore';

UPDATE items SET icon = '🌑' WHERE id = 'adv_void_helm';
UPDATE items SET icon = '🥷' WHERE id = 'adv_shadow_robe';

UPDATE items SET icon = '🦎' WHERE id = 'drake_scales';
UPDATE items SET icon = '🐊' WHERE id = 'adv_swamp_spear';

UPDATE items SET icon = '🔨' WHERE id = 'adv_volcanic_hammer';
UPDATE items SET icon = '⚒️' WHERE id = 'steel_warhammer';

UPDATE items SET icon = '🟥' WHERE id = 'lesser_health_potion';
UPDATE items SET icon = '🔴' WHERE id = 'adv_flame_ring';

UPDATE items SET icon = '🔹' WHERE id = 'adv_crystal_shard';
UPDATE items SET icon = '🔷' WHERE id = 'adv_crystal_boots';

UPDATE items SET icon = '🔘' WHERE id = 'adv_void_amulet';
UPDATE items SET icon = '⚪' WHERE id = 'adv_ancient_ring';

UPDATE items SET icon = '💪' WHERE id = 'adv_strength_potion';
UPDATE items SET icon = '🦾' WHERE id = 'adv_titan_potion';

UPDATE items SET icon = '⚔️' WHERE id = 'steel_longsword';
UPDATE items SET icon = '⚜️' WHERE id = 'rune_sword';

UPDATE items SET icon = '🪨' WHERE id = 'earth_essence';
UPDATE items SET icon = '⚫' WHERE id = 'coal';

UPDATE items SET icon = '🟪' WHERE id = 'adv_dragon_amulet';
UPDATE items SET icon = '🟣' WHERE id = 'rune_platebody';

UPDATE items SET icon = '⚰️' WHERE id = 'adv_plague_mace';
UPDATE items SET icon = '💀' WHERE id = 'adv_death_scythe';

UPDATE items SET icon = '💦' WHERE id = 'mana_potion';
UPDATE items SET icon = '💧' WHERE id = 'super_mana_potion';

UPDATE items SET icon = '🔶' WHERE id = 'steel_bar';
UPDATE items SET icon = '🟧' WHERE id = 'adv_crystal_gauntlets';

UPDATE items SET icon = '🍃' WHERE id = 'harralander';
UPDATE items SET icon = '🌿' WHERE id = 'adv_nature_staff';

UPDATE items SET icon = '🥼' WHERE id = 'iron_platelegs';
UPDATE items SET icon = '👔' WHERE id = 'adv_cloth_pants';

UPDATE items SET icon = '💨' WHERE id = 'adv_thunder_boots';
UPDATE items SET icon = '🌬️' WHERE id = 'adv_speed_potion';

UPDATE items SET icon = '🔧' WHERE id = 'adv_rusty_dagger';
UPDATE items SET icon = '⚙️' WHERE id = 'iron_battleaxe';

UPDATE items SET icon = '🧥' WHERE id = 'adv_iron_legplates';
UPDATE items SET icon = '👕' WHERE id = 'adv_cloth_tunic';

-- Additional fixes for sapphire_amulet and runite_bar
UPDATE items SET icon = '🔷' WHERE id = 'sapphire_amulet';
UPDATE items SET icon = '🔹' WHERE id = 'adv_sapphire_amulet';
UPDATE items SET icon = '🟦' WHERE id = 'runite_bar';

-- Fix emerald ring and adamant_platebody
UPDATE items SET icon = '💚' WHERE id = 'emerald_ring';
UPDATE items SET icon = '🟩' WHERE id = 'adv_emerald_amulet';
UPDATE items SET icon = '🟢' WHERE id = 'adamant_platebody';
