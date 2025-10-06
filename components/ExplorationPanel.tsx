'use client'

import { useState, useEffect } from 'react'
import { useGameStore } from '@/lib/store'
import type { ActiveExploration, WorldZone, ZoneLandmark, ExplorationReward, Item, ExplorationEvent } from '@/lib/supabase'
import { getActiveExploration, processExploration, stopExploration } from '@/lib/exploration'
import { getInventory } from '@/lib/inventory'
import { initializeExplorationSkills } from '@/lib/explorationSkills'
import AdventureCompletionModal from './AdventureCompletionModal'
import ExplorationEventModal from './ExplorationEventModal'
import ExplorationSkillsPanel from './ExplorationSkillsPanel'

interface ExplorationPanelProps {
  onExplorationComplete?: () => void
}

interface RewardDisplay extends ExplorationReward {
  itemDetails?: Item[]
}

interface SessionItem {
  inventoryId: string
  item: Item
  quantity: number
}

export default function ExplorationPanel({ onExplorationComplete }: ExplorationPanelProps) {
  const { character } = useGameStore()
  const [exploration, setExploration] = useState<ActiveExploration | null>(null)
  const [zone, setZone] = useState<WorldZone | null>(null)
  const [progress, setProgress] = useState(0)
  const [discoveries, setDiscoveries] = useState<ZoneLandmark[]>([])
  const [rewards, setRewards] = useState<RewardDisplay[]>([])
  const [sessionItems, setSessionItems] = useState<SessionItem[]>([])
  const [totalGold, setTotalGold] = useState(0)
  const [totalXP, setTotalXP] = useState(0)
  const [timeSpent, setTimeSpent] = useState(0)
  const [loading, setLoading] = useState(true)
  const [stopping, setStopping] = useState(false)
  const [showCompletionModal, setShowCompletionModal] = useState(false)
  const [currentEvent, setCurrentEvent] = useState<ExplorationEvent | null>(null)
  const [showEventModal, setShowEventModal] = useState(false)
  const [showSkills, setShowSkills] = useState(false)
  const [failed, setFailed] = useState(false)
  const [failureReason, setFailureReason] = useState<string>('')

  useEffect(() => {
    if (character) {
      loadExploration()
    }
  }, [character])

  useEffect(() => {
    if (!character?.id || !exploration?.id) return

    const interval = setInterval(updateProgress, 1000)
    return () => clearInterval(interval)
  }, [character?.id, exploration?.id])

  async function loadExploration() {
    if (!character) return

    const { data } = await getActiveExploration(character.id)
    if (data) {
      setExploration(data)
      setProgress(data.exploration_progress)
      await loadZone(data.zone_id)
      // Initialize exploration skills if needed
      await initializeExplorationSkills(character.id)
    }
    setLoading(false)
  }

  async function loadZone(zoneId: string) {
    const { createClient } = await import('@/utils/supabase/client')
    const supabase = createClient()

    const { data } = await supabase
      .from('world_zones')
      .select('*')
      .eq('id', zoneId)
      .single()

    if (data) setZone(data)
  }

  async function updateProgress() {
    if (!character || !exploration) return

    try {
      const { data, error } = await processExploration(character.id)

      if (error) {
        console.error('[Exploration] Error:', error)
        return
      }

      if (data) {
        setProgress(data.progress)
        setTimeSpent(data.timeSpent)

        // Check for failure
        if ((data as any).failed) {
          setFailed(true)
          setFailureReason((data as any).failureReason || 'Expedition failed')
        }

        // Check for triggered events
        if (data.event) {
          setCurrentEvent(data.event)
          setShowEventModal(true)
        }

        // Add new discoveries
        if (data.discoveries.length > 0) {
          setDiscoveries(prev => [...prev, ...data.discoveries])
        }

        // Track gold and XP
        if (data.rewards.length > 0) {
          const goldEarned = data.rewards.reduce((sum, r) => sum + r.gold, 0)
          const xpEarned = data.rewards.reduce((sum, r) => sum + r.xp, 0)
          setTotalGold(prev => prev + goldEarned)
          setTotalXP(prev => prev + xpEarned)

          // Get item details and track for session
          const { createClient } = await import('@/utils/supabase/client')
          const supabase = createClient()

          const rewardsWithDetails = await Promise.all(
            data.rewards.map(async (reward) => {
              if (reward.items.length > 0) {
                const { data: items } = await supabase
                  .from('items')
                  .select('*')
                  .in('id', reward.items)

                return { ...reward, itemDetails: items || [] }
              }
              return reward
            })
          )

          setRewards(prev => [...prev, ...rewardsWithDetails])

          // Track items found in this session
          for (const reward of rewardsWithDetails) {
            if ('itemDetails' in reward && reward.itemDetails && reward.itemDetails.length > 0) {
              const { data: inventory } = await getInventory(character.id)
              if (inventory) {
                // Find the newly added items in inventory
                const newItems = reward.itemDetails.map((item: Item) => {
                  const invItem = inventory.find(inv => inv.item_id === item.id && !sessionItems.some(si => si.inventoryId === inv.id))
                  if (invItem) {
                    return {
                      inventoryId: invItem.id,
                      item: Array.isArray(invItem.item) ? invItem.item[0] : invItem.item,
                      quantity: invItem.quantity
                    }
                  }
                  return null
                }).filter(Boolean) as SessionItem[]

                if (newItems.length > 0) {
                  setSessionItems(prev => [...prev, ...newItems])
                }
              }
            }
          }
        }

        // Update exploration state with new discovery count
        setExploration(prev => prev ? {
          ...prev,
          exploration_progress: data.progress,
          discoveries_found: prev.discoveries_found + data.discoveries.length
        } : null)

        // Auto-complete if done
        if (data.completed) {
          await handleStop()
        }
      }
    } catch (err) {
      console.error('[Exploration] Exception:', err)
    }
  }

  async function handleStop() {
    if (!character || stopping) return

    setStopping(true)
    await stopExploration(character.id)

    // Show completion modal - DON'T notify parent yet
    setShowCompletionModal(true)
    setStopping(false)
  }

  function handleModalClose() {
    setShowCompletionModal(false)
    // Reset all state
    setExploration(null)
    setProgress(0)
    setDiscoveries([])
    setRewards([])
    setSessionItems([])
    setTotalGold(0)
    setTotalXP(0)
    setTimeSpent(0)

    // IMPORTANT: Only notify parent AFTER modal closes
    // This prevents the parent from unmounting this component while modal is open
    onExplorationComplete?.()
  }

  function handleItemRemoved(inventoryId: string) {
    setSessionItems(prev => prev.filter(item => item.inventoryId !== inventoryId))
  }

  if (loading) {
    return (
      <div className="panel p-6">
        <div className="flex items-center justify-center py-8">
          <div className="w-12 h-12 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin"></div>
        </div>
      </div>
    )
  }

  if (!exploration && !showCompletionModal) {
    return null
  }

  // If modal is showing but exploration is null, just show the modal
  if (!exploration && showCompletionModal) {
    return (
      <>
        <AdventureCompletionModal
          isOpen={showCompletionModal}
          onClose={handleModalClose}
          zoneName={zone?.name || 'Unknown Zone'}
          progress={progress}
          discoveries={discoveries.length}
          totalGold={totalGold}
          totalXP={totalXP}
          itemsFound={sessionItems}
          onItemRemoved={handleItemRemoved}
          failed={failed}
          failureReason={failureReason}
        />
      </>
    )
  }

  const minutes = Math.floor(timeSpent / 60)
  const seconds = timeSpent % 60
  const paddedSeconds = seconds.toString().padStart(2, '0')

  return (
    <div className="panel p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white flex items-center gap-3">
          <span className="text-3xl">🔍</span>
          Exploring {zone?.name || 'Zone'}
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSkills(!showSkills)}
            className="btn btn-secondary text-sm"
          >
            {showSkills ? 'Hide Skills' : 'View Skills'}
          </button>
          <button
            onClick={handleStop}
            disabled={stopping}
            className="btn btn-secondary text-sm"
          >
            {stopping ? 'Stopping...' : 'Stop Exploring'}
          </button>
        </div>
      </div>

      {/* Skills Panel */}
      {showSkills && character && (
        <ExplorationSkillsPanel characterId={character.id} />
      )}

      {/* Progress Circle and Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Progress Circle */}
        <div className="flex flex-col items-center justify-center">
          <div className="relative w-48 h-48">
            {/* Background Circle */}
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="96"
                cy="96"
                r="88"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                className="text-gray-700"
              />
              {/* Progress Circle */}
              <circle
                cx="96"
                cy="96"
                r="88"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                strokeDasharray={`${2 * Math.PI * 88}`}
                strokeDashoffset={`${2 * Math.PI * 88 * (1 - progress / 100)}`}
                className="text-emerald-500 transition-all duration-1000"
                strokeLinecap="round"
              />
            </svg>
            {/* Center Text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="text-4xl font-bold text-white">{Math.floor(progress)}%</div>
              <div className="text-sm text-gray-400">Complete</div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="space-y-3">
          <div className="stat-box">
            <div className="flex items-center gap-2 text-gray-400">
              <span className="text-xl">⏱️</span>
              <span>Time Spent</span>
            </div>
            <div className="text-2xl font-bold text-emerald-400 font-mono">
              {minutes}m {paddedSeconds}s
            </div>
          </div>

          <div className="stat-box">
            <div className="flex items-center gap-2 text-gray-400">
              <span className="text-xl">🎯</span>
              <span>Discoveries</span>
            </div>
            <div className="text-2xl font-bold text-amber-400">
              {exploration?.discoveries_found ?? 0}
            </div>
          </div>

          <div className="stat-box">
            <div className="flex items-center gap-2 text-gray-400">
              <span className="text-xl">💰</span>
              <span>Gold Earned</span>
            </div>
            <div className="text-2xl font-bold text-yellow-400">
              {totalGold.toLocaleString()}
            </div>
          </div>

          <div className="stat-box">
            <div className="flex items-center gap-2 text-gray-400">
              <span className="text-xl">⭐</span>
              <span>XP Earned</span>
            </div>
            <div className="text-2xl font-bold text-blue-400">
              {totalXP.toLocaleString()}
            </div>
          </div>

          <div className="stat-box">
            <div className="flex items-center gap-2 text-gray-400">
              <span className="text-xl">🎁</span>
              <span>Items Found</span>
            </div>
            <div className="text-2xl font-bold text-purple-400">
              {sessionItems.length}
            </div>
          </div>

          {exploration?.is_auto && exploration?.auto_stop_at && (
            <div className="stat-box">
              <div className="flex items-center gap-2 text-gray-400">
                <span className="text-xl">🤖</span>
                <span>Auto-Stop At</span>
              </div>
              <div className="text-2xl font-bold text-blue-400">
                {exploration.auto_stop_at}%
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Items Found This Session */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <span>🎁</span>
          Items Found ({sessionItems.length})
        </h3>
        {sessionItems.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
            {sessionItems.map((sessionItem, idx) => (
              <div
                key={`session-item-${idx}`}
                className={`p-2 rounded-lg border text-center transition-all hover:scale-105
                  ${sessionItem.item.rarity === 'legendary' ? 'bg-yellow-500/10 border-yellow-500/50' :
                    sessionItem.item.rarity === 'epic' ? 'bg-purple-500/10 border-purple-500/50' :
                    sessionItem.item.rarity === 'rare' ? 'bg-blue-500/10 border-blue-500/50' :
                    sessionItem.item.rarity === 'uncommon' ? 'bg-green-500/10 border-green-500/50' :
                    'bg-gray-500/10 border-gray-500/50'
                  }`}
              >
                <div className={`text-xs font-semibold mb-1
                  ${sessionItem.item.rarity === 'legendary' ? 'text-yellow-400' :
                    sessionItem.item.rarity === 'epic' ? 'text-purple-400' :
                    sessionItem.item.rarity === 'rare' ? 'text-blue-400' :
                    sessionItem.item.rarity === 'uncommon' ? 'text-green-400' :
                    'text-gray-400'
                  }`}
                >
                  {sessionItem.item.name}
                </div>
                {sessionItem.quantity > 1 && (
                  <div className="text-xs text-gray-500">x{sessionItem.quantity}</div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="p-4 bg-gray-800/30 border border-gray-700/50 rounded-lg text-center">
            <p className="text-sm text-gray-400">No items found yet... keep exploring!</p>
          </div>
        )}
      </div>

      {/* Recent Rewards */}
      {rewards.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <span>💎</span>
            Recent Rewards
          </h3>
          <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto">
            {rewards.slice(-10).reverse().map((reward, idx) => (
              <div
                key={`reward-${idx}`}
                className="p-3 bg-gradient-to-r from-amber-500/10 to-yellow-500/10
                         border border-amber-500/30 rounded-lg animate-pulse"
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl">🎁</span>
                  <div className="flex-1">
                    <div className="font-semibold text-amber-400 mb-1">
                      Treasure at {reward.progress_percent}%
                    </div>
                    <div className="flex flex-wrap gap-2 text-sm">
                      {reward.gold > 0 && (
                        <span className="px-2 py-1 bg-yellow-500/20 border border-yellow-500/30
                                       rounded text-yellow-400">
                          💰 {reward.gold} gold
                        </span>
                      )}
                      {reward.xp > 0 && (
                        <span className="px-2 py-1 bg-blue-500/20 border border-blue-500/30
                                       rounded text-blue-400">
                          ⭐ {reward.xp} XP
                        </span>
                      )}
                      {reward.itemDetails && reward.itemDetails.length > 0 && (
                        reward.itemDetails.map((item, itemIdx) => (
                          <span
                            key={`item-${itemIdx}`}
                            className={`px-2 py-1 border rounded
                              ${item.rarity === 'legendary' ? 'bg-yellow-500/20 border-yellow-500/30 text-yellow-400' :
                                item.rarity === 'epic' ? 'bg-purple-500/20 border-purple-500/30 text-purple-400' :
                                item.rarity === 'rare' ? 'bg-blue-500/20 border-blue-500/30 text-blue-400' :
                                item.rarity === 'uncommon' ? 'bg-green-500/20 border-green-500/30 text-green-400' :
                                'bg-gray-500/20 border-gray-500/30 text-gray-400'
                              }`}
                          >
                            {item.name}
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Discoveries */}
      {discoveries.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <span>🎉</span>
            Recent Discoveries
          </h3>
          <div className="space-y-2">
            {discoveries.slice(-5).reverse().map((discovery, idx) => (
              <div
                key={`${discovery.id}-${idx}`}
                className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg
                         animate-pulse"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">📍</span>
                  <div className="flex-1">
                    <div className="font-semibold text-emerald-400">{discovery.name}</div>
                    <div className="text-sm text-gray-400">{discovery.description}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Progress Info */}
      <div className="p-4 bg-gradient-to-r from-emerald-500/10 to-blue-500/10 border border-emerald-500/30 rounded-lg space-y-2">
        <div className="text-sm text-gray-300">
          <strong className="text-emerald-400">⚡ Exploration Rate:</strong> 1% every 15 seconds (25 minutes to 100%)
        </div>
        <div className="text-sm text-gray-300">
          <strong className="text-blue-400">🎯 Discovery Chance:</strong> Rolled every 5% progress
        </div>
        <div className="text-sm text-gray-300">
          <strong className="text-amber-400">💎 Reward Chance:</strong> 25-50% every 1% progress (increases as you explore!)
        </div>
        <div className="text-sm text-gray-300">
          <strong className="text-purple-400">🎁 Items Per Reward:</strong> 3-8 items with rarity-based drop rates
        </div>
        {exploration?.is_auto && (
          <div className="text-sm text-blue-400 flex items-center gap-2">
            <span>🤖</span>
            <span>Auto-exploration enabled</span>
          </div>
        )}
      </div>

      {/* Flavor Text */}
      <div className="p-3 bg-gray-800/30 border border-gray-700/50 rounded-lg">
        <p className="text-sm text-gray-400 italic text-center">
          {progress < 25
            ? 'You begin your careful exploration of the area...'
            : progress < 50
            ? 'You search through hidden corners and obscure paths...'
            : progress < 75
            ? 'The landscape is gradually revealing its secrets...'
            : 'You\'ve covered most of the area, but there may be more to find...'}
        </p>
      </div>

      {/* Exploration Event Modal */}
      {character && (
        <ExplorationEventModal
          isOpen={showEventModal}
          event={currentEvent}
          characterId={character.id}
          zoneId={exploration?.zone_id || ''}
          onClose={() => {
            setShowEventModal(false)
            setCurrentEvent(null)
          }}
          onComplete={(outcome) => {
            // Handle event completion
            console.log('Event completed:', outcome)
          }}
        />
      )}

      {/* Adventure Completion Modal */}
      <AdventureCompletionModal
        isOpen={showCompletionModal}
        onClose={handleModalClose}
        zoneName={zone?.name || 'Unknown Zone'}
        progress={progress}
        discoveries={discoveries.length}
        totalGold={totalGold}
        totalXP={totalXP}
        itemsFound={sessionItems}
        onItemRemoved={handleItemRemoved}
        failed={failed}
        failureReason={failureReason}
      />
    </div>
  )
}
