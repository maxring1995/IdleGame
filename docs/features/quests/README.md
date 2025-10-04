# Quest System Documentation

Documentation for the Quest System feature in Eternal Realms.

## 📚 Documents

### Implementation & Debug
- **[QUEST_TRACKING_DEBUG.md](QUEST_TRACKING_DEBUG.md)** - Quest tracking system debugging guide
- **[QUEST_BUG_ANALYSIS.md](QUEST_BUG_ANALYSIS.md)** - Analysis of quest tracking bugs
- **[QUEST_BUG_SOLUTION.md](QUEST_BUG_SOLUTION.md)** - Solutions to quest tracking issues
- **[QUEST_BUG_FINAL_TEST.md](QUEST_BUG_FINAL_TEST.md)** - Final testing of quest fixes

## 🎯 Quest System Overview

The Quest System provides players with objectives to complete for rewards:

### Features
- **Quest Types**: Kill, Gather, Craft, Explore, Level, Gold
- **Quest Progress**: Automatic tracking via game actions
- **Notifications**: Real-time progress updates via toast notifications
- **Rewards**: XP, Gold, Items
- **Quest States**: Available → Active → Completed

### Quest Progress Tracking

Quests automatically track progress when you:
- **Kill enemies** → Tracks combat kill quests
- **Gather materials** → Tracks gathering quests
- **Craft items** → Tracks crafting quests
- **Level up** → Tracks level requirement quests
- **Earn gold** → Tracks gold earning quests
- **Discover zones** → Tracks exploration quests

### Key Files
- `lib/quests.ts` - Core quest logic
- `components/Quests.tsx` - Quest UI
- `components/QuestCompletionModal.tsx` - Reward display
- `test/unit/quest-tracking.test.ts` - Quest tracking unit tests
- `test/unit/quests.test.ts` - Quest system unit tests
- `test/e2e/quests.spec.ts` - E2E tests

## 🧪 Testing

**Unit Tests**:
- `npm test test/unit/quest-tracking.test.ts`
- `npm test test/unit/quests.test.ts`

**E2E Tests**: `npx playwright test test/e2e/quests.spec.ts`

## 📖 Related Documentation

- [Notification System](../notifications/README.md)
- [Combat System](../combat/README.md)
- [Gathering System](../gathering/README.md)
- [Crafting System](../crafting/README.md)

---

**Last Updated:** 2025-10-04
