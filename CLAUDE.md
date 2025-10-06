# CLAUDE.md

Quick reference for working with Eternal Realms idle RPG.

## 📚 Documentation

**Primary**: [docs/GAME_WIKI.md](docs/GAME_WIKI.md) - Complete system documentation (13 game systems)

**⚠️ ALWAYS update docs when making changes:**
1. Update [GAME_WIKI.md](docs/GAME_WIKI.md) for system changes
2. Update feature docs in `docs/features/[feature-name]/`
3. Document database schema changes
4. Document system interconnections

## Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript, TailwindCSS
- **Backend**: Supabase (PostgreSQL, Auth, RLS)
- **State**: Zustand
- **Testing**: Playwright (E2E), Jest (unit)

## Commands

```bash
# Development
npm run dev              # Start dev server (localhost:3000)
npm run build            # Production build

# Testing
npm run test:all         # Run all tests
npm test                 # Unit tests
npm run test:e2e         # E2E tests
npx playwright test --ui # Interactive test UI
```

## Architecture

### Database (Supabase)
**Key Tables:**
- `profiles`, `characters` - User/character data
- `items`, `inventory` - Item catalog & player items
- `character_skills` - 20-skill progression system
- `materials`, `gathering_nodes`, `active_gathering` - Gathering system
- `crafting_recipes` - Crafting system
- `quests`, `achievements` - Quest tracking
- `zone_skill_requirements`, `skill_synergy_bonuses` - Cross-system bonuses

**Security**: All tables use RLS (Row Level Security)

### State (Zustand - `lib/store.ts`)
```typescript
{
  user: User | null
  profile: Profile | null
  character: Character | null
  isLoading: boolean
  error: string | null
}
```

### ⚠️ CRITICAL: Data Caching Pattern

**PROBLEM**: Multiple components independently fetching the same data causes:
- Excessive API calls (5-10+ requests for same data on page load)
- Visible reloads and re-renders
- Poor user experience

**SOLUTION**: Centralized Zustand stores with intelligent caching

**Caching Stores** (`lib/stores/`):
- `zonesStore.ts` - World zones data (used by WorldMap, ExplorationPanel, TravelPanel, EnemyList, Merchant)
- `questsStore.ts` - Quest data (used by Quests, Adventure, notifications)
- Add more as needed for frequently accessed data

**Implementation Pattern**:
```typescript
// lib/stores/exampleStore.ts
import { create } from 'zustand'
import { createClient } from '@/utils/supabase/client'

const CACHE_DURATION_MS = 5 * 60 * 1000 // 5 minutes

export const useExampleStore = create<ExampleStore>((set, get) => ({
  data: [],
  isLoading: false,
  lastFetch: null,

  fetchData: async () => {
    const { lastFetch, isLoading } = get()

    // Skip if already loading
    if (isLoading) return

    // Skip if cache is fresh
    if (lastFetch && Date.now() - lastFetch < CACHE_DURATION_MS) return

    set({ isLoading: true })
    const supabase = createClient()
    const { data } = await supabase.from('table').select('*')
    set({ data, lastFetch: Date.now(), isLoading: false })
  },

  invalidateCache: () => set({ lastFetch: null }),
  reset: () => set({ data: [], isLoading: false, lastFetch: null })
}))
```

**Component Usage**:
```typescript
// ❌ BAD: Direct API call in component
useEffect(() => {
  async function loadZones() {
    const { data } = await supabase.from('world_zones').select('*')
    setZones(data)
  }
  loadZones()
}, [])

// ✅ GOOD: Use caching store
import { useZonesStore } from '@/lib/stores/zonesStore'

const { allZones, fetchAllZones } = useZonesStore()

useEffect(() => {
  fetchAllZones() // Automatically skips if cache is fresh
}, [fetchAllZones])
```

**Cache Invalidation**:
- Call `invalidateCache()` when data changes (zone discovery, quest completion)
- Reset all caching stores on logout: `useZonesStore.getState().reset()`

**When to Create a Caching Store**:
- Data is fetched by 3+ components
- Data changes infrequently (zones, quests, items catalog)
- Data causes visible reloads when fetched

**DO NOT cache**:
- Rapidly changing data (active combat, gathering sessions)
- User-specific real-time data (current HP, inventory changes)
- Data fetched only once per session

### ⚠️ CRITICAL: Session Bonus Caching Pattern

**PROBLEM**: Active sessions (gathering, crafting, etc.) that poll progress every 1-2 seconds were recalculating bonuses on EVERY check:
- Zone modifiers → world_zones API call
- Speed bonuses → character_skills API call
- Synergy bonuses → skill_synergy_bonuses API call
- Result: 30+ API calls per minute during gathering

**SOLUTION**: Cache calculated bonuses in the session table when session starts

**Implementation Pattern**:
```typescript
// When starting a session, calculate ALL bonuses ONCE
async function startSession(characterId, resourceId) {
  // Calculate all bonuses
  const baseTime = 5000
  const skillBonus = await getSkillBonus(characterId)
  const zoneBonus = await getZoneBonus(characterId)
  const finalTime = baseTime * (1 - skillBonus) * zoneBonus

  // Cache the FINAL VALUES in the session
  await supabase.from('active_session').insert({
    character_id: characterId,
    resource_id: resourceId,
    cached_time_per_unit: finalTime,  // ✅ Cached!
    cached_xp_bonus: xpBonus,          // ✅ Cached!
    cached_quality_bonus: qualityBonus // ✅ Cached!
  })
}

// When checking progress, use CACHED values (no API calls!)
async function checkProgress(characterId) {
  const session = await supabase
    .from('active_session')
    .select('*, cached_time_per_unit, cached_xp_bonus')
    .eq('character_id', characterId)
    .single()

  // Use cached values - no bonus recalculation!
  const timePerUnit = session.cached_time_per_unit
  const progress = calculateProgress(session, timePerUnit)

  return progress
}
```

**Migration Example**:
```sql
ALTER TABLE active_gathering
ADD COLUMN cached_gathering_time_ms INTEGER,
ADD COLUMN cached_spawn_rate_modifier NUMERIC,
ADD COLUMN cached_zone_xp_bonus NUMERIC;
```

**When to Use This Pattern**:
- Sessions with polling intervals < 5 seconds
- Sessions that calculate complex bonuses (zone + skill + synergy)
- Sessions that call RPC functions for modifiers

**Applied to**:
- ✅ Gathering system (active_gathering table)
- ⏳ Crafting system (active_crafting table) - TODO
- ⏳ Combat system (active_combat table) - TODO

### File Structure
```
app/
  └── page.tsx           # Main routing (auth → character → game)

components/
  ├── Auth.tsx           # Authentication UI
  ├── Game.tsx           # Main game interface
  ├── Combat.tsx         # Combat system
  ├── Gathering.tsx      # Gathering system
  └── Inventory.tsx      # Inventory/equipment

lib/
  ├── supabase.ts        # Supabase client + types
  ├── auth.ts            # Auth functions
  ├── character.ts       # Character management
  ├── combat.ts          # Combat logic
  ├── gathering.ts       # Gathering sessions
  ├── crafting.ts        # Crafting recipes
  ├── bonuses.ts         # Cross-system bonuses
  ├── store.ts           # Main Zustand store
  └── stores/            # Caching stores (zones, quests, etc.)

supabase/migrations/    # Database migrations (apply in order)
```

## Key Systems

### Authentication
- Username-based (auto-generates email: `username@example.com`)
- Random 32-char password stored in localStorage
- Key: `eternalrealms_auth_${username}`

### Equipment
**Slots**: weapon, helmet, chest, legs, boots, gloves, ring, amulet
**Rarity**: common, uncommon, rare, epic, legendary
**Stats**: attack, defense, health, mana (auto-calculated from equipped items)

### Combat
- Turn-based with auto-attack toggle
- Damage: `attackerAttack - (defenderDefense / 2)` ±15% variance
- Boss encounters with enhanced loot
- Functions: `startCombat()`, `executeTurn()`, `endCombat()`

### Gathering
- 6 skills: Woodcutting 🪓, Mining ⛏️, Fishing 🎣, Hunting 🏹, Alchemy 🧪, Magic ✨
- Levels 1-99, auto-gather mode
- Efficiency bonus: 0.5% faster per level (max 49.5% at level 99)
- 50+ materials across 5 zone tiers

### Cross-System Bonuses (NEW!)
- Combat skills → Gathering speed bonuses (`lib/bonuses.ts`)
- Landmarks → Crafting bonuses
- Quests → Merchant discounts
- Skills → Zone unlocks
- Functions: `getAllCharacterBonuses()`, `getGatheringSpeedBonus()`, `getCraftingBonuses()`

## Development Patterns

### Feature Development Workflow
1. **Database**: Add migration in `supabase/migrations/`
2. **Types**: Update `lib/supabase.ts`
3. **Logic**: Add functions to `lib/`
4. **UI**: Create/update components
5. **Tests**: Write unit + E2E tests (REQUIRED)
6. **Docs**: Update GAME_WIKI.md + feature docs (REQUIRED)

### Error Handling
```typescript
const { data, error } = await someFunction()
if (error) {
  // Handle error
  return
}
// Use data
```

### Equipment Update Flow
1. `equipItem()` → 2. `updateCharacterStats()` → 3. Calculate base + equipped bonuses → 4. Update DB → 5. Update Zustand → 6. UI re-renders

## UI Design System

**Location**: [app/globals.css](app/globals.css)

**Colors**: `--color-gold`, `--color-crimson`, `--color-emerald`, `--color-sapphire`, `--color-amethyst`

**Component Classes**:
- `.panel`, `.panel-glass` - Containers
- `.card`, `.card-hover` - Item cards
- `.btn-primary`, `.btn-secondary`, `.btn-danger`, `.btn-success` - Buttons
- `.progress-bar` - Progress bars with shimmer
- `.badge-{rarity}` - Rarity badges

**Icons**: ⚔️ Attack, 🛡️ Defense, ❤️ HP, 💧 MP, 💰 Gold, 💎 Gems

## Environment Setup

**Required** (`.env.local`):
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

## Troubleshooting

**Database errors**: Check migrations ran, RLS policies enabled
**Not saving**: Check console (F12), verify Supabase credentials
**Test failures**: Ensure dev server running, check for stale data

---

For complete documentation, see [docs/GAME_WIKI.md](docs/GAME_WIKI.md)
