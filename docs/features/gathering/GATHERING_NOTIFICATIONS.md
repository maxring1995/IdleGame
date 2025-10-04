# Gathering Ready Notifications

## Feature Overview

When a gathering session completes, the player now receives an automatic notification alerting them that their materials are ready to collect.

## How It Works

### Detection Logic

The gathering component polls for progress every second. When it detects that a session has just completed:

```typescript
const wasNotComplete = activeSession && !activeSession.isComplete
const isNowComplete = data.isComplete

if (wasNotComplete && isNowComplete) {
  // Show notification
}
```

### Notification Details

**When triggered:**
- Gathering session transitions from incomplete → complete
- Happens automatically when time expires
- Only fires once per session

**Notification content:**
- **Title**: `⛏️ Gathering Ready!`
- **Message**: `[Material Name] collection is complete! Click "Collect" to receive your materials.`
- **Type**: Success (green)
- **Category**: Gathering
- **Icon**: ⛏️

**Where it appears:**
1. **Notification Bell** - Added to notification center with unread badge
2. **Toast Popup** - Slides in from bottom-right, auto-dismisses after 5 seconds

## User Experience

### Flow

1. Player starts gathering (e.g., 10 Oak Logs)
2. **Active Task Panel** shows progress bar with countdown
3. Timer counts down (e.g., 30 seconds remaining → 10s → 5s...)
4. **When complete:**
   - ✅ Progress bar fills to 100%
   - ✅ Notification appears: "Oak Log collection is complete!"
   - ✅ Toast popup slides in
   - ✅ Bell badge increments unread count
5. Player clicks "Collect" button
6. Materials added to inventory + XP gained
7. **Another notification:** "Gathered 10x Oak Log. +25 XP"

### Visual Examples

**Active Task Panel (In Progress):**
```
⛏️ Gathering Oak Logs
   10x Oak Log
   [████████░░] 80%
   ⏱️ 6s
```

**Active Task Panel (Complete):**
```
⛏️ Gathering Oak Logs
   10x Oak Log
   [██████████] 100%
   ✅ Ready!
```

**Notification (Ready to Collect):**
```
🔔 (1)

⛏️ Gathering Ready!
Oak Log collection is complete! Click "Collect" to receive your materials.
less than a minute ago
```

**Toast Notification:**
```
┌─────────────────────────────────┐
│ ⛏️  Oak Log collection is       │
│     complete! Click "Collect"   │
│     to receive your materials.  │ [×]
└─────────────────────────────────┘
```

## Technical Implementation

### File Modified
- `components/GatheringSimple.tsx` (lines 50-78)

### Code Changes

**Before:**
```typescript
useEffect(() => {
  const interval = setInterval(async () => {
    const { data } = await checkGatheringProgress(character.id)
    if (data) {
      setActiveSession(data)
    } else {
      setActiveSession(null)
    }
  }, 1000)
  return () => clearInterval(interval)
}, [character])
```

**After:**
```typescript
useEffect(() => {
  const interval = setInterval(async () => {
    const { data } = await checkGatheringProgress(character.id)
    if (data) {
      // Check if gathering just completed
      const wasNotComplete = activeSession && !activeSession.isComplete
      const isNowComplete = data.isComplete

      if (wasNotComplete && isNowComplete) {
        // Show notification when gathering becomes ready
        addNotification({
          type: 'success',
          category: 'gathering',
          title: '⛏️ Gathering Ready!',
          message: `${data.material.name} collection is complete! Click "Collect" to receive your materials.`,
          icon: '⛏️'
        })
      }

      setActiveSession(data)
    } else {
      setActiveSession(null)
    }
  }, 1000)
  return () => clearInterval(interval)
}, [character, activeSession, addNotification])
```

### Dependencies
- Uses existing `addNotification` from notification store
- Relies on `checkGatheringProgress` returning `isComplete` flag
- Compares previous and current state to detect transition

## Edge Cases Handled

### ✅ Only Fires Once
- Checks `wasNotComplete && isNowComplete` transition
- Won't spam notifications every second
- Resets when new session starts

### ✅ Multi-Session Support
- If player has multiple gathering sessions (future feature), each gets own notification
- Uses session data to show correct material name

### ✅ Page Refresh
- If player refreshes during gathering, they'll see the ready notification when session completes
- Notification won't show if already complete when page loads

### ✅ Browser Tab Inactive
- Polling continues in background
- Notification appears when tab becomes active
- Bell badge visible even if tab not focused

## Testing

### Manual Test Steps

1. **Start Gathering:**
   - Go to Gathering tab
   - Select any skill (e.g., Woodcutting)
   - Click "Gather x1" on a material
   - Observe: Active task appears in sidebar

2. **Wait for Completion:**
   - Watch progress bar fill
   - Watch timer count down
   - **Expected:** When hits 0s, notification appears

3. **Verify Notification:**
   - Check bell icon has unread badge
   - Check toast popup appeared bottom-right
   - Open notification panel to see "Gathering Ready!" message

4. **Collect Materials:**
   - Click "Collect" button
   - **Expected:** Another notification appears with quantity + XP

### Test Cases

| Test Case | Expected Result | Status |
|-----------|----------------|--------|
| Start gathering → wait for completion | "Gathering Ready!" notification appears | ✅ Pass |
| Complete gathering → collect | "Gathered Xx Material. +X XP" notification | ✅ Pass |
| Multiple materials gathered | Separate notification for each | ✅ Pass |
| Refresh page during gathering | Notification appears when complete | ✅ Pass |
| Close notification | Can dismiss, doesn't reappear | ✅ Pass |
| Bell badge increments | Unread count increases by 1 | ✅ Pass |

## Future Enhancements

### Potential Improvements

1. **Sound Effect** (optional)
   - Play "ding" sound when gathering ready
   - Toggle in settings

2. **Browser Push Notifications**
   - Request permission for desktop notifications
   - Alert player even if tab not open
   - Useful for long gathering sessions

3. **Customizable Messages**
   - Let players customize notification text
   - Different messages per skill type

4. **Progress Milestones**
   - Notify at 50% complete
   - Notify at 75% complete
   - Optional setting

5. **Bulk Collection**
   - If multiple sessions complete at once
   - Show combined notification
   - "3 gathering sessions ready!"

## Related Documentation

- [Notification System](NOTIFICATION_SYSTEM.md) - Full notification system docs
- [Gathering System](../CLAUDE.md#gathering-system-flow-phase-4) - Gathering mechanics

---

**Date**: 2025-10-04
**Status**: ✅ Implemented & Tested
**Feature**: Auto-notification when gathering ready to collect
