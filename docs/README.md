# Documentation - Eternal Realms

Comprehensive documentation for the Eternal Realms idle RPG project.

## 📂 Documentation Structure

```
docs/
├── features/          # Feature-specific documentation
│   ├── quests/        # Quest system
│   ├── combat/        # Combat system
│   ├── gathering/     # Gathering skills
│   ├── crafting/      # Crafting system
│   ├── adventure/     # Travel & exploration
│   ├── notifications/ # Notification system
│   ├── skills/        # 20-Skill system
│   ├── character/     # Character stats system (NEW!)
│   └── authentication/# Auth system
├── bugfixes/          # Bug fix reports
├── guides/            # User guides
└── README.md          # This file
```

## 🎮 Features Documentation

### Core Game Systems
- **[Quest System](features/quests/README.md)** - Quest tracking, progress, rewards
- **[Combat System](features/combat/README.md)** - Turn-based combat, auto-attack, bosses
- **[20-Skill System](features/skills/COMPLETE_SKILL_SYSTEM.md)** - All 20 skills, 60+ recipes, 70+ materials
- **[Character Stats System](features/character/CHARACTER_STATS_SYSTEM.md)** ⭐ **NEW!** - Stat breakdowns, equipment bonuses, active buffs
- **[Gathering System](features/gathering/README.md)** - 6 gathering skills, 50+ materials
- **[Crafting System](features/crafting/README.md)** - 60+ recipes, async crafting
- **[Adventure System](features/adventure/README.md)** - World map, travel, exploration
- **[Notification System](features/notifications/README.md)** - Toast notifications, notification center
- **[Authentication](features/authentication/README.md)** - Username-based auth

## 📖 Guides

- **[QUICKSTART.md](guides/QUICKSTART.md)** - Quick start guide for new developers
- **[TESTING.md](guides/TESTING.md)** - Testing strategy and Playwright setup
- **[TROUBLESHOOTING.md](guides/TROUBLESHOOTING.md)** - Common issues and solutions
- **[ICONS.md](guides/ICONS.md)** - Icon usage guide and visual reference
- **[FEATURE2_SUMMARY.md](guides/FEATURE2_SUMMARY.md)** - Feature 2 implementation summary

## 🐛 Bug Fixes

All bug fix reports are located in **[bugfixes/](bugfixes/)**:
- Latest bug fixes and solutions
- Root cause analysis
- Verification steps
- Files changed

## 🔍 Quick Navigation

**Need to...**
- **Start developing?** → [guides/QUICKSTART.md](guides/QUICKSTART.md)
- **View all 20 skills?** → [features/skills/COMPLETE_SKILL_SYSTEM.md](features/skills/COMPLETE_SKILL_SYSTEM.md)
- **Understand character stats?** → [features/character/CHARACTER_STATS_SYSTEM.md](features/character/CHARACTER_STATS_SYSTEM.md) ⭐
- **Understand auth?** → [features/authentication/](features/authentication/)
- **Fix a bug?** → [guides/TROUBLESHOOTING.md](guides/TROUBLESHOOTING.md)
- **Add icons?** → [guides/ICONS.md](guides/ICONS.md)
- **Write tests?** → [guides/TESTING.md](guides/TESTING.md)
- **Implement quests?** → [features/quests/](features/quests/)
- **Add combat?** → [features/combat/](features/combat/)
- **Create gathering?** → [features/gathering/](features/gathering/)
- **Build crafting?** → [features/crafting/](features/crafting/)
- **Design adventure?** → [features/adventure/](features/adventure/)
- **Send notifications?** → [features/notifications/](features/notifications/)

## 📅 Latest Updates

- **2025-10-05** - ⭐ **CHARACTER STATS SYSTEM** - Complete stat breakdowns, equipment bonuses, active buffs ([Changelog](CHANGELOG_2025-10-05.md))
- **2025-10-05** - Moved "Gathering Contracts" from Market tab to Adventure tab
- **2025-10-05** - Fixed Equipment Manager z-index rendering issue
- **2025-10-04** - ⭐ **COMPLETE 20-SKILL SYSTEM IMPLEMENTED** - All skills functional with 60+ recipes
- **2025-10-04** - Added Magic & Ranged combat styles with UI selector
- **2025-10-04** - Implemented Farming, Cooking, Fletching, Runecrafting skills
- **2025-10-04** - Implemented Agility, Thieving, Slayer support skills
- **2025-10-04** - Reorganized documentation into feature-based structure
- **2025-10-04** - Added quest notification system
- **2025-10-04** - Created comprehensive E2E tests for quest system
- **2025-10-03** - PHASE6_CRAFTING.md - Complete crafting system
- **2025-10-02** - PHASE4_GATHERING.md - Complete gathering system

## 🤝 Contributing to Documentation

### Adding New Documentation

1. **Choose the right location:**
   - Feature docs → `/docs/features/[feature-name]/`
   - Bug fixes → `/docs/bugfixes/`
   - Guides → `/docs/guides/`

2. **Follow naming conventions:**
   - `README.md` for feature overview
   - `UPPERCASE_WITH_UNDERSCORES.md` for specific documents
   - Include date in bug fix files: `BUGFIX_2025-10-04.md`

3. **Update this README:**
   - Add to appropriate section
   - Update "Latest Updates" with date
   - Add navigation links if needed

4. **Cross-reference:**
   - Link related feature documentation
   - Update [CLAUDE.md](../CLAUDE.md) if architecture changes

### Feature Documentation Template

Each feature folder should contain:
- `README.md` - Overview, features, key files, testing
- Implementation docs - Phase documents, guides
- Debug docs - Troubleshooting, bug fixes specific to feature

## 📖 Main Project Files (Not in /docs)

These files remain in the project root:
- **[CLAUDE.md](../CLAUDE.md)** - Instructions for Claude Code AI
- **[AGENTS.md](../AGENTS.md)** - Agent system documentation (if present)
- **[README.md](../README.md)** - Main project README

## 🏗️ Project Architecture

For architecture documentation, see:
- **[CLAUDE.md](../CLAUDE.md)** - Complete architecture guide
  - Technology stack
  - Database schema
  - State management
  - File structure
  - Development patterns
  - Testing strategy

## 🧪 Testing Documentation

All testing documentation is located in **[guides/TESTING.md](guides/TESTING.md)**:
- Unit testing strategy
- E2E testing with Playwright
- Test file locations
- Running tests
- Writing new tests

## 🎨 Design System

UI/UX design patterns and component guidelines:
- See **[CLAUDE.md](../CLAUDE.md)** → "UI/UX Design Patterns" section
- Design system foundation
- Component classes
- Color palette
- Layout patterns
- Animation guidelines

---

**Last Updated:** 2025-10-04
**Maintained by:** Development Team
