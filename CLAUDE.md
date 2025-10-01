# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Eternal Realms** is an idle RPG built with Next.js 14 (App Router), Supabase, TypeScript, and Zustand for state management. Players create characters that earn experience and gold automatically, with a growing inventory and equipment system.

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

### Initial Setup
1. Create Supabase project at [supabase.com](https://supabase.com)
2. Copy `.env.local.example` to `.env.local`
3. Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Run migrations in SQL Editor:
   - `supabase/migrations/20241001000000_initial_schema.sql`
   - `supabase/migrations/20241002000000_add_skills_and_inventory_slots.sql`

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

**Playwright Tests** (`tests/`):
- `auth.spec.ts` - Authentication flows
- `signin.spec.ts` - Sign-in specific tests
- `inventory.spec.ts` - Inventory operations
- `full-flow.spec.ts` - End-to-end user journey

**Test Configuration:**
- Single worker (avoid race conditions with Supabase)
- Auto-starts dev server
- Screenshots on failure
- Base URL: `http://localhost:3000`

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

### Idle Mechanics (Future)
The game is designed for idle mechanics. Add timers in `Game.tsx`:
```typescript
useEffect(() => {
  const interval = setInterval(() => {
    // Calculate idle gains
    // Update character
  }, 1000)
  return () => clearInterval(interval)
}, [])
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
