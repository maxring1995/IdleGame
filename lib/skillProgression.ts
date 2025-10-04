/**
 * Skill Progression Information
 * Describes how to train each skill
 */

export const SKILL_PROGRESSION_GUIDES: Record<string, string> = {
  // Combat Skills (ALL WORKING!)
  attack: 'Train by attacking enemies in Combat tab using Melee style. Gain 2 XP per attack.',
  strength: 'Train by dealing damage in Combat tab using Melee style. Gain XP based on damage dealt.',
  defense: 'Train by taking damage in Combat tab. Gain XP based on damage taken.',
  constitution: 'Train by participating in Combat tab. Gain 1 XP per combat turn.',
  magic: 'Train by casting spells in Combat tab using Magic style. Gain 3 XP per cast + damage bonus.',
  ranged: 'Train by shooting arrows in Combat tab using Ranged style. Gain 2 XP per shot + accuracy bonus.',

  // Gathering Skills (ALL WORKING!)
  mining: 'Gather ores and gems in Gathering tab. Unlock better materials as you level.',
  woodcutting: 'Chop trees in Gathering tab. Unlock rare wood types as you level.',
  fishing: 'Catch fish in Gathering tab. Unlock better fishing spots as you level.',
  hunting: 'Hunt creatures for pelts and meat in Gathering tab.',
  alchemy: 'Gather herbs in Gathering tab for potion ingredients.',
  farming: 'Plant and harvest crops in Gathering tab. Unlock better seeds as you level.',

  // Artisan Skills (ALL WORKING!)
  smithing: 'Forge weapons and armor in Crafting tab using ores. 12 recipes available!',
  crafting: 'Create leather and cloth items in Crafting tab.',
  fletching: 'Craft bows and arrows in Crafting tab. Unlock powerful ranged weapons!',
  cooking: 'Prepare food and consumables in Crafting tab. Unlock healing items!',
  runecrafting: 'Create magical runes in Crafting tab for spellcasting.',

  // Support Skills (ALL WORKING!)
  agility: 'Train by traveling between zones in Adventure tab. Gain XP based on distance traveled.',
  thieving: 'Train by looting items from defeated enemies in Combat tab. Gain 5 XP per item looted.',
  slayer: 'Train by defeating enemies in Combat tab. Gain 10 XP + level bonus per enemy defeated.'
}

export function getSkillProgressionGuide(skillType: string): string {
  return SKILL_PROGRESSION_GUIDES[skillType] || 'Train this skill through various activities.'
}
