# Character System Documentation

This folder contains documentation for the character management and stats system.

## 📚 Available Documentation

### [CHARACTER_STATS_SYSTEM.md](CHARACTER_STATS_SYSTEM.md)
Complete documentation for the Character Stats System, including:
- Feature overview and capabilities
- UI/UX design and layout
- Helper functions and data flow
- Integration details
- Testing guidelines
- Future enhancement ideas

### [CLASS_SYSTEM.md](CLASS_SYSTEM.md) ⭐ **NEW**
Complete documentation for the Class System, including:
- **Weapon Proficiency System** - Class-based weapon restrictions with 10 weapon types
- **Class Abilities System** - Active combat abilities with cooldowns and resource management
- Database schema and server-side validation (triggers, functions)
- Client-side implementation (TypeScript, React components)
- Rich UI feedback (visual indicators, tooltips, cooldowns)
- Testing guidelines and troubleshooting
- Future enhancements (talent trees, weapon mastery, ultimate abilities)

## 🎯 Quick Links

**Need to...**
- **Understand how stats are calculated?** → See [Stat Calculation](CHARACTER_STATS_SYSTEM.md#helper-functions)
- **Add new stat breakdowns?** → See [Helper Functions](CHARACTER_STATS_SYSTEM.md#helper-functions)
- **Customize the UI?** → See [UI/UX Design](CHARACTER_STATS_SYSTEM.md#uiux-design)
- **Test the system?** → See [Testing](CHARACTER_STATS_SYSTEM.md#testing)
- **Understand weapon proficiencies?** → See [Weapon Proficiency System](CLASS_SYSTEM.md#1-weapon-proficiency-system)
- **Implement class abilities?** → See [Class Abilities System](CLASS_SYSTEM.md#2-class-abilities-system)
- **Add new weapon types?** → See [Database Schema](CLASS_SYSTEM.md#database-schema)
- **Debug proficiency issues?** → See [Troubleshooting](CLASS_SYSTEM.md#troubleshooting)

## 🔍 Feature Overview

The Character System provides comprehensive character management features:

### Character Stats Panel
Located at: **Character Tab → Overview → Character Stats**

**Key Features**:
- ✅ Detailed stat breakdowns (Base + Equipment + Buffs = Total)
- ✅ Equipment bonus analysis
- ✅ Active buff tracking with countdown timers
- ✅ Character progression display
- ✅ Real-time updates
- ✅ Responsive design

**Access**:
1. Navigate to Character tab
2. Click Character Stats card (📈 icon)
3. View comprehensive character information

### Class System ⭐ **NEW**
Located at: **Inventory Tab (Weapon Restrictions) + Combat Tab (Abilities)**

**Key Features**:
- ✅ **Weapon Proficiency** - Class-based weapon restrictions (10 weapon types)
- ✅ **Visual Indicators** - Grayscale unusable items, 🚫 badges, red borders
- ✅ **Database Enforcement** - Server-side triggers prevent bypassing restrictions
- ✅ **Class Abilities** - Active combat skills with icons, cooldowns, mana costs
- ✅ **Ability Tooltips** - Hover for detailed descriptions and costs
- ✅ **Real-time Cooldowns** - Live countdown timers on ability buttons
- ✅ **Smart Filtering** - "Show Only Usable Items" toggle in inventory

**Access**:
1. **Weapon Proficiency**: Open Inventory → See weapon type icons and restrictions
2. **Class Abilities**: Enter Combat → Ability grid appears below enemy info
3. **Proficiency Info**: Character Stats → Class card shows weapon proficiencies

## 📁 Files

### Components
- `components/CharacterStats.tsx` - Main stats panel component
- `components/CharacterTab.tsx` - Character menu with stats button

### Libraries
- `lib/characterStats.ts` - Stat calculation helpers and utilities

## 🔧 Implementation Details

### Stat Calculation Flow
```
1. Load character data (from Zustand store)
2. Fetch equipped items (via getEquippedItems)
3. Fetch active buffs (via getActiveBuffs)
4. Calculate stat breakdown (via calculateStatBreakdown)
5. Display results in UI
6. Poll buffs every 2 seconds for real-time updates
```

### Data Sources
- **Character**: Zustand global store
- **Equipment**: `lib/inventory.ts` → `getEquippedItems()`
- **Buffs**: `lib/consumables.ts` → `getActiveBuffs()`
- **Skills**: `lib/skills.ts` → `getCharacterSkills()`

## 🎨 Design Patterns

### Layout
- **Responsive Grid**: 2-column on desktop (60/40), single column on mobile
- **Color Coding**: Red (Attack), Blue (Defense), Green (Health), Cyan (Mana)
- **Hover Effects**: Tooltips showing stat sources
- **Animations**: Progress bars, stat boxes, resource icons

### User Experience
- **Loading State**: Spinner while fetching data
- **Empty States**: Helpful messages when no equipment/buffs
- **Real-time Updates**: Buffs countdown automatically
- **Expandable Sections**: Equipment details on demand

## 🧪 Testing

### Manual Testing Checklist
- [ ] Stats display correctly
- [ ] Equipment bonuses calculate accurately
- [ ] Buffs show with correct timers
- [ ] Responsive design works on all screen sizes
- [ ] Empty states display appropriately
- [ ] Navigation works correctly

### Test Scenarios
1. No equipment equipped
2. Multiple active buffs (3+)
3. Low health (≤25%)
4. Equipment changes
5. Buff expiration

## 🚀 Future Enhancements

Potential improvements:
- Stat comparison tool
- DPS calculator
- Historical tracking
- Exportable character sheets
- Buff management features

## 🐛 Known Issues

### Fixed Issues
- ✅ **Equipment Manager Z-Index** - Fixed in 2025-10-05 (see [Changelog](../../CHANGELOG_2025-10-05.md))

### Current Issues
- None reported

## 📖 Related Documentation

- [Main Documentation](../../README.md)
- [Changelog 2025-10-05](../../CHANGELOG_2025-10-05.md)
- [Skills System](../skills/README.md)
- [Equipment System](../../CLAUDE.md#equipment-system)
- [UI/UX Design Patterns](../../CLAUDE.md#ui-ux-design-patterns)

## 💡 Contributing

When adding new features to the character system:

1. **Update Documentation**: Keep CHARACTER_STATS_SYSTEM.md current
2. **Add Tests**: Include manual test cases
3. **Follow Patterns**: Use existing UI/UX design patterns
4. **Update Changelog**: Document changes in main changelog

## 📞 Support

For questions or issues:
- Check [TROUBLESHOOTING.md](../../guides/TROUBLESHOOTING.md)
- Review [CHARACTER_STATS_SYSTEM.md](CHARACTER_STATS_SYSTEM.md)
- See main [README.md](../../README.md)
