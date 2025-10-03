'use client'

import { useState, useEffect } from 'react'
import { useGameStore } from '@/lib/store'
import { getRecipesBySkill, getRecipeWithDetails, startCraftingSession, processCrafting, cancelCrafting, getActiveCraftingSession, getMaxCraftableAmount } from '@/lib/crafting'
import { CraftingRecipe, CraftingSkillType, ActiveCrafting } from '@/lib/supabase'

type RecipeWithDetails = {
  recipe: CraftingRecipe
  ingredientDetails: Array<{
    materialId: string
    name: string
    type?: string
    rarity?: string
    required: number
    current: number
    hasEnough: boolean
  }>
  canCraft: boolean
  missing: Array<{ materialId: string; needed: number; has: number }>
}

type FilterOption = 'all' | 'weapon' | 'armor' | 'consumable' | 'general'
type SortOption = 'level' | 'name' | 'craftable'

export default function CraftingPanel() {
  const { character } = useGameStore()

  const [selectedSkill, setSelectedSkill] = useState<CraftingSkillType>('crafting')
  const [recipes, setRecipes] = useState<CraftingRecipe[]>([])
  const [selectedRecipe, setSelectedRecipe] = useState<RecipeWithDetails | null>(null)
  const [activeSession, setActiveSession] = useState<ActiveCrafting | null>(null)

  const [filterBy, setFilterBy] = useState<FilterOption>('all')
  const [sortBy, setSortBy] = useState<SortOption>('level')
  const [searchQuery, setSearchQuery] = useState('')

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [skillLevel, setSkillLevel] = useState(1)
  const [skillXP, setSkillXP] = useState(0)

  // Load recipes for selected skill
  useEffect(() => {
    if (!character) return

    async function loadRecipes() {
      setIsLoading(true)
      const { data, error: err } = await getRecipesBySkill(selectedSkill)
      if (err) {
        setError(err.message)
      } else {
        setRecipes(data || [])
      }
      setIsLoading(false)
    }

    loadRecipes()
  }, [character, selectedSkill])

  // Load skill level
  useEffect(() => {
    if (!character) return

    async function loadSkillLevel() {
      const supabase = (await import('@/utils/supabase/client')).createClient()
      const { data } = await supabase
        .from('character_skills')
        .select('level, experience')
        .eq('character_id', character.id)
        .eq('skill_type', selectedSkill)
        .single()

      if (data) {
        setSkillLevel(data.level)
        setSkillXP(data.experience)
      }
    }

    loadSkillLevel()
  }, [character, selectedSkill])

  // Poll active session
  useEffect(() => {
    if (!character) return

    async function checkSession() {
      const { data } = await getActiveCraftingSession(character.id)
      setActiveSession(data)

      if (data) {
        // Process crafting
        await processCrafting(character.id)
      }
    }

    checkSession()
    const interval = setInterval(checkSession, 1000)
    return () => clearInterval(interval)
  }, [character])

  // Select recipe and load details
  async function handleSelectRecipe(recipe: CraftingRecipe) {
    if (!character) return

    const { data, error: err } = await getRecipeWithDetails(character.id, recipe.id)
    if (err) {
      setError(err.message)
    } else {
      setSelectedRecipe(data)
    }
  }

  // Start crafting
  async function handleCraft(quantity: number, isAuto: boolean = false) {
    if (!character || !selectedRecipe) return

    setIsLoading(true)
    setError('')

    const { error: err } = await startCraftingSession(
      character.id,
      selectedRecipe.recipe.id,
      quantity,
      isAuto
    )

    if (err) {
      setError(err.message)
    } else {
      const { data } = await getActiveCraftingSession(character.id)
      setActiveSession(data)
    }

    setIsLoading(false)
  }

  // Cancel crafting
  async function handleCancel() {
    if (!character) return

    const { error: err } = await cancelCrafting(character.id)
    if (err) {
      setError(err.message)
    } else {
      setActiveSession(null)
    }
  }

  // Filter and sort recipes
  function getFilteredRecipes() {
    let filtered = recipes

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(r =>
        r.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // Category filter
    if (filterBy !== 'all') {
      filtered = filtered.filter(r => r.recipe_category === filterBy)
    }

    // Sort
    filtered = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'level':
          return a.required_crafting_level - b.required_crafting_level
        case 'name':
          return a.name.localeCompare(b.name)
        case 'craftable':
          // Would need to check ingredients - simplified for now
          return a.required_crafting_level - b.required_crafting_level
        default:
          return 0
      }
    })

    return filtered
  }

  // Get rarity color
  function getRarityColor(rarity?: string) {
    switch (rarity) {
      case 'common': return 'text-gray-400'
      case 'uncommon': return 'text-green-400'
      case 'rare': return 'text-blue-400'
      case 'epic': return 'text-purple-400'
      case 'legendary': return 'text-yellow-400'
      default: return 'text-white'
    }
  }

  function getRarityBorder(rarity?: string) {
    switch (rarity) {
      case 'common': return 'border-gray-500/50'
      case 'uncommon': return 'border-green-500/50'
      case 'rare': return 'border-blue-500/50'
      case 'epic': return 'border-purple-500/50'
      case 'legendary': return 'border-yellow-500/50'
      default: return 'border-white/10'
    }
  }

  // Calculate XP to next level
  const xpForNextLevel = skillLevel * 100
  const xpProgress = (skillXP / xpForNextLevel) * 100

  // Calculate crafting progress
  let craftingProgress = 0
  let timeRemaining = ''
  if (activeSession && selectedRecipe) {
    const elapsed = Date.now() - new Date(activeSession.started_at).getTime()
    const total = selectedRecipe.recipe.crafting_time_ms * activeSession.quantity_goal
    craftingProgress = Math.min((elapsed / total) * 100, 100)

    const remaining = Math.max(0, total - elapsed)
    const seconds = Math.floor(remaining / 1000)
    timeRemaining = `${seconds}s remaining`
  }

  if (!character) return null

  const filteredRecipes = getFilteredRecipes()

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Left Sidebar - Skill Info */}
      <div className="lg:col-span-3 space-y-4">
        {/* Skill Selector */}
        <div className="panel p-4">
          <h3 className="text-lg font-bold text-primary mb-3">Crafting Skills</h3>
          <div className="space-y-2">
            <button
              onClick={() => setSelectedSkill('crafting')}
              className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                selectedSkill === 'crafting' ? 'bg-amber-500/20 text-amber-400' : 'hover:bg-white/5'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold">🔨 Crafting</span>
                {selectedSkill === 'crafting' && <span className="text-xs">Lv. {skillLevel}</span>}
              </div>
            </button>
            <button
              onClick={() => setSelectedSkill('alchemy')}
              className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                selectedSkill === 'alchemy' ? 'bg-amber-500/20 text-amber-400' : 'hover:bg-white/5'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold">🧪 Alchemy</span>
                {selectedSkill === 'alchemy' && <span className="text-xs">Lv. {skillLevel}</span>}
              </div>
            </button>
          </div>
        </div>

        {/* Skill Progress */}
        <div className="panel p-4">
          <h4 className="font-bold text-white mb-2">{selectedSkill === 'crafting' ? '🔨 Crafting' : '🧪 Alchemy'}</h4>
          <div className="mb-1 flex justify-between text-sm">
            <span className="text-gray-400">Level {skillLevel}</span>
            <span className="text-gray-400">{skillXP.toLocaleString()} / {xpForNextLevel.toLocaleString()} XP</span>
          </div>
          <div className="progress-bar h-3">
            <div
              className="progress-fill bg-gradient-to-r from-amber-500 to-amber-600"
              style={{ width: `${xpProgress}%` }}
            />
          </div>
        </div>

        {/* Filters */}
        <div className="panel p-4">
          <h4 className="font-bold text-white mb-3">Filter</h4>
          <div className="space-y-2">
            {[
              { value: 'all', label: 'All Recipes', icon: '📜' },
              { value: 'weapon', label: 'Weapons', icon: '⚔️' },
              { value: 'armor', label: 'Armor', icon: '🛡️' },
              { value: 'consumable', label: 'Consumables', icon: '🧪' },
              { value: 'general', label: 'Materials', icon: '📦' }
            ].map(({ value, label, icon }) => (
              <button
                key={value}
                onClick={() => setFilterBy(value as FilterOption)}
                className={`w-full text-left px-3 py-1.5 rounded text-sm transition-colors ${
                  filterBy === value ? 'bg-amber-500/20 text-amber-400' : 'text-gray-400 hover:bg-white/5'
                }`}
              >
                {icon} {label}
              </button>
            ))}
          </div>
        </div>

        {/* Sort */}
        <div className="panel p-4">
          <h4 className="font-bold text-white mb-3">Sort By</h4>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="w-full bg-bg-card border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500/50"
          >
            <option value="level">Level Required</option>
            <option value="name">Name</option>
          </select>
        </div>
      </div>

      {/* Middle - Recipe Browser */}
      <div className="lg:col-span-6 space-y-4">
        {/* Search */}
        <div className="panel p-4">
          <input
            type="text"
            placeholder="Search recipes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-bg-card border border-white/10 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50"
          />
        </div>

        {/* Recipes List */}
        <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
          {isLoading ? (
            <div className="text-center py-10">
              <div className="w-12 h-12 border-4 border-amber-500/30 border-t-amber-500 rounded-full animate-spin mx-auto"></div>
            </div>
          ) : filteredRecipes.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              No recipes found for {selectedSkill}
            </div>
          ) : (
            filteredRecipes.map((recipe) => {
              const isLocked = recipe.required_crafting_level > skillLevel
              const isSelected = selectedRecipe?.recipe.id === recipe.id

              return (
                <button
                  key={recipe.id}
                  onClick={() => !isLocked && handleSelectRecipe(recipe)}
                  disabled={isLocked}
                  className={`w-full text-left panel p-4 transition-all ${
                    isSelected ? 'ring-2 ring-amber-500 scale-[1.02]' : 'hover:scale-[1.01]'
                  } ${isLocked ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="text-3xl">
                      {recipe.recipe_category === 'weapon' && '⚔️'}
                      {recipe.recipe_category === 'armor' && '🛡️'}
                      {recipe.recipe_category === 'consumable' && '🧪'}
                      {recipe.recipe_category === 'general' && '📦'}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-bold text-white">{recipe.name}</h4>
                        {isLocked && <span className="text-xs text-red-400">🔒 Lv. {recipe.required_crafting_level}</span>}
                      </div>
                      <p className="text-sm text-gray-400 mb-2">{recipe.description}</p>
                      <div className="flex items-center gap-3 text-xs">
                        <span className="text-gray-500">⏱️ {(recipe.crafting_time_ms / 1000).toFixed(1)}s</span>
                        <span className="text-purple-400">✨ {recipe.experience_reward} XP</span>
                      </div>
                    </div>
                  </div>
                </button>
              )
            })
          )}
        </div>
      </div>

      {/* Right Sidebar - Recipe Details & Active Crafting */}
      <div className="lg:col-span-3 space-y-4">
        {/* Active Crafting Session */}
        {activeSession && selectedRecipe && (
          <div className="panel p-4 border-2 border-amber-500/30">
            <h4 className="font-bold text-amber-400 mb-3">🔨 Crafting...</h4>
            <div className="mb-3">
              <p className="text-sm text-white font-semibold mb-1">{selectedRecipe.recipe.name}</p>
              <p className="text-xs text-gray-400">{activeSession.quantity_crafted} / {activeSession.quantity_goal} completed</p>
            </div>
            <div className="progress-bar h-4 mb-2">
              <div
                className="progress-fill bg-gradient-to-r from-amber-500 to-amber-600"
                style={{ width: `${craftingProgress}%` }}
              />
            </div>
            <p className="text-xs text-gray-400 mb-3">{timeRemaining}</p>
            {activeSession.is_auto && (
              <div className="text-xs text-green-400 mb-3">🔄 Auto-Craft Active</div>
            )}
            <button
              onClick={handleCancel}
              className="w-full btn btn-danger text-sm py-1.5"
            >
              Cancel
            </button>
          </div>
        )}

        {/* Recipe Details */}
        {selectedRecipe ? (
          <div className="panel p-4">
            <h4 className="font-bold text-white mb-3">Recipe Details</h4>

            {/* Result Item */}
            <div className="bg-bg-card rounded-lg p-3 mb-4">
              <p className="text-xs text-gray-400 mb-1">Creates:</p>
              <p className="font-bold text-white">{selectedRecipe.recipe.name}</p>
              <p className="text-xs text-gray-400">Quantity: {selectedRecipe.recipe.result_quantity}</p>
            </div>

            {/* Ingredients */}
            <div className="mb-4">
              <h5 className="text-sm font-bold text-gray-300 mb-2">Required Materials:</h5>
              <div className="space-y-2">
                {selectedRecipe.ingredientDetails.map((ing) => (
                  <div
                    key={ing.materialId}
                    className={`flex items-center justify-between text-sm p-2 rounded ${
                      ing.hasEnough ? 'bg-green-900/20' : 'bg-red-900/20'
                    }`}
                  >
                    <span className={ing.hasEnough ? 'text-green-400' : 'text-red-400'}>
                      {ing.name}
                    </span>
                    <span className={ing.hasEnough ? 'text-green-400' : 'text-red-400'}>
                      {ing.current} / {ing.required}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Craft Buttons */}
            {!activeSession && (
              <div className="space-y-2">
                <button
                  onClick={() => handleCraft(1)}
                  disabled={!selectedRecipe.canCraft || isLoading}
                  className="w-full btn btn-primary"
                >
                  Craft x1
                </button>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleCraft(5)}
                    disabled={!selectedRecipe.canCraft || isLoading}
                    className="btn btn-secondary"
                  >
                    Craft x5
                  </button>
                  <button
                    onClick={() => handleCraft(10)}
                    disabled={!selectedRecipe.canCraft || isLoading}
                    className="btn btn-secondary"
                  >
                    Craft x10
                  </button>
                </div>
                <button
                  onClick={() => handleCraft(1, true)}
                  disabled={!selectedRecipe.canCraft || isLoading}
                  className="w-full btn bg-green-600 hover:bg-green-700"
                >
                  🔄 Auto-Craft
                </button>
              </div>
            )}

            {error && (
              <div className="mt-3 text-xs text-red-400 bg-red-900/20 p-2 rounded">
                {error}
              </div>
            )}
          </div>
        ) : (
          <div className="panel p-4 text-center text-gray-400">
            <div className="text-4xl mb-3">🔨</div>
            <p className="text-sm">Select a recipe to view details</p>
          </div>
        )}
      </div>
    </div>
  )
}
