# Combat System Documentation

Documentation for the Combat System feature in Eternal Realms.

## 📚 Documents

- **[PHASE3_COMBAT.md](PHASE3_COMBAT.md)** - Phase 3 Combat System Implementation
- **[PHASE3_SUMMARY.md](PHASE3_SUMMARY.md)** - Phase 3 Summary & Results

## ⚔️ Combat System Overview

Turn-based combat system with auto-attack and boss encounters.

### Features
- **Turn-based Combat**: Player vs Enemy battles
- **Auto-Attack**: Automated combat with toggle
- **Boss Encounters**: Special high-difficulty fights
- **Loot System**: Probability-based item drops
- **Combat Logs**: Real-time battle history
- **Combat XP Display**: Shows XP gained for each combat skill after victory

### Combat Flow
1. Select enemy from enemy list
2. Start combat session
3. Attack (manual or auto)
4. Victory → Rewards (XP, Gold, Items)
5. Defeat → Health penalty

### Key Mechanics
- **Damage Formula**: `attackerAttack - (defenderDefense / 2)` ± 15% variance
- **Loot Drops**: Probability table per enemy
- **Boss Bonuses**: Higher stats, better rewards

### Combat Skills & XP Gains
Each combat awards XP to multiple skills:
- **Attack XP**: 1 XP per 5 damage dealt
- **Defense XP**: 1 XP per 2 damage taken
- **Constitution XP**: 1 XP per turn
- **Slayer XP**: 10 + (enemy level × 2) XP for victory
- **Thieving XP**: 5 XP per item looted

The Victory Modal now displays all combat XP gains in a dedicated section.

### Key Files
- `lib/combat.ts` - Combat logic
- `components/Combat.tsx` - Combat UI
- `components/VictoryModal.tsx` - Reward display
- `test/unit/combat.test.ts` - Combat calculation unit tests
- `test/e2e/combat.spec.ts` - E2E tests

## 🧪 Testing

**Unit Tests**: `npm test test/unit/combat.test.ts`
**E2E Tests**: `npx playwright test test/e2e/combat.spec.ts`

## 📖 Related Documentation

- [Quest System](../quests/README.md) - Combat kill quests
- [Phase 4 Gathering](../gathering/README.md)

---

**Last Updated:** 2025-10-05
