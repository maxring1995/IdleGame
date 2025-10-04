'use client'

import { useState, useEffect } from 'react'
import { useGameStore } from '@/lib/store'
import { GatheringSkillType, MaterialWithDetails, GatheringSession, WorldZoneWithDiscovery } from '@/lib/supabase'
import { getMaterialsWithDetails, getMaterialsByZone } from '@/lib/materials'
import { startGathering, getGatheringSession, processGathering, completeGathering, cancelGathering } from '@/lib/gathering'
import { createClient } from '@/utils/supabase/client'

interface GatheringSkillPanelProps {
  skillType: GatheringSkillType
}

const SKILL_NAMES: Record<GatheringSkillType, string> = {
  woodcutting: 'Woodcutting',
  mining: 'Mining',
  fishing: 'Fishing',
  hunting: 'Hunting',
  alchemy: 'Alchemy',
  magic: 'Magic'
}

const RARITY_CONFIG = {
  common: { color: 'text-gray-400', bg: 'bg-gray-500/10', border: 'border-gray-500/50' },
  uncommon: { color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/50' },
  rare: { color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/50' },
  epic: { color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/50' },
  legendary: { color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/50' }
}

export default function GatheringSkillPanel({ skillType }: GatheringSkillPanelProps) {
  const { character } = useGameStore()
  const [materials, setMaterials] = useState<MaterialWithDetails[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [skillLevel, setSkillLevel] = useState(1)
  const [skillExperience, setSkillExperience] = useState(0)
  const [activeSession, setActiveSession] = useState<GatheringSession | null>(null)
  const [isGathering, setIsGathering] = useState(false)
  const [autoGather, setAutoGather] = useState(false)

  // Zone expansion
  const [zones, setZones] = useState<WorldZoneWithDiscovery[]>([])
  const [selectedZone, setSelectedZone] = useState<WorldZoneWithDiscovery | null>(null)
  const [filterMode, setFilterMode] = useState<'all' | 'zone'>('all')

  useEffect(() => {
    if (character) {
      loadZones()
      loadMaterials()
      loadSkillInfo()
      checkActiveSession()
    }
  }, [character, skillType])

  useEffect(() => {
    if (filterMode === 'zone' && selectedZone) {
      loadZoneMaterials()
    } else if (filterMode === 'all') {
      loadMaterials()
    }
  }, [filterMode, selectedZone])

  useEffect(() => {
    if (!isGathering || !character) return

    const interval = setInterval(async () => {
      await updateGatheringProgress()
    }, 1000)

    return () => clearInterval(interval)
  }, [isGathering, character])

  useEffect(() => {
    if (autoGather && !isGathering && character && materials.length > 0) {
      const firstGatherable = materials.find(m => m.canGather && !m.isLocked)
      if (firstGatherable) {
        handleStartGathering(firstGatherable.id, 10)
      }
    }
  }, [autoGather, isGathering, materials])

  async function loadZones() {
    if (!character) return

    try {
      // Get all zones the character can access based on level
      const supabase = createClient()
      const { data, error } = await supabase
        .from('world_zones')
        .select('*')
        .lte('required_level', character.level)
        .order('required_level', { ascending: true })

      if (error) {
        console.error('Error loading zones:', error)
        return
      }

      if (data) {
        console.log('Loaded zones:', data.length) // Debug log
        // Convert to WorldZoneWithDiscovery format
        const zonesWithDiscovery = data.map(zone => ({
          ...zone,
          isDiscovered: true, // All zones at or below character level are accessible
          discoveredAt: undefined,
          timeSpent: 0
        }))
        setZones(zonesWithDiscovery as WorldZoneWithDiscovery[])
      }
    } catch (err) {
      console.error('Error in loadZones:', err)
    }
  }

  async function loadMaterials() {
    if (!character) return

    setIsLoading(true)
    setError(null)

    const { data, error: err } = await getMaterialsWithDetails(character.id, skillType)

    if (err) {
      setError(err.message)
    } else if (data) {
      setMaterials(data)
    }

    setIsLoading(false)
  }

  async function loadZoneMaterials() {
    if (!character || !selectedZone) return

    setIsLoading(true)
    setError(null)

    const { data, error: err } = await getMaterialsByZone(selectedZone.id, skillType)

    if (err) {
      setError(err.message)
    } else if (data) {
      // Convert to MaterialWithDetails format
      const materialsWithDetails = data.map(m => ({
        ...m,
        canGather: true,
        isLocked: m.required_skill_level > skillLevel
      }))
      setMaterials(materialsWithDetails as MaterialWithDetails[])
    }

    setIsLoading(false)
  }

  async function loadSkillInfo() {
    if (!character) return

    try {
      const response = await fetch('/api/skills/get', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ characterId: character.id, skillType })
      })

      if (response.ok) {
        const { skill } = await response.json()
        setSkillLevel(skill?.level || 1)
        setSkillExperience(skill?.experience || 0)
      }
    } catch (err) {
      console.error('Failed to load skill info:', err)
    }
  }

  function handleZoneChange(zone: WorldZoneWithDiscovery | null) {
    setSelectedZone(zone)
    if (zone) {
      setFilterMode('zone')
    } else {
      setFilterMode('all')
    }
  }

  async function checkActiveSession() {
    if (!character) return

    const { data } = await getGatheringSession(character.id)

    if (data) {
      setActiveSession(data)
      setIsGathering(true)
    }
  }

  async function updateGatheringProgress() {
    if (!character) return

    const { data, completed, error: err } = await processGathering(character.id)

    if (err) {
      setError(err.message)
      return
    }

    if (data) {
      setActiveSession(data as GatheringSession)
    }

    if (completed) {
      await handleCompleteGathering()
    }
  }

  async function handleStartGathering(materialId: string, quantity: number = 1) {
    if (!character) return

    setError(null)
    setIsLoading(true)

    const { data, error: err } = await startGathering(character.id, materialId, quantity)

    if (err) {
      setError(err.message)
      setIsLoading(false)
      return
    }

    const { data: session } = await getGatheringSession(character.id)

    if (session) {
      setActiveSession(session)
      setIsGathering(true)
    }

    setIsLoading(false)
  }

  async function handleCompleteGathering() {
    if (!character) return

    const { data, error: err } = await completeGathering(character.id)

    if (err) {
      setError(err.message)
      return
    }

    setActiveSession(null)
    setIsGathering(false)

    await loadMaterials()
    await loadSkillInfo()

    if (autoGather && data) {
      setTimeout(() => {
        handleStartGathering(data.materialId, 10)
      }, 500)
    }
  }

  async function handleCancelGathering() {
    if (!character) return

    setError(null)

    const { error: err } = await cancelGathering(character.id)

    if (err) {
      setError(err.message)
      return
    }

    setActiveSession(null)
    setIsGathering(false)
    setAutoGather(false)

    await loadMaterials()
    await loadSkillInfo()
  }

  const experienceForNextLevel = skillLevel * 100
  const experienceProgress = (skillExperience / experienceForNextLevel) * 100

  if (isLoading && materials.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading materials...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Skill Progress */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-2xl font-bold text-white text-shadow flex items-center gap-2">
              <span>Level {skillLevel}</span>
              <span className="text-emerald-400">{SKILL_NAMES[skillType]}</span>
            </h3>
            <p className="text-sm text-gray-400 mt-1">
              {skillExperience.toLocaleString()} / {experienceForNextLevel.toLocaleString()} XP
            </p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-emerald-400">{Math.floor(experienceProgress)}%</div>
            <div className="text-xs text-gray-500">Progress</div>
          </div>
        </div>
        <div className="progress-bar h-4">
          <div
            className="progress-fill bg-gradient-to-r from-emerald-500 to-emerald-600"
            style={{ width: `${experienceProgress}%` }}
          />
        </div>
      </div>

      {/* Zone Filter */}
      {zones.length > 0 && (
        <div className="card p-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="text-sm text-gray-400 block mb-2">Filter by Zone:</label>
              <select
                value={selectedZone?.id || ''}
                onChange={(e) => {
                  const zone = zones.find(z => z.id === e.target.value)
                  handleZoneChange(zone || null)
                }}
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-emerald-500/50"
              >
                <option value="">All Zones</option>
                {zones.map((zone) => (
                  <option key={zone.id} value={zone.id}>
                    {zone.icon} {zone.name} (Lv. {zone.required_level})
                  </option>
                ))}
              </select>
            </div>
            {selectedZone && (
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-4 py-2 text-sm">
                <div className="text-gray-400">Gathering in:</div>
                <div className="text-emerald-400 font-semibold">{selectedZone.icon} {selectedZone.name}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="bg-red-500/10 border-2 border-red-500/50 rounded-xl p-4 flex items-center gap-3 animate-pulse">
          <span className="text-2xl">⚠️</span>
          <span className="text-red-400 text-sm">{error}</span>
        </div>
      )}

      {/* Active Gathering Session */}
      {isGathering && activeSession && (
        <div className="relative overflow-hidden rounded-xl border-2 border-emerald-500/50 bg-gradient-to-br from-emerald-950/40 via-gray-900 to-gray-950 p-6">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjAzIiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-50"></div>

          <div className="relative">
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-xl">
                  <span className="text-3xl animate-pulse">⚡</span>
                </div>
                <div>
                  <h4 className="text-xl font-bold text-emerald-400 mb-1">
                    Gathering {activeSession.material.name}
                  </h4>
                  <p className="text-sm text-gray-400">{activeSession.material.description}</p>
                </div>
              </div>
              <label className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-900/60 border border-gray-700/50 cursor-pointer hover:bg-gray-800/80 transition-all">
                <input
                  type="checkbox"
                  checked={autoGather}
                  onChange={(e) => setAutoGather(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-600 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-gray-900"
                />
                <span className="text-sm font-medium text-gray-300">Auto-Gather</span>
                {autoGather && <span className="animate-pulse text-emerald-400">♻️</span>}
              </label>
            </div>

            {/* Progress Bar */}
            <div className="mb-6">
              <div className="flex justify-between mb-2">
                <span className="text-sm font-semibold text-emerald-400">Progress</span>
                <span className="text-sm font-mono text-gray-300">
                  {activeSession.quantityGathered} / {activeSession.quantityGoal}
                </span>
              </div>
              <div className="progress-bar h-6">
                <div
                  className="progress-fill bg-gradient-to-r from-emerald-500 to-emerald-600"
                  style={{ width: `${activeSession.progress}%` }}
                />
              </div>
              <div className="flex justify-between mt-2 text-xs">
                <span className="text-gray-500">{Math.floor(activeSession.progress)}% Complete</span>
                <span className="text-emerald-400 font-mono">
                  {Math.floor(activeSession.timeRemaining / 1000)}s remaining
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={handleCompleteGathering}
                disabled={activeSession.progress < 100}
                className="flex-1 btn btn-success disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="mr-2">✅</span>
                <span>Collect ({activeSession.quantityGathered})</span>
              </button>
              <button
                onClick={handleCancelGathering}
                className="btn btn-danger"
              >
                <span className="mr-2">❌</span>
                <span>Cancel</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Material List */}
      {!isGathering && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-lg font-semibold text-white">Available Resources</h4>
            <span className="badge badge-common">{materials.length} materials</span>
          </div>

          {materials.length === 0 ? (
            <div className="card p-12 text-center">
              <div className="text-6xl mb-4 opacity-20">📦</div>
              <p className="text-gray-400">No materials available for this skill</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {materials.map((material) => {
                const rarityConfig = RARITY_CONFIG[material.rarity as keyof typeof RARITY_CONFIG]

                return (
                  <div
                    key={material.id}
                    className={`card-hover p-5 border-2 transition-all ${
                      material.canGather
                        ? `${rarityConfig.border} ${rarityConfig.bg}`
                        : 'border-gray-800 bg-gray-900/30 opacity-50'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      {/* Material Icon */}
                      <div className={`w-16 h-16 rounded-xl ${rarityConfig.bg} border-2 ${rarityConfig.border} flex items-center justify-center shadow-lg`}>
                        <span className="text-3xl">
                          {skillType === 'woodcutting' && '🪵'}
                          {skillType === 'mining' && (material.id.includes('gem') ? '💎' : '⛏️')}
                          {skillType === 'fishing' && '🐟'}
                          {skillType === 'hunting' && '🦌'}
                          {skillType === 'alchemy' && '🌿'}
                          {skillType === 'magic' && '✨'}
                        </span>
                      </div>

                      {/* Material Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h5 className={`font-bold text-lg ${rarityConfig.color}`}>
                            {material.name}
                          </h5>
                          <span className={`badge badge-${material.rarity} text-xs`}>
                            {material.rarity}
                          </span>
                          <span className="badge badge-common text-xs">Tier {material.tier}</span>
                        </div>
                        <p className="text-sm text-gray-400 mb-2">{material.description}</p>

                        <div className="flex items-center gap-4 text-xs">
                          <div className="flex items-center gap-1">
                            <span className="text-gray-500">Level Required:</span>
                            <span className={material.isLocked ? 'text-red-400 font-semibold' : 'text-white font-semibold'}>
                              {material.required_skill_level}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-gray-500">XP Reward:</span>
                            <span className="text-emerald-400 font-semibold">+{material.experience_reward}</span>
                          </div>
                          {material.isLocked && (
                            <div className="flex items-center gap-1 text-red-400">
                              <span>🔒</span>
                              <span>{material.lockReason}</span>
                            </div>
                          )}
                          {!material.isLocked && material.canGather && (
                            <div className="flex items-center gap-1 text-emerald-400">
                              <span>✓</span>
                              <span>Available</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Gather Actions */}
                      <div className="flex flex-col gap-2">
                        <button
                          onClick={() => handleStartGathering(material.id, 1)}
                          disabled={!material.canGather || material.isLocked}
                          className="btn btn-primary text-xs px-4 py-2 whitespace-nowrap disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          Gather x1
                        </button>
                        <button
                          onClick={() => handleStartGathering(material.id, 10)}
                          disabled={!material.canGather || material.isLocked}
                          className="btn btn-secondary text-xs px-4 py-2 whitespace-nowrap disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          Gather x10
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
