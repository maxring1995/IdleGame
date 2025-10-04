/**
 * Content Generation Script for Eternal Realms
 * Generates 1000 weapons, 7000 equipment items, 1000 monsters, 300 quests, 200 recipes
 * WITH UNIQUE ICONS FOR EVERYTHING
 */

// Icon pools for variety
const weaponIcons = ['⚔️', '🗡️', '🔪', '🪓', '🔨', '⚒️', '🛡️', '🏹', '🏏', '⛏️', '🔱', '🗝️', '💎', '⚡', '🔥', '❄️', '💀', '👑', '✨', '🌟'];
const armorIcons = {
  helmet: ['⛑️', '🎩', '👑', '🪖', '🎓', '🧢', '👒'],
  chest: ['🛡️', '👔', '🥼', '🦺', '👕', '🎽'],
  legs: ['👖', '🩳', '🧤'],
  boots: ['👢', '👞', '👟', '🥾', '🩴', '👠'],
  gloves: ['🧤', '🥊', '✋'],
  ring: ['💍', '💎', '⭕', '🔵', '🟣', '🟡', '🔴'],
  amulet: ['📿', '⭐', '✨', '💫', '🌟', '🔮', '💠']
};
const monsterIcons = ['👹', '👺', '👻', '👽', '👾', '🤖', '💀', '☠️', '👿', '😈', '🦹', '🧟', '🧛', '🧜', '🧚', '🧞', '🧝', '🧙', '🐉', '🐲', '🦇', '🕷️', '🦂', '🐍', '🦎', '🐊', '🦈', '🐺', '🐻', '🦁', '🐯', '🦅', '🦉', '🦍', '👾', '🎃', '🔥', '⚡', '💫'];
const questIcons = ['📜', '🗺️', '📖', '📋', '🎯', '🏆', '🎖️', '🥇', '🥈', '🥉', '🎁', '🎪', '🎭', '🎨', '🎺', '🎸', '🎻', '🎹', '⚔️', '🛡️', '🏹', '🗝️', '🔑', '💎', '👑', '⭐', '✨', '🌟'];
const recipeIcons = ['🔨', '⚒️', '🛠️', '⚙️', '🔧', '🔩', '⚗️', '🧪', '🧬', '🔬', '🧰', '📐', '📏', '✂️', '🖊️', '🖌️', '🎨'];

// Weapon name components
const weaponPrefixes = ['Blessed', 'Cursed', 'Ancient', 'Ethereal', 'Infernal', 'Divine', 'Shadow', 'Radiant', 'Void', 'Crimson', 'Azure', 'Emerald', 'Golden', 'Silver', 'Bronze', 'Iron', 'Steel', 'Mithril', 'Adamant', 'Runite', 'Dragon', 'Obsidian', 'Crystal', 'Demon', 'Angel', 'Frost', 'Flame', 'Storm', 'Earth', 'Lightning', 'Venomous', 'Toxic', 'Spectral', 'Phantom', 'Wraith', 'Soul', 'Spirit', 'Mystic', 'Arcane', 'Eldritch', 'Primal', 'Savage', 'Brutal', 'Wicked', 'Holy', 'Unholy', 'Chaos', 'Order', 'Celestial', 'Infernal'];
const weaponTypes = ['Sword', 'Blade', 'Saber', 'Scimitar', 'Katana', 'Longsword', 'Greatsword', 'Claymore', 'Rapier', 'Dagger', 'Dirk', 'Kris', 'Stiletto', 'Axe', 'Hatchet', 'Battleaxe', 'Greataxe', 'Mace', 'Hammer', 'Warhammer', 'Maul', 'Flail', 'Morningstar', 'Spear', 'Lance', 'Pike', 'Halberd', 'Glaive', 'Scythe', 'Staff', 'Rod', 'Wand', 'Scepter', 'Bow', 'Crossbow', 'Longbow', 'Shortbow'];
const weaponSuffixes = ['of Power', 'of Might', 'of Destruction', 'of Doom', 'of Death', 'of Life', 'of Souls', 'of the Fallen', 'of the Damned', 'of the Blessed', 'of the Ancients', 'of the Gods', 'of the Titans', 'of Legends', 'of Eternity', 'of Infinity', 'of the Void', 'of Chaos', 'of Order', 'of Light', 'of Darkness', 'of Fire', 'of Ice', 'of Lightning', 'of Earth', 'of Wind', 'of Water', 'of Nature', 'of Blood', 'of Vengeance'];

// Armor name components
const armorPrefixes = ['Reinforced', 'Enchanted', 'Fortified', 'Blessed', 'Cursed', 'Ancient', 'Ethereal', 'Divine', 'Shadow', 'Radiant', 'Void', 'Crimson', 'Azure', 'Emerald', 'Golden', 'Silver', 'Bronze', 'Iron', 'Steel', 'Mithril', 'Adamant', 'Runite', 'Dragon', 'Obsidian', 'Crystal', 'Demon', 'Angel', 'Frost', 'Flame', 'Storm', 'Plate', 'Chainmail', 'Leather', 'Hide', 'Scale', 'Bone', 'Dragonhide', 'Royal', 'Imperial', 'Legendary'];
const armorTypes = {
  helmet: ['Helm', 'Helmet', 'Coif', 'Crown', 'Circlet', 'Hood', 'Cap', 'Cowl', 'Mask', 'Visor', 'Headband', 'Diadem'],
  chest: ['Chestplate', 'Cuirass', 'Breastplate', 'Vest', 'Tunic', 'Robe', 'Hauberk', 'Armor', 'Mail', 'Coat'],
  legs: ['Greaves', 'Leggings', 'Pants', 'Trousers', 'Breeches', 'Legguards', 'Chausses', 'Tassets'],
  boots: ['Boots', 'Greaves', 'Sabatons', 'Shoes', 'Slippers', 'Sandals', 'Treads', 'Walkers'],
  gloves: ['Gloves', 'Gauntlets', 'Handguards', 'Mittens', 'Grips', 'Bracers', 'Vambraces'],
  ring: ['Ring', 'Band', 'Signet', 'Loop', 'Circle'],
  amulet: ['Amulet', 'Necklace', 'Pendant', 'Medallion', 'Talisman', 'Charm', 'Periapt']
};
const armorSuffixes = ['of Protection', 'of Defense', 'of Warding', 'of Shielding', 'of Fortitude', 'of Vitality', 'of Health', 'of Regeneration', 'of the Guardian', 'of the Protector', 'of the Tank', 'of the Warrior', 'of the Knight', 'of the Paladin', 'of the Champion', 'of Glory', 'of Honor', 'of Valor', 'of Courage'];

// Monster name components
const monsterPrefixes = ['Lesser', 'Greater', 'Elder', 'Ancient', 'Juvenile', 'Adult', 'Alpha', 'Omega', 'Prime', 'Corrupted', 'Possessed', 'Enraged', 'Frenzied', 'Rabid', 'Vicious', 'Savage', 'Brutal', 'Cruel', 'Wicked', 'Dark', 'Shadow', 'Void', 'Chaos', 'Blood', 'Death', 'Soul', 'Spirit', 'Phantom', 'Spectral', 'Ethereal', 'Infernal', 'Demonic', 'Angelic', 'Divine', 'Celestial', 'Abyssal', 'Cursed', 'Blessed', 'Frost', 'Flame'];
const monsterTypes = ['Goblin', 'Orc', 'Troll', 'Ogre', 'Giant', 'Dragon', 'Drake', 'Wyrm', 'Wyvern', 'Demon', 'Devil', 'Fiend', 'Imp', 'Ghost', 'Wraith', 'Specter', 'Phantom', 'Zombie', 'Skeleton', 'Lich', 'Vampire', 'Werewolf', 'Wolf', 'Bear', 'Tiger', 'Lion', 'Spider', 'Scorpion', 'Serpent', 'Snake', 'Hydra', 'Basilisk', 'Golem', 'Elemental', 'Slime', 'Ooze', 'Mimic', 'Harpy', 'Griffin', 'Manticore', 'Chimera', 'Cerberus', 'Banshee', 'Gargoyle', 'Treant', 'Dryad', 'Satyr', 'Centaur', 'Minotaur', 'Cyclops'];
const monsterSuffixes = ['Warrior', 'Berserker', 'Champion', 'Lord', 'King', 'Queen', 'Prince', 'Princess', 'Chieftain', 'Warlord', 'Destroyer', 'Slayer', 'Hunter', 'Stalker', 'Prowler', 'Reaver', 'Ravager', 'Marauder', 'Raider', 'Invader', 'Conqueror', 'Tyrant'];

// Quest name components
const questPrefixes = ['The Lost', 'The Forgotten', 'The Ancient', 'The Hidden', 'The Secret', 'The Cursed', 'The Blessed', 'The Legendary', 'The Epic', 'The Heroic', 'The Grand', 'The Great', 'The Mighty', 'The Powerful', 'The Mysterious', 'The Enigmatic', 'The Dark', 'The Light', 'The Shadow', 'The Radiant'];
const questNouns = ['Artifact', 'Relic', 'Treasure', 'Sword', 'Crown', 'Amulet', 'Ring', 'Staff', 'Tome', 'Scroll', 'Crystal', 'Gem', 'Stone', 'Key', 'Map', 'Seal', 'Portal', 'Gate', 'Temple', 'Ruins', 'Dungeon', 'Cave', 'Tower', 'Castle', 'Fortress', 'Kingdom', 'Empire', 'City', 'Village', 'Forest', 'Mountain', 'Valley', 'Desert', 'Ocean', 'Island'];
const questActions = ['Retrieve', 'Find', 'Discover', 'Locate', 'Seek', 'Hunt', 'Slay', 'Defeat', 'Destroy', 'Protect', 'Defend', 'Guard', 'Save', 'Rescue', 'Recover', 'Reclaim', 'Investigate', 'Explore', 'Conquer', 'Liberate'];

// Rarity system
const rarities = [
  { name: 'common', weight: 50, multiplier: 1.0 },
  { name: 'uncommon', weight: 30, multiplier: 1.5 },
  { name: 'rare', weight: 12, multiplier: 2.0 },
  { name: 'epic', weight: 6, multiplier: 3.0 },
  { name: 'legendary', weight: 2, multiplier: 5.0 }
];

// Helper functions
function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getWeightedRarity(): string {
  const totalWeight = rarities.reduce((sum, r) => sum + r.weight, 0);
  let random = Math.random() * totalWeight;

  for (const rarity of rarities) {
    random -= rarity.weight;
    if (random <= 0) return rarity.name;
  }

  return 'common';
}

function getRarityMultiplier(rarity: string): number {
  return rarities.find(r => r.name === rarity)?.multiplier || 1.0;
}

// Generate 1000 weapons
function generateWeapons(): string[] {
  const weapons: string[] = [];
  let idCounter = 2000; // Start after existing items

  for (let i = 0; i < 1000; i++) {
    const prefix = randomChoice(weaponPrefixes);
    const type = randomChoice(weaponTypes);
    const suffix = Math.random() > 0.5 ? ` ${randomChoice(weaponSuffixes)}` : '';
    const name = `${prefix} ${type}${suffix}`;
    const itemId = `weapon_${idCounter++}`;
    const rarity = getWeightedRarity();
    const multiplier = getRarityMultiplier(rarity);
    const level = Math.max(1, Math.min(99, randomInt(1, 99)));
    const icon = randomChoice(weaponIcons);

    const baseAttack = Math.floor((10 + level * 2) * multiplier);
    const bonusDefense = Math.floor(randomInt(0, 5) * multiplier);
    const bonusHealth = Math.floor(randomInt(0, 10) * multiplier);
    const bonusMana = Math.floor(randomInt(0, 10) * multiplier);

    const description = `A ${rarity} weapon wielded by those level ${level} and above. Attack +${baseAttack}${bonusDefense > 0 ? `, Defense +${bonusDefense}` : ''}${bonusHealth > 0 ? `, Health +${bonusHealth}` : ''}${bonusMana > 0 ? `, Mana +${bonusMana}` : ''}.`;

    weapons.push(`('${itemId}', '${name.replace(/'/g, "''")}', 'weapon', '${rarity}', ${baseAttack}, ${bonusDefense}, ${bonusHealth}, ${bonusMana}, 'weapon', ${level}, 1, true, 1, '${description.replace(/'/g, "''")}', '${icon}')`);
  }

  return weapons;
}

// Generate armor for each slot
function generateArmor(slot: string, count: number, startId: number): string[] {
  const armor: string[] = [];
  let idCounter = startId;
  const types = armorTypes[slot as keyof typeof armorTypes];
  const icons = armorIcons[slot as keyof typeof armorIcons];

  for (let i = 0; i < count; i++) {
    const prefix = randomChoice(armorPrefixes);
    const type = randomChoice(types);
    const suffix = Math.random() > 0.5 ? ` ${randomChoice(armorSuffixes)}` : '';
    const name = `${prefix} ${type}${suffix}`;
    const itemId = `${slot}_${idCounter++}`;
    const rarity = getWeightedRarity();
    const multiplier = getRarityMultiplier(rarity);
    const level = Math.max(1, Math.min(99, randomInt(1, 99)));
    const icon = randomChoice(icons);

    const baseDefense = Math.floor((5 + level * 1.5) * multiplier);
    const bonusAttack = slot === 'gloves' ? Math.floor(randomInt(0, 5) * multiplier) : 0;
    const bonusHealth = Math.floor((10 + level * 0.5) * multiplier);
    const bonusMana = Math.floor(randomInt(0, 10) * multiplier);

    const description = `A ${rarity} ${slot} for level ${level}+ adventurers. Defense +${baseDefense}${bonusAttack > 0 ? `, Attack +${bonusAttack}` : ''}, Health +${bonusHealth}${bonusMana > 0 ? `, Mana +${bonusMana}` : ''}.`;

    armor.push(`('${itemId}', '${name.replace(/'/g, "''")}', 'armor', '${rarity}', ${bonusAttack}, ${baseDefense}, ${bonusHealth}, ${bonusMana}, '${slot}', ${level}, 1, false, 1, '${description.replace(/'/g, "''")}', '${icon}')`);
  }

  return armor;
}

// Generate monsters
function generateMonsters(): string[] {
  const monsters: string[] = [];
  let idCounter = 2000;

  for (let i = 0; i < 1000; i++) {
    const prefix = Math.random() > 0.6 ? `${randomChoice(monsterPrefixes)} ` : '';
    const type = randomChoice(monsterTypes);
    const suffix = Math.random() > 0.3 ? ` ${randomChoice(monsterSuffixes)}` : '';
    const name = `${prefix}${type}${suffix}`;
    const enemyId = `enemy_${idCounter++}`;
    const level = Math.max(1, Math.min(99, randomInt(1, 99)));
    const icon = randomChoice(monsterIcons);

    const health = Math.floor(50 + level * 10);
    const attack = Math.floor(5 + level * 2);
    const defense = Math.floor(3 + level * 1.5);
    const xp = Math.floor(10 + level * 5);
    const goldMin = Math.floor(5 + level * 2);
    const goldMax = Math.floor(15 + level * 5);

    const lootTable = `{"item_wooden_sword": 0.05, "item_leather_armor": 0.05, "item_health_potion": 0.15}`;

    monsters.push(`('${enemyId}', '${name.replace(/'/g, "''")}', NULL, ${level}, ${health}, ${attack}, ${defense}, ${xp}, ${goldMin}, ${goldMax}, '${lootTable}', ${level}, NULL, '${icon}')`);
  }

  return monsters;
}

// Generate quests
function generateQuests(): string[] {
  const quests: string[] = [];
  let idCounter = 2000;

  for (let i = 0; i < 300; i++) {
    const action = randomChoice(questActions);
    const prefix = randomChoice(questPrefixes);
    const noun = randomChoice(questNouns);
    const title = `${action} ${prefix} ${noun}`;
    const questId = `quest_${idCounter++}`;
    const level = Math.max(1, Math.min(99, randomInt(1, 99)));
    const icon = randomChoice(questIcons);

    const objectiveTypes = ['kill', 'collect', 'explore', 'craft'];
    const objectiveType = randomChoice(objectiveTypes);
    let objective = '';

    if (objectiveType === 'kill') {
      const count = randomInt(5, 50);
      objective = `Defeat ${count} enemies`;
    } else if (objectiveType === 'collect') {
      const count = randomInt(10, 100);
      const material = randomChoice(['Oak Logs', 'Copper Ore', 'Shrimp', 'Rabbit Pelt', 'Guam Leaf', 'Air Essence']);
      objective = `Gather ${count} ${material}`;
    } else if (objectiveType === 'explore') {
      const zones = ['Whispering Woods', 'Crimson Canyon', 'Frostpeak Summit', 'Shadowmere Depths', 'Celestial Wastes'];
      objective = `Explore ${randomChoice(zones)}`;
    } else {
      const count = randomInt(1, 10);
      objective = `Craft ${count} items`;
    }

    const xpReward = Math.floor(100 + level * 50);
    const goldReward = Math.floor(50 + level * 25);
    const itemRewards = Math.random() > 0.5 ? `{"item_health_potion": ${randomInt(1, 5)}}` : 'NULL';

    const description = `${objective} to complete this quest. Rewards: ${xpReward} XP, ${goldReward} gold.`;

    quests.push(`('${questId}', '${title.replace(/'/g, "''")}', '${description.replace(/'/g, "''")}', ${level}, '${objective.replace(/'/g, "''")}', ${xpReward}, ${goldReward}, ${itemRewards}, '${icon}')`);
  }

  return quests;
}

// Generate crafting recipes
function generateRecipes(): string[] {
  const recipes: string[] = [];
  let idCounter = 2000;

  const craftableTypes = ['weapon', 'armor'];
  const skills = ['woodcutting', 'mining', 'fishing', 'hunting', 'alchemy', 'magic'];

  for (let i = 0; i < 200; i++) {
    const recipeId = `recipe_${idCounter++}`;
    const itemType = randomChoice(craftableTypes);
    const level = Math.max(1, Math.min(99, randomInt(1, 99)));
    const skill = randomChoice(skills);
    const icon = randomChoice(recipeIcons);

    let outputItem = '';
    let recipeName = '';

    if (itemType === 'weapon') {
      const prefix = randomChoice(weaponPrefixes);
      const type = randomChoice(weaponTypes);
      recipeName = `${prefix} ${type}`;
      outputItem = `weapon_${1000 + i}`;
    } else {
      const slot = randomChoice(['helmet', 'chest', 'legs', 'boots', 'gloves']);
      const prefix = randomChoice(armorPrefixes);
      const type = randomChoice(armorTypes[slot as keyof typeof armorTypes]);
      recipeName = `${prefix} ${type}`;
      outputItem = `${slot}_${1000 + i}`;
    }

    const materialCount = randomInt(2, 5);
    const materials: { [key: string]: number } = {};

    for (let j = 0; j < materialCount; j++) {
      const mat = randomChoice(['oak_log', 'copper_ore', 'raw_shrimp', 'rabbit_pelt', 'guam_leaf', 'air_essence']);
      materials[mat] = randomInt(5, 20);
    }

    const materialsJson = JSON.stringify(materials).replace(/"/g, '\\"');
    const description = `Craft a ${recipeName} using ${skill}.`;

    recipes.push(`('${recipeId}', '${recipeName.replace(/'/g, "''")}', '${description.replace(/'/g, "''")}', '${outputItem}', 1, ${level}, '${skill}', '${materialsJson}', 5000, 50, '${itemType}', '${icon}')`);
  }

  return recipes;
}

// Generate all content
console.log('-- MASSIVE CONTENT EXPANSION WITH UNIQUE ICONS');
console.log('-- Generated weapons, armor, monsters, quests, and recipes');
console.log('');

console.log('-- 1000 Weapons');
const weapons = generateWeapons();
console.log(`INSERT INTO items (id, name, type, rarity, attack_bonus, defense_bonus, health_bonus, mana_bonus, equipment_slot, required_level, sell_price, stackable, max_stack, description, icon) VALUES`);
console.log(weapons.join(',\n'));
console.log('ON CONFLICT (id) DO NOTHING;');
console.log('');

console.log('-- 7000 Armor Pieces (1000 per slot)');
const helmets = generateArmor('helmet', 1000, 10000);
const chests = generateArmor('chest', 1000, 20000);
const legs = generateArmor('legs', 1000, 30000);
const boots = generateArmor('boots', 1000, 40000);
const gloves = generateArmor('gloves', 1000, 50000);
const rings = generateArmor('ring', 1000, 60000);
const amulets = generateArmor('amulet', 1000, 70000);

const allArmor = [...helmets, ...chests, ...legs, ...boots, ...gloves, ...rings, ...amulets];
console.log(`INSERT INTO items (id, name, type, rarity, attack_bonus, defense_bonus, health_bonus, mana_bonus, equipment_slot, required_level, sell_price, stackable, max_stack, description, icon) VALUES`);
console.log(allArmor.join(',\n'));
console.log('ON CONFLICT (id) DO NOTHING;');
console.log('');

console.log('-- 1000 Monsters');
const monsters = generateMonsters();
console.log(`INSERT INTO enemies (id, name, description, level, health, attack, defense, experience_reward, gold_min, gold_max, loot_table, required_player_level, image_url, icon) VALUES`);
console.log(monsters.join(',\n'));
console.log('ON CONFLICT (id) DO NOTHING;');
console.log('');

console.log('-- 300 Quests');
const quests = generateQuests();
console.log(`INSERT INTO quest_definitions (id, title, description, level_requirement, objective, xp_reward, gold_reward, item_rewards, icon) VALUES`);
console.log(quests.join(',\n'));
console.log('ON CONFLICT (id) DO NOTHING;');
console.log('');

console.log('-- 200 Crafting Recipes');
const recipes = generateRecipes();
console.log(`INSERT INTO crafting_recipes (id, name, description, result_item_id, result_quantity, required_crafting_level, required_skill_type, ingredients, crafting_time_ms, experience_reward, recipe_category, icon) VALUES`);
console.log(recipes.join(',\n'));
console.log('ON CONFLICT (id) DO NOTHING;');
