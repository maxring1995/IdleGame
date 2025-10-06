-- Class Trainer NPCs System
-- NPCs that teach class abilities to players

CREATE TABLE IF NOT EXISTS class_trainers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  title VARCHAR(100),
  class_id VARCHAR(50) NOT NULL REFERENCES classes(id),
  description TEXT,
  lore TEXT,
  icon VARCHAR(10),
  zone_id VARCHAR(50),
  location_name VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trainer abilities (what they can teach)
CREATE TABLE IF NOT EXISTS trainer_abilities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trainer_id UUID NOT NULL REFERENCES class_trainers(id) ON DELETE CASCADE,
  ability_id UUID NOT NULL REFERENCES class_abilities(id) ON DELETE CASCADE,
  gold_cost INTEGER DEFAULT 0,
  additional_requirements TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(trainer_id, ability_id)
);

-- RLS policies (trainers are public data)
ALTER TABLE class_trainers ENABLE ROW LEVEL SECURITY;
ALTER TABLE trainer_abilities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view trainers"
  ON class_trainers FOR SELECT
  USING (true);

CREATE POLICY "Everyone can view trainer abilities"
  ON trainer_abilities FOR SELECT
  USING (true);

-- Insert Class Trainers (1 per class, 2 zones each)
INSERT INTO class_trainers (name, title, class_id, description, lore, icon, zone_id, location_name) VALUES
-- Warrior Trainers
('Commander Thorne', 'Master of Arms', 'warrior', 'A grizzled veteran who has seen a thousand battles.', 'Commander Thorne served in the Great War and now trains the next generation of warriors.', '⚔️', 'havenbrook_village', 'Havenbrook Village Barracks'),
('Ironbreaker Grimm', 'War Master', 'warrior', 'A legendary warrior known for his unbreakable defense.', 'Grimm earned his name after holding a mountain pass against an army single-handedly.', '🛡️', 'ironpeak_mountains', 'Ironpeak Fortress'),

-- Mage Trainers
('Archmage Elara', 'Mistress of the Arcane', 'mage', 'A powerful sorceress who has mastered all schools of magic.', 'Elara studied at the Tower of Eternity and is renowned for her magical prowess.', '🔮', 'havenbrook_village', 'Havenbrook Mage Tower'),
('Frostweaver Zara', 'Ice Sage', 'mage', 'A frost mage who can freeze entire armies.', 'Zara once froze a volcanic eruption to save a village, earning eternal gratitude.', '❄️', 'frostspire_peaks', 'Frostspire Academy'),

-- Rogue Trainers
('Shadow Vex', 'Master Assassin', 'rogue', 'A mysterious figure who appears and disappears like smoke.', 'Vex was once the king\'s personal spy and now teaches the art of subtlety.', '🗡️', 'havenbrook_village', 'Havenbrook Shadows'),
('Nightblade Sera', 'Mistress of Blades', 'rogue', 'An expert in dual-wielding and poison craft.', 'Sera survived the Assassin\'s Guild purge and now works independently.', '⚔️', 'shadowfen_marshes', 'Shadowfen Hideout'),

-- Paladin Trainers
('High Paladin Aurelius', 'Champion of Light', 'paladin', 'A holy warrior blessed by the divine.', 'Aurelius led the charge against the undead horde and was blessed with holy power.', '✨', 'havenbrook_village', 'Havenbrook Cathedral'),
('Justicar Kael', 'Holy Avenger', 'paladin', 'A righteous defender of the innocent.', 'Kael swore an oath to protect the weak and has never broken it.', '⚖️', 'whispering_woods', 'Sacred Grove'),

-- Ranger Trainers
('Huntmaster Elysia', 'Beast Whisperer', 'ranger', 'A ranger with an unmatched connection to nature.', 'Elysia can communicate with animals and commands the respect of all beasts.', '🏹', 'havenbrook_village', 'Havenbrook Wilds'),
('Hawkeye Drake', 'Master Marksman', 'ranger', 'A legendary archer who never misses his mark.', 'Drake once shot an apple off someone\'s head from 500 yards away.', '🎯', 'whispering_woods', 'Ranger\'s Lodge'),

-- Warlock Trainers
('Darkmage Malakar', 'Shadow Summoner', 'warlock', 'A warlock who has made pacts with dark entities.', 'Malakar trades knowledge for power and fears no consequence.', '💀', 'havenbrook_village', 'Havenbrook Catacombs'),
('Void Caller Nyx', 'Mistress of Curses', 'warlock', 'A warlock who specializes in affliction magic.', 'Nyx\'s curses are said to last for generations.', '🌑', 'cursed_wastes', 'Void Temple');

-- Link trainers to their abilities (each trainer teaches all class abilities)
-- Warrior trainers teach warrior abilities
INSERT INTO trainer_abilities (trainer_id, ability_id, gold_cost)
SELECT
  t.id,
  a.id,
  CASE
    WHEN a.required_level <= 5 THEN 10
    WHEN a.required_level <= 15 THEN 50
    WHEN a.required_level <= 25 THEN 100
    ELSE 200
  END as gold_cost
FROM class_trainers t
CROSS JOIN class_abilities a
WHERE t.class_id = 'warrior' AND a.class_id = 'warrior';

-- Mage trainers teach mage abilities
INSERT INTO trainer_abilities (trainer_id, ability_id, gold_cost)
SELECT
  t.id,
  a.id,
  CASE
    WHEN a.required_level <= 5 THEN 10
    WHEN a.required_level <= 15 THEN 50
    WHEN a.required_level <= 25 THEN 100
    ELSE 200
  END as gold_cost
FROM class_trainers t
CROSS JOIN class_abilities a
WHERE t.class_id = 'mage' AND a.class_id = 'mage';

-- Rogue trainers teach rogue abilities
INSERT INTO trainer_abilities (trainer_id, ability_id, gold_cost)
SELECT
  t.id,
  a.id,
  CASE
    WHEN a.required_level <= 5 THEN 10
    WHEN a.required_level <= 15 THEN 50
    WHEN a.required_level <= 25 THEN 100
    ELSE 200
  END as gold_cost
FROM class_trainers t
CROSS JOIN class_abilities a
WHERE t.class_id = 'rogue' AND a.class_id = 'rogue';

-- Paladin trainers teach paladin abilities
INSERT INTO trainer_abilities (trainer_id, ability_id, gold_cost)
SELECT
  t.id,
  a.id,
  CASE
    WHEN a.required_level <= 5 THEN 10
    WHEN a.required_level <= 15 THEN 50
    WHEN a.required_level <= 25 THEN 100
    ELSE 200
  END as gold_cost
FROM class_trainers t
CROSS JOIN class_abilities a
WHERE t.class_id = 'paladin' AND a.class_id = 'paladin';

-- Ranger trainers teach ranger abilities
INSERT INTO trainer_abilities (trainer_id, ability_id, gold_cost)
SELECT
  t.id,
  a.id,
  CASE
    WHEN a.required_level <= 5 THEN 10
    WHEN a.required_level <= 15 THEN 50
    WHEN a.required_level <= 25 THEN 100
    ELSE 200
  END as gold_cost
FROM class_trainers t
CROSS JOIN class_abilities a
WHERE t.class_id = 'ranger' AND a.class_id = 'ranger';

-- Warlock trainers teach warlock abilities
INSERT INTO trainer_abilities (trainer_id, ability_id, gold_cost)
SELECT
  t.id,
  a.id,
  CASE
    WHEN a.required_level <= 5 THEN 10
    WHEN a.required_level <= 15 THEN 50
    WHEN a.required_level <= 25 THEN 100
    ELSE 200
  END as gold_cost
FROM class_trainers t
CROSS JOIN class_abilities a
WHERE t.class_id = 'warlock' AND a.class_id = 'warlock';
