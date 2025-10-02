'use client'

import { useState } from 'react'
import { GatheringSkillType } from '@/lib/supabase'
import GatheringSkillPanel from './GatheringSkillPanel'

type SkillTab = GatheringSkillType | 'crafting' | 'quest'

const SKILL_CONFIG: Record<SkillTab, { icon: string; name: string; color: string; bgColor: string; description: string }> = {
  woodcutting: {
    icon: '🪓',
    name: 'Woodcutting',
    color: 'text-amber-400',
    bgColor: 'from-amber-600/20 to-amber-800/20',
    description: 'Chop trees for wood'
  },
  mining: {
    icon: '⛏️',
    name: 'Mining',
    color: 'text-gray-400',
    bgColor: 'from-gray-600/20 to-gray-800/20',
    description: 'Mine ores and gems'
  },
  fishing: {
    icon: '🎣',
    name: 'Fishing',
    color: 'text-blue-400',
    bgColor: 'from-blue-600/20 to-blue-800/20',
    description: 'Catch fish and seafood'
  },
  hunting: {
    icon: '🏹',
    name: 'Hunting',
    color: 'text-red-400',
    bgColor: 'from-red-600/20 to-red-800/20',
    description: 'Hunt for hides and pelts'
  },
  alchemy: {
    icon: '🧪',
    name: 'Alchemy',
    color: 'text-green-400',
    bgColor: 'from-green-600/20 to-green-800/20',
    description: 'Gather herbs and plants'
  },
  magic: {
    icon: '✨',
    name: 'Magic',
    color: 'text-purple-400',
    bgColor: 'from-purple-600/20 to-purple-800/20',
    description: 'Collect magical essences'
  },
  crafting: {
    icon: '🔨',
    name: 'Crafting',
    color: 'text-orange-400',
    bgColor: 'from-orange-600/20 to-orange-800/20',
    description: 'Craft powerful items'
  },
  quest: {
    icon: '📜',
    name: 'Quests',
    color: 'text-cyan-400',
    bgColor: 'from-cyan-600/20 to-cyan-800/20',
    description: 'Complete epic quests'
  }
}

export default function Gathering() {
  const [activeSkill, setActiveSkill] = useState<SkillTab>('woodcutting')

  const gatheringSkills: SkillTab[] = ['woodcutting', 'mining', 'fishing', 'hunting', 'alchemy', 'magic']
  const otherSkills: SkillTab[] = ['crafting', 'quest']

  const activeConfig = SKILL_CONFIG[activeSkill]

  return (
    <div className="space-y-6">
      {/* Skill Navigation */}
      <div className="panel p-4">
        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Select Skill</h3>

        {/* Gathering Skills */}
        <div className="mb-4">
          <p className="text-xs text-gray-500 mb-2 font-semibold">Gathering Skills</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {gatheringSkills.map((skill) => {
              const config = SKILL_CONFIG[skill]
              const isActive = activeSkill === skill

              return (
                <button
                  key={skill}
                  onClick={() => setActiveSkill(skill)}
                  className={`relative p-3 rounded-lg transition-all border-2 ${
                    isActive
                      ? 'border-amber-500 bg-gradient-to-br ' + config.bgColor + ' shadow-lg'
                      : 'border-white/10 bg-gray-800/40 hover:border-white/20 hover:bg-gray-800/60'
                  }`}
                >
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-3xl">{config.icon}</span>
                    <span className={`text-xs font-semibold ${isActive ? config.color : 'text-gray-400'}`}>
                      {config.name}
                    </span>
                  </div>
                  {isActive && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-amber-500 rounded-full animate-pulse" />
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Other Skills */}
        <div>
          <p className="text-xs text-gray-500 mb-2 font-semibold">Other</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {otherSkills.map((skill) => {
              const config = SKILL_CONFIG[skill]
              const isActive = activeSkill === skill

              return (
                <button
                  key={skill}
                  onClick={() => setActiveSkill(skill)}
                  className={`relative p-3 rounded-lg transition-all border-2 ${
                    isActive
                      ? 'border-amber-500 bg-gradient-to-br ' + config.bgColor + ' shadow-lg'
                      : 'border-white/10 bg-gray-800/40 hover:border-white/20 hover:bg-gray-800/60'
                  }`}
                >
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-3xl">{config.icon}</span>
                    <span className={`text-xs font-semibold ${isActive ? config.color : 'text-gray-400'}`}>
                      {config.name}
                    </span>
                  </div>
                  {isActive && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-amber-500 rounded-full animate-pulse" />
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Active Skill Header */}
      <div className={`panel p-6 bg-gradient-to-br ${activeConfig.bgColor}`}>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center text-4xl border-2 border-white/10 shadow-lg">
            {activeConfig.icon}
          </div>
          <div className="flex-1">
            <h2 className={`text-2xl font-bold ${activeConfig.color} text-shadow mb-1`}>
              {activeConfig.name}
            </h2>
            <p className="text-sm text-gray-400">{activeConfig.description}</p>
          </div>
        </div>
      </div>

      {/* Active Skill Panel */}
      <div className="panel p-6 min-h-[500px]">
        {gatheringSkills.includes(activeSkill as GatheringSkillType) ? (
          <GatheringSkillPanel skillType={activeSkill as GatheringSkillType} />
        ) : activeSkill === 'crafting' ? (
          <div className="text-center py-32">
            <div className="inline-block p-8 rounded-2xl bg-gradient-to-br from-orange-500/10 to-orange-600/5 border border-orange-500/20 mb-6">
              <span className="text-8xl animate-float">🔨</span>
            </div>
            <h2 className="text-3xl font-bold text-white mb-3 text-shadow">Crafting System</h2>
            <p className="text-gray-400 mb-6 max-w-md mx-auto">
              Transform gathered materials into powerful equipment, potions, and magical items.
            </p>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-500/10 border border-orange-500/30 text-orange-400 text-sm">
              <span className="animate-pulse">⏳</span>
              <span>Coming Soon</span>
            </div>
          </div>
        ) : (
          <div className="text-center py-32">
            <div className="inline-block p-8 rounded-2xl bg-gradient-to-br from-cyan-500/10 to-cyan-600/5 border border-cyan-500/20 mb-6">
              <span className="text-8xl animate-float">📜</span>
            </div>
            <h2 className="text-3xl font-bold text-white mb-3 text-shadow">Quest System</h2>
            <p className="text-gray-400 mb-6 max-w-md mx-auto">
              Embark on epic quests, complete challenges, and earn legendary rewards.
            </p>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-sm">
              <span className="animate-pulse">⏳</span>
              <span>Coming Soon</span>
            </div>
          </div>
        )}
      </div>

      {/* Info Panel */}
      <div className="panel p-4 bg-gradient-to-br from-blue-500/5 to-blue-600/5 border-blue-500/20">
        <div className="flex items-start gap-3">
          <div className="text-2xl flex-shrink-0">💡</div>
          <div className="flex-1 text-sm">
            <p className="font-semibold text-blue-400 mb-2">Gathering Tips</p>
            <ul className="space-y-1 text-xs text-gray-300">
              <li className="flex items-start gap-2">
                <span className="text-blue-400 mt-0.5">•</span>
                <span>Higher skill levels unlock better materials and reduce gathering time</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-400 mt-0.5">•</span>
                <span>Use Auto-Gather to continuously collect resources while AFK</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-400 mt-0.5">•</span>
                <span>Each gathering session grants skill experience for level progression</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-400 mt-0.5">•</span>
                <span>New zones unlock as your character level increases</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
