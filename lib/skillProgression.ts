/**
 * Skill Progression Information
 * Describes how to train each skill
 */

export const SKILL_PROGRESSION_GUIDES: Record<string, string> = {
  // Combat Skills
  attack: 'Train by attacking enemies in Combat. Increases melee accuracy.',
  strength: 'Train by dealing damage in Combat. Increases melee damage output.',
  defense: 'Train by taking damage in Combat. Increases damage reduction.',
  magic: 'Train by casting spells and using magical abilities in Combat.',
  ranged: 'Train by using bows and ranged weapons in Combat.',
  constitution: 'Train by participating in Combat. Increases max health.',

  // Gathering Skills
  mining: 'Gather ores and gems in the Gathering tab. Unlock better materials as you level.',
  woodcutting: 'Chop trees in the Gathering tab. Unlock rare wood types as you level.',
  fishing: 'Catch fish in the Gathering tab. Unlock better fishing spots as you level.',
  farming: 'Plant and harvest crops. (Coming Soon)',
  hunting: 'Track and hunt creatures for pelts and meat in the Gathering tab.',

  // Artisan Skills
  smithing: 'Forge metal equipment and weapons in the Crafting tab.',
  crafting: 'Create leather and cloth items in the Crafting tab.',
  fletching: 'Craft bows, arrows, and ranged ammunition. (Coming Soon)',
  alchemy: 'Brew potions and elixirs from herbs in the Crafting tab.',
  cooking: 'Prepare food and consumables. (Coming Soon)',
  runecrafting: 'Create magical runes and enchantments. (Coming Soon)',

  // Support Skills
  agility: 'Increases movement speed and stamina regeneration. (Coming Soon)',
  thieving: 'Pickpocket NPCs and pick locks. (Coming Soon)',
  slayer: 'Complete special assignments for bonus damage vs specific monsters. (Coming Soon)'
}

export function getSkillProgressionGuide(skillType: string): string {
  return SKILL_PROGRESSION_GUIDES[skillType] || 'Train this skill through various activities.'
}
