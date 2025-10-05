-- ============================================================================
-- EXPLORATION 2.0 EXPANSION - Database Schema
-- ============================================================================

-- ============================================================================
-- 1. EXPLORATION SKILLS
-- ============================================================================

CREATE TABLE IF NOT EXISTS exploration_skills (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  skill_type VARCHAR(50) NOT NULL CHECK (skill_type IN ('cartography', 'survival', 'archaeology', 'tracking')),
  level INTEGER NOT NULL DEFAULT 1 CHECK (level >= 1 AND level <= 99),
  experience INTEGER NOT NULL DEFAULT 0 CHECK (experience >= 0),
  total_experience INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(character_id, skill_type)
);

-- ============================================================================
-- 2. EXPLORATION EVENTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS exploration_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_name VARCHAR(255) NOT NULL,
  event_type VARCHAR(50) NOT NULL CHECK (event_type IN ('discovery', 'encounter', 'puzzle', 'hazard', 'treasure', 'npc', 'mystery')),
  zone_id UUID REFERENCES world_zones(id) ON DELETE SET NULL,
  zone_type VARCHAR(50), -- wilderness, dungeon, safe_haven - null means any zone
  min_danger_level INTEGER DEFAULT 0,
  max_danger_level INTEGER DEFAULT 100,
  description TEXT NOT NULL,
  flavor_text TEXT,
  trigger_chance DECIMAL(3,2) DEFAULT 0.10 CHECK (trigger_chance >= 0 AND trigger_chance <= 1),
  min_progress INTEGER DEFAULT 0, -- Minimum exploration progress to trigger
  max_progress INTEGER DEFAULT 100,
  required_skills JSONB DEFAULT '{}', -- {"survival": 10, "tracking": 5}
  choices JSONB NOT NULL, -- Array of choice objects with outcomes
  rewards JSONB DEFAULT '{}', -- Potential rewards
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- 3. EVENT ENCOUNTERS LOG
-- ============================================================================

CREATE TABLE IF NOT EXISTS exploration_event_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES exploration_events(id) ON DELETE CASCADE,
  zone_id UUID NOT NULL REFERENCES world_zones(id) ON DELETE CASCADE,
  choice_made VARCHAR(255),
  outcome JSONB, -- Details of what happened
  rewards_gained JSONB, -- Items, gold, xp gained
  timestamp TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- 4. EXPEDITION SUPPLIES
-- ============================================================================

CREATE TABLE IF NOT EXISTS expedition_supplies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  supply_type VARCHAR(50) NOT NULL CHECK (supply_type IN ('food', 'tool', 'light', 'medicine', 'map', 'special')),
  description TEXT,
  effect JSONB NOT NULL, -- {"exploration_speed": 1.2, "discovery_bonus": 0.1}
  duration INTEGER, -- How long it lasts in seconds, null = single use
  stack_size INTEGER DEFAULT 1,
  cost INTEGER NOT NULL DEFAULT 100,
  level_required INTEGER DEFAULT 1,
  icon VARCHAR(10),
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- 5. CHARACTER EXPEDITIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS character_expeditions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  zone_id UUID NOT NULL REFERENCES world_zones(id) ON DELETE CASCADE,
  expedition_type VARCHAR(50) NOT NULL CHECK (expedition_type IN ('scout', 'standard', 'deep', 'legendary')),
  supplies_used JSONB DEFAULT '[]', -- Array of supply IDs and quantities
  started_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  total_distance INTEGER DEFAULT 0,
  areas_discovered INTEGER DEFAULT 0,
  events_encountered INTEGER DEFAULT 0,
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('planning', 'active', 'completed', 'failed', 'abandoned')),
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- 6. MAP PROGRESS (Fog of War)
-- ============================================================================

CREATE TABLE IF NOT EXISTS character_map_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  zone_id UUID NOT NULL REFERENCES world_zones(id) ON DELETE CASCADE,
  explored_tiles JSONB DEFAULT '[]', -- Array of {x, y} coordinates
  total_tiles INTEGER DEFAULT 100,
  tiles_explored INTEGER DEFAULT 0,
  points_of_interest JSONB DEFAULT '[]', -- Marked locations
  last_position JSONB, -- {x: 50, y: 50}
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(character_id, zone_id)
);

-- ============================================================================
-- 7. EXPLORATION COMPANIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS exploration_companions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  companion_type VARCHAR(50) NOT NULL CHECK (companion_type IN ('npc', 'pet', 'mount', 'familiar')),
  specialization VARCHAR(50), -- scout, scholar, survivalist, treasure_hunter
  description TEXT,
  personality TEXT,
  abilities JSONB NOT NULL, -- Array of ability objects
  bonuses JSONB DEFAULT '{}', -- {"discovery_chance": 0.1, "speed": 1.2}
  hire_cost INTEGER,
  upkeep_cost INTEGER DEFAULT 0,
  level_required INTEGER DEFAULT 1,
  loyalty_max INTEGER DEFAULT 100,
  rarity VARCHAR(50) DEFAULT 'common',
  icon VARCHAR(10),
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- 8. CHARACTER COMPANIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS character_companions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  companion_id UUID NOT NULL REFERENCES exploration_companions(id) ON DELETE CASCADE,
  nickname VARCHAR(255),
  loyalty_level INTEGER DEFAULT 50 CHECK (loyalty_level >= 0 AND loyalty_level <= 100),
  experience INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT false,
  hired_at TIMESTAMP DEFAULT NOW(),
  last_expedition TIMESTAMP,
  total_expeditions INTEGER DEFAULT 0,
  status VARCHAR(50) DEFAULT 'idle' CHECK (status IN ('idle', 'exploring', 'resting', 'injured')),
  UNIQUE(character_id, companion_id)
);

-- ============================================================================
-- 9. EXPLORATION CHALLENGES
-- ============================================================================

CREATE TABLE IF NOT EXISTS exploration_challenges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  challenge_type VARCHAR(50) NOT NULL CHECK (challenge_type IN ('puzzle', 'timed', 'combat', 'stealth', 'riddle', 'mechanism')),
  zone_id UUID REFERENCES world_zones(id) ON DELETE SET NULL,
  difficulty INTEGER DEFAULT 1 CHECK (difficulty >= 1 AND difficulty <= 10),
  description TEXT NOT NULL,
  puzzle_data JSONB, -- Puzzle configuration
  time_limit INTEGER, -- Seconds for timed challenges
  required_items JSONB DEFAULT '[]', -- Items needed to attempt
  required_skills JSONB DEFAULT '{}', -- Skill requirements
  success_rewards JSONB NOT NULL,
  failure_penalty JSONB DEFAULT '{}',
  hint_text TEXT,
  solution_clue TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- 10. HIDDEN LOCATIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS hidden_locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  zone_id UUID NOT NULL REFERENCES world_zones(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  location_type VARCHAR(50) NOT NULL CHECK (location_type IN ('dungeon', 'treasure_vault', 'ancient_ruins', 'secret_shop', 'boss_lair', 'portal')),
  discovery_requirements JSONB DEFAULT '{}', -- Conditions to find it
  description TEXT NOT NULL,
  lore_text TEXT,
  is_legendary BOOLEAN DEFAULT false,
  coordinates JSONB, -- {x: 75, y: 25} on the zone map
  rewards JSONB DEFAULT '{}',
  one_time_only BOOLEAN DEFAULT false,
  respawn_hours INTEGER, -- Hours until it can be found again
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- 11. CHARACTER DISCOVERIES
-- ============================================================================

CREATE TABLE IF NOT EXISTS character_discoveries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  discovery_type VARCHAR(50) NOT NULL CHECK (discovery_type IN ('location', 'creature', 'artifact', 'lore', 'npc', 'secret')),
  discovery_id UUID NOT NULL, -- References various tables based on type
  zone_id UUID NOT NULL REFERENCES world_zones(id) ON DELETE CASCADE,
  discovered_at TIMESTAMP DEFAULT NOW(),
  discovery_method VARCHAR(100), -- How it was found
  notes TEXT, -- Player notes
  UNIQUE(character_id, discovery_type, discovery_id)
);

-- ============================================================================
-- 12. EXPLORATION JOURNAL ENTRIES
-- ============================================================================

CREATE TABLE IF NOT EXISTS exploration_journal (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entry_type VARCHAR(50) NOT NULL CHECK (entry_type IN ('lore', 'creature', 'location', 'artifact', 'quest', 'personal')),
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  zone_id UUID REFERENCES world_zones(id) ON DELETE SET NULL,
  unlock_condition JSONB DEFAULT '{}', -- What triggers this entry
  category VARCHAR(100),
  subcategory VARCHAR(100),
  illustration_url TEXT,
  page_number INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- 13. CHARACTER JOURNAL PROGRESS
-- ============================================================================

CREATE TABLE IF NOT EXISTS character_journal_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  journal_entry_id UUID NOT NULL REFERENCES exploration_journal(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMP DEFAULT NOW(),
  times_read INTEGER DEFAULT 0,
  is_favorite BOOLEAN DEFAULT false,
  player_notes TEXT,
  UNIQUE(character_id, journal_entry_id)
);

-- ============================================================================
-- 14. ENVIRONMENTAL HAZARDS
-- ============================================================================

CREATE TABLE IF NOT EXISTS environmental_hazards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  zone_id UUID NOT NULL REFERENCES world_zones(id) ON DELETE CASCADE,
  hazard_name VARCHAR(255) NOT NULL,
  hazard_type VARCHAR(50) NOT NULL CHECK (hazard_type IN ('weather', 'terrain', 'trap', 'environmental', 'magical')),
  description TEXT NOT NULL,
  damage_per_tick INTEGER DEFAULT 0,
  effect JSONB DEFAULT '{}', -- Status effects, speed reduction, etc
  avoidance_skill VARCHAR(50), -- Skill that helps avoid it
  avoidance_difficulty INTEGER DEFAULT 5,
  occurrence_chance DECIMAL(3,2) DEFAULT 0.05,
  duration_seconds INTEGER,
  warning_text TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- 15. PLAYER MESSAGES (Social Features)
-- ============================================================================

CREATE TABLE IF NOT EXISTS exploration_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  author_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  zone_id UUID NOT NULL REFERENCES world_zones(id) ON DELETE CASCADE,
  coordinates JSONB NOT NULL, -- {x: 50, y: 75}
  message_type VARCHAR(50) NOT NULL CHECK (message_type IN ('hint', 'warning', 'treasure', 'lore', 'joke', 'direction')),
  content TEXT NOT NULL CHECK (LENGTH(content) <= 280),
  rating INTEGER DEFAULT 0,
  reports INTEGER DEFAULT 0,
  is_hidden BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP DEFAULT (NOW() + INTERVAL '7 days')
);

-- ============================================================================
-- 16. MESSAGE RATINGS
-- ============================================================================

CREATE TABLE IF NOT EXISTS message_ratings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  message_id UUID NOT NULL REFERENCES exploration_messages(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating IN (-1, 1)), -- -1 = downvote, 1 = upvote
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(character_id, message_id)
);

-- ============================================================================
-- 17. EXPLORATION ACHIEVEMENTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS exploration_achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  category VARCHAR(100) NOT NULL,
  requirement JSONB NOT NULL, -- Conditions to unlock
  reward JSONB DEFAULT '{}',
  points INTEGER DEFAULT 10,
  icon VARCHAR(10),
  is_hidden BOOLEAN DEFAULT false,
  tier VARCHAR(50) DEFAULT 'bronze' CHECK (tier IN ('bronze', 'silver', 'gold', 'platinum', 'legendary')),
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- 18. CHARACTER EXPLORATION ACHIEVEMENTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS character_exploration_achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES exploration_achievements(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMP DEFAULT NOW(),
  progress JSONB DEFAULT '{}', -- Progress towards achievement
  UNIQUE(character_id, achievement_id)
);

-- ============================================================================
-- 19. WEATHER PATTERNS
-- ============================================================================

CREATE TABLE IF NOT EXISTS weather_patterns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  zone_id UUID NOT NULL REFERENCES world_zones(id) ON DELETE CASCADE,
  weather_type VARCHAR(50) NOT NULL CHECK (weather_type IN ('clear', 'rain', 'storm', 'snow', 'fog', 'sandstorm', 'blizzard', 'magical_storm')),
  season VARCHAR(50) CHECK (season IN ('spring', 'summer', 'autumn', 'winter')),
  probability DECIMAL(3,2) DEFAULT 0.25,
  effects JSONB NOT NULL, -- {"visibility": 0.5, "speed": 0.8}
  description TEXT,
  duration_hours INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- 20. EXPLORATION GUILDS
-- ============================================================================

CREATE TABLE IF NOT EXISTS exploration_guilds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  leader_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  emblem VARCHAR(50),
  level INTEGER DEFAULT 1,
  experience INTEGER DEFAULT 0,
  member_limit INTEGER DEFAULT 20,
  treasury_gold INTEGER DEFAULT 0,
  shared_map_data BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  disbanded_at TIMESTAMP
);

-- ============================================================================
-- 21. GUILD MEMBERS
-- ============================================================================

CREATE TABLE IF NOT EXISTS exploration_guild_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  guild_id UUID NOT NULL REFERENCES exploration_guilds(id) ON DELETE CASCADE,
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  rank VARCHAR(50) DEFAULT 'member' CHECK (rank IN ('leader', 'officer', 'veteran', 'member', 'recruit')),
  joined_at TIMESTAMP DEFAULT NOW(),
  contribution_points INTEGER DEFAULT 0,
  last_active TIMESTAMP DEFAULT NOW(),
  UNIQUE(character_id)
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX idx_exploration_skills_character ON exploration_skills(character_id);
CREATE INDEX idx_exploration_events_zone ON exploration_events(zone_id);
CREATE INDEX idx_exploration_events_type ON exploration_events(event_type);
CREATE INDEX idx_event_log_character ON exploration_event_log(character_id);
CREATE INDEX idx_expeditions_character ON character_expeditions(character_id);
CREATE INDEX idx_expeditions_status ON character_expeditions(status);
CREATE INDEX idx_map_progress_character ON character_map_progress(character_id);
CREATE INDEX idx_companions_character ON character_companions(character_id);
CREATE INDEX idx_discoveries_character ON character_discoveries(character_id);
CREATE INDEX idx_journal_entries_character ON character_journal_entries(character_id);
CREATE INDEX idx_messages_zone ON exploration_messages(zone_id);
CREATE INDEX idx_messages_coordinates ON exploration_messages USING GIN (coordinates);
CREATE INDEX idx_guild_members_character ON exploration_guild_members(character_id);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS on all new tables
ALTER TABLE exploration_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE exploration_event_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE character_expeditions ENABLE ROW LEVEL SECURITY;
ALTER TABLE character_map_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE character_companions ENABLE ROW LEVEL SECURITY;
ALTER TABLE character_discoveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE character_journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE exploration_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE character_exploration_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE exploration_guild_members ENABLE ROW LEVEL SECURITY;

-- RLS Policies for character-owned data
CREATE POLICY "Users can view their own exploration skills" ON exploration_skills
  FOR SELECT USING (auth.uid() = (SELECT user_id FROM characters WHERE id = character_id));

CREATE POLICY "Users can update their own exploration skills" ON exploration_skills
  FOR ALL USING (auth.uid() = (SELECT user_id FROM characters WHERE id = character_id));

CREATE POLICY "Users can view their own event log" ON exploration_event_log
  FOR SELECT USING (auth.uid() = (SELECT user_id FROM characters WHERE id = character_id));

CREATE POLICY "Users can insert their own event log" ON exploration_event_log
  FOR INSERT WITH CHECK (auth.uid() = (SELECT user_id FROM characters WHERE id = character_id));

CREATE POLICY "Users can manage their own expeditions" ON character_expeditions
  FOR ALL USING (auth.uid() = (SELECT user_id FROM characters WHERE id = character_id));

CREATE POLICY "Users can manage their own map progress" ON character_map_progress
  FOR ALL USING (auth.uid() = (SELECT user_id FROM characters WHERE id = character_id));

CREATE POLICY "Users can manage their own companions" ON character_companions
  FOR ALL USING (auth.uid() = (SELECT user_id FROM characters WHERE id = character_id));

CREATE POLICY "Users can manage their own discoveries" ON character_discoveries
  FOR ALL USING (auth.uid() = (SELECT user_id FROM characters WHERE id = character_id));

CREATE POLICY "Users can manage their own journal" ON character_journal_entries
  FOR ALL USING (auth.uid() = (SELECT user_id FROM characters WHERE id = character_id));

CREATE POLICY "Users can manage their own achievements" ON character_exploration_achievements
  FOR ALL USING (auth.uid() = (SELECT user_id FROM characters WHERE id = character_id));

-- Public read policies for shared content
CREATE POLICY "Anyone can read exploration events" ON exploration_events
  FOR SELECT USING (true);

CREATE POLICY "Anyone can read expedition supplies" ON expedition_supplies
  FOR SELECT USING (true);

CREATE POLICY "Anyone can read companions" ON exploration_companions
  FOR SELECT USING (true);

CREATE POLICY "Anyone can read challenges" ON exploration_challenges
  FOR SELECT USING (true);

CREATE POLICY "Anyone can read hidden locations" ON hidden_locations
  FOR SELECT USING (true);

CREATE POLICY "Anyone can read journal entries" ON exploration_journal
  FOR SELECT USING (true);

CREATE POLICY "Anyone can read hazards" ON environmental_hazards
  FOR SELECT USING (true);

CREATE POLICY "Anyone can read achievements" ON exploration_achievements
  FOR SELECT USING (true);

CREATE POLICY "Anyone can read weather patterns" ON weather_patterns
  FOR SELECT USING (true);

-- Message policies
CREATE POLICY "Anyone can read non-hidden messages" ON exploration_messages
  FOR SELECT USING (is_hidden = false);

CREATE POLICY "Users can create messages" ON exploration_messages
  FOR INSERT WITH CHECK (auth.uid() = (SELECT user_id FROM characters WHERE id = author_id));

CREATE POLICY "Users can update their own messages" ON exploration_messages
  FOR UPDATE USING (auth.uid() = (SELECT user_id FROM characters WHERE id = author_id));

CREATE POLICY "Users can rate messages" ON message_ratings
  FOR ALL USING (auth.uid() = (SELECT user_id FROM characters WHERE id = character_id));

-- Guild policies
CREATE POLICY "Anyone can view active guilds" ON exploration_guilds
  FOR SELECT USING (disbanded_at IS NULL);

CREATE POLICY "Guild leaders can update their guild" ON exploration_guilds
  FOR UPDATE USING (auth.uid() = (SELECT user_id FROM characters WHERE id = leader_id));

CREATE POLICY "Guild members can view their membership" ON exploration_guild_members
  FOR SELECT USING (auth.uid() = (SELECT user_id FROM characters WHERE id = character_id));

-- ============================================================================
-- SAMPLE DATA - EXPLORATION EVENTS
-- ============================================================================

INSERT INTO exploration_events (event_name, event_type, zone_type, description, flavor_text, choices, rewards) VALUES
('Ancient Shrine', 'discovery', 'wilderness',
 'You discover an ancient shrine covered in mysterious runes.',
 'The air grows heavy with an otherworldly presence as you approach the weathered stone structure.',
 '[
   {
     "text": "Pray at the shrine",
     "skill_check": {"archaeology": 5},
     "outcomes": {
       "success": {"xp": 100, "discovery": "shrine_blessing"},
       "failure": {"message": "Nothing happens"}
     }
   },
   {
     "text": "Search for hidden compartments",
     "skill_check": {"tracking": 10},
     "outcomes": {
       "success": {"items": ["ancient_coin"], "gold": 50},
       "failure": {"message": "You find nothing of value"}
     }
   },
   {
     "text": "Leave respectfully",
     "outcomes": {"always": {"xp": 25}}
   }
 ]'::jsonb,
 '{"xp_range": [25, 100], "gold_range": [0, 50]}'::jsonb),

('Bandit Ambush', 'encounter', 'wilderness',
 'A group of bandits emerges from the shadows!',
 'Their leader grins wickedly, "Your gold or your life, traveler!"',
 '[
   {
     "text": "Fight the bandits",
     "skill_check": {"survival": 15},
     "outcomes": {
       "success": {"gold": 200, "items": ["bandit_mask"]},
       "failure": {"health": -20, "gold": -50}
     }
   },
   {
     "text": "Try to negotiate",
     "outcomes": {"always": {"gold": -25, "safe_passage": true}}
   },
   {
     "text": "Run away",
     "skill_check": {"survival": 8},
     "outcomes": {
       "success": {"message": "You escape safely"},
       "failure": {"health": -10, "gold": -30}
     }
   }
 ]'::jsonb,
 '{"gold_range": [-50, 200]}'::jsonb),

('Mysterious Fog', 'hazard', null,
 'A thick, unnatural fog rolls in, obscuring your vision.',
 'You can barely see your hand in front of your face. Strange whispers echo through the mist.',
 '[
   {
     "text": "Push through carefully",
     "skill_check": {"survival": 12},
     "outcomes": {
       "success": {"message": "You navigate safely", "xp": 50},
       "failure": {"lost": true, "time": -300}
     }
   },
   {
     "text": "Wait for it to clear",
     "outcomes": {"always": {"time": -600, "safe": true}}
   },
   {
     "text": "Use a torch to guide your way",
     "requires_item": "torch",
     "outcomes": {"always": {"safe": true, "consumes_item": true}}
   }
 ]'::jsonb,
 '{"xp_range": [0, 50]}'::jsonb);

-- ============================================================================
-- SAMPLE DATA - COMPANIONS
-- ============================================================================

INSERT INTO exploration_companions (name, companion_type, specialization, description, abilities, bonuses, hire_cost, icon) VALUES
('Scout Hawk', 'pet', 'scout',
 'A keen-eyed hawk trained for reconnaissance.',
 '[{"name": "Aerial Survey", "description": "Reveals a large area of the map"}]'::jsonb,
 '{"map_reveal": 1.5, "discovery_chance": 0.1}'::jsonb,
 500, '🦅'),

('Professor Elric', 'npc', 'scholar',
 'A learned scholar with vast knowledge of ancient civilizations.',
 '[{"name": "Decipher", "description": "Can translate ancient texts and solve puzzles"}]'::jsonb,
 '{"archaeology_bonus": 10, "xp_gain": 1.2}'::jsonb,
 1000, '👨‍🏫'),

('Treasure Dog', 'pet', 'treasure_hunter',
 'A loyal dog with an incredible nose for valuable items.',
 '[{"name": "Sniff Out Treasure", "description": "Higher chance to find rare items"}]'::jsonb,
 '{"item_find": 1.3, "gold_find": 1.1}'::jsonb,
 750, '🐕');

-- ============================================================================
-- SAMPLE DATA - EXPEDITION SUPPLIES
-- ============================================================================

INSERT INTO expedition_supplies (name, supply_type, description, effect, duration, cost, icon) VALUES
('Trail Rations', 'food',
 'Hearty food that sustains long journeys.',
 '{"stamina_regen": 1.2, "duration_bonus": 300}'::jsonb,
 3600, 50, '🍖'),

('Climbing Rope', 'tool',
 'Essential for scaling cliffs and descending into caves.',
 '{"access_hidden": true, "fall_prevention": true}'::jsonb,
 NULL, 100, '🪢'),

('Bright Lantern', 'light',
 'Illuminates dark areas and reveals hidden details.',
 '{"visibility": 1.5, "discovery_chance": 0.15}'::jsonb,
 7200, 150, '🏮'),

('Ancient Map Fragment', 'map',
 'Shows the location of a hidden treasure.',
 '{"treasure_location": true, "specific_zone": true}'::jsonb,
 NULL, 500, '🗺️');