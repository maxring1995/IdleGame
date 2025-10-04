# Notification System Documentation

## Overview

The Eternal Realms notification system provides real-time feedback for game activities, tracks active tasks, and keeps players informed of progress across Adventures, Gathering, Quests, Combat, and Crafting.

## Architecture

### Core Components

1. **Notification Store** ([lib/notificationStore.ts](../lib/notificationStore.ts))
   - Zustand-based state management
   - Persistent storage for notifications
   - Active task tracking
   - Helper functions for common events

2. **UI Components**
   - **NotificationCenter** ([components/NotificationCenter.tsx](../components/NotificationCenter.tsx)) - Bell icon with dropdown panel
   - **ActiveTasksPanel** ([components/ActiveTasksPanel.tsx](../components/ActiveTasksPanel.tsx)) - Sidebar panel showing ongoing tasks
   - **ToastNotification** ([components/ToastNotification.tsx](../components/ToastNotification.tsx)) - Temporary popup notifications

## Notification Store API

### State

```typescript
interface NotificationState {
  notifications: Notification[]      // All notifications
  unreadCount: number                 // Count of unread notifications
  activeTasks: ActiveTask[]          // Currently running tasks
}
```

### Notification Interface

```typescript
interface Notification {
  id: string                         // Unique identifier
  type: 'success' | 'info' | 'warning' | 'error'
  category: 'adventure' | 'gathering' | 'quest' | 'combat' | 'crafting' | 'system'
  title: string                      // Main heading
  message: string                    // Detailed message
  timestamp: number                  // Unix timestamp
  read: boolean                      // Read status
  actionLabel?: string               // Optional button text
  actionUrl?: string                 // Optional navigation target
  icon?: string                      // Emoji icon
}
```

### Active Task Interface

```typescript
interface ActiveTask {
  id: string                         // Unique identifier
  type: NotificationCategory         // Task category
  title: string                      // Task name
  description: string                // Task details
  startTime: number                  // Start timestamp
  estimatedEndTime: number           // Completion timestamp
  progress?: number                  // 0-100 percentage
  metadata?: Record<string, any>     // Additional data
}
```

### Actions

#### Notifications

```typescript
// Add a notification
addNotification(notification: Omit<Notification, 'id' | 'timestamp' | 'read'>): string

// Remove a notification
removeNotification(id: string): void

// Mark as read
markAsRead(id: string): void

// Mark all as read
markAllAsRead(): void

// Clear all
clearAll(): void
```

#### Active Tasks

```typescript
// Add active task
addActiveTask(task: Omit<ActiveTask, 'id'>): string

// Update task progress
updateActiveTask(id: string, updates: Partial<ActiveTask>): void

// Remove task
removeActiveTask(id: string): void

// Clear completed tasks
clearCompletedTasks(): void
```

#### Helpers

```typescript
// Get unread notifications
getUnreadNotifications(): Notification[]

// Get notifications by category
getNotificationsByCategory(category: NotificationCategory): Notification[]

// Check if has active task of type
hasActiveTaskOfType(type: NotificationCategory): boolean
```

## Notification Helpers

Pre-built notification templates for common events:

### Gathering

```typescript
notificationHelpers.gatheringComplete(
  'Oak Log',        // Material name
  10,               // Quantity
  25                // XP gained
)
```

### Quests

```typescript
notificationHelpers.questComplete(
  'Gathering Wood',  // Quest name
  {
    xp: 75,
    gold: 30,
    items: ['Iron Sword', 'Health Potion']
  }
)

notificationHelpers.questProgress(
  'Gathering Wood',  // Quest name
  5,                 // Current progress
  10                 // Goal
)
```

### Combat

```typescript
notificationHelpers.combatVictory(
  'Goblin',          // Enemy name
  {
    xp: 50,
    gold: 25,
    loot: ['Rusty Dagger']
  }
)

notificationHelpers.combatDefeat(
  'Dragon'           // Enemy name
)
```

### Adventure/Travel

```typescript
notificationHelpers.travelComplete(
  'Dark Forest',     // Zone name
  {
    xp: 100,
    gold: 50,
    items: 3
  }
)

notificationHelpers.explorationComplete(
  'Ancient Ruins',   // Location
  5                  // Discoveries count
)
```

### Crafting

```typescript
notificationHelpers.craftingComplete(
  'Iron Sword',      // Item name
  1                  // Quantity
)
```

### System

```typescript
notificationHelpers.levelUp(
  15                 // New level
)

notificationHelpers.skillLevelUp(
  'Woodcutting',     // Skill name
  10                 // New level
)
```

## UI Components

### NotificationCenter

**Location**: Header (top-right, next to Sign Out button)

**Features**:
- Bell icon with unread count badge
- Click to open dropdown panel
- Mark individual/all as read
- Clear all notifications
- Click notification to navigate (if actionUrl provided)
- Delete individual notifications
- Category color coding
- Type styling (success/warning/error)
- Relative timestamps ("2 minutes ago")

**Usage in Component**:
```typescript
import NotificationCenter from './NotificationCenter'

// In JSX
<NotificationCenter />
```

### ActiveTasksPanel

**Location**: Left sidebar (below Quick Actions)

**Features**:
- Shows all currently running tasks
- Real-time progress bars
- Time remaining countdown
- Task metadata display (location, quantity, rewards)
- Auto-updates every second
- Remove completed tasks
- Task type icons and colors

**Usage in Component**:
```typescript
import ActiveTasksPanel from './ActiveTasksPanel'

// In JSX
<ActiveTasksPanel />
```

### ToastNotification

**Location**: Bottom-right corner (fixed position)

**Features**:
- Auto-shows for new notifications (within 2 seconds)
- Slide-in animation from right
- Auto-dismiss after 5 seconds
- Max 3 toasts visible
- Click to dismiss
- Type-based styling

**Usage in Component**:
```typescript
import ToastNotification from './ToastNotification'

// At end of layout
<ToastNotification />
```

## Integration Examples

### Gathering System

```typescript
import { useNotificationStore, notificationHelpers } from '@/lib/notificationStore'

export default function GatheringComponent() {
  const { addNotification, addActiveTask, removeActiveTask } = useNotificationStore()
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null)

  async function startGathering(materialId: string, quantity: number) {
    const result = await startGatheringAPI(materialId, quantity)

    if (result.success) {
      // Add active task
      const taskId = addActiveTask({
        type: 'gathering',
        title: `Gathering Oak Logs`,
        description: `${quantity}x Oak Log`,
        startTime: Date.now(),
        estimatedEndTime: Date.now() + result.totalTime,
        metadata: {
          location: 'Woodcutting',
          quantity: quantity
        }
      })
      setActiveTaskId(taskId)
    }
  }

  async function completeGathering() {
    const result = await collectGatheringAPI()

    if (result.success) {
      // Remove active task
      if (activeTaskId) {
        removeActiveTask(activeTaskId)
        setActiveTaskId(null)
      }

      // Add completion notification
      addNotification(
        notificationHelpers.gatheringComplete(
          result.materialName,
          result.quantity,
          result.xpGained
        )
      )
    }
  }

  return (
    // ... component JSX
  )
}
```

### Quest System

```typescript
import { useNotificationStore, notificationHelpers } from '@/lib/notificationStore'

export default function QuestsComponent() {
  const { addNotification } = useNotificationStore()

  async function completeQuest(questId: string) {
    const result = await completeQuestAPI(questId)

    if (result.success) {
      // Add notification
      addNotification(
        notificationHelpers.questComplete(
          result.questTitle,
          {
            xp: result.xpReward,
            gold: result.goldReward,
            items: result.itemRewards.map(item => item.name)
          }
        )
      )
    }
  }

  return (
    // ... component JSX
  )
}
```

## Styling & Theming

### Category Colors

- **Adventure**: Blue (`from-blue-500 to-blue-600`)
- **Gathering**: Green (`from-green-500 to-green-600`)
- **Quest**: Purple (`from-purple-500 to-purple-600`)
- **Combat**: Red (`from-red-500 to-red-600`)
- **Crafting**: Amber (`from-amber-500 to-amber-600`)
- **System**: Gray (`from-gray-500 to-gray-600`)

### Type Styles

- **Success**: Green border-left, green accents
- **Info**: Blue border-left, blue accents
- **Warning**: Yellow border-left, yellow accents
- **Error**: Red border-left, red accents

### Icons

Standard emoji mapping:
- 🗺️ Adventure/Travel
- ⛏️ Gathering (context-specific: 🪓🎣🏹🧪✨)
- 📜 Quests
- ⚔️ Combat
- 🔨 Crafting
- ⏳ Active tasks

## Persistence

Notifications are persisted to localStorage using Zustand middleware:

```typescript
persist(
  (set, get) => ({ /* state */ }),
  {
    name: 'eternal-realms-notifications',
    partialize: (state) => ({
      notifications: state.notifications,
      unreadCount: state.unreadCount,
      // Active tasks NOT persisted (refreshed from server)
    }),
  }
)
```

**Why not persist active tasks?**
- Tasks should reflect current server state
- Prevents stale data on refresh
- Re-fetched when components mount

## Best Practices

### When to Add Notifications

✅ **DO notify for:**
- Task completions (gathering, quests, combat)
- Important milestones (level up, skill up)
- Rewards received
- Quest progress updates (optional)
- Errors affecting user actions

❌ **DON'T notify for:**
- Every single action (too noisy)
- Background polling updates
- Minor UI state changes
- Successful saves (unless critical)

### When to Add Active Tasks

✅ **DO add tasks for:**
- Time-based activities (gathering, traveling)
- Multi-step processes
- Anything with a "waiting" period
- Tasks that benefit from progress tracking

❌ **DON'T add tasks for:**
- Instant actions (equip item, buy from shop)
- UI-only state changes
- Actions completing < 2 seconds

### Performance Tips

1. **Limit Notifications**: Keep last 50 only (automatic)
2. **Cleanup Tasks**: Remove completed tasks regularly
3. **Debounce Updates**: Don't update task progress more than 1/second
4. **Lazy Load**: Only fetch full details when notification panel opens

## Testing

### Manual Testing Checklist

- [ ] Start gathering session → see active task appear
- [ ] Complete gathering → see task removed, notification appear, toast show
- [ ] Complete quest → see notification with rewards
- [ ] Open notification center → see bell badge with count
- [ ] Mark notification as read → badge count decreases
- [ ] Click notification with action → navigate correctly
- [ ] Delete notification → removed from list
- [ ] Clear all → all notifications removed
- [ ] Refresh page → notifications persist, tasks don't
- [ ] Multiple tasks → all show in active panel with progress

### Edge Cases

- Task completes while offline → handle gracefully on reconnect
- Notification added while panel open → auto-updates
- Task duration changes → update estimated end time
- Multiple notifications within 2 seconds → show up to 3 toasts
- Very long notification message → truncate with ellipsis

## Future Enhancements

### Planned Features

- [ ] Sound effects for notifications (toggle-able)
- [ ] Push notifications (browser API)
- [ ] Notification filters by category
- [ ] Search/filter notifications
- [ ] Export notification history
- [ ] Achievement notifications with animations
- [ ] Notification preferences per category
- [ ] Desktop notifications API integration
- [ ] WebSocket real-time updates

### Combat Integration

```typescript
// Coming soon - add to Combat component
async function defeatEnemy(enemyId: string) {
  const result = await completeCombatAPI(enemyId)

  if (result.victory) {
    addNotification(
      notificationHelpers.combatVictory(
        result.enemyName,
        {
          xp: result.xpGained,
          gold: result.goldGained,
          loot: result.lootItems.map(i => i.name)
        }
      )
    )
  } else {
    addNotification(
      notificationHelpers.combatDefeat(result.enemyName)
    )
  }
}
```

### Adventure/Travel Integration

```typescript
// Coming soon - add to Adventure component
async function completeTravel(zoneId: string) {
  const result = await completeTravelAPI(zoneId)

  if (result.success) {
    // Remove travel task
    if (travelTaskId) {
      removeActiveTask(travelTaskId)
    }

    // Add completion notification
    addNotification(
      notificationHelpers.travelComplete(
        result.zoneName,
        {
          xp: result.xpGained,
          gold: result.goldGained,
          items: result.discoveredItems.length
        }
      )
    )
  }
}
```

## Troubleshooting

### Notifications not showing

1. Check if `ToastNotification` is rendered in layout
2. Verify notification timestamp is recent (< 2 seconds)
3. Check browser console for errors
4. Ensure Zustand store is properly initialized

### Active tasks not updating

1. Verify `useEffect` polling interval is running
2. Check `updateActiveTask()` being called
3. Ensure character ID is correct
4. Verify estimated end time calculation

### Bell badge not updating

1. Check `unreadCount` in store state
2. Verify notifications are marked `read: false`
3. Ensure `addNotification()` increments counter
4. Check `markAsRead()` decrements counter

### Notifications not persisting

1. Check localStorage quota
2. Verify Zustand persist middleware configured
3. Check browser privacy settings (cookies/storage)
4. Test in different browser/incognito mode

---

**Last Updated**: 2025-10-04
**Version**: 1.0.0
**Status**: ✅ Production Ready
