'use client'

import { useState } from 'react'
import { useGameStore } from '@/lib/store'
import EquipmentOverlay from './EquipmentOverlay'
import SkillsPanel from './SkillsPanel'
import CharacterStats from './CharacterStats'
import Character3DShowcase from './Character3DShowcase'
import TalentTree from './TalentTree'
import ClassAbilities from './ClassAbilities'

export default function CharacterTab() {
  const { character } = useGameStore()
  const [showEquipmentManager, setShowEquipmentManager] = useState(false)
  const [showSkillsPanel, setShowSkillsPanel] = useState(false)
  const [showCharacterStats, setShowCharacterStats] = useState(false)
  const [show3DShowcase, setShow3DShowcase] = useState(false)
  const [showTalentTree, setShowTalentTree] = useState(false)
  const [showAbilities, setShowAbilities] = useState(false)

  // Refresh character data (for when talents/abilities are learned)
  async function refreshCharacter() {
    // This will trigger a re-render through the store
    if (character) {
      const { getCharacter } = await import('@/lib/character')
      const { data } = await getCharacter(character.user_id)
      if (data) {
        const { setCharacter } = useGameStore.getState()
        setCharacter(data)
      }
    }
  }

  if (!character) return null

  return (
    <>
      <EquipmentOverlay
        isOpen={showEquipmentManager}
        onClose={() => setShowEquipmentManager(false)}
      />

      {/* 3D Showcase View */}
      {show3DShowcase ? (
        <div className="space-y-4">
          <button
            onClick={() => setShow3DShowcase(false)}
            className="btn btn-secondary mb-4"
          >
            ← Back to Character Menu
          </button>
          <Character3DShowcase />
        </div>
      ) : showCharacterStats ? (
        /* Character Stats View */
        <div className="space-y-4">
          <button
            onClick={() => setShowCharacterStats(false)}
            className="btn btn-secondary mb-4"
          >
            ← Back to Character Menu
          </button>
          <CharacterStats character={character} />
        </div>
      ) : showSkillsPanel ? (
        /* Skills Panel View */
        <div className="space-y-4">
          <button
            onClick={() => setShowSkillsPanel(false)}
            className="btn btn-secondary mb-4"
            data-testid="back-to-character-menu"
          >
            ← Back to Character Menu
          </button>
          <SkillsPanel
            character={character}
            onUpdate={() => {
              // Refresh character data if needed
            }}
          />
        </div>
      ) : showTalentTree ? (
        /* Talent Tree View */
        <div className="space-y-4">
          <button
            onClick={() => setShowTalentTree(false)}
            className="btn btn-secondary mb-4"
            data-testid="back-to-character-menu"
          >
            ← Back to Character Menu
          </button>
          <TalentTree character={character} onTalentSpent={refreshCharacter} />
        </div>
      ) : showAbilities ? (
        /* Class Abilities View */
        <div className="space-y-4">
          <button
            onClick={() => setShowAbilities(false)}
            className="btn btn-secondary mb-4"
            data-testid="back-to-character-menu"
          >
            ← Back to Character Menu
          </button>
          <ClassAbilities character={character} onAbilityLearned={refreshCharacter} />
        </div>
      ) : (
        <div className="space-y-6">
        {/* Character Management Header */}
        <div className="panel p-6 bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-4xl shadow-xl">
              👤
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-white mb-1 text-shadow">Character Management</h2>
              <p className="text-sm text-gray-400">Manage your equipment, skills, and character progression</p>
            </div>
          </div>
        </div>

        {/* Quick Actions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Equipment Manager Card */}
          <button
            onClick={() => setShowEquipmentManager(true)}
            data-testid="equipment-manager-button"
            className="panel p-6 text-left hover:bg-white/5 transition-all group"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center text-2xl shadow-lg group-hover:scale-110 transition-transform">
                ⚔️
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-white mb-1">Equipment Manager</h3>
                <p className="text-sm text-gray-400 mb-3">Manage your weapons, armor, and accessories</p>
                <div className="flex items-center gap-2 text-xs text-purple-400">
                  <span>Click to open</span>
                  <span className="group-hover:translate-x-1 transition-transform">→</span>
                </div>
              </div>
            </div>
          </button>

          {/* Skills & Abilities Card */}
          <button
            onClick={() => setShowSkillsPanel(true)}
            data-testid="skills-panel-button"
            className="panel p-6 text-left hover:bg-white/5 transition-all group"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-2xl shadow-lg group-hover:scale-110 transition-transform">
                📊
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-white mb-1">Skills & Abilities</h3>
                <p className="text-sm text-gray-400 mb-3">View skills, choose specializations, and prestige</p>
                <div className="flex items-center gap-2 text-xs text-emerald-400">
                  <span>Click to open</span>
                  <span className="group-hover:translate-x-1 transition-transform">→</span>
                </div>
              </div>
            </div>
          </button>

          {/* Talent Tree Card */}
          <button
            onClick={() => setShowTalentTree(true)}
            data-testid="talent-tree-button"
            className="panel p-6 text-left hover:bg-white/5 transition-all group"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center text-2xl shadow-lg group-hover:scale-110 transition-transform">
                🌳
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-white mb-1">Talent Tree</h3>
                <p className="text-sm text-gray-400 mb-3">Customize your character with powerful talents</p>
                <div className="flex items-center gap-2 text-xs text-violet-400">
                  <span>{character.talent_points || 0} points available</span>
                  <span className="group-hover:translate-x-1 transition-transform">→</span>
                </div>
              </div>
            </div>
          </button>

          {/* Class Abilities Card */}
          <button
            onClick={() => setShowAbilities(true)}
            data-testid="class-abilities-button"
            className="panel p-6 text-left hover:bg-white/5 transition-all group"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-rose-500 to-rose-700 flex items-center justify-center text-2xl shadow-lg group-hover:scale-110 transition-transform">
                ✨
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-white mb-1">Class Abilities</h3>
                <p className="text-sm text-gray-400 mb-3">Learn and master your class's unique spells</p>
                <div className="flex items-center gap-2 text-xs text-rose-400">
                  <span>Click to open</span>
                  <span className="group-hover:translate-x-1 transition-transform">→</span>
                </div>
              </div>
            </div>
          </button>

          {/* Achievements Card (Coming Soon) */}
          <div className="panel p-6 text-left opacity-60">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-2xl shadow-lg">
                🏆
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-white mb-1">Achievements</h3>
                <p className="text-sm text-gray-400 mb-3">Track your accomplishments and earn rewards</p>
                <div className="badge badge-common text-xs">Coming Soon</div>
              </div>
            </div>
          </div>

          {/* Character Stats Card */}
          <button
            onClick={() => setShowCharacterStats(true)}
            data-testid="character-stats-button"
            className="panel p-6 text-left hover:bg-white/5 transition-all group"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-cyan-500 to-cyan-700 flex items-center justify-center text-2xl shadow-lg group-hover:scale-110 transition-transform">
                📈
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-white mb-1">Character Stats</h3>
                <p className="text-sm text-gray-400 mb-3">Detailed breakdown of your stats and bonuses</p>
                <div className="flex items-center gap-2 text-xs text-cyan-400">
                  <span>Click to open</span>
                  <span className="group-hover:translate-x-1 transition-transform">→</span>
                </div>
              </div>
            </div>
          </button>

          {/* 3D Showcase Card */}
          <button
            onClick={() => setShow3DShowcase(true)}
            data-testid="3d-showcase-button"
            className="panel p-6 text-left hover:bg-white/5 transition-all group"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-pink-500 to-pink-700 flex items-center justify-center text-2xl shadow-lg group-hover:scale-110 transition-transform">
                🎭
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-white mb-1">3D Character Viewer</h3>
                <p className="text-sm text-gray-400 mb-3">Interactive 3D model with animations and controls</p>
                <div className="flex items-center gap-2 text-xs text-pink-400">
                  <span>Click to open</span>
                  <span className="group-hover:translate-x-1 transition-transform">→</span>
                </div>
              </div>
            </div>
          </button>

          {/* Titles Card (Coming Soon) */}
          <div className="panel p-6 text-left opacity-60">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-yellow-500 to-yellow-700 flex items-center justify-center text-2xl shadow-lg">
                ✨
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-white mb-1">Titles & Badges</h3>
                <p className="text-sm text-gray-400 mb-3">Unlock and display special titles</p>
                <div className="badge badge-common text-xs">Coming Soon</div>
              </div>
            </div>
          </div>
        </div>

        {/* Info Tip */}
        <div className="panel p-4 bg-gradient-to-br from-blue-500/5 to-blue-600/5 border-blue-500/20">
          <div className="flex items-start gap-3">
            <div className="text-2xl flex-shrink-0">💡</div>
            <div className="flex-1 text-sm">
              <p className="font-semibold text-blue-400 mb-2">Character Management Tips</p>
              <ul className="space-y-1 text-xs text-gray-300">
                <li className="flex items-start gap-2">
                  <span className="text-blue-400 mt-0.5">•</span>
                  <span>Use the Equipment Manager to equip better gear and increase your stats</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-400 mt-0.5">•</span>
                  <span>Level up your skills through combat and gathering to unlock new abilities</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-400 mt-0.5">•</span>
                  <span>Complete achievements to earn special rewards and titles</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-400 mt-0.5">•</span>
                  <span>Check back regularly as new character features will be added!</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
      )}
    </>
  )
}
