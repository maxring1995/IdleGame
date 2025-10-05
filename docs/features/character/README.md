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

## 🎯 Quick Links

**Need to...**
- **Understand how stats are calculated?** → See [Stat Calculation](CHARACTER_STATS_SYSTEM.md#helper-functions)
- **Add new stat breakdowns?** → See [Helper Functions](CHARACTER_STATS_SYSTEM.md#helper-functions)
- **Customize the UI?** → See [UI/UX Design](CHARACTER_STATS_SYSTEM.md#uiux-design)
- **Test the system?** → See [Testing](CHARACTER_STATS_SYSTEM.md#testing)

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
