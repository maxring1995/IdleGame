'use client'

import { useState } from 'react'
import { GatheringSkillType } from '@/lib/supabase'
import GatheringSkillPanel from './GatheringSkillPanel'

type SkillTab = GatheringSkillType | 'crafting' | 'quest'

const SKILL_ICONS: Record<SkillTab, string> = {
  woodcutting: '🪓',
  mining: '⛏️',
  fishing: '🎣',
  hunting: '🏹',
  alchemy: '🧪',
  magic: '✨',
  crafting: '🔨',
  quest: '📜'
}

const SKILL_NAMES: Record<SkillTab, string> = {
  woodcutting: 'Woodcut',
  mining: 'Mine',
  fishing: 'Fish',
  hunting: 'Hunt',
  alchemy: 'Alchemy',
  magic: 'Magic',
  crafting: 'Craft',
  quest: 'Quest'
}

export default function Gathering() {
  const [activeSkill, setActiveSkill] = useState<SkillTab>('woodcutting')

  const gatheringSkills: SkillTab[] = ['woodcutting', 'mining', 'fishing', 'hunting', 'alchemy', 'magic']
  const otherSkills: SkillTab[] = ['crafting', 'quest']

  return (
    <div className="space-y-6">
      {/* Skill Selection Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Gathering Skills */}
        {gatheringSkills.map((skill) => (
          <button
            key={skill}
            onClick={() => setActiveSkill(skill)}
            className={`p-4 rounded-lg transition-all duration-200 border-2 ${
              activeSkill === skill
                ? 'bg-primary/20 border-primary shadow-lg shadow-primary/20'
                : 'bg-bg-card border-white/10 hover:border-white/20 hover:bg-bg-card/80'
            }`}
          >
            <div className="text-3xl mb-2">{SKILL_ICONS[skill]}</div>
            <div className="font-medium text-sm">{SKILL_NAMES[skill]}</div>
          </button>
        ))}

        {/* Other Skills */}
        {otherSkills.map((skill) => (
          <button
            key={skill}
            onClick={() => setActiveSkill(skill)}
            className={`p-4 rounded-lg transition-all duration-200 border-2 ${
              activeSkill === skill
                ? 'bg-purple-500/20 border-purple-400 shadow-lg shadow-purple-400/20'
                : 'bg-bg-card border-white/10 hover:border-white/20 hover:bg-bg-card/80'
            }`}
          >
            <div className="text-3xl mb-2">{SKILL_ICONS[skill]}</div>
            <div className="font-medium text-sm">{SKILL_NAMES[skill]}</div>
          </button>
        ))}
      </div>

      {/* Active Skill Panel */}
      <div className="bg-bg-card rounded-lg p-6 border border-white/10 min-h-[500px]">
        {gatheringSkills.includes(activeSkill as GatheringSkillType) ? (
          <GatheringSkillPanel skillType={activeSkill as GatheringSkillType} />
        ) : activeSkill === 'crafting' ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-lg mb-2">🔨 Crafting System</p>
            <p className="text-sm">Coming soon! Craft powerful items from gathered materials.</p>
          </div>
        ) : (
          <div className="text-center py-20 text-gray-400">
            <p className="text-lg mb-2">📜 Quest System</p>
            <p className="text-sm">Coming soon! Complete quests to earn rewards and unlock new areas.</p>
          </div>
        )}
      </div>

      {/* Info Panel */}
      <div className="bg-bg-panel rounded-lg p-4 border border-primary/20">
        <div className="flex items-start gap-3">
          <div className="text-2xl">💡</div>
          <div className="flex-1 text-sm text-gray-300">
            <p className="font-medium text-primary mb-1">Gathering Tips:</p>
            <ul className="space-y-1 text-xs">
              <li>• Higher skill levels unlock better materials and faster gathering</li>
              <li>• Materials are used for crafting powerful equipment</li>
              <li>• Each gathering session grants experience to level up your skills</li>
              <li>• New zones unlock as your character level increases</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
