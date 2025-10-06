'use client'

import { useState, useEffect } from 'react'
import { useGameStore } from '@/lib/store'
import type { ExpeditionSupply, WorldZone } from '@/lib/supabase'
import { getExpeditionSupplies, purchaseSupply, startExpedition } from '@/lib/expeditionSupplies'
import { startExploration } from '@/lib/exploration'

interface ExpeditionPlannerProps {
  zone: WorldZone
  onStart?: () => void
  onClose: () => void
}

interface SelectedSupply {
  supply: ExpeditionSupply
  quantity: number
}

export default function ExpeditionPlanner({ zone, onStart, onClose }: ExpeditionPlannerProps) {
  const { character } = useGameStore()
  const [supplies, setSupplies] = useState<ExpeditionSupply[]>([])
  const [selectedSupplies, setSelectedSupplies] = useState<SelectedSupply[]>([])
  const [expeditionType, setExpeditionType] = useState<'scout' | 'standard' | 'deep' | 'legendary'>('standard')
  const [loading, setLoading] = useState(true)
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<string>('food')

  useEffect(() => {
    loadSupplies()
  }, [character])

  async function loadSupplies() {
    if (!character) return

    const { data, error } = await getExpeditionSupplies(character.level)
    if (data && !error) {
      setSupplies(data)
    }
    setLoading(false)
  }

  function addSupply(supply: ExpeditionSupply) {
    const existing = selectedSupplies.find(s => s.supply.id === supply.id)
    if (existing) {
      // Increase quantity
      setSelectedSupplies(prev =>
        prev.map(s =>
          s.supply.id === supply.id
            ? { ...s, quantity: Math.min(s.quantity + 1, supply.stack_size) }
            : s
        )
      )
    } else {
      // Add new supply
      setSelectedSupplies(prev => [...prev, { supply, quantity: 1 }])
    }
  }

  function removeSupply(supplyId: string) {
    setSelectedSupplies(prev => prev.filter(s => s.supply.id !== supplyId))
  }

  function updateQuantity(supplyId: string, quantity: number) {
    setSelectedSupplies(prev =>
      prev.map(s =>
        s.supply.id === supplyId
          ? { ...s, quantity: Math.max(1, Math.min(quantity, s.supply.stack_size)) }
          : s
      )
    )
  }

  function getTotalCost(): number {
    return selectedSupplies.reduce(
      (total, s) => total + s.supply.cost * s.quantity,
      0
    )
  }

  function getExpeditionDuration(): string {
    switch (expeditionType) {
      case 'scout': return '15 minutes'
      case 'standard': return '30 minutes'
      case 'deep': return '1 hour'
      case 'legendary': return '2 hours'
    }
  }

  function getExpeditionBonuses(): Record<string, string> {
    switch (expeditionType) {
      case 'scout':
        return {
          'Speed': '+50%',
          'Discovery': '-20%',
          'Rewards': '×0.5'
        }
      case 'standard':
        return {
          'Speed': 'Normal',
          'Discovery': 'Normal',
          'Rewards': '×1.0'
        }
      case 'deep':
        return {
          'Speed': '-25%',
          'Discovery': '+30%',
          'Rewards': '×1.5'
        }
      case 'legendary':
        return {
          'Speed': '-50%',
          'Discovery': '+60%',
          'Rewards': '×2.5',
          'Legendary Items': 'Possible'
        }
    }
  }

  function getRiskLevel(characterLevel: number, zoneDanger: number, expType: string): {
    text: string
    color: string
    description: string
  } {
    // Calculate approximate failure chance (same formula as backend)
    const levelDiff = zoneDanger - characterLevel
    let baseChance = Math.max(0, levelDiff * 2)

    const typeModifiers = {
      scout: 0.5,
      standard: 1.0,
      deep: 1.5,
      legendary: 2.0
    }
    baseChance *= typeModifiers[expType as keyof typeof typeModifiers] || 1.0
    const failureChance = Math.min(Math.max(baseChance, 5), 60)

    if (failureChance <= 15) {
      return {
        text: `${failureChance.toFixed(0)}% - Low Risk ✅`,
        color: 'bg-green-900/30 border-green-500/50 text-green-400',
        description: 'Safe expedition with minimal danger'
      }
    } else if (failureChance <= 30) {
      return {
        text: `${failureChance.toFixed(0)}% - Moderate Risk ⚠️`,
        color: 'bg-yellow-900/30 border-yellow-500/50 text-yellow-400',
        description: 'Some risk involved, be prepared'
      }
    } else if (failureChance <= 45) {
      return {
        text: `${failureChance.toFixed(0)}% - High Risk 🔥`,
        color: 'bg-orange-900/30 border-orange-500/50 text-orange-400',
        description: 'Dangerous! Failure may result in losses'
      }
    } else {
      return {
        text: `${failureChance.toFixed(0)}% - EXTREME RISK ☠️`,
        color: 'bg-red-900/30 border-red-500/50 text-red-400',
        description: 'Very dangerous! Likely to fail with severe penalties'
      }
    }
  }

  async function handleStartExpedition() {
    if (!character) return

    setStarting(true)
    setError(null)

    try {
      // Validate gold
      const totalCost = getTotalCost()
      if (character.gold < totalCost) {
        throw new Error('Insufficient gold for expedition supplies')
      }

      // Prepare supplies array
      const supplies = selectedSupplies.map(s => ({
        id: s.supply.id,
        quantity: s.quantity
      }))

      // Start exploration with supplies and expedition type
      const { error: exploreError } = await startExploration(
        character.id,
        zone.id,
        expeditionType === 'scout', // Auto mode for scout expeditions
        undefined, // autoStopAt
        supplies,
        expeditionType
      )

      if (exploreError) throw exploreError

      onStart?.()
      onClose()
    } catch (err: any) {
      setError(err.message)
      setStarting(false)
    }
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="panel p-12">
          <div className="w-16 h-16 border-4 border-amber-500/30 border-t-amber-500 rounded-full animate-spin"></div>
        </div>
      </div>
    )
  }

  // Group supplies by type
  const supplyTypes = ['food', 'tool', 'light', 'medicine', 'map', 'special']
  const suppliesByType = supplyTypes.reduce((acc, type) => {
    acc[type] = supplies.filter(s => s.supply_type === type)
    return acc
  }, {} as Record<string, ExpeditionSupply[]>)

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-gradient-to-br from-gray-900 to-gray-950 border-2 border-amber-500/50
                      rounded-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden shadow-2xl">

        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-amber-600 to-orange-600 relative overflow-hidden">
          <div className="absolute inset-0 bg-black/20"></div>
          <div className="relative z-10">
            <h2 className="text-3xl font-bold text-white text-shadow-lg mb-2">
              Expedition Planning
            </h2>
            <p className="text-white/80">
              Prepare for your journey to {zone.name}
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[calc(90vh-200px)] overflow-y-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Expedition Type */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <span>🎯</span> Expedition Type
              </h3>

              <div className="space-y-2">
                {(['scout', 'standard', 'deep', 'legendary'] as const).map(type => (
                  <button
                    key={type}
                    onClick={() => setExpeditionType(type)}
                    className={`
                      w-full p-4 rounded-xl border-2 transition-all duration-200
                      ${expeditionType === type
                        ? 'bg-amber-900/30 border-amber-500 scale-105'
                        : 'bg-gray-800/50 border-gray-700/50 hover:bg-gray-700/50 hover:border-amber-500/50'
                      }
                    `}
                  >
                    <div className="flex items-start justify-between">
                      <div className="text-left">
                        <div className="font-semibold text-white capitalize flex items-center gap-2">
                          {type === 'scout' && '🏃'}
                          {type === 'standard' && '🚶'}
                          {type === 'deep' && '🧗'}
                          {type === 'legendary' && '⚔️'}
                          {type} Expedition
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          {type === 'scout' && 'Quick reconnaissance'}
                          {type === 'standard' && 'Balanced exploration'}
                          {type === 'deep' && 'Thorough investigation'}
                          {type === 'legendary' && 'Maximum rewards'}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              {/* Expedition Info */}
              <div className="panel p-4 space-y-3">
                <div className="text-sm">
                  <div className="text-gray-500 mb-1">Duration</div>
                  <div className="text-white font-semibold">{getExpeditionDuration()}</div>
                </div>

                <div className="text-sm">
                  <div className="text-gray-500 mb-1">Bonuses</div>
                  <div className="space-y-1">
                    {Object.entries(getExpeditionBonuses()).map(([key, value]) => (
                      <div key={key} className="flex justify-between">
                        <span className="text-gray-400">{key}:</span>
                        <span className={`font-medium ${
                          value.includes('+') ? 'text-green-400' :
                          value.includes('-') ? 'text-red-400' :
                          value.includes('×2') ? 'text-amber-400' :
                          'text-white'
                        }`}>{value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Risk Warning */}
                {character && (
                  <div className="text-sm">
                    <div className="text-gray-500 mb-1">Failure Risk</div>
                    <div className={`
                      font-bold p-2 rounded-lg border
                      ${getRiskLevel(character.level, zone.danger_level, expeditionType).color}
                    `}>
                      {getRiskLevel(character.level, zone.danger_level, expeditionType).text}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      {getRiskLevel(character.level, zone.danger_level, expeditionType).description}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Middle: Supplies */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <span>🎒</span> Supplies
              </h3>

              {/* Supply Type Tabs */}
              <div className="flex flex-wrap gap-2">
                {supplyTypes.map(type => (
                  <button
                    key={type}
                    onClick={() => setActiveTab(type)}
                    className={`
                      px-3 py-1 rounded-lg text-sm font-medium transition-all
                      ${activeTab === type
                        ? 'bg-amber-500 text-white'
                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                      }
                    `}
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </button>
                ))}
              </div>

              {/* Supply List */}
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {suppliesByType[activeTab]?.map(supply => (
                  <div
                    key={supply.id}
                    className="p-3 bg-gray-800/50 border border-gray-700/50 rounded-lg
                             hover:bg-gray-700/50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{supply.icon}</span>
                          <div>
                            <div className="font-medium text-white">{supply.name}</div>
                            <div className="text-xs text-gray-400">{supply.description}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 mt-2 text-xs">
                          <span className="text-yellow-400">💰 {supply.cost}g</span>
                          <span className="text-gray-500">Stack: {supply.stack_size}</span>
                          {supply.duration && (
                            <span className="text-blue-400">⏱️ {Math.floor(supply.duration / 60)}min</span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => addSupply(supply)}
                        disabled={!character || character.gold < supply.cost}
                        className="btn btn-primary text-xs px-3 py-1"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Selected Supplies */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <span>📦</span> Selected Supplies
              </h3>

              {selectedSupplies.length === 0 ? (
                <div className="panel p-8 text-center">
                  <div className="text-4xl mb-3">🎒</div>
                  <p className="text-gray-400">No supplies selected</p>
                  <p className="text-gray-500 text-sm mt-2">
                    Add supplies to improve your expedition success
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedSupplies.map(({ supply, quantity }) => (
                    <div
                      key={supply.id}
                      className="p-3 bg-gray-800/50 border border-gray-700/50 rounded-lg"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span>{supply.icon}</span>
                          <div>
                            <div className="text-sm font-medium text-white">{supply.name}</div>
                            <div className="text-xs text-yellow-400">
                              {supply.cost * quantity}g
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            id={`supply-quantity-${supply.id}`}
                            name={`supply-quantity-${supply.id}`}
                            type="number"
                            value={quantity}
                            onChange={(e) => updateQuantity(supply.id, parseInt(e.target.value) || 1)}
                            min="1"
                            max={supply.stack_size}
                            data-testid={`supply-quantity-${supply.id}`}
                            className="w-16 px-2 py-1 bg-gray-900 border border-gray-700 rounded
                                     text-white text-center text-sm"
                          />
                          <button
                            onClick={() => removeSupply(supply.id)}
                            className="text-red-400 hover:text-red-300 transition-colors"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Cost Summary */}
              <div className="panel p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Supply Cost:</span>
                  <span className="text-yellow-400 font-semibold">{getTotalCost()}g</span>
                </div>
                {character && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Your Gold:</span>
                    <span className={`font-semibold ${
                      character.gold >= getTotalCost() ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {character.gold}g
                    </span>
                  </div>
                )}
              </div>

              {/* Error Message */}
              {error && (
                <div className="p-3 bg-red-900/20 border border-red-500/50 rounded-lg">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-800 flex items-center justify-between">
          <button
            onClick={onClose}
            className="btn btn-secondary"
          >
            Cancel
          </button>

          <button
            onClick={handleStartExpedition}
            disabled={starting || !character || character.gold < getTotalCost()}
            className="btn btn-primary flex items-center gap-2"
          >
            {starting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                Starting...
              </>
            ) : (
              <>
                <span>🚀</span>
                Start Expedition
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}