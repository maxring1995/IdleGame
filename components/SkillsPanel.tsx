'use client'

import { useState, useEffect } from 'react'
import { Character, CharacterSkillWithDefinition, SkillCategory, SkillSpecialization, CharacterSkillSynergyWithDetails } from '@/lib/supabase'
import {
  getCharacterSkills,
  getSkillProgress,
  getSkillSpecializations,
  chooseSpecialization,
  prestigeSkill,
  calculateXPForLevel,
  getCharacterSynergies
} from '@/lib/skills'
import { getSkillProgressionGuide } from '@/lib/skillProgression'

interface SkillsPanelProps {
  character: Character
  onUpdate: () => void
}

export default function SkillsPanel({ character, onUpdate }: SkillsPanelProps) {
  const [skills, setSkills] = useState<CharacterSkillWithDefinition[]>([])
  const [synergies, setSynergies] = useState<CharacterSkillSynergyWithDetails[]>([])
  const [selectedSkill, setSelectedSkill] = useState<CharacterSkillWithDefinition | null>(null)
  const [availableSpecs, setAvailableSpecs] = useState<SkillSpecialization[]>([])
  const [activeTab, setActiveTab] = useState<'all' | SkillCategory>('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadSkills()
    loadSynergies()
  }, [character.id])

  async function loadSkills() {
    setLoading(true)
    const { data } = await getCharacterSkills(character.id)
    if (data) {
      setSkills(data)
    }
    setLoading(false)
  }

  async function loadSynergies() {
    const { data } = await getCharacterSynergies(character.id)
    if (data) {
      setSynergies(data)
    }
  }

  async function handleSelectSkill(skill: CharacterSkillWithDefinition) {
    setSelectedSkill(skill)

    // Load specializations if level >= 50
    if (skill.level >= 50 && !skill.specialization_id) {
      const { data } = await getSkillSpecializations(skill.skill_type)
      if (data) {
        setAvailableSpecs(data)
      }
    }
  }

  async function handleChooseSpecialization(specId: string) {
    if (!selectedSkill) return

    const { error } = await chooseSpecialization(character.id, selectedSkill.skill_type, specId)
    if (!error) {
      await loadSkills()
      onUpdate()
    }
  }

  async function handlePrestige() {
    if (!selectedSkill || selectedSkill.level < 99) return

    if (confirm(`Are you sure you want to prestige ${selectedSkill.definition.display_name}? You will reset to level 1 but gain a permanent 5% efficiency bonus.`)) {
      const { error } = await prestigeSkill(character.id, selectedSkill.skill_type)
      if (!error) {
        await loadSkills()
        setSelectedSkill(null)
        onUpdate()
      }
    }
  }

  const filteredSkills = activeTab === 'all'
    ? skills
    : skills.filter(s => s.definition?.category === activeTab)

  const totalLevel = skills.reduce((sum, s) => sum + s.level, 0)
  const combatLevel = skills
    .filter(s => s.definition?.category === 'combat')
    .reduce((sum, s) => sum + s.level, 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-16 h-16 border-4 border-amber-500/30 border-t-amber-500 rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left: Skills List */}
      <div className="lg:col-span-2 space-y-4">
        {/* Header Stats */}
        <div className="panel p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-white">Skills</h2>
            <div className="flex items-center gap-6">
              <div className="text-center">
                <div className="text-sm text-gray-400">Total Level</div>
                <div className="text-2xl font-bold text-amber-500">{totalLevel}</div>
              </div>
              <div className="text-center">
                <div className="text-sm text-gray-400">Combat Level</div>
                <div className="text-2xl font-bold text-red-500">{combatLevel}</div>
              </div>
              <div className="text-center">
                <div className="text-sm text-gray-400">Mastery Points</div>
                <div className="text-2xl font-bold text-purple-500">{character.mastery_points}</div>
              </div>
            </div>
          </div>

          {/* Category Tabs */}
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('all')}
              className={`btn px-4 py-2 ${activeTab === 'all' ? 'btn-primary' : 'btn-secondary'}`}
            >
              All ({skills.length})
            </button>
            <button
              onClick={() => setActiveTab('combat')}
              className={`btn px-4 py-2 ${activeTab === 'combat' ? 'btn-primary' : 'btn-secondary'}`}
            >
              ⚔️ Combat
            </button>
            <button
              onClick={() => setActiveTab('gathering')}
              className={`btn px-4 py-2 ${activeTab === 'gathering' ? 'btn-primary' : 'btn-secondary'}`}
            >
              🌾 Gathering
            </button>
            <button
              onClick={() => setActiveTab('artisan')}
              className={`btn px-4 py-2 ${activeTab === 'artisan' ? 'btn-primary' : 'btn-secondary'}`}
            >
              🔨 Artisan
            </button>
            <button
              onClick={() => setActiveTab('support')}
              className={`btn px-4 py-2 ${activeTab === 'support' ? 'btn-primary' : 'btn-secondary'}`}
            >
              🏃 Support
            </button>
          </div>
        </div>

        {/* Skills Grid */}
        <div className="space-y-3">
          {filteredSkills.map((skill) => {
            const progress = getSkillProgress(skill)
            const isSelected = selectedSkill?.skill_type === skill.skill_type

            return (
              <button
                key={skill.skill_type}
                onClick={() => handleSelectSkill(skill)}
                className={`w-full panel p-4 hover:bg-gray-800/60 transition-colors ${
                  isSelected ? 'ring-2 ring-amber-500' : ''
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{skill.definition?.icon}</span>
                    <div className="text-left">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-lg">
                          {skill.definition?.display_name}
                        </span>
                        {skill.prestige_level > 0 && (
                          <span className="badge badge-legendary text-xs">
                            ⭐ {skill.prestige_level}
                          </span>
                        )}
                        {skill.specialization_id && (
                          <span className="badge badge-epic text-xs">
                            🌟 Specialized
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-400 mb-1">
                        {skill.definition?.description}
                      </div>
                      <div className="text-xs text-emerald-400 flex items-start gap-1">
                        <span>💡</span>
                        <span>{getSkillProgressionGuide(skill.skill_type)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-amber-500">
                      Level {skill.level}
                    </div>
                    <div className="text-xs text-gray-400">
                      {progress.current_xp.toLocaleString()} / {progress.xp_for_next_level.toLocaleString()} XP
                    </div>
                  </div>
                </div>

                {/* XP Progress Bar */}
                <div className="progress-bar mt-3">
                  <div
                    className="progress-fill bg-gradient-to-r from-amber-500 to-amber-600"
                    style={{ width: `${Math.min(100, progress.progress_percent)}%` }}
                  ></div>
                </div>
              </button>
            )
          })}

          {filteredSkills.length === 0 && (
            <div className="panel p-12 text-center">
              <div className="text-6xl mb-4">📚</div>
              <h3 className="text-xl font-bold text-white mb-2">No Skills Yet</h3>
              <p className="text-gray-400">
                Start training skills to unlock your potential!
              </p>
            </div>
          )}
        </div>

        {/* Synergies Section */}
        {synergies.length > 0 && (
          <div className="panel p-6">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <span>🔗</span> Unlocked Synergies
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {synergies.map((syn) => (
                <div key={syn.synergy_id} className="card p-4 border-2 border-purple-500/30">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-2xl">{syn.synergy.icon}</span>
                    <div>
                      <div className="font-bold text-purple-400">
                        {syn.synergy.display_name}
                      </div>
                      <div className="text-xs text-gray-400">
                        {syn.synergy.description}
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-emerald-400">
                    ✓ Bonus Active
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Right: Skill Details */}
      <div className="space-y-4">
        {selectedSkill ? (
          <>
            {/* Skill Detail */}
            <div className="panel p-6">
              <div className="text-center mb-4">
                <div className="text-6xl mb-2">{selectedSkill.definition?.icon}</div>
                <h3 className="text-2xl font-bold text-white">
                  {selectedSkill.definition?.display_name}
                </h3>
                <div className="text-gray-400 mb-3">{selectedSkill.definition?.description}</div>

                {/* How to Train */}
                <div className="panel-glass p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5">
                  <div className="flex items-start gap-2 text-left">
                    <span className="text-emerald-400 text-sm">💡</span>
                    <div className="flex-1">
                      <div className="text-xs font-semibold text-emerald-400 mb-1">How to Train:</div>
                      <div className="text-xs text-gray-300">
                        {getSkillProgressionGuide(selectedSkill.skill_type)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="space-y-3">
                <div className="stat-box">
                  <span className="text-gray-400">Level</span>
                  <span className="text-amber-500 font-bold text-2xl">{selectedSkill.level}</span>
                </div>

                <div className="stat-box">
                  <span className="text-gray-400">Experience</span>
                  <span className="text-white font-bold">
                    {selectedSkill.experience.toLocaleString()}
                  </span>
                </div>

                {selectedSkill.prestige_level > 0 && (
                  <>
                    <div className="stat-box">
                      <span className="text-gray-400">Prestige Level</span>
                      <span className="text-purple-400 font-bold">
                        ⭐ {selectedSkill.prestige_level}
                      </span>
                    </div>

                    <div className="stat-box">
                      <span className="text-gray-400">Efficiency Bonus</span>
                      <span className="text-emerald-400 font-bold">
                        +{selectedSkill.prestige_level * 5}%
                      </span>
                    </div>

                    <div className="stat-box">
                      <span className="text-gray-400">Total XP Earned</span>
                      <span className="text-white font-bold">
                        {(selectedSkill.total_experience || selectedSkill.experience).toLocaleString()}
                      </span>
                    </div>
                  </>
                )}

                <div className="stat-box">
                  <span className="text-gray-400">Category</span>
                  <span className="text-white font-bold capitalize">
                    {selectedSkill.definition?.category}
                  </span>
                </div>

                {selectedSkill.definition?.base_stat_affected && (
                  <div className="stat-box">
                    <span className="text-gray-400">Affects</span>
                    <span className="text-white font-bold capitalize">
                      {selectedSkill.definition.base_stat_affected}
                    </span>
                  </div>
                )}
              </div>

              {/* Specialization */}
              {selectedSkill.level >= 50 && !selectedSkill.specialization_id && availableSpecs.length > 0 && (
                <div className="mt-6 p-4 bg-purple-900/20 border border-purple-500/30 rounded-xl">
                  <div className="text-sm font-bold text-purple-400 mb-3">
                    🌟 Choose Specialization (Level 50)
                  </div>
                  <div className="space-y-2">
                    {availableSpecs.map((spec) => (
                      <button
                        key={spec.specialization_id}
                        onClick={() => handleChooseSpecialization(spec.specialization_id)}
                        className="w-full text-left p-3 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span>{spec.icon}</span>
                          <span className="font-bold text-white">{spec.display_name}</span>
                        </div>
                        <div className="text-xs text-gray-400">{spec.description}</div>
                        <div className="text-xs text-emerald-400 mt-1">{spec.special_effect}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Prestige Button */}
              {selectedSkill.level >= 99 && (
                <button
                  onClick={handlePrestige}
                  className="w-full mt-6 btn bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold py-3"
                >
                  ⭐ Prestige ({selectedSkill.prestige_level + 1})
                </button>
              )}
            </div>

            {/* Milestones */}
            <div className="panel p-6">
              <h4 className="font-bold text-white mb-3">🏆 Milestones</h4>
              <div className="space-y-2">
                {[10, 25, 50, 75, 99].map((milestone) => {
                  const reached = selectedSkill.level >= milestone
                  return (
                    <div
                      key={milestone}
                      className={`flex items-center justify-between p-2 rounded ${
                        reached ? 'bg-emerald-900/20 border border-emerald-500/30' : 'bg-gray-800/50'
                      }`}
                    >
                      <span className={reached ? 'text-emerald-400' : 'text-gray-500'}>
                        Level {milestone}
                      </span>
                      {reached ? (
                        <span className="text-emerald-400">✓</span>
                      ) : (
                        <span className="text-gray-600">🔒</span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </>
        ) : (
          <div className="panel p-12 text-center">
            <div className="text-6xl mb-4">📊</div>
            <h3 className="text-xl font-bold text-white mb-2">Select a Skill</h3>
            <p className="text-gray-400">
              Click on a skill to view details, choose specializations, and prestige.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
