'use client'

/**
 * Tool Crafting Component
 *
 * Allows players to craft new gathering tools using materials and gold
 */

import { useState, useEffect } from 'react'
import { useGameStore } from '@/lib/store'
import type { GatheringTool, Material } from '@/lib/supabase'

interface ToolRecipe {
  id: string
  tool_id: string
  required_level: number
  gold_cost: number
  tool: GatheringTool
  materials: Array<{
    material_id: string
    quantity: number
    material: Material
  }>
}

export default function ToolCrafting() {
  const { character, updateCharacterStats } = useGameStore()
  const [recipes, setRecipes] = useState<ToolRecipe[]>([])
  const [selectedRecipe, setSelectedRecipe] = useState<ToolRecipe | null>(null)
  const [playerMaterials, setPlayerMaterials] = useState<Map<string, number>>(new Map())
  const [isCrafting, setIsCrafting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [filter, setFilter] = useState<'all' | 'craftable' | 'locked'>('all')

  useEffect(() => {
    if (character) {
      loadData()
    }
  }, [character])

  async function loadData() {
    if (!character) return
    setIsLoading(true)

    try {
      const { createClient } = await import('@/utils/supabase/client')
      const supabase = createClient()

      // Load all recipes with tool and material details
      const { data: recipesData, error: recipesError } = await supabase
        .from('tool_recipes')
        .select(`
          *,
          tool:gathering_tools(*),
          materials:tool_recipe_materials(
            material_id,
            quantity,
            material:materials(*)
          )
        `)
        .order('required_level')

      if (!recipesError && recipesData) {
        setRecipes(recipesData as any)
      }

      // Load player's material inventory
      const { data: inventory, error: invError } = await supabase
        .from('inventory')
        .select('item_id, quantity')
        .eq('character_id', character.id)
        .eq('item_type', 'material')

      if (!invError && inventory) {
        const materials = new Map<string, number>()
        inventory.forEach(item => {
          materials.set(item.item_id, item.quantity)
        })
        setPlayerMaterials(materials)
      }
    } catch (err) {
      console.error('Error loading crafting data:', err)
    }

    setIsLoading(false)
  }

  async function craftTool(recipe: ToolRecipe) {
    if (!character || isCrafting) return

    // Check requirements
    if (character.gold < recipe.gold_cost) {
      setMessage({ type: 'error', text: `Not enough gold! Need ${recipe.gold_cost}g` })
      setTimeout(() => setMessage(null), 3000)
      return
    }

    // Check materials
    for (const mat of recipe.materials) {
      const playerAmount = playerMaterials.get(mat.material_id) || 0
      if (playerAmount < mat.quantity) {
        setMessage({
          type: 'error',
          text: `Not enough ${mat.material.name}! Need ${mat.quantity}, have ${playerAmount}`
        })
        setTimeout(() => setMessage(null), 3000)
        return
      }
    }

    setIsCrafting(true)

    try {
      const { createClient } = await import('@/utils/supabase/client')
      const supabase = createClient()

      // Deduct gold
      const { error: goldError } = await supabase
        .from('characters')
        .update({ gold: character.gold - recipe.gold_cost })
        .eq('id', character.id)

      if (goldError) throw goldError

      // Deduct materials
      for (const mat of recipe.materials) {
        const currentQty = playerMaterials.get(mat.material_id) || 0
        const newQty = currentQty - mat.quantity

        if (newQty === 0) {
          // Remove from inventory
          await supabase
            .from('inventory')
            .delete()
            .eq('character_id', character.id)
            .eq('item_id', mat.material_id)
        } else {
          // Update quantity
          await supabase
            .from('inventory')
            .update({ quantity: newQty })
            .eq('character_id', character.id)
            .eq('item_id', mat.material_id)
        }
      }

      // Add tool to inventory
      const { error: addError } = await supabase
        .from('inventory')
        .insert({
          character_id: character.id,
          item_id: recipe.tool_id,
          item_type: 'tool',
          quantity: 1,
          equipped: false
        })

      if (addError && addError.code === '23505') {
        // Tool already exists, increase quantity
        await supabase
          .from('inventory')
          .update({ quantity: supabase.raw('quantity + 1') })
          .eq('character_id', character.id)
          .eq('item_id', recipe.tool_id)
      }

      // Track crafted tool
      await supabase
        .from('character_crafted_tools')
        .insert({
          character_id: character.id,
          tool_id: recipe.tool_id
        })
        .select()

      // Refresh character data
      const { data: updatedChar } = await supabase
        .from('characters')
        .select('*')
        .eq('id', character.id)
        .single()

      if (updatedChar) {
        updateCharacterStats(updatedChar)
      }

      setMessage({ type: 'success', text: `Crafted ${recipe.tool.name}!` })
      await loadData() // Refresh materials
      setSelectedRecipe(null)

    } catch (err) {
      console.error('Error crafting tool:', err)
      setMessage({ type: 'error', text: 'Failed to craft tool' })
    }

    setIsCrafting(false)
    setTimeout(() => setMessage(null), 5000)
  }

  function canCraft(recipe: ToolRecipe): boolean {
    if (!character) return false
    if (character.gold < recipe.gold_cost) return false

    for (const mat of recipe.materials) {
      const playerAmount = playerMaterials.get(mat.material_id) || 0
      if (playerAmount < mat.quantity) return false
    }

    return true
  }

  function getToolTypeIcon(type: string): string {
    const icons: Record<string, string> = {
      'axe': '🪓',
      'pickaxe': '⛏️',
      'fishing_rod': '🎣',
      'hunting_knife': '🏹',
      'herbalism_sickle': '🌿',
      'divination_staff': '✨'
    }
    return icons[type] || '🔧'
  }

  function getTierColor(tier: number): string {
    const colors = ['text-gray-400', 'text-green-400', 'text-blue-400', 'text-purple-400', 'text-yellow-400']
    return colors[tier - 1] || 'text-white'
  }

  const filteredRecipes = recipes.filter(recipe => {
    if (filter === 'craftable') return canCraft(recipe)
    if (filter === 'locked') return recipe.required_level > (character?.level || 1)
    return true
  })

  if (isLoading) {
    return (
      <div className="text-center py-8 text-gray-400">
        <div className="w-12 h-12 border-4 border-amber-500/30 border-t-amber-500 rounded-full animate-spin mx-auto mb-4"></div>
        <p>Loading recipes...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white text-shadow">🔨 Tool Crafting</h2>
          <p className="text-sm text-gray-400 mt-1">Craft powerful tools to improve your gathering</p>
        </div>
        {character && (
          <div className="text-right">
            <p className="text-xs text-gray-500">Available Gold</p>
            <p className="text-lg font-bold text-amber-400">💰 {character.gold.toLocaleString()}g</p>
          </div>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 bg-gray-800/40 rounded-lg p-1">
        {(['all', 'craftable', 'locked'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`
              flex-1 px-4 py-2 rounded-lg font-semibold transition-all capitalize
              ${filter === tab
                ? 'bg-amber-500 text-black'
                : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
              }
            `}
          >
            {tab === 'all' && 'All Recipes'}
            {tab === 'craftable' && '✓ Craftable'}
            {tab === 'locked' && '🔒 Locked'}
          </button>
        ))}
      </div>

      {/* Success/Error Message */}
      {message && (
        <div className={`
          p-4 rounded-xl border-2 animate-pulse
          ${message.type === 'success'
            ? 'bg-green-900/20 border-green-500/50 text-green-400'
            : 'bg-red-900/20 border-red-500/50 text-red-400'
          }
        `}>
          {message.text}
        </div>
      )}

      {/* Recipe Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredRecipes.map(recipe => {
          const craftable = canCraft(recipe)
          const locked = recipe.required_level > (character?.level || 1)

          return (
            <button
              key={recipe.id}
              onClick={() => !locked && setSelectedRecipe(recipe)}
              disabled={locked || isCrafting}
              className={`
                panel p-4 text-left transition-all relative
                ${locked
                  ? 'opacity-50 cursor-not-allowed'
                  : selectedRecipe?.id === recipe.id
                  ? 'ring-2 ring-amber-500 scale-[1.02]'
                  : 'hover:ring-1 hover:ring-white/30 cursor-pointer'
                }
                ${craftable && !locked ? 'bg-gradient-to-br from-green-900/10 to-transparent' : ''}
              `}
            >
              {/* Craftable Badge */}
              {craftable && !locked && (
                <div className="absolute top-2 right-2">
                  <span className="badge badge-success text-xs">✓ Can Craft</span>
                </div>
              )}

              {/* Tool Header */}
              <div className="flex items-center gap-3 mb-3">
                <div className="text-3xl">{getToolTypeIcon(recipe.tool.tool_type)}</div>
                <div>
                  <h3 className="font-bold text-white">{recipe.tool.name}</h3>
                  <p className={`text-sm ${getTierColor(recipe.tool.tier)}`}>
                    Tier {recipe.tool.tier}
                  </p>
                </div>
              </div>

              {/* Tool Stats */}
              <div className="flex gap-4 text-xs mb-3">
                <span className="text-blue-400">⚡ {recipe.tool.gathering_power}x Speed</span>
                <span className="text-green-400">💎 {(recipe.tool.bonus_yield_chance * 100).toFixed(0)}% Bonus</span>
              </div>

              {/* Requirements */}
              <div className="space-y-2 pt-3 border-t border-white/10">
                {/* Level Requirement */}
                {locked && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">Required Level</span>
                    <span className="text-red-400 font-semibold">Lv.{recipe.required_level}</span>
                  </div>
                )}

                {/* Gold Cost */}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Gold Cost</span>
                  <span className={character && character.gold >= recipe.gold_cost ? 'text-amber-400' : 'text-red-400'}>
                    💰 {recipe.gold_cost}g
                  </span>
                </div>

                {/* Materials */}
                {recipe.materials.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs text-gray-400">Materials:</p>
                    {recipe.materials.map(mat => {
                      const playerAmount = playerMaterials.get(mat.material_id) || 0
                      const hasEnough = playerAmount >= mat.quantity

                      return (
                        <div key={mat.material_id} className="flex items-center justify-between text-xs">
                          <span className="text-gray-300">{mat.material.name}</span>
                          <span className={hasEnough ? 'text-green-400' : 'text-red-400'}>
                            {playerAmount}/{mat.quantity}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </button>
          )
        })}
      </div>

      {/* Craft Modal */}
      {selectedRecipe && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80" onClick={() => setSelectedRecipe(null)} />
          <div className="relative panel p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-white mb-4">
              Craft {selectedRecipe.tool.name}?
            </h3>
            <div className="space-y-4">
              <div className="text-sm text-gray-300">
                This will consume:
                <ul className="mt-2 space-y-1">
                  <li>• {selectedRecipe.gold_cost} gold</li>
                  {selectedRecipe.materials.map(mat => (
                    <li key={mat.material_id}>
                      • {mat.quantity}x {mat.material.name}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => craftTool(selectedRecipe)}
                  disabled={isCrafting || !canCraft(selectedRecipe)}
                  className="btn btn-primary flex-1"
                >
                  {isCrafting ? 'Crafting...' : 'Craft Tool'}
                </button>
                <button
                  onClick={() => setSelectedRecipe(null)}
                  className="btn btn-secondary flex-1"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}