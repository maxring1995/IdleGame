'use client'

import { useState, useEffect } from 'react'
import type { ExplorationSkill } from '@/lib/supabase'
import { getExplorationSkills, getSkillProgress } from '@/lib/explorationSkills'

interface ExplorationSkillsPanelProps {
  characterId: string
}

export default function ExplorationSkillsPanel({ characterId }: ExplorationSkillsPanelProps) {
  const [skills, setSkills] = useState<ExplorationSkill[]>([])
  const [selectedSkill, setSelectedSkill] = useState<string | null>(null)
  const [skillDetails, setSkillDetails] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadSkills()
  }, [characterId])

  useEffect(() => {
    if (selectedSkill) {
      loadSkillDetails(selectedSkill)
    }
  }, [selectedSkill])

  async function loadSkills() {
    setLoading(true)
    const { data, error } = await getExplorationSkills(characterId)

    if (!error && data) {
      // Auto-initialize if no skills exist
      if (data.length === 0) {
        const { initializeExplorationSkills } = await import('@/lib/explorationSkills')
        await initializeExplorationSkills(characterId)
        // Reload after initialization
        const { data: newData } = await getExplorationSkills(characterId)
        if (newData) {
          setSkills(newData)
          if (newData.length > 0) {
            setSelectedSkill(newData[0].skill_type)
          }
        }
      } else {
        setSkills(data)
        if (data.length > 0 && !selectedSkill) {
          setSelectedSkill(data[0].skill_type)
        }
      }
    }
    setLoading(false)
  }

  async function loadSkillDetails(skillType: string) {
    const { data } = await getSkillProgress(characterId, skillType as any)
    if (data) {
      setSkillDetails(data)
    }
  }

  const getSkillIcon = (skillType: string) => {
    switch (skillType) {
      case 'cartography': return '🗺️'
      case 'survival': return '🏕️'
      case 'archaeology': return '🏛️'
      case 'tracking': return '🐾'
      default: return '📚'
    }
  }

  const getSkillColor = (skillType: string) => {
    switch (skillType) {
      case 'cartography': return 'amber'
      case 'survival': return 'green'
      case 'archaeology': return 'purple'
      case 'tracking': return 'blue'
      default: return 'gray'
    }
  }

  if (loading) {
    return (
      <div className="panel p-6">
        <div className="flex items-center justify-center py-12">
          <div className="w-12 h-12 border-4 border-amber-500/30 border-t-amber-500
                        rounded-full animate-spin"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="panel p-6 space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-3">
          <span className="text-3xl">📊</span>
          Exploration Skills
        </h2>
        <p className="text-gray-400 text-sm">
          Improve your exploration abilities through practice and discovery
        </p>
      </div>

      {/* Skills Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {skills.map((skill) => {
          const color = getSkillColor(skill.skill_type)
          const isSelected = selectedSkill === skill.skill_type
          const progressPercent = (skill.experience / Math.floor(100 * Math.pow(1.5, skill.level - 1))) * 100

          return (
            <button
              key={skill.skill_type}
              onClick={() => setSelectedSkill(skill.skill_type)}
              className={`
                relative p-4 rounded-xl border-2 transition-all duration-200
                ${isSelected
                  ? `bg-${color}-900/30 border-${color}-500 scale-105 shadow-lg`
                  : `bg-gray-800/50 border-gray-700/50 hover:bg-gray-700/50 hover:border-${color}-500/50`
                }
              `}
            >
              {/* Icon and Name */}
              <div className="flex flex-col items-center gap-2 mb-3">
                <span className="text-3xl">{getSkillIcon(skill.skill_type)}</span>
                <div className="text-center">
                  <div className="text-sm text-white font-medium capitalize">
                    {skill.skill_type}
                  </div>
                  <div className={`text-xs text-${color}-400`}>
                    Level {skill.level}
                  </div>
                </div>
              </div>

              {/* XP Bar */}
              <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={`h-full bg-gradient-to-r from-${color}-500 to-${color}-400
                           transition-all duration-500`}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              {/* Total XP */}
              <div className="mt-2 text-xs text-gray-500 text-center">
                {skill.total_experience.toLocaleString()} XP
              </div>

              {/* Selected Indicator */}
              {isSelected && (
                <div className={`absolute -top-1 -right-1 w-3 h-3 bg-${color}-500
                              rounded-full animate-pulse`} />
              )}
            </button>
          )
        })}
      </div>

      {/* Selected Skill Details */}
      {selectedSkill && skillDetails && (
        <div className="p-4 bg-gradient-to-br from-gray-800/50 to-gray-900/50
                      border border-gray-700/50 rounded-xl space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-lg font-semibold text-white capitalize flex items-center gap-2">
                <span className="text-2xl">{getSkillIcon(selectedSkill)}</span>
                {selectedSkill}
              </h3>
              <p className="text-gray-400 text-sm mt-1">
                {skillDetails.bonuses?.description}
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-amber-400">
                Lvl {skillDetails.level}
              </div>
              <div className="text-xs text-gray-500">
                {skillDetails.progress_percent}% to next
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-gray-500">
              <span>{skillDetails.experience} XP</span>
              <span>{skillDetails.xp_for_current_level} XP</span>
            </div>
            <div className="w-full h-3 bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-full bg-gradient-to-r from-${getSkillColor(selectedSkill)}-500
                         to-${getSkillColor(selectedSkill)}-400 transition-all duration-500
                         relative overflow-hidden`}
                style={{ width: `${skillDetails.progress_percent}%` }}
              >
                <div className="absolute inset-0 bg-white/20 animate-shimmer"></div>
              </div>
            </div>
          </div>

          {/* Bonuses */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-white">Active Bonuses:</h4>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(skillDetails.bonuses || {}).map(([key, value]) => {
                if (key === 'description') return null
                return (
                  <div
                    key={key}
                    className="p-2 bg-gray-800/50 border border-gray-700/50 rounded-lg"
                  >
                    <div className="text-xs text-gray-500 capitalize">
                      {key.replace(/_/g, ' ')}
                    </div>
                    <div className={`text-sm font-medium text-${getSkillColor(selectedSkill)}-400`}>
                      {value as string}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Next Level Preview */}
          <div className="pt-3 border-t border-gray-700/50">
            <div className="text-xs text-gray-500">
              Next Level ({skillDetails.level + 1}):
            </div>
            <div className="text-sm text-amber-400 mt-1">
              All bonuses increase by 1-3%
            </div>
          </div>
        </div>
      )}
    </div>
  )
}