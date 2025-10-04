# Quest Tracking Debug Report

## Issue
Quest "Gathering Wood" progress remains at 0/10 even after collecting 10 Oak Logs.

## Investigation Summary

### Code Flow Analysis

1. **Quest Setup** ✅
   - Quest ID: `gather_wood`
   - Objective: "Gather 10 Oak Log"
   - Expected `targetId`: `oak_log` (parsed from objective)
   - Material ID in database: `oak_log`

2. **Gathering Completion Flow** ✅
   - `lib/gathering.ts:completeGathering()` is called
   - Awards materials to inventory
   - Calls `trackQuestProgress()` with:
     ```javascript
     trackQuestProgress(characterId, 'gather', {
       targetId: 'oak_log',
       amount: 10
     })
     ```

3. **Quest Tracking Logic** ✅
   - `lib/quests.ts:trackQuestProgress()` fetches active quests
   - Matches quest type ('gather' === 'gather')
   - Matches targetId ('oak_log' === 'oak_log')
   - Should increment progress by 10

### Root Cause Hypothesis

The logic appears correct. Possible issues:

1. **Silent Failure**: `trackQuestProgress()` may be throwing an error that's not being caught
2. **Browser Console Logs**: All console.log statements are client-side only (not visible in server logs)
3. **Race Condition**: Quest might not be marked as 'active' when tracking runs

### Fix Applied

Added error handling in `lib/gathering.ts:309-318`:
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

## Testing Instructions

### 1. Open Browser Console
1. Open the game at http://localhost:3000
2. Press F12 (or Cmd+Option+I on Mac)
3. Go to the **Console** tab
4. Clear the console

### 2. Accept the Quest
1. Navigate to the Quests tab
2. Accept "Gathering Wood" quest if not already accepted
3. Verify quest shows: `0 / 10 Oak Log`

### 3. Start Gathering
1. Go to Gathering tab
2. Click Woodcutting skill
3. Find "Oak Log" material
4. Click "Gather x10"

### 4. Monitor Console Logs
Watch for these log messages during gathering completion:

```
[Gathering] Completed gathering: {materialId: "oak_log", quantity: 10, characterId: "..."}
[Gathering] Calling trackQuestProgress with: {characterId: "...", eventType: "gather", targetId: "oak_log", amount: 10}
[Quest Tracking] Event: gather Data: {targetId: "oak_log", amount: 10}
[Quest Tracking] Active quests: 1
[Quest Tracking] Checking quest: gather_wood Type: gather TargetId: oak_log
[Quest Tracking] Updating quest progress: gather_wood from 0 to 10 / 10
[Gathering] trackQuestProgress completed successfully
```

### 5. Check for Errors
If you see any errors in the console:
- Red error messages indicate the issue
- Look for Supabase permission errors (RLS policy issues)
- Look for "quest not found" or "targetId mismatch" messages

### 6. Verify Quest Progress
1. Go back to Quests tab
2. Check if "Gathering Wood" now shows `10 / 10`
3. If yes: Click "Claim Rewards" ✅
4. If no: Check console logs for the error

## Expected Console Output (Success Case)

```
[CompleteGathering] Starting for character: abc-123-def
[CompleteGathering] Active gathering: {material_id: "oak_log", ...}
[CompleteGathering] Gathering is complete! Proceeding with rewards...
[Gathering] Completed gathering: {materialId: "oak_log", quantity: 10}
[Gathering] Calling trackQuestProgress with: {...}
[Quest Tracking] Event: gather Data: {targetId: "oak_log", amount: 10}
[Quest Tracking] Active quests: 3
[Quest Tracking] Checking quest: welcome_quest Type: level TargetId: undefined
[Quest Tracking] Type mismatch: level !== gather
[Quest Tracking] Checking quest: first_blood Type: kill TargetId: goblin
[Quest Tracking] Type mismatch: kill !== gather
[Quest Tracking] Checking quest: gather_wood Type: gather TargetId: oak_log
[Quest Tracking] Updating quest progress: gather_wood from 0 to 10 / 10
[Gathering] trackQuestProgress completed successfully
```

## Possible Error Scenarios

### Error: "Active quest not found"
- **Cause**: Quest not accepted or status is not 'active'
- **Fix**: Accept the quest from Quests tab

### Error: "Permission denied"
- **Cause**: RLS policy blocking quest update
- **Fix**: Check Supabase RLS policies on `quests` table

### Error: TargetId mismatch
- **Cause**: Quest expecting different material ID
- **Fix**: Check quest definition `objective` field matches material name exactly

## Manual Database Test

To verify the update logic works at the database level:

```sql
-- Check current quest state
SELECT quest_id, status, progress
FROM quests
WHERE quest_id = 'gather_wood';

-- Manually increment progress (for testing)
UPDATE quests
SET progress = jsonb_set(
  progress,
  '{current}',
  ((progress->>'current')::integer + 10)::text::jsonb
)
WHERE quest_id = 'gather_wood' AND status = 'active'
RETURNING quest_id, progress;
```

## Next Steps

1. **Test with browser console open** to capture the exact error
2. **Share console logs** if issue persists
3. **Check RLS policies** if permission errors occur
4. **Verify quest is active** in database before gathering

## Files Modified

- `lib/gathering.ts` - Added try-catch around trackQuestProgress call (lines 309-318)

## Date
2025-10-03
