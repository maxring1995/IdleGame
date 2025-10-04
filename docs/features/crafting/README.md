# Crafting System Documentation

Documentation for the Crafting System feature in Eternal Realms.

## 📚 Documents

- **[PHASE6_CRAFTING.md](PHASE6_CRAFTING.md)** - Phase 6 Crafting System Implementation

## 🔨 Crafting System Overview

Comprehensive crafting system with 60+ recipes and async crafting sessions.

### Features
- **60+ Recipes**: Weapons, armor, consumables, and more
- **Async Crafting**: Background crafting sessions
- **Recipe Unlocks**: Level and skill requirements
- **Material Consumption**: Uses gathered/purchased materials
- **Skill XP**: Gain XP in relevant crafting skills

### Crafting Skills
- **Smithing**: Weapons and armor from ores
- **Cooking**: Food and consumables
- **Alchemy**: Potions and elixirs
- **Woodworking**: Bows and wooden equipment
- **Leatherworking**: Leather armor

### Crafting Flow
1. Select recipe from crafting panel
2. Verify material requirements
3. Start crafting session
4. Wait for completion
5. Receive item + Skill XP

### Key Files
- `lib/crafting.ts` - Crafting logic and recipe management
- `components/CraftingPanel.tsx` - Crafting UI
- `supabase/migrations/*_crafting*.sql` - Database schema

## 🧪 Testing

**E2E Tests**: Create tests for crafting workflows

## 📖 Related Documentation

- [Quest System](../quests/README.md) - Crafting quests
- [Gathering System](../gathering/README.md) - Material sources
- [Notification System](../notifications/README.md)

---

**Last Updated:** 2025-10-04
