-- =====================================================
-- Eternal Realms - Initial Database Schema
-- =====================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- PROFILES TABLE
-- =====================================================
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT username_length CHECK (char_length(username) >= 3 AND char_length(username) <= 20),
  CONSTRAINT username_format CHECK (username ~ '^[a-zA-Z0-9_]+$')
);

-- RLS Policies for profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles are viewable by everyone"
  ON profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- =====================================================
-- CHARACTERS TABLE
-- =====================================================
CREATE TABLE characters (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  level INTEGER DEFAULT 1,
  experience BIGINT DEFAULT 0,

  -- Stats
  health INTEGER DEFAULT 100,
  max_health INTEGER DEFAULT 100,
  mana INTEGER DEFAULT 50,
  max_mana INTEGER DEFAULT 50,
  attack INTEGER DEFAULT 10,
  defense INTEGER DEFAULT 5,

  -- Resources
  gold BIGINT DEFAULT 100,
  gems INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_active TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT one_character_per_user UNIQUE(user_id)
);

-- RLS Policies for characters
ALTER TABLE characters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own character"
  ON characters FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own character"
  ON characters FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own character"
  ON characters FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- INVENTORY TABLE
-- =====================================================
CREATE TABLE inventory (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  character_id UUID REFERENCES characters(id) ON DELETE CASCADE NOT NULL,
  item_id TEXT NOT NULL,
  quantity INTEGER DEFAULT 1,
  equipped BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT positive_quantity CHECK (quantity > 0),
  CONSTRAINT unique_item_per_character UNIQUE(character_id, item_id)
);

-- RLS Policies for inventory
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own inventory"
  ON inventory FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM characters
      WHERE characters.id = inventory.character_id
      AND characters.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage own inventory"
  ON inventory FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM characters
      WHERE characters.id = inventory.character_id
      AND characters.user_id = auth.uid()
    )
  );

-- =====================================================
-- QUESTS TABLE
-- =====================================================
CREATE TABLE quests (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  character_id UUID REFERENCES characters(id) ON DELETE CASCADE NOT NULL,
  quest_id TEXT NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'failed')),
  progress JSONB DEFAULT '{}',
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,

  CONSTRAINT unique_quest_per_character UNIQUE(character_id, quest_id)
);

-- RLS Policies for quests
ALTER TABLE quests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own quests"
  ON quests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM characters
      WHERE characters.id = quests.character_id
      AND characters.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage own quests"
  ON quests FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM characters
      WHERE characters.id = quests.character_id
      AND characters.user_id = auth.uid()
    )
  );

-- =====================================================
-- ACHIEVEMENTS TABLE
-- =====================================================
CREATE TABLE achievements (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  character_id UUID REFERENCES characters(id) ON DELETE CASCADE NOT NULL,
  achievement_id TEXT NOT NULL,
  unlocked_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT unique_achievement_per_character UNIQUE(character_id, achievement_id)
);

-- RLS Policies for achievements
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own achievements"
  ON achievements FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM characters
      WHERE characters.id = achievements.character_id
      AND characters.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own achievements"
  ON achievements FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM characters
      WHERE characters.id = achievements.character_id
      AND characters.user_id = auth.uid()
    )
  );

-- =====================================================
-- FUNCTIONS AND TRIGGERS
-- =====================================================

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, username, email)
  VALUES (new.id, new.raw_user_meta_data->>'username', new.email);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_characters_updated_at BEFORE UPDATE ON characters
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX idx_characters_user_id ON characters(user_id);
CREATE INDEX idx_inventory_character_id ON inventory(character_id);
CREATE INDEX idx_quests_character_id ON quests(character_id);
CREATE INDEX idx_achievements_character_id ON achievements(character_id);
CREATE INDEX idx_characters_last_active ON characters(last_active);
