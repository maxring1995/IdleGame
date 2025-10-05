# Character Stats System

**Implementation Date**: 2025-10-05
**Status**: ✅ Complete
**Location**: `components/CharacterStats.tsx`, `lib/characterStats.ts`

## Overview

The Character Stats System provides players with a comprehensive breakdown of their character's statistics, equipment bonuses, active buffs, and progression. Accessible from the Character tab → Overview → Character Stats card.

## Features

### 1. Character Overview
- **Character avatar** with first initial
- **Character name**, level, and class display
- **Member since date** with formatted playtime (e.g., "2h 30m", "5d 12h")
- **Quick stats summary**: Total skill level, Combat skill level, Equipped items count

### 2. Core Combat Stats
Detailed breakdown showing the sources of each stat:

- **Attack** = Base + Equipment + Buffs
- **Defense** = Base + Equipment + Buffs
- **Health** = Current / Max (with progress bar)
- **Mana** = Current / Max (with progress bar)

**Hover Interaction**: Hover over any stat to see detailed breakdown:
```
Attack: Base: 50 | Equipment: +80 | Buffs: +20
```

**Visual Feedback**:
- Color-coded stats (Red=Attack, Blue=Defense, Green=Health, Cyan=Mana)
- Animated progress bars for HP/MP
- Health bar turns red and pulses when ≤25%

### 3. Equipment Bonuses Breakdown

**Summary View** (4 stat boxes):
- Total Attack bonus from equipment
- Total Defense bonus from equipment
- Total Health bonus from equipment
- Total Mana bonus from equipment

**Expandable Details**:
- Click "Show Details" to expand
- Shows each equipped item with:
  - Item name (rarity-colored)
  - Equipment slot (weapon, helmet, chest, etc.)
  - Stats contributed per item
- Empty state message if no equipment equipped

### 4. Active Effects
Real-time display of active buffs:

- **Buff icon** (⚔️ Attack, 🛡️ Defense, ⭐ Experience, etc.)
- **Buff name** and source item
- **Effect value** (+X% stat boost)
- **Progress bar** showing time remaining
- **Countdown timer** (updates every 2 seconds)

**Empty State**: Shows message when no buffs active with tip to use consumables

### 5. Character Progression
- **XP Progress Bar** to next level with percentage
- **Total Skill Level** across all skills
- **Combat Skill Level** (sum of combat skills only)

### 6. Resources
- **Gold** with hover animation
- **Gems** with hover animation
- **Mastery Points** with hover animation

### 7. Character Info
- Character ID (truncated)
- Account created date
- Total playtime
- Last active timestamp

## File Structure

```
lib/
  characterStats.ts          # Stat calculation helpers
components/
  CharacterStats.tsx         # Main stats panel component
  CharacterTab.tsx           # Character menu with stats button
```

## Helper Functions

### `lib/characterStats.ts`

#### `calculateStatBreakdown(character, equippedItems, activeBuffs)`
Calculates comprehensive stat breakdown for all character stats.

**Returns**:
```typescript
{
  attack: { base: number, equipment: number, buffs: number, total: number },
  defense: { base: number, equipment: number, buffs: number, total: number },
  max_health: { base: number, equipment: number, buffs: number, total: number },
  max_mana: { base: number, equipment: number, buffs: number, total: number },
  // ...
}
```

#### `formatStatWithSources(statName, breakdown)`
Formats a stat breakdown into readable text:
```
"Base: 50 | Equipment: +80 | Buffs: +20"
```

#### `getEquipmentContribution(equippedItems)`
Returns array of equipment contributions by slot:
```typescript
[
  {
    slot: 'weapon',
    itemName: 'Steel Sword',
    rarity: 'uncommon',
    stats: { attack: 50, defense: 0, health: 0, mana: 0 }
  },
  // ...
]
```

#### `getTotalEquipmentStats(equippedItems)`
Sums all equipment bonuses:
```typescript
{ attack: 150, defense: 80, health: 50, mana: 30 }
```

#### `formatDuration(startDate)`
Formats time duration for playtime display:
```
"2h 30m"  // < 1 day
"5d 12h"  // >= 1 day
```

## Data Flow

1. **Component Mount**:
   - Load equipped items via `getEquippedItems(characterId)`
   - Load active buffs via `getActiveBuffs(characterId)`
   - Load character skills via `getCharacterSkills(characterId)`

2. **Stat Calculation**:
   - Triggered whenever character, equipment, or buffs change
   - Uses `calculateStatBreakdown()` to compute all stats
   - Stores result in component state

3. **Real-time Updates**:
   - Buff polling every 2 seconds via `setInterval`
   - Stats recalculated automatically when buffs change
   - Countdown timers update continuously

## UI/UX Design

### Layout
- **Responsive 3-column grid**:
  - Desktop (lg+): 2 columns (60% left panel / 40% right panel)
  - Tablet (md): 2 columns (50/50 split)
  - Mobile (sm): Single column stack

### Color Scheme
- **Attack**: Red (`text-red-400`)
- **Defense**: Blue (`text-blue-400`)
- **Health**: Green/Yellow/Red based on percentage
- **Mana**: Cyan (`text-cyan-400`)
- **Gold**: Amber (`text-amber-400`)
- **Gems**: Purple (`text-purple-400`)
- **Mastery**: Cyan (`text-cyan-400`)

### Animations
- Progress bar shimmer effect on hover
- Stat boxes hover effect (background glow)
- Resource icons scale and rotate on hover
- Expandable sections slide down smoothly
- Loading spinner on initial data fetch

### Accessibility
- Hover tooltips for stat breakdowns
- Clear visual hierarchy with headings
- High contrast text on dark backgrounds
- Consistent spacing and alignment

## Integration

### Character Tab
Located at: **Character → Overview → Character Stats**

```tsx
// CharacterTab.tsx
const [showCharacterStats, setShowCharacterStats] = useState(false)

{showCharacterStats ? (
  <CharacterStats character={character} />
) : (
  // Character menu grid
)}
```

### Navigation
- Click "Character Stats" card to open
- Click "← Back to Character Menu" to return

## Technical Details

### Dependencies
- `@/lib/store` - Zustand store for character data
- `@/lib/inventory` - Equipment queries
- `@/lib/consumables` - Active buff queries
- `@/lib/skills` - Character skills queries
- `@/lib/characterStats` - Stat calculation helpers

### Performance Optimizations
- Buffs polled every 2 seconds (not every render)
- Stats calculation memoized via `useEffect` dependency array
- Equipment details only shown when expanded
- Loading state prevents premature rendering

### Edge Cases Handled
- No equipment equipped → Empty state message
- No active buffs → Helpful empty state with tip
- Low health (≤25%) → Red pulsing animation
- Loading → Spinner with proper z-index

## Future Enhancements

Potential improvements:

1. **Stat Comparison**:
   - Compare current stats with different equipment loadouts
   - Show stat changes when hovering over inventory items

2. **Advanced Breakdowns**:
   - Show base stats before any equipment
   - Display stat caps and diminishing returns
   - Add DPS calculator

3. **Buff Management**:
   - Cancel active buffs manually
   - Queue buffs for future use
   - Buff conflict warnings

4. **Exportable Stats**:
   - Share character stats as image
   - Export to JSON for external tools
   - Compare with other players

5. **Historical Tracking**:
   - Graph stat changes over time
   - Track highest stats achieved
   - Record buff usage statistics

## Related Documentation

- [Character System](../character/README.md)
- [Equipment System](../equipment/README.md) (if exists)
- [Consumables System](../consumables/README.md) (if exists)
- [Skills System](../skills/README.md)
- [UI/UX Design Patterns](../../CLAUDE.md#ui-ux-design-patterns)

## Bug Fixes

### Equipment Manager Z-Index Issue
**Issue**: Equipment Manager overlay not appearing when opened from Character Tab

**Root Cause**: Parent container in `Game.tsx` uses `scale-100` transform which creates new stacking context, breaking `fixed` positioning for child overlays.

**Solution**: Increased `EquipmentOverlay` z-index from `z-50` to `z-[9999]` to ensure it renders above all content.

**File Changed**: `components/EquipmentOverlay.tsx:233`

## Testing

### Manual Testing Checklist
- [ ] Character stats display correctly
- [ ] Equipment bonuses calculate properly
- [ ] Active buffs show with correct timers
- [ ] Expanding equipment details works
- [ ] Stats update when equipment changes
- [ ] Stats update when buffs expire
- [ ] Responsive design on mobile/tablet/desktop
- [ ] Empty states display when appropriate
- [ ] Loading state shows on initial load
- [ ] Navigation (back button) works correctly

### Test Scenarios
1. **No Equipment**: Verify all equipment bonuses show 0
2. **Multiple Buffs**: Test with 3+ active buffs simultaneously
3. **Low Health**: Verify red pulsing animation at ≤25% HP
4. **Level Up**: Check XP progress bar resets correctly
5. **Equipment Change**: Equip/unequip items and verify stats update
6. **Buff Expiration**: Watch buff timer count down to 0 and disappear

## Changelog

### 2025-10-05
- ✅ Initial implementation
- ✅ Created `lib/characterStats.ts` with helper functions
- ✅ Created `components/CharacterStats.tsx` main component
- ✅ Integrated with `CharacterTab.tsx`
- ✅ Fixed Equipment Manager z-index issue
- ✅ Added comprehensive stat breakdowns
- ✅ Implemented real-time buff tracking
- ✅ Added responsive design
- ✅ Created documentation
