'use client'

import { useState, useEffect } from 'react'
import { useGameStore } from '@/lib/store'
import { GatheringSkillType, MaterialWithDetails, GatheringSession } from '@/lib/supabase'
import { getMaterialsWithDetails } from '@/lib/materials'
import { startGathering, getGatheringSession, processGathering, completeGathering, cancelGathering } from '@/lib/gathering'

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

const RARITY_COLORS = {
  common: 'text-gray-400',
  uncommon: 'text-green-400',
  rare: 'text-blue-400',
  epic: 'text-purple-400',
  legendary: 'text-yellow-400'
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

  useEffect(() => {
    if (character) {
      loadMaterials()
      loadSkillInfo()
      checkActiveSession()
    }
  }, [character, skillType])

  // Auto-update gathering progress
  useEffect(() => {
    if (!isGathering || !character) return

    const interval = setInterval(async () => {
      await updateGatheringProgress()
    }, 1000) // Update every second

    return () => clearInterval(interval)
  }, [isGathering, character])

  // Auto-restart gathering if enabled
  useEffect(() => {
    if (autoGather && !isGathering && character && materials.length > 0) {
      // Find first gatherable material
      const firstGatherable = materials.find(m => m.canGather && !m.isLocked)
      if (firstGatherable) {
        handleStartGathering(firstGatherable.id, 10) // Gather 10 at a time
      }
    }
  }, [autoGather, isGathering, materials])

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

    // Load session details
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

    // Reload materials to update inventory
    await loadMaterials()
    await loadSkillInfo()

    // If auto-gather is on, start next session
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
      <div className="text-center py-20 text-gray-400">
        <div className="animate-spin text-4xl mb-4">⏳</div>
        <p>Loading materials...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Skill Header */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-xl font-bold text-primary">
            {SKILL_NAMES[skillType]} (Level {skillLevel})
          </h3>
          <div className="text-sm text-gray-400">
            {skillExperience.toLocaleString()} / {experienceForNextLevel.toLocaleString()} XP
          </div>
        </div>
        <div className="w-full bg-bg-dark rounded-full h-3 overflow-hidden">
          <div
            className="bg-primary h-full transition-all duration-300"
            style={{ width: `${experienceProgress}%` }}
          />
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Active Gathering Session */}
      {isGathering && activeSession && (
        <div className="bg-primary/10 border-2 border-primary rounded-lg p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h4 className="text-lg font-bold text-primary mb-1">
                Gathering {activeSession.material.name}
              </h4>
              <p className="text-sm text-gray-400">{activeSession.material.description}</p>
            </div>
            <button
              onClick={() => setAutoGather(!autoGather)}
              className={`px-3 py-1 rounded text-xs font-medium transition ${
                autoGather
                  ? 'bg-green-500/20 text-green-400 border border-green-500/50'
                  : 'bg-gray-700 text-gray-400 border border-gray-600'
              }`}
            >
              Auto: {autoGather ? 'ON' : 'OFF'}
            </button>
          </div>

          {/* Progress Bar */}
          <div className="mb-4">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-400">Progress</span>
              <span className="text-primary">
                {activeSession.quantityGathered} / {activeSession.quantityGoal}
              </span>
            </div>
            <div className="w-full bg-bg-dark rounded-full h-4 overflow-hidden">
              <div
                className="bg-primary h-full transition-all duration-300"
                style={{ width: `${activeSession.progress}%` }}
              />
            </div>
          </div>

          {/* Time Remaining */}
          <div className="flex justify-between items-center text-sm mb-4">
            <span className="text-gray-400">Time Remaining:</span>
            <span className="text-primary font-mono">
              {Math.floor(activeSession.timeRemaining / 1000)}s
            </span>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={handleCompleteGathering}
              disabled={activeSession.progress < 100}
              className="flex-1 px-4 py-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              Collect ({activeSession.quantityGathered})
            </button>
            <button
              onClick={handleCancelGathering}
              className="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Material List */}
      {!isGathering && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-400 mb-3">Available Resources</h4>

          {materials.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              <p>No materials available for this skill yet.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {materials.map((material) => (
                <div
                  key={material.id}
                  className={`p-4 rounded-lg border transition ${
                    material.canGather
                      ? 'bg-bg-card border-white/10 hover:border-primary/30'
                      : 'bg-bg-dark border-white/5 opacity-60'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h5 className={`font-medium ${RARITY_COLORS[material.rarity]}`}>
                          {material.name}
                        </h5>
                        <span className="text-xs text-gray-500">Tier {material.tier}</span>
                      </div>
                      <p className="text-xs text-gray-400">{material.description}</p>
                    </div>
                    <div className="text-right text-xs space-y-1">
                      <div className="text-gray-400">Level {material.required_skill_level}</div>
                      <div className="text-primary">+{material.experience_reward} XP</div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center mt-3">
                    <div className="text-xs text-gray-400">
                      {material.isLocked && (
                        <span className="text-red-400">🔒 {material.lockReason}</span>
                      )}
                      {!material.isLocked && material.canGather && (
                        <span className="text-green-400">✓ Available</span>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleStartGathering(material.id, 1)}
                        disabled={!material.canGather || material.isLocked}
                        className="px-3 py-1 bg-primary/20 text-primary rounded hover:bg-primary/30 transition disabled:opacity-30 disabled:cursor-not-allowed text-xs font-medium"
                      >
                        Gather x1
                      </button>
                      <button
                        onClick={() => handleStartGathering(material.id, 10)}
                        disabled={!material.canGather || material.isLocked}
                        className="px-3 py-1 bg-primary/20 text-primary rounded hover:bg-primary/30 transition disabled:opacity-30 disabled:cursor-not-allowed text-xs font-medium"
                      >
                        Gather x10
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
