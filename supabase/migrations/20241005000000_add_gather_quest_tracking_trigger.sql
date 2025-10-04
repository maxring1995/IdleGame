-- Migration: Add Automatic Quest Tracking Trigger for Gathering
-- This trigger automatically updates gather quest progress when materials are added to inventory

-- Function to track gather quest progress
CREATE OR REPLACE FUNCTION track_gather_quest_progress()
RETURNS TRIGGER AS $$
DECLARE
  quest_record RECORD;
  new_current INTEGER;
BEGIN
  -- Only process material items
  IF NEW.item_id NOT IN (SELECT id FROM items WHERE type = 'material') THEN
    RETURN NEW;
  END IF;

  -- Find all active gather quests for this character that match this material
  FOR quest_record IN
    SELECT id, quest_id, progress
    FROM quests
    WHERE character_id = NEW.character_id
      AND status = 'active'
      AND progress->>'type' = 'gather'
      AND progress->>'targetId' = NEW.item_id
  LOOP
    -- Calculate new progress (increment by the quantity added)
    new_current := LEAST(
      (quest_record.progress->>'current')::int +
        CASE
          WHEN TG_OP = 'INSERT' THEN NEW.quantity
          ELSE NEW.quantity - OLD.quantity
        END,
      (quest_record.progress->>'goal')::int
    );

    -- Update quest progress
    UPDATE quests
    SET progress = jsonb_set(
      quest_record.progress,
      '{current}',
      to_jsonb(new_current)
    )
    WHERE id = quest_record.id;

    -- Log the update (for debugging)
    RAISE NOTICE 'Updated quest % progress to %/%',
      quest_record.quest_id,
      new_current,
      quest_record.progress->>'goal';
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger that fires AFTER materials are added to inventory
DROP TRIGGER IF EXISTS gather_quest_tracking ON inventory;
CREATE TRIGGER gather_quest_tracking
  AFTER INSERT OR UPDATE OF quantity ON inventory
  FOR EACH ROW
  EXECUTE FUNCTION track_gather_quest_progress();

-- Create an index to speed up the trigger's query
CREATE INDEX IF NOT EXISTS idx_quests_character_status_type
  ON quests(character_id, status)
  WHERE progress->>'type' = 'gather';

COMMENT ON FUNCTION track_gather_quest_progress() IS
  'Automatically updates gather quest progress when materials are added to inventory';

COMMENT ON TRIGGER gather_quest_tracking ON inventory IS
  'Tracks gathering quest progress automatically when materials are collected';
