/**
 * Crafting System
 *
 * Handles crafting recipes, ingredient checking, and item creation.
 * Now includes cross-system bonus integration from exploration landmarks!
 */

import { createClient } from '@/utils/supabase/client'
import { CraftingRecipe, CraftingSkillType } from './supabase'
import { addItem } from './inventory'
import { trackQuestProgress } from './quests'
import { getCraftingBonuses, applyCraftingBonuses } from './bonuses'
import { applyZoneCraftingModifiers } from './zone-modifiers'

/**
 * Stub function for skill experience (gathering system removed)
 */
async function addSkillExperience(characterId: string, skillType: string, xp: number) {
  // Gathering system removed - this is a no-op stub
  return { data: null, error: null, leveledUp: false }
}

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

  // Get crafting bonuses from discovered landmarks
  const { data: bonuses } = await getCraftingBonuses(characterId)
  const landmarkBonuses = bonuses || { quality_bonus: 0, speed_bonus: 0, cost_reduction: 0 }

  // Get zone crafting modifiers
  const { data: zoneModifiers } = await applyZoneCraftingModifiers(
    characterId,
    recipe.required_skill_type,
    1.0, // Base success rate (100%)
    100  // Base cost (doesn't matter, we'll use the modifier percentage)
  )

  // Combine landmark and zone bonuses
  const totalCostReduction = landmarkBonuses.cost_reduction + (zoneModifiers ? (100 - zoneModifiers.modified_cost) / 100 : 0)
  const totalQualityBonus = landmarkBonuses.quality_bonus + (zoneModifiers?.quality_bonus || 0)

  // Check ingredients
  const { hasIngredients, missing, error: checkError } = await checkIngredients(characterId, recipeId)

  if (checkError || !hasIngredients) {
    return {
      data: null,
      error: checkError || new Error('Missing ingredients'),
      missing
    }
  }

  // Apply cost reduction bonus to ingredients (combining landmark + zone bonuses)
  const adjustedIngredients: Record<string, number> = {}
  const originalIngredients = recipe.ingredients as Record<string, number>

  for (const [materialId, quantity] of Object.entries(originalIngredients)) {
    // Apply combined cost reduction (minimum 1 per ingredient)
    const reducedCost = Math.max(1, Math.floor(quantity * (1 - totalCostReduction)))
    adjustedIngredients[materialId] = reducedCost
  }

  // Consume ingredients (with cost reduction applied!)
  const { error: consumeError } = await consumeIngredients(
    characterId,
    adjustedIngredients
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
      newLevel,
      bonusesApplied: {
        landmark: landmarkBonuses,
        zone: zoneModifiers,
        totalCostReduction,
        totalQualityBonus
      },
      materialsSaved: Object.entries(originalIngredients).reduce((total, [materialId, origQty]) => {
        return total + (origQty - (adjustedIngredients[materialId] || 0))
      }, 0)
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

/**
 * Calculate maximum craftable quantity based on available ingredients
 */
export async function getMaxCraftableAmount(characterId: string, recipeId: string): Promise<number> {
  const supabase = createClient()

  const { data: recipe, error: recipeError } = await getRecipeById(recipeId)
  if (recipeError || !recipe) return 0

  const ingredients = recipe.ingredients as Record<string, number>

  // Get character's inventory
  const { data: inventory, error: invError } = await supabase
    .from('inventory')
    .select('item_id, quantity')
    .eq('character_id', characterId)

  if (invError || !inventory) return 0

  let maxCraftable = Infinity

  for (const [materialId, requiredPerCraft] of Object.entries(ingredients)) {
    const inventoryItem = inventory.find(item => item.item_id === materialId)
    const currentQuantity = inventoryItem?.quantity || 0
    const possibleCrafts = Math.floor(currentQuantity / requiredPerCraft)
    maxCraftable = Math.min(maxCraftable, possibleCrafts)
  }

  return maxCraftable === Infinity ? 0 : maxCraftable
}

/**
 * Start a crafting session
 */
export async function startCraftingSession(
  characterId: string,
  recipeId: string,
  quantity: number = 1,
  isAuto: boolean = false
) {
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

  // Check if can craft requested quantity
  const maxCraftable = await getMaxCraftableAmount(characterId, recipeId)
  if (maxCraftable < quantity) {
    return {
      data: null,
      error: new Error(`Not enough ingredients. Can only craft ${maxCraftable}x`)
    }
  }

  // Calculate completion time
  const totalCraftingTime = recipe.crafting_time_ms * quantity
  const estimatedCompletion = new Date(Date.now() + totalCraftingTime)

  // Check if already crafting
  const { data: existingSession, error: checkError } = await supabase
    .from('active_crafting')
    .select('*')
    .eq('character_id', characterId)
    .maybeSingle()

  if (existingSession) {
    return { data: null, error: new Error('Already crafting something') }
  }

  // Create crafting session
  const { data: session, error: sessionError } = await supabase
    .from('active_crafting')
    .insert({
      character_id: characterId,
      recipe_id: recipeId,
      estimated_completion: estimatedCompletion.toISOString(),
      quantity_goal: quantity,
      quantity_crafted: 0,
      is_auto: isAuto
    })
    .select()
    .single()

  if (sessionError) {
    return { data: null, error: sessionError }
  }

  return { data: session, error: null }
}

/**
 * Process active crafting session and complete crafts
 */
export async function processCrafting(characterId: string) {
  const supabase = createClient()

  // Get active session
  const { data: session, error: sessionError } = await supabase
    .from('active_crafting')
    .select('*')
    .eq('character_id', characterId)
    .maybeSingle()

  if (sessionError || !session) {
    return { data: null, error: sessionError }
  }

  // Get recipe
  const { data: recipe, error: recipeError } = await getRecipeById(session.recipe_id)
  if (recipeError || !recipe) {
    return { data: null, error: recipeError }
  }

  const now = Date.now()
  const startedAt = new Date(session.started_at).getTime()
  const timeElapsed = now - startedAt
  const craftTime = recipe.crafting_time_ms

  // Calculate how many items should be crafted by now
  const shouldHaveCrafted = Math.floor(timeElapsed / craftTime)
  const actuallyNeedToCraft = Math.min(shouldHaveCrafted, session.quantity_goal) - session.quantity_crafted

  if (actuallyNeedToCraft <= 0) {
    // No new crafts to complete
    return { data: session, error: null }
  }

  // Craft each item
  for (let i = 0; i < actuallyNeedToCraft; i++) {
    // Check ingredients for this craft
    const { hasIngredients } = await checkIngredients(characterId, session.recipe_id)

    if (!hasIngredients) {
      // Out of ingredients - stop session
      await supabase
        .from('active_crafting')
        .delete()
        .eq('character_id', characterId)

      return {
        data: null,
        error: new Error('Ran out of ingredients')
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

    // Add crafted item
    await addItem(characterId, recipe.result_item_id, recipe.result_quantity)

    // Add experience
    await addSkillExperience(characterId, recipe.required_skill_type, recipe.experience_reward)

    // Track quest progress for craft quests
    await trackQuestProgress(characterId, 'craft', {
      targetId: recipe.result_item_id,
      amount: 1
    })

    // Update session
    const newQuantityCrafted = session.quantity_crafted + 1

    if (newQuantityCrafted >= session.quantity_goal) {
      // Session complete
      if (session.is_auto) {
        // Auto-craft: check if we can restart
        const maxCraftable = await getMaxCraftableAmount(characterId, session.recipe_id)
        if (maxCraftable > 0) {
          // Restart with same quantity
          const restartQuantity = Math.min(maxCraftable, session.quantity_goal)
          const totalTime = recipe.crafting_time_ms * restartQuantity
          const newCompletion = new Date(Date.now() + totalTime)

          await supabase
            .from('active_crafting')
            .update({
              quantity_crafted: 0,
              quantity_goal: restartQuantity,
              estimated_completion: newCompletion.toISOString(),
              started_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('character_id', characterId)
        } else {
          // No more ingredients - stop
          await supabase
            .from('active_crafting')
            .delete()
            .eq('character_id', characterId)
        }
      } else {
        // Manual crafting - delete session
        await supabase
          .from('active_crafting')
          .delete()
          .eq('character_id', characterId)
      }
    } else {
      // Update progress
      await supabase
        .from('active_crafting')
        .update({
          quantity_crafted: newQuantityCrafted,
          updated_at: new Date().toISOString()
        })
        .eq('character_id', characterId)
    }
  }

  // Get updated session
  const { data: updatedSession } = await supabase
    .from('active_crafting')
    .select('*')
    .eq('character_id', characterId)
    .maybeSingle()

  return { data: updatedSession, error: null }
}

/**
 * Cancel active crafting session
 */
export async function cancelCrafting(characterId: string) {
  const supabase = createClient()

  const { error } = await supabase
    .from('active_crafting')
    .delete()
    .eq('character_id', characterId)

  return { error }
}

/**
 * Get active crafting session for character
 */
export async function getActiveCraftingSession(characterId: string) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('active_crafting')
    .select('*')
    .eq('character_id', characterId)
    .maybeSingle()

  return { data, error }
}
