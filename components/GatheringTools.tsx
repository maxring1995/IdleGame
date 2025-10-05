'use client'

/**
 * Gathering Tools Component
 *
 * Displays and manages gathering tool equipment slots, durability, and repairs
 * Integrated into the Inventory/Character screen
 */

import { useState, useEffect } from 'react'
import { useGameStore } from '@/lib/store'
import {
  getAllTools,
  getCharacterEquippedTools,
  equipTool,
  unequipTool,
  repairTool
} from '@/app/actions/gatheringTools'
import { TOOL_TYPE_LABELS, getRepairCost, isToolBroken, needsRepair, type ToolSlot, type ToolType } from '@/lib/gatheringToolTypes'
import type { GatheringTool, CharacterEquippedTools } from '@/lib/supabase'
import ToolCrafting from './ToolCrafting'

interface EquippedToolsWithDetails extends CharacterEquippedTools {
  tools: Record<ToolSlot, GatheringTool | null>
}

export default function GatheringTools() {
  const { character, updateCharacterStats } = useGameStore()
  const [equippedTools, setEquippedTools] = useState<EquippedToolsWithDetails | null>(null)
  const [allTools, setAllTools] = useState<GatheringTool[]>([])
  const [selectedSlot, setSelectedSlot] = useState<ToolSlot | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isEquipping, setIsEquipping] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [showCrafting, setShowCrafting] = useState(false)

  const toolSlots: ToolSlot[] = [
    'axe_id',
    'pickaxe_id',
    'fishing_rod_id',
    'hunting_knife_id',
    'herbalism_sickle_id',
    'divination_staff_id'
  ]

  useEffect(() => {
    if (character) {
      loadData()
    }
  }, [character])

  async function loadData() {
    if (!character) return

    setIsLoading(true)

    // Load equipped tools
    const equippedResult = await getCharacterEquippedTools(character.id)
    if (equippedResult.success && equippedResult.equipped) {
      setEquippedTools(equippedResult.equipped as EquippedToolsWithDetails)
    }

    // Load all available tools
    const toolsResult = await getAllTools()
    if (toolsResult.success && toolsResult.tools) {
      setAllTools(toolsResult.tools)
    }

    setIsLoading(false)
  }

  async function handleEquipTool(toolId: string) {
    if (!character) return

    setIsEquipping(true)
    const result = await equipTool(character.id, toolId)

    if (result.success) {
      setMessage({ type: 'success', text: 'Tool equipped successfully!' })
      await loadData()
      setSelectedSlot(null)
    } else {
      setMessage({ type: 'error', text: result.error || 'Failed to equip tool' })
    }

    setIsEquipping(false)
    setTimeout(() => setMessage(null), 3000)
  }

  async function handleUnequipTool(slot: ToolSlot) {
    if (!character) return

    setIsEquipping(true)
    const result = await unequipTool(character.id, slot)

    if (result.success) {
      setMessage({ type: 'success', text: 'Tool unequipped!' })
      await loadData()
    } else {
      setMessage({ type: 'error', text: result.error || 'Failed to unequip tool' })
    }

    setIsEquipping(false)
    setTimeout(() => setMessage(null), 3000)
  }

  async function handleRepairTool(slot: ToolSlot, tier: number) {
    if (!character) return

    const cost = getRepairCost(tier)

    if (character.gold < cost) {
      setMessage({ type: 'error', text: `Not enough gold! Repair costs ${cost}g` })
      setTimeout(() => setMessage(null), 3000)
      return
    }

    setIsEquipping(true)
    const result = await repairTool(character.id, slot, tier)

    if (result.success) {
      setMessage({ type: 'success', text: `Tool repaired for ${cost}g!` })
      await loadData()

      // Update character gold in store
      const { createClient } = await import('@/utils/supabase/client')
      const supabase = createClient()
      const { data: updatedChar } = await supabase
        .from('characters')
        .select('*')
        .eq('id', character.id)
        .single()

      if (updatedChar) {
        updateCharacterStats(updatedChar)
      }
    } else {
      setMessage({ type: 'error', text: result.error || 'Failed to repair tool' })
    }

    setIsEquipping(false)
    setTimeout(() => setMessage(null), 3000)
  }

  function getDurabilityColor(durability: number): string {
    if (durability <= 0) return 'text-red-500'
    if (durability <= 25) return 'text-orange-500'
    if (durability <= 50) return 'text-yellow-500'
    return 'text-green-500'
  }

  function getDurabilityBarColor(durability: number): string {
    if (durability <= 0) return 'bg-red-600'
    if (durability <= 25) return 'bg-orange-500'
    if (durability <= 50) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  function getToolsForSlot(slot: ToolSlot): GatheringTool[] {
    const toolType = slot.replace('_id', '') as ToolType
    return allTools.filter(tool => tool.tool_type === toolType)
  }

  function getToolTierBadge(tier: number): string {
    const tierNames = ['Bronze', 'Iron', 'Steel', 'Mithril', 'Dragon']
    const tierColors = [
      'badge-common',
      'badge-uncommon',
      'badge-rare',
      'badge-epic',
      'badge-legendary'
    ]
    return tierColors[tier - 1] || 'badge-common'
  }

  function getToolTierName(tier: number): string {
    const tierNames = ['Bronze', 'Iron', 'Steel', 'Mithril', 'Dragon']
    return tierNames[tier - 1] || 'Unknown'
  }

  function getDurabilityReduction(tier: number): number {
    // Higher tier tools lose durability slower
    const reductions = [5, 4, 3, 2, 1] // Bronze loses 5, Dragon loses 1
    return reductions[tier - 1] || 5
  }

  if (isLoading) {
    return (
      <div className="text-center py-8 text-gray-400">
        <div className="w-12 h-12 border-4 border-amber-500/30 border-t-amber-500 rounded-full animate-spin mx-auto mb-4"></div>
        <p>Loading tools...</p>
      </div>
    )
  }

  if (!equippedTools) {
    return (
      <div className="text-center py-8 text-red-400">
        <p>Failed to load equipped tools</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white text-shadow">⚒️ Gathering Tools</h2>
          <p className="text-sm text-gray-400 mt-1">Equip tools to improve your gathering efficiency</p>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowCrafting(true)}
            className="btn btn-primary flex items-center gap-2"
          >
            <span>🔨</span>
            <span>Craft Tools</span>
          </button>
          {character && (
            <div className="text-right">
              <p className="text-xs text-gray-500">Gold</p>
              <p className="text-lg font-bold text-amber-400">💰 {character.gold.toLocaleString()}g</p>
            </div>
          )}
        </div>
      </div>

      {/* Success/Error Message */}
      {message && (
        <div className={`
          p-4 rounded-xl border-2 animate-pulse
          ${message.type === 'success' ? 'bg-green-900/20 border-green-500/50 text-green-400' : 'bg-red-900/20 border-red-500/50 text-red-400'}
        `}>
          {message.text}
        </div>
      )}

      {/* Tool Slots Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {toolSlots.map(slot => {
          const toolType = slot.replace('_id', '') as ToolType
          const equippedTool = equippedTools.tools[slot]
          const durabilityField = `${slot.replace('_id', '_durability')}` as keyof CharacterEquippedTools
          const durability = equippedTools[durabilityField] as number
          const broken = isToolBroken(durability)
          const needsRepairNow = needsRepair(durability)

          return (
            <div
              key={slot}
              className={`
                card p-4 border-2 transition-all
                ${selectedSlot === slot ? 'border-amber-500 ring-2 ring-amber-500/50' : 'border-white/10'}
                ${broken ? 'bg-red-900/10' : needsRepairNow ? 'bg-orange-900/10' : ''}
              `}
            >
              {/* Slot Header */}
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-bold text-white">{TOOL_TYPE_LABELS[toolType]}</h3>
                <div className="flex items-center gap-2">
                  {broken && (
                    <span className="badge badge-danger animate-pulse">BROKEN</span>
                  )}
                  {!broken && needsRepairNow && (
                    <span className="badge badge-warning">REPAIR</span>
                  )}
                  {equippedTool && (
                    <span className={`badge ${getToolTierBadge(equippedTool.tier)}`}>
                      {getToolTierName(equippedTool.tier)}
                    </span>
                  )}
                </div>
              </div>

              {/* Equipped Tool Display */}
              {equippedTool ? (
                <div className="space-y-3">
                  {/* Tool Info */}
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-semibold text-white">{equippedTool.name}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs">
                        <span className="text-blue-400">⚡ {equippedTool.gathering_power}x Speed</span>
                        <span className="text-green-400">💎 {(equippedTool.bonus_yield_chance * 100).toFixed(0)}% Bonus</span>
                      </div>
                    </div>
                  </div>

                  {/* Enhanced Durability Display */}
                  <div className="bg-gray-800/40 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-white flex items-center gap-1">
                        <span>🔧</span> Durability
                      </span>
                      <span className={`text-sm font-bold ${getDurabilityColor(durability)}`}>
                        {durability}/100
                      </span>
                    </div>
                    <div className="progress-bar h-3 mb-2">
                      <div
                        className={`progress-fill ${getDurabilityBarColor(durability)} transition-all duration-300`}
                        style={{ width: `${durability}%` }}
                      ></div>
                    </div>
                    {durability < 100 && (
                      <div className="text-xs text-gray-400">
                        Each use reduces durability by {getDurabilityReduction(equippedTool.tier)} point{getDurabilityReduction(equippedTool.tier) !== 1 ? 's' : ''}
                      </div>
                    )}
                  </div>

                  {/* Warning Messages */}
                  {broken && (
                    <div className="text-xs text-red-400 bg-red-900/20 border border-red-500/30 rounded-lg p-2">
                      ⚠️ Tool is broken! Repair to regain bonuses.
                    </div>
                  )}
                  {needsRepairNow && !broken && (
                    <div className="text-xs text-orange-400 bg-orange-900/20 border border-orange-500/30 rounded-lg p-2">
                      ⚠️ Tool durability low. Consider repairing soon.
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleUnequipTool(slot)}
                      disabled={isEquipping}
                      className="btn btn-secondary flex-1 text-sm"
                    >
                      Unequip
                    </button>
                    {durability < 100 && (
                      <button
                        onClick={() => handleRepairTool(slot, equippedTool.tier)}
                        disabled={isEquipping || (character?.gold ?? 0) < getRepairCost(equippedTool.tier)}
                        className={`
                          flex-1 text-sm font-semibold rounded-lg px-3 py-2 transition-all
                          ${broken
                            ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse'
                            : needsRepairNow
                            ? 'bg-orange-500 hover:bg-orange-600 text-white'
                            : 'btn btn-primary'
                          }
                          disabled:opacity-50 disabled:cursor-not-allowed
                        `}
                        title={(character?.gold ?? 0) < getRepairCost(equippedTool.tier) ? 'Not enough gold!' : 'Click to repair'}
                      >
                        <span className="flex items-center justify-center gap-1">
                          <span>🔧</span>
                          <span>Repair</span>
                          <span className="text-xs">({getRepairCost(equippedTool.tier)}g)</span>
                        </span>
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-gray-500 text-sm mb-3">No tool equipped</p>
                  <button
                    onClick={() => setSelectedSlot(selectedSlot === slot ? null : slot)}
                    className="btn btn-primary text-sm"
                  >
                    {selectedSlot === slot ? 'Cancel' : 'Equip Tool'}
                  </button>
                </div>
              )}

              {/* Tool Browser (when slot selected) */}
              {selectedSlot === slot && (
                <div className="mt-4 pt-4 border-t border-white/10">
                  <h4 className="text-sm font-semibold text-gray-300 mb-3">Available Tools</h4>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {getToolsForSlot(slot).map(tool => (
                      <button
                        key={tool.id}
                        onClick={() => handleEquipTool(tool.id)}
                        disabled={isEquipping}
                        className="w-full text-left p-3 rounded-lg bg-gray-800/50 hover:bg-gray-700/50 border border-white/10 hover:border-amber-500/50 transition-all"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-white text-sm">{tool.name}</span>
                              <span className={`badge ${getToolTierBadge(tool.tier)} text-xs`}>
                                {getToolTierName(tool.tier)}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 mt-1 text-xs">
                              <span className="text-blue-400">⚡ {tool.gathering_power}x</span>
                              <span className="text-green-400">💎 {(tool.bonus_yield_chance * 100).toFixed(0)}%</span>
                              {tool.required_level > 1 && (
                                <span className="text-gray-400">Lv. {tool.required_level}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}
                    {getToolsForSlot(slot).length === 0 && (
                      <p className="text-gray-500 text-sm text-center py-4">No tools available for this slot</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Info Box */}
      <div className="panel p-4 bg-blue-900/10 border border-blue-500/20">
        <h3 className="text-sm font-semibold text-blue-300 mb-2">💡 Tool Tips</h3>
        <ul className="text-xs text-gray-400 space-y-1">
          <li>• Tools increase gathering speed and bonus yield chance</li>
          <li>• Durability decreases with each harvest and must be repaired</li>
          <li>• Broken tools (0% durability) lose all bonuses until repaired</li>
          <li>• Higher tier tools provide better bonuses but cost more to repair</li>
        </ul>
      </div>

      {/* Tool Crafting Modal */}
      {showCrafting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80" onClick={() => setShowCrafting(false)} />
          <div className="relative panel p-6 max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowCrafting(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
            >
              ✕
            </button>
            <ToolCrafting />
          </div>
        </div>
      )}
    </div>
  )
}
