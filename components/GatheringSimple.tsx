'use client'

import { useState, useEffect } from 'react'
import { useGameStore } from '@/lib/store'
import { GatheringSkillType } from '@/lib/supabase'
import {
  getMaterialsForSkill,
  startGatheringSimple,
  checkGatheringProgress,
  collectGathering,
  cancelGatheringSimple
} from '@/app/actions/gathering-simple'

const SKILL_ICONS: Record<string, string> = {
  woodcutting: '🪓',
  mining: '⛏️',
  fishing: '🎣',
  hunting: '🏹',
  alchemy: '🧪',
  magic: '✨'
}

const SKILL_NAMES: Record<string, string> = {
  woodcutting: 'Woodcutting',
  mining: 'Mining',
  fishing: 'Fishing',
  hunting: 'Hunting',
  alchemy: 'Alchemy',
  magic: 'Magic'
}

export default function GatheringSimple() {
  const { character } = useGameStore()
  const [activeSkill, setActiveSkill] = useState<GatheringSkillType>('woodcutting')
  const [materials, setMaterials] = useState<any[]>([])
  const [skillData, setSkillData] = useState<any>(null)
  const [activeSession, setActiveSession] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (character) {
      loadMaterials()
    }
  }, [character, activeSkill])

  useEffect(() => {
    if (!character) return

    const interval = setInterval(async () => {
      const { data } = await checkGatheringProgress(character.id)
      if (data) {
        setActiveSession(data)
      } else {
        setActiveSession(null)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [character])

  async function loadMaterials() {
    if (!character) return

    const { data } = await getMaterialsForSkill(character.id, activeSkill)
    if (data) {
      setMaterials(data.materials)
      setSkillData({
        level: data.skillLevel,
        experience: data.skillExperience,
        experienceForNextLevel: data.experienceForNextLevel
      })
    }
  }

  async function handleStartGathering(materialId: string, quantity: number) {
    if (!character) return

    setIsLoading(true)
    setError(null)

    const result = await startGatheringSimple(character.id, materialId, quantity)

    if (!result.success) {
      setError(result.error || 'Failed to start gathering')
    }

    setIsLoading(false)
  }

  async function handleCollect() {
    if (!character) return

    setIsLoading(true)
    setError(null)

    const result = await collectGathering(character.id)

    if (result.success) {
      await loadMaterials()
      setActiveSession(null)
    } else {
      setError(result.error || 'Failed to collect')
    }

    setIsLoading(false)
  }

  async function handleCancel() {
    if (!character) return

    await cancelGatheringSimple(character.id)
    setActiveSession(null)
    await loadMaterials()
  }

  if (!character) return null

  return (
    <div className="space-y-6">
      {/* Skill Selection */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {Object.keys(SKILL_ICONS).map((skill) => (
          <button
            key={skill}
            onClick={() => setActiveSkill(skill as GatheringSkillType)}
            className={`p-4 rounded-lg transition ${
              activeSkill === skill
                ? 'bg-primary/20 border-2 border-primary'
                : 'bg-bg-card border border-white/10'
            }`}
          >
            <div className="text-2xl mb-1">{SKILL_ICONS[skill]}</div>
            <div className="text-sm font-medium">{SKILL_NAMES[skill]}</div>
          </button>
        ))}
      </div>

      {/* Skill Level */}
      {skillData && (
        <div className="bg-bg-card rounded-lg p-4">
          <div className="flex justify-between mb-2">
            <span className="font-medium">{SKILL_NAMES[activeSkill]} (Level {skillData.level})</span>
            <span className="text-sm text-gray-400">
              {skillData.experience} / {skillData.experienceForNextLevel} XP
            </span>
          </div>
          <div className="w-full bg-bg-dark rounded-full h-2">
            <div
              className="bg-primary h-full rounded-full"
              style={{
                width: `${(skillData.experience / skillData.experienceForNextLevel) * 100}%`
              }}
            />
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Active Session */}
      {activeSession && (
        <div className="bg-primary/10 border-2 border-primary rounded-lg p-6">
          <h3 className="text-lg font-bold mb-2">Gathering {activeSession.material.name}</h3>
          <p className="text-sm text-gray-400 mb-4">{activeSession.material.description}</p>

          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Progress</span>
                <span>{activeSession.quantityGathered} / {activeSession.quantityGoal}</span>
              </div>
              <div className="w-full bg-bg-dark rounded-full h-3">
                <div
                  className="bg-primary h-full rounded-full"
                  style={{ width: `${activeSession.progress}%` }}
                />
              </div>
            </div>

            <div className="flex justify-between text-sm">
              <span>Time Remaining</span>
              <span>{Math.floor(activeSession.timeRemaining / 1000)}s</span>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleCollect}
                disabled={!activeSession.isComplete || isLoading}
                className="flex-1 px-4 py-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 disabled:opacity-50"
              >
                Collect ({activeSession.quantityGathered})
              </button>
              <button
                onClick={handleCancel}
                className="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Materials */}
      {!activeSession && (
        <div className="space-y-2">
          {materials.map((mat) => (
            <div
              key={mat.id}
              className={`p-4 rounded-lg border ${
                mat.canGather ? 'bg-bg-card border-white/10' : 'bg-bg-dark border-white/5 opacity-60'
              }`}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h4 className="font-medium mb-1">{mat.name}</h4>
                  <p className="text-xs text-gray-400">{mat.description}</p>
                  {mat.isLocked && (
                    <p className="text-xs text-red-400 mt-1">🔒 {mat.lockReason}</p>
                  )}
                </div>
                <div className="text-right text-xs space-y-1">
                  <div className="text-gray-400">Level {mat.required_skill_level}</div>
                  <div className="text-primary">+{mat.experience_reward} XP</div>
                </div>
              </div>

              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => handleStartGathering(mat.id, 1)}
                  disabled={!mat.canGather || isLoading}
                  className="px-3 py-1 bg-primary/20 text-primary rounded text-xs hover:bg-primary/30 disabled:opacity-30"
                >
                  x1
                </button>
                <button
                  onClick={() => handleStartGathering(mat.id, 10)}
                  disabled={!mat.canGather || isLoading}
                  className="px-3 py-1 bg-primary/20 text-primary rounded text-xs hover:bg-primary/30 disabled:opacity-30"
                >
                  x10
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
