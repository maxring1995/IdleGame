'use client'

import { useState, useEffect } from 'react'
import { useGameStore } from '@/lib/store'
import { GatheringNode, Material, GatheringEncounter, GatheringSpecialization } from '@/lib/supabase'
import {
  getNodesInZone,
  getNodeDetails,
  harvestNodeAction,
  getActiveEncounter,
  resolveEncounter
} from '@/app/actions/gatheringNodes'
import { useNotificationStore, notificationHelpers } from '@/lib/notificationStore'
import SpecializationModal from './SpecializationModal'
import {
  checkSpecializationEligibility,
  getCharacterSpecialization,
  selectSpecialization
} from '@/lib/specializations'
import {
  getActiveHotspots,
  getHotspotTimeRemaining,
  getHotspotIcon,
  getHotspotColorClasses,
  type Hotspot
} from '@/lib/hotspots'
import {
  getZoneHotspotsAction,
  spawnHotspotAction
} from '@/app/actions/hotspots'

interface GatheringZoneProps {
  worldZone: string
  zoneName: string
}

interface NodeWithMaterial extends GatheringNode {
  material: Material
}

export default function GatheringZone({ worldZone, zoneName }: GatheringZoneProps) {
  const { character } = useGameStore()
  const { addNotification } = useNotificationStore()

  const [nodes, setNodes] = useState<GatheringNode[]>([])
  const [selectedNode, setSelectedNode] = useState<NodeWithMaterial | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isHarvesting, setIsHarvesting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [encounter, setEncounter] = useState<GatheringEncounter | null>(null)
  const [showEncounterModal, setShowEncounterModal] = useState(false)

  // Specialization state
  const [showSpecModal, setShowSpecModal] = useState(false)
  const [specModalSkill, setSpecModalSkill] = useState<{ type: string, level: number } | null>(null)
  const [characterSpecializations, setCharacterSpecializations] = useState<Map<string, GatheringSpecialization>>(new Map())

  // Hotspot state
  const [hotspots, setHotspots] = useState<Hotspot[]>([])
  const [hotspotTimers, setHotspotTimers] = useState<Map<string, any>>(new Map())

  // Load nodes on mount and every 10 seconds for respawn checks
  useEffect(() => {
    if (worldZone) {
      loadNodes()
      const interval = setInterval(loadNodes, 10000)
      return () => clearInterval(interval)
    }
  }, [worldZone])

  // Check for active encounters
  useEffect(() => {
    if (character) {
      checkForEncounter()
    }
  }, [character])

  // Check for specialization eligibility and load existing specializations
  useEffect(() => {
    if (character) {
      checkSpecializations()
    }
  }, [character])

  async function loadNodes() {
    const result = await getNodesInZone(worldZone)
    if (result.success && result.nodes) {
      setNodes(result.nodes)
    }

    // Also load hotspots
    loadHotspots()
  }

  async function loadHotspots() {
    const result = await getZoneHotspotsAction(worldZone)
    if (result.success && result.hotspots) {
      setHotspots(result.hotspots)

      // Start timers for each hotspot
      result.hotspots.forEach(hotspot => {
        if (!hotspotTimers.has(hotspot.id)) {
          startHotspotTimer(hotspot)
        }
      })
    }
  }

  function startHotspotTimer(hotspot: Hotspot) {
    const timer = setInterval(() => {
      const remaining = getHotspotTimeRemaining(hotspot.expires_at)
      if (remaining.expired) {
        clearInterval(timer)
        hotspotTimers.delete(hotspot.id)
        loadNodes() // Reload to update hotspot status
      }
    }, 1000)

    hotspotTimers.set(hotspot.id, timer)
  }

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      hotspotTimers.forEach(timer => clearInterval(timer))
    }
  }, [])

  async function handleNodeClick(nodeId: string) {
    setIsLoading(true)
    setError(null)

    const result = await getNodeDetails(nodeId)
    if (result.success && result.node) {
      setSelectedNode(result.node as NodeWithMaterial)
    } else {
      setError(result.error || 'Failed to load node details')
    }

    setIsLoading(false)
  }

  async function handleHarvest() {
    if (!character || !selectedNode) return

    setIsHarvesting(true)
    setError(null)

    const result = await harvestNodeAction(character.id, selectedNode.id)
    console.log('[GatheringZone] Harvest result:', result)

    if (result.success && result.result) {
      const { materialsGained, bonusMaterials, xpGained, nodeDepleted, encounter: newEncounter } = result.result
      console.log('[GatheringZone] Node depleted?', nodeDepleted)

      // Show success notification
      addNotification({
        type: 'success',
        category: 'gathering',
        title: '✅ Harvested!',
        message: `+${materialsGained + bonusMaterials} ${selectedNode.material.name}, +${xpGained} XP`,
        icon: getNodeIcon(selectedNode.node_type)
      })

      // Check for encounter
      if (newEncounter) {
        setEncounter(newEncounter)
        setShowEncounterModal(true)
      }

      // Reload nodes if depleted
      if (nodeDepleted) {
        console.log('[GatheringZone] Node depleted, reloading all nodes')
        await loadNodes()
        setSelectedNode(null)
      } else {
        // Refresh selected node
        console.log('[GatheringZone] Node not depleted, refreshing selected node')
        const refreshResult = await getNodeDetails(selectedNode.id)
        console.log('[GatheringZone] Refresh result:', refreshResult)
        if (refreshResult.success && refreshResult.node) {
          setSelectedNode(refreshResult.node as NodeWithMaterial)
        }
      }
    } else {
      setError(result.error || 'Failed to harvest')
      addNotification({
        type: 'error',
        category: 'gathering',
        title: '❌ Harvest Failed',
        message: result.error || 'Unable to harvest this node',
        icon: '⚠️'
      })
    }

    setIsHarvesting(false)
  }

  async function checkForEncounter() {
    if (!character) return

    const result = await getActiveEncounter(character.id)
    if (result.success && result.encounter) {
      setEncounter(result.encounter)
      setShowEncounterModal(true)
    }
  }

  async function checkSpecializations() {
    if (!character) return

    // Check for skills that can unlock specializations
    const eligibilityResult = await checkSpecializationEligibility(character.id)

    if (!eligibilityResult.error && eligibilityResult.data && eligibilityResult.data.length > 0) {
      // Show modal for the first eligible skill
      const firstEligible = eligibilityResult.data[0]
      setSpecModalSkill({ type: firstEligible.skillType, level: firstEligible.level })
      setShowSpecModal(true)
    }

    // Load all existing specializations for display
    const skillTypes = ['woodcutting', 'mining', 'fishing', 'hunting', 'alchemy', 'magic']
    const specs = new Map<string, GatheringSpecialization>()

    for (const skill of skillTypes) {
      const specResult = await getCharacterSpecialization(character.id, skill)
      if (!specResult.error && specResult.data?.specialization) {
        specs.set(skill, specResult.data.specialization)
      }
    }

    setCharacterSpecializations(specs)
  }

  async function handleSpecializationSelect(specializationId: string) {
    if (!character || !specModalSkill) return

    const result = await selectSpecialization(character.id, specModalSkill.type, specializationId)

    if (!result.error) {
      addNotification({
        type: 'success',
        category: 'gathering',
        title: '🎉 Specialization Unlocked!',
        message: `You've specialized in ${specModalSkill.type}!`,
        icon: '⭐'
      })

      // Reload specializations
      await checkSpecializations()
      setShowSpecModal(false)
      setSpecModalSkill(null)
    } else {
      addNotification({
        type: 'error',
        category: 'gathering',
        title: 'Failed to select specialization',
        message: result.error?.message || 'Unknown error',
        icon: '❌'
      })
    }
  }

  async function handleResolveEncounter(action: 'claim' | 'flee' | 'fight') {
    if (!encounter) return

    const result = await resolveEncounter(encounter.id, action)
    if (result.success) {
      if (result.rewards?.gold) {
        addNotification({
          type: 'success',
          category: 'gathering',
          title: '💰 Treasure Found!',
          message: `You claimed ${result.rewards.gold} gold!`,
          icon: '💰'
        })
      }

      setShowEncounterModal(false)
      setEncounter(null)
    }
  }

  const activeNodes = nodes.filter(n => n.is_active)
  const hasNodes = activeNodes.length > 0

  // Helper to get specialization for a node's skill type
  function getSpecializationForNode(node: NodeWithMaterial | null): GatheringSpecialization | null {
    if (!node) return null

    // Map node types to skill types
    const nodeToSkillMap: Record<string, string> = {
      'tree': 'woodcutting',
      'ore': 'mining',
      'fish': 'fishing',
      'creature': 'hunting',
      'herb': 'alchemy',
      'essence': 'magic'
    }

    const skillType = nodeToSkillMap[node.node_type]
    return skillType ? characterSpecializations.get(skillType) || null : null
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1">
            {zoneName} - Gathering
          </h2>
          <p className="text-sm text-gray-400">
            {activeNodes.length} active node{activeNodes.length !== 1 ? 's' : ''} available
            {hotspots.length > 0 && (
              <span className="ml-2 text-amber-400 font-semibold">
                • {hotspots.length} hotspot{hotspots.length !== 1 ? 's' : ''} active!
              </span>
            )}
          </p>
        </div>

        {/* Dev Tools */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setIsLoading(true)
              loadNodes().finally(() => setIsLoading(false))
            }}
            className="btn btn-secondary btn-sm flex items-center gap-2"
            title="Refresh nodes"
            disabled={isLoading}
          >
            <span className={isLoading ? 'animate-spin' : ''}>🔄</span>
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            onClick={async () => {
              const result = await spawnHotspotAction(worldZone, 1)
              if (!result.error) {
                addNotification({
                  type: 'success',
                  category: 'gathering',
                  title: 'Hotspot Spawned',
                  message: '🔥 Hotspot spawned!',
                  icon: '⭐'
                })
                loadNodes()
              } else {
                addNotification({
                  type: 'error',
                  category: 'gathering',
                  title: 'Hotspot Failed',
                  message: result.error || 'Failed to spawn hotspot',
                  icon: '❌'
                })
              }
            }}
            className="btn btn-primary btn-sm flex items-center gap-2"
            title="Spawn a random hotspot for testing"
          >
            <span>⭐</span>
            <span className="hidden sm:inline">Spawn Hotspot</span>
          </button>
        </div>

        {/* Active Specializations */}
        {characterSpecializations.size > 0 && (
          <div className="flex flex-wrap gap-2">
            {Array.from(characterSpecializations.entries()).map(([skillType, spec]) => (
              <div
                key={skillType}
                className="px-3 py-1 rounded-lg bg-gradient-to-r from-amber-500/20 to-amber-600/10 border border-amber-500/30"
                title={spec.description}
              >
                <span className="text-amber-400 text-xs font-semibold flex items-center gap-1">
                  <span>{spec.icon}</span>
                  <span>{spec.name}</span>
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-900/20 border border-red-500/50 rounded-xl p-4 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Node List */}
        <div className="lg:col-span-2">
          {!hasNodes ? (
            <div className="panel p-12 text-center">
              <div className="text-6xl mb-4">🌳</div>
              <h3 className="text-xl font-bold text-white mb-2">No Active Nodes</h3>
              <p className="text-gray-400">
                All gathering nodes in this zone have been depleted. Check back in a few minutes for respawns!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {activeNodes.map((node) => {
                // Find if this node is a hotspot
                const nodeHotspot = hotspots.find(h => h.node_id === node.id)

                return (
                  <NodeCard
                    key={node.id}
                    node={node}
                    isSelected={selectedNode?.id === node.id}
                    onClick={() => handleNodeClick(node.id)}
                    hotspot={nodeHotspot}
                  />
                )
              })}
            </div>
          )}
        </div>

        {/* Right: Node Details */}
        <div className="lg:col-span-1">
          {selectedNode ? (
            <div className="panel p-6 sticky top-6">
              <NodeDetails
                node={selectedNode}
                isHarvesting={isHarvesting}
                onHarvest={handleHarvest}
                characterId={character?.id}
                specialization={getSpecializationForNode(selectedNode)}
              />
            </div>
          ) : (
            <div className="panel p-12 text-center sticky top-6">
              <div className="text-5xl mb-3">👆</div>
              <p className="text-gray-400 text-sm">
                Click a node to view details and harvest
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Encounter Modal */}
      {showEncounterModal && encounter && (
        <EncounterModal
          encounter={encounter}
          onResolve={handleResolveEncounter}
          onClose={() => setShowEncounterModal(false)}
        />
      )}

      {/* Specialization Modal */}
      {showSpecModal && specModalSkill && (
        <SpecializationModal
          isOpen={showSpecModal}
          onClose={() => {
            setShowSpecModal(false)
            setSpecModalSkill(null)
          }}
          skillType={specModalSkill.type}
          skillLevel={specModalSkill.level}
          onSelect={handleSpecializationSelect}
        />
      )}
    </div>
  )
}

// ============================================================================
// Node Card Component
// ============================================================================

interface NodeCardProps {
  node: GatheringNode
  isSelected: boolean
  onClick: () => void
  hotspot?: Hotspot | null
}

function NodeCard({ node, isSelected, onClick, hotspot }: NodeCardProps) {
  const qualityColors = {
    poor: 'border-gray-500/50 bg-gray-500/5',
    standard: 'border-blue-500/50 bg-blue-500/5',
    rich: 'border-yellow-500/50 bg-yellow-500/10'
  }

  const qualityLabels = {
    poor: 'Poor',
    standard: 'Standard',
    rich: 'Rich'
  }

  const healthPercent = (node.current_health / node.max_health) * 100

  // Get hotspot styling if applicable
  const hotspotStyles = hotspot ? getHotspotColorClasses(hotspot.hotspot_type) : null

  // Calculate time remaining for hotspot
  const [timeRemaining, setTimeRemaining] = useState<any>(null)

  useEffect(() => {
    if (!hotspot) return

    const updateTimer = () => {
      const remaining = getHotspotTimeRemaining(hotspot.expires_at)
      setTimeRemaining(remaining)
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)

    return () => clearInterval(interval)
  }, [hotspot])

  return (
    <button
      onClick={onClick}
      className={`panel p-4 text-left transition-all hover:scale-102 relative ${
        isSelected ? 'ring-2 ring-amber-500 shadow-lg' : ''
      } ${hotspot ? `${hotspotStyles!.border} ${hotspotStyles!.bg} ${hotspotStyles!.glow} animate-pulse` : qualityColors[node.quality_tier]}`}
    >
      {/* Hotspot Badge */}
      {hotspot && (
        <div className="absolute -top-2 -right-2 z-10">
          <div className={`badge ${hotspotStyles!.text} font-bold text-xs px-2 py-1 animate-pulse`}>
            {getHotspotIcon(hotspot.hotspot_type)} HOTSPOT
          </div>
        </div>
      )}

      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-3xl">{getNodeIcon(node.node_type)}</span>
          <div>
            <h4 className="font-semibold text-white text-sm">
              {formatNodeType(node.node_type)}
            </h4>
            {hotspot ? (
              <div className="text-xs space-y-1">
                <div className={hotspotStyles!.text}>
                  {hotspot.multiplier.toFixed(1)}x Rewards!
                </div>
                {timeRemaining && !timeRemaining.expired && (
                  <div className="text-amber-400">
                    ⏰ {String(timeRemaining.hours).padStart(2, '0')}:
                    {String(timeRemaining.minutes).padStart(2, '0')}:
                    {String(timeRemaining.seconds).padStart(2, '0')}
                  </div>
                )}
              </div>
            ) : (
              <span className={`text-xs ${
                node.quality_tier === 'rich' ? 'text-yellow-400' :
                node.quality_tier === 'poor' ? 'text-gray-400' :
                'text-blue-400'
              }`}>
                {qualityLabels[node.quality_tier]}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Health Bar */}
      <div className="mb-2">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-gray-400">Durability</span>
          <span className="text-gray-300">{node.current_health} / {node.max_health}</span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-2">
          <div
            className={`h-full rounded-full transition-all ${
              healthPercent > 66 ? 'bg-green-500' :
              healthPercent > 33 ? 'bg-yellow-500' :
              'bg-red-500'
            }`}
            style={{ width: `${healthPercent}%` }}
          />
        </div>
      </div>

      <p className="text-xs text-gray-500">Click to harvest</p>
    </button>
  )
}

// ============================================================================
// Node Details Component
// ============================================================================

interface NodeDetailsProps {
  node: NodeWithMaterial
  isHarvesting: boolean
  onHarvest: () => void
  characterId?: string
  specialization?: GatheringSpecialization | null
}

function NodeDetails({ node, isHarvesting, onHarvest, characterId, specialization }: NodeDetailsProps) {
  const material = node.material

  const qualityMultiplier = node.quality_tier === 'rich' ? 1.5 : node.quality_tier === 'poor' ? 0.7 : 1.0
  let estimatedYield = Math.floor(1 * qualityMultiplier)
  const estimatedXP = Math.floor(material.experience_reward * qualityMultiplier)

  // Apply specialization bonuses
  const bonusEffects: string[] = []
  if (specialization) {
    const bonuses = specialization.bonuses as any
    if (bonuses.yield_multiplier) {
      estimatedYield = Math.floor(estimatedYield * bonuses.yield_multiplier)
      bonusEffects.push(`+${Math.round((bonuses.yield_multiplier - 1) * 100)}% yield`)
    }
    if (bonuses.double_drop_chance) {
      bonusEffects.push(`${Math.round(bonuses.double_drop_chance * 100)}% double drops`)
    }
    if (bonuses.failure_immunity) {
      bonusEffects.push('Never fail')
    }
  }

  return (
    <div className="space-y-4">
      {/* Material Info */}
      <div className="text-center">
        <div className="text-5xl mb-2">{getNodeIcon(node.node_type)}</div>
        <h3 className="text-xl font-bold text-white mb-1">{material.name}</h3>
        <p className="text-sm text-gray-400">{material.description}</p>
      </div>

      {/* Stats */}
      <div className="space-y-2 bg-gray-800/40 rounded-lg p-4">
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Quality</span>
          <span className={`font-semibold ${
            node.quality_tier === 'rich' ? 'text-yellow-400' :
            node.quality_tier === 'poor' ? 'text-gray-400' :
            'text-blue-400'
          }`}>
            {node.quality_tier.charAt(0).toUpperCase() + node.quality_tier.slice(1)}
          </span>
        </div>

        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Est. Yield</span>
          <span className="font-semibold text-green-400">~{estimatedYield} material</span>
        </div>

        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Est. XP</span>
          <span className="font-semibold text-purple-400">+{estimatedXP} XP</span>
        </div>

        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Skill Required</span>
          <span className="font-semibold text-white">
            {formatSkillType(material.required_skill_type)} Lv.{material.required_skill_level}
          </span>
        </div>

        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Remaining</span>
          <span className="font-semibold text-white">
            {node.current_health} / {node.max_health} harvests
          </span>
        </div>
      </div>

      {/* Specialization Bonuses */}
      {specialization && bonusEffects.length > 0 && (
        <div className="bg-gradient-to-r from-amber-500/10 to-amber-600/5 border border-amber-500/30 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl">{specialization.icon}</span>
            <h4 className="text-sm font-semibold text-amber-400">{specialization.name}</h4>
          </div>
          <div className="space-y-1">
            {bonusEffects.map((effect, idx) => (
              <div key={idx} className="flex items-center gap-2 text-xs text-amber-300">
                <span className="text-green-400">✓</span>
                <span>{effect}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Harvest Button */}
      <button
        onClick={onHarvest}
        disabled={isHarvesting || !characterId}
        className="w-full btn btn-primary py-3 text-base font-semibold disabled:opacity-50"
      >
        {isHarvesting ? (
          <span className="flex items-center justify-center gap-2">
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Harvesting...
          </span>
        ) : (
          `⛏️ Harvest ${material.name}`
        )}
      </button>

      {/* Tips */}
      <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-3">
        <p className="text-xs text-blue-300">
          <span className="font-semibold">💡 Tip:</span> Better tools increase yield and speed.
          Rich nodes give 50% bonus rewards!
        </p>
      </div>
    </div>
  )
}

// ============================================================================
// Encounter Modal Component
// ============================================================================

interface EncounterModalProps {
  encounter: GatheringEncounter
  onResolve: (action: 'claim' | 'flee' | 'fight') => void
  onClose: () => void
}

function EncounterModal({ encounter, onResolve, onClose }: EncounterModalProps) {
  const encounterIcons = {
    treasure: '💰',
    rare_spawn: '✨',
    monster: '👹',
    wanderer: '🚶',
    rune_discovery: '📜'
  }

  const encounterTitles = {
    treasure: 'Treasure Discovered!',
    rare_spawn: 'Rare Resource Found!',
    monster: 'Monster Encounter!',
    wanderer: 'Mysterious Wanderer',
    rune_discovery: 'Ancient Rune Discovery!'
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="panel max-w-md w-full mx-4 p-6 animate-scale-in">
        <div className="text-center mb-6">
          <div className="text-6xl mb-3">{encounterIcons[encounter.encounter_type]}</div>
          <h2 className="text-2xl font-bold text-white mb-2">
            {encounterTitles[encounter.encounter_type]}
          </h2>
          <p className="text-gray-400">
            {encounter.encounter_data.message}
          </p>
        </div>

        {/* Encounter-specific content */}
        {encounter.encounter_type === 'treasure' && encounter.encounter_data.gold && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-6 text-center">
            <p className="text-2xl font-bold text-yellow-400">
              💰 {encounter.encounter_data.gold} Gold
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          {encounter.encounter_type === 'treasure' && (
            <>
              <button
                onClick={() => onResolve('claim')}
                className="flex-1 btn btn-primary"
              >
                💰 Claim Treasure
              </button>
              <button
                onClick={onClose}
                className="btn btn-secondary px-6"
              >
                Leave
              </button>
            </>
          )}

          {encounter.encounter_type === 'monster' && (
            <>
              <button
                onClick={() => onResolve('fight')}
                className="flex-1 btn btn-danger"
              >
                ⚔️ Fight
              </button>
              <button
                onClick={() => onResolve('flee')}
                className="btn btn-secondary px-6"
              >
                🏃 Flee
              </button>
            </>
          )}

          {(encounter.encounter_type === 'rare_spawn' || encounter.encounter_type === 'wanderer' || encounter.encounter_type === 'rune_discovery') && (
            <button
              onClick={() => onResolve('claim')}
              className="w-full btn btn-primary"
            >
              ✨ Investigate
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Helper Functions
// ============================================================================

function getNodeIcon(nodeType: string): string {
  const icons: Record<string, string> = {
    tree: '🌳',
    ore_vein: '⛰️',
    fishing_spot: '🎣',
    hunting_ground: '🏹',
    herb_patch: '🌿',
    ley_line: '✨'
  }
  return icons[nodeType] || '❓'
}

function formatNodeType(nodeType: string): string {
  return nodeType
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function formatSkillType(skillType: string): string {
  return skillType.charAt(0).toUpperCase() + skillType.slice(1)
}
