-- Add Farming, Cooking, Fletching, Runecrafting Materials and Recipes
-- Migration: 20241011000000

-- Add Farming crops (seeds and harvests)
INSERT INTO materials (id, name, description, type, tier, required_skill_type, required_skill_level, gathering_time_ms, experience_reward, sell_price, rarity, stackable, max_stack, required_zone_level) VALUES
  -- Tier 1 (Level 1)
  ('potato_seed', 'Potato Seed', 'Plant to grow potatoes', 'farming', 1, 'farming', 1, 30000, 10, 5, 'common', true, 100, 1),
  ('potato', 'Potato', 'A fresh potato ready for cooking', 'farming', 1, 'farming', 1, 60000, 20, 10, 'common', true, 100, 1),
  ('wheat_seed', 'Wheat Seed', 'Plant to grow wheat', 'farming', 1, 'farming', 1, 30000, 10, 5, 'common', true, 100, 1),
  ('wheat', 'Wheat', 'Golden wheat grain', 'farming', 1, 'farming', 1, 60000, 20, 10, 'common', true, 100, 1),

  -- Tier 2 (Level 15)
  ('carrot_seed', 'Carrot Seed', 'Plant to grow carrots', 'farming', 2, 'farming', 15, 45000, 25, 15, 'uncommon', true, 100, 10),
  ('carrot', 'Carrot', 'A crunchy orange carrot', 'farming', 2, 'farming', 15, 90000, 40, 20, 'uncommon', true, 100, 10),
  ('cabbage_seed', 'Cabbage Seed', 'Plant to grow cabbage', 'farming', 2, 'farming', 15, 45000, 25, 15, 'uncommon', true, 100, 10),
  ('cabbage', 'Cabbage', 'A leafy green cabbage', 'farming', 2, 'farming', 15, 90000, 40, 20, 'uncommon', true, 100, 10),

  -- Tier 3 (Level 30)
  ('tomato_seed', 'Tomato Seed', 'Plant to grow tomatoes', 'farming', 3, 'farming', 30, 60000, 45, 25, 'rare', true, 100, 20),
  ('tomato', 'Tomato', 'A ripe red tomato', 'farming', 3, 'farming', 30, 120000, 70, 35, 'rare', true, 100, 20),
  ('corn_seed', 'Corn Seed', 'Plant to grow corn', 'farming', 3, 'farming', 30, 60000, 45, 25, 'rare', true, 100, 20),
  ('corn', 'Corn', 'Sweet golden corn', 'farming', 3, 'farming', 30, 120000, 70, 35, 'rare', true, 100, 20),

  -- Tier 4 (Level 50)
  ('pumpkin_seed', 'Pumpkin Seed', 'Plant to grow pumpkins', 'farming', 4, 'farming', 50, 90000, 75, 40, 'epic', true, 50, 35),
  ('pumpkin', 'Pumpkin', 'A large orange pumpkin', 'farming', 4, 'farming', 50, 180000, 120, 60, 'epic', true, 50, 35),
  ('strawberry_seed', 'Strawberry Seed', 'Plant to grow strawberries', 'farming', 4, 'farming', 50, 90000, 75, 40, 'epic', true, 50, 35),
  ('strawberry', 'Strawberry', 'Sweet red strawberries', 'farming', 4, 'farming', 50, 180000, 120, 60, 'epic', true, 50, 35),

  -- Tier 5 (Level 75)
  ('dragon_fruit_seed', 'Dragon Fruit Seed', 'Plant to grow exotic dragon fruit', 'farming', 5, 'farming', 75, 120000, 150, 75, 'legendary', true, 25, 50),
  ('dragon_fruit', 'Dragon Fruit', 'Exotic pink dragon fruit with incredible properties', 'farming', 5, 'farming', 75, 240000, 250, 125, 'legendary', true, 25, 50);

-- Add Cooking ingredients (raw → cooked items will be in crafting_recipes)
-- Cooked food items
INSERT INTO items (id, name, description, type, rarity, stackable, max_stack, consumable_effect, sell_price) VALUES
  ('baked_potato', 'Baked Potato', 'A delicious baked potato that restores health', 'consumable', 'common', true, 50, '{"health": 50}', 25),
  ('bread', 'Bread', 'Fresh baked bread that restores health', 'consumable', 'common', true, 50, '{"health": 50}', 25),
  ('carrot_soup', 'Carrot Soup', 'Warm carrot soup that restores health and mana', 'consumable', 'uncommon', true, 30, '{"health": 100, "mana": 50}', 50),
  ('vegetable_stew', 'Vegetable Stew', 'Hearty vegetable stew', 'consumable', 'uncommon', true, 30, '{"health": 100, "mana": 50}', 50),
  ('tomato_pasta', 'Tomato Pasta', 'Savory tomato pasta dish', 'consumable', 'rare', true, 20, '{"health": 200, "mana": 100}', 100),
  ('corn_chowder', 'Corn Chowder', 'Creamy corn chowder', 'consumable', 'rare', true, 20, '{"health": 200, "mana": 100}', 100),
  ('pumpkin_pie', 'Pumpkin Pie', 'Sweet pumpkin pie with magical properties', 'consumable', 'epic', true, 10, '{"health": 400, "mana": 200, "attack_boost": 10}', 200),
  ('strawberry_cake', 'Strawberry Cake', 'Delightful strawberry cake', 'consumable', 'epic', true, 10, '{"health": 400, "mana": 200, "defense_boost": 10}', 200),
  ('dragon_fruit_elixir', 'Dragon Fruit Elixir', 'Legendary elixir that greatly boosts all stats', 'consumable', 'legendary', true, 5, '{"health": 1000, "mana": 500, "attack_boost": 25, "defense_boost": 25}', 500);

-- Add Cooking recipes
INSERT INTO crafting_recipes (id, name, description, required_skill_type, required_crafting_level, crafting_time_ms, ingredients, result_item_id, result_quantity, experience_reward) VALUES
  ('baked_potato_recipe', 'Baked Potato', 'Cook a potato into a baked potato', 'cooking', 1, 10000, '{"potato": 1}', 'baked_potato', 1, 15),
  ('bread_recipe', 'Bread', 'Bake wheat into bread', 'cooking', 1, 10000, '{"wheat": 2}', 'bread', 1, 15),
  ('carrot_soup_recipe', 'Carrot Soup', 'Make warming carrot soup', 'cooking', 15, 15000, '{"carrot": 3, "wheat": 1}', 'carrot_soup', 1, 35),
  ('vegetable_stew_recipe', 'Vegetable Stew', 'Cook a hearty vegetable stew', 'cooking', 15, 15000, '{"cabbage": 2, "carrot": 2, "potato": 1}', 'vegetable_stew', 1, 35),
  ('tomato_pasta_recipe', 'Tomato Pasta', 'Prepare savory tomato pasta', 'cooking', 30, 20000, '{"tomato": 3, "wheat": 2}', 'tomato_pasta', 1, 60),
  ('corn_chowder_recipe', 'Corn Chowder', 'Cook creamy corn chowder', 'cooking', 30, 20000, '{"corn": 4, "potato": 2}', 'corn_chowder', 1, 60),
  ('pumpkin_pie_recipe', 'Pumpkin Pie', 'Bake magical pumpkin pie', 'cooking', 50, 30000, '{"pumpkin": 1, "wheat": 3, "strawberry": 1}', 'pumpkin_pie', 1, 100),
  ('strawberry_cake_recipe', 'Strawberry Cake', 'Bake delightful strawberry cake', 'cooking', 50, 30000, '{"strawberry": 5, "wheat": 3}', 'strawberry_cake', 1, 100),
  ('dragon_fruit_elixir_recipe', 'Dragon Fruit Elixir', 'Brew legendary dragon fruit elixir', 'cooking', 75, 60000, '{"dragon_fruit": 3, "kwuarm_herb": 2}', 'dragon_fruit_elixir', 1, 200);

-- Add Fletching materials and items
-- Arrow components
INSERT INTO materials (id, name, description, type, tier, required_skill_type, required_skill_level, gathering_time_ms, experience_reward, sell_price, rarity, stackable, max_stack, required_zone_level) VALUES
  ('arrow_shaft', 'Arrow Shaft', 'Wooden shaft for arrows', 'fletching', 1, 'woodcutting', 1, 5000, 5, 2, 'common', true, 1000, 1),
  ('feather', 'Feather', 'Bird feather for arrow fletching', 'fletching', 1, 'hunting', 1, 5000, 5, 2, 'common', true, 1000, 1);

-- Fletching weapons and ammo
INSERT INTO items (id, name, description, type, rarity, equipment_slot, attack, defense, sell_price, required_level) VALUES
  ('oak_shortbow', 'Oak Shortbow', 'Basic shortbow made from oak wood', 'weapon', 'common', 'weapon', 15, 0, 50, 1),
  ('willow_shortbow', 'Willow Shortbow', 'Improved shortbow made from willow wood', 'weapon', 'uncommon', 'weapon', 30, 0, 150, 15),
  ('maple_longbow', 'Maple Longbow', 'Sturdy longbow made from maple wood', 'weapon', 'rare', 'weapon', 50, 0, 400, 30),
  ('yew_longbow', 'Yew Longbow', 'Powerful longbow made from yew wood', 'weapon', 'epic', 'weapon', 75, 0, 800, 50),
  ('magic_bow', 'Magic Bow', 'Legendary bow infused with magical properties', 'weapon', 'legendary', 'weapon', 120, 0, 2000, 75);

-- Arrow items
INSERT INTO items (id, name, description, type, rarity, stackable, max_stack, sell_price) VALUES
  ('bronze_arrows', 'Bronze Arrows', 'Basic bronze-tipped arrows', 'material', 'common', true, 1000, 1),
  ('iron_arrows', 'Iron Arrows', 'Iron-tipped arrows', 'material', 'uncommon', true, 1000, 3),
  ('steel_arrows', 'Steel Arrows', 'Sharp steel-tipped arrows', 'material', 'rare', true, 1000, 6),
  ('mithril_arrows', 'Mithril Arrows', 'Magical mithril-tipped arrows', 'material', 'epic', true, 1000, 12),
  ('adamantite_arrows', 'Adamantite Arrows', 'Adamantite-tipped arrows', 'material', 'epic', true, 1000, 20),
  ('runite_arrows', 'Runite Arrows', 'Legendary runite-tipped arrows', 'material', 'legendary', true, 1000, 40);

-- Fletching recipes
INSERT INTO crafting_recipes (id, name, description, required_skill_type, required_crafting_level, crafting_time_ms, ingredients, result_item_id, result_quantity, experience_reward) VALUES
  -- Bows
  ('oak_shortbow_fletch', 'Oak Shortbow', 'Craft an oak shortbow', 'fletching', 1, 15000, '{"oak_log": 1}', 'oak_shortbow', 1, 20),
  ('willow_shortbow_fletch', 'Willow Shortbow', 'Craft a willow shortbow', 'fletching', 15, 20000, '{"willow_log": 1}', 'willow_shortbow', 1, 45),
  ('maple_longbow_fletch', 'Maple Longbow', 'Craft a maple longbow', 'fletching', 30, 25000, '{"maple_log": 2}', 'maple_longbow', 1, 80),
  ('yew_longbow_fletch', 'Yew Longbow', 'Craft a yew longbow', 'fletching', 50, 35000, '{"yew_log": 2}', 'yew_longbow', 1, 140),
  ('magic_bow_fletch', 'Magic Bow', 'Craft a legendary magic bow', 'fletching', 75, 50000, '{"magic_log": 3, "soul_rune": 5}', 'magic_bow', 1, 250),

  -- Arrows (batch craft)
  ('bronze_arrows_fletch', 'Bronze Arrows', 'Fletch bronze arrows', 'fletching', 1, 5000, '{"arrow_shaft": 15, "feather": 15, "copper_ore": 1}', 'bronze_arrows', 15, 10),
  ('iron_arrows_fletch', 'Iron Arrows', 'Fletch iron arrows', 'fletching', 15, 5000, '{"arrow_shaft": 15, "feather": 15, "iron_ore": 1}', 'iron_arrows', 15, 25),
  ('steel_arrows_fletch', 'Steel Arrows', 'Fletch steel arrows', 'fletching', 30, 5000, '{"arrow_shaft": 15, "feather": 15, "iron_ore": 2, "coal": 2}', 'steel_arrows', 15, 50),
  ('mithril_arrows_fletch', 'Mithril Arrows', 'Fletch mithril arrows', 'fletching', 45, 5000, '{"arrow_shaft": 15, "feather": 15, "mithril_ore": 1}', 'mithril_arrows', 15, 80),
  ('adamantite_arrows_fletch', 'Adamantite Arrows', 'Fletch adamantite arrows', 'fletching', 60, 5000, '{"arrow_shaft": 15, "feather": 15, "adamantite_ore": 1}', 'adamantite_arrows', 15, 120),
  ('runite_arrows_fletch', 'Runite Arrows', 'Fletch runite arrows', 'fletching', 75, 5000, '{"arrow_shaft": 15, "feather": 15, "runite_ore": 1}', 'runite_arrows', 15, 200);

-- Add Runecrafting materials (magical runes)
INSERT INTO materials (id, name, description, type, tier, required_skill_type, required_skill_level, gathering_time_ms, experience_reward, sell_price, rarity, stackable, max_stack, required_zone_level) VALUES
  -- Runes are already defined in the magic gathering system
  -- Adding runecrafting altars as "materials" that award XP when used
  ('essence_fragment', 'Essence Fragment', 'Raw magical essence', 'magic', 1, 'magic', 1, 8000, 8, 5, 'common', true, 1000, 1);

-- Runecrafting recipes (convert essence + altar into runes)
INSERT INTO crafting_recipes (id, name, description, required_skill_type, required_crafting_level, crafting_time_ms, ingredients, result_item_id, result_quantity, experience_reward) VALUES
  ('air_rune_craft', 'Air Rune', 'Craft air runes from essence', 'runecrafting', 1, 3000, '{"air_essence": 1}', 'air_rune', 3, 15),
  ('water_rune_craft', 'Water Rune', 'Craft water runes from essence', 'runecrafting', 5, 3000, '{"water_essence": 1}', 'water_rune', 3, 18),
  ('earth_rune_craft', 'Earth Rune', 'Craft earth runes from essence', 'runecrafting', 15, 3000, '{"earth_essence": 1}', 'earth_rune', 3, 25),
  ('fire_rune_craft', 'Fire Rune', 'Craft fire runes from essence', 'runecrafting', 20, 3000, '{"fire_essence": 1}', 'fire_rune', 3, 30),
  ('nature_rune_craft', 'Nature Rune', 'Craft nature runes from essence', 'runecrafting', 40, 5000, '{"nature_essence": 1}', 'nature_rune', 2, 60),
  ('chaos_rune_craft', 'Chaos Rune', 'Craft chaos runes from essence', 'runecrafting', 55, 5000, '{"chaos_essence": 1}', 'chaos_rune', 2, 90),
  ('death_rune_craft', 'Death Rune', 'Craft death runes from essence', 'runecrafting', 70, 7000, '{"death_essence": 1}', 'death_rune', 2, 130),
  ('soul_rune_craft', 'Soul Rune', 'Craft powerful soul runes from essence', 'runecrafting', 85, 10000, '{"soul_essence": 1}', 'soul_rune', 1, 200);

-- Add rune items to items table
INSERT INTO items (id, name, description, type, rarity, stackable, max_stack, sell_price) VALUES
  ('air_rune', 'Air Rune', 'Magical air rune for spellcasting', 'material', 'common', true, 10000, 5),
  ('water_rune', 'Water Rune', 'Magical water rune for spellcasting', 'material', 'common', true, 10000, 6),
  ('earth_rune', 'Earth Rune', 'Magical earth rune for spellcasting', 'material', 'uncommon', true, 10000, 8),
  ('fire_rune', 'Fire Rune', 'Magical fire rune for spellcasting', 'material', 'uncommon', true, 10000, 10),
  ('nature_rune', 'Nature Rune', 'Magical nature rune for spellcasting', 'material', 'rare', true, 10000, 20),
  ('chaos_rune', 'Chaos Rune', 'Magical chaos rune for spellcasting', 'material', 'epic', true, 10000, 35),
  ('death_rune', 'Death Rune', 'Magical death rune for spellcasting', 'material', 'epic', true, 10000, 50),
  ('soul_rune', 'Soul Rune', 'Legendary soul rune for spellcasting', 'material', 'legendary', true, 10000, 100);
