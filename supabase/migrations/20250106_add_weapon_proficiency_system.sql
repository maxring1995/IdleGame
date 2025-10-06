-- Weapon Proficiency System
-- Adds weapon type categorization and enforces class-based weapon restrictions

-- Add weapon_type column to items table
ALTER TABLE items
ADD COLUMN IF NOT EXISTS weapon_type TEXT;

-- Create index for weapon type
CREATE INDEX IF NOT EXISTS idx_items_weapon_type ON items(weapon_type);

-- Update existing weapons with their types based on name patterns
-- Swords
UPDATE items SET weapon_type = 'sword'
WHERE equipment_slot = 'weapon'
AND (
  name ILIKE '%sword%'
  OR name ILIKE '%blade%'
  OR name ILIKE '%katana%'
  OR name ILIKE '%rapier%'
  OR name ILIKE '%scimitar%'
  OR name ILIKE '%saber%'
  OR name ILIKE '%claymore%'
)
AND weapon_type IS NULL;

-- Axes
UPDATE items SET weapon_type = 'axe'
WHERE equipment_slot = 'weapon'
AND (
  name ILIKE '%axe%'
  OR name ILIKE '%hatchet%'
  OR name ILIKE '%cleaver%'
)
AND weapon_type IS NULL;

-- Maces/Hammers
UPDATE items SET weapon_type = 'mace'
WHERE equipment_slot = 'weapon'
AND (
  name ILIKE '%mace%'
  OR name ILIKE '%hammer%'
  OR name ILIKE '%maul%'
  OR name ILIKE '%flail%'
)
AND weapon_type IS NULL;

-- Spears
UPDATE items SET weapon_type = 'spear'
WHERE equipment_slot = 'weapon'
AND (
  name ILIKE '%spear%'
  OR name ILIKE '%lance%'
  OR name ILIKE '%pike%'
  OR name ILIKE '%halberd%'
  OR name ILIKE '%trident%'
)
AND weapon_type IS NULL;

-- Daggers
UPDATE items SET weapon_type = 'dagger'
WHERE equipment_slot = 'weapon'
AND (
  name ILIKE '%dagger%'
  OR name ILIKE '%knife%'
  OR name ILIKE '%shiv%'
)
AND weapon_type IS NULL;

-- Bows
UPDATE items SET weapon_type = 'bow'
WHERE equipment_slot = 'weapon'
AND (
  name ILIKE '%bow%'
  OR name ILIKE '%longbow%'
  OR name ILIKE '%shortbow%'
)
AND weapon_type IS NULL;

-- Crossbows
UPDATE items SET weapon_type = 'crossbow'
WHERE equipment_slot = 'weapon'
AND (
  name ILIKE '%crossbow%'
  OR name ILIKE '%arbalest%'
)
AND weapon_type IS NULL;

-- Staves
UPDATE items SET weapon_type = 'staff'
WHERE equipment_slot = 'weapon'
AND (
  name ILIKE '%staff%'
  OR name ILIKE '%rod%'
  OR name ILIKE '%quarterstaff%'
)
AND weapon_type IS NULL;

-- Wands
UPDATE items SET weapon_type = 'wand'
WHERE equipment_slot = 'weapon'
AND (
  name ILIKE '%wand%'
  OR name ILIKE '%scepter%'
)
AND weapon_type IS NULL;

-- Shields
UPDATE items SET weapon_type = 'shield'
WHERE equipment_slot = 'shield'
AND weapon_type IS NULL;

-- Scythes (special weapons)
UPDATE items SET weapon_type = 'scythe'
WHERE equipment_slot = 'weapon'
AND name ILIKE '%scythe%'
AND weapon_type IS NULL;

-- Fishing rods (tools, not combat weapons)
UPDATE items SET weapon_type = 'fishing_rod'
WHERE equipment_slot = 'weapon'
AND name ILIKE '%fishing%'
AND weapon_type IS NULL;

-- Default any remaining weapons to 'sword' (most common type)
UPDATE items SET weapon_type = 'sword'
WHERE equipment_slot = 'weapon'
AND weapon_type IS NULL;

-- Function to check if character can equip a weapon
CREATE OR REPLACE FUNCTION can_equip_weapon(
  char_id UUID,
  item_id TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  character_class TEXT;
  item_weapon_type TEXT;
  class_proficiencies TEXT[];
BEGIN
  -- Get character's class
  SELECT class_id INTO character_class
  FROM characters
  WHERE id = char_id;

  -- If character has no class, allow all weapons (backward compatibility)
  IF character_class IS NULL THEN
    RETURN TRUE;
  END IF;

  -- Get item's weapon type
  SELECT weapon_type INTO item_weapon_type
  FROM items
  WHERE id = item_id;

  -- If item is not a weapon, allow it
  IF item_weapon_type IS NULL THEN
    RETURN TRUE;
  END IF;

  -- Get class proficiencies
  SELECT weapon_proficiency INTO class_proficiencies
  FROM classes
  WHERE id = character_class;

  -- Check if weapon type is in proficiencies
  RETURN item_weapon_type = ANY(class_proficiencies);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to validate equipment during equip
CREATE OR REPLACE FUNCTION validate_weapon_proficiency()
RETURNS TRIGGER AS $$
DECLARE
  item_slot TEXT;
  can_equip BOOLEAN;
BEGIN
  -- Only check when equipping (equipped = true)
  IF NEW.equipped = TRUE AND (OLD.equipped IS NULL OR OLD.equipped = FALSE) THEN
    -- Get item slot
    SELECT equipment_slot INTO item_slot
    FROM items
    WHERE id = NEW.item_id;

    -- Only check weapons and shields
    IF item_slot IN ('weapon', 'shield') THEN
      -- Check proficiency
      SELECT can_equip_weapon(NEW.character_id, NEW.item_id) INTO can_equip;

      IF NOT can_equip THEN
        RAISE EXCEPTION 'Character class cannot equip this weapon type';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on inventory updates
DROP TRIGGER IF EXISTS check_weapon_proficiency ON inventory;
CREATE TRIGGER check_weapon_proficiency
  BEFORE UPDATE ON inventory
  FOR EACH ROW
  EXECUTE FUNCTION validate_weapon_proficiency();

-- Add helpful comments
COMMENT ON COLUMN items.weapon_type IS 'Type of weapon for class proficiency checks (sword, axe, bow, staff, etc.)';
COMMENT ON FUNCTION can_equip_weapon IS 'Checks if a character can equip a weapon based on their class proficiencies';

-- Display current weapon type distribution
DO $$
DECLARE
  type_counts TEXT;
BEGIN
  SELECT string_agg(weapon_type || ': ' || count, E'\n')
  INTO type_counts
  FROM (
    SELECT weapon_type, COUNT(*) as count
    FROM items
    WHERE weapon_type IS NOT NULL
    GROUP BY weapon_type
    ORDER BY count DESC
  ) t;

  RAISE NOTICE 'Weapon Type Distribution:%', E'\n' || type_counts;
END $$;
