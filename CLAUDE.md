# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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
# Run all Playwright tests (requires dev server)
npx playwright test

# Run specific test file
npx playwright test tests/auth.spec.ts

# Run tests in headed mode (see browser)
npx playwright test --headed

# Run tests in UI mode (interactive)
npx playwright test --ui

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
- `character_skills` - Skill progression system
- `quests` - Quest progress tracking
- `achievements` - Achievement unlocks

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
  ├── Game.tsx         # Main game interface with tabs
  └── Inventory.tsx    # Inventory grid and equipment UI

lib/
  ├── supabase.ts      # Supabase client + TypeScript types
  ├── auth.ts          # signUp(), signIn(), signOut()
  ├── character.ts     # createCharacter(), getCharacter(), updateCharacter()
  ├── inventory.ts     # Inventory/equipment management functions
  └── store.ts         # Zustand global state

supabase/migrations/
  ├── 20241001000000_initial_schema.sql        # Initial tables + RLS
  └── 20241002000000_add_skills_and_inventory_slots.sql  # Items + skills
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
1. **Database First**: Add tables/columns in new migration file
2. **Types**: Update interfaces in `lib/supabase.ts`
3. **Business Logic**: Add functions to `lib/` folder
4. **UI**: Create/update components
5. **State**: Integrate with Zustand store if needed

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
- **Location**: `tests/` directory
- **Coverage**:
  - `auth.spec.ts` - Authentication flows (signup, signin, logout)
  - `signin.spec.ts` - Sign-in specific edge cases
  - `inventory.spec.ts` - Inventory operations (equip, unequip, items)
  - `combat.spec.ts` - Combat system flows (battle, victory, defeat)
  - `full-flow.spec.ts` - Complete end-to-end user journey

**Unit Testing (Jest)**:
- **Framework**: Jest for unit tests
- **Location**: `lib/__tests__/` directory
- **Coverage**:
  - `auth.test.ts` - Authentication utilities (password generation, email format)
  - `combat.test.ts` - Combat calculations (damage formula, loot drops, gold rolls)

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
npx playwright test tests/combat.spec.ts

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
