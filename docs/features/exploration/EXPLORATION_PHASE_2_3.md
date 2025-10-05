# Exploration 2.0 - Phase 2 & 3 Features

## Overview

This document covers all advanced exploration features implemented in Phase 2 and Phase 3, including environmental hazards, companions, challenges, secret areas, journal system, and social features.

---

## 🌦️ Environmental Hazards & Weather System

### Weather Types

**8 Weather Conditions:**
1. **Clear** ☀️ - Perfect conditions, no modifiers
2. **Rain** 🌧️ - Reduced visibility, tracking difficulty, water resource bonus
3. **Storm** ⛈️ - Low visibility, movement penalty, damage over time
4. **Fog** 🌫️ - Very low visibility, increased encounter chance, mystery event bonus
5. **Snow** ❄️ - Visibility penalty, movement penalty, cold damage, tracking bonus
6. **Heat Wave** 🔥 - Stamina drain, water consumption, fire hazard chance
7. **Blizzard** 🌨️ - Extreme conditions, shelter required, ice resource bonus
8. **Sandstorm** 🏜️ - Poor visibility, sand damage, navigation difficulty

### Weather Effects

Weather dynamically affects exploration:
- **Visibility**: 20-100% (affects encounter distance)
- **Movement Speed**: 50-100% (affects exploration speed)
- **Damage Per Tick**: Environmental damage during harsh conditions
- **Resource Bonuses**: Weather-specific gathering bonuses
- **Shelter Requirements**: Some weather requires safe shelter

### Hazards

**Hazard Types:**
- **Environmental**: Natural dangers (thorns, ice, heat)
- **Creature**: Animal/monster threats
- **Magical**: Arcane phenomena
- **Natural Disaster**: Rockslides, earthquakes, avalanches

**Zone-Specific Hazards:**
- **Forest**: Thorny undergrowth, wild beasts, poisonous plants
- **Mountain**: Rockslides, thin air, ice patches
- **Desert**: Scorching heat, quicksand, sand vipers

**Hazard Mechanics:**
- Severity levels (1-10)
- Damage calculations based on Survival skill
- Status effects (poisoned, exhausted, etc.)
- Weather amplification (storms double hazard chance)
- Success/failure outcomes with XP rewards

### Key Functions

**File: `lib/environmentalHazards.ts`**

```typescript
getCurrentWeather(zoneId) // Get active weather
updateWeather(zoneId, weatherType, intensity) // Change weather
getActiveHazards(zoneId, dangerLevel) // Get zone hazards
encounterHazard(characterId, hazard) // Process hazard encounter
checkHazardTrigger(zoneId, characterId) // Roll for hazard
applyWeatherEffects(weather, baseSpeed) // Modify exploration stats
seedHazards(zoneId, zoneType) // Initialize zone hazards
```

---

## 🐾 Companion System

### Companion Types

1. **Pets** 🐕
   - Loyal animal companions
   - Utility-focused bonuses
   - Traits: Loyal, Playful, Brave, Protective

2. **NPCs** 👤
   - Human/humanoid allies
   - Combat and defense bonuses
   - Traits: Wise, Witty, Noble, Mysterious

3. **Summons** ✨
   - Magical entities
   - Offensive-focused powers
   - Traits: Obedient, Powerful, Ancient, Mystical

### Companion Rarity

- **Common** (50% chance): 10 attack/defense/utility
- **Uncommon** (25%): 15 attack/defense/utility
- **Rare** (15%): 25 attack/defense/utility
- **Epic** (8%): 40 attack/defense/utility
- **Legendary** (2%): 60 attack/defense/utility

### Companion Abilities

**Ability Types:**
- **Passive**: Always active (detection, resource bonuses)
- **Active**: Triggered manually (damage, healing)
- **Offensive**: Combat focused (attacks, debuffs)
- **Defensive**: Protection focused (shields, damage reduction)
- **Support**: Utility focused (XP bonus, health restoration)
- **Utility**: Exploration focused (reveal, tracking)

**Example Abilities:**

**Pets:**
- Keen Senses (Passive): +25% resource detection, +10% treasure chance
- Loyal Guard (Defensive): 15% damage reduction, 120s cooldown
- Track Prey (Active): Reveals radius 3, 60s duration, 300s cooldown

**NPCs:**
- Combat Training (Offensive): +20% attack, +10% crit chance
- Tactical Advice (Utility): +15% XP, +10% success rate
- Emergency Healing (Support): Restores 50 HP, 600s cooldown

**Summons:**
- Arcane Burst (Offensive): 50 magic damage, area 2, 90s cooldown
- Ethereal Shield (Defensive): 30% damage reduction, 30s duration
- Mystical Link (Utility): +25% skill XP, +10 mana regen

### Companion Progression

- **Levels 1-99**: 150 XP per level
- **Loyalty System**: 0-100, affects ability effectiveness
- **Leveling Rewards**: New abilities every 5 levels
- **Recruitment Cost**: Varies by type/rarity

### Key Functions

**File: `lib/companions.ts`**

```typescript
getCompanions(characterId) // Get all companions
getActiveCompanion(characterId) // Get equipped companion
recruitCompanion(characterId, name, type, cost) // Hire new companion
setActiveCompanion(characterId, companionId) // Equip companion
addCompanionXP(companionId, xp) // Level up companion
increaseLoyalty(companionId, amount) // Boost loyalty
useCompanionAbility(companionId, abilityId) // Trigger ability
getCompanionBonuses(characterId) // Calculate all bonuses
```

---

## 🧩 Exploration Challenges & Puzzles

### Challenge Types

1. **Timed** ⏱️
   - Complete objectives within time limit
   - Speed bonuses for fast completion
   - Example: "Speed Trial" - 120 second limit

2. **Puzzle** 🧩
   - Math, pattern, logic, sequence puzzles
   - Dynamically generated based on difficulty
   - Example: "Ancient Puzzle" - solve to proceed

3. **Riddle** 🤔
   - Text-based riddles with hints
   - Difficulty-scaled question pools
   - Example: "Riddle of the Ancients" - wisdom test

4. **Skill Check** 📊
   - Requires specific skill levels
   - Tests exploration skill mastery
   - Example: "Master Explorer" - Cartography 15+

5. **Combat** ⚔️
   - Battle challenges
   - Boss encounters

6. **Collection** 📦
   - Gather specific items
   - Resource collection goals

### Difficulty Levels

- **Easy**: Simple tasks, low requirements, small rewards
- **Medium**: Moderate complexity, skill level 10+, good rewards
- **Hard**: Complex challenges, skill level 15+, great rewards
- **Extreme**: Ultimate tests, skill level 20+, legendary rewards

### Puzzle Generation

**Math Puzzles:**
- Easy: `num1 + num2`
- Medium: `(num1 + num2) × num3`
- Hard: `num1 × num2 - num3`

**Pattern Puzzles:**
- Sequences: 2, 4, 8, 16, ?
- Step sequences with random starts

**Riddles:**
- 20+ riddles across difficulty levels
- Hint system (up to 3 hints per riddle)
- Answer validation (case-insensitive)

### Rewards

- **Gold**: 100-300+ based on difficulty
- **Experience**: 50-150+ XP
- **Special Items**: Unique rewards (puzzle boxes, relics)
- **Time Bonuses**: 1.5× rewards for fast completion

### Key Functions

**File: `lib/explorationChallenges.ts`**

```typescript
getAvailableChallenges(zoneId, characterLevel) // List challenges
startChallenge(characterId, challengeId) // Begin challenge
completeChallenge(characterId, challengeId, solution) // Submit answer
getHint(characterId, challengeId, hintIndex) // Request hint
seedChallenges(zoneId, zoneLevel) // Initialize challenges
```

---

## 🏛️ Secret Areas & Hidden Dungeons

### Location Types

1. **Dungeon** 🏰 - Multi-floor combat areas
2. **Cave** 🕳️ - Hidden caverns with crystals/treasures
3. **Ruins** 🏛️ - Ancient civilization structures
4. **Shrine** ⛩️ - Sacred places of power
5. **Treasure Room** 💰 - Loot-filled vaults
6. **Boss Lair** 👹 - Epic boss encounters

### Discovery Methods

- **Exploration**: Random discovery while exploring (base method)
- **Puzzle**: Solve puzzle to reveal entrance
- **Hidden Clue**: Follow clues from lore/NPCs
- **Companion Ability**: Special companion reveals location
- **Special Event**: Event-triggered discoveries

### Location Features

**Requirements:**
- Minimum character level
- Skill requirements (e.g., Archaeology 15, Survival 10)
- Special items or keys

**Dungeon Structure:**
- Multiple floors (1-10 floors)
- Floor progression system
- Boss encounters on final floors
- Increasing difficulty per floor

**Rewards:**
- **Discovery Rewards**: Gold + XP for finding location
- **Completion Rewards**: Major gold, XP, unique items
- **Boss Loot**: Legendary weapons, trophies, blessings

### Landmarks

**Types:**
- **Natural**: Ancient trees, waterfalls, rock formations
- **Mystical**: Stone circles, energy vortexes
- **Historical**: Monuments, statues, ruins

**Features:**
- Archaeology skill gated (levels 3-15)
- Lore text and historical significance
- Discovery rewards (gold, archaeology XP, relics)
- 4+ landmarks per zone

### Key Functions

**File: `lib/secretAreas.ts`**

```typescript
discoverHiddenLocation(characterId, zoneId, x, y) // Find secret
enterHiddenLocation(characterId, locationId) // Start dungeon run
progressDungeonFloor(dungeonRunId, defeatedBoss) // Next floor
getDiscoveredLocations(characterId) // List found locations
discoverLandmark(characterId, zoneId, x, y) // Find landmark
getDiscoveredLandmarks(characterId) // List found landmarks
checkSecretDiscovery(characterId, zoneId, x, y) // Auto-check tile
seedHiddenLocations(zoneId, zoneName) // Initialize secrets
seedLandmarks(zoneId, zoneName) // Initialize landmarks
```

---

## 📖 Exploration Journal & Collections

### Journal Entry Types

1. **Lore** 📜 - Historical texts, stories, legends
2. **Discovery** 🔍 - New findings and locations
3. **Encounter** 👥 - Meeting creatures, NPCs, events
4. **Achievement** 🏆 - Accomplishments and milestones
5. **Story** 📚 - Personal narratives and experiences

### Collection Categories

1. **Bestiary** 🐉
   - Creature catalog
   - Stats: Level, habitat, behavior, weaknesses, drops
   - Danger ratings
   - Encounter tracking

2. **Flora** 🌿
   - Plant encyclopedia
   - Rarity, location, harvest season
   - Medicinal and alchemical uses
   - Growth conditions

3. **Artifacts** 🏺
   - Historical items catalog
   - Age, origin, magical properties
   - Historical significance
   - Condition tracking

4. **Locations** 🗺️
   - Discovered places
   - Coordinates, type, inhabitants
   - Historical significance
   - Accessibility status

5. **Lore** 📖
   - Knowledge database
   - Categories, full text
   - Related entities
   - Source verification

### Collection Features

- **Encounter Counting**: Tracks how many times you've seen each entry
- **Last Encountered**: Timestamp of most recent encounter
- **Auto-Journaling**: New discoveries create journal entries
- **Achievement System**: Unlock achievements for collection milestones

### Achievements

**Collection Tiers:**
- **Novice** (Bronze): 10 entries
- **Adept** (Silver): 25 entries
- **Expert** (Gold): 50 entries
- **Master** (Platinum): 100 entries

**Per Collection Type:** Bestiary, Flora, Artifacts, Locations, Lore

### Journal Features

- **Favorites**: Mark important entries
- **Search**: Full-text search across all entries
- **Export**: Download journal as text file
- **Filtering**: By entry type, date, keywords

### Key Functions

**File: `lib/explorationJournal.ts`**

```typescript
createJournalEntry(characterId, type, title, content, metadata) // New entry
getJournalEntries(characterId, type, limit) // Fetch entries
toggleFavorite(entryId, isFavorite) // Favorite entry
addToCollection(characterId, type, name, data) // Add to collection
getCollection(characterId, type) // Get collection
getCollectionStats(characterId) // Statistics
checkCollectionAchievements(characterId, type) // Check achievements
unlockAchievement(characterId, name, desc, metadata) // Unlock achievement
getAchievements(characterId) // List achievements
searchJournal(characterId, searchTerm) // Search entries
exportJournal(characterId) // Export as text
```

---

## 👥 Social Features (Guilds & Sharing)

### Exploration Guilds

**Guild System:**
- Create guild (1000 gold cost)
- Guild name, description, tag (3-4 characters)
- Member roles: Leader, Officer, Member
- Guild levels (1-99): Based on total exploration XP
- Member limit: Scales with guild level

**Guild Progression:**
- Total exploration XP pool
- 10,000 XP per level
- Members contribute through exploration
- Contribution points track individual effort

**Guild Features:**
- Member rankings by contribution
- Leadership transfer system
- Promotion/demotion of members
- Guild-wide bonuses (future enhancement)

### Sharing System

**Share Types:**
- **Map** 🗺️ - Share discovered map areas
- **Discovery** 🔍 - Share hidden locations, landmarks
- **Achievement** 🏆 - Share accomplishments
- **Challenge** 🎯 - Share challenge completions

**Share Rewards:**
- 50 contribution points per share
- Guild XP boost
- Social engagement

**Guild Feed:**
- Real-time activity stream
- Member discoveries and achievements
- Shared content from all members
- Sorted by most recent

### Guild Challenges

**Features:**
- Guild-wide objectives
- Collaborative progress tracking
- Time-limited (default 7 days)
- Collective rewards

**Challenge Types:**
- Exploration goals (tiles revealed, zones completed)
- Collection goals (bestiary entries, artifacts found)
- Combat goals (enemies defeated, bosses killed)
- Skill goals (total skill levels, mastery achieved)

**Progression:**
- Track current vs goal
- Auto-complete when goal reached
- Guild-wide reward distribution

### Guild Discovery

- **Search Guilds**: By name, tag, or minimum level
- **Guild Leaderboard**: Top guilds by exploration XP
- **Browse All Guilds**: Paginated guild list

### Key Functions

**File: `lib/explorationSocial.ts`**

```typescript
createGuild(characterId, name, desc, tag, cost) // Create guild
joinGuild(characterId, guildId) // Join guild
leaveGuild(characterId, guildId) // Leave guild
getGuild(guildId) // Guild details
getCharacterGuild(characterId) // My guild
contributeToGuild(characterId, guildId, points) // Add contribution
shareWithGuild(characterId, shareType, shareData) // Share discovery
getGuildShares(guildId, limit) // Guild feed
createGuildChallenge(guildId, name, desc, goal, rewards, days) // New challenge
updateChallengeProgress(challengeId, key, increment) // Progress challenge
getGuildChallenges(guildId) // Active challenges
searchGuilds(searchTerm, minLevel, limit) // Find guilds
getGuildLeaderboard(limit) // Top guilds
setMemberRole(leaderId, guildId, targetId, newRole) // Promote/demote
transferLeadership(leaderId, guildId, newLeaderId) // Transfer leadership
getMemberRankings(guildId) // Contribution rankings
```

---

## 🗄️ Database Integration

All Phase 2 & 3 features use the existing database tables from the initial migration `20241101000000_add_exploration_expansion.sql`.

**Tables Used:**
- `weather_patterns` - Weather tracking
- `exploration_hazards` - Hazard definitions
- `exploration_companions` - Companion roster
- `companion_abilities` - Companion skills
- `exploration_challenges` - Challenge definitions
- `active_challenges` - Ongoing challenges
- `hidden_locations` - Secret areas
- `landmarks` - Discoverable landmarks
- `dungeon_runs` - Active dungeon sessions
- `character_discoveries` - Found locations
- `character_landmarks` - Found landmarks
- `exploration_journal` - Journal entries
- `character_collections` - Collection items
- `exploration_achievements` - Unlocked achievements
- `exploration_guilds` - Guild data
- `guild_members` - Membership records
- `guild_shares` - Shared content
- `guild_challenges` - Guild objectives

---

## 🎮 Gameplay Integration

### Exploration Flow Enhancement

**During Active Exploration:**
1. Weather effects modify speed/visibility
2. Hazards trigger based on conditions
3. Companion bonuses apply continuously
4. Challenges can be discovered/started
5. Secret areas revealed on specific tiles
6. Collection items found automatically
7. Journal entries created for major events

**Companion Integration:**
- Active companion provides passive bonuses
- Abilities can be triggered during exploration
- Loyalty increases with successful exploration
- XP gained from exploration progress

**Weather Integration:**
- Changes dynamically or on zone entry
- Affects all exploration mechanics
- Creates strategic decisions (wait or brave storm)
- Provides unique gathering opportunities

### Progression Synergy

**Skill Benefits:**
- **Cartography**: Better map reveal, finding hidden locations
- **Survival**: Hazard resistance, weather endurance
- **Archaeology**: Landmark discovery, artifact finding
- **Tracking**: Creature detection, treasure finding

**Guild Benefits:**
- Social motivation and competition
- Shared knowledge and discoveries
- Collaborative challenges
- Community engagement

---

## 🚀 Future Enhancements

**Potential Additions:**
1. **Guild Territories**: Control zones for bonuses
2. **PvP Exploration**: Competitive zone races
3. **Seasonal Events**: Limited-time weather/challenges
4. **Companion Breeding**: Raise new companions
5. **Dynamic Lore**: Player-written journal entries shared globally
6. **Exploration Quests**: Story-driven exploration chains
7. **Legendary Discoveries**: Ultra-rare world secrets

---

## 📝 Usage Examples

### Example 1: Weather-Affected Exploration

```typescript
// Get current weather
const { data: weather } = await getCurrentWeather(zoneId)

// Apply to exploration speed
const { speed, effects } = applyWeatherEffects(weather, baseSpeed)

// Check for hazards (amplified by weather)
const { data: hazard } = await checkHazardTrigger(zoneId, characterId)

if (hazard) {
  const { data: result } = await encounterHazard(characterId, hazard)
  // Display damage/effects to player
}
```

### Example 2: Companion in Combat

```typescript
// Get active companion bonuses
const { data: bonuses } = await getCompanionBonuses(characterId)

// Apply to attack
const totalAttack = baseAttack + (bonuses.attack_bonus || 0)

// Use companion ability
const { data: result } = await useCompanionAbility(
  companionId,
  abilityId,
  'enemy'
)

// Award companion XP
await addCompanionXP(companionId, 25)
```

### Example 3: Secret Discovery

```typescript
// Check tile for secrets
const { data } = await checkSecretDiscovery(
  characterId,
  zoneId,
  currentX,
  currentY
)

if (data?.type === 'hidden_location') {
  // Found a dungeon!
  await enterHiddenLocation(characterId, data.discovery.id)
} else if (data?.type === 'landmark') {
  // Found a landmark!
  await createJournalEntry(
    characterId,
    'discovery',
    data.discovery.landmark_name,
    data.discovery.lore_text
  )
}
```

### Example 4: Guild Challenge

```typescript
// Create weekly guild challenge
await createGuildChallenge(
  guildId,
  'Explorer\'s Week',
  'Reveal 1000 map tiles as a guild',
  { tiles_revealed: 1000 },
  { gold: 5000, guild_xp: 10000 },
  7 // days
)

// Member explores and contributes
await updateChallengeProgress(
  challengeId,
  'tiles_revealed',
  50 // tiles this session
)

// Auto-completes when goal reached
```

---

## 🏆 Achievement System

**Exploration Achievements:**
- First Discovery (find any hidden location)
- Landmark Hunter (find all landmarks in a zone)
- Weather Warrior (survive all weather types)
- Hazard Master (survive 100 hazards)
- Companion Master (max loyalty with 10 companions)
- Puzzle Genius (solve 50 puzzles)
- Guild Founder (create a guild)
- Master Collector (100 entries in any collection)

**Progression Tracking:**
- Automatic unlock checks
- Journal entry creation
- Guild sharing option
- Stat tracking

---

## 📊 Statistics & Analytics

**Trackable Metrics:**
- Weather encountered (by type)
- Hazards survived vs failed
- Companions recruited/leveled
- Challenges completed (by type)
- Secrets discovered (locations + landmarks)
- Journal entries created
- Collection completion percentage
- Guild contribution rank
- Total exploration XP contributed

---

**All Phase 2 & 3 features are now complete and ready for use! 🎉**
