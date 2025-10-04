# Adventure System Documentation

Documentation for the Adventure & Exploration System feature in Eternal Realms.

## 📚 Documents

- **[ADVENTURE_COMPLETION_MODAL.md](ADVENTURE_COMPLETION_MODAL.md)** - Adventure completion UI implementation
- **[ADVENTURE_REWARDS_SYSTEM.md](ADVENTURE_REWARDS_SYSTEM.md)** - Reward distribution system

## 🗺️ Adventure System Overview

Travel and exploration system with zone discovery and rewards.

### Features
- **World Map**: Navigate between zones
- **Zone Discovery**: Unlock new areas
- **Travel System**: Travel between discovered zones
- **Exploration**: Discover landmarks within zones
- **Rewards**: XP, Gold, Items from exploration

### Adventure Components
- **Travel**: Move between zones with time-based sessions
- **Exploration**: Discover landmarks and hidden rewards
- **Zone Unlocks**: Level-gated zone access
- **Landmark Discovery**: Find points of interest

### Adventure Flow
1. View world map
2. Select destination zone
3. Start travel session
4. Arrive and explore zone
5. Discover landmarks
6. Receive rewards

### Key Files
- `lib/worldZones.ts` - Zone data and discovery logic
- `lib/travel.ts` - Travel session management
- `lib/exploration.ts` - Exploration mechanics
- `components/Adventure.tsx` - Main adventure UI
- `components/WorldMap.tsx` - Interactive map
- `components/ZoneDetails.tsx` - Zone information
- `components/TravelPanel.tsx` - Travel UI
- `components/ExplorationPanel.tsx` - Exploration UI
- `components/AdventureCompletionModal.tsx` - Reward display
- `test/unit/travel.test.ts` - Travel calculations unit tests
- `test/e2e/adventure.spec.ts` - E2E tests

## 🧪 Testing

**Unit Tests**: `npm test test/unit/travel.test.ts`
**E2E Tests**: `npx playwright test test/e2e/adventure.spec.ts`

## 📖 Related Documentation

- [Quest System](../quests/README.md) - Exploration quests
- [Notification System](../notifications/README.md)

---

**Last Updated:** 2025-10-04
