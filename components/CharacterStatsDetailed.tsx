'use client'

/**
 * Advanced Character Stats Panel
 *
 * Shows detailed breakdown of all character attributes from all sources:
 * - Base stats (from level)
 * - Equipment bonuses
 * - Landmark discovery bonuses
 * - Exploration skill bonuses
 * - Active buff bonuses
 * - Total calculated stats
 */

import { useState, useEffect } from 'react'
import { useGameStore } from '@/lib/store'
import type { ExplorationSkill } from '@/lib/supabase'
import { getActiveBuffs, type ActiveBuff } from '@/lib/consumables'

interface StatBreakdown {
  base: {
    attack: number
    defense: number
    health: number
    mana: number
  }
  equipment: {
    attack: number
    defense: number
    health: number
    mana: number
  }
  landmarks: {
    attack: number
    defense: number
    health: number
    mana: number
    discovery_bonus: number
    gold_find_bonus: number
    xp_bonus: number
    speed_bonus: number
  }
  explorationSkills: {
    cartography?: ExplorationSkill
    survival?: ExplorationSkill
    archaeology?: ExplorationSkill
    tracking?: ExplorationSkill
  }
  buffs: ActiveBuff[]
  totals: {
    attack: number
    defense: number
    health: number
    mana: number
  }
}

export default function CharacterStatsDetailed() {
  const { character } = useGameStore()
  const [stats, setStats] = useState<StatBreakdown | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [discoveries, setDiscoveries] = useState(0)

  useEffect(() => {
    if (character) {
      loadDetailedStats()
    }
  }, [character])

  async function loadDetailedStats() {
    if (!character) return
    setIsLoading(true)

    try {
      const { createClient } = await import('@/utils/supabase/client')
      const supabase = createClient()

      // Calculate base stats
      const baseAttack = 10 + (character.level - 1) * 2
      const baseDefense = 5 + (character.level - 1) * 1
      const baseHealth = 100 + (character.level - 1) * 20
      const baseMana = 50 + (character.level - 1) * 10

      // Get equipment bonuses
      const { data: equippedItems } = await supabase
        .from('inventory')
        .select('*, item:items(*)')
        .eq('character_id', character.id)
        .eq('equipped', true)

      let equipmentAttack = 0
      let equipmentDefense = 0
      let equipmentHealth = 0
      let equipmentMana = 0

      equippedItems?.forEach((invItem: any) => {
        const item = Array.isArray(invItem.item) ? invItem.item[0] : invItem.item
        if (item) {
          equipmentAttack += item.attack_bonus || 0
          equipmentDefense += item.defense_bonus || 0
          equipmentHealth += item.health_bonus || 0
          equipmentMana += item.mana_bonus || 0
        }
      })

      // Get landmark bonuses
      const { data: landmarkBonuses } = await supabase
        .from('character_landmark_bonuses')
        .select('*')
        .eq('character_id', character.id)

      let landmarkAttack = 0
      let landmarkDefense = 0
      let landmarkHealth = 0
      let landmarkMana = 0
      let landmarkDiscovery = 0
      let landmarkGoldFind = 0
      let landmarkXP = 0
      let landmarkSpeed = 0

      landmarkBonuses?.forEach((bonus: any) => {
        landmarkAttack += bonus.attack_bonus || 0
        landmarkDefense += bonus.defense_bonus || 0
        landmarkHealth += bonus.health_bonus || 0
        landmarkMana += bonus.mana_bonus || 0
        landmarkDiscovery += bonus.discovery_bonus || 0
        landmarkGoldFind += bonus.gold_find_bonus || 0
        landmarkXP += bonus.xp_bonus || 0
        landmarkSpeed += bonus.speed_bonus || 0
      })

      // Get exploration skills
      const { data: explorationSkills } = await supabase
        .from('exploration_skills')
        .select('*')
        .eq('character_id', character.id)

      const skillsMap: any = {}
      explorationSkills?.forEach((skill: any) => {
        skillsMap[skill.skill_type] = skill
      })

      // Get active buffs
      const buffs = await getActiveBuffs(character.id)

      // Get total discoveries
      const { data: discoveryCount } = await supabase
        .from('character_landmark_discoveries')
        .select('id', { count: 'exact' })
        .eq('character_id', character.id)

      setDiscoveries(discoveryCount?.length || 0)

      setStats({
        base: {
          attack: baseAttack,
          defense: baseDefense,
          health: baseHealth,
          mana: baseMana
        },
        equipment: {
          attack: equipmentAttack,
          defense: equipmentDefense,
          health: equipmentHealth,
          mana: equipmentMana
        },
        landmarks: {
          attack: landmarkAttack,
          defense: landmarkDefense,
          health: landmarkHealth,
          mana: landmarkMana,
          discovery_bonus: landmarkDiscovery,
          gold_find_bonus: landmarkGoldFind,
          xp_bonus: landmarkXP,
          speed_bonus: landmarkSpeed
        },
        explorationSkills: skillsMap,
        buffs,
        totals: {
          attack: baseAttack + equipmentAttack + landmarkAttack,
          defense: baseDefense + equipmentDefense + landmarkDefense,
          health: baseHealth + equipmentHealth + landmarkHealth,
          mana: baseMana + equipmentMana + landmarkMana
        }
      })
    } catch (err) {
      console.error('Error loading detailed stats:', err)
    }

    setIsLoading(false)
  }

  if (isLoading || !stats) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-12 h-12 border-4 border-amber-500/30 border-t-amber-500 rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="panel p-6">
        <h2 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
          <span className="text-4xl">📊</span>
          Advanced Statistics
        </h2>
        <p className="text-gray-400">
          Complete breakdown of all attributes and bonuses
        </p>
      </div>

      {/* Combat Stats */}
      <div className="panel p-6 space-y-4">
        <h3 className="text-xl font-bold text-white border-b border-gray-700/50 pb-3">
          ⚔️ Combat Statistics
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Attack */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-lg font-semibold text-red-400">⚔️ Attack</span>
              <span className="text-2xl font-bold text-red-300">{stats.totals.attack}</span>
            </div>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between text-gray-400">
                <span>Base (Level {character?.level})</span>
                <span className="text-white">+{stats.base.attack}</span>
              </div>
              {stats.equipment.attack > 0 && (
                <div className="flex justify-between text-gray-400">
                  <span>Equipment</span>
                  <span className="text-green-400">+{stats.equipment.attack}</span>
                </div>
              )}
              {stats.landmarks.attack > 0 && (
                <div className="flex justify-between text-gray-400">
                  <span>Landmarks ({discoveries})</span>
                  <span className="text-purple-400">+{stats.landmarks.attack}</span>
                </div>
              )}
            </div>
          </div>

          {/* Defense */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-lg font-semibold text-blue-400">🛡️ Defense</span>
              <span className="text-2xl font-bold text-blue-300">{stats.totals.defense}</span>
            </div>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between text-gray-400">
                <span>Base (Level {character?.level})</span>
                <span className="text-white">+{stats.base.defense}</span>
              </div>
              {stats.equipment.defense > 0 && (
                <div className="flex justify-between text-gray-400">
                  <span>Equipment</span>
                  <span className="text-green-400">+{stats.equipment.defense}</span>
                </div>
              )}
              {stats.landmarks.defense > 0 && (
                <div className="flex justify-between text-gray-400">
                  <span>Landmarks ({discoveries})</span>
                  <span className="text-purple-400">+{stats.landmarks.defense}</span>
                </div>
              )}
            </div>
          </div>

          {/* Health */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-lg font-semibold text-red-400">❤️ Max Health</span>
              <span className="text-2xl font-bold text-red-300">{stats.totals.health}</span>
            </div>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between text-gray-400">
                <span>Base (Level {character?.level})</span>
                <span className="text-white">+{stats.base.health}</span>
              </div>
              {stats.equipment.health > 0 && (
                <div className="flex justify-between text-gray-400">
                  <span>Equipment</span>
                  <span className="text-green-400">+{stats.equipment.health}</span>
                </div>
              )}
              {stats.landmarks.health > 0 && (
                <div className="flex justify-between text-gray-400">
                  <span>Landmarks ({discoveries})</span>
                  <span className="text-purple-400">+{stats.landmarks.health}</span>
                </div>
              )}
            </div>
          </div>

          {/* Mana */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-lg font-semibold text-blue-400">💧 Max Mana</span>
              <span className="text-2xl font-bold text-blue-300">{stats.totals.mana}</span>
            </div>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between text-gray-400">
                <span>Base (Level {character?.level})</span>
                <span className="text-white">+{stats.base.mana}</span>
              </div>
              {stats.equipment.mana > 0 && (
                <div className="flex justify-between text-gray-400">
                  <span>Equipment</span>
                  <span className="text-green-400">+{stats.equipment.mana}</span>
                </div>
              )}
              {stats.landmarks.mana > 0 && (
                <div className="flex justify-between text-gray-400">
                  <span>Landmarks ({discoveries})</span>
                  <span className="text-purple-400">+{stats.landmarks.mana}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Exploration Stats */}
      <div className="panel p-6 space-y-4">
        <h3 className="text-xl font-bold text-white border-b border-gray-700/50 pb-3">
          🗺️ Exploration Statistics
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Discovery Bonus */}
          <div className="stat-box">
            <div className="flex items-center gap-2 text-gray-400">
              <span className="text-xl">🔍</span>
              <span>Discovery Rate Bonus</span>
            </div>
            <div className="text-2xl font-bold text-amber-400">
              +{(stats.landmarks.discovery_bonus * 100).toFixed(1)}%
            </div>
            <div className="text-xs text-gray-500 mt-1">From {discoveries} landmarks</div>
          </div>

          {/* Gold Find */}
          <div className="stat-box">
            <div className="flex items-center gap-2 text-gray-400">
              <span className="text-xl">💰</span>
              <span>Gold Find Bonus</span>
            </div>
            <div className="text-2xl font-bold text-yellow-400">
              +{(stats.landmarks.gold_find_bonus * 100).toFixed(1)}%
            </div>
            <div className="text-xs text-gray-500 mt-1">From {discoveries} landmarks</div>
          </div>

          {/* XP Bonus */}
          <div className="stat-box">
            <div className="flex items-center gap-2 text-gray-400">
              <span className="text-xl">⭐</span>
              <span>XP Gain Bonus</span>
            </div>
            <div className="text-2xl font-bold text-purple-400">
              +{(stats.landmarks.xp_bonus * 100).toFixed(1)}%
            </div>
            <div className="text-xs text-gray-500 mt-1">From {discoveries} landmarks</div>
          </div>

          {/* Speed Bonus */}
          <div className="stat-box">
            <div className="flex items-center gap-2 text-gray-400">
              <span className="text-xl">💨</span>
              <span>Speed Bonus</span>
            </div>
            <div className="text-2xl font-bold text-green-400">
              +{(stats.landmarks.speed_bonus * 100).toFixed(1)}%
            </div>
            <div className="text-xs text-gray-500 mt-1">From {discoveries} landmarks</div>
          </div>
        </div>
      </div>

      {/* Exploration Skills */}
      {Object.keys(stats.explorationSkills).length > 0 && (
        <div className="panel p-6 space-y-4">
          <h3 className="text-xl font-bold text-white border-b border-gray-700/50 pb-3">
            🎯 Exploration Skills
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {stats.explorationSkills.cartography && (
              <div className="stat-box">
                <div className="flex items-center gap-2 text-gray-400 text-sm">
                  <span className="text-xl">🗺️</span>
                  <span>Cartography</span>
                </div>
                <div className="text-xl font-bold text-amber-400">
                  Level {stats.explorationSkills.cartography.level}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {stats.explorationSkills.cartography.total_experience.toLocaleString()} XP
                </div>
              </div>
            )}

            {stats.explorationSkills.survival && (
              <div className="stat-box">
                <div className="flex items-center gap-2 text-gray-400 text-sm">
                  <span className="text-xl">🏕️</span>
                  <span>Survival</span>
                </div>
                <div className="text-xl font-bold text-green-400">
                  Level {stats.explorationSkills.survival.level}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {stats.explorationSkills.survival.total_experience.toLocaleString()} XP
                </div>
              </div>
            )}

            {stats.explorationSkills.archaeology && (
              <div className="stat-box">
                <div className="flex items-center gap-2 text-gray-400 text-sm">
                  <span className="text-xl">🏛️</span>
                  <span>Archaeology</span>
                </div>
                <div className="text-xl font-bold text-purple-400">
                  Level {stats.explorationSkills.archaeology.level}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {stats.explorationSkills.archaeology.total_experience.toLocaleString()} XP
                </div>
              </div>
            )}

            {stats.explorationSkills.tracking && (
              <div className="stat-box">
                <div className="flex items-center gap-2 text-gray-400 text-sm">
                  <span className="text-xl">🐾</span>
                  <span>Tracking</span>
                </div>
                <div className="text-xl font-bold text-blue-400">
                  Level {stats.explorationSkills.tracking.level}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {stats.explorationSkills.tracking.total_experience.toLocaleString()} XP
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Active Buffs */}
      {stats.buffs.length > 0 && (
        <div className="panel p-6 space-y-4">
          <h3 className="text-xl font-bold text-white border-b border-gray-700/50 pb-3">
            ✨ Active Buffs
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {stats.buffs.map((buff) => (
              <div key={buff.id} className="card p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1">
                    <div className="font-semibold text-white text-sm">{buff.item_name}</div>
                    <div className="text-xs text-blue-400 capitalize">
                      {buff.effect_type.replace('buff_', '').replace('_', ' ')}
                    </div>
                  </div>
                  <div className="text-lg">✨</div>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-green-400 font-semibold">+{buff.effect_value}%</span>
                  <span className="text-gray-500">
                    {Math.ceil((new Date(buff.expires_at).getTime() - Date.now()) / 60000)}m left
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Total Discoveries */}
      <div className="panel p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-white mb-1">📍 Total Discoveries</h3>
            <p className="text-gray-400 text-sm">Landmarks found across all zones</p>
          </div>
          <div className="text-4xl font-bold text-amber-400">{discoveries}</div>
        </div>
      </div>
    </div>
  )
}
