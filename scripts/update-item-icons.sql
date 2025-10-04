-- Update all item icons with unique, thematic icons
-- Generated to ensure every item has a distinct, appropriate icon

-- WEAPONS --

-- Swords (Legendary)
UPDATE items SET icon = '⚔️' WHERE id = 'rune_sword';
UPDATE items SET icon = '🗡️' WHERE id = 'adv_holy_sword';
UPDATE items SET icon = '🔥' WHERE id = 'adv_inferno_sword';
UPDATE items SET icon = '❄️' WHERE id = 'adv_dragon_slayer';

-- Swords (Epic)
UPDATE items SET icon = '⚡' WHERE id = 'adamant_sword';
UPDATE items SET icon = '🌟' WHERE id = 'adv_flame_sword';
UPDATE items SET icon = '💎' WHERE id = 'adv_mithril_sword';
UPDATE items SET icon = '🔮' WHERE id = 'adv_runic_sword';
UPDATE items SET icon = '🌊' WHERE id = 'adv_silver_rapier';
UPDATE items SET icon = '🌿' WHERE id = 'adv_thorn_blade';
UPDATE items SET icon = '🐍' WHERE id = 'adv_venomous_blade';

-- Swords (Rare/Uncommon/Common)
UPDATE items SET icon = '⚔️' WHERE id = 'steel_longsword';
UPDATE items SET icon = '🗡️' WHERE id = 'adv_steel_longsword';
UPDATE items SET icon = '🔪' WHERE id = 'steel_sword';
UPDATE items SET icon = '⛏️' WHERE id = 'iron_sword';
UPDATE items SET icon = '🛡️' WHERE id = 'bronze_sword';
UPDATE items SET icon = '🪓' WHERE id = 'adv_bronze_shortsword';
UPDATE items SET icon = '🌲' WHERE id = 'wooden_sword';

-- Daggers
UPDATE items SET icon = '🗡️' WHERE id = 'adv_shadow_dagger';
UPDATE items SET icon = '🌑' WHERE id = 'adv_void_dagger';
UPDATE items SET icon = '✨' WHERE id = 'adv_enchanted_dagger';
UPDATE items SET icon = '🦀' WHERE id = 'adv_rusty_dagger';

-- Axes
UPDATE items SET icon = '🪓' WHERE id = 'adv_lava_axe';
UPDATE items SET icon = '⛰️' WHERE id = 'adv_mountain_axe';
UPDATE items SET icon = '👹' WHERE id = 'adv_demon_axe';
UPDATE items SET icon = '🌲' WHERE id = 'mithril_greataxe';
UPDATE items SET icon = '⚒️' WHERE id = 'iron_battleaxe';
UPDATE items SET icon = '🪵' WHERE id = 'bronze_axe';

-- Hammers/Maces
UPDATE items SET icon = '🔨' WHERE id = 'adv_volcanic_hammer';
UPDATE items SET icon = '⚡' WHERE id = 'adv_thunder_hammer';
UPDATE items SET icon = '🔨' WHERE id = 'adv_battle_hammer';
UPDATE items SET icon = '⚒️' WHERE id = 'steel_warhammer';
UPDATE items SET icon = '🗿' WHERE id = 'adv_blessed_mace';
UPDATE items SET icon = '☠️' WHERE id = 'adv_plague_mace';
UPDATE items SET icon = '⛏️' WHERE id = 'adv_iron_mace';
UPDATE items SET icon = '🏏' WHERE id = 'adv_wooden_club';

-- Scythes/Special Melee
UPDATE items SET icon = '💀' WHERE id = 'adv_death_scythe';
UPDATE items SET icon = '🌌' WHERE id = 'adv_soul_reaver';
UPDATE items SET icon = '🗡️' WHERE id = 'adv_elven_blade';
UPDATE items SET icon = '🌙' WHERE id = 'adv_druid_scimitar';
UPDATE items SET icon = '⚔️' WHERE id = 'mithril_scimitar';

-- Spears/Polearms
UPDATE items SET icon = '🔱' WHERE id = 'adv_tidal_trident';
UPDATE items SET icon = '🧊' WHERE id = 'adv_frost_spear';
UPDATE items SET icon = '🌲' WHERE id = 'adv_forest_spear';
UPDATE items SET icon = '🐊' WHERE id = 'adv_swamp_spear';

-- Whips
UPDATE items SET icon = '🌿' WHERE id = 'adv_vine_whip';

-- Bows (Legendary)
UPDATE items SET icon = '🏹' WHERE id = 'adv_wooden_greatbow';
UPDATE items SET icon = '⚡' WHERE id = 'adv_lightning_bow';
UPDATE items SET icon = '✨' WHERE id = 'adv_star_bow';
UPDATE items SET icon = '🌟' WHERE id = 'magic_longbow';

-- Bows (Epic/Rare)
UPDATE items SET icon = '🎯' WHERE id = 'adv_ranger_longbow';
UPDATE items SET icon = '👻' WHERE id = 'adv_spectral_bow';
UPDATE items SET icon = '🌳' WHERE id = 'yew_longbow';
UPDATE items SET icon = '🍁' WHERE id = 'maple_longbow';
UPDATE items SET icon = '🌊' WHERE id = 'willow_comp_bow';
UPDATE items SET icon = '🌲' WHERE id = 'oak_longbow';
UPDATE items SET icon = '🦌' WHERE id = 'adv_hunter_bow';
UPDATE items SET icon = '🏹' WHERE id = 'shortbow';

-- Staves (Legendary)
UPDATE items SET icon = '🔥' WHERE id = 'adv_phoenix_staff';
UPDATE items SET icon = '🌿' WHERE id = 'adv_nature_staff';
UPDATE items SET icon = '🌀' WHERE id = 'adv_chaos_staff';
UPDATE items SET icon = '😈' WHERE id = 'adv_cursed_staff';

-- Staves (Epic/Rare)
UPDATE items SET icon = '💎' WHERE id = 'adv_crystal_staff';
UPDATE items SET icon = '🔮' WHERE id = 'adv_arcane_scepter';
UPDATE items SET icon = '✨' WHERE id = 'adv_mystic_wand';
UPDATE items SET icon = '📖' WHERE id = 'adv_apprentice_staff';

-- ARMOR --

-- Legendary Sets
UPDATE items SET icon = '👑' WHERE id = 'adv_ancient_mask';
UPDATE items SET icon = '🛡️' WHERE id = 'adv_ancient_armor';
UPDATE items SET icon = '⚔️' WHERE id = 'adv_ancient_gauntlets';
UPDATE items SET icon = '🦵' WHERE id = 'adv_ancient_greaves';
UPDATE items SET icon = '👢' WHERE id = 'adv_ancient_boots';
UPDATE items SET icon = '💍' WHERE id = 'adv_ancient_ring';
UPDATE items SET icon = '📿' WHERE id = 'adv_ancient_amulet';

-- Demon Set
UPDATE items SET icon = '😈' WHERE id = 'adv_demon_mask';
UPDATE items SET icon = '🔥' WHERE id = 'adv_demon_armor';
UPDATE items SET icon = '👹' WHERE id = 'adv_demon_gauntlets';
UPDATE items SET icon = '🦿' WHERE id = 'adv_demon_greaves';
UPDATE items SET icon = '🥾' WHERE id = 'adv_demon_boots';

-- Flame Set
UPDATE items SET icon = '🔥' WHERE id = 'adv_flame_crown';
UPDATE items SET icon = '🌋' WHERE id = 'adv_flame_armor';
UPDATE items SET icon = '🔥' WHERE id = 'adv_flame_gauntlets';
UPDATE items SET icon = '🌡️' WHERE id = 'adv_flame_greaves';
UPDATE items SET icon = '🦶' WHERE id = 'adv_flame_boots';
UPDATE items SET icon = '💍' WHERE id = 'adv_flame_ring';
UPDATE items SET icon = '🔥' WHERE id = 'adv_flame_amulet';

-- Frost Set
UPDATE items SET icon = '❄️' WHERE id = 'adv_ice_crown';
UPDATE items SET icon = '🧊' WHERE id = 'adv_frost_armor';
UPDATE items SET icon = '🥶' WHERE id = 'adv_frost_gauntlets';
UPDATE items SET icon = '⛄' WHERE id = 'adv_frost_greaves';
UPDATE items SET icon = '🧊' WHERE id = 'adv_frost_boots';
UPDATE items SET icon = '💎' WHERE id = 'adv_frost_ring';
UPDATE items SET icon = '❄️' WHERE id = 'adv_frost_amulet';

-- Holy Set
UPDATE items SET icon = '✨' WHERE id = 'adv_sacred_helm';
UPDATE items SET icon = '⚜️' WHERE id = 'adv_holy_armor';
UPDATE items SET icon = '🙏' WHERE id = 'adv_holy_gauntlets';
UPDATE items SET icon = '✝️' WHERE id = 'adv_holy_greaves';
UPDATE items SET icon = '👼' WHERE id = 'adv_holy_boots';
UPDATE items SET icon = '💍' WHERE id = 'adv_holy_ring';
UPDATE items SET icon = '📿' WHERE id = 'adv_holy_amulet';

-- Thunder Set
UPDATE items SET icon = '⚡' WHERE id = 'adv_thunder_helm';
UPDATE items SET icon = '🌩️' WHERE id = 'adv_thunder_armor';
UPDATE items SET icon = '⚡' WHERE id = 'adv_thunder_gauntlets';
UPDATE items SET icon = '🌪️' WHERE id = 'adv_thunder_greaves';
UPDATE items SET icon = '⛈️' WHERE id = 'adv_thunder_boots';

-- Void Set
UPDATE items SET icon = '🌑' WHERE id = 'adv_void_helm';
UPDATE items SET icon = '🌌' WHERE id = 'adv_void_armor';
UPDATE items SET icon = '⚫' WHERE id = 'adv_void_gauntlets';
UPDATE items SET icon = '🕳️' WHERE id = 'adv_void_greaves';
UPDATE items SET icon = '🌑' WHERE id = 'adv_void_boots';
UPDATE items SET icon = '💍' WHERE id = 'adv_void_ring';
UPDATE items SET icon = '📿' WHERE id = 'adv_void_amulet';

-- Dragon Set
UPDATE items SET icon = '🐲' WHERE id = 'adv_dragon_helm';
UPDATE items SET icon = '🐉' WHERE id = 'adv_dragonscale_armor';
UPDATE items SET icon = '🦎' WHERE id = 'adv_dragonscale_gauntlets';
UPDATE items SET icon = '🦖' WHERE id = 'adv_dragonscale_legs';
UPDATE items SET icon = '🐾' WHERE id = 'adv_dragonscale_boots';
UPDATE items SET icon = '💍' WHERE id = 'adv_dragon_ring';
UPDATE items SET icon = '📿' WHERE id = 'adv_dragon_amulet';

-- Phoenix Set
UPDATE items SET icon = '🦅' WHERE id = 'adv_phoenix_helm';
UPDATE items SET icon = '🔥' WHERE id = 'adv_phoenix_armor';
UPDATE items SET icon = '💍' WHERE id = 'adv_phoenix_ring';
UPDATE items SET icon = '📿' WHERE id = 'adv_phoenix_amulet';

-- Crystal Set
UPDATE items SET icon = '💎' WHERE id = 'adv_crystal_tiara';
UPDATE items SET icon = '💠' WHERE id = 'adv_crystal_armor';
UPDATE items SET icon = '💎' WHERE id = 'adv_crystal_gauntlets';
UPDATE items SET icon = '🔷' WHERE id = 'adv_crystal_legs';
UPDATE items SET icon = '💠' WHERE id = 'adv_crystal_boots';

-- Royal Set
UPDATE items SET icon = '👑' WHERE id = 'adv_royal_crown';
UPDATE items SET icon = '🏰' WHERE id = 'adv_royal_armor';
UPDATE items SET icon = '🤴' WHERE id = 'adv_royal_gauntlets';
UPDATE items SET icon = '🦵' WHERE id = 'adv_royal_greaves';
UPDATE items SET icon = '👞' WHERE id = 'adv_royal_boots';

-- Shadow Set
UPDATE items SET icon = '🌑' WHERE id = 'adv_shadow_hood';
UPDATE items SET icon = '🥷' WHERE id = 'adv_shadow_robe';
UPDATE items SET icon = '🖤' WHERE id = 'adv_shadow_gloves';
UPDATE items SET icon = '👤' WHERE id = 'adv_shadow_leggings';
UPDATE items SET icon = '👟' WHERE id = 'adv_shadow_boots';
UPDATE items SET icon = '💍' WHERE id = 'adv_shadow_ring';
UPDATE items SET icon = '📿' WHERE id = 'adv_shadow_amulet';

-- Metal Armor (Mithril)
UPDATE items SET icon = '🪖' WHERE id = 'adv_mithril_helm';
UPDATE items SET icon = '🛡️' WHERE id = 'adv_mithril_armor';
UPDATE items SET icon = '🧤' WHERE id = 'adv_mithril_gauntlets';
UPDATE items SET icon = '🦿' WHERE id = 'adv_mithril_legs';
UPDATE items SET icon = '🥾' WHERE id = 'adv_mithril_boots';
UPDATE items SET icon = '⛑️' WHERE id = 'mithril_helm';
UPDATE items SET icon = '🛡️' WHERE id = 'mithril_platebody';

-- Metal Armor (Adamantite)
UPDATE items SET icon = '🛡️' WHERE id = 'adamant_platebody';

-- Metal Armor (Rune)
UPDATE items SET icon = '🛡️' WHERE id = 'rune_platebody';

-- Metal Armor (Steel)
UPDATE items SET icon = '⛑️' WHERE id = 'adv_steel_helm';
UPDATE items SET icon = '🛡️' WHERE id = 'adv_steel_breastplate';
UPDATE items SET icon = '🧤' WHERE id = 'adv_steel_gauntlets';
UPDATE items SET icon = '🦵' WHERE id = 'adv_steel_greaves';
UPDATE items SET icon = '🥾' WHERE id = 'adv_steel_boots';
UPDATE items SET icon = '⚔️' WHERE id = 'steel_armor';
UPDATE items SET icon = '🪖' WHERE id = 'steel_helm';
UPDATE items SET icon = '🛡️' WHERE id = 'steel_platebody';
UPDATE items SET icon = '🦿' WHERE id = 'steel_platelegs';

-- Metal Armor (Iron)
UPDATE items SET icon = '⛑️' WHERE id = 'adv_iron_helmet';
UPDATE items SET icon = '🛡️' WHERE id = 'adv_iron_armor';
UPDATE items SET icon = '🧤' WHERE id = 'adv_iron_gauntlets';
UPDATE items SET icon = '🦵' WHERE id = 'adv_iron_legplates';
UPDATE items SET icon = '🥾' WHERE id = 'adv_iron_boots';
UPDATE items SET icon = '⚔️' WHERE id = 'iron_armor';
UPDATE items SET icon = '🪖' WHERE id = 'iron_helm';
UPDATE items SET icon = '🛡️' WHERE id = 'iron_platebody';
UPDATE items SET icon = '🦿' WHERE id = 'iron_platelegs';

-- Metal Armor (Bronze)
UPDATE items SET icon = '⛑️' WHERE id = 'adv_bronze_helm';
UPDATE items SET icon = '🛡️' WHERE id = 'adv_bronze_chestplate';
UPDATE items SET icon = '🧤' WHERE id = 'adv_bronze_gauntlets';
UPDATE items SET icon = '🦵' WHERE id = 'adv_bronze_greaves';
UPDATE items SET icon = '🥾' WHERE id = 'adv_bronze_boots';
UPDATE items SET icon = '🪖' WHERE id = 'bronze_helm';
UPDATE items SET icon = '🛡️' WHERE id = 'bronze_platebody';
UPDATE items SET icon = '🦿' WHERE id = 'bronze_platelegs';

-- Leather Armor
UPDATE items SET icon = '🎩' WHERE id = 'adv_leather_cap';
UPDATE items SET icon = '🧥' WHERE id = 'adv_leather_vest';
UPDATE items SET icon = '🧤' WHERE id = 'adv_leather_gloves';
UPDATE items SET icon = '👖' WHERE id = 'adv_leather_leggings';
UPDATE items SET icon = '👢' WHERE id = 'adv_leather_boots';
UPDATE items SET icon = '🦺' WHERE id = 'leather_armor';

-- Cloth/Starter Armor
UPDATE items SET icon = '👕' WHERE id = 'adv_cloth_tunic';
UPDATE items SET icon = '🧤' WHERE id = 'adv_cloth_gloves';
UPDATE items SET icon = '👖' WHERE id = 'adv_cloth_pants';
UPDATE items SET icon = '👟' WHERE id = 'adv_cloth_shoes';

-- Special Armor
UPDATE items SET icon = '🌿' WHERE id = 'adv_nature_armor';
UPDATE items SET icon = '🌺' WHERE id = 'adv_nature_wreath';
UPDATE items SET icon = '⭐' WHERE id = 'adv_star_armor';
UPDATE items SET icon = '🔮' WHERE id = 'adv_arcane_robe';
UPDATE items SET icon = '😇' WHERE id = 'adv_blessed_armor';
UPDATE items SET icon = '☠️' WHERE id = 'adv_cursed_armor';
UPDATE items SET icon = '⚔️' WHERE id = 'adv_battle_plate';
UPDATE items SET icon = '⛑️' WHERE id = 'adv_battle_helm';
UPDATE items SET icon = '🧤' WHERE id = 'adv_battle_gauntlets';
UPDATE items SET icon = '🦵' WHERE id = 'adv_battle_greaves';
UPDATE items SET icon = '🥾' WHERE id = 'adv_battle_boots';

-- Elven Armor
UPDATE items SET icon = '👑' WHERE id = 'adv_elven_circlet';
UPDATE items SET icon = '🧝' WHERE id = 'adv_elven_chainmail';

-- Rings (Gemstone)
UPDATE items SET icon = '💍' WHERE id = 'diamond_ring';
UPDATE items SET icon = '💎' WHERE id = 'ruby_ring';
UPDATE items SET icon = '💚' WHERE id = 'emerald_ring';
UPDATE items SET icon = '💙' WHERE id = 'sapphire_ring';
UPDATE items SET icon = '🪙' WHERE id = 'adv_gold_ring';
UPDATE items SET icon = '⚪' WHERE id = 'adv_silver_ring';
UPDATE items SET icon = '🟤' WHERE id = 'copper_ring';
UPDATE items SET icon = '🟫' WHERE id = 'adv_copper_ring';

-- Rings (Special)
UPDATE items SET icon = '💪' WHERE id = 'adv_power_ring';
UPDATE items SET icon = '🛡️' WHERE id = 'adv_protection_ring';
UPDATE items SET icon = '❤️' WHERE id = 'adv_vitality_ring';
UPDATE items SET icon = '🧠' WHERE id = 'adv_wisdom_ring';

-- Amulets (Gemstone)
UPDATE items SET icon = '💎' WHERE id = 'diamond_amulet';
UPDATE items SET icon = '💎' WHERE id = 'adv_diamond_amulet';
UPDATE items SET icon = '❤️' WHERE id = 'ruby_amulet';
UPDATE items SET icon = '❤️' WHERE id = 'adv_ruby_amulet';
UPDATE items SET icon = '💚' WHERE id = 'emerald_amulet';
UPDATE items SET icon = '💚' WHERE id = 'adv_emerald_amulet';
UPDATE items SET icon = '💙' WHERE id = 'sapphire_amulet';
UPDATE items SET icon = '💙' WHERE id = 'adv_sapphire_amulet';
UPDATE items SET icon = '🟢' WHERE id = 'adv_jade_amulet';
UPDATE items SET icon = '🟤' WHERE id = 'copper_amulet';
UPDATE items SET icon = '🦴' WHERE id = 'adv_bone_amulet';
UPDATE items SET icon = '🪵' WHERE id = 'adv_wooden_amulet';

-- CONSUMABLES --

-- Legendary Potions
UPDATE items SET icon = '🧪' WHERE id = 'supreme_elixir';
UPDATE items SET icon = '🍯' WHERE id = 'adv_ambrosia';
UPDATE items SET icon = '☠️' WHERE id = 'adv_immortal_potion';
UPDATE items SET icon = '🐦' WHERE id = 'adv_phoenix_tear';

-- Epic Potions
UPDATE items SET icon = '💊' WHERE id = 'super_health_potion';
UPDATE items SET icon = '💧' WHERE id = 'super_mana_potion';
UPDATE items SET icon = '🧃' WHERE id = 'elixir_of_vitality';
UPDATE items SET icon = '🍵' WHERE id = 'adv_rejuv_potion';
UPDATE items SET icon = '🛡️' WHERE id = 'adv_resist_potion';
UPDATE items SET icon = '💪' WHERE id = 'adv_titan_potion';

-- Rare Potions
UPDATE items SET icon = '❤️' WHERE id = 'greater_health_potion';
UPDATE items SET icon = '❤️' WHERE id = 'adv_greater_potion';
UPDATE items SET icon = '💙' WHERE id = 'greater_mana_potion';
UPDATE items SET icon = '💧' WHERE id = 'adv_mana_potion';
UPDATE items SET icon = '🍀' WHERE id = 'adv_luck_potion';
UPDATE items SET icon = '💰' WHERE id = 'adv_gold_potion';
UPDATE items SET icon = '⭐' WHERE id = 'adv_exp_potion';
UPDATE items SET icon = '🧉' WHERE id = 'adv_elixir';

-- Uncommon Potions
UPDATE items SET icon = '🛡️' WHERE id = 'adv_defense_potion';
UPDATE items SET icon = '💪' WHERE id = 'adv_strength_potion';
UPDATE items SET icon = '💨' WHERE id = 'adv_speed_potion';

-- Common Potions
UPDATE items SET icon = '🧪' WHERE id = 'health_potion';
UPDATE items SET icon = '🔵' WHERE id = 'mana_potion';
UPDATE items SET icon = '💊' WHERE id = 'lesser_health_potion';
UPDATE items SET icon = '💧' WHERE id = 'lesser_mana_potion';

-- Food & Natural Items
UPDATE items SET icon = '🍓' WHERE id = 'adv_berry';
UPDATE items SET icon = '🍄' WHERE id = 'adv_mushroom';
UPDATE items SET icon = '🍯' WHERE id = 'adv_honey';
UPDATE items SET icon = '🌿' WHERE id = 'adv_herb';
UPDATE items SET icon = '💎' WHERE id = 'adv_crystal_shard';

-- MATERIALS --

-- Ores
UPDATE items SET icon = '🟤' WHERE id = 'copper_ore';
UPDATE items SET icon = '🪨' WHERE id = 'tin_ore';
UPDATE items SET icon = '⚫' WHERE id = 'coal';
UPDATE items SET icon = '⚙️' WHERE id = 'iron_ore';
UPDATE items SET icon = '🔷' WHERE id = 'mithril_ore';
UPDATE items SET icon = '🟢' WHERE id = 'adamantite_ore';
UPDATE items SET icon = '🔵' WHERE id = 'runite_ore';

-- Bars
UPDATE items SET icon = '🟫' WHERE id = 'copper_bar';
UPDATE items SET icon = '🟤' WHERE id = 'bronze_bar';
UPDATE items SET icon = '⚙️' WHERE id = 'iron_bar';
UPDATE items SET icon = '🔶' WHERE id = 'steel_bar';
UPDATE items SET icon = '💠' WHERE id = 'mithril_bar';
UPDATE items SET icon = '🟩' WHERE id = 'adamantite_bar';
UPDATE items SET icon = '🟦' WHERE id = 'runite_bar';

-- Gems
UPDATE items SET icon = '💙' WHERE id = 'sapphire';
UPDATE items SET icon = '💚' WHERE id = 'emerald';
UPDATE items SET icon = '❤️' WHERE id = 'ruby';
UPDATE items SET icon = '💎' WHERE id = 'diamond';
UPDATE items SET icon = '🐉' WHERE id = 'dragonstone';

-- Logs
UPDATE items SET icon = '🪵' WHERE id = 'oak_log';
UPDATE items SET icon = '🌳' WHERE id = 'willow_log';
UPDATE items SET icon = '🍁' WHERE id = 'maple_log';
UPDATE items SET icon = '🌲' WHERE id = 'yew_log';
UPDATE items SET icon = '✨' WHERE id = 'magic_log';

-- Fish
UPDATE items SET icon = '🦐' WHERE id = 'raw_shrimp';
UPDATE items SET icon = '🐟' WHERE id = 'raw_sardine';
UPDATE items SET icon = '🐠' WHERE id = 'raw_trout';
UPDATE items SET icon = '🐡' WHERE id = 'raw_salmon';
UPDATE items SET icon = '🦞' WHERE id = 'raw_lobster';
UPDATE items SET icon = '🗡️' WHERE id = 'raw_swordfish';
UPDATE items SET icon = '🦈' WHERE id = 'raw_shark';
UPDATE items SET icon = '🐋' WHERE id = 'raw_manta_ray';

-- Animal Materials
UPDATE items SET icon = '🐰' WHERE id = 'rabbit_meat';
UPDATE items SET icon = '🐺' WHERE id = 'wolf_pelt';
UPDATE items SET icon = '🦌' WHERE id = 'deer_antlers';
UPDATE items SET icon = '🐻' WHERE id = 'bear_hide';
UPDATE items SET icon = '🦎' WHERE id = 'drake_scales';
UPDATE items SET icon = '🐉' WHERE id = 'dragon_hide';
UPDATE items SET icon = '🔥' WHERE id = 'chimera_fur';
UPDATE items SET icon = '🦅' WHERE id = 'phoenix_feather';

-- Herbs
UPDATE items SET icon = '🌱' WHERE id = 'guam_leaf';
UPDATE items SET icon = '🍀' WHERE id = 'marrentill';
UPDATE items SET icon = '🌿' WHERE id = 'tarromin';
UPDATE items SET icon = '🍃' WHERE id = 'harralander';
UPDATE items SET icon = '🌾' WHERE id = 'ranarr_weed';
UPDATE items SET icon = '🌿' WHERE id = 'irit_leaf';
UPDATE items SET icon = '🍀' WHERE id = 'avantoe';
UPDATE items SET icon = '🌱' WHERE id = 'kwuarm';
UPDATE items SET icon = '🌿' WHERE id = 'snapdragon';
UPDATE items SET icon = '🌾' WHERE id = 'torstol';

-- Essences
UPDATE items SET icon = '💨' WHERE id = 'air_essence';
UPDATE items SET icon = '💧' WHERE id = 'water_essence';
UPDATE items SET icon = '🪨' WHERE id = 'earth_essence';
UPDATE items SET icon = '🔥' WHERE id = 'fire_essence';

-- Runes
UPDATE items SET icon = '🌿' WHERE id = 'nature_rune';
UPDATE items SET icon = '🌀' WHERE id = 'chaos_rune';
UPDATE items SET icon = '💀' WHERE id = 'death_rune';
UPDATE items SET icon = '🩸' WHERE id = 'blood_rune';
UPDATE items SET icon = '👻' WHERE id = 'soul_rune';

-- Currency
UPDATE items SET icon = '��' WHERE id = 'gold_coin';
