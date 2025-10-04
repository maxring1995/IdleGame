# Gathering System Documentation

Documentation for the Gathering System feature in Eternal Realms.

## 📚 Documents

- **[PHASE4_GATHERING.md](PHASE4_GATHERING.md)** - Phase 4 Gathering System Implementation
- **[GATHERING_NOTIFICATIONS.md](GATHERING_NOTIFICATIONS.md)** - Gathering notification integration

## 🌾 Gathering System Overview

Six gathering skills with 50+ materials across 5 zone tiers.

### Gathering Skills
- **Woodcutting** 🪓 - Oak → Willow → Maple → Yew → Magic Logs
- **Mining** ⛏️ - Copper → Iron → Mithril → Adamantite → Runite Ore + Gems
- **Fishing** 🎣 - Shrimp → Trout → Salmon → Swordfish → Shark → Manta Ray
- **Hunting** 🏹 - Rabbit → Wolf → Bear → Drake → Dragon → Phoenix materials
- **Alchemy** 🧪 - Guam → Harralander → Ranarr → Kwuarm → Torstol herbs
- **Magic** ✨ - Air/Water → Earth/Fire Essences → Nature/Chaos/Death/Soul Runes

### Features
- **Skill Progression**: Levels 1-99 with XP system
- **Efficiency Bonus**: 0.5% faster per level (max 49.5% at level 99)
- **Auto-Gather**: Continuous gathering mode
- **Material Unlocks**: Level-gated materials

### Gathering Flow
1. Select gathering skill
2. Choose material
3. Click "Gather x1" or "Gather x10"
4. Wait for session completion
5. Receive materials + XP

### Key Files
- `lib/gathering.ts` - Gathering session logic
- `lib/materials.ts` - Material data and skill XP
- `components/GatheringSimple.tsx` - Main UI
- `components/GatheringSkillPanel.tsx` - Skill-specific UI
- `test/unit/gathering.test.ts` - Gathering mechanics unit tests
- `test/e2e/gathering.spec.ts` - E2E tests

## 🧪 Testing

**Unit Tests**: `npm test test/unit/gathering.test.ts`
**E2E Tests**: `npx playwright test test/e2e/gathering.spec.ts`

## 📖 Related Documentation

- [Quest System](../quests/README.md) - Gathering quests
- [Crafting System](../crafting/README.md) - Material usage
- [Notification System](../notifications/README.md)

---

**Last Updated:** 2025-10-04
