/**
 * Crafting System
 *
 * Handles crafting recipes, ingredient checking, and item creation.
 */

import { createClient } from '@/utils/supabase/client'
import { CraftingRecipe, CraftingSkillType } from './supabase'
import { addSkillExperience } from './materials'
import { addItem } from './inventory'

/**
 * Get all crafting recipes
 */
export async function getAllRecipes() {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('crafting_recipes')
    .select('*')
    .order('required_crafting_level', { ascending: true })

  return { data: data as CraftingRecipe[] | null, error }
}

/**
 * Get recipes by skill type
 */
export async function getRecipesBySkill(skillType: CraftingSkillType) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('crafting_recipes')
    .select('*')
    .eq('required_skill_type', skillType)
    .order('required_crafting_level', { ascending: true })

  return { data: data as CraftingRecipe[] | null, error }
}

/**
 * Get recipe by ID
 */
export async function getRecipeById(recipeId: string) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('crafting_recipes')
    .select('*')
    .eq('id', recipeId)
    .single()

  return { data: data as CraftingRecipe | null, error }
}

/**
 * Get available recipes for a character (based on skill level)
 */
export async function getAvailableRecipes(characterId: string, skillType: CraftingSkillType) {
  const supabase = createClient()

  // Get character's crafting skill level
  const { data: skill, error: skillError } = await supabase
    .from('character_skills')
    .select('level')
    .eq('character_id', characterId)
    .eq('skill_type', skillType)
    .single()

  const playerSkillLevel = skill?.level || 1

  // Get recipes within character's skill range
  const { data: recipes, error: recipesError } = await supabase
    .from('crafting_recipes')
    .select('*')
    .eq('required_skill_type', skillType)
    .lte('required_crafting_level', playerSkillLevel)
    .order('required_crafting_level', { ascending: true })

  return { data: recipes as CraftingRecipe[] | null, error: recipesError }
}

/**
 * Check if character has required ingredients for a recipe
 */
export async function checkIngredients(characterId: string, recipeId: string) {
  const supabase = createClient()

  // Get recipe
  const { data: recipe, error: recipeError } = await getRecipeById(recipeId)

  if (recipeError || !recipe) {
    return { hasIngredients: false, error: recipeError, missing: [] }
  }

  // Get character's inventory
  const { data: inventory, error: invError } = await supabase
    .from('inventory')
    .select('item_id, quantity')
    .eq('character_id', characterId)

  if (invError) {
    return { hasIngredients: false, error: invError, missing: [] }
  }

  const ingredients = recipe.ingredients as Record<string, number>
  const missing: Array<{ materialId: string; needed: number; has: number }> = []

  // Check each ingredient
  for (const [materialId, requiredQuantity] of Object.entries(ingredients)) {
    const inventoryItem = inventory?.find(item => item.item_id === materialId)
    const currentQuantity = inventoryItem?.quantity || 0

    if (currentQuantity < requiredQuantity) {
      missing.push({
        materialId,
        needed: requiredQuantity,
        has: currentQuantity
      })
    }
  }

  return {
    hasIngredients: missing.length === 0,
    error: null,
    missing
  }
}

/**
 * Consume ingredients from inventory
 */
async function consumeIngredients(characterId: string, ingredients: Record<string, number>) {
  const supabase = createClient()

  for (const [materialId, quantity] of Object.entries(ingredients)) {
    // Get current inventory item
    const { data: invItem, error: getError } = await supabase
      .from('inventory')
      .select('*')
      .eq('character_id', characterId)
      .eq('item_id', materialId)
      .single()

    if (getError || !invItem) {
      return { error: new Error(`Missing material: ${materialId}`) }
    }

    const newQuantity = invItem.quantity - quantity

    if (newQuantity < 0) {
      return { error: new Error(`Not enough ${materialId}`) }
    }

    if (newQuantity === 0) {
      // Delete item if quantity reaches 0
      const { error: deleteError } = await supabase
        .from('inventory')
        .delete()
        .eq('id', invItem.id)

      if (deleteError) return { error: deleteError }
    } else {
      // Update quantity
      const { error: updateError } = await supabase
        .from('inventory')
        .update({ quantity: newQuantity })
        .eq('id', invItem.id)

      if (updateError) return { error: updateError }
    }
  }

  return { error: null }
}

/**
 * Craft an item from a recipe
 */
export async function craftItem(characterId: string, recipeId: string) {
  const supabase = createClient()

  // Get recipe
  const { data: recipe, error: recipeError } = await getRecipeById(recipeId)

  if (recipeError || !recipe) {
    return { data: null, error: recipeError || new Error('Recipe not found') }
  }

  // Check skill level
  const { data: skill, error: skillError } = await supabase
    .from('character_skills')
    .select('level')
    .eq('character_id', characterId)
    .eq('skill_type', recipe.required_skill_type)
    .single()

  const playerSkillLevel = skill?.level || 1

  if (playerSkillLevel < recipe.required_crafting_level) {
    return {
      data: null,
      error: new Error(`Requires ${recipe.required_skill_type} level ${recipe.required_crafting_level}`)
    }
  }

  // Check ingredients
  const { hasIngredients, missing, error: checkError } = await checkIngredients(characterId, recipeId)

  if (checkError || !hasIngredients) {
    return {
      data: null,
      error: checkError || new Error('Missing ingredients'),
      missing
    }
  }

  // Consume ingredients
  const { error: consumeError } = await consumeIngredients(
    characterId,
    recipe.ingredients as Record<string, number>
  )

  if (consumeError) {
    return { data: null, error: consumeError }
  }

  // Add crafted item to inventory
  const { data: craftedItem, error: addError } = await addItem(
    characterId,
    recipe.result_item_id,
    recipe.result_quantity
  )

  if (addError) {
    return { data: null, error: addError }
  }

  // Add crafting experience
  const { data: updatedSkill, leveledUp, newLevel } = await addSkillExperience(
    characterId,
    recipe.required_skill_type,
    recipe.experience_reward
  )

  return {
    data: {
      craftedItem,
      recipe,
      experienceGained: recipe.experience_reward,
      leveledUp,
      newLevel
    },
    error: null
  }
}

/**
 * Get recipes the character can craft right now (has ingredients)
 */
export async function getCraftableRecipes(characterId: string, skillType: CraftingSkillType) {
  const { data: recipes, error: recipesError } = await getAvailableRecipes(characterId, skillType)

  if (recipesError || !recipes) {
    return { data: null, error: recipesError }
  }

  const craftable: CraftingRecipe[] = []

  for (const recipe of recipes) {
    const { hasIngredients } = await checkIngredients(characterId, recipe.id)
    if (hasIngredients) {
      craftable.push(recipe)
    }
  }

  return { data: craftable, error: null }
}

/**
 * Get recipe with ingredient details (including material names and availability)
 */
export async function getRecipeWithDetails(characterId: string, recipeId: string) {
  const supabase = createClient()

  const { data: recipe, error: recipeError } = await getRecipeById(recipeId)

  if (recipeError || !recipe) {
    return { data: null, error: recipeError }
  }

  const { hasIngredients, missing } = await checkIngredients(characterId, recipeId)

  // Get material details
  const ingredients = recipe.ingredients as Record<string, number>
  const materialIds = Object.keys(ingredients)

  const { data: materials, error: matsError } = await supabase
    .from('materials')
    .select('id, name, type, rarity')
    .in('id', materialIds)

  if (matsError) {
    return { data: null, error: matsError }
  }

  // Get current inventory
  const { data: inventory, error: invError } = await supabase
    .from('inventory')
    .select('item_id, quantity')
    .eq('character_id', characterId)
    .in('item_id', materialIds)

  const ingredientDetails = materialIds.map(matId => {
    const material = materials?.find(m => m.id === matId)
    const inventoryItem = inventory?.find(i => i.item_id === matId)
    const required = ingredients[matId]
    const current = inventoryItem?.quantity || 0

    return {
      materialId: matId,
      name: material?.name || matId,
      type: material?.type,
      rarity: material?.rarity,
      required,
      current,
      hasEnough: current >= required
    }
  })

  return {
    data: {
      recipe,
      ingredientDetails,
      canCraft: hasIngredients,
      missing
    },
    error: null
  }
}
