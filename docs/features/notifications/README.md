# Notification System Documentation

Documentation for the Notification System in Eternal Realms.

## 📚 Documents

- **[NOTIFICATION_SYSTEM.md](NOTIFICATION_SYSTEM.md)** - Notification system architecture
- **[NOTIFICATION_SYSTEM_SUMMARY.md](NOTIFICATION_SYSTEM_SUMMARY.md)** - Implementation summary

## 🔔 Notification System Overview

Centralized notification system for all game events.

### Features
- **Toast Notifications**: Pop-up messages in bottom-right
- **Notification Center**: Bell icon with notification history
- **Active Tasks Panel**: Track ongoing activities
- **Auto-Dismiss**: Toast auto-closes after 5 seconds
- **Categorization**: Quest, Combat, Gathering, Crafting, Adventure, System

### Notification Types
- **Success**: Green - Achievements, completions
- **Info**: Blue - Progress updates
- **Warning**: Yellow - Cautions, alerts
- **Error**: Red - Failures, blocks

### Notification Categories
- **Quest**: Quest progress and completion
- **Combat**: Battle results and loot
- **Gathering**: Material collection
- **Crafting**: Item creation
- **Adventure**: Travel and exploration
- **System**: Level ups, skill ups

### Key Files
- `lib/notificationStore.ts` - Zustand store for notifications
- `components/NotificationCenter.tsx` - Notification bell UI
- `components/ToastNotification.tsx` - Toast display
- `components/ActiveTasksPanel.tsx` - Active task tracking

## 📦 Notification Store API

```typescript
// Add notification
addNotification({
  type: 'success',
  category: 'quest',
  title: 'Quest Complete!',
  message: 'You completed "Gathering Wood"',
  icon: '📜'
})

// Helper functions
notificationHelpers.questProgress(questName, current, goal)
notificationHelpers.questComplete(questName, rewards)
notificationHelpers.combatVictory(enemyName, rewards)
notificationHelpers.gatheringComplete(material, quantity, xp)
notificationHelpers.craftingComplete(itemName, quantity)
notificationHelpers.levelUp(newLevel)
```

## 🧪 Testing

See feature-specific tests for notification integration.

## 📖 Related Documentation

- [Quest System](../quests/README.md)
- [Combat System](../combat/README.md)
- [Gathering System](../gathering/README.md)
- [Crafting System](../crafting/README.md)
- [Adventure System](../adventure/README.md)

---

**Last Updated:** 2025-10-04
