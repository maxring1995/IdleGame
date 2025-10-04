# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 📚 Documentation

**All project documentation is located in the [`/docs`](docs/) folder.**

For detailed information about implementation phases, bug fixes, and technical guides, see:
- **[docs/README.md](docs/README.md)** - Complete documentation index
- **[docs/guides/QUICKSTART.md](docs/guides/QUICKSTART.md)** - Quick start guide
- **[docs/guides/ICONS.md](docs/guides/ICONS.md)** - Icon usage guide
- **[docs/guides/TROUBLESHOOTING.md](docs/guides/TROUBLESHOOTING.md)** - Common issues and solutions

## Project Overview

**Eternal Realms** is an idle RPG built with Next.js 14 (App Router), Supabase, TypeScript, and Zustand for state management. Players create characters that earn experience and gold automatically, with a growing inventory and equipment system.

### Technology Stack
- **Frontend**: Next.js 14 (App Router), React 18, TypeScript, TailwindCSS
- **Backend**: Supabase (PostgreSQL, Auth, RLS)
- **State Management**: Zustand
- **Database Management**: Supabase MCP (Model Context Protocol) via Claude Code
- **Testing**:
  - **E2E**: Playwright for browser automation
  - **Unit Tests**: Jest for backend/frontend logic
- **Development**: Hot reload, ESLint, TypeScript strict mode

## Essential Commands

### Development
```bash
# Start dev server (default: http://localhost:3000)
npm run dev

# Build for production
npm run build

# Start production server
npm run start

# Lint code
npm run lint
```

### Testing
```bash
# Run all tests (unit + E2E)
npm run test:all

# Run unit tests only
npm test
# or
npm run test:unit

# Run E2E tests only
npm run test:e2e

# Run specific E2E test file
npx playwright test test/e2e/auth.spec.ts

# Run E2E tests in headed mode (see browser)
npm run test:e2e:headed

# Run E2E tests in UI mode (interactive)
npm run test:e2e:ui

# View test report
npx playwright show-report
```

## Architecture

### Authentication System
- **Username-based accounts**: Users sign up with just a username
- **Email generation**: Backend auto-generates emails like `username@example.com`
- **Password management**: Random 32-char passwords generated and stored in localStorage
- **Session persistence**: Supabase handles tokens and auto-refresh
- **Recovery**: Password stored locally at `eternalrealms_auth_${username}`

### Database Architecture (Supabase/PostgreSQL)

**Key Tables:**
- `profiles` - User accounts (1:1 with auth.users)
- `characters` - Character data (1:1 with profiles)
- `items` - Item catalog with stats and metadata
- `inventory` - Character items with slot/equip/durability tracking
- `character_skills` - Skill progression system (combat + gathering)
- `quests` - Quest progress tracking
- `achievements` - Achievement unlocks
- `materials` - Gatherable resources (50+ materials)
- `gathering_nodes` - Resource spawn locations across world zones
- `active_gathering` - Ongoing gathering sessions
- `crafting_recipes` - Crafting system recipes

**Security:**
- All tables use Row Level Security (RLS)
- Users can only access their own data
- Profiles viewable by everyone, but only user can update own profile

### State Management (Zustand)

**Global Store** (`lib/store.ts`):
```typescript
{
  user: User | null           // Supabase auth user
  profile: Profile | null     // User profile
  character: Character | null // Active character
  isLoading: boolean
  error: string | null
}
```

**Key Methods:**
- `setUser()`, `setProfile()`, `setCharacter()` - Update state
- `updateCharacterStats()` - Partial character updates
- `reset()` - Clear all state (logout)

### File Structure

```
app/
  ├── layout.tsx       # Root layout with Zustand provider
  └── page.tsx         # Main routing (auth → character creation → game)

components/
  ├── Auth.tsx         # Username-based authentication UI
  ├── CharacterCreation.tsx  # Character creation flow
  ├── Game.tsx         # Main game interface with tabs (Adventure, Combat, Gathering, Inventory)
  ├── Combat.tsx       # Combat system UI
  ├── Gathering.tsx    # Gathering system main UI (6 skills)
  ├── GatheringSkillPanel.tsx  # Material browser and gathering sessions
  ├── MaterialInventory.tsx    # Material storage viewer
  └── Inventory.tsx    # Inventory grid and equipment UI

lib/
  ├── supabase.ts      # Supabase client + TypeScript types
  ├── auth.ts          # signUp(), signIn(), signOut()
  ├── character.ts     # createCharacter(), getCharacter(), updateCharacter()
  ├── inventory.ts     # Inventory/equipment management functions
  ├── combat.ts        # Combat logic and turn execution
  ├── materials.ts     # Material queries and skill management
  ├── gathering.ts     # Gathering sessions and resource collection
  ├── crafting.ts      # Crafting recipes and item creation
  └── store.ts         # Zustand global state

supabase/migrations/
  ├── 20241001000000_initial_schema.sql        # Initial tables + RLS
  ├── 20241002000000_add_skills_and_inventory_slots.sql  # Items + skills
  ├── 20241003000000_add_combat_system.sql     # Combat system (enemies, logs)
  ├── 20241003100000_add_boss_enemies.sql      # Boss enemies
  ├── 20241003110000_add_email_to_profiles.sql # Email column fix
  ├── 20241004000000_add_gathering_system.sql  # Gathering system (materials, nodes)
  └── 20241004100000_add_material_items.sql    # Material items in inventory
```

### Equipment System

**Equipment Slots:**
- weapon, helmet, chest, legs, boots, gloves, ring, amulet

**Item Types:**
- `weapon`, `armor`, `consumable`, `material`, `quest`

**Item Rarity:**
- `common`, `uncommon`, `rare`, `epic`, `legendary`

**Stat Calculation:**
- Character base stats + equipped item bonuses = final stats
- Auto-calculated on equip/unequip via `updateCharacterStats()`
- Bonuses: attack, defense, health, mana

**Key Functions** (`lib/inventory.ts`):
- `getInventory(characterId)` - Get all items with details (joins items table)
- `getEquippedItems(characterId)` - Get currently equipped gear
- `addItem(characterId, itemId, quantity)` - Smart stacking for consumables
- `equipItem(inventoryId, characterId)` - Equip item and update stats
- `unequipItem(inventoryId, characterId)` - Unequip and recalc stats

### Starter Items

New characters automatically receive:
- **Wooden Sword** (weapon)
- **Leather Armor** (chest)
- **3x Health Potions** (consumable)

## Database Setup

### Supabase MCP Integration
This project uses **Supabase MCP (Model Context Protocol)** for direct database management via Claude Code:
- Run migrations directly through MCP without manual SQL Editor steps
- Query database schema and data
- Inspect table contents and RLS policies
- Managed connection to production Supabase instance

### Initial Setup
1. Create Supabase project at [supabase.com](https://supabase.com)
2. Copy `.env.local.example` to `.env.local`
3. Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Configure Supabase MCP connection (if using Claude Code)
5. Run migrations via MCP or SQL Editor (in order):
   - `supabase/migrations/20241001000000_initial_schema.sql`
   - `supabase/migrations/20241002000000_add_skills_and_inventory_slots.sql`
   - `supabase/migrations/20241003000000_add_combat_system.sql`
   - `supabase/migrations/20241003100000_add_boss_enemies.sql`
   - `supabase/migrations/20241003110000_add_email_to_profiles.sql` ⚠️ **REQUIRED for auth**

### Migration Commands (if using Supabase CLI)
```bash
# Link to project
supabase link --project-ref your-project-ref

# Push migrations
supabase db push

# Reset database (careful!)
supabase db reset
```

## Common Development Patterns

### Adding New Items
1. Insert into `items` table via SQL or Supabase dashboard
2. Items automatically available in game via `getInventory()`
3. Use consistent `item_id` format: `lowercase_underscore`

### Creating Character Actions
1. Add function to `lib/character.ts` or relevant lib file
2. Call Supabase with proper error handling
3. Update Zustand store with new data
4. UI components re-render automatically

### Implementing New Features

**⚠️ IMPORTANT: All new features must include comprehensive testing**

1. **Database First**: Add tables/columns in new migration file
2. **Types**: Update interfaces in `lib/supabase.ts`
3. **Business Logic**: Add functions to `lib/` folder
4. **UI**: Create/update components
5. **State**: Integrate with Zustand store if needed
6. **Testing** (REQUIRED):
   - **Unit Tests**: Test business logic functions in `test/unit/`
   - **Frontend Tests**: Test component rendering in `test/frontend/`
   - **E2E Tests**: Test complete user flows with Playwright in `test/e2e/`

### Feature Development Workflow (MANDATORY)

When implementing any new feature, follow this structured approach:

1. **Create Detailed To-Do List**
   - Break feature into small, testable tasks
   - Include specific test tasks for each component
   - Mark tasks as: pending → in_progress → completed

2. **Development Tasks** (for each feature component):
   - Implement core functionality
   - Write unit tests for business logic
   - Write frontend tests for UI components
   - Write E2E Playwright tests for user flows
   - Document behavior and edge cases

3. **Testing Requirements**:
   ```
   ✅ Unit Tests (test/unit/*.test.ts)
      - Test all business logic functions
      - Test edge cases and error handling
      - Aim for >80% code coverage

   ✅ Frontend Tests (test/frontend/*.test.tsx)
      - Test component rendering
      - Test user interactions
      - Test state changes

   ✅ E2E Tests (test/e2e/*.spec.ts)
      - Test complete user workflows
      - Test integration between systems
      - Test database interactions
      - Include happy path and error scenarios
   ```

4. **Task Completion Criteria**:
   - ✅ Feature implemented and working
   - ✅ All tests written and passing
   - ✅ No TypeScript errors
   - ✅ No console errors in browser
   - ✅ Code reviewed (self-review)
   - ✅ Documentation updated (if needed)

**Example To-Do Structure:**
```
1. [pending] Implement [feature] - Core functionality
2. [pending] Write unit tests for [feature]
3. [pending] Implement [feature] UI component
4. [pending] Write frontend tests for [feature] UI
5. [pending] Write E2E tests for [feature] workflow
6. [pending] Test [feature] end-to-end
```

### Real-time Updates
To add real-time subscriptions:
```typescript
const channel = supabase
  .channel('character-updates')
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'characters',
    filter: `id=eq.${characterId}`
  }, (payload) => {
    // Update Zustand store
  })
  .subscribe()
```

## Testing Strategy

### Test Frameworks
This project uses a **multi-layered testing approach**:

**End-to-End Testing (Playwright)**:
- **Framework**: Playwright for browser automation
- **Location**: `test/e2e/` directory
- **Coverage**:
  - `auth.spec.ts` - Authentication flows (signup, signin, logout)
  - `signin.spec.ts` - Sign-in specific edge cases
  - `inventory.spec.ts` - Inventory operations (equip, unequip, items)
  - `combat.spec.ts` - Combat system flows (battle, victory, defeat)
  - `quests.spec.ts` - Quest system workflows
  - `gathering.spec.ts` - Gathering system flows
  - `adventure.spec.ts` - Adventure and exploration
  - `full-flow.spec.ts` - Complete end-to-end user journey

**Unit Testing (Jest)**:
- **Framework**: Jest for unit tests
- **Location**: `test/unit/` directory
- **Coverage**:
  - `auth.test.ts` - Authentication utilities
  - `combat.test.ts` - Combat calculations
  - `gathering.test.ts` - Gathering mechanics
  - `quest-tracking.test.ts` - Quest progress tracking
  - `quests.test.ts` - Quest system logic
  - `travel.test.ts` - Travel calculations

**Frontend Testing (Jest + React Testing Library)**:
- **Framework**: Jest + React Testing Library
- **Location**: `test/frontend/` directory
- **Coverage**: Component rendering and interaction tests (to be added)

**Test Configuration:**
- **Playwright**:
  - Single worker (avoid race conditions with Supabase)
  - Auto-starts dev server on port 3000
  - Screenshots on failure saved to `test-results/`
  - HTML test report generated
  - Base URL: `http://localhost:3000`
- **Jest**:
  - Isolated unit tests for backend logic
  - No database/network dependencies
  - Fast execution for TDD workflow

### Running Tests
```bash
# Run all E2E tests
npx playwright test

# Run specific test file
npx playwright test test/e2e/combat.spec.ts

# Run tests with UI (interactive)
npx playwright test --ui

# Run tests in headed mode (see browser)
npx playwright test --headed

# View test report
npx playwright show-report

# Run unit tests
npm test
```

## Known Patterns

### Error Handling
All `lib/` functions return `{ data, error }` pattern:
```typescript
const { data, error } = await someFunction()
if (error) {
  // Handle error
  return
}
// Use data
```

### Character Stats Update Flow
1. User equips item → `equipItem()`
2. `equipItem()` calls `updateCharacterStats()`
3. Stats calculated from base + all equipped items
4. Character record updated in Supabase
5. Zustand store updated
6. UI re-renders with new stats

### Combat System Flow (Phase 3 & 4)
1. User clicks Combat tab → `Combat.tsx` renders
2. `getAvailableEnemies()` fetches enemies for player level
3. Enemies displayed in two sections:
   - **Regular Enemies**: Standard encounters
   - **Boss Encounters**: High-difficulty bosses with special abilities
4. User selects enemy → `startCombat()` creates `active_combat` record
5. Combat loop:
   - User clicks Attack → `executeTurn()`
   - OR toggle Auto-Attack for automatic combat (2-second intervals)
   - Damage calculated: `attackerAttack - (defenderDefense / 2)` with ±15% variance
   - Health updated, combat log grows
   - Repeat until victory/defeat
6. Combat ends → `endCombat()` distributes rewards
   - Victory: Award XP, gold, roll loot from probability table
   - Defeat: Reduce health to 50% max
7. Results shown in `VictoryModal`, then return to enemy selection

**Key Functions** (`lib/combat.ts`):
- `startCombat(characterId, enemyId)` - Initialize battle
- `executeTurn(characterId)` - Process one attack round
- `endCombat(characterId, victory)` - Distribute rewards/penalties
- `calculateDamage(attack, defense)` - Damage formula with variance
- `rollLoot(lootTable)` - Probability-based item drops

**Phase 4 Features**:
- **Auto-Attack Toggle**: Enable/disable automatic combat every 2 seconds
- **Boss Enemies**: Special high-difficulty encounters with:
  - Purple-themed UI with distinctive styling
  - Higher stats (health, attack, defense)
  - Better loot drops and more XP/gold
  - Special abilities (cosmetic descriptions)
  - Separate boss section in enemy list

### Gathering System Flow (Phase 4)
1. User clicks Gathering tab → `Gathering.tsx` renders
2. 8 skill buttons displayed (6 gathering + Crafting + Quest)
3. User selects skill (e.g., Woodcutting) → `GatheringSkillPanel.tsx` loads
4. Panel shows:
   - Skill level and XP progress bar
   - Available materials filtered by skill type
   - Lock indicators for level-gated materials
5. User clicks "Gather x1" or "Gather x10" → `startGathering()` creates session
6. Active gathering session displays:
   - Progress bar (real-time updates every second)
   - Time remaining countdown
   - Quantity gathered / goal
   - Auto-Gather toggle
7. Session completes → `completeGathering()` adds materials to inventory
8. XP awarded → `addSkillExperience()` updates skill level

**Key Functions** (`lib/gathering.ts`, `lib/materials.ts`):
- `getMaterialsWithDetails(characterId, skillType)` - Get materials with player's unlock status
- `startGathering(characterId, materialId, quantity)` - Start gathering session
- `processGathering(characterId)` - Update progress and check completion
- `completeGathering(characterId)` - Collect resources and award XP
- `calculateGatheringTime(baseTime, skillLevel)` - Apply efficiency bonus
- `addSkillExperience(characterId, skillType, xp)` - Level up skills

**Gathering Skills:**
- **Woodcutting** 🪓 - Oak → Willow → Maple → Yew → Magic Logs
- **Mining** ⛏️ - Copper → Iron → Mithril → Adamantite → Runite Ore + Gems
- **Fishing** 🎣 - Shrimp → Trout → Salmon → Swordfish → Shark → Manta Ray
- **Hunting** 🏹 - Rabbit → Wolf → Bear → Drake → Dragon → Phoenix materials
- **Alchemy** 🧪 - Guam → Harralander → Ranarr → Kwuarm → Torstol herbs
- **Magic** ✨ - Air/Water → Earth/Fire Essences → Nature/Chaos/Death/Soul Runes

**Skill Progression:**
- Levels 1-99 (XP formula: `level * 100`)
- Total XP to level 99: 485,100
- Efficiency bonus: 0.5% faster per level (max 49.5% at level 99)
- World zone unlocks based on character level
- 50+ materials across 5 zone tiers

### Idle Mechanics
The game has idle XP/gold generation in `Game.tsx`:
```typescript
useEffect(() => {
  const interval = setInterval(async () => {
    await addExperience(character.id, 5)
    await addGold(character.id, 10)
  }, 5000) // Every 5 seconds
  return () => clearInterval(interval)
}, [character])
```

**Gathering Auto-Mode:**
- Toggle "Auto-Gather" in gathering panel
- Automatically restarts sessions with same material
- Continues until manually stopped or inventory full
- Allows AFK/idle gathering gameplay

## Troubleshooting

### "Supabase Not Configured" Warning
- Verify `.env.local` has correct credentials
- Restart dev server after env changes

### Database Errors
- Ensure migrations ran successfully (check Table Editor)
- Verify RLS policies exist and are enabled
- Check Supabase project is active (not paused)

### Character/Inventory Not Saving
- Open browser console (F12) for errors
- Check Network tab for failed requests
- Verify Supabase credentials are correct
- Ensure RLS policies allow user access

### Test Failures
- Database may have stale data from previous test runs
- Tests share same Supabase instance (consider cleanup)
- Ensure dev server is running before tests

## Environment Variables

Required in `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
NODE_ENV=development
```

## Security Considerations

- **Never commit `.env.local`** (already in .gitignore)
- **RLS is mandatory** - All tables must have RLS policies
- **Client-side auth** - Tokens managed by Supabase Auth
- **Generated passwords** stored in localStorage (low-security design, intentional for ease-of-use)
- **UUID primary keys** prevent enumeration attacks

---

## 🎨 UI/UX Design Patterns

This project follows professional game UI/UX design patterns inspired by AAA RPGs (World of Warcraft, Diablo, Path of Exile). All components use a unified design system for consistency.

### Design System Foundation

**Location**: [app/globals.css](app/globals.css:1-327)

#### Color Palette
```css
/* Primary Colors */
--color-gold: #f59e0b;         /* Main accent color (buttons, highlights) */
--color-crimson: #dc2626;      /* Danger, HP, attack */
--color-emerald: #10b981;      /* Success, positive actions */
--color-sapphire: #3b82f6;     /* Info, MP, defense */
--color-amethyst: #a855f7;     /* Special, rare items */

/* Layered Backgrounds (creates depth) */
--bg-world: #0a0a0f;           /* Base background */
--bg-panel: rgba(20, 20, 30, 0.95);   /* Main panels */
--bg-card: rgba(30, 30, 45, 0.80);    /* Cards */
--bg-glass: rgba(15, 15, 25, 0.70);   /* Glass effect overlays */
```

#### Component Classes

**Panels** (containers for content):
```html
<div class="panel">          <!-- Standard panel with backdrop blur -->
<div class="panel-glass">    <!-- Semi-transparent glass effect -->
```

**Cards** (individual items, smaller containers):
```html
<div class="card">           <!-- Basic card -->
<div class="card-hover">     <!-- Card with hover lift effect -->
```

**Buttons**:
```html
<button class="btn btn-primary">     <!-- Gold gradient, main actions -->
<button class="btn btn-secondary">   <!-- Gray, secondary actions -->
<button class="btn btn-danger">      <!-- Red, destructive actions -->
<button class="btn btn-success">     <!-- Green, positive actions -->
```

**Progress Bars**:
```html
<div class="progress-bar">
  <div class="progress-fill bg-gradient-to-r from-red-500 to-red-600" style="width: 75%"></div>
</div>
<!-- Includes animated shimmer effect -->
```

**Badges** (labels, tags):
```html
<span class="badge badge-common">Common</span>
<span class="badge badge-uncommon">Uncommon</span>
<span class="badge badge-rare">Rare</span>
<span class="badge badge-epic">Epic</span>
<span class="badge badge-legendary">Legendary</span>
```

**Stat Boxes** (stat displays):
```html
<div class="stat-box">
  <span class="text-gray-400">Attack</span>
  <span class="text-red-400 font-bold">150</span>
</div>
```

### Layout Patterns

#### 1. MMO-Style Main Layout
**File**: [components/Game.tsx](components/Game.tsx:44-344)

**Structure**:
- **Sticky Header** (lines 46-132): Always-visible character info, HP/MP/XP bars, resources
- **3-Column Grid** (lines 136-341):
  - **Left Sidebar** (25%): Character portrait, stats, quick actions
  - **Main Content** (75%): Tabbed interface (Adventure, Combat, Gathering, Inventory)
  - **Responsive**: Collapses to single column on mobile

**Key Features**:
```tsx
// Sticky header with real-time stats
<div className="sticky top-0 z-40 panel-glass border-b">
  {/* Character info, HP/MP/XP bars */}
</div>

// Mesh gradient background for depth
<div className="min-h-screen bg-mesh-gradient">
```

#### 2. Equipment Overlay Pattern
**File**: [components/EquipmentOverlay.tsx](components/EquipmentOverlay.tsx:231-714)

**Structure** (3-column modal):
- **Left** (33%): Categorized equipment slots (Offense/Defense/Accessories)
- **Middle** (42%): Available items with search/filter/sort
- **Right** (25%): Stats summary, item comparison, tips

**Key Features**:
- Equipment completion progress bar
- Smart slot filtering (click slot → filter compatible items)
- Hover preview system
- Multi-sort options (rarity, name, level, attack, defense)

#### 3. Combat Battle Arena
**File**: [components/Combat.tsx](components/Combat.tsx:186-444)

**Structure**:
- **Battle Header** (lines 197-244): Enemy info, auto-battle toggle
- **2-Column Combatants** (lines 247-389): Player vs Enemy cards
- **Combat Log** (lines 392-398): Scrollable action history
- **Attack Controls** (lines 401-433): Large centered button with animations

**Visual Design**:
```tsx
// Grid pattern background for arena feel
<div className="bg-[url('data:image/svg+xml...')]">

// Color-coded health bars
{playerHealthPercent <= 25 ? 'bg-red-600' : 'bg-green-500'}

// Boss encounter styling
{currentEnemy.is_boss && (
  <div className="border-purple-500 bg-gradient-to-br from-purple-950/40">
)}
```

#### 4. Inventory Grid System
**File**: [components/Inventory.tsx](components/Inventory.tsx:188-489)

**Structure**:
- **Controls Bar** (lines 200-291): Tabs, search, sort, filter
- **2-Column Layout** (lines 294-486):
  - **Item Grid** (67%): 6-column responsive grid (lines 303-363)
  - **Details Panel** (33%): Sticky item details with actions (lines 368-478)

**Grid Features**:
```tsx
// Responsive grid (3→4→5→6 columns)
<div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">

// Rarity-based styling
<button className={`
  ${getRarityBorder(item.rarity)}
  ${getRarityBg(item.rarity)}
  ${isSelected ? 'ring-2 ring-amber-500 scale-105' : ''}
`}>
```

### Interaction Patterns

#### Search, Filter & Sort
**Implementation**: All list views (Inventory, Equipment)

```tsx
// State management
const [searchQuery, setSearchQuery] = useState('')
const [filterBy, setFilterBy] = useState<FilterOption>('all')
const [sortBy, setSortBy] = useState<SortOption>('rarity')

// Filter function
function filterItems(items: Item[]) {
  return items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesFilter = filterBy === 'all' || item.type === filterBy
    return matchesSearch && matchesFilter
  })
}

// Sort function (rarity example)
function sortItems(items: Item[]) {
  return [...items].sort((a, b) =>
    getRarityValue(b.rarity) - getRarityValue(a.rarity)
  )
}
```

#### Hover Preview System
**Implementation**: Equipment Overlay (lines 519, 623-679)

```tsx
// State
const [compareItem, setCompareItem] = useState<Item | null>(null)

// Trigger on hover
<button onMouseEnter={() => setCompareItem(item)}>

// Display in sidebar
{compareItem && (
  <div className="panel p-4">
    {/* Full item details */}
  </div>
)}
```

#### Auto-Refresh Polling
**Implementation**: Gathering, Combat

```tsx
useEffect(() => {
  if (!character) return

  const interval = setInterval(async () => {
    const { data } = await checkProgress(character.id)
    if (data) setActiveSession(data)
  }, 1000) // Poll every second

  return () => clearInterval(interval)
}, [character])
```

### Visual Feedback Patterns

#### 1. Loading States
```tsx
// Spinner
<div className="flex items-center justify-center py-20">
  <div className="w-16 h-16 border-4 border-amber-500/30 border-t-amber-500
                  rounded-full animate-spin"></div>
  <p className="text-gray-400">Loading...</p>
</div>
```

#### 2. Empty States
```tsx
// Engaging empty state
<div className="text-center py-32">
  <div className="inline-block p-8 rounded-2xl bg-gradient-to-br
                  from-amber-500/10 to-amber-600/5 border border-amber-500/20 mb-6">
    <span className="text-8xl animate-float">🗺️</span>
  </div>
  <h2 className="text-3xl font-bold text-white mb-3">Adventure Awaits!</h2>
  <p className="text-gray-400">Explore the vast world...</p>
</div>
```

#### 3. Error Messages
```tsx
// Error banner
<div className="bg-red-900/20 border border-red-500/50 rounded-xl p-4
                text-red-400 flex items-center gap-3 animate-pulse">
  <span className="text-2xl">⚠️</span>
  <span>{error}</span>
</div>
```

#### 4. Success Feedback
```tsx
// Success badge on item
{item.equipped && (
  <div className="absolute top-1 right-1 w-3 h-3 bg-emerald-500
                  rounded-full border-2 border-white shadow-lg"></div>
)}
```

### Animation & Transitions

**Timing Functions** (globals.css:82-84):
```css
--transition-fast: 150ms cubic-bezier(0.4, 0, 0.2, 1);
--transition-base: 250ms cubic-bezier(0.4, 0, 0.2, 1);
--transition-slow: 350ms cubic-bezier(0.4, 0, 0.2, 1);
```

**Common Animations**:
```css
/* Floating effect (Coming Soon badges) */
.animate-float {
  animation: float 3s ease-in-out infinite;
}

/* Slow pulse (active indicators) */
.animate-pulse-slow {
  animation: pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

/* Progress bar shimmer */
.progress-fill::after {
  animation: shimmer 2s infinite;
}
```

**Hover Effects**:
```tsx
// Card lift on hover
<div className="card-hover">  {/* Auto-applies transform: translateY(-2px) */}

// Button glow effect
<button className="group">
  <div className="absolute inset-0 bg-gradient-to-r from-transparent
                  via-white/20 to-transparent translate-x-[-100%]
                  group-hover:translate-x-[100%] transition-transform duration-700"></div>
</button>
```

### Typography & Iconography

#### Font Scale (globals.css:54-62)
```css
--font-xs: 0.6875rem;   /* 11px - Labels, metadata */
--font-sm: 0.8125rem;   /* 13px - Body text, descriptions */
--font-base: 0.9375rem; /* 15px - Default text */
--font-lg: 1.0625rem;   /* 17px - Subheadings */
--font-xl: 1.25rem;     /* 20px - Headings */
--font-2xl: 1.5rem;     /* 24px - Large headings */
--font-3xl: 2rem;       /* 32px - Hero text */
--font-4xl: 2.5rem;     /* 40px - Display text */
```

#### Text Effects
```tsx
// Text shadow for readability
<h1 className="text-shadow">Title</h1>
<h1 className="text-shadow-lg">Large Title</h1>

// Glowing text
<span className="text-glow-gold">Legendary Item</span>
<span className="text-glow-crimson">Critical Hit!</span>
```

#### Emoji Usage
**Consistent icon mapping**:
- ⚔️ Attack, Combat, Weapons
- 🛡️ Defense, Armor
- ❤️ Health, HP
- 💧 Mana, MP
- 💰 Gold, Currency
- 💎 Gems, Premium
- 🪓 Woodcutting
- ⛏️ Mining
- 🎣 Fishing
- 🏹 Hunting
- 🧪 Alchemy
- ✨ Magic
- 👑 Boss encounters

### Responsive Design Strategy

**Breakpoints** (Tailwind defaults):
- `sm:` 640px
- `md:` 768px
- `lg:` 1024px
- `xl:` 1280px

**Mobile-First Pattern**:
```tsx
// Stack on mobile, side-by-side on desktop
<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

// Hide on mobile, show on desktop
<div className="hidden lg:flex">

// Different column counts by screen size
<div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
```

### Best Practices

#### 1. **Consistency**
- Always use design system classes (`.panel`, `.card`, `.btn-*`)
- Match existing color schemes for similar features
- Use established icon mappings (⚔️ = attack, 🛡️ = defense)

#### 2. **Performance**
- Use CSS variables for theme colors (easy to change globally)
- Leverage GPU acceleration for animations (transform, opacity)
- Implement polling intervals carefully (1-3 seconds typical)

#### 3. **Accessibility**
- Minimum contrast ratio 4.5:1 for text
- Minimum click target size: 44x44px (touch-friendly)
- Focus states on all interactive elements
- Semantic HTML structure

#### 4. **Visual Hierarchy**
- Use size, color, and spacing to create importance
- Group related items together
- Provide breathing room with consistent spacing
- Use contrast to draw attention

#### 5. **Error Prevention**
- Disable buttons during loading states
- Show clear requirements before actions (level requirements)
- Confirm destructive actions (flee combat, delete items)

### Common Rarity Color System

Used consistently across all item types:

```tsx
function getRarityColor(rarity: string) {
  switch (rarity) {
    case 'common': return 'text-gray-400'
    case 'uncommon': return 'text-green-400'
    case 'rare': return 'text-blue-400'
    case 'epic': return 'text-purple-400'
    case 'legendary': return 'text-yellow-400'
    default: return 'text-white'
  }
}

function getRarityBorder(rarity: string) {
  switch (rarity) {
    case 'common': return 'border-gray-500/50'
    case 'uncommon': return 'border-green-500/50'
    case 'rare': return 'border-blue-500/50'
    case 'epic': return 'border-purple-500/50'
    case 'legendary': return 'border-yellow-500/50'
    default: return 'border-white/10'
  }
}
```

### Adding New Features

When implementing new game features:

1. **Follow the pattern** of existing similar components
2. **Use design system classes** instead of custom styles
3. **Implement all feedback states**: loading, empty, error, success
4. **Add responsive design** from the start
5. **Test hover/focus states** on all interactive elements
6. **Match color schemes** to feature type (combat=red, gathering=green, etc.)
7. **Include helpful empty states** with engaging visuals

**Example New Feature Checklist**:
- [ ] Uses `.panel` or `.card` for containers
- [ ] Has loading spinner for async actions
- [ ] Shows helpful empty state when no data
- [ ] Displays errors with red banner + icon
- [ ] Includes hover states on all buttons/cards
- [ ] Works on mobile (tested at 640px width)
- [ ] Uses established color scheme
- [ ] Follows spacing system (gap-3, gap-4, gap-6)
- [ ] Has proper text hierarchy (sizes, weights)
- [ ] Icons/emojis match existing patterns
