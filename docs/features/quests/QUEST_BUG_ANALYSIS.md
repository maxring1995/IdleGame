# Quest Tracking Bug Analysis

## Summary
The "Gathering Wood" quest does not complete when gathering 10 Oak Logs, even though the materials are successfully added to inventory.

## Evidence

### Database State
- **Quest Progress**: 0/10 (stuck at 0)
- **Inventory**: 151 Oak Logs (materials successfully gathered)
- **Quest Config**:
  - Type: `gather`
  - TargetId: `oak_log`
  - Goal: 10

### Root Cause
The `trackQuestProgress()` function in [lib/quests.ts](lib/quests.ts) is **NOT being called** or **failing silently** when gathering completes.

## Flow Analysis

### Expected Flow
1. User completes gathering session → `completeGathering()` [lib/gathering.ts:242](lib/gathering.ts#L242)
2. Materials added to inventory → `addMaterialToInventory()` [lib/gathering.ts:285](lib/gathering.ts#L285)
3. Quest tracking called → `trackQuestProgress()` [lib/gathering.ts:310](lib/gathering.ts#L310)
4. Quest progress updated in database
5. UI shows quest completion (10/10)

### Actual Flow (Broken)
1. ✅ User completes gathering session
2. ✅ Materials added to inventory (151 oak logs present)
3. ❌ Quest tracking **NOT updating** quest progress
4. ❌ Quest stuck at 0/10

## Potential Issues

### Issue 1: Client-Side Only Execution
The `trackQuestProgress()` function is called from client-side code in [lib/gathering.ts:310](lib/gathering.ts#L310). If there's an error or the code doesn't execute, it fails silently.

### Issue 2: Supabase Query Failing
The `trackQuestProgress()` queries active quests:
```typescript
const { data: quests, error: fetchError } = await supabase
  .from('quests')
  .select('id, quest_id, progress')
  .eq('character_id', characterId)
  .eq('status', 'active')
```

Possible failure points:
- RLS policy blocking the query
- Character ID mismatch
- Query returning empty results

### Issue 3: Async/Await Not Properly Handled
The tracking is wrapped in try/catch but errors are only logged, not thrown:
```typescript
try {
  await trackQuestProgress(characterId, 'gather', {
    targetId: updatedGathering.material_id,
    amount: updatedGathering.quantity_goal
  })
  console.log('[Gathering] trackQuestProgress completed successfully')
} catch (error) {
  console.error('[Gathering] Error tracking quest progress:', error)
  // Don't fail the gathering completion if quest tracking fails
}
```

## Testing Done

### Unit Tests ✅
Created [lib/__tests__/quest-tracking.test.ts](lib/__tests__/quest-tracking.test.ts) - all passing:
- TargetId matching logic works correctly
- Progress calculation works correctly
- Quest completion detection works correctly

### Manual Database Test ✅
Manually updated quest progress to 10/10:
```sql
UPDATE quests
SET progress = jsonb_set(progress, '{current}', '10')
WHERE character_id = '01173979-0c33-4a0a-a90c-c2817e5e1ede'
  AND quest_id = 'gather_wood'
```
Result: Quest now shows 10/10 and can be claimed.

## Next Steps

### Step 1: Verify Console Logs
1. Open browser console (F12)
2. Start a gathering session for 1 Oak Log
3. Complete the gathering
4. Check for these logs:
   - `[Gathering] Calling trackQuestProgress with:...`
   - `[Quest Tracking] ============ START ============`
   - `[Quest Tracking] Active quests found:...`
   - Any errors or warnings

### Step 2: Check RLS Policies
Verify that the RLS policy on `quests` table allows SELECT for the user's own quests.

### Step 3: Add Return Value Logging
Modify `trackQuestProgress()` to return a result object so we can detect failures.

## Recommended Fix

### Option A: Add Better Error Handling
```typescript
const result = await trackQuestProgress(characterId, 'gather', {
  targetId: updatedGathering.material_id,
  amount: updatedGathering.quantity_goal
})

if (!result || result.error) {
  console.error('[Gathering] Quest tracking failed:', result?.error)
  // Optionally show user notification
}
```

### Option B: Server-Side Quest Tracking
Move quest tracking to a Supabase Edge Function or database trigger to ensure it always runs reliably.

### Option C: Database Trigger (Most Reliable)
Create a PostgreSQL trigger on `inventory` table that automatically updates quest progress when materials are added:

```sql
CREATE OR REPLACE FUNCTION track_gather_quest_progress()
RETURNS TRIGGER AS $$
BEGIN
  -- Update active gather quests when materials are added
  UPDATE quests
  SET progress = jsonb_set(
    progress,
    '{current}',
    to_jsonb(LEAST(
      (progress->>'current')::int + NEW.quantity,
      (progress->>'goal')::int
    ))
  )
  WHERE character_id = NEW.character_id
    AND status = 'active'
    AND progress->>'type' = 'gather'
    AND progress->>'targetId' = NEW.item_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER gather_quest_tracking
  AFTER INSERT OR UPDATE ON inventory
  FOR EACH ROW
  EXECUTE FUNCTION track_gather_quest_progress();
```

## Current Status

✅ Quest system logic is correct
✅ Database schema is correct
✅ Manual quest updates work
❌ Automatic quest tracking from gathering is broken
⏳ Waiting for browser console logs to pinpoint exact failure
