# Documentation - Eternal Realms

Comprehensive documentation for the Eternal Realms idle RPG project.

## 📖 Primary Documentation

🎯 **[GAME_WIKI.md](GAME_WIKI.md)** - **Complete Game Systems Documentation** (8,000+ lines)
- All 13 game systems fully documented
- System dependencies and interconnections
- Database schemas and code examples
- Complete technical reference

## 📂 Documentation Structure

```
docs/
├── GAME_WIKI.md       # ⭐ PRIMARY DOCUMENTATION - Complete game reference
├── features/          # Feature-specific detailed docs
│   ├── quests/        # Quest system
│   ├── combat/        # Combat system
│   ├── gathering/     # Gathering skills
│   ├── crafting/      # Crafting system
│   ├── adventure/     # Travel & exploration
│   ├── notifications/ # Notification system
│   ├── skills/        # 20-Skill system
│   ├── character/     # Character stats system
│   └── authentication/# Auth system
├── guides/            # User guides & quickstarts
├── archive/           # Historical docs (outdated)
└── README.md          # This file
```

## 🎮 Game Systems Overview

**For complete documentation of all systems, see [GAME_WIKI.md](GAME_WIKI.md)**

### 13 Documented Systems

1. **[Authentication & Account](GAME_WIKI.md#1-authentication--account-system)** - Username-based auth, profiles
2. **[Character System](GAME_WIKI.md#2-character-system)** - Stats, classes, races, progression
3. **[Inventory & Equipment](GAME_WIKI.md#3-inventory--equipment-system)** - Items, equipment slots, rarity
4. **[Combat System](GAME_WIKI.md#4-combat-system)** - Turn-based combat, enemies, bosses, abilities
5. **[Skills & Leveling](GAME_WIKI.md#5-skills--leveling-system)** - 20 skills, XP, progression
6. **[Gathering System](GAME_WIKI.md#6-gathering-system)** - 6 gathering skills, 50+ materials
7. **[Crafting System](GAME_WIKI.md#7-crafting-system)** - 60+ recipes, professions
8. **[Quest System](GAME_WIKI.md#8-quest-system)** - Quest types, tracking, rewards
9. **[Exploration & Adventure](GAME_WIKI.md#10-exploration--adventure)** - Zones, landmarks, travel
10. **[Economy & Merchants](GAME_WIKI.md#11-economy--merchants)** - Gold, trading, merchants
11. **[Notification System](GAME_WIKI.md#12-notification-system)** - Toast notifications, notification center
12. **[UI/UX Design System](GAME_WIKI.md#13-uiux-design-system)** - Design patterns, components
13. **[System Dependencies](GAME_WIKI.md#14-system-dependencies--interconnections)** - How systems connect

### Detailed Feature Documentation

For implementation details and deep dives:
- **[Quest System](features/quests/README.md)** - Implementation details
- **[Combat System](features/combat/README.md)** - Combat mechanics
- **[20-Skill System](features/skills/COMPLETE_SKILL_SYSTEM.md)** - All skill details
- **[Character Stats System](features/character/CHARACTER_STATS_SYSTEM.md)** - Stat calculations
- **[Gathering System](features/gathering/README.md)** - Gathering mechanics
- **[Crafting System](features/crafting/README.md)** - Recipe details
- **[Adventure System](features/adventure/README.md)** - Travel & exploration
- **[Notification System](features/notifications/README.md)** - Notification implementation
- **[Authentication](features/authentication/README.md)** - Auth implementation

## 📖 Guides

- **[QUICKSTART.md](guides/QUICKSTART.md)** - Quick start guide for new developers
- **[TESTING.md](guides/TESTING.md)** - Testing strategy and Playwright setup
- **[TROUBLESHOOTING.md](guides/TROUBLESHOOTING.md)** - Common issues and solutions
- **[ICONS.md](guides/ICONS.md)** - Icon usage guide and visual reference
- **[FEATURE2_SUMMARY.md](guides/FEATURE2_SUMMARY.md)** - Feature 2 implementation summary

## 📦 Archived Documentation

Historical documentation has been moved to **[archive/](archive/)**:
- Bug fix reports (resolved issues)
- Phase documentation (superseded by GAME_WIKI.md)
- Balance change summaries (historical)
- System overhaul docs (historical)

These files are kept for historical reference but are no longer maintained.

## 🔍 Quick Navigation

**Need to...**
- **📖 Understand the entire game?** → [GAME_WIKI.md](GAME_WIKI.md) ⭐ **START HERE**
- **🚀 Start developing?** → [guides/QUICKSTART.md](guides/QUICKSTART.md)
- **🎮 View all 13 systems?** → [GAME_WIKI.md - Table of Contents](GAME_WIKI.md#table-of-contents)
- **🔗 Understand system dependencies?** → [GAME_WIKI.md - Section 14](GAME_WIKI.md#14-system-dependencies--interconnections)
- **💾 See database schema?** → [GAME_WIKI.md](GAME_WIKI.md) (each system section)
- **🎨 Follow design patterns?** → [GAME_WIKI.md - UI/UX](GAME_WIKI.md#13-uiux-design-system)
- **🐛 Fix a bug?** → [guides/TROUBLESHOOTING.md](guides/TROUBLESHOOTING.md)
- **✨ Add icons?** → [guides/ICONS.md](guides/ICONS.md)
- **🧪 Write tests?** → [guides/TESTING.md](guides/TESTING.md)
- **⚔️ Implement features?** → See feature folders in [features/](features/)

## 📅 Latest Updates

- **2025-10-06** - 🎉 **COMPREHENSIVE GAME WIKI CREATED** - All 13 systems documented in [GAME_WIKI.md](GAME_WIKI.md) (8,000+ lines)
  - Complete system documentation (Authentication, Character, Inventory, Combat, Skills, Gathering, Crafting, Quests, Exploration, Economy, Notifications, UI/UX)
  - System interconnection diagrams
  - Database schemas for all tables
  - Code examples and implementation patterns
  - Archived outdated documentation to `archive/`
- **2025-10-05** - CHARACTER STATS SYSTEM - Complete stat breakdowns, equipment bonuses, active buffs
- **2025-10-04** - COMPLETE 20-SKILL SYSTEM IMPLEMENTED - All skills functional with 60+ recipes
- **2025-10-04** - Added Magic & Ranged combat styles with UI selector
- **2025-10-04** - Reorganized documentation into feature-based structure

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

## 📊 Documentation Statistics

- **GAME_WIKI.md**: 8,000+ lines of comprehensive documentation
- **13 Game Systems**: Fully documented
- **Database Tables**: 40+ tables documented with schemas
- **Code Examples**: 100+ code snippets and examples
- **Feature Docs**: 10+ detailed feature guides
- **User Guides**: 5+ quickstart and troubleshooting guides

---

**Last Updated:** 2025-10-06
**Primary Documentation:** [GAME_WIKI.md](GAME_WIKI.md)
**Maintained by:** Development Team
