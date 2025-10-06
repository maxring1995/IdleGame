-- Migration: Add Zone Modifier System
-- Makes exploration zones affect all game systems (combat, gathering, crafting, quests, merchants)

-- Add system_modifiers column to world_zones table
ALTER TABLE world_zones
ADD COLUMN IF NOT EXISTS system_modifiers JSONB DEFAULT '{}'::jsonb;

-- Comment on the new column
COMMENT ON COLUMN world_zones.system_modifiers IS 'JSON object containing modifiers that affect various game systems while in this zone';

-- Create function to get zone modifiers for a character
CREATE OR REPLACE FUNCTION get_character_zone_modifiers(p_character_id uuid)
RETURNS JSONB AS $$
DECLARE
  v_zone_id uuid;
  v_modifiers JSONB;
BEGIN
  -- Get character's current zone
  SELECT current_zone_id INTO v_zone_id
  FROM characters
  WHERE id = p_character_id;

  -- If no zone, return empty modifiers
  IF v_zone_id IS NULL THEN
    RETURN '{}'::jsonb;
  END IF;

  -- Get zone modifiers
  SELECT COALESCE(system_modifiers, '{}'::jsonb) INTO v_modifiers
  FROM world_zones
  WHERE id = v_zone_id;

  RETURN v_modifiers;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_character_zone_modifiers IS 'Returns the zone modifiers for a character based on their current zone';

-- Create function to apply combat modifiers
CREATE OR REPLACE FUNCTION apply_zone_combat_modifiers(
  p_character_id uuid,
  p_base_damage integer,
  p_base_defense integer,
  OUT modified_damage integer,
  OUT modified_defense integer,
  OUT mp_regen_bonus numeric,
  OUT hp_regen_bonus numeric
) AS $$
DECLARE
  v_modifiers JSONB;
  v_combat_mods JSONB;
BEGIN
  -- Get zone modifiers
  v_modifiers := get_character_zone_modifiers(p_character_id);
  v_combat_mods := v_modifiers->'combat';

  -- Apply damage bonus (default 0)
  modified_damage := p_base_damage * (1 + COALESCE((v_combat_mods->>'damage_bonus')::numeric, 0));

  -- Apply defense bonus (default 0)
  modified_defense := p_base_defense * (1 + COALESCE((v_combat_mods->>'defense_bonus')::numeric, 0));

  -- Get regen bonuses
  mp_regen_bonus := COALESCE((v_combat_mods->>'mp_regen_bonus')::numeric, 0);
  hp_regen_bonus := COALESCE((v_combat_mods->>'hp_regen_bonus')::numeric, 0);
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION apply_zone_combat_modifiers IS 'Applies zone modifiers to combat stats';

-- Create function to apply gathering modifiers
CREATE OR REPLACE FUNCTION apply_zone_gathering_modifiers(
  p_character_id uuid,
  p_skill_type text,
  p_base_time_ms integer,
  OUT modified_time_ms integer,
  OUT spawn_rate_modifier numeric,
  OUT xp_bonus numeric
) AS $$
DECLARE
  v_modifiers JSONB;
  v_gathering_mods JSONB;
  v_spawn_mods JSONB;
BEGIN
  -- Get zone modifiers
  v_modifiers := get_character_zone_modifiers(p_character_id);
  v_gathering_mods := v_modifiers->'gathering';

  -- Get spawn rate modifiers
  v_spawn_mods := v_gathering_mods->'spawn_rate_modifiers';
  spawn_rate_modifier := COALESCE((v_spawn_mods->>p_skill_type)::numeric, 1.0);

  -- Apply time reduction from spawn rate (higher spawn = faster gathering)
  -- If spawn_rate is 1.5, gathering is 33% faster (time * 0.67)
  modified_time_ms := (p_base_time_ms / spawn_rate_modifier)::integer;

  -- Get XP bonus
  xp_bonus := COALESCE((v_gathering_mods->>'xp_bonus')::numeric, 0);
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION apply_zone_gathering_modifiers IS 'Applies zone modifiers to gathering operations';

-- Create function to apply crafting modifiers
CREATE OR REPLACE FUNCTION apply_zone_crafting_modifiers(
  p_character_id uuid,
  p_craft_type text, -- e.g., 'alchemy', 'smithing', 'cooking'
  p_base_success_rate numeric,
  p_base_cost integer,
  OUT modified_success_rate numeric,
  OUT modified_cost integer,
  OUT quality_bonus numeric
) AS $$
DECLARE
  v_modifiers JSONB;
  v_crafting_mods JSONB;
  v_success_mods JSONB;
  v_cost_mods JSONB;
  v_type_bonus numeric := 0;
  v_all_bonus numeric := 0;
BEGIN
  -- Get zone modifiers
  v_modifiers := get_character_zone_modifiers(p_character_id);
  v_crafting_mods := v_modifiers->'crafting';

  -- Get success rate bonuses
  v_success_mods := v_crafting_mods->'success_rate_bonus';
  v_type_bonus := COALESCE((v_success_mods->>p_craft_type)::numeric, 0);
  v_all_bonus := COALESCE((v_success_mods->>'all')::numeric, 0);
  modified_success_rate := p_base_success_rate + v_type_bonus + v_all_bonus;

  -- Get cost reduction
  v_cost_mods := v_crafting_mods->'cost_reduction';
  v_type_bonus := COALESCE((v_cost_mods->>p_craft_type)::numeric, 0);
  v_all_bonus := COALESCE((v_cost_mods->>'all')::numeric, 0);
  modified_cost := (p_base_cost * (1 - v_type_bonus - v_all_bonus))::integer;

  -- Quality bonus (affects item stats/rarity chance)
  quality_bonus := COALESCE((v_crafting_mods->>'quality_bonus')::numeric, 0);
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION apply_zone_crafting_modifiers IS 'Applies zone modifiers to crafting operations';

-- Create function to get merchant modifiers
CREATE OR REPLACE FUNCTION get_zone_merchant_modifiers(p_character_id uuid)
RETURNS JSONB AS $$
DECLARE
  v_modifiers JSONB;
BEGIN
  v_modifiers := get_character_zone_modifiers(p_character_id);
  RETURN COALESCE(v_modifiers->'merchants', '{}'::jsonb);
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_zone_merchant_modifiers IS 'Returns merchant-specific modifiers for the character''s current zone';

-- Sample zone modifiers for existing zones

-- Zone 1: Havenbrook Village (balanced, beginner-friendly)
UPDATE world_zones
SET system_modifiers = '{
  "combat": {
    "damage_bonus": 0,
    "defense_bonus": 0.05,
    "hp_regen_bonus": 0.05,
    "mp_regen_bonus": 0,
    "enemy_types": ["goblin", "rat", "wolf"]
  },
  "gathering": {
    "spawn_rate_modifiers": {
      "woodcutting": 1.0,
      "mining": 1.0,
      "fishing": 1.2,
      "hunting": 1.1,
      "alchemy": 0.8,
      "magic": 0.8
    },
    "xp_bonus": 0
  },
  "crafting": {
    "success_rate_bonus": {
      "all": 0.05
    },
    "cost_reduction": {
      "all": 0
    },
    "quality_bonus": 0
  },
  "merchants": {
    "price_modifier": 1.0,
    "unique_items": []
  }
}'::jsonb
WHERE id = '00000000-0000-0000-0000-000000000001';

-- Zone 2: Whispering Woods (high herb/alchemy, nature theme)
UPDATE world_zones
SET system_modifiers = '{
  "combat": {
    "damage_bonus": 0,
    "defense_bonus": 0,
    "hp_regen_bonus": 0.1,
    "mp_regen_bonus": 0.2,
    "enemy_types": ["forest_creature", "nature_spirit", "treant"]
  },
  "gathering": {
    "spawn_rate_modifiers": {
      "woodcutting": 1.5,
      "alchemy": 1.8,
      "hunting": 1.3,
      "mining": 0.3,
      "fishing": 0.5,
      "magic": 1.2
    },
    "xp_bonus": 0.1
  },
  "crafting": {
    "success_rate_bonus": {
      "alchemy": 0.25,
      "all": 0.05
    },
    "cost_reduction": {
      "alchemy": 0.15
    },
    "quality_bonus": 0.1
  },
  "merchants": {
    "price_modifier": 0.95,
    "unique_items": ["forest_cloak", "nature_staff", "herbal_remedy"]
  },
  "quests": {
    "available_chains": ["forest_guardian", "ancient_grove", "nature_balance"]
  }
}'::jsonb
WHERE id = '00000000-0000-0000-0000-000000000002';

-- Zone 3: Ironpeak Foothills (high mining, combat-focused)
UPDATE world_zones
SET system_modifiers = '{
  "combat": {
    "damage_bonus": 0.15,
    "defense_bonus": 0.1,
    "hp_regen_bonus": 0,
    "mp_regen_bonus": -0.1,
    "enemy_types": ["orc", "troll", "stone_elemental"]
  },
  "gathering": {
    "spawn_rate_modifiers": {
      "mining": 2.0,
      "woodcutting": 0.3,
      "alchemy": 0.5,
      "hunting": 1.2,
      "fishing": 0.2,
      "magic": 0.8
    },
    "xp_bonus": 0.15
  },
  "crafting": {
    "success_rate_bonus": {
      "smithing": 0.3,
      "all": 0
    },
    "cost_reduction": {
      "smithing": 0.2
    },
    "quality_bonus": 0.15
  },
  "merchants": {
    "price_modifier": 1.1,
    "unique_items": ["mountain_pickaxe", "stone_armor"]
  },
  "quests": {
    "available_chains": ["mountain_king", "mining_expedition"]
  }
}'::jsonb
WHERE id = '00000000-0000-0000-0000-000000000003';

-- Zone 4: Shadowfen Marsh (poison/dark theme, hunting focused)
UPDATE world_zones
SET system_modifiers = '{
  "combat": {
    "damage_bonus": 0.05,
    "defense_bonus": -0.05,
    "hp_regen_bonus": -0.1,
    "mp_regen_bonus": 0.15,
    "enemy_types": ["swamp_creature", "undead", "witch"]
  },
  "gathering": {
    "spawn_rate_modifiers": {
      "alchemy": 2.0,
      "hunting": 1.8,
      "fishing": 1.5,
      "magic": 1.3,
      "woodcutting": 0.8,
      "mining": 0.3
    },
    "xp_bonus": 0.2
  },
  "crafting": {
    "success_rate_bonus": {
      "alchemy": 0.35,
      "all": 0
    },
    "cost_reduction": {
      "alchemy": 0.25
    },
    "quality_bonus": 0.05
  },
  "merchants": {
    "price_modifier": 1.15,
    "unique_items": ["poison_vial", "swamp_boots", "dark_herbs"]
  },
  "quests": {
    "available_chains": ["witch_hunt", "swamp_mysteries", "undead_plague"]
  }
}'::jsonb
WHERE id = '00000000-0000-0000-0000-000000000004';

-- Zone 5: Emberpeak Mines (fire/smithing theme, extreme mining)
UPDATE world_zones
SET system_modifiers = '{
  "combat": {
    "damage_bonus": 0.2,
    "defense_bonus": 0.15,
    "hp_regen_bonus": -0.05,
    "mp_regen_bonus": -0.15,
    "enemy_types": ["fire_elemental", "demon", "lava_beast"]
  },
  "gathering": {
    "spawn_rate_modifiers": {
      "mining": 3.0,
      "woodcutting": 0.1,
      "alchemy": 0.4,
      "fishing": 0.1,
      "hunting": 0.5,
      "magic": 1.5
    },
    "xp_bonus": 0.3
  },
  "crafting": {
    "success_rate_bonus": {
      "smithing": 0.5,
      "all": 0.1
    },
    "cost_reduction": {
      "smithing": 0.3
    },
    "quality_bonus": 0.25
  },
  "merchants": {
    "price_modifier": 1.2,
    "unique_items": ["molten_ore", "fire_resistant_armor", "ember_gem"]
  },
  "quests": {
    "available_chains": ["forge_master", "demon_invasion", "lost_miners"]
  }
}'::jsonb
WHERE id = '00000000-0000-0000-0000-000000000005';

-- Zone 6: Frostspire Mountains (ice theme, magic focused)
UPDATE world_zones
SET system_modifiers = '{
  "combat": {
    "damage_bonus": 0.1,
    "defense_bonus": 0.2,
    "hp_regen_bonus": 0,
    "mp_regen_bonus": 0.35,
    "enemy_types": ["ice_elemental", "yeti", "frost_dragon"]
  },
  "gathering": {
    "spawn_rate_modifiers": {
      "magic": 2.5,
      "mining": 1.5,
      "alchemy": 1.2,
      "fishing": 0.8,
      "hunting": 1.0,
      "woodcutting": 0.2
    },
    "xp_bonus": 0.25
  },
  "crafting": {
    "success_rate_bonus": {
      "enchanting": 0.5,
      "alchemy": 0.2,
      "all": 0.1
    },
    "cost_reduction": {
      "enchanting": 0.25
    },
    "quality_bonus": 0.2
  },
  "merchants": {
    "price_modifier": 1.3,
    "unique_items": ["frost_crystal", "ice_armor", "frozen_essence"]
  },
  "quests": {
    "available_chains": ["frozen_kingdom", "dragon_slayer", "arctic_expedition"]
  }
}'::jsonb
WHERE id = '00000000-0000-0000-0000-000000000006';

-- Zone 7: The Shattered Wastes (endgame, extreme difficulty, balanced bonuses)
UPDATE world_zones
SET system_modifiers = '{
  "combat": {
    "damage_bonus": 0.25,
    "defense_bonus": 0.25,
    "hp_regen_bonus": 0.1,
    "mp_regen_bonus": 0.3,
    "enemy_types": ["demon", "corrupted_elemental", "void_beast", "archfiend"]
  },
  "gathering": {
    "spawn_rate_modifiers": {
      "magic": 2.0,
      "alchemy": 1.5,
      "mining": 1.5,
      "hunting": 1.5,
      "woodcutting": 0.5,
      "fishing": 0.3
    },
    "xp_bonus": 0.5
  },
  "crafting": {
    "success_rate_bonus": {
      "all": 0.25
    },
    "cost_reduction": {
      "all": 0.2
    },
    "quality_bonus": 0.35
  },
  "merchants": {
    "price_modifier": 1.5,
    "unique_items": ["void_shard", "corrupted_essence", "demon_core", "legendary_artifact"]
  },
  "quests": {
    "available_chains": ["void_corruption", "demon_lord", "realm_salvation"]
  }
}'::jsonb
WHERE id = '00000000-0000-0000-0000-000000000007';

-- Create index for faster modifier lookups
CREATE INDEX IF NOT EXISTS idx_world_zones_system_modifiers ON world_zones USING gin(system_modifiers);

-- Grant execute permissions on new functions
GRANT EXECUTE ON FUNCTION get_character_zone_modifiers TO authenticated;
GRANT EXECUTE ON FUNCTION apply_zone_combat_modifiers TO authenticated;
GRANT EXECUTE ON FUNCTION apply_zone_gathering_modifiers TO authenticated;
GRANT EXECUTE ON FUNCTION apply_zone_crafting_modifiers TO authenticated;
GRANT EXECUTE ON FUNCTION get_zone_merchant_modifiers TO authenticated;
